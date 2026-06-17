# Form Builder

A full-stack, self-hosted form builder for creating, publishing, and managing online forms. Features a drag-and-drop interface, conditional logic, webhooks, analytics, and file uploads.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [License](#license)

---

## Features

### Form Building
- **Drag-and-drop editor** with 22 field types including text, number, email, file upload, signature, rating, scale, and more
- **Multi-page forms** with per-page navigation and progress indicators
- **Conditional logic** to show, hide, or require fields based on user input
- **Customizable themes** with configurable colors, fonts, and border radius

### Sharing & Distribution
- **Public form URLs** with optional authentication requirement
- **Iframe embedding** for seamless website integration
- **QR code generation** for easy mobile access

### Data & Analytics
- **Response management** — view, filter, delete, and export submissions to CSV
- **Webhooks** with real-time HTTP delivery and delivery logs
- **Daily analytics** tracking views, starts, and completion rates
- **Form templates** to save and reuse your best designs

### Authentication & Infrastructure
- **Email/password authentication** with email verification and password reset flows
- **File uploads** via ImageKit with direct browser-to-CDN transfers
- **Secure sessions** using custom session cookies with bcrypt password hashing

---

## Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend           | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| State Management   | Zustand + Immer                                 |
| Form Rendering     | React Hook Form + Zod                           |
| API                | tRPC with OpenAPI spec generation               |
| Database           | PostgreSQL + Drizzle ORM                        |
| Authentication     | Custom session cookies, bcryptjs                |
| File Storage       | ImageKit                                        |
| Email              | Nodemailer + SMTP                               |
| Logging            | Winston                                         |
| Monorepo Tooling   | Turborepo, pnpm workspaces                      |

---

## Architecture

The project is organized as a **Turborepo monorepo** using pnpm workspaces.

```
form-builder/
├── apps/
│   ├── api/                  # Express + tRPC server (port 8000)
│   └── web/                  # Next.js frontend (port 3000)
│
├── packages/
│   ├── database/             # Drizzle ORM schema & migrations
│   ├── trpc/                 # tRPC routers, context, auth middleware
│   ├── services/             # Business logic
│   │   ├── form/             # Forms, pages, fields, responses, webhooks, analytics, templates
│   │   ├── user/             # Authentication, sessions, password reset
│   │   ├── mail/             # Email delivery
│   │   └── clients/          # ImageKit, Google OAuth
│   ├── logger/               # Winston logger configuration
│   ├── eslint-config/        # Shared ESLint configuration
│   └── typescript-config/    # Shared TypeScript configuration
│
├── docker-compose.yml
├── setup.sh
├── turbo.json
└── pnpm-workspace.yaml
```

The `apps/api` server exposes a tRPC router that `apps/web` consumes directly via the tRPC client. The API also supports HTTP access for OpenAPI consumers, enabling integration with external services.

---

## Getting Started

### Prerequisites

| Requirement | Notes                                                              |
|-------------|--------------------------------------------------------------------|
| Node.js     | Version 22 or higher                                               |
| pnpm        | Enable via `corepack enable` or install with `npm install -g pnpm` |
| Docker      | Required for running PostgreSQL locally                            |

### Installation

#### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd form-builder
./setup.sh
```

> **Note:** `setup.sh` copies `.env.example` to `.env` (if it doesn't exist), symlinks the root `.env` into every workspace, and runs `pnpm install`.

#### 2. Configure Environment Variables

Edit the root `.env` file with your configuration. See [Environment Variables](#environment-variables) for details.

#### 3. Start the Database

```bash
docker compose up -d
```

Starts a PostgreSQL container on port `5432` with the following defaults:

- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `dev`

#### 4. Apply Database Migrations

```bash
pnpm db:migrate
```

#### 5. Start Development Servers

```bash
pnpm dev
```

The application will be available at:

- **API:** http://localhost:8000
- **Web App:** http://localhost:3000

---

## Environment Variables

All configuration lives in a single root `.env` file that is symlinked into each workspace.

```env
# ── Database ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev

# ── API Server ────────────────────────────────────────────────────
PORT=8000
BASE_URL=http://localhost:8000
WEB_APP_URL=http://localhost:3000

# ── ImageKit (File Uploads) ───────────────────────────────────────
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

# ── SMTP (Email Delivery) ─────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=2525
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Form Builder
SMTP_FROM_EMAIL=noreply@example.com
```

| Variable        | Description                                          |
|-----------------|------------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string                         |
| `PORT`          | API server port                                      |
| `BASE_URL`      | Public URL of the API server                         |
| `WEB_APP_URL`   | Public URL of the web application                    |
| `IMAGEKIT_*`    | ImageKit credentials for file upload functionality   |
| `SMTP_*`        | SMTP server configuration for transactional emails   |

---

## Scripts

Run these commands from the monorepo root.

| Command            | Description                                          |
|--------------------|------------------------------------------------------|
| `pnpm dev`         | Start all apps in development mode with hot reload   |
| `pnpm build`       | Build all packages and apps for production           |
| `pnpm lint`        | Run ESLint across all packages                       |
| `pnpm format`      | Format code with Prettier                            |
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |
| `pnpm db:migrate`  | Apply pending database migrations                    |
| `pnpm db:studio`   | Open Drizzle Studio for database exploration         |

---

## Deployment

### Build for Production

```bash
pnpm build
```

### Build Outputs

| App        | Output            | Description               |
|------------|-------------------|---------------------------|
| `apps/api` | `dist/index.js`   | Bundled Node.js server    |
| `apps/web` | `.next/`          | Standard Next.js build    |

### Deployment Checklist

1. Set environment variables to production values
2. Run database migrations against your production database
3. Deploy the API using a process manager (PM2) or containerize with Docker
4. Deploy the web app to your preferred hosting platform (Vercel, Docker, etc.)

### Example: Running with PM2

```bash
# API
pm2 start apps/api/dist/index.js --name form-builder-api

# Web
pm2 start --name form-builder-web -- pnpm --filter web start
```

---

## License

MIT