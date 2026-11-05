# Portfolio

First-year writing portfolio: a static site built with [Eleventy](https://www.11ty.dev/) (Nunjucks layouts, Markdown
articles in `src/`) and served by nginx. **Not currently deployed** - bringing it back online is on the
[roadmap](../docs/roadmap.md#websites-to-host).

## Develop
    npm install
    npm start          # eleventy --serve
    npm run build      # output in _site/

## Container
`Dockerfile`: Node 20 builds `_site/`, then nginx serves it on port 80. `docker-compose.yml` is the older Compose-era
runner (publishes `127.0.0.1:${PORTFOLIO_PORT}`).

## To deploy on the platform
Needs a `stack.yml` like peninei's: `proxy-network` only, a router for the portfolio host with
`crowdsec-bouncer@swarm`, port 80, and ideally an image from the future private registry.
