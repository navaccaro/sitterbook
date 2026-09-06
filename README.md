# SitterBook

SitterBook is a babysitting coordination app for sitters and families to manage availability, approve access, and reserve time blocks without overlaps.

## Tech stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Prisma with PostgreSQL for hosted persistence

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

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Add these production environment variables:

```text
DATABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
TOKEN_ENCRYPTION_KEY
```

3. Deploy. Vercel runs `prisma migrate deploy` before the Next.js build.
4. Add the deployed callback URL to the Google OAuth client.
5. Add the custom domain in Vercel under **Settings > Domains**.

## Product direction

The database is seeded automatically the first time the app reads from it. Set `DATABASE_URL` to your Neon PostgreSQL connection string before running migrations. Useful database commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
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
