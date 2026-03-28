# Product Requirements Document — Net Worth Calculator

**Version:** 1.0
**Date:** March 2026
**Status:** LOCKED for Phase 0–2. Update before Phase 3 (app build).

---

## 1. Problem Statement

Urban Indian professionals track personal finances manually — in Excel, handwritten notebooks, or not at all. The result:
- No real-time net worth visibility
- No category-level spend insight
- High friction to log every transaction (opening a sheet, typing, categorising)
- No awareness of how daily spending compounds into long-term wealth

**What's missing:** A zero-friction tool that makes logging a transaction as effortless as speaking a sentence, and instantly shows you where you stand financially.

---

## 2. Target User

**Primary:** Urban Indian professional, 22–38 years old
- Has multiple accounts: salary bank, credit card, UPI, investments
- Already tries to track expenses (Excel, notebook, or mental memory)
- Uses WhatsApp daily; comfortable with Hindi/Hinglish
- Does not want to "set up" an app — wants immediate value

**Secondary:** Anyone (any country) who wants a zero-friction personal finance tracker with voice input and a clean net worth dashboard.

---

## 3. Core Features — P0 (Must Have in v1)

### 3.1 Net Worth Dashboard
- Live net worth = sum of all account balances
- Per-account balance cards (Cash, Bank accounts, Credit card outstanding, Investments)
- Month-over-month net worth trend (sparkline)
- Top spending categories this month (donut chart)
- CC outstanding per card

### 3.2 Transaction Entry — Manual
- Date, Amount, Category (dropdown), Sub-category (cascades), Account (dropdown), Sub-account (cascades), Particulars (optional text)
- New transaction defaults to today's date
- Category and account dropdowns populated from user's list (global base + personal)

### 3.3 Transaction Entry — Voice (Web Mic)
- Mic button on dashboard and entry screen
- Web Speech API: user speaks → transcript appears
- AI (Gemini 1.5 Flash) parses transcript → fills form automatically
- Confirmation card shown: "₹340 · Medical Spends · Paytm (SBI) · today — Confirm / Edit / Cancel"
- User confirms → saved. Cancel → discarded. Edit → form opens pre-filled.
- Voice confirms before saving — no silent writes

### 3.4 AI Auto-Categorisation
- LLM matches transcript to existing categories (>80% confidence threshold)
- If no match → creates new user-specific category automatically
- `is_auto_created = TRUE` stored for review
- AppMapping: payment app inferred from speech ("Paytm" → "SBI" account)
- DefaultAccount fallback when no app/bank mentioned

### 3.5 Category System
- Global base: shared category list maintained by the product (single source of truth)
- Per-user additions: user or AI can add personal categories
- Category promotion: when a user-created category name appears across ≥10 users → flagged for global promotion review
- Categories are never renamed or deleted — only retired (`is_active = FALSE`)
- Sub-categories supported (1 level deep only — no deeper nesting)

### 3.6 CC Bill Tracking
- Log credit card bill payments separately (not as regular transactions)
- Fields: Date, Paid From (bank account), Credit Card, Amount
- CC outstanding shown on dashboard = sum of CC spends - sum of CC payments

### 3.7 Transfers / Adhoc
- Log money movement between own accounts (e.g., SBI → Axis Bank)
- Special source types: Dividend, Refund, Cashback, Profit Booking — Equity Stocks
- Buffer field for reconciliation rounding differences

### 3.8 Investments Tracker
- Monthly snapshot per fund/investment type
- Fields: Fund type, Initial amount, New amount added this month, Target amount
- Dashboard shows: total invested, breakdown by type, vs target

### 3.9 Transaction List
- Filterable by date range, category, account
- Edit any field inline
- Soft-delete (never hard-delete)
- All edits logged in audit trail

---

## 4. Open Design Questions (Not in scope yet — decide before Phase 3)

### 4.1 Splitwise Integration
Splitwise is widely used for shared expenses. Currently tracked as an "account" with a running balance. Design challenge:
- User pays full bill (e.g., ₹600 dinner for 3) → logs full expense
- Splitwise owes you back ₹400 → tracked as receivable on Splitwise account
- When friends pay you back → log as income/transfer from Splitwise to bank account
- **Question:** Should Splitwise be a first-class account type with its own UI flow, or handled as a generic account?

### 4.2 WhatsApp Input Channel
- Phase 3+ feature
- Meta Cloud API (free) as webhook
- Sarvam AI ASR for Hindi/Hinglish audio → transcript
- Same AI parse pipeline as web voice
- Confirmation via WhatsApp Y/N reply

### 4.3 Budget Tracking
- Phase 3+ feature
- Monthly budget per category vs actual spend
- Dashboard progress bars per category

---

## 5. Explicitly Out of Scope (Never Building)

- Bank statement auto-import or screen scraping
- Real-time stock price fetching
- Tax filing or tax calculation
- Shared accounts between multiple real people
- Anything that costs money to run at personal scale

---

## 6. Success Metrics

| Metric | Target |
|--------|--------|
| Transaction logging time | < 30 seconds per entry (voice path) |
| Net worth load time | < 3 seconds on page open |
| Voice categorisation accuracy | > 90% for known categories |
| Daily active use | User logs ≥1 transaction/day |
| Zero infra cost | ₹0/month at personal scale |

---

## 7. Non-Negotiables

| Rule | Detail |
|------|--------|
| Product name | Always "Net Worth Calculator" — never FinVoice, NWC, or anything else |
| Zero cost | Free for all users. Free to run. No paid API, no paid hosting. |
| No hard deletes | Financial data is permanent. Soft-delete only (`is_deleted = TRUE`). |
| Voice confirms before saving | No silent AI writes. User always sees and approves the parsed entry. |
| Append-only audit | Every change logged in edit_log. Every manual edit captured. |
| Multi-user from day 1 | `user_id` on every table. Even if single user now. |

---

## 8. Tech Stack (Locked)

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js + Tailwind CSS | Free (open source) |
| Backend API | Vercel Serverless Functions | Free (100K/month) |
| Database | Supabase PostgreSQL | Free (500MB) |
| Auth | Supabase Auth | Free |
| Voice STT | Web Speech API (browser native) | Free |
| AI parsing | Gemini 1.5 Flash | Free (rate limited) |
| WhatsApp (Phase 3) | Meta Cloud API | Free |
| Hindi STT (Phase 3) | Sarvam AI ASR | Free (5hrs/month) |
| Hosting | Vercel | Free |
| Design | Google Stitch | Free (350 screens/month) |

**Total: ₹0/month**

---

*Net Worth Calculator PRD v1.0 · March 2026*
*Update this document before starting Phase 3 (app build) to reflect any open design questions resolved.*
