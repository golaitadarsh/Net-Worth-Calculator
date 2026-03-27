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
- [x] Folder structure created: `docs/schema/`, `docs/design/`, `sheets/`
- [x] Foundation files created: CLAUDE.md, RULEBOOK.md, STATE.md, DECISIONS.md, PROMPT_LOG.md
- [x] AppScript extracted: `sheets/Code.gs`
- [x] FinVoice_Schema_Template renamed to Net_Worth_Calculator_Schema_Template

---

## In Progress

- [ ] GitHub repo sync (local files → push to https://github.com/golaitadarsh/Net-Worth-Calculator)
- [ ] Google Sheets MCP setup (Claude Code → live read access to Google Sheet)

---

## Next Steps

1. Set up Google Sheets MCP in Claude Code settings
2. Create Claude Chat Project named "Net Worth Calculator", upload CLAUDE.md + RULEBOOK.md + STATE.md
3. Start Phase 2: schema design in Claude Code plan mode
4. Once schema is reviewed and approved, start Phase 3 (Supabase)

---

## Open Questions

- Which Google Sheet URL is the live working sheet? (needed for MCP setup)
- Supabase: new project or existing? (need to create free account if none)
- For Phase 4: Flutter (mobile) or Next.js (web) first? Stitch exports both.

---

## Blockers

None currently.
