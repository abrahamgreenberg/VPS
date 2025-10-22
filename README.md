# Private VPS Roadmap

This repository contains notes and a roadmap for setting up and maintaining a private VPS with various services, scrapers, and a frontend UI.

## Project roadmap

1. [Project Overview](#project-overview)
2. [Setup Instructions](#setup-instructions)
3. [Services](#services)
4. [Scrapers](#scrapers)
5. [UI Development](#ui-development)
6. [Security](#security)
7. [Email Setup](#email-setup)
8. [Service API](#service-api)
9. [Future Projects](#future-projects)

---

## TODO:

-   Finish off peninei scraper

## Project Overview

This VPS hosts multiple services and applications:

-   **Backend & Database:** Node.js / Express + PostgreSQL
-   **Frontend:** Vite + React.js + Tailwind
-   **Proxies & Routing:** Nginx / Nginx Proxy Manager
-   **Scrapers:** Peninei Halacha, Rambam Mishneh Torah
-   **Additional Features:** Codeshare website, mail server, authentication

---

## Setup Instructions

1. **Docker Setup**

    - Run all services in Docker containers for easy deployment and isolation.
    - Example services include backend, frontend, database, and mail server.

2. **Networking**

    - Connect containers to a common Docker network for internal communication.
    - Expose only necessary ports to reduce attack surface.

3. **Domain Setup**

    - Add your domain to Nginx / Nginx Proxy Manager.
    - Configure SSL using Let’s Encrypt.

4. **Frontend**

    - Load Vite frontend through the configured domain.
    - Enable CORS for API requests.

---

## Services

-   **Backend:** Express.js API
-   **Database:** PostgreSQL + PgAdmin
-   **Proxy:** Nginx / Nginx Proxy Manager
-   **Frontend:** Vite + React.js + Tailwind
-   **Email Server:** Optional Docker email server for sending emails

---

## Scrapers

### Peninei Halacha

-   Scrapes Hebrew texts from [Peninei Halacha](https://ph.yhb.org.il).
-   Stores data in PostgreSQL.
-   Includes translation workflow for English.

### Rambam Mishneh Torah

-   Scrape daily content automatically.
-   Store and log data in PostgreSQL for easy access.

---

## UI Development

-   **Main Page:** List all available pages from the database.
-   **Frontend:** Vite + React.js
-   **Features:**

    -   View website content
    -   Access scrapers’ data
    -   API for services

---

## Security

-   Limit exposed ports.
-   Consider adding **Google Authentication** for all routes.
-   Run services behind a reverse proxy (Nginx) with SSL.

---

## Email Setup

-   Explore Docker email servers (e.g., Mailu, Mailcow).
-   Optional: Configure VPS mail server for notifications and user communication.

---

## Service API

-   Define a standard API for backend services.
-   Implement logging for all service calls.

---

## Future Projects

-   **Codeshare Website:** Share git projects, files, or code segments.
-   **Automation:** Extend scrapers to other texts.
-   **Enhanced Security:** Continuous improvement and monitoring.

---

## Notes

-   All services should run in Docker for portability.
-   Keep backups of databases and scraper data.
-   Regularly update services and dependencies for security.

---

**_To infitity and beyond🚀_**
