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

## The AdarshWallet Experiment (March 2026)

While the sheets system was working, a parallel experiment happened: building a React Native mobile app called "AdarshWallet" — with Gemini AI voice entry, live charts, offline mode, and Google Sheets sync.

The app had actual screens: HomeScreen, EntryScreen, DashboardScreen, InsightsScreen, SetupScreen. A 50-step deployment guide. API services connecting the app to the Google Sheet as a backend. IST timezone support. Expo/EAS build pipeline.

It didn't ship. The reason is instructive: **the data model wasn't ready**. The app was talking to a Google Sheet whose structure wasn't stable enough to be an API backend. The paired-column Dropdown Lists format meant any new category could corrupt the existing structure. The sheet had no row IDs, no audit trail, no soft deletes.

**What was learned:** You can't build a reliable product on top of unstable data. The app code was fine. The foundation was wrong.

The app code is preserved in `legacy/adarsh-wallet-v2/` — it has reusable logic for the Phase 3 dashboard.

---

## The Architecture Deep-Dive (March 2026)

After the AdarshWallet experiment, a full architecture session produced `docs/design/architecture_v2.md` — a locked 5-phase specification covering:

- Complete EAV long-table schema for Dropdown Lists (AI-safe, append-safe)
- Full column specs for all 8 tables with audit fields baked in
- Voice input pipeline (Sarvam AI STT → Gemini parse → Y/N confirm → Sheets write)
- Service layer architecture where every integration is swappable
- 15 architecture decisions, all resolved
- 18 risk failure points with specific mitigations
- Supabase migration plan (zero-downtime, one config change)

The key insight from this session: **the current paired-column Dropdown Lists format is the root cause of fragility**. Every automation, every AI integration, every API write hits this same problem. Migrating to EAV long-table format is Phase 1 Task 1 — before anything else.

The document was originally called "FinVoice Architecture" (another AI had renamed the project). It has been renamed to Net Worth Calculator throughout.

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
