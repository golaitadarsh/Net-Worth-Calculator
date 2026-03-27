# Net Worth Calculator

A personal finance tracker that gives you a clear, live picture of your net worth — across accounts, investments, expenses, and credit card bills.

---

## What It Does

| Module | Description |
|--------|-------------|
| **Kharche** (Expenses) | Log daily expenses with cascading category → subcategory dropdowns |
| **CC Bills** | Track credit card payments with account attribution |
| **Adhoc Transfer** | Record self-transfers between accounts |
| **Investments** | Track holdings, purchase price, and current value |
| **Net Worth Dashboard** | Aggregated view — assets minus liabilities, across time |

---

## Current State

The system is live and in active use as a **Google Sheets + AppScript** setup (v1.1). It is currently being evolved into a standalone web application.

**Stack (planned):**
- Database: Supabase (PostgreSQL)
- Frontend: Next.js + Tailwind CSS
- UI Design: Google Stitch
- Hosting: Vercel

---

## Project Journey

See [`JOURNEY.md`](JOURNEY.md) for the full story — from a messy spreadsheet to a structured product — including design decisions, tools used, and what was learned.

---

## Repo Structure

```
/
├── CLAUDE.md           ← Context file for AI-assisted development sessions
├── RULEBOOK.md         ← Conventions, naming rules, AI tool assignments
├── STATE.md            ← Current phase, progress tracker, next steps
├── DECISIONS.md        ← Architecture decision log (ADRs)
├── PROMPT_LOG.md       ← Audit trail of AI prompts across sessions
├── JOURNEY.md          ← Project build story (portfolio)
├── docs/
│   ├── schema/         ← SQL schema (Supabase-ready DDL)
│   └── design/         ← Design documents, architecture, schema templates
└── sheets/
    ├── Code.gs         ← Google Apps Script (v5.0.0) — dropdown automation
    └── net_worth_calculator_v1_1.xlsx
```

---

## How AI Is Used in This Project

This project uses a structured multi-AI workflow:

| Tool | Role |
|------|------|
| **Claude Code** | Schema design, code logic, debugging, session memory via CLAUDE.md |
| **Google Stitch** | UI screen design, prototyping, exports DESIGN.md |
| **Lovable.dev** | Full-stack app scaffolding (Phase 4) |
| **v0.dev** | React component polish |

Context is persisted across sessions via `CLAUDE.md`, `STATE.md`, and `RULEBOOK.md` — committed to this repo as the single source of truth.

---

## Status

`Phase 1 — Foundation complete` → Moving to Phase 2: Schema Design
