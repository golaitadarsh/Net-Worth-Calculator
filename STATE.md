# State — Net Worth Calculator

**Last updated:** 2026-03-28
**Current phase:** Phase 1 — Foundation Setup

---

## Phases Overview

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | 🟡 In Progress | Repo structure, memory files, AppScript extraction |
| Phase 2: Schema Design | ⬜ Not Started | Normalized SQL schema (7 tables) |
| Phase 3: Supabase Setup | ⬜ Not Started | Create project, run DDL, populate lookups |
| Phase 4: App Build | ⬜ Not Started | Stitch UI → Lovable scaffold → Claude Code refine |

---

## Completed

- [x] Product roadmap planned (Claude Code, 2026-03-28)
- [x] AI tool stack decided (Google Stitch for UI, Lovable for scaffold, Claude Code for logic)
- [x] Folder structure created: `docs/schema/`, `docs/design/`, `sheets/`, `legacy/`
- [x] Foundation files created: CLAUDE.md, RULEBOOK.md, NAMING.md, STATE.md, DECISIONS.md, PROMPT_LOG.md, JOURNEY.md, README.md
- [x] AppScript extracted: `sheets/Code.gs` (1,397 lines, v5.0.0 FINAL)
- [x] FinVoice_Schema_Template renamed to Net_Worth_Calculator_Schema_Template
- [x] Old Artifacts extracted and analysed: architecture_v2, AdarshWallet code
- [x] `docs/design/architecture_v2.md` — full locked 5-phase architecture spec (AI-readable markdown)
- [x] `docs/schema/schema_v1.md` — complete Supabase-ready SQL DDL for all 8 tables
- [x] `legacy/adarsh-wallet-v2/` — React Native app code preserved (reusable for Phase 3 dashboard)
- [x] DECISIONS.md updated with 8 ADRs (including EAV format, soft deletes, user_id, service layer)

---

## In Progress

- [ ] GitHub repo sync (local files → push to https://github.com/golaitadarsh/Net-Worth-Calculator)
- [ ] Google Sheets MCP setup (Claude Code → live read access to Google Sheet)

---

## Next Steps

1. Push to GitHub (blocked: needs GitHub auth — see README for options)
2. Set up Google Sheets MCP in Claude Code settings
3. Create Claude Chat Project named "Net Worth Calculator", upload CLAUDE.md + RULEBOOK.md + STATE.md + architecture_v2.md
4. Start Phase 1 of architecture_v2.md: 19-task data layer migration checklist
5. After Phase 1: schema is stable → proceed to voice layer (Phase 2) or dashboard (Phase 3)

---

## Open Questions

- Which Google Sheet URL is the live working sheet? (needed for MCP setup)
- Supabase: create new project or existing account? (free tier)
- For Phase 3 dashboard: use AdarshWallet React Native code as base, or fresh Next.js via Lovable?
- Voice input (WhatsApp bot — Phase 2): priority or defer to after dashboard?

---

## Blockers

None currently.
