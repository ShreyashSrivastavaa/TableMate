import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsAndPrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#ff2936] selection:text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="text-xs font-mono uppercase tracking-widest text-white/70 hover:text-white">
          ← Back to TableMate
        </Link>
        <div className="text-xs font-mono text-white/50">LEGAL & DATA DISCLOSURE</div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 text-left">
        <h1 className="font-editorial text-4xl sm:text-5xl text-white mb-4">
          Terms, Privacy & Data Architecture
        </h1>
        <p className="font-flourish text-lg text-white/60 mb-8">
          [ honest technical disclosures for pilot partners and diners ]
        </p>

        <div className="space-y-8 text-sm text-white/80 leading-relaxed font-sans">
          <section className="border border-white/20 p-6 bg-[#101010]">
            <h2 className="text-xs uppercase font-mono tracking-widest text-[#ff2936] mb-3">
              1. Data Storage & Hosting Infrastructure
            </h2>
            <p className="mb-2">
              All reservation records (guest name, contact phone number, party size, reservation date/time, and notes) and restaurant configuration settings are stored in PostgreSQL on Neon cloud infrastructure.
            </p>
            <p className="text-white/60 text-xs font-mono">
              <strong>Transparent Disclosure:</strong> During the introductory pilot phase, data is maintained on serverless PostgreSQL with transactional consistency, but there is <strong>no SLA-backed backup or disaster recovery guarantee</strong>. Do not use this pilot software as your sole record for critical financial accounting.
            </p>
          </section>

          <section className="border border-white/20 p-6 bg-[#101010]">
            <h2 className="text-xs uppercase font-mono tracking-widest text-[#ff2936] mb-3">
              2. Guest Privacy & Data Collection
            </h2>
            <p className="mb-2">
              Guest contact details collected through restaurant booking links are used exclusively for table assignment, status verification, and communication directly with the restaurant host.
            </p>
            <p className="text-white/60 text-xs font-mono">
              • We do not sell or broker diner data to third-party ad networks.<br />
              • We do not collect credit cards, banking information, or payment credentials.<br />
              • Each diner can request removal of their phone record by contacting the restaurant directly.
            </p>
          </section>

          <section className="border border-white/20 p-6 bg-[#101010]">
            <h2 className="text-xs uppercase font-mono tracking-widest text-[#ff2936] mb-3">
              3. WhatsApp & Messaging Policy
            </h2>
            <p className="mb-2">
              Customer status links and host confirmation buttons use manual <code>wa.me</code> click-to-chat links. Clicking these links opens WhatsApp directly on your own personal device; nothing is dispatched autonomously without your explicit click and send action in the WhatsApp application.
            </p>
            <p className="text-white/60 text-xs font-mono">
              Where Meta WhatsApp Cloud API is provisioned for an enabled restaurant, messages are only delivered to guests who actively checked the opt-in consent box at booking time. Guests can reply with &quot;STOP&quot; at any time to immediately opt out of automated notifications.
            </p>
          </section>

          <section className="border border-white/20 p-6 bg-[#101010]">
            <h2 className="text-xs uppercase font-mono tracking-widest text-[#ff2936] mb-3">
              4. Tenant Isolation & Security
            </h2>
            <p className="mb-2">
              Each restaurant&apos;s data is strictly partitioned by a unique restaurant identifier. Host dashboards require password authentication using salted bcrypt hashing and secure HTTP-only cookie sessions. Staff at Restaurant A cannot access, view, or alter reservations belonging to Restaurant B.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 text-center text-xs font-mono text-white/40">
        TableMate AI — Honest Engineering Disclosures
      </footer>
    </div>
  );
}
