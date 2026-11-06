# Portfolio

First-year writing portfolio: a static site built with [Eleventy](https://www.11ty.dev/) (Nunjucks layouts, Markdown
articles in `src/`) and served by non-root nginx. Host: `portfolio.abrahamgreenberg.co.uk` (public, CrowdSec only - no SSO).
Moving it to the apex domain is on the [roadmap](../docs/roadmap.md#websites-to-host).

## Develop
    npm install
    npm start          # eleventy --serve
    npm run build      # output in _site/

## Image and deploy
`Dockerfile`: Node 20 builds `_site/`, then `nginxinc/nginx-unprivileged` serves it on port 8080 (113 MB on disk).
CI builds it (nothing is built on the VPS):

- a push to `main` that touches `portfolio/` builds and pushes `registry.abrahamgreenberg.co.uk/apps/portfolio:latest`
  ([`latest-portfolio.yml`](../.github/workflows/latest-portfolio.yml));
- Actions -> **release** -> image `portfolio` pushes a dated tag `YYYY.MM.DD.REV`.

Deploy with [`stack.yml`](stack.yml) in Portainer (Stacks -> Add stack, name `portfolio`; optional env var `PORTFOLIO_TAG`,
default `latest`; the registry must be added in Portainer with the `deployer` user). Updates are start-first with automatic
rollback. To update: "Re-pull image and redeploy" for `latest`, or set `PORTFOLIO_TAG` to a dated tag.
Details: [docs/ci-cd.md](../docs/ci-cd.md).
