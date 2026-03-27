# Rulebook — Net Worth Calculator

This file is the single source of truth for product conventions, AI tool assignments, and development rules.
**It updates itself:** when new conventions are established in any session, update this file.

---

## 1. Naming & Branding

See **`NAMING.md`** for the full naming conventions (files, DB, code, UI, git).

- Product name: **Net Worth Calculator** — always, everywhere
- Never use: FinVoice, FinTrack, WealthTracker, or any AI-suggested alternative

---

## 2. AI Tool Assignments

| Task | Tool | Notes |
|------|------|-------|
| Schema design, SQL, debugging, code review | **Claude Code** | Primary tool |
| UI screen design, prototypes, flows | **Google Stitch** (free) | stitch.withgoogle.com — exports DESIGN.md |
| Full-stack app scaffolding | **Lovable.dev** | Use in Phase 4 |
| React component polish | **v0.dev** (free) | For individual components |
| Architecture discussions | **Claude Chat (Project)** | Create Project named "Net Worth Calculator" |
| ETL / data sync (future) | **Stitch by Fivetran** | Different from Google Stitch |

---

## 3. Session Rules

1. **At session start:** Read STATE.md to understand current status
2. **At session end:** Update STATE.md with what was done and what's next
3. **Architecture decisions:** Log in DECISIONS.md with date + rationale
4. **Significant prompts:** Log in PROMPT_LOG.md (tool used, prompt summary, outcome)
5. **Commit messages:** `[tool-name] brief description`

---

## 4. Data Conventions

- Date format: `YYYY-MM-DD` (ISO 8601) in all DB columns
- Currency: Indian Rupees (INR), stored as `NUMERIC(12,2)`
- IDs: UUID (Supabase default), not sequential integers
- Soft deletes: `deleted_at TIMESTAMPTZ` column (don't hard-delete user data)
- Timestamps: `created_at` and `updated_at` on all tables

---

## 5. Versioning

- Files: append `_v{major}_{minor}` (e.g., `schema_v1_0.md`)
- Commits: use semantic prefixes — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Breaking schema changes: bump major version, document in DECISIONS.md

---

## 6. Google Sheets (Current Live System)

- Do not break or modify the live Google Sheet unless explicitly requested
- AppScript code lives in `sheets/Code.gs` (version-controlled copy)
- Sheet runs in parallel with the app until full migration is confirmed
- MCP: Google Sheets MCP to be configured for live read access

---

## 7. This File Updates Itself

When any of these conventions change, update the relevant section of this file immediately.
Note the date of change in parentheses next to the updated rule.
