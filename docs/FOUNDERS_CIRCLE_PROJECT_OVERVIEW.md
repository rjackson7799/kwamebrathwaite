# Founder's Circle Member Portal — Project Overview

**Document Type:** Feature Brief / Project Overview
**Project:** Kwame Brathwaite Archive (kwamebrathwaite.com)
**Prepared by:** HonuVibe.AI
**Date:** May 18, 2026
**Revision:** v1.3 — Stakeholder confirmed a 24–48 hour response SLA for inquiry follow-up, with operational implications for the admin panel and notification system. (v1.2 locked the contribution iframe to inside the portal only; v1.1 removed Stripe in favor of the existing third-party non-profit payment platform via iframe embed.)
**Status:** Ready for technical planning handoff
**Next Step:** Hand this document to Claude Code (with codebase access) to produce the implementation plan.

---

## ⚠️ Finalized terms & workflow (2026-05-31) — supersedes conflicting detail below

The client finalized the **special fundraiser** parameters and invite workflow. Where the
narrative below differs (earlier edition counts, dimensions, tier model, or "not a donation"
framing), this section governs:

- **The offer:** an unreleased **20 × 20 in.** special-edition print, **flat $10,000 donation**
  (no step-ups), **15 numbered editions + 2 Artist's Proofs** (17 total), available **only** within
  the Founder's Circle.
- **Obligations:** Founders **hold the print until 2036**; on any secondary-market resale, a set
  **percentage (TBD — pending counsel/tax)** is contributed back to the archive. A `terms_version` +
  `terms_accepted_at` are recorded when the member accepts on the invitation page.
- **Framing is a donation** (the contribution runs through Givebutter: `givebutter.com/the-founders-circle-rgvzcz`).
- **Tiers are retired for this program.** The `founder_tier` / `pledge_*` DB columns are kept (tiers
  may return for a future program) but the admin tier/pledge controls are hidden; a flat
  donation amount + payment reference are recorded instead.
- **Invite → activate workflow:** admin invites (name/email/note) → invitee clicks the magic link,
  lands **logged-in but `invited`** on the **invitation page** (terms + Givebutter donate +
  self-decline) → after the donation, **admin** confirms & activates (deliberate money gate) →
  portal unlocks. New `declined` status (self- or admin-triggered, admin-reversible). The donation
  gate replaces the old behavior where first login auto-activated the member.

See `docs/migrations/2026-05-31-founders-fundraiser-rework.sql` and the implementation plan for
specifics.

---

## About This Document

This is a **project overview**, not a technical specification. It defines the scope, purpose, audience, and experience principles for a secure member portal serving the Kwame Brathwaite Archive's Founder's Circle program. It is intended to give a development agent (working in Cursor / Claude Code with full codebase context) the strategic and functional context needed to produce a detailed technical plan — including database schema, authentication architecture, route structure, and phasing — informed by what already exists in the codebase.

Decisions about *how* to implement (auth provider configuration, table structures, API design, component architecture) are deliberately left out of this brief.

---

## 1. Project Context

### The Archive

The Kwame Brathwaite Archive preserves the legacy of the photographer who became the visual architect of the Black Is Beautiful movement. Brathwaite (1938–2023) co-founded AJASS in 1956 and the Grandassa Models in 1962, photographed six decades of music, activism, fashion, and culture across the African diaspora, and built a body of work now held in the permanent collections of MoMA, the Whitney, LACMA, the National Portrait Gallery, the Studio Museum in Harlem, and others. His work currently appears in eight active exhibitions across four countries.

The archive is a registered 501(c)3, stewarded by Kwame's family and a small team that has spent fifteen years driving institutional recognition for the work.

### The Founder's Circle Program

The Founder's Circle is a curated philanthropic program supporting the **permanent infrastructure** of the archive — organization, digitization, and physical housing of the collection. The deck for prospective Founders frames it precisely:

> *"Founders are not making a donation. They are establishing the permanent infrastructure of one of the most significant photographic archives of the 20th century. You're not giving to the past. You're building the infrastructure that makes this history available to the future."*

This positioning matters because it shapes everything about the portal experience. Founders are not subscribers, members, or patrons in the usual sense. They are inductees into a stewardship community.

### What Founders Receive (per the prospectus deck)

Four named benefits, each of which translates to a portal surface:

1. **The Founder's Print** — A never-before-released archival self-portrait, created as an exclusive edition for Founder's Circle members. Not in any other collection. Not for sale.
2. **Permanent Recognition** — Member names inscribed in the permanent record of the archive, documented alongside the photographs themselves.
3. **Access & Stewardship** — Private access to the archive, early exhibition previews, and ongoing dialogue with the stewardship team.
4. **Tax Deductibility** — IRS-compliant acknowledgment of contributions to the 501(c)3.

### Why a Member Portal Now

The archive has reached a moment described in the deck as *"the foundation gets built properly — with the capital, infrastructure, and community it deserves."* The portal is the digital infrastructure that operationalizes the program's promises. Without it:

- The Founder's Print exists conceptually but has no curated home for delivery and viewing.
- Recognition has no digital permanence beyond what's printed on physical materials.
- "Access & Stewardship" lives in scattered emails rather than a coherent, private space.
- Tax receipt distribution is partially solved — per-transaction receipts come from the payment platform automatically — but annual IRS-compliant 501(c)3 acknowledgment letters and curated giving summaries have no consistent home.
- The team has no centralized view of member engagement.

The portal turns four bullet points on a slide into a sustained, ongoing relationship.

---

## 2. Source Material

This brief synthesizes two stakeholder-provided documents:

1. **`KwameBrathwaite_FoundersCircle_Draft.pptx`** — The prospectus deck shown to prospective Founders. Establishes positioning, benefit structure, and tone.
2. **`KBA_Leadership_Donations_.docx`** — The Collector Prospectus describing Collector Circle ($10K+ annual), Leadership ($10K), Archive ($25K), and Legacy ($50K+) giving tiers, plus separate "Acquiring Works" pathway.

The two documents present a **tier reconciliation question** the portal architecture must accommodate (see Section 9).

---

## 3. The Brief in One Paragraph

Build a private, invitation-only member portal at `kwamebrathwaite.com/founders/*` that authenticates Founder's Circle members via passwordless magic link, delivers the four promised program benefits as quiet, curated surfaces, gives the archive's stewardship team admin tools to invite members and manage their experience, hands contribution flow off to the archive's existing third-party non-profit payment platform via iframe embed, and integrates with the archive's existing Supabase backend, Resend email, and `next-intl` multilingual stack — all without compromising the museum-grade restraint of the public site.

---

## 4. The Four Promised Benefits as Portal Surfaces

Each benefit promised in the deck must have a concrete home in the portal. This is the heart of the functional scope.

### 4.1 The Founder's Print

The deck features a specific image — a self-portrait of Brathwaite at the beginning of his career — described as *"never released. Not in any collection. Available exclusively to Founder's Circle members."*

**Portal implications:**
- A dedicated viewing surface for the Print, presented at museum quality
- Contextual storytelling (the artist statement language from the deck about "passion, hope and determination to change the narrative")
- Provenance and edition information
- Status of the physical print's fulfillment (if Founders receive a physical edition) — pending production, in production, shipped, delivered
- Certificate of authenticity (digital and/or downloadable)
- Restrictions on screenshot/download appropriate to the work's exclusivity

This is the **emotional centerpiece** of the portal. If a Founder logs in once a year, this is what they want to see.

### 4.2 Permanent Recognition

**Portal implications:**
- A private recognition page within the portal showing the Founder's name as it will be (or is) inscribed in the archive's permanent record
- Options for how the name appears (formal name, anonymized, "in honor of," "in memory of")
- A future public-facing Founders Wall — recommended as opt-in, deferred to a later phase
- A sense of permanence in the visual treatment (typography forward, restrained, not flashy)

### 4.3 Access & Stewardship

The deck promises three things under this header: *"Private access to the Archive, early exhibition previews, and ongoing dialogue with the stewardship team."*

**Portal implications:**
- **Briefings** — A space for the stewardship team to publish dispatches: news from the archive, exhibition openings, institutional placements, personal notes from Kwame's family. These are the "ongoing dialogue."
- **Exhibition Previews** — Early-access view of upcoming exhibitions before they're public, with curator notes
- **Archive Access** — A gated section of the archive showing materials not in the public-facing site: behind-the-scenes images, contact sheets, ephemera, working notes. The depth of what's exposed is a curatorial decision.
- **Direct line to stewardship** — A simple way to reach the team without going through the public contact form

### 4.4 Tax Deductibility

The archive uses an existing third-party non-profit payment platform to collect contributions. That platform handles real-time payment processing, per-transaction receipts, and primary financial record-keeping. **The portal does not process payments.** It complements the payment platform by providing a curated giving record and a tax document home for Founders.

**Portal implications:**
- A summary giving record for each Founder — contributions logged against their member profile (data entered manually by admins, or imported from payment platform exports if available)
- Annual IRS-compliant 501(c)3 acknowledgment letters housed as admin-uploaded PDFs, with the legally required "no goods or services received" language — these are distinct from the per-transaction receipts the payment platform sends automatically
- Downloadable across tax years for each Founder
- Clear pledge vs. fulfilled-to-date status for multi-year commitments
- A "Make a Contribution" page **inside the authenticated portal** (`/founders/contribute`), accessible only to logged-in Founders. The payment platform is embedded there via iframe. The public `/founders` info page does **not** include a contribution path. See Section 8.1 for integration detail.

---

## 5. User Personas

### Persona 1 — The Founder Member

**Profile:** Mid-50s to mid-70s. Collector, museum trustee, philanthropist, or institutional figure. Often serves on multiple boards. Has assistants who handle some digital interactions. Comfortable with technology but does not enjoy it.

**Goals:** See their Print. Confirm their recognition is on record. Have their tax documents available when their accountant asks. Stay informed about the archive's work without being bombarded.

**Login frequency:** 3–8 times per year. Often triggered by a notification email from the archive (a new briefing, an exhibition opening, an annual receipt).

**Friction tolerance:** Very low. Passwords forgotten. Email-only authentication preferred. Sessions that expire mid-glance will cause complaints. Two-factor codes are acceptable only if optional and clearly explained.

**What they should feel:** That this is a private space curated for them. Not a product they bought.

### Persona 2 — The Archive Administrator

**Profile:** Member of Kwame's stewardship team. Manages relationships with Founders, drafts and sends briefings, prepares annual giving documents, coordinates with the family.

**Goals:** Invite new Founders quickly. Track who has read what. Update member information without IT support. Issue annual tax acknowledgments. Maintain a single source of truth for the program.

**Login frequency:** Weekly active use.

**Constraints:** Per existing project conventions, the admin experience is English-only regardless of public multilingual support.

### Persona 3 — The Prospective Founder

**Profile:** Someone recently introduced to the archive — through an exhibition, a press piece, a conversation with an existing Founder, or a referral. Has not yet been invited.

**Goals:** Understand what the Founder's Circle is. Indicate interest. Open a conversation.

**Login frequency:** Single session, no account.

**Critical:** This persona should never see a "Sign Up" button. The invitation comes from the team, not from a form submission.

---

## 6. Experience Principles

The portal's tone must match the deck's: quiet, considered, archival. Some specific principles:

### 6.1 Invitation, Not Registration
There is no public path to creating an account, and **no public path to making a contribution.** The admin team initiates membership. The public-facing inquiry path produces a record for follow-up, never an account. The contribution form sits behind the login, accessible only after invitation and account activation. Founder-level giving is not transactional impulse-giving — the program is positioned as induction into stewardship, and every surface should reflect that.

### 6.2 Magic Link by Default
Passwords are wrong for this audience and this use case. Members enter their email, receive a one-tap link, and they're in. Optional 2FA via authenticator app should be available for members who request it. Optional password as a backup mechanism is acceptable but should not be the primary path.

### 6.3 Quiet UX
No dashboards crowded with metrics. No engagement nudges. No "You haven't logged in for 30 days" emails. No badges, streaks, or gamification of any kind. The portal should feel like opening a curated folder, not entering an app.

### 6.4 Restraint in Content Surface
Founders should perceive that what's behind the login is **finite, curated, and considered** — not an infinite feed. A small number of well-presented things beats a large amount of generic content.

### 6.5 Photography First, Still
Every existing design system principle (`DESIGN_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`) applies inside the portal as much as on the public site. Black-and-white restraint, generous whitespace, photography as hero, restrained typography. The portal is a part of the archive's brand, not a separate product.

### 6.6 Permanence in Tone
Everything in the portal — the Print page, the recognition page, the briefings — should suggest that this material is permanent and significant. Avoid expiry counters, urgency language, time-bound offers.

### 6.7 Privacy as a Feature
Members should sense throughout that their data, identity, and presence in the program is protected. Recognition is opt-in to public visibility. Communications go through known channels. No third-party tracking pixels in the portal section.

---

## 7. Functional Scope

### 7.1 What the Portal Must Do for Founders

- **Sign in via email-based magic link**, with rate limiting and abuse protection appropriate to the data behind the wall
- **Optionally enable 2FA** via authenticator app
- **View The Founder's Print** with full context, provenance, and any associated certificate
- **View their recognition record** — how their name appears in the archive's permanent record
- **Read briefings** published by the stewardship team (Phase 2)
- **Access exhibition previews** ahead of public release (Phase 2)
- **Access gated archive content** curated specifically for Founders (Phase 2)
- **View a summary of their giving record** as logged by the stewardship team (Phase 3)
- **Download annual tax acknowledgment letters** uploaded by admins (Phase 3)
- **Make an additional contribution** by handoff to the existing payment platform via embedded iframe or direct link (Phase 3)
- **Update their profile** — preferred name, communication preferences, name as it should appear in recognition
- **Manage their session** — sign out, see active sessions, alert on new device login
- **Reach the stewardship team** through a clear, non-public channel

### 7.2 What the Portal Must Do for Admins

- **Invite new Founders** by email, with optional personal message from the team
- **Manage member records** — contact info, tier, pledge amount, status, internal notes
- **Resend invitations** or generate new magic links for members locked out
- **View member activity** — last login, last briefing read, login history (for security review, not for engagement optics)
- **Review and respond to inquiries** — pending inquiries surfaced prominently on the admin dashboard, with status (new / in conversation / converted to invitation / declined / archived), age indicator (so anything approaching the 24–48 hour SLA window is visible), and internal notes per inquiry. New inquiries trigger an immediate email notification to the team via Resend.
- **Convert an inquiry to an invitation** in a single flow, carrying over the prospect's name/email rather than re-entering it
- **Publish briefings** (Phase 2) — title, body (rich text), optional attachments, notification trigger
- **Upload exhibition previews and archive access content** (Phase 2)
- **Log contributions against member records** — manual entry, or CSV import if the third-party payment platform supports exports (Phase 3)
- **Upload annual tax acknowledgment letters** to individual member files (Phase 3)
- **View aggregate giving data** as logged in the portal, with export capability
- **Send a one-off message** to a single Founder or a defined group (Phase 4 — could be deferred)

### 7.3 What the Public-Facing Inquiry Path Must Do

- A `/founders` info page that mirrors the deck's positioning, suitable for sharing with prospective members
- An "Inquire About Membership" form that captures name, email, and optional brief note — **never** creates an account, only an inquiry record for follow-up
- Honeypot spam protection consistent with existing project conventions (per `TECHNICAL_SPEC_v2.md`, no CAPTCHA)
- An **immediate auto-acknowledgment email** to the prospect on submission (via Resend), warm but non-transactional, setting the expectation that a member of the stewardship team will follow up personally within 24–48 hours
- A stated 24–48 hour response SLA. The auto-acknowledgment should reference this window so prospects know what to expect during the gap between inquiry and personal follow-up. The admin panel must support this commitment operationally (see Section 7.2).
- **No contribution path on the public page.** The contribution embed lives inside the authenticated portal only. The pathway is: *inquire → conversation with the team → invitation → portal access → contribution*. This reinforces the program's invite-only nature and matches the elevated price points of Founder-level giving — these are not impulse contributions, and the public page should not invite anyone to treat them that way.

---

## 8. Integration with Existing Project Infrastructure

The portal must operate within the archive's existing technical foundation. Specific integrations the development agent will need to plan around:

| Existing System | Role in the Portal |
|---|---|
| **Supabase** (existing backend) | Authentication, member records, content storage, RLS-enforced data access |
| **Supabase Auth** (currently for admin) | Will need a parallel context for Founder users distinct from admin users — schema and RLS approach to be designed by the dev agent |
| **Next.js 14 App Router** | Portal lives under `/founders/*` in the existing app |
| **next-intl** (EN/FR/JP) | Member-facing portal localized in all three languages. Admin remains English-only per project convention. |
| **DeepL translation pipeline** | Used for dynamic content (briefings) that needs to appear in all three languages |
| **Third-party non-profit payment platform** (existing, name TBC) | Payments handled externally. The portal embeds the platform's contribution form (iframe drop-in) on a "Make a Contribution" page, and houses tax acknowledgment letters separately. No payment processing happens inside the portal. Tighter API/webhook integration is a possible future enhancement, not in current scope. |
| **Resend** (existing for transactional email) | Invitation emails, magic link emails, briefing notifications, tax acknowledgment notifications |
| **TipTap** (existing rich text editor) | Likely the editor for briefings in the admin panel |
| **Vercel** (hosting) | No change |
| **Private Viewing Room** (in development) | The portal should be aware of PVR — when a Founder is logged in and visits a PVR link sent to their email, their session should authenticate them automatically. PVR continues to work standalone for non-Founder collectors. |

The development agent should review the existing codebase before deciding how to structure the Founder auth context — whether to extend the existing admin Supabase Auth setup with a role discriminator, create a parallel auth surface, or another approach. That choice depends on what's already there.

### 8.1 Payment Platform Embed — Considerations for the Dev Agent

The "Make a Contribution" experience is delivered by embedding the existing payment platform's contribution form, not by building one. The embed lives **inside the authenticated portal** at `/founders/contribute` — accessible only to logged-in Founders. The public-facing `/founders` info page does **not** carry a contribution path. This is deliberate: it reinforces the invite-only positioning of the program and matches the elevated price points of Founder-level giving. Prospective Founders go through inquiry, conversation, and invitation before they ever see the contribution form.

The dev agent should plan for:

- **Content Security Policy.** `frame-src` (and any other relevant CSP directives) must permit the payment platform's domain. The platform may also require permitting their assets/CDN.
- **Mobile responsiveness.** Many non-profit payment iframes have known sizing quirks on mobile — fixed heights that crop, scrollbars-within-scrollbars, viewport issues. The embed page should reserve generous vertical space and handle the platform's resize behavior gracefully (postMessage listeners if the platform emits them, or a fallback fixed minimum height).
- **Consistent visual framing.** The embed page should carry the archive's design system around the iframe — header, footer, supporting copy — so the contribution flow feels like part of the archive, not a third-party redirect. Acknowledge the handoff to a trusted partner in plain language.
- **Accessibility.** The iframe must have a meaningful `title` attribute. Keyboard focus should reach the embed cleanly.
- **Tracking and analytics.** The portal section should remain free of third-party tracking; the dev agent should confirm whether the payment platform's iframe drops cookies and document that behavior.
- **Future-proofing.** Wrap the embed in a component (`<ContributionEmbed />` or similar) so a future swap to Stripe or to an API-driven flow is a single-component replacement, not a sitewide refactor.

---

## 9. Constraints & Considerations

### 9.1 Tier Reconciliation

The deck describes a single "Founder's Circle" with one set of benefits. The Collector Prospectus describes Collector Circle ($10K+ annual) plus three Leadership tiers (Leadership $10K, Archive $25K, Legacy $50K+).

**These need to be reconciled before launch.** The portal architecture should be tier-aware from day one — members are categorized by tier internally — but the **UI presentation of tier distinctions is a separate decision** that should be confirmed with Kwame's team before surfacing. A reasonable default: schema supports all tiers, Phase 1 UI treats all members as "Founders" without visible tier labels, tier-visible UI can be enabled later via configuration.

### 9.2 Data Sensitivity

Member data in this portal is significantly more sensitive than anything elsewhere on the public site:

- Donor contact information (names, addresses, phone numbers)
- Giving history (amounts, dates, tax IDs in some cases)
- Pledge commitments (multi-year financial commitments visible to admins)
- Recognition preferences (anonymity choices)
- Communication history with the stewardship team

Row Level Security, audit logging, session management, and rate limiting all need to be planned with this sensitivity in mind. The development agent should treat the security model as a first-class deliverable, not a checkbox.

### 9.3 Audience Expectations

This audience does not log in often. Their last login may have been six months ago. Sessions, magic links, and account recovery flows should all be designed for **infrequent users**:

- Magic link tokens may need a longer validity window than typical (24 hours rather than 15 minutes)
- "Remember this device" should be available and last meaningfully long (90 days or more)
- Email-based account recovery must work even if the user has lost access to 2FA
- Re-authentication for sensitive actions (changing email, viewing receipts) is appropriate; constant re-auth is not

### 9.4 The Founder's Print Asset

The specific image used as The Founder's Print appears in the deck. Treatment in the portal should respect that this is the centerpiece of the program's deliverable:

- Highest available resolution display
- Consideration of right-click protection or watermarking on display copies (without making the experience hostile)
- The accompanying narrative text from the deck ("passion, hope and determination to change the narrative") is part of the asset, not just metadata
- If a physical print is part of the program, fulfillment status visibility is a meaningful feature

### 9.5 Multilingual Considerations

Founders are international. The deck specifically positions the work as documenting *"the intersection of music, fashion, activism, and art across the African diaspora globally."* The portal's static UI should be available in EN/FR/JP via the existing `next-intl` setup. Dynamic content (briefings, archive descriptions) should flow through the existing DeepL pipeline. Admin remains English-only.

### 9.6 Out of Scope for This Feature

To keep scope clean:

- **Payment processing inside the portal** — The archive's existing third-party non-profit payment platform handles all payments via iframe embed. The portal *displays* a curated giving record (manually maintained) and houses tax acknowledgment letters; it does not process transactions.
- **In-portal commerce** — No print sales, no add-on purchases. The Founder's Circle is a giving program, not a shop.
- **Forum/community features** — Founders communicate with the team, not with each other through the portal.
- **Public Founders Wall** — Deferred. Recommended as a Phase 4 feature with opt-in mechanics.
- **Mobile app** — Mobile web only.

---

## 10. Recommendations for Enhanced Functionality

Items not in the source documents but recommended for consideration. Each can be accepted, deferred, or declined without disrupting the core scope.

### Recommendation 1 — Briefing Read Receipts (Internal Only)

When a Founder reads a briefing, capture the read timestamp internally. This is for the stewardship team's awareness, not for member-facing display. Helps the team understand which dispatches landed and which need follow-up. Should not be exposed in the member-facing UI in any form.

### Recommendation 2 — "Founder's Print Fulfillment" Tracker

If the program includes a physical edition of The Founder's Print, build a simple status tracker the member can see: *In Production → Ready for Shipping → Shipped → Delivered*. Reduces inbound "where's my print?" emails and reinforces that the program is operationally serious.

### Recommendation 3 — Digital Certificate of Authenticity

A downloadable PDF certificate for The Founder's Print, signed (digitally or with a graphic representation of a signature) by the stewardship team. Members will appreciate something tangible they can keep alongside the print itself. Also useful for future provenance if a member's estate later donates the work.

### Recommendation 4 — Opt-In Public Founders Wall (Phase 4)

A public-facing page on the main site listing Founders by name (or chosen anonymous designation). Each Founder controls via their profile whether they appear, how their name is rendered, and whether to display "in honor of" or "in memory of" language. This becomes a quiet form of social proof for prospective Founders and a permanent recognition the deck promises.

### Recommendation 5 — Stewardship Direct Channel

A simple internal-message surface in the portal for reaching the team. Not a chat, not a ticketing system — a single form that creates a record visible to admins, with email reply going through normal channels. Replaces the need for Founders to dig up the right email address.

### Recommendation 6 — Pledge Visibility for Multi-Year Commitments

For Founders making multi-year pledges, surface the pledge total, fulfilled portion (as logged by admins against the payment platform's records), and remaining balance. Not as a payment reminder — the payment platform handles transactional follow-up — but as confirmation that their commitment is on record with the archive. This is meaningful for trust.

### Recommendation 7 — "On View Now" Surface

Pull from existing exhibition data — the deck notes the work is currently in 8 exhibits across 4 countries — to show Founders which exhibitions are currently active and which are upcoming. Reinforces the institutional weight of the program every time they log in. Should reuse existing exhibitions data, not duplicate it.

### Recommendation 8 — Phased Build with Locked Door First

Strongly recommend building the auth foundation (Phase 1) before any content surfaces. This produces a working, secure shell with admin invitation capability that can be reviewed by Kwame's team before content investment. Reduces risk of building substantial content surfaces before the security model is validated.

---

## 11. Suggested Implementation Phases (High-Level)

The development agent will produce a detailed phased plan informed by the codebase. As a starting frame:

**Phase 1 — Foundation.** Authentication (magic link primary, optional 2FA), admin invitation flow, member profile, public `/founders` info page, inquiry form, security and audit foundations, multilingual UI shell. *Deliverable: a working locked door and an empty, properly-lit hallway.*

**Phase 2 — Content Surfaces.** The Founder's Print page (the emotional centerpiece), Briefings (admin-publishable dispatches), Exhibition Previews, Archive Access. *Deliverable: the four promised benefits' content homes, fully operational.*

**Phase 3 — Giving Record & Recognition.** A "Make a Contribution" page inside the portal (`/founders/contribute`) that embeds the existing payment platform — accessible only to authenticated Founders, never on the public site. Admin tools for logging contributions against member records, annual tax acknowledgment letter management (admin-uploaded PDFs), and the private recognition page. *Deliverable: the giving and recognition experience fully operational, with payments handled by the existing platform and contribution access gated to invited Founders only.*

**Phase 4 — Integration & Polish.** Private Viewing Room auto-authentication, opt-in public Founders Wall, advanced admin tools, any remaining recommendations from Section 10. *Optional:* tighter integration with the payment platform (API or webhook-driven giving data flow, or migration to Stripe for unified financial infrastructure) if the platform supports it and stakeholder appetite exists. *Deliverable: the program operating at full intended scope.*

This phasing is a recommendation. The development agent should adjust based on what already exists in the codebase and what dependencies become apparent during planning.

---

## 12. Open Questions for Stakeholder Confirmation

These should be resolved before Phase 1 development begins. Several have working defaults in this brief that can be confirmed quickly.

1. **Enrollment.** Confirm: invite-only by admin, with a public inquiry form for prospects?
2. **Account creation timing.** When does a Founder get portal access — on pledge, on first payment, or on full pledge fulfillment?
3. **Tier visibility.** Should tier labels (Leadership / Archive / Legacy / Founder) be visible in the member UI, or should all members see a single "Founder" designation in Phase 1?
4. **Phase 1 content scope.** Is the Phase 1 must-have just login + profile + The Founder's Print page, or does Phase 1 also need Briefings live at launch?
5. **Multilingual portal.** Trilingual (EN/FR/JP) as recommended, or English-only for Phase 1 with localization added later?
6. **Private Viewing Room coupling.** Should logged-in Founders auto-receive PVR access for rooms shared with their email, or should PVR remain link-based regardless?
7. **Public Founders Wall.** Confirm deferral to Phase 4 with opt-in? Any preference on the visual treatment?
8. **Payment platform identity & capabilities.** Which third-party non-profit payment platform is currently in use (Givebutter, Donorbox, Classy, Network for Good, etc.)? Does it offer CSV export, an API, or webhooks for contribution data? Answer determines whether Phase 3 giving data flow is fully manual entry or partially automatable.
9. **Two-factor authentication.** Confirm: optional in Phase 1, encouraged via UI prompt but not required?
10. **Physical Founder's Print fulfillment.** Is there a physical print delivered to Founders? If so, fulfillment tracking is a recommended Phase 2 feature.
11. **The Founder's Print asset access.** Will the development agent be provided with the high-resolution print file, accompanying provenance text, and any restriction guidance (watermark, no-download, etc.)?
12. **501(c)3 acknowledgment letter template.** Does the archive have an existing template, or does the development plan need to include preparing one with appropriate IRS language?

### Resolved Decisions (Confirmed by Stakeholder)

- **Iframe embed placement.** The contribution iframe lives inside the authenticated portal at `/founders/contribute`, accessible only to logged-in Founders. The public `/founders` page carries no contribution path. (Confirmed: May 2026.)
- **Payment infrastructure.** The archive's existing third-party non-profit payment platform handles all contributions via iframe embed for the foreseeable future. Stripe migration remains a possible Phase 4+ enhancement. (Confirmed: May 2026.)
- **Inquiry response SLA.** The stewardship team commits to a 24–48 hour response window for inquiries submitted through the public `/founders` page. The auto-acknowledgment email references this window. The admin panel surfaces pending inquiries with age indicators to support the commitment operationally. (Confirmed: May 2026.)

---

## 13. Handoff Notes for Claude Code

When this document is handed to Claude Code in VS Code:

1. **Read the existing codebase first.** Specifically: `PRD.md`, `TECHNICAL_SPEC_v2.md`, `DATABASE_SCHEMA.sql`, `DESIGN_SYSTEM.md`, `TYPOGRAPHY_SYSTEM.md`, and any existing auth-related code in the project. The implementation plan should be informed by what's already there, not designed in isolation.

2. **Treat security as a first-class deliverable.** Donor data and giving history sit behind this wall. RLS policies, audit logging, rate limiting, and session management are not afterthoughts.

3. **Maintain the project's "specs before code" convention.** Produce a detailed technical specification before generating implementation code. Phase the work for parallelizable agent execution where possible (Ryan's preferred pattern).

4. **Reuse existing patterns.** Honeypot spam protection (not CAPTCHA), Supabase + Next.js 14 App Router, `next-intl`, Resend, TipTap. The existing third-party non-profit payment platform handles all contributions via iframe embed — no Stripe integration in scope for this feature. Don't introduce new dependencies unless there's clear justification.

5. **Flag blockers early.** If the technical plan surfaces edge cases or unresolved questions (as the Private Viewing Room planning did with inventory conflicts and initiation flow), flag them before Phase 1 development begins.

6. **Confirm the open questions in Section 12 before completing the implementation plan.** Several decisions depend on stakeholder input.

---

**End of Project Overview**
