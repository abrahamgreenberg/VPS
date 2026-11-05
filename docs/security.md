TODO: SECURITY

- REMOVE EXPOSED PORTAINER PORT
- FIX SSH
- ALSO SERVER BACKUPS ETC...

Here's a prioritized rundown, with the Docker/Swarm-specific gotchas that catch a lot of people.

**Lockout warning:** keep your current SSH session open while changing SSH or firewall settings, and test from a _second_ terminal before closing the first. Take a provider snapshot first.

## 1. Harden SSH

**Use key-based login and disable passwords.** Set up your key first and confirm it works:

```bash
ssh-copy-id user@your-server       # from your own machine
```

Then create `/etc/ssh/sshd_config.d/00-hardening.conf`. The `00-` prefix matters: sshd uses the **first** value it reads and files load alphabetically, so a `99-` file loses to cloud-init's `50-cloud-init.conf` (`PasswordAuthentication yes`):

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 20
AllowUsers youruser
X11Forwarding no
```

```bash
sudo sshd -t                 # syntax check
sudo sshd -T | grep -E 'passwordauth|permitroot'   # confirm the effective values
sudo systemctl reload ssh    # (or sshd on some distros)
```

Cloud images often ship a file like `50-cloud-init.conf` that sets `PasswordAuthentication yes`, and the effective value is the one that wins, so always check with `sshd -T`.

Also make sure you're using a regular user with `sudo` rather than logging in as root.

**Add brute-force protection.** Install `fail2ban` (or CrowdSec) to ban IPs that repeatedly fail logins:

```bash
sudo apt install fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

Changing the SSH port reduces log noise but isn't real security. It's optional.

## 2. Firewall, and the Docker catch

Set up `ufw` with a default-deny policy:

```bash
sudo ufw default deny incoming
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp      # only if you serve web traffic
sudo ufw enable
```

**Important:** Docker publishes ports by writing its own iptables rules, which **bypass ufw**. A service published with `-p 5432:5432` (or `ports:` in a stack file) is open to the internet even if ufw says otherwise. Ways to handle it:

- Use your **VPS provider's cloud firewall** as the main perimeter. It sits outside the host, so Docker can't bypass it. This is the easiest fix.
- Don't publish ports you don't need. Services behind Traefik/nginx should talk over an overlay network, not published ports.
- For ports that must be published but local-only, bind them to localhost (`127.0.0.1:5432:5432`).

**Swarm ports** (`2377/tcp`, `7946/tcp+udp`, `4789/udp`) must only be reachable between your nodes, never the public internet. Single-node swarm: block them entirely from outside.

**Audit what's actually exposed:**

```bash
sudo ss -tulpn                      # what's listening, and on which addresses
# from another machine:
nmap -Pn your-server-ip
```

Anything listening on `0.0.0.0` that isn't SSH/80/443 deserves a second look.

## 3. Docker/Swarm-specific risks

- **Never expose the Docker API** (port 2375/2376) publicly. It's effectively root on the host, and it's a classic way servers get cryptomined.
- **Be careful with `/var/run/docker.sock`.** Any container that mounts it can control the whole host. Traefik commonly does this, so consider a socket proxy (e.g. `tecnativa/docker-socket-proxy`) that exposes only read-only endpoints.
- **Protect dashboards.** Traefik, Portainer, and similar UIs should be behind auth (like your htpasswd file), ideally with HTTPS and IP allow-listing or a VPN. Exposed Portainer instances get found and attacked constantly.
- **Use Docker secrets** rather than plaintext environment variables for passwords and keys, and keep secrets out of git.
- **Encrypt overlay traffic** if nodes talk over a public network: `docker network create --opt encrypted -d overlay mynet`.
- **Harden containers** where you can: run as non-root (`user:`), `read_only: true`, drop capabilities (`cap_drop: [ALL]`), and avoid `privileged: true`.
- **Keep images updated.** Old images carry known vulnerabilities. `docker scout quickview <image>` or `trivy image <image>` will scan them.

## 4. General system hygiene

- **Automatic security updates** with `unattended-upgrades`, as covered earlier.
- **Remove or disable services you don't use**; check with `systemctl list-unit-files --state=enabled`.
- **Run an audit:** `sudo apt install lynis && sudo lynis audit system` gives a scored list of suggestions.
- **Back up off-server** and test restoring. Many "security incidents" end up being ransomware or accidental deletion.
- **Review logins:** `last`, `sudo lastb | head`, and `sudo journalctl -u ssh --since "24 hours ago"` show who's been connecting or trying to.

## Most common ways small servers get compromised

1. SSH with password login enabled and weak or reused passwords
2. Databases or caches (Redis, MongoDB, Postgres, Elasticsearch) published to the public internet with no or default credentials
3. Exposed Docker API or an unprotected admin dashboard (Portainer, Traefik, phpMyAdmin)
4. Outdated software, especially public-facing web apps and old images
5. Secrets committed to git or stored in plain env files
6. Containers running privileged or with the Docker socket mounted
7. No backups, so any incident becomes a disaster

If you tell me your OS and what services you run (and whether you use Traefik), I can give you a more specific checklist. If you paste the output of `sudo ss -tulpn`, I can point out anything that looks exposed.

---

## Later: Docker hardening (TODO)

- [ ] Pin remaining `:latest` images (`crowdsec`, `fbonalair/traefik-crowdsec-bouncer`, `pgadmin4`, `traefik/whoami`, portainer `lts`); check the bouncer image is still maintained
- [ ] Docker socket proxy (`tecnativa/docker-socket-proxy`, read-only) in front of Traefik; review the Portainer agent socket + volumes mount
- [ ] `cap_drop: [ALL]`, `read_only: true`, non-root `user:` per service, only where compatible (test each on redeploy)
- [ ] Encrypted overlay networks (`--opt encrypted`) if a second node is ever added
- [ ] Image scanning (`trivy image` / `docker scout`) for peninei and the pinned third-party images
- [ ] Move `CROWDSEC_BOUNCER_API_KEY` env var to the existing `crowdsec_bouncer_api_key` Swarm secret (if the bouncer supports `_FILE`)
- [ ] Remove unused secret `traefik_dashboard_auth`; review the dangling anonymous volumes (after backups)
- [ ] `lynis audit system` and act on the findings
