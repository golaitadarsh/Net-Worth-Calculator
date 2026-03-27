# Naming Conventions — Net Worth Calculator

Single source of truth for all naming decisions across files, database, code, and UI.
**This file is enforced** — any AI or developer working on this project must follow it.
When a new convention is needed, add it here before using it.

---

## 1. Product Name

| Context | Use |
|---------|-----|
| Official name | **Net Worth Calculator** |
| Short form (UI labels, headers) | **NWC** |
| Never use | FinVoice, FinTrack, WealthTrack, NetWorthApp, or any AI-suggested alternative |

---

## 2. Files & Folders

| Rule | Example |
|------|---------|
| All lowercase | `schema_v1.md` not `Schema_V1.md` |
| Words separated by underscores | `net_worth_calculator_v1_1.xlsx` |
| Version suffix format: `_v{major}_{minor}` | `schema_v1_0.sql`, `design_v2_1.md` |
| No spaces in filenames | `Code.gs` not `Code gs.rtf` |
| Folders: lowercase, no underscores | `docs/`, `sheets/`, `docs/schema/`, `docs/design/` |

**Standard repo files** (always uppercase, no version suffix):

```
README.md
CLAUDE.md
RULEBOOK.md
STATE.md
DECISIONS.md
PROMPT_LOG.md
JOURNEY.md
NAMING.md       ← this file
```

---

## 3. Database (SQL / Supabase)

### Tables
- Lowercase, plural, snake_case
- Use full descriptive names (no abbreviations)

| Sheet (source) | Table name |
|----------------|------------|
| Kharche | `transactions` |
| CC Bills | `cc_payments` |
| Adhoc Transfer | `transfers` |
| Dropdown Lists (categories) | `categories` |
| Dropdown Lists (accounts) | `accounts` |
| Overall (salary) | `salary_entries` |
| Actual Investments | `investments` |

### Columns
- Lowercase, snake_case
- Foreign keys: `{referenced_table_singular}_id` → e.g., `account_id`, `category_id`
- Boolean columns: prefix with `is_` or `has_` → `is_deleted`, `has_gst`
- Timestamp columns: `created_at`, `updated_at`, `deleted_at`
- Date-only columns: `_date` suffix → `transaction_date`, `purchase_date`
- Amount/money columns: `_amount` suffix → `transaction_amount`, `transfer_amount`
- No abbreviations: `particulars` not `part`, `subcategory_id` not `subcat_id`

### Enums / Types
- Lowercase, snake_case: `account_type`, `transaction_type`
- Values: lowercase → `'savings'`, `'credit'`, `'investment'`

---

## 4. JavaScript / AppScript (current) & TypeScript (future)

| Thing | Convention | Example |
|-------|------------|---------|
| Variables | camelCase | `categoryId`, `sheetName` |
| Functions | camelCase | `getCache()`, `setDropdown()` |
| Constants / config keys | camelCase (inside CONFIG object) | `CONFIG.sheets.kharche` |
| Classes | PascalCase | `DropdownManager` |
| Files | camelCase or kebab-case | `Code.gs`, `use-transactions.ts` |
| React components | PascalCase | `TransactionForm`, `NetWorthDashboard` |
| React hooks | camelCase, `use` prefix | `useTransactions`, `useNetWorth` |

---

## 5. UI Labels (Google Stitch / Frontend)

| Data concept | UI label |
|--------------|----------|
| transactions | Expenses (Kharche) |
| cc_payments | Credit Card Bills |
| transfers | Self Transfers |
| investments | Investments |
| net_worth | Net Worth |
| categories.name | Category |
| categories (child) | Subcategory |
| accounts.name | Account |
| accounts (child) | Sub-account |

> Rule: UI labels can be human-friendly (Hindi words like "Kharche" are fine as labels). DB column names must always be English snake_case.

---

## 6. Git

| Thing | Convention | Example |
|-------|------------|---------|
| Commit prefix | `[tool-name]` then semantic type | `[claude-code] feat: normalize schema` |
| Semantic types | `feat`, `fix`, `refactor`, `docs`, `chore` | |
| Branch names | kebab-case with phase prefix | `schema/v1`, `app/scaffold`, `fix/dropdown-cascade` |
| Tag/release format | `v{major}.{minor}.{patch}` | `v1.0.0`, `v1.1.0` |

---

## 7. Versioning

| Increment | When |
|-----------|------|
| Patch `x.x.1` | Bug fix, no schema or API change |
| Minor `x.1.x` | New feature, backward-compatible |
| Major `1.x.x` | Breaking change (schema migration, API overhaul) |

Schema files include version in filename: `schema_v1_0.sql`
Breaking schema changes always get a new ADR in `DECISIONS.md`.

---

## 8. What Requires a Name Decision First

Before creating any of the following, the name must be agreed and added here:
- New database table
- New API route / endpoint
- New React component
- New branch
- New folder in repo

*Last updated: 2026-03-28*
