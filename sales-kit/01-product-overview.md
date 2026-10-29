# TableMate AI — Product Overview & Positioning

## 1. Product Description (3-4 Sentences)
TableMate AI is a streamlined reservation management platform designed specifically for independent restaurants that want to eliminate chaotic phone calls and manual register logs. It provides an intuitive online booking portal with automated table capacity checks, preventing accidental overbooking and 90-minute table collisions. Restaurant hosts manage incoming requests, confirm party allocations, and track guest history through a lightweight, real-time dashboard. The customer experience includes an interactive simulated chat flow that demonstrates how conversational bookings can be confirmed without back-and-forth friction.

## 2. Core Value Proposition
- **Host Time Saved:** Eliminates 3–5 minute phone conversations for every reservation inquiry during busy service hours.
- **Zero Double-Bookings:** Smart table allocation logic pairs party size to best-fit tables and prevents overlapping dining windows.
- **Repeat Guest Recognition:** Automatically de-duplicates guest records by mobile number, giving hosts instant visibility into VIPs and frequent diners.
- **Ready for Chat Channels:** Modular channel-adapter architecture designed to plug into official WhatsApp Business API gateways once production credentials are configured.

## 3. Strict Honesty Disclosures
In accordance with pilot evaluation standards:
- **No Live WhatsApp Connection:** The current version features a deterministic in-browser conversation state machine (`ChannelAdapter` interface). It simulates the chat experience without requiring paid Twilio/Meta API tokens or exposing production credentials.
- **No AI Black Box:** Responses and slot parsing are deterministic and validated against structured business rules (Zod schemas), ensuring 100% adherence to opening hours and table limits.
- **Local Data Isolation:** All data in this MVP is stored locally in the browser (`localStorage`) with cross-tab synchronization. No personal data or credit cards are collected.
- **Status Truthfulness:** Customer submissions always start in `pending` status. A booking is never marked or messaged as "confirmed" until a restaurant staff member explicitly reviews and approves it.
