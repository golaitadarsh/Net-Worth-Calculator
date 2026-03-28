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

## ADR-004 — Human-readable row_id (not UUID)
**Date:** 2026-03-28 (supersedes original UUID proposal, from architecture_v2.md D07)
**Decision:** Use prefixed sequential ID format: `KHR-u001-0047`, `CCB-u001-0003`, `ADH-u001-0012`.
**Rationale:** Human-readable, user-scoped, sequential, debuggable. Easy to reference in Edit Log, session state, and user-facing delete/edit commands. UUID is anonymous — useless when debugging "delete that" commands.
**Consequences:** Requires row_id generation utility (`rowId.js`). Must be generated server-side, not DB-generated.

---

## ADR-005 — EAV Long-Table format for Dropdown Lists (supersedes paired-column)
**Date:** 2026-03-28 (from architecture_v2.md section 4.2)
**Decision:** Migrate Dropdown Lists from paired-column format to EAV (Entity-Attribute-Value) long-table.
**Rationale:** Current paired-column format is AI-unsafe — appending a new category requires knowing the correct row position. Any row inserted out of sequence corrupts the pairing. EAV format is append-safe: any new row can be added without affecting any existing row. Upsert key: `(user_id, item_type, item_name, item_value)`.
**Consequences:** Phase 1 migration task. Apps Script getCache() must be updated to read EAV format. New item_types added: AppMapping, DefaultAccount.

---

## ADR-006 — Soft deletes only, no hard deletes
**Date:** 2026-03-28 (from architecture_v2.md D03)
**Decision:** All deletes are soft: `is_deleted = TRUE`. No `DELETE FROM` ever executed on financial data.
**Rationale:** Financial data is permanent. Same principle as bank ledger entries. Enables full audit trail and debugging.
**Consequences:** All SUMIFS and API queries must add `WHERE is_deleted = FALSE` condition.

---

## ADR-007 — user_id from day one (WhatsApp phone number)
**Date:** 2026-03-28 (from architecture_v2.md D02, D15)
**Decision:** All tables have user_id from first row, populated with WhatsApp phone number.
**Rationale:** Zero migration cost when Phase 5 (multi-user) starts. All queries already filter by user_id.
**Consequences:** Requires populating existing rows in Phase 1 migration.

---

## ADR-008 — Services are swappable (sheetsService → supabaseService)
**Date:** 2026-03-28 (from architecture_v2.md Section 5.1)
**Decision:** Each external integration is one file with identical function signatures. Swapping implementations requires changing one file and one config value. Nothing else changes.
**Rationale:** Enables zero-downtime Sheets → Supabase migration in Phase 4.
**Consequences:** Service files must maintain consistent function signatures.

---

## ADR-009 — Cash Payment IS included in Net Worth
**Date:** 2026-03-28 (from formula audit)
**Decision:** Net Worth = all account balances including Cash Payment (petty cash).
**Rationale:** Current sheet has a bug — `F9 = SUM(F3:F8)` skips F2 (Cash Payment). Confirmed by user: cash on hand is real money and must be counted.
**Fix:** Change Overall!F9 to `=SUM(F2:F8)` during Phase 1 migration (Task J1). In SQL: no WHERE filter on account type — all accounts included in net worth.
**Consequences:** Net worth figure will increase by current Cash Payment balance (~₹4,080).

---

## ADR-010 — Brokerage = Expense, Profit Booking = Complex (not yet designed)
**Date:** 2026-03-28 (from formula audit)
**Decision (Brokerage):** Brokerage fees are a regular expense — logged in Kharche as Category=Investments, Subcategory=Brokerage. NOT included in investment capital totals.
**Decision (Profit Booking):** When selling shares for profit, the proceeds flow back as income. How to handle the capital gain tracking is deferred — logged as a transfer type `profit_booking_equity` in the transfers table. Full accounting design (cost basis, realized gains) is Phase 5+.
**Rationale:** Brokerage is a cost, not an investment. Profit booking is complex enough to need separate design discussion.
**Consequences:** `investment_snapshots` excludes Brokerage fund_type. Profit Booking uses `transfer_type = profit_booking_equity` in the transfers table, destination = bank account.
