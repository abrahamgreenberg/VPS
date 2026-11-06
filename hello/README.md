# hello - first app deployed from the private registry

A one-page static site (non-root nginx on port 8080). It exists to prove the whole loop:
**build on my PC -> push to `registry.<domain>` -> deploy with Portainer -> `https://hello.<domain>`.**
It is a template for later apps: copy `Dockerfile` + `stack.yml`, change the names.

| File | Purpose |
| ---- | ------- |
| `index.html`, `Dockerfile` | the site and its image (`nginxinc/nginx-unprivileged:1.30-alpine`, healthcheck, `VERSION` build arg shown on the page) |
| `stack.yml` | Swarm stack: 1 replica, `proxy-network`, Traefik router with `crowdsec-bouncer@swarm`, rolling update with automatic rollback. `image:` takes `${HELLO_TAG:-latest}` |

## One-time setup
1. DNS (Namecheap): `A` record `hello` -> the VPS IP (not needed if `*` already points there).
2. Portainer -> **Registries -> Add registry -> Custom registry**: name `registry`, URL `registry.abrahamgreenberg.co.uk`,
   enable authentication, username `deployer` and its password. (Pull-only, so Portainer can never push or delete.)

## Build and push (from the PC)
Use the `ci` user. Build for the VPS architecture (`linux/amd64`) explicitly.

    docker login registry.abrahamgreenberg.co.uk -u ci
    cd hello
    docker build --platform linux/amd64 --build-arg VERSION=latest \
      -t registry.abrahamgreenberg.co.uk/apps/hello:latest .
    docker push registry.abrahamgreenberg.co.uk/apps/hello:latest

A numbered release (kept by the registry's retention rule; REV counts releases made that day):

    TAG=2026.11.05.1
    docker build --platform linux/amd64 --build-arg VERSION=$TAG -t registry.abrahamgreenberg.co.uk/apps/hello:$TAG .
    docker push registry.abrahamgreenberg.co.uk/apps/hello:$TAG

Check it landed: open the registry dashboard (`https://registry.abrahamgreenberg.co.uk/`) and look for `apps/hello`.

## Deploy with Portainer
Stacks -> **Add stack**:
- Name: `hello`, type: Swarm (Portainer on a Swarm shows this automatically).
- Build method **Web editor**: paste `stack.yml`. Or **Repository**: URL `https://github.com/abrahamgreenberg/VPS`, reference
  `refs/heads/main`, compose path `hello/stack.yml` - this is the one to use long-term, because the stack then lives in git.
- Environment variables (optional): `HELLO_TAG` = `latest` or a release like `2026.11.05.1`.
- **Deploy the stack**, then open `https://hello.abrahamgreenberg.co.uk`. The first request can be slow while the
  certificate is issued.

## Update
Push a new image, then in Portainer: Stacks -> `hello` -> Editor -> turn on **Re-pull image and redeploy** -> **Update the
stack**. (To change versions, change `HELLO_TAG` there.) Swarm starts the new task first and rolls back if it never
becomes healthy. The page's "Version" line shows which build is live.

## If Portainer can't pull the image
- Is the registry added with the `deployer` password, and does the stack's image host match its URL exactly?
- Test the credential by hand on the VPS: `docker login registry.abrahamgreenberg.co.uk -u deployer` then
  `docker pull registry.abrahamgreenberg.co.uk/apps/hello:latest`.
- CLI fallback that doesn't involve Portainer: `docker stack deploy --with-registry-auth -c hello/stack.yml hello`.
