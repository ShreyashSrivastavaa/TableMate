# The ₹999 Introductory Pilot Scope & Terms

## 1. What the ₹999 Pilot Is
The **₹999 introductory pilot** is an exploratory, low-friction setup fee designed to test market willingness to pay and validate core workflow adoption with independent restaurant owners. 

It is an introductory rate for early pilot partners, **not a permanent or market-validated enterprise pricing plan**.

---

## 2. What the ₹999 Pilot Setup INCLUDES:
1. **Customized Venue Branding:** Setup with your actual restaurant name, cuisine description, address, and public contact phone number.
2. **Floor Table Configuration:** Mapping your actual floor plan (up to 12 physical tables with defined seating capacities: 2-tops, 4-tops, booths, and banquet tables).
3. **Operational Hours & Buffer Calibration:** Configuring your specific opening and closing hours, meal service slots (30-minute intervals), and 90-minute dining duration guardrails.
4. **Staff & Host Training Walkthrough:** A 30-minute personal onboarding session for your restaurant manager and front-of-house host on how to review pending requests, confirm allocations, and view floor status.
5. **Customer Booking Link (/book):** A clean, branded booking portal link that your restaurant can place on your Instagram bio, Google Maps business profile, or send to guests via SMS/chat.

---

## 3. What the Pilot Setup EXCLUDES (Stated Plainly):
To maintain transparency and regulatory compliance:
- **NO Payment Collection or Gateway Integration:** TableMate AI does not charge reservation deposits, collect dining prepayments, or process credit cards. Any dining billing remains 100% between the restaurant and the diner in person.
- **NO Live WhatsApp Cloud API Sending (Yet):** The pilot uses an in-browser chat simulation. Direct automated outbound WhatsApp messages require Meta Business verification and dedicated Twilio/Meta API credentials, which are scoped for Phase 2.
- **NO Third-Party POS Integration:** The MVP does not sync automatically with legacy POS machines (Petpooja, Posist, etc.). Bookings live within the TableMate dashboard.
- **NO Cloud Multi-User Auth:** The pilot MVP persists data locally per device browser. Multi-device sync across different staff phones requires the future hosted backend database.

---

## 4. Current Limitations Summary Table

| Capability | Current MVP Status | Future Commercial Roadmap |
|---|---|---|
| **Availability Calculation** | Full local engine (90-min overlap check) | Serverless PostgreSQL backend |
| **Double-Booking Prevention** | Best-fit table assignment | Concurrency transactions & row-locking |
| **WhatsApp Chat** | Deterministic simulation state machine | Official Meta WhatsApp Business API |
| **Data Persistence** | Browser `localStorage` (cross-tab sync) | Cloud PostgreSQL with Prisma ORM |
| **Payments / Deposits** | Not implemented (out of scope) | Razorpay / Stripe for weekend deposits |
| **Staff Accounts** | Single host view | Role-based host/manager authentication |
