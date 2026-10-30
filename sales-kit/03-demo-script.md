# Live Demo Scripts: 30-Second & 2-Minute Walkthroughs

Use this script during in-person meetings or screen shares with restaurant owners and general managers.

> **Preparation:** Before starting, onboard a sample or pilot restaurant with:
> `npm run onboard -- --slug=sample-kitchen --name="Your Sample Restaurant"`
> Open the Customer Booking Portal (`/r/sample-kitchen/book`) on your phone, and open the Host Admin Dashboard (`/r/sample-kitchen/admin`) on your laptop or tablet.

---

## 1. The 30-Second Elevator Pitch (Two-Device Live Flow)

| Time | Action | Pitch Talk Track |
|---|---|---|
| **0:00 – 0:10** | Hand phone to owner on **`/r/:slug/book`** | *"Instead of your host answering 15 phone calls during Friday dinner rush, guests scan your table tent QR code or tap the link in your Instagram bio."* |
| **0:10 – 0:20** | Owner taps **"Table for 4"**, picks **"Tomorrow 7:30 PM"**, and enters their name | *"The system instantly checks your physical table inventory in PostgreSQL. If all 4-tops are booked within 90 minutes, it blocks the slot to prevent double-booking. Once submitted, it creates a pending reservation."* |
| **0:20 – 0:30** | Show **Host Dashboard (`/r/:slug/admin`)** on your laptop | *"Within 15 seconds, the reservation pops up on your screen with a 'NEW' badge. You tap 'Confirm', then click the WhatsApp button to message the guest directly from your phone. No manual register errors, zero double-bookings."* |

---

## 2. The Comprehensive 2-Minute Owner Presentation

### Act 1: The Problem (0:00 – 0:30)
- *"Every busy evening between 7:00 PM and 9:30 PM, the front-of-house team gets interrupted by repeat calls asking: 'Do you have a table for 4 tonight?'"*
- *"When staff jot down names in paper diaries or across separate phones, accidental double-bookings happen, leaving guests waiting awkwardly at the door."*

### Act 2: The Diner Experience (0:30 – 1:00)
- Open `/r/:slug/book`.
- Show available time slots calculated directly from opening hours and physical tables.
- Submit a booking request for 2 guests.
- Highlight the confirmation screen:
  - *"Notice the status clearly says **Pending Restaurant Review** with reference `TM-XXXXXX`. We never tell a guest 'Confirmed' until your actual staff verifies it."*
  - Show the **Open WhatsApp** button with the disclosure label: *'Opens WhatsApp on your phone. Nothing is sent automatically.'*

### Act 3: The Host Dashboard & Availability Engine (1:00 – 1:35)
- Open `/r/:slug/admin`.
- Demonstrate the live 15-second polling refresh.
- Show the table allocation map:
  - *"Each table size (2-top, 4-top, banquet) is mapped to your actual dining room. The engine assigns the best-fit table and locks that table for 90 minutes."*
- Click **Confirm**:
  - Show the status transition from `PENDING` to `CONFIRMED`.
  - Show the **WhatsApp Confirm** button that opens WhatsApp with a pre-filled confirmation text including the guest's name, date, time, and reference code.

### Act 4: Onboarding & The ₹999 Pilot Close (1:35 – 2:00)
- Show the **QR Code & Venue Settings** tab:
  - *"You get a ready-to-print QR code for table tents and reception signage, plus 1-click CSV export for your records."*
- Close the conversation:
  - *"We are setting up 2 pilot dining rooms this week for ₹999. We map your actual floor tables and operating hours in 24 hours. Would you like to do a test run with us?"*
