# Architecture Decisions — Net Worth Calculator

Decisions are logged here with date and rationale. Never delete old entries — mark as superseded if changed.

---

## ADR-001 — Stay on Google Sheets during Phase 1 & 2
**Date:** 2026-03-28
**Decision:** Keep Google Sheets as the live working data source during schema design and Supabase setup. Migrate only when the app is ready.
**Rationale:** Zero disruption to existing workflow. Schema can be designed and validated independently. AppScript automation keeps running.
**Consequences:** Need Google Sheets MCP for Claude Code to read live data. Two systems in parallel until migration.

---

## ADR-002 — Google Stitch for UI Design (not Figma/Lovable)
**Date:** 2026-03-28
**Decision:** Use Google Stitch (stitch.withgoogle.com) as the primary UI design tool.
**Rationale:** Free (350 screens/month), AI-native canvas, multi-screen generation, voice input, exports DESIGN.md and Tailwind/Flutter/SwiftUI code. Has Stitch MCP server. Major March 2026 update makes it production-ready.
**Consequences:** Design → DESIGN.md → feed to Lovable for scaffold. Eliminates need for Figma.

---

## ADR-003 — Normalized 7-table schema (not flat sheets)
**Date:** 2026-03-28 (pending Phase 2 implementation)
**Decision:** Normalize Google Sheets data into 7 relational tables: transactions, cc_payments, transfers, accounts, categories, salary_entries, investments.
**Rationale:** Dropdown Lists sheet contains relational data (parent/child categories, parent/child accounts) that maps cleanly to self-referencing tables. Normalization enables proper querying, prevents data duplication.
**Consequences:** Category and Account cascade logic (currently in AppScript) moves to DB foreign key constraints + app-layer cascade logic.

---

## ADR-004 — UUID primary keys (not sequential integers)
**Date:** 2026-03-28
**Decision:** Use UUID as default PK type (Supabase default).
**Rationale:** Avoids sequential ID enumeration, works well with Supabase Row Level Security, future-proof for distributed systems.
**Consequences:** Slightly larger storage; UUIDs not human-readable. Trade-off is acceptable.
