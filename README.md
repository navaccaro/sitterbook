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
