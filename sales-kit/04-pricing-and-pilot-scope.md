# The ₹999 Pilot Scope & Onboarding Contract

## 1. Purpose of the ₹999 Pilot
The **₹999 introductory pilot fee** is an exploratory, low-friction setup charge designed to test operational adoption with independent restaurant owners. It is an introductory pilot tier for early partner venues, not a permanent enterprise pricing contract.

---

## 2. What the ₹999 Setup INCLUDES
1. **Dedicated URL Identifier:** Custom restaurant slug (`/r/:slug/book`) with venue name, address, cuisine details, and contact numbers.
2. **Physical Floor Table Mapping:** Configuration of your actual dining room tables with capacities (2-tops, 4-tops, booths, banquet).
3. **Turn Rules Calibration:** Setting your specific meal service hours (lunch/dinner), 30-minute reservation increments, and 90-minute dining turn guardrails.
4. **Downloadable QR Code:** Generated high-resolution vector QR code for printed reception tents and menu inserts.
5. **Private Host Dashboard (`/r/:slug/admin`):** Password-authenticated host desk with live 15-second polling, filter controls, 1-click status transitions, and CSV reservation export.
6. **Manual WhatsApp Reachout (`wa.me`):** Pre-formatted customer communication links for confirm and reject messaging directly from host phones without third-party API fees.
7. **Staff Onboarding Session:** A 30-minute walkthrough for the general manager and front-of-house host on managing daily service.

---

## 3. What the Pilot Setup EXCLUDES (Stated Plainly)
- **NO Payment Gateways or Deposits:** TableMate does not collect advance dining deposits, credit cards, or booking fees. Dining bills remain 100% between the restaurant and the guest.
- **NO Automated WhatsApp Bot Outbound:** Direct background automated WhatsApp messages require Meta Business verification and dedicated Meta Graph API credentials. Pilot communication operates via staff-approved `wa.me` click-to-chat links.
- **NO POS Integration:** Does not sync automatically with legacy POS hardware (Petpooja, Posist, etc.). Bookings live within the TableMate host portal.
- **NO Disaster Recovery SLA:** The database is hosted on serverless PostgreSQL (Neon). During this pilot phase, there is no formal backup guarantee or enterprise disaster recovery SLA.

---

## 4. Day-1 Onboarding Checklist
- [ ] Agree on venue slug (e.g. `your-restaurant` -> `/r/your-restaurant/book`)
- [ ] Provide physical table inventory (e.g. 4x 2-seaters, 6x 4-seaters, 1x 8-seater)
- [ ] Set operating hours & weekly closed days (if applicable)
- [ ] Run `npm run onboard -- --slug=your-restaurant --name="Your Restaurant"`
- [ ] Provide host with initial temporary password and enforce password change on first login
- [ ] Print QR code for front desk & add booking link to Instagram profile
