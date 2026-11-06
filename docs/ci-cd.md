# CI/CD plan (GitHub Actions -> private registry -> Portainer)

**Status: phase 1 built (`hello` -> `:latest`); the rest is planned.** Registry: [infrastructure/registry](../infrastructure/registry/README.md). Goal: nothing is built on
the VPS; images are built by GitHub, stored in `registry.abrahamgreenberg.co.uk`, and deployed (manually at first) from Portainer.
Repo: `abrahamgreenberg/VPS` (public). GitHub Actions is free and unmetered for public repos.

## What we want

| Trigger | Result |
| ------- | ------ |
| push to `main` touching an image's folder | build that image, push `:latest` (development tag) |
| manual run ("Release") | build the chosen image from `main`, push `:YYYY.MM.DD.REV` (REV = next free number today, UTC) |
| pull request | build only, **no push, no secrets** (checks the Dockerfile still builds) |
| deploy | manual in Portainer: set the stack's `*_TAG` variable to a dated tag -> "Re-pull image and redeploy" |

Production stacks should **pin a dated tag**, not `latest`, so a push to `main` can never change what's running. The registry keeps `latest` +
the 5 newest dated tags per image, which is also the rollback window.

Images (repository path in the registry): `apps/hello`, `apps/peninei-backend`, `apps/peninei-migrate` (same Dockerfile, `--target migrate`; built alongside the backend), `apps/peninei-frontend`, later `apps/portfolio`.

## Design

**Workflows** (`.github/workflows/`):
- `build-image.yml` - a *reusable* workflow (`workflow_call`) that does the work: checkout, buildx, login, `docker/build-push-action`
  with `platforms: linux/amd64`, OCI labels (source, revision), GHA layer cache, provenance on (tested compatible with Zot's retention).
  Inputs: image name, build context, tag mode (`latest` | `release`), optional build args.
- `latest-<image>.yml` - one tiny caller per image (~10 lines) with its own `on.push.paths` filter, so only changed images rebuild. Plain
  `paths:` filters avoid a third-party paths-filter action.
- `release.yml` - `workflow_dispatch` with a **choice** input listing the images; one job per image gated by `inputs.image`. It computes the tag:
  `date -u +%Y.%m.%d` + (highest REV for today in the registry's `/v2/<repo>/tags/list`, +1). A `concurrency` group per image stops two runs
  racing for the same REV.
- `pr.yml` - on `pull_request`: same build with `push: false`, no environment, no secrets. Also runs `actionlint` and `docker compose config` on stack files.

**Credentials:** only the registry's `ci` user (push, overwrite tags, no delete). Stored as secrets `REGISTRY_USERNAME` / `REGISTRY_PASSWORD` in a
GitHub **environment** named `registry`, plus a repo *variable* `REGISTRY=registry.abrahamgreenberg.co.uk`. Non-secret build args (e.g. the
frontend's `VITE_FRONTEND_API_URL`) are repo variables, never secrets.

## Making this safe on a public repo

Settings I checked on the repo today, and what to change:

| Setting | Now | Target |
| ------- | --- | ------ |
| Default workflow token | read-only | keep; every workflow also declares `permissions: contents: read` |
| Fork PR workflows | approval for *first-time* contributors only | **require approval for all outside collaborators** |
| `main` branch | unprotected | ruleset: no force-push, no deletion (optionally require the PR build check) |
| Environments | none | `registry`: secrets live here, **deployment branches = `main` only**. Optional `release` environment with a required reviewer (you) as a second gate |
| Allowed actions | all | selected: GitHub-owned + `docker/*`, with **SHA pinning required** (setting exists), kept current by Dependabot (`github-actions` ecosystem) |
| Collaborators | only you | keep it that way: `workflow_dispatch` needs write access, so nobody else can trigger a release |

Workflow rules: never `pull_request_target` with secrets or with a checkout of PR code; secrets only in the push/dispatch jobs that use the
`registry` environment; `actions/checkout` with `persist-credentials: false`; pass `workflow_dispatch` inputs through `env:` (not `${{ }}` inside `run:`)
and use a `choice` type so the value is constrained.

Remaining risk: a leaked `ci` password can push or overwrite any tag (including a dated one a stack pins). Limits: it can't delete, it can't pull from a
stack's secrets, and rotating it is one script + two secrets (see the registry README). Later option: pin production to image **digests**.

## Changes needed in the repo

- `.github/workflows/*` as above, `.github/dependabot.yml` (actions, and Dockerfile base images / npm for the apps).
- `peninei/stack.yml`: `image: peninei-backend:latest` -> `registry.abrahamgreenberg.co.uk/apps/peninei-backend:${PENINEI_BACKEND_TAG:-latest}` (same for the frontend). Backend and frontend
  release independently, so two tag variables. `peninei/migrate/stack.yml` takes `PENINEI_MIGRATE_IMAGE` (run manually before a backend deploy that includes a migration).
- The frontend image bakes its API URL at build time, so CI passes `VITE_FRONTEND_API_URL` as a build arg (value to confirm; with path-based routing it's the
  same origin).
- `peninei/docker-compose.yml`, `peninei/scripts/` (the VPS-side build + deploy path) become unused and can go once peninei deploys from the registry.

## Deploying

1. **Manual (start here):** Portainer -> Stacks -> app -> Environment variables: set the tag -> Re-pull image and redeploy. Hello already works this way.
2. **Later, automated:** a Portainer stack **webhook** called from the release workflow. Portainer is behind SSO, so the webhook path
   (`/api/stacks/webhooks/<token>`) would need its own Traefik router with CrowdSec only; the unguessable token is the credential. Worth doing once releases are routine.
3. Not recommended: giving GitHub an SSH key to the VPS (a leaked key = root on the box).

Portainer migration note: stacks created with `docker stack deploy` show in Portainer with limited control. To manage peninei fully from Portainer, remove the CLI stack
and recreate it in Portainer (secrets and volumes are external/named so they survive; expect a minute of downtime). Monitoring uses config files from the repo and isn't
portable to Portainer's editor, so it stays CLI-deployed.

## One-time GitHub setup (phase 0)

Do this **before** pushing the workflows: a workflow that references an environment that doesn't exist creates it with no protection.

1. **Settings -> Actions -> General**
   - *Actions permissions*: "Allow abrahamgreenberg, and select non-abrahamgreenberg, actions and reusable workflows". Tick
     "Allow actions created by GitHub", add `docker/*` to the allow list, and tick **Require actions to be pinned to a full-length commit SHA**. Save.
   - *Fork pull request workflows from outside collaborators*: **Require approval for all outside collaborators**. Save.
   - *Workflow permissions*: leave "Read repository contents and packages"; leave "Allow GitHub Actions to create and approve pull requests" off.
2. **Settings -> Environments -> New environment**: name `registry`. Under *Deployment branches and tags* choose **Selected branches and tags** and add `main`.
   Add environment secrets (the `ci` registry user, not `admin`):
   `gh secret set REGISTRY_USERNAME --env registry --body ci` and `gh secret set REGISTRY_PASSWORD --env registry` (prompts, so the password stays out of shell history).
3. **Settings -> Secrets and variables -> Actions -> Variables**: new *repository variable* `REGISTRY` = `registry.abrahamgreenberg.co.uk`
   (`gh variable set REGISTRY --body registry.abrahamgreenberg.co.uk`).
4. **Settings -> Rules -> Rulesets -> New branch ruleset**: name `protect main`, enforcement *Active*, target the default branch, tick
   **Restrict deletions** and **Block force pushes**, no bypass. (Do not require pull requests yet; you push straight to `main`.)

## Rollout phases

0. **Settings + secrets** (you, in the GitHub UI): the table above; create the `registry` environment with `ci` credentials. Update the local remote:
   `git remote set-url origin https://github.com/abrahamgreenberg/VPS.git`.
1. **`hello` end to end** (built: `.github/workflows/build-image.yml`, `latest-hello.yml`, `dependabot.yml`): push a change under `hello/`, watch the run, see `apps/hello:latest` update in the registry dashboard, redeploy in Portainer.
2. **Release workflow** with the REV calculation; run it twice on `hello` (expect `.1` then `.2`), confirm retention, deploy a pinned tag via `HELLO_TAG`.
3. **Peninei:** backend + migrate + frontend callers, stack switched to registry images with tag variables, migrated into Portainer, VPS-side build files removed.
4. **Hardening:** PR build, actionlint, Dependabot, Trivy scan of built images (report first, fail on critical later).
5. **Optional:** webhook deploys; portfolio pipeline once it has a stack.

## Decisions to confirm before building

1. Release always builds from `main` HEAD (recommended), or any chosen ref?
2. Add a required-reviewer gate on the `release` environment (an extra click for you), or rely on "only you can dispatch"?
3. Build `latest` for every image on every push that touches its folder (recommended), or only when a commit message/label asks for it?
4. Image names above OK (`apps/peninei-backend`, ...)? The registry's retention applies per repository.
