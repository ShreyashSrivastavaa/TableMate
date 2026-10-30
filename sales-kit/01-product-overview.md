# TableMate AI — Product Overview & Technical Scope

## 1. Product Description
TableMate AI is a reservation and table capacity management platform built for independent dining rooms. Each partner restaurant receives a dedicated public booking desk (`/r/:slug/book`), a downloadable high-resolution QR code, and a password-protected host administration portal (`/r/:slug/admin`). Powered by a serverless PostgreSQL backend with Prisma ORM, TableMate eliminates chaotic phone calls and manual registers while preventing double-bookings through atomic database transaction checks.

## 2. Core Verified Features
- **Zero Double-Bookings:** Smart floor allocation logic matches party size to best-fit physical tables (2-tops, 4-tops, 6-tops, banquet) and rejects overlapping bookings within a 90-minute dining turn window (HTTP 409 `SLOT_UNAVAILABLE`).
- **Dedicated Public Portals & QR Codes:** Direct URLs per restaurant with instantly generated printable QR codes ready for table tents, window vinyls, and social bios.
- **Manual WhatsApp Click-to-Chat (`wa.me`):** Both customer confirmation and host dashboard feature verified `wa.me` pre-filled links for status communication with 100% human review.
- **Live Host Administration:** Real-time 15-second polling, "NEW" reservation indicator badges, instant 1-click status transitions (`CONFIRMED`, `CANCELLED`), and CSV export for spreadsheets.
- **Mandatory Host Password Change:** Temporary passwords generated during onboarding require a permanent password update on first login.
- **Strict Multi-Tenant Isolation:** Host sessions are secured with JWT HTTP-only cookies and bcrypt hashing. Staff at Restaurant A cannot read or modify Restaurant B records.

## 3. Strict Truthfulness & Technical Disclosures
In accordance with pilot evaluation and honest engineering standards:
- **No Automated Outbound WhatsApp Bot Claims:** Public and dashboard communication uses manual `wa.me` click-to-chat links. No automated outbound messages are sent without explicit Meta Business Account verification and app approval.
- **No AI Black Box:** All slot availability, party fitting, and status transitions are deterministic and backed by relational database queries and validated Zod schemas.
- **No Backup Guarantee:** Data is hosted on serverless PostgreSQL (Neon). During this pilot stage, there is no enterprise SLA, automated snapshot retention, or disaster recovery guarantee.
- **No Payments or Deposits:** TableMate does not collect credit cards, advance table deposits, or gateway fees. Dining bills remain 100% between the diner and the restaurant.
- **Status Truthfulness:** Customer submissions always start in `PENDING` status. A reservation is never presented as confirmed until an authorized staff member explicitly approves it.
