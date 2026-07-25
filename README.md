# Magma Autospa — Loyalty & Operations Platform

Customer loyalty + branch operations platform for Magma Autospa.
Built with Next.js, SQLite, NextAuth.

## Roles
- **Customer** — served in-person, no login, gets bill + reward updates via WhatsApp
- **Staff** — branch-level, serves customers, logs transactions, processes redemptions
- **Manager** — branch-level, everything Staff can do + branch analytics + staff management
- **Admin** — full access across all branches: services & pricing, offers & combos, staff, branch management

## Tech Stack
- Next.js (API layer + frontend)
- SQLite (database)
- NextAuth (JWT-based auth, role-based access control)
- WhatsApp Business API (customer bill/rewards messaging)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. `npm run dev`

## Reference
See `/docs/PRD.md` for the full product requirements document, and `/docs/clickthrough-prototype.html` for the click-through UI reference (open it in any browser — it's not real code, just a visual/UX spec).
