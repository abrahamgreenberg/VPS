# portainer - Swarm ops UI

**What:** web UI for services, containers, logs, volumes and stacks.

| Service | Image | Detail |
| ------- | ----- | ------ |
| `agent` | `portainer/agent:lts` | global (one per node); mounts the Docker socket and `/var/lib/docker/volumes` |
| `portainer` | `portainer/portainer-ce:lts` | `portainer.<domain>` behind `sso@swarm` (+ its own login); data in `portainer_data` |

Networks: `agent_network` (private, Portainer <-> agent), `proxy-network`.

**No ports are published.** Portainer used to publish 9000/9443; they were open to the internet because Swarm ignores a
`127.0.0.1` bind. It is now reachable only through Traefik. If Traefik/SSO is down, use the `docker` CLI over SSH.

## Deploy
    docker stack deploy -c infrastructure/portainer/stack.yml portainer

If you ever re-add or remove `ports:`, `docker stack deploy` won't unpublish a removed port; use
`docker service update --publish-rm <port> portainer_portainer`.

## Notes
- The agent has the Docker socket (root-equivalent on the host): another reason this UI sits behind SSO.
- Images are on the `lts` tag (not pinned to a version).
