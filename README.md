# SitterBook

SitterBook is a babysitting coordination app for sitters and families to manage availability, approve access, and reserve time blocks without overlaps.

## Tech stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Prisma with SQLite for local persistence

## Getting started

```bash
npm install
npm run db:migrate
npm run dev
```

Then open http://localhost:3000.

To enable real Google sign-in and two-way booking sync, create Google OAuth web credentials and set these values in `.env`:

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
TOKEN_ENCRYPTION_KEY="a-long-random-secret"
```

Add the same redirect URI to the Google OAuth client. `TOKEN_ENCRYPTION_KEY` protects Google tokens at rest. Without Google values, local demo sign-in and prefilled Google Calendar links remain available.

## Product direction

The local database is seeded automatically the first time the app reads from it. Useful database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

Implemented capabilities include:

- sitter-created availability blocks
- parent sign-in and approval flow
- time-block booking within open windows
- calendar-ready booking confirmations
- multi-user admin workflows
- HTTP-only family sessions
- Prisma-backed persistent data layer
- server-side approval and booking ownership checks
- Google OAuth sessions with refreshable Calendar API tokens
- Google Calendar booking synchronization with stable event IDs
