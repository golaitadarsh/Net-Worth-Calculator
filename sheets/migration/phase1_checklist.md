# Phase 1: Google Sheets Migration Checklist

**Goal:** Upgrade the live Google Sheet from its current state to an API-ready structure that maps directly to schema_v2.md. No app yet — just fix the data layer foundation.

**When complete:** Sheet is API-writable, schema-compatible, AppScript still working, 30-test suite still passing.

**Tool for AppScript tasks:** Claude Code (provide Code.gs + this checklist)
**Reference:** `docs/design/architecture_v2.md`, `docs/schema/schema_v2.md`

---

## Pre-Migration Checklist

Before starting any tasks:
- [ ] Make a full backup of the spreadsheet (File → Make a copy → "Net Worth Calculator - PRE-MIGRATION BACKUP")
- [ ] Confirm the 30-test AppScript suite passes on the current sheet (Menu → Tests → Run All Tests)
- [ ] Note current net worth figure from Overall sheet (for post-migration verification)
- [ ] Screenshot of Dropdown Lists current format (for reference)

---

## Task List

### Group A: Cleanup
| # | Task | Sheet | Notes |
|---|------|-------|-------|
| A1 | Delete or rename Sheet8 | Sheet8 | First confirm: search all SUMIFS formulas for any Sheet8 reference. If none → rename to "Archive_Sheet8" first, run tests, then delete. |
| A2 | Move Fixed Budget columns (K–O) out of Kharche | Kharche | Create a new "Budget" sheet. Copy values there. Delete K–O from Kharche. Update any SUMIFS that reference these columns. |
| A3 | Rename "Actual Investments" → "Investments" | Tab name | Check: any formula using the old tab name → update. |

### Group B: Dropdown Lists Migration (Critical — Root Fix)
| # | Task | Sheet | Notes |
|---|------|-------|-------|
| B1 | Audit current Dropdown Lists format | Dropdown Lists | Document: which columns hold what. Note all paired column positions (B/C for category/subcategory, E/F for account/sub-account). |
| B2 | Create new "Categories" sheet (API-safe format) | New sheet | Columns: `id`, `parent_name`, `name`, `is_active`. Rows: one per category or subcategory. See format below. |
| B3 | Create new "Accounts" sheet (API-safe format) | New sheet | Columns: `id`, `parent_name`, `name`, `type`, `is_active`. |
| B4 | Create new "AppMappings" sheet | New sheet | Columns: `app_name`, `account_name`, `is_active`. Seed with known mappings (Paytm → SBI, etc.). |
| B5 | Create new "DefaultAccount" sheet | New sheet | Columns: `account_name`, `is_default`. One row for the fallback when no app/bank is mentioned. |
| B6 | Update AppScript `getCache()` to read new sheet format | Code.gs | `getCache()` currently reads paired column positions from Dropdown Lists. Rewrite to read from Categories + Accounts sheets. |
| B7 | Test: cascading dropdowns still work after format change | Kharche | Change a category → verify subcategory dropdown updates. Change account → verify sub-account + app updates. |

**New Categories sheet format:**
```
id  | parent_name      | name             | is_active
----+------------------+------------------+----------
1   |                  | Food and Drinks  | TRUE
2   | Food and Drinks  | Delivery         | TRUE
3   | Food and Drinks  | Eating Out       | TRUE
4   |                  | Transport        | TRUE
5   | Transport        | Local            | TRUE
...
```

**New Accounts sheet format:**
```
id  | parent_name      | name             | type      | is_active
----+------------------+------------------+-----------+----------
1   |                  | Cash Payment     | cash      | TRUE
2   |                  | UPI/Bank Accounts| savings   | TRUE
3   | UPI/Bank Accounts| Axis Bank        | savings   | TRUE
4   | UPI/Bank Accounts| SBI              | savings   | TRUE
...
```

### Group C: Add Audit Columns to Kharche
| # | Task | Col | Notes |
|---|------|-----|-------|
| C1 | Add `row_id` column | After H (col I) | Format: `KHR-u001-NNNN`. Backfill for existing rows using AppScript. New rows: auto-generate on INSERT. |
| C2 | Add `transaction_type` column | Col J | Values: `expense` or `income`. Backfill: all existing rows = `expense`. |
| C3 | Add `raw_input` column | Col K | NULL for all existing rows (they were manual). New voice entries populate this. |
| C4 | Add `is_deleted` column | Col L | Backfill: all existing rows = `FALSE`. |
| C5 | Add `edited_at` column | Col M | Backfill: all existing rows = NULL. |
| C6 | Add `created_at` column | Col N | Backfill: copy from date column (col A). |

> ⚠️ **Rule:** Never insert columns before col H. New columns go RIGHT of col H only. The Overall sheet's SUMIFS are hardcoded to cols A–H.

### Group D: Add Audit Columns to CC Bills
| # | Task | Col | Notes |
|---|------|-----|-------|
| D1 | Add `row_id` | After D (col E) | Format: `CCB-u001-NNNN`. Backfill existing rows. |
| D2 | Add `raw_input` | Col F | NULL for all existing. |
| D3 | Add `is_deleted` | Col G | Backfill: FALSE. |
| D4 | Add `edited_at` | Col H | Backfill: NULL. |
| D5 | Add `created_at` | Col I | Backfill: copy from date col. |

### Group E: Add Audit Columns to Adhoc/Self Transfer
| # | Task | Col | Notes |
|---|------|-----|-------|
| E1 | Add `row_id` | After E (col F) | Format: `ADH-u001-NNNN`. Backfill existing rows. |
| E2 | Add `transfer_type` | Col G | Values: `transfer`, `dividend`, `refund`, `cashback`, `profit_booking`. Backfill: all = `transfer`. |
| E3 | Add `raw_input` | Col H | NULL for all existing. |
| E4 | Add `is_deleted` | Col I | Backfill: FALSE. |
| E5 | Add `edited_at` | Col J | Backfill: NULL. |
| E6 | Add `created_at` | Col K | Backfill: copy from date col. |

### Group F: Investments Sheet Migration
| # | Task | Notes |
|---|------|-------|
| F1 | Current format: columns = months (fragile) | Document the current layout before changing anything. |
| F2 | Migrate to row-per-month format | New columns: `id`, `snapshot_date`, `fund_type`, `initial_amount`, `new_amount`, `total`, `target_amount`. Each row = one fund × one month. |
| F3 | Backfill historical data | One row per fund per past month. `snapshot_date` = first of that month. |
| F4 | Verify: total invested matches pre-migration figure | Cross-check against Overall sheet. |

**New Investments format:**
```
id              | snapshot_date | fund_type      | initial_amount | new_amount | total    | target_amount
----------------+---------------+----------------+----------------+------------+----------+--------------
INV-u001-M01-EQ | 2026-03-01    | Equity Stocks  | 450000         | 0          | 450000   | 600000
INV-u001-M01-SP | 2026-03-01    | SIP            | 180000         | 5000       | 185000   | 300000
```

### Group G: Add user_id to All Data Sheets
| # | Task | Notes |
|---|------|-------|
| G1 | Add `user_id` col to Kharche (col O or last) | Backfill: `u001` for all rows. New rows: auto-set. |
| G2 | Add `user_id` col to CC Bills | Backfill: `u001`. |
| G3 | Add `user_id` col to Adhoc/Self Transfer | Backfill: `u001`. |
| G4 | Add `user_id` col to Investments | Backfill: `u001`. |

### Group H: Create Edit Log Sheet
| # | Task | Notes |
|---|------|-------|
| H1 | Create "Edit Log" sheet with these columns | `log_id`, `timestamp`, `user_id`, `source`, `action`, `sheet`, `row_id`, `field`, `old_value`, `new_value`, `raw_input` |
| H2 | Update AppScript `onEdit()` to write to Edit Log | Every manual cell change in Kharche, CC Bills, Adhoc → append one row to Edit Log with before/after values. |
| H3 | Test: edit a Kharche cell → Edit Log row appears | Verify all 11 columns are populated correctly. |

### Group I: Update AppScript for New Schema
| # | Task | Notes |
|---|------|-------|
| I1 | Update CONFIG object for new column indices | After adding audit columns, update `kharche.rowId`, `kharche.transactionType`, `kharche.rawInput`, etc. |
| I2 | Update `createNewRowId()` function | Currently may not exist → add. Generates `KHR-u001-NNNN` from sheet row count. |
| I3 | Update `onEdit()` → writes to Edit Log | Call `appendEditLog(sheet, row, field, oldValue, newValue)` on every edit. |
| I4 | Update `getCache()` → reads from Categories + Accounts sheets | See B6 above. |
| I5 | Add `onFormSubmit()` (or `onInsert()`) handler | When a new row is added: auto-generate `row_id`, set `created_at`, set `is_deleted = FALSE`. |

### Group J: Update Overall Sheet
| # | Task | Notes |
|---|------|-------|
| J1 | Add `is_deleted = FALSE` filter to all SUMIFS | All Kharche SUMIFS must add a criteria: `Kharche!$L:$L, FALSE`. This ensures soft-deleted rows don't count. |
| J2 | Verify net worth matches pre-migration figure | Cross-check against the figure noted in pre-migration step. |
| J3 | Verify monthly category breakdowns are correct | Spot-check 2–3 months. |

---

## Post-Migration Verification

- [ ] Run full 30-test AppScript suite → all tests pass
- [ ] Net worth on Overall sheet = pre-migration figure
- [ ] Add a test transaction in Kharche → row_id auto-generates, created_at fills, Edit Log gets a row
- [ ] Edit that transaction → edited_at updates, Edit Log gets an UPDATE row
- [ ] Cascading dropdowns still work: Category → Subcategory, Account → Sub-account
- [ ] No "FinVoice" anywhere in the sheet or scripts
- [ ] All sheets named correctly: Kharche, CC Bills, Adhoc/Self Transfer, Categories, Accounts, AppMappings, DefaultAccount, Investments, Edit Log, Overall
- [ ] Backup copy still intact

---

## AppScript Function Map (Post-Migration)

| Function | Purpose | Status |
|----------|---------|--------|
| `onEdit(e)` | Fires on every cell edit. Triggers cascades + Edit Log write | Update for new cols |
| `getCache()` | Builds in-memory lookup: category→subcats, account→subaccts+apps | Rewrite for new sheet format |
| `createNewRowId(prefix, sheet)` | Generates `KHR-u001-NNNN` format IDs | Add new |
| `appendEditLog(...)` | Writes one row to Edit Log sheet | Add new |
| `onInsert(sheet, row)` | Auto-fills audit cols on new row | Add new |
| `runAllTests()` | 30-test suite | Update for new cols |

---

## Quick Reference: Column Map After Migration

**Kharche (Transactions):**
```
A: Date  B: Particulars  C: Category  D: Subcategory  E: Account  F: Sub-Account
G: Application  H: Amount  I: row_id  J: transaction_type  K: raw_input
L: is_deleted  M: edited_at  N: created_at  O: user_id
```

**CC Bills:**
```
A: Date  B: Paid From  C: Credit Card  D: Amount  E: row_id
F: raw_input  G: is_deleted  H: edited_at  I: created_at  J: user_id
```

**Adhoc/Self Transfer:**
```
A: Date  B: From  C: To  D: Amount  E: Buffer  F: row_id  G: transfer_type
H: raw_input  I: is_deleted  J: edited_at  K: created_at  L: user_id
```

---

*Phase 1 Migration Checklist · Net Worth Calculator · March 2026*
*Complete all tasks before starting Phase 2 (Supabase setup).*
