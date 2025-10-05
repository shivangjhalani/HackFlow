# Backend Design (Simplified)

This document outlines a minimal backend architecture based on the simplified requirements, database, and user flows.

## Goals
- Provide a simple HTTP API to power the core hackathon lifecycle.
- Use the simplified MySQL schema.
- Keep the technology stack and features to a minimum.

## Non-Goals
- Complex authentication (no JWTs, OIDC, or sessions).
- Advanced features like detailed auditing, notifications, or a scheduler.
- Multi-hackathon support.

## Architecture Choice
**— Monolithic HTTP API (TypeScript, Fastify) + MySQL**

A single, simple API server is sufficient for the MVP. Fastify and TypeScript provide a good balance of performance and developer experience.

### Components
- **API Server**: Fastify (TypeScript).
- **Database Access**: A query builder like Kysely or the `mysql2` driver for raw SQL.
- **Database Schema**: The simplified schema in `docs/database-design.md` is the source of truth.

## Authentication (Placeholder)
To keep things simple, the backend will be stateless and will trust a username passed in a custom request header (e.g., `X-User-Username`). This is not secure for production but is adequate for an MVP.

- The frontend or an API gateway will be responsible for setting this header.
- On first access with a new username, a `user` row is automatically created, and a database trigger assigns the default 'participant' role.

## Authorization
Route handlers will perform simple role checks based on the username from the header. For example, checking if the user has the 'admin' role before allowing access to an admin-only endpoint.

## API Surface (Minimal Endpoints)

### Hackathon Setup
- `GET /hackathon` — Fetch the singleton hackathon's details.
- `PUT /hackathon` — (Admin-only) Update details or status.
- `GET /hackathon/phases` — List timeline phases.
- `PUT /hackathon/phases` — (Admin-only) Set the timeline phases.

### Tracks & Prizes
- `GET /tracks`, `POST /tracks` — (Organizer/Admin) List or create tracks.
- `GET /prizes`, `POST /prizes` — (Organizer/Admin) List or create prizes.

### Users & Roles
- `POST /users/:username/roles` — (Admin-only) Assign 'organizer' or 'judge' role.

### Teams & Invites
- `GET /teams/me` — Get the current user's team.
- `POST /teams` — Create a new team.
- `POST /teams/:teamId/invites` — Invite a user to the team.
- `POST /invites/:inviteId/accept` — Accept a team invitation. **Calls the `sp_accept_team_invite` stored procedure.**

### Projects & Submissions
- `GET /projects/my` — Get the current user's team project/submission.
- `POST /projects` — Create the initial project for the user's team.
- `PUT /projects/my` — Update the project/submission details. **The `trg_project_submission_window` trigger will prevent this if the submission phase is over.**

### Judging
- `GET /judging/assignments` — (Judge-only) Get projects assigned to the current judge.
- `POST /scores` — (Judge-only) Submit scores for a project. **The `trg_score_entry_window` trigger will prevent this if the judging phase is not active.**
- `POST /projects/:projectId/assign` — (Organizer/Admin) Assign a judge to a project.

### Communications & Awards
- `GET /announcements` — List all announcements.
- `POST /announcements` — (Organizer/Admin) Create a new announcement.
- `POST /prizes/:prizeId/award` — (Organizer/Admin) Award a prize to a project. **Calls the `sp_award_prize` stored procedure.**

## Configuration
- `DATABASE_URL`: The connection string for the MySQL database.
- `INITIAL_ADMIN_USERNAME`: On first startup, if no admin exists, an admin user is created with this username. This is an idempotent operation.
