# State — Net Worth Calculator

**Last updated:** 2026-03-29
**Current phase:** Phase 1 — Google Sheets Migration

---

## Phases Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0: Foundation Docs | ✅ Complete | PRD, ER diagram, schema v2, architecture, all core docs |
| Phase 1: Sheet Migration | 🟡 In Progress | 19-task AppScript/Sheet migration → API-ready structure |
| Phase 2: Supabase Setup | ⬜ Not Started | Create project, run DDL, seed data, enable RLS |
| Phase 3: App Build | ⬜ Not Started | Stitch UI → Lovable scaffold → Claude Code logic |
| Phase 4: Voice Layer | ⬜ Not Started | Web mic → Web Speech API → Gemini parse → confirm |
| Phase 5: WhatsApp Input | ⬜ Not Started | Meta Cloud API + Sarvam ASR + same parse pipeline |

---

## Completed

### Phase 0 — Foundation
- [x] Claude Code installed + GitHub authenticated (`golaitadarsh`)
- [x] Folder structure created and organised
- [x] All foundation files: CLAUDE.md, RULEBOOK.md, NAMING.md, DECISIONS.md, PROMPT_LOG.md, JOURNEY.md, README.md
- [x] AppScript extracted: `sheets/Code.gs` (1,397 lines, v5.0.0 FINAL)
- [x] Old artifacts extracted: architecture_v2.md (markdown), legacy/adarsh-wallet-v2/ (React Native code)
- [x] `docs/design/architecture_v2.md` — full locked 5-phase architecture spec
- [x] `docs/schema/schema_v1.md` — EAV-based schema (reference only, superseded by v2)
- [x] `docs/PRD.md` — Product Requirements Document (8 sections)
- [x] `docs/design/er_diagram.md` — Mermaid ER diagram (10 tables, all relationships)
- [x] `docs/schema/schema_v2.md` — Normalised SQL DDL (supersedes v1 EAV approach)
- [x] `sheets/migration/phase1_checklist.md` — 19-task migration guide with column maps
- [x] `docs/design/competitive_analysis.md` — 8 competitors analysed
- [x] DECISIONS.md — 8 ADRs logged
- [x] Pushed to GitHub: https://github.com/golaitadarsh/Net-Worth-Calculator
- [x] `docs/design/formula_audit.md` — Complete formula audit of live Google Sheet (all 6 tabs, every formula, cross-sheet refs, SQL equivalents)
- [x] `docs/design/er_diagram.md` upgraded to **v2.2** — 6 critical faults fixed (opening_balance, cash in net worth, income_entries, brokerage as expense, net_worth_snapshots FK, full test suite 11 cases)
- [x] `docs/schema/schema_v2.md` upgraded to **v2.2** — 13 tables (income_entries added, opening_balance on accounts, account_id FK on net_worth_snapshots)
- [x] `docs/design/gemini_er_prompt.md` — Prompt for Gemini to visualise ER diagram + test cases + dbdiagram.io instructions

---

## In Progress

- [ ] Phase 1: Google Sheets migration (see `sheets/migration/phase1_checklist.md`)
  - Group A: Cleanup (Sheet8, Fixed Budget columns)
  - Group B: Dropdown Lists → Categories + Accounts sheets (ROOT FIX)
  - Group C–E: Add audit columns to Kharche, CC Bills, Adhoc
  - Group F: Investments → row-per-month format
  - Group G: Add user_id to all sheets
  - Group H: Create Edit Log sheet + AppScript hook
  - Group I: Update AppScript for new schema
  - Group J: Update Overall SUMIFS for is_deleted filter

---

## Next Steps

1. Start Phase 1: open `sheets/migration/phase1_checklist.md` and work through tasks A1–J3
2. After Phase 1 complete: run 30-test AppScript suite → all pass
3. After Phase 1: start Phase 2 (Supabase — `docs/schema/schema_v2.md` DDL)
4. Optional: set up Google Sheets MCP for live sheet access from Claude Code
5. Optional: create Claude Chat Project "Net Worth Calculator" — upload CLAUDE.md + architecture_v2.md + STATE.md

---

## Open Questions

- Splitwise integration: first-class account type with its own UI flow, or generic account? (decide before Phase 3)
- ~~Which specific Google Sheet URL is the live working sheet? (needed for Sheets MCP)~~ **RESOLVED:** https://docs.google.com/spreadsheets/d/1le4JT-4he0jGFlxTwn63ZGsiZfWrVZSyFbkcPsmsm7s
- Phase 3 dashboard: fresh Lovable scaffold vs porting AdarshWallet React Native code?
- ~~F9 Net Worth formula excludes Cash (F2)~~ **RESOLVED: BUG confirmed. Cash IS included in v2.2 schema and net worth calc.**
- ~~Investment totals exclude Brokerage~~ **RESOLVED: Brokerage = expense (transactions table). Profit Booking = deferred ADR.**

---

## Key File Locations

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Auto-read by Claude Code — project brief |
| `RULEBOOK.md` | All rules, naming conventions, AI tool assignments |
| `NAMING.md` | Naming conventions (files, DB, code, UI, git) |
| `DECISIONS.md` | Architecture decision log (ADRs) |
| `docs/PRD.md` | Product requirements (locked for Phase 0–2) |
| `docs/design/architecture_v2.md` | Full architecture spec (most important reference) |
| `docs/design/er_diagram.md` | Mermaid ER diagram v2.2 (13 tables, all test cases) |
| `docs/design/gemini_er_prompt.md` | Paste into Gemini to visualise ER. Also has dbdiagram.io instructions. |
| `docs/schema/schema_v2.md` | Final target SQL DDL v2.2 (run this in Supabase Phase 2) |
| `sheets/migration/phase1_checklist.md` | 19-task migration checklist |
| `sheets/Code.gs` | AppScript v5.0.0 FINAL (current live code) |
| `docs/design/formula_audit.md` | Complete formula audit of live Google Sheet |

---

## Blockers

None currently.
