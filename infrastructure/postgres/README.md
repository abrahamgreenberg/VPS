# postgres - shared database + pgAdmin

**What:** one PostgreSQL instance for the apps (peninei uses it today) and pgAdmin to poke at it.

| Service | Image | Detail |
| ------- | ----- | ------ |
| `postgres` | `postgres:15` | data in the `postgres_data` volume, default DB `my_app_db`, credentials from secrets; on a manager, `stop-first` updates |
| `pgadmin` | `dpage/pgadmin4:latest` | `pgadmin.<domain>`, behind `sso@swarm` plus its own login |

Networks: `database-network` (Postgres is reachable **only** here, at `postgres_postgres:5432`; nothing is published),
`proxy-network` (pgAdmin only).

Secrets: `postgres_user`, `postgres_password`, `pgadmin_default_email`, `pgadmin_default_password`
([how to create](../../docs/deployment.md#3-secrets)). The monitoring stack's postgres-exporter reuses the first two.

## Deploy
    docker stack deploy -c infrastructure/postgres/stack.yml postgres       # name must be "postgres"

## Operate
    docker exec -it $(docker ps -qf name=postgres_postgres) sh -c 'psql -U "$(cat /run/secrets/postgres_user)" -d postgres'

- **Backups:** nightly dump via [infrastructure/backup](../backup/README.md). Restore steps are there.
- **New app:** create a database + role for it, store its URL as a Swarm secret (like `peninei_database_url`), attach the
  app to `database-network`.
- pgAdmin keeps its own settings in an anonymous volume (no named volume in the stack), so its saved server list may be
  lost when its task is recreated.
- Pin note: `pgadmin4` is `latest`.
