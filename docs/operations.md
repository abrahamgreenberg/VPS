# Operations

Running the VPS day to day: host security, backups, housekeeping, and the recovery notes I'd want at 2am.
For first-time setup and deploying stacks see [deployment.md](deployment.md); for what's still to do see
[roadmap.md](roadmap.md).

## Host security

Applied on the VPS. **Lockout warning:** keep your current SSH session open while changing SSH or the firewall, and
test from a *second* terminal before closing the first. Take a provider snapshot first.

### Perimeter: Vultr cloud firewall

Inbound allowed: **22/tcp** (ideally only my IP), **80/tcp**, **443/tcp**, **4317/tcp** (OTLP gRPC gateway). Everything else denied.

Why the cloud firewall and not `ufw`: Docker publishes ports by writing its own iptables rules, which **bypass
ufw**. The cloud firewall sits outside the host so Docker can't bypass it. It also covers the Swarm ports (2377,
7946, 4789/udp), which listen on all interfaces and must never be public.

Audit what's listening: `sudo ss -tulpn` (anything on `0.0.0.0` other than 22/80/443/4317 and the Swarm ports deserves a look), and `nmap -Pn <vps-ip>` from another machine.

### SSH

Key-only login, no root. Test key login from a second terminal first:
`ssh -o PreferredAuthentications=publickey -o PasswordAuthentication=no devuser@<vps-ip> 'echo ok'`.

`/etc/ssh/sshd_config.d/00-hardening.conf`:

    PasswordAuthentication no
    KbdInteractiveAuthentication no
    PermitRootLogin no
    PubkeyAuthentication yes
    MaxAuthTries 3
    LoginGraceTime 20
    AllowUsers devuser
    X11Forwarding no

The `00-` prefix matters: sshd uses the **first** value it reads and drop-ins load alphabetically, so a `99-` file
would lose to cloud-init's `50-cloud-init.conf` (`PasswordAuthentication yes`). Always confirm the effective values:

    sudo sshd -t && sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin|allowusers|maxauthtries'
    sudo systemctl reload ssh

TCP forwarding is left on deliberately: with no published ports, an SSH tunnel is the fallback to reach a service.

### fail2ban

`/etc/fail2ban/jail.d/sshd.local`:

    [sshd]
    enabled = true
    backend = systemd
    maxretry = 4
    findtime = 10m
    bantime = 1h
    bantime.increment = true

Check: `sudo fail2ban-client status sshd`.

### Automatic patching

`unattended-upgrades`, security origins only, **no automatic reboot** (a reboot takes down the single-node Swarm).

    # /etc/apt/apt.conf.d/20auto-upgrades
    APT::Periodic::Update-Package-Lists "1";
    APT::Periodic::Unattended-Upgrade "1";
    # /etc/apt/apt.conf.d/52unattended-local
    Unattended-Upgrade::Remove-Unused-Dependencies "true";
    Unattended-Upgrade::Automatic-Reboot "false";

Docker's own packages are not in the allowed origins on purpose: a `dockerd` restart would bounce every service.
After kernel updates `/var/run/reboot-required` appears - reboot at a time I choose.

### Docker / Swarm notes

- Services behind Traefik talk over overlay networks, not published ports. Only Traefik publishes (80, 443, 4317).
- Swarm ignores a `127.0.0.1:` bind on published ports (it still listens on `0.0.0.0`), and `docker stack deploy` doesn't
  unpublish ports removed from the file - use `docker service update --publish-rm <port> <service>`.
- Admin UIs (Traefik, Grafana, pgAdmin, Portainer) are behind `sso@swarm` (CrowdSec -> oauth2-proxy + GitHub); see
  [auth](../infrastructure/auth/README.md). Remaining Docker hardening is tracked in the [roadmap](roadmap.md#security).
- Never expose the Docker API (2375/2376). The Docker socket is mounted into Traefik (read-only) and the Portainer agent.
- Review logins occasionally: `last`, `sudo lastb | head`, `sudo journalctl -u ssh --since "24 hours ago"`.

## Backups

Local only for now. Nightly `pg_dumpall` of every database + role to `/var/backups/postgres/`, **newest 2 kept**,
verified before older dumps are rotated. Details, install and restore steps:
[infrastructure/backup/README.md](../infrastructure/backup/README.md).

What is **not** backed up: Grafana/Loki/Prometheus/Tempo/Portainer/CrowdSec volumes, Traefik's `acme.json`, and the
Swarm secrets (keep the source values in a password manager). The dumps live on the same disk as the database, so
they protect against a bad migration or an accidental delete, **not** disk loss. Off-box backups are on the roadmap.

## Housekeeping

A weekly systemd timer prunes stopped containers, dangling and old unused images, old build cache, stale anonymous
volumes and the system journal; named volumes are never touched. Details and `--dry-run`:
[infrastructure/maintenance/README.md](../infrastructure/maintenance/README.md).

**Docker log rotation (one-time, manual).** Container logs are unbounded by default. Merge into `/etc/docker/daemon.json`:

    { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }

It applies to containers created after a Docker restart. `sudo systemctl restart docker` restarts every container
(brief downtime on a single-node Swarm), so do it in a maintenance window, e.g. with a kernel-update reboot.

Telemetry retention is capped in the configs: Loki 7d, Tempo 7d, Prometheus 15d.

## Check-ups

Monthly: `sudo apt list --upgradable` and `/var/run/reboot-required`; image updates; cert expiry; CrowdSec decisions
(`docker exec <crowdsec container> cscli decisions list`); `ls -lh /var/backups/postgres` (two recent dumps?);
`df -h /`; `systemctl list-timers`; a restore test.

## Recovery notes

- **Locked out of a dashboard by SSO:** SSH in, set that router's middleware label to `crowdsec-bouncer@swarm`, redeploy
  its stack. Public apps (peninei) never depend on SSO.
- **Portainer unreachable:** it has no published port by design. Use the `docker` CLI over SSH.
- **Restore Postgres:** see the backup README. Restore into a scratch/fresh cluster, never over a live one.
- **Rolled back a bad deploy:** `docker service rollback <stack>_<service>`.
