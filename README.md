# Private VPS

## Services

-   **Backend:** Express.js API
-   **Database:** PostgreSQL + PgAdmin
-   **Proxy:** Nginx / Nginx Proxy Manager
-   **Frontend:** Vite + React.js + Tailwind

## Road Map

### Current deployed containers

-   Peninei halacha scraper
-   PG Admin
-   Postgres
-   Nginx proxy manager (npm)
-   Portainer

### Stage 1: Setup improvements

-   [x] I need to sort out my IDE. Setup profiles & extensions properly.
-   [x] Merge all projects into a [monorepo](https://chatgpt.com/c/690265e2-e6e0-832e-9c95-1e4dc8ef236f).
-   [x] Set reminders to pay for VPS, Domain & ai services.

### Stage 2: Security basic

-   [ ] Build nodejs reverse proxy with authentication on admin pannels (e.g nginx proxy manager, pgadmin)
    -   [ ] Npm setup:
        -   [ ] Authenticated routes: req -> npm (ssl) -> auth server -> service
        -   [ ] Unauthenticated routes: req -> npm (ssl) -> service
-   [x] Add rate limiting to pneinei halacha scraper to prevent abuse.

    -   [x] Add rate limiting to penienei halacha frontend
    -   [x] make pnpm package store docker container
    -   [x] fix not working when deployed

-   [ ] switch to alpine base image for docker containers
    -   [ ] use pnpm store for other node based containers
    -   [ ] make scripts for peninei to automate deploying in staging & in production
-   [x] Add caching to peninei halacha scraper to improve performance and reduce load on the server.
        <br/>_(at this point peninei halacha scraper is able to be advertised as a service 🎉)_

### Stage 3: Security+

-   [ ] Make reverse proxy in go for 🔥 better performance
    -   [ ] Npm setup:
        -   [ ] Authenticated routes: req -> npm (ssl) -> node js auth -> go proxy -> auth server -> service
        -   [ ] Unauthenticated routes: req -> npm (ssl) -> service

### Stage 4: Security++

-   [ ] Add authentication to go reverse proxy for 🔥🔥 best performance
    -   [ ] Npm setup:
        -   [ ] Authenticated routes: req -> npm (ssl) -> go auth proxy -> auth server -> service
        -   [ ] Unauthenticated routes: req -> npm (ssl) -> service
-   [ ] Look into adding ssl in go proxy for 🔥🔥🔥 ultimate performance
    -   [ ] VPS setup:
        -   [ ] Authenticated routes: req -> go ssl auth proxy -> auth server -> service
        -   [ ] Unauthenticated routes: req -> go ssl proxy -> service

## Future Projects

(in a particular order, the order i want to do them the most in)

-   [ ] Learn Next.js
-   [ ] Make home page to show off the services, make it look nice :)
-   [ ] Setup monitoring for server resources.
-   [ ] Make admin panel to _stuff_
-   [ ] Setup automated backups for Postgres database.
-   [ ] **Automation:** Extend scrapers to other texts, e.g mishneh torah.
-   [ ] **Codeshare Website:** Share git projects, files, or code segments.
-   [ ] Look into pipelines for CI/CD.
-   [ ] Scripts to backup database, delete log files & get logs authomatically.
-   [ ] Setup email server for the coolest email address ever.
-   [ ] start typescript port of peninei

**_To infinity and beyond🚀_**
