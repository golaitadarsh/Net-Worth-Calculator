# Journey — Net Worth Calculator

> This document tells the story of building Net Worth Calculator — from a personal problem to a structured product. Written for anyone who wants to understand the decisions, the evolution, and what was learned along the way.

---

## The Problem

I needed to track my personal finances — not just expenses, but the full picture: how much I spend, where it goes, what I owe on credit cards, what I hold in investments, and ultimately, what my net worth is at any point in time.

Existing apps were either too generic, too opinionated, or didn't reflect how I think about money. So I built my own.

---

## v0 — The Messy Spreadsheet

Started with a basic Google Sheet. One tab, no structure. Expenses mixed with transfers. Categories typed freehand, inconsistent. Formulas breaking. Every month felt like cleaning up a mess before I could read anything useful.

**Problem identified:** No enforced structure = garbage in, garbage out.

---

## v1.0 — Structure + Automation

Decided to fix the structure properly. Separated concerns into distinct sheets:

- **Kharche** — daily expenses only
- **CC Bills** — credit card payments as distinct events
- **Adhoc Transfer** — self transfers between accounts (not expenses)
- **Actual Investments** — holdings tracked separately
- **Overall** — formula-driven net worth summary
- **Dropdown Lists** — the single source of truth for all categories and accounts

The biggest win was **cascading dropdowns**: selecting a Category auto-filters the Subcategory list. Selecting an Account auto-filters the Sub-account and Payment App. This made data entry fast and consistent.

Built in **Google Apps Script** to power the dropdowns. First version was brittle — multiple files, global state, unclear execution order.

**What was learned:** Separation of concerns matters even in spreadsheets. Automation is only as good as the data model behind it.

---

## v1.1 — AppScript Refactor (v5.0.0 FINAL)

Rewrote the AppScript from scratch. Key decisions:

- **Single file** — all logic in one `Code.gs`, no `Settings.gs`
- **CONFIG object** — all sheet names, column indices, row starts in one place. Change the sheet, change one line.
- **Cache layer** — dropdown data cached per execution, cleared on every edit. Prevents hammering the Dropdown Lists sheet on every keystroke.
- **Comprehensive menu** — 20+ menu items for setup, refresh, debug, and cleanup. Any operation runnable from the sheet UI without touching code.
- **30 automated tests** — runnable from the menu. Catches regressions when the sheet structure changes.

```javascript
// CONFIG-driven approach — all magic numbers in one place
const CONFIG = {
  sheets: { kharche: 'Kharche', dropdowns: 'Dropdown Lists', ... },
  kharche: { date: 1, category: 3, subcategory: 4, account: 5, ... },
  rows: { kharcheStart: 3, ccBillsStart: 2, maxData: 1000 }
};
```

**What was learned:** Configuration-driven code is dramatically easier to maintain than hardcoded values scattered across functions. A single CONFIG object turned a brittle script into something stable.

---

## The Pivot — From Tool to Product

At this point the system worked well for personal use. The question became: can this be a product?

To answer that, I needed to think about it differently — not as "my spreadsheet" but as a system with:
- A proper data model (not just sheet tabs)
- A real database (not formulas)
- A UI someone else could use
- An architecture that could scale

---

## The Architecture Decision

**Key question:** How do you turn a Google Sheet into a normalized database?

Mapped every sheet to a relational table:

| Sheet | Table | Key insight |
|-------|-------|-------------|
| Kharche | `transactions` | Category/subcategory become foreign keys, not text |
| CC Bills | `cc_payments` | Separate from expenses — different semantics |
| Adhoc Transfer | `transfers` | From/to accounts — self-referencing FK |
| Dropdown Lists | `categories` + `accounts` | Self-referencing tables (parent/child hierarchy) |
| Actual Investments | `investments` | Holdings with purchase price, current value |
| Overall | computed views | Replaced by SQL views + aggregations |

The **Dropdown Lists sheet** was the most interesting mapping. It stores both Category→Subcategory hierarchies and Account→Sub-account hierarchies in a flat structure. In a relational DB, this becomes a single self-referencing table: `parent_id NULL` means top-level, `parent_id = some_id` means child.

**What was learned:** A well-structured spreadsheet maps almost directly to a normalized schema. If your data makes sense in Excel, it will make sense in PostgreSQL.

---

## The Tooling Decision

Decided to use AI tools throughout the build — not as a shortcut, but as a deliberate workflow. The challenge: AI tools have no memory between sessions.

**Solution:** The repo itself IS the memory.

Created a set of files that any AI reads at the start of a session:
- `CLAUDE.md` — auto-read by Claude Code, gives full project context
- `RULEBOOK.md` — conventions, naming rules, which AI does what
- `STATE.md` — current phase, what's done, what's next
- `DECISIONS.md` — architecture decisions with rationale
- `PROMPT_LOG.md` — audit trail of significant AI prompts

This pattern solves the context problem: start a new session, AI reads three files, fully up to speed in seconds.

**AI tool stack chosen:**
- **Claude Code** — schema design, code logic, file management
- **Google Stitch** (free, Google Labs) — UI design, multi-screen prototyping, exports Tailwind code
- **Lovable.dev** — full-stack Next.js + Supabase scaffolding
- **v0.dev** — React component polish

**What was learned:** Persistent context is the hard problem in AI-assisted development. Solving it at the file/repo level — rather than relying on any single AI's memory — makes the workflow tool-agnostic and robust.

---

## Current State (March 2026)

Phase 1 (Foundation) is complete. The repo is structured, the AppScript is version-controlled, all conventions are documented.

**Up next:**
- Phase 2: Finalize normalized SQL schema
- Phase 3: Supabase setup — create tables, populate lookups
- Phase 4: UI in Google Stitch → scaffold with Lovable → refine with Claude Code

---

## Skills Demonstrated

- **Data modeling** — mapping a working spreadsheet system to a normalized relational schema
- **Automation** — Google Apps Script with caching, validation, 30-test suite, config-driven architecture
- **AI-assisted development** — structured multi-AI workflow with persistent context management
- **Product thinking** — identifying when a personal tool has product potential and making the architectural pivot
- **Documentation discipline** — CLAUDE.md, RULEBOOK.md, STATE.md, DECISIONS.md, PROMPT_LOG.md as living documents

---

## Tech Stack (Full Timeline)

| Phase | Tools |
|-------|-------|
| v0 | Google Sheets |
| v1.0–v1.1 | Google Sheets + Google Apps Script |
| Phase 2 (now) | + SQL schema design |
| Phase 3 | + Supabase (PostgreSQL) |
| Phase 4 | + Next.js, Tailwind, Google Stitch, Vercel |

---

*This document is updated as the project evolves. Each section reflects decisions made at the time, preserved as a record of the thinking — not cleaned up in hindsight.*
