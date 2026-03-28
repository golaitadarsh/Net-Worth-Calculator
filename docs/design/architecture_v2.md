# Net Worth Calculator — Architecture & Design Specification

> Originally created as "FinVoice Architecture v2.0 LOCKED" (March 2026).
> Renamed to Net Worth Calculator per project naming convention.
> This is the most complete architecture document in the project.

**Version:** 2.0 — Complete Architecture Specification
**Status:** LOCKED — All decisions finalised, ready to build
**Date:** March 2026
**Target stack:** Google Sheets (Phase 1–3) → Supabase PostgreSQL (Phase 4+)
**Deployment:** Vercel serverless (backend) + React (dashboard)
**Scale target:** Single user (Phase 1–3) → Multi-user (Phase 5)

---

## Contents

1. [Product Vision & Design Principles](#1-product-vision)
2. [System Architecture — 4-Layer Model](#2-system-architecture)
3. [Voice Input Pipeline](#3-voice-input-pipeline)
4. [Data Model — Complete Schema](#4-data-model)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Dashboard](#6-frontend-dashboard)
7. [Technology Stack & Cost](#7-technology-stack--cost)
8. [Phased Roadmap](#8-phased-roadmap)
9. [Decisions Log — 15 Decisions](#9-decisions-log)
10. [Risk Register — 18 Failure Points](#10-risk-register)
11. [Supabase Migration Plan](#11-supabase-migration-plan)
12. [Appendix — Current Sheet Snapshot](#12-appendix--current-sheet-snapshot)

---

## 1. Product Vision

A voice-first personal finance assistant for Indian users. Speak in English, Hindi, or Hinglish — on WhatsApp or in a browser — and the app automatically logs the transaction, categorises it, updates the net worth tracker, and confirms the entry.

**Core interaction:**
```
"Aaj 340 rupaye medicines ke liye diye Paytm se"
→ Date: today
→ Amount: ₹340
→ Category: Medical Spends
→ Account: UPI/Bank Accounts → State Bank of India (inferred via AppMapping: Paytm → SBI)
→ App: Paytm
→ Row written to Kharche, Edit Log updated, WhatsApp confirmation sent
```

### Design Principles (Non-Negotiable)

| Principle | What it means |
|-----------|--------------|
| Zero cost for users | WhatsApp + browser mic + all infra on free tiers at personal scale |
| Voice-first, text-as-fallback | Every feature works with voice AND text |
| Google Sheets as source of truth | No separate DB during Phase 1–3 |
| AI learns your vocabulary | New categories auto-created, never renamed |
| Confirm before commit | Every AI-parsed entry asks Y/N before write |
| Append-only financial ledger | No row ever deleted. Soft delete only. Same as bank ledger. |
| user_id from day one | All tables have user_id. Zero migration cost for multi-user. |
| Every service is swappable | sheetsService → supabaseService. One file change, nothing else breaks. |

---

## 2. System Architecture

4-layer model. Each layer has a single responsibility and is independently replaceable.

| Layer | Name | Responsibility | Technologies |
|-------|------|---------------|-------------|
| L1 | Input Layer | Voice/text from user. Audio → transcript via Sarvam AI STT | WhatsApp Cloud API · Sarvam AI ASR · Web Speech API |
| L2 | AI Layer | Parse transcript → structured JSON. Match categories. Infer account. | Gemini 1.5 Flash (primary) · Claude API (fallback) |
| L3 | Data Layer | Store all financial data. API handles reads/writes. | Google Sheets · Sheets API v4 · Apps Script |
| L4 | Output Layer | Confirmation to user. Dashboard data. Alerts. | WhatsApp reply · React + Recharts · Web Speech API |

### Data Flow — Happy Path

| # | Event | Input → Output |
|---|-------|---------------|
| 1 | User sends voice note | Voice audio (OGG) |
| 2 | Webhook received | HTTP POST with audio URL + sender phone |
| 3 | Audio transcription | Audio file → transcript string |
| 4 | Context fetch | user_id → category list + mappings (from cache) |
| 5 | LLM parsing | Transcript + context → structured JSON |
| 6 | Validation | Parsed JSON → validated JSON |
| 7 | Confirmation sent | Formatted message → user |
| 8 | User confirms (Y/N) | Reply → session lookup by phone |
| 9 | Write to Sheets | Confirmed JSON → new row in Kharche |
| 10 | New category check | is_new_category flag → upsert to Dropdown Lists |
| 11 | Edit Log write | Insert action → Edit Log sheet |
| 12 | Acknowledgement | "Done! ₹340 logged. Mar total: ₹4,320" |

---

## 3. Voice Input Pipeline

### Hinglish Example — Full Trace

**Input:** "Aaj 340 rupaye medicines ke liye diye Paytm se"

**Step 1 → Sarvam AI ASR output:**
```
Transcript: "Aaj 340 rupaye medicines ke liye diye Paytm se"
Language detected: Hinglish
```

**Step 2 → LLM output:**
```json
{
  "date": "2026-03-11",
  "description": "Medicines",
  "amount": 340.00,
  "transaction_type": "expense",
  "category": "Medical Spends",
  "subcategory": null,
  "account_type": "UPI/Bank Accounts",
  "account": "State Bank of India (SBI)",
  "app": "Paytm",
  "is_new_category": false,
  "confidence": 0.94
}
```

**Step 3 → WhatsApp confirmation:**
```
✅ Got it!
Date: 11 Mar 2026 | Amount: ₹340
Category: Medical Spends | Paid via: Paytm (SBI)
Reply Y to save · N to cancel · or type a correction
```

### Date Inference Rules

| User says | Parsed as |
|-----------|----------|
| (nothing) | Today's date |
| "aaj" | Today (Hindi) |
| "kal" | Yesterday (expenses) |
| "parso" | Day before yesterday |
| "5 tarikh" | 5th of current month |
| Explicit date | As stated |

### Auto-Categorisation Logic

1. **Exact match** — check if description words appear in any existing item_name (>80% confidence)
2. **Semantic match** — LLM reasoning for closest category
3. **New category** — only if confidence <80%. Title-cased, consistent with existing style. Sets `is_new_category: true`.

---

## 4. Data Model

### 4.1 Sheet Inventory

| Sheet | DB Table | Write Pattern | API Writable? |
|-------|----------|--------------|--------------|
| Kharche | `transactions` | Append-only | Yes |
| Credit Card Bills | `cc_payments` | Append-only | Yes |
| Adhoc/Self Transfer | `transfers` | Append-only | Yes |
| Dropdown Lists | `user_items` | Upsert by composite key | Yes |
| Overall | `net_worth_snapshots` | Formula-driven | Read-only |
| Actual Investments | `investment_snapshots` | Snapshot per month | Yes |
| Edit Log | `edit_log` | Append-only | Yes |

### 4.2 Dropdown Lists — EAV Long-Table Migration

> **Critical:** The current paired-column format is AI-unsafe. This migration is Phase 1 Task 1.

**Current format (BRITTLE):**
```
Col B (Category) | Col C (Subcat) | Col E (Account) | Col F (Account Subcat)
Food and Drinks  | Delivery       | Cash Payment    | —
Food and Drinks  | Eating Out     | UPI/Bank Accts  | Axis Bank
```
⚠️ Adding categories requires knowing the correct row. AI cannot safely append.

**New EAV long-table format (SCALABLE):**

| user_id | item_type | item_name | item_value | is_active | created_at | updated_at |
|---------|-----------|-----------|------------|-----------|------------|------------|
| +91XXXXXXXXXX | Accounts | UPI/Bank Accounts | Axis Bank | TRUE | 2026-02-01 | 2026-02-01 |
| +91XXXXXXXXXX | Accounts | Credit Card | Scapia | TRUE | 2026-02-01 | 2026-02-01 |
| +91XXXXXXXXXX | Category | Food and Drinks | Delivery | TRUE | 2026-02-01 | 2026-02-01 |
| +91XXXXXXXXXX | AppMapping | Paytm | State Bank of India (SBI) | TRUE | 2026-02-01 | 2026-02-01 |
| +91XXXXXXXXXX | DefaultAccount | UPI | Axis Bank | TRUE | 2026-02-01 | 2026-02-01 |

**item_type values:**
- `Accounts` — account groups and sub-accounts. item_name = group, item_value = sub-account
- `Category` — expense/income categories and subcategories. item_name = category, item_value = subcategory
- `AppMapping` — payment app → bank account. item_name = app, item_value = bank
- `DefaultAccount` — fallback when user mentions no app/bank. item_name = payment type, item_value = account

**Upsert key:** `(user_id + item_type + item_name + item_value)` — prevents duplicates, allows natural list growth.

### 4.3 Kharche (transactions) — Full Column Spec

| Column | Type | Example | Source | Notes |
|--------|------|---------|--------|-------|
| row_id | String | KHR-u001-0047 | Backend | Immutable. FORMAT: KHR-{user_short}-{seq4} |
| user_id | String | +919876543210 | Webhook | WhatsApp number. FK to users in Phase 5 |
| date | Date | 2026-03-11 | AI inference | When expense occurred, NOT when logged |
| particulars | String | Medicines from Apollo | AI parse | Human-readable description |
| category | String | Medical Spends | AI match | Must match item_name in Dropdown Lists |
| subcategory | String | — | AI match | Optional. NULL if no subcategory |
| account | String | UPI/Bank Accounts | AI match | Top-level account type |
| account_sub | String | State Bank of India (SBI) | AI inference | Via AppMapping or DefaultAccount |
| application | String | Paytm | AI parse | Payment app. NULL if cash/direct |
| amount | Number | 340.00 | AI parse | Always positive |
| transaction_type | Enum | expense | AI classify | expense \| income \| transfer |
| raw_input | String | "aaj 340 rupaye..." | Backend | Verbatim transcript. NULL for manual |
| is_deleted | Boolean | FALSE | Backend | Soft delete flag |
| edited_at | Timestamp | NULL | Backend | Set on edit. NULL = never touched |
| created_at | Timestamp | 2026-03-11 14:32:05 | Backend | Set once, immutable |

### 4.4 Credit Card Bills (cc_payments) — Full Column Spec

| Column | Type | Example |
|--------|------|---------|
| row_id | String | CCB-u001-0003 |
| user_id | String | +919876543210 |
| date | Date | 2026-03-04 |
| paid_from | String | Axis Bank |
| credit_card | String | Axis Bank CC |
| amount | Number | 2371.50 |
| raw_input | String | "paid axis cc bill" |
| is_deleted | Boolean | FALSE |
| edited_at | Timestamp | NULL |
| created_at | Timestamp | 2026-03-04 10:15:00 |

### 4.5 Adhoc / Self Transfer (transfers) — Full Column Spec

| Column | Type | Example |
|--------|------|---------|
| row_id | String | ADH-u001-0012 |
| user_id | String | +919876543210 |
| date | Date | 2026-03-01 |
| from_acct | String | Dividend |
| to_acct | String | Axis Bank |
| amount | Number | 41.25 |
| buffer | Number | 0.00 |
| raw_input | String | "dividend credited" |
| is_deleted | Boolean | FALSE |
| edited_at | Timestamp | NULL |
| created_at | Timestamp | 2026-03-01 09:00:00 |

### 4.6 Investments (investment_snapshots) — Full Column Spec

One row per fund per month. Append new rows each month.

| Column | Type | Example |
|--------|------|---------|
| row_id | String | INV-u001-2026M03-EQ |
| user_id | String | +919876543210 |
| snapshot_date | Date | 2026-03-01 (first of month) |
| fund_type | String | Equity Stocks |
| initial_amount | Number | 213100.00 |
| new_amount | Number | 149368.25 |
| total | Number | 362468.25 |
| target_amount | Number | 100000.00 |
| created_at | Timestamp | 2026-03-01 09:00:00 |

### 4.7 Edit Log — Complete Audit Trail

One row per field changed. Append-only. Never manually edit.

| Column | Type | Example |
|--------|------|---------|
| log_id | String | EDL-u001-0089 |
| timestamp | Timestamp | 2026-03-11 14:32:05 |
| user_id | String | +919876543210 |
| source | Enum | whatsapp_bot \| direct_sheet \| api \| migration |
| action | Enum | INSERT \| UPDATE \| SOFT_DELETE \| UPSERT |
| sheet | String | Kharche |
| row_id | String | KHR-u001-0047 |
| field | String | (new row) |
| old_value | String | NULL |
| new_value | String | Full JSON for INSERT; field value for UPDATE |
| raw_input | String | "aaj 340 rupaye..." |
| confirmed | Boolean | TRUE |

### 4.8 Audit Fields — Locked Design

| Column | Tables | Default | Behaviour |
|--------|--------|---------|-----------|
| row_id | All transaction tables | Backend-generated | Immutable. PREFIX-userShort-NNNN |
| user_id | ALL tables | Webhook payload | All queries filter by this |
| raw_input | Kharche, CC Bills, Adhoc | NULL | Verbatim transcript. Never modified |
| is_deleted | Kharche, CC Bills, Adhoc | FALSE | Soft delete only. Never hard delete |
| edited_at | Kharche, CC Bills, Adhoc | NULL | Set on edit. NULL = never touched |
| is_active | Dropdown Lists | TRUE | FALSE = retired category |
| created_at | ALL tables | now() | Set once, immutable |
| snapshot_date | Investments, Overall | First of month | Point-in-time snapshot |

---

## 5. Backend Architecture

### 5.1 Folder Structure

```
/src
  /services               ← external integrations (all swappable)
    sheetsService.js       ← Google Sheets API (swap → supabaseService.js)
    sarvamService.js       ← Sarvam AI: audio URL → transcript
    llmService.js          ← Gemini/Claude: transcript + context → parsed JSON
    whatsappService.js     ← Meta Cloud API: send/receive
  /handlers               ← business logic
    voiceHandler.js        ← full pipeline: receive → transcribe → parse → confirm → write
    editHandler.js         ← delete / update / correct commands
    queryHandler.js        ← read-only: spend summaries, net worth
  /store                  ← in-process state
    categoryCache.js       ← 5-min TTL cache of Dropdown Lists
    sessionStore.js        ← pending confirmations + last 3 row_ids (10-min TTL)
  /routes
    webhook.js             ← POST /webhook/whatsapp
    api.js                 ← GET /api/summary · POST /api/write · GET /api/entries
  /utils
    rowId.js               ← generates KHR-u001-0001 format IDs
    dateParser.js          ← "aaj" "kal" "parso" "5 tarikh" → ISO date
    validator.js           ← amount sanity, category/account validation
    logger.js              ← structured logging
  config.js
  index.js                ← Vercel serverless entry point
```

### 5.2 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| POST /webhook/whatsapp | POST | Receives WhatsApp messages. Must return 200 within 200ms |
| POST /webhook/browser | POST | Receives browser mic transcript |
| POST /api/write | POST | Writes confirmed entry to Sheets |
| GET /api/summary | GET | Current month spend + net worth for dashboard |
| GET /api/entries | GET | Last N rows from Kharche |
| GET /api/categories | GET | Full Dropdown Lists from categoryCache |
| POST /api/edit | POST | Edit or soft-delete a row by row_id |

### 5.3 LLM Prompt Architecture

Prompt built fresh on every LLM call. Context injected at runtime:
- Role: "personal finance assistant for Indian user. Parse spoken expense → JSON only."
- Today's date (for "aaj"/"kal" resolution)
- Full category list from Dropdown Lists (prevents hallucination)
- Full account list (prevents hallucinated account names)
- AppMapping list (enables Paytm→SBI inference)
- DefaultAccount list (fallback when nothing stated)
- Matching rule: ">80% confidence before creating new category"
- Language: "User may speak English, Hindi, or Hinglish"

---

## 6. Frontend Dashboard

### Dashboard Widgets

| Widget | Data Source | Chart Type |
|--------|------------|------------|
| Net Worth | Overall rows 1–10 | KPI card + sparkline |
| Cash in Bank | Overall F10 | KPI card |
| Spending by Category (month) | Kharche filtered by month | Donut chart |
| Per-Account Usage | Kharche grouped by account_sub | Horizontal bar |
| Income vs Expense trend | Overall monthly analytics | Line chart |
| CC Outstanding | Overall rows 15–18 | KPI cards per card |
| Investment Portfolio | Investments snapshot | Stacked bar |
| Investment vs Target | Investments total vs target | Gauge / progress bar |
| Recent Entries (last 20) | Kharche last 20 rows | Transaction list |
| Quick Add (voice + text) | User input | Mic button + text |
| Monthly Budget tracker | Budget sheet vs actuals | Progress bars per category |

---

## 7. Technology Stack & Cost

| Component | Technology | Cost at personal scale |
|-----------|-----------|----------------------|
| Voice STT | Sarvam AI ASR | ₹0 (5 hrs/month free) |
| LLM parsing | Gemini 1.5 Flash | ₹0 (free tier) |
| WhatsApp channel | Meta Cloud API | ₹0 (permanent free tier) |
| Backend hosting | Vercel Serverless | ₹0 (100K invocations/month) |
| Data store | Google Sheets API v4 | ₹0 |
| Dashboard | React + Recharts | ₹0 (open source) |
| Browser STT | Web Speech API | ₹0 (native browser) |
| Future DB | Supabase (PostgreSQL) | ₹0 (500MB free) |

**Total at personal scale: ₹0/month**

---

## 8. Phased Roadmap

| Phase | Description | Status |
|-------|------------|--------|
| P1 | Data Layer Migration — schema changes, EAV migration, audit columns, Edit Log, Apps Script update | **NEXT STEP** |
| P2 | Voice Layer — Sarvam AI, LLM parsing, Node.js backend, WhatsApp webhook | Planned |
| P3 | Browser Dashboard — React app, Recharts, browser mic | Planned |
| P4 | Intelligence Layer — monthly summaries, alerts, anomaly detection, Supabase migration | Future |
| P5 | Multi-user — registration, per-user isolation, RLS | Future |

### Phase 1 — 19-Task Checklist

- [ ] Confirm Sheet8 has no SUMIFS references → rename "AI Test Log" or delete
- [ ] Move Fixed Budget table from Kharche cols K–O → dedicated "Budget" sheet
- [ ] Run migration script: export Dropdown Lists to EAV long-table format
- [ ] Add `user_id` column to ALL sheets — populate with WhatsApp number for all existing rows
- [ ] Add `row_id` to Kharche, CC Bills, Adhoc — generate KHR/CCB/ADH-u001-NNNN for all rows
- [ ] Add `transaction_type` to Kharche — backfill "expense"; set "income" for salary rows
- [ ] Add `raw_input` to Kharche, CC Bills, Adhoc — NULL for existing rows
- [ ] Add `is_deleted` (FALSE) and `edited_at` (NULL) to Kharche, CC Bills, Adhoc
- [ ] Add `created_at` to Kharche, CC Bills, Adhoc — backfill from date column
- [ ] Add `is_active` (TRUE), `created_at`, `updated_at` to Dropdown Lists EAV table
- [ ] Migrate Investments to row-per-month snapshot format
- [ ] Add AppMapping rows (see Appendix)
- [ ] Add DefaultAccount rows: UPI→Axis Bank, CreditCard→Scapia, Cash→Cash Payment
- [ ] Create Edit Log sheet with all 12 columns — empty
- [ ] Add Apps Script onEdit() trigger → writes to Edit Log (source=direct_sheet)
- [ ] Update Apps Script getCache() → read EAV format, filter by user_id and is_active=TRUE
- [ ] Update Overall sheet SUMIFS: add `is_deleted=FALSE` condition to all Kharche references
- [ ] Update Adhoc "From" list: add "Profit Booking - Equity Stocks"
- [ ] Run 30-test suite — all tests must pass before proceeding to Phase 2

---

## 9. Decisions Log

All 15 architecture decisions, locked.

| # | Decision | Final Answer | Rationale |
|---|----------|-------------|-----------|
| D01 | Database | Google Sheets (P1–3) → Supabase (P4+) | Validate concept first. Schema DB-ready from day one |
| D02 | user_id format | WhatsApp phone number (+91XXXXXXXXXX) | Always in webhook payload. No auth system needed |
| D03 | Deletes | Soft delete only. is_deleted=TRUE | Financial data is permanent. Bank ledger principle |
| D04 | Edit history | Edit Log sheet. One row per field changed | original_values column breaks on second edit |
| D05 | Category renames | Retire (is_active=FALSE). Never rename | Renaming breaks SUMIFS silently |
| D06 | Timestamps | created_at all tables. updated_at Dropdown Lists | Different tables have different write patterns |
| D07 | row_id format | PREFIX-userShort-NNNN (e.g. KHR-u001-0047) | Human-readable, debuggable |
| D08 | WhatsApp provider | Meta Cloud API (direct) | Zero cost. Permanent free tier |
| D09 | LLM provider | Gemini 1.5 Flash → Claude API fallback | Free tier handles personal scale |
| D10 | Confirmation flow | Always confirm before write (first 3 months) | Builds trust in AI |
| D11 | Session state | In-memory. 10-min TTL. Last 3 interactions | Zero cost single-user. Redis upgrade path for P5 |
| D12 | Amount sanity | >₹50,000 non-investment → second confirmation | Catches STT mishearing 340→3400 |
| D13 | Backend hosting | Vercel serverless | Free tier. No cold-start at personal scale |
| D14 | Dashboard frontend | React + Recharts on Vercel | Recharts purpose-built for financial charts |
| D15 | Multi-user timing | user_id column from day one, build for one | Zero migration cost when Phase 5 starts |

---

## 10. Risk Register

18 failure points identified during architecture audit.

| ID | Layer | Failure | Severity | Mitigation |
|----|-------|---------|----------|------------|
| F01 | Data | No row_id in current sheet. Edit/delete/log have no stable reference | HIGH | Phase 1: Add row_id. Immutable. All edit commands reference row_id not row number |
| F02 | Data | Sheet8 has 43 unexplained rows. May confuse AI parser | MEDIUM | Phase 1: Investigate and rename/delete |
| F03 | Data | Monthly Fixed Budget embedded in Kharche cols K–O. Column insertion breaks it | HIGH | Phase 1: Move to Budget sheet |
| F04 | Data | Overall col headers hardcoded per bank. Adding a bank = manual header update | MEDIUM | Known limitation. Dashboard generates columns dynamically |
| F05 | Data | Investments uses month names as column headers. Adding month = insert column | HIGH | Phase 1: Migrate to row-per-month format |
| F06 | AI | LLM has no memory between calls. "Cancel that" fails without session context | MEDIUM | Phase 2: sessionStore.js with last 3 row_ids, 10-min TTL |
| F07 | AI | Sarvam mishears amounts: 340→3400 or 34 | HIGH | Phase 2: validator.js — >₹50k non-investment → second confirmation |
| F08 | AI | Category sprawl: "Medical", "Medicine", "Medicines" coexist | MEDIUM | Phase 2: LLM fuzzy match >80% before creating new |
| F09 | AI | AppMapping is static. New payment app → AI guesses | MEDIUM | Phase 2: Bot asks which bank, writes AppMapping for future |
| F10 | AI | User sends voice but does not reply Y/N. Pending entry sits indefinitely | MEDIUM | Phase 2: sessionStore TTL 10min. Expired → discard + notify |
| F11 | Sheets | Sheets API rate limit 300 writes/min. Breaks at 50+ concurrent users | HIGH | Phase 4: Supabase migration (no rate limit) |
| F12 | Sheets | Overall SUMIFS reference Kharche by column letter. Col insertion before H breaks all | HIGH | Design rule: new Kharche columns RIGHT of col H only. Cols A–H frozen |
| F13 | Security | No row-level access control. Sheet shared accidentally = full data exposure | HIGH | Phase 1: Sheet private. Service account key in env var |
| F14 | Multi-user | user_id = WhatsApp number. User changes phone → history disconnected | MEDIUM | Phase 5: user_profile table maps old number → stable primary_id |
| F15 | Multi-user | Dropdown Lists without user_id filter → all users see each other's categories | HIGH | Already solved: user_id on Dropdown Lists from Phase 1 |
| F16 | Audit | Direct Sheets edits bypass Edit Log entirely | MEDIUM | Phase 1: Apps Script onEdit() → Edit Log (source=direct_sheet) |
| F17 | Data quality | Subcategory name duplicates parent (e.g. Education → Education) | LOW | Phase 2: LLM rule — if subcat equals cat name, set subcat to null |
| F18 | Data quality | Others category used with free-text subcategory | MEDIUM | Phase 2: LLM — if matches Others, attempt proper new category first |

---

## 11. Supabase Migration Plan

### Schema Mapping

| Google Sheet | Postgres Table | Key differences |
|-------------|---------------|----------------|
| Kharche | transactions | row_id → PRIMARY KEY. user_id → FK to users. is_deleted indexed |
| Credit Card Bills | cc_payments | Same pattern |
| Adhoc/Self Transfer | transfers | from_acct and to_acct reference accounts table |
| Dropdown Lists | user_items | UNIQUE(user_id, item_type, item_name, item_value). is_active indexed |
| Investments | investment_snapshots | UNIQUE(user_id, snapshot_date, fund_type) |
| Overall | net_worth_snapshots | Materialized view or separate table |
| Edit Log | edit_log | No UPDATE/DELETE permissions at DB level |
| (new) | users | user_id PK, whatsapp_number UNIQUE, display_name, created_at |

### Migration Steps

1. Create Supabase project (Singapore region — lowest latency from India)
2. Run schema creation SQL for all 8 tables with indexes on `user_id`, `created_at`, `is_deleted`, `snapshot_date`
3. Enable Row Level Security — policy: `user_id = auth.uid()`
4. Run Python migration script: all Sheets rows → INSERT into Postgres
5. Verify row counts match between Sheets and Postgres
6. Create `supabaseService.js` with identical function signatures as `sheetsService.js`
7. Change one line in `config.js`: `DATA_STORE = "supabase"`
8. Run all backend tests. Verify end-to-end flow.
9. Keep Google Sheet as read-only archive for 30 days
10. After 30 days: Sheets = backup archive. Supabase = sole source of truth.

> Zero-downtime migration: because the service layer abstraction is built from Phase 2, the actual migration is a single config change.

---

## 12. Appendix — Current Sheet Snapshot

*(Data from March 2026 workbook)*

### Net Worth Summary

| Account | Starting Balance | Direct Spend | Net Transfer | Current Balance |
|---------|----------------|-------------|-------------|----------------|
| Cash Payment | ₹2,080 | ₹1,000 | +₹3,000 | ₹4,080 |
| Axis Bank | ₹6,76,067 | ₹99,616 | -₹74,842 | ₹4,99,238 |
| State Bank of India (SBI) | ₹11,835 | ₹50,210 | +₹46,188 | ₹7,814 |
| Amazon Pay | ₹272 | ₹2,200 | +₹1,928 | ₹— |
| Groww Account | ₹— | ₹1,05,119 | +₹1,05,172 | ₹52 |
| Splitwise | ₹1,16,146 | ₹580 | -₹78,015 | ₹37,552 |
| Investments | ₹3,48,935 | -₹2,04,617 | ₹— | ₹5,53,552 |
| **NET WORTH** | | | | **₹10,98,208** |

### Current Category List

Food and Drinks (Delivery, Eating Out) · Cigarettes · Recreation · Transport (Local, Metro, Auto/Cab, Petrol) · Household (House Rent, Fixed Groceries, Random Groceries, Maid Salary, Electricity, Furniture Rent) · Apparel · Others · Trip (Travelling, Food, Accommodation, Household, Drinks and Cigarettes, Recreation, Miscellaneous, Gifts) · Subscriptions · Education · Medical Spends · Investments (Equity Stocks, SIP, Mutual Funds, NPS, Fixed Deposits, Brokerage, IPO locked/Limit Buy) · Income

### AppMappings to Create in Phase 1

| App | → Account |
|-----|---------|
| Paytm | State Bank of India (SBI) |
| GPay | Axis Bank |
| PhonePe | State Bank of India (SBI) |
| Scapia | Scapia (Credit Card) |
| Swiggy | Axis Bank CC |
| Groww | Groww Account |
| Amazon Pay app | Amazon Pay |
| Default UPI | Axis Bank |
| Default CC | Scapia |
| Default Cash | Cash Payment |

---

*Net Worth Calculator Architecture v2.0 · Locked · March 2026*
*Originally "FinVoice Architecture" — renamed per project naming convention*
