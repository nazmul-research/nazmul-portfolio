# Nazmul Portfolio CMS

Production-ready Next.js portfolio with an integrated CMS admin panel.

## Stack

- **Frontend + Backend:** Next.js (App Router) on **Vercel**
- **Database:** **Neon Postgres** (via Prisma)
- **Auth:** NextAuth (credentials + security hardening)
- **ORM:** Prisma

## Deployment (Current Setup)

This project is intended to run on:

- **Vercel** for hosting
- **Neon** for PostgreSQL database

### Required Environment Variables

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
NEXTAUTH_SECRET="<long-random-secret>"
NEXTAUTH_URL="https://<your-vercel-domain>"
NEXT_PUBLIC_SITE_URL="https://<your-vercel-domain>"
ADMIN_EMAIL="admin@nazmul.dev"
ADMIN_PASSWORD="<strong-password>"
DRAFT_PREVIEW_TOKEN="<long-random-token>"
```

## Scripts

```bash
npm run dev            # local dev
npm run lint           # lint
npm run build          # production build
npm run vercel-build   # prisma db push + next build (for Vercel)
npm run db:push        # push Prisma schema
npm run db:seed        # seed initial content/admin
```

## Notes

- `vercel-build` is set so Prisma schema is pushed before build.
- If deploying first time, confirm DB connection and env vars are correct.
- GitHub Pages is used only as redirect entry; app runtime is on Vercel.
