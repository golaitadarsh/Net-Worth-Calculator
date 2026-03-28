# Net Worth Calculator

Personal finance tracker: log daily expenses, credit card payments, transfers, and investments — summarized into a live net worth dashboard.

**Current phase:** Phase 1 — Foundation & Schema Design
**Stack:** Google Sheets (live data now) → Supabase (DB) → Next.js + Tailwind (frontend) → Vercel (hosting)

---

## Read These Files First

- `RULEBOOK.md` — product rules, naming conventions, AI tool assignments
- `STATE.md` — what's done, what's in progress, what's next, open questions
- `NAMING.md` — all naming conventions (files, DB, code, UI, git)
- `docs/design/architecture_v2.md` — **CRITICAL: complete locked architecture spec** (5 phases, full schema, 15 decisions, 18 risks, Supabase migration plan)
- `docs/design/formula_audit.md` — **Complete formula audit** of live Google Sheet (every formula, cross-sheet refs, risks, SQL equivalents)
- `docs/schema/schema_v1.md` — Supabase-ready SQL DDL for all 8 tables
- `JOURNEY.md` — project history (useful for understanding context)

---

## Non-Negotiable Rules

1. **Product name is always "Net Worth Calculator"** — never FinVoice, never anything else
2. **Update STATE.md at the end of every session**
3. **Log significant decisions in DECISIONS.md**
4. **Commit message format:** `[tool-name] description` e.g. `[claude-code] normalize schema`

---

## Project Structure

```
/
├── CLAUDE.md           ← This file (auto-read by Claude Code)
├── RULEBOOK.md         ← Rules, conventions, AI tool assignments
├── STATE.md            ← Current state, progress tracker
├── DECISIONS.md        ← Architecture decision log
├── PROMPT_LOG.md       ← Significant prompts across all AI sessions
├── docs/
│   ├── schema/         ← SQL schema files
│   └── design/         ← Design documents, architecture
├── sheets/             ← Google Sheets exports, AppScript code
└── app/                ← Web app (created in Phase 4)
```

---

## Key Domain Concepts

| Sheet | Maps To | Description |
|-------|---------|-------------|
| Kharche | `transactions` | Day-to-day expenses |
| CC Bills | `cc_payments` | Credit card bill payments |
| Adhoc Transfer | `transfers` | Self transfers between accounts |
| Overall | computed views | Formula-driven net worth summary |
| Actual Investments | `investments` | Investment holdings |
| Dropdown Lists | `accounts` + `categories` | Lookup/reference data |

---

## GitHub

https://github.com/golaitadarsh/Net-Worth-Calculator
