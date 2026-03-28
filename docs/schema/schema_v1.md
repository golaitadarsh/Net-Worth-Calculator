# Database Schema — Net Worth Calculator v1.0

Derived from architecture_v2.md. Supabase-ready PostgreSQL DDL.
Current data lives in Google Sheets. This schema is the migration target.

**Status:** Designed, not yet deployed
**Target:** Supabase PostgreSQL (Phase 4)
**Region:** Singapore (lowest latency from India)

---

## Tables

### 1. users
```sql
CREATE TABLE users (
  user_id       TEXT PRIMARY KEY,              -- WhatsApp number e.g. +919876543210
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 2. transactions (Kharche)
```sql
CREATE TABLE transactions (
  row_id           TEXT PRIMARY KEY,           -- KHR-u001-0047 (immutable)
  user_id          TEXT NOT NULL REFERENCES users(user_id),
  date             DATE NOT NULL,              -- when expense occurred (not logged)
  particulars      TEXT,                       -- human-readable description
  category         TEXT NOT NULL,
  subcategory      TEXT,                       -- NULL if no subcategory
  account          TEXT NOT NULL,              -- top-level account type
  account_sub      TEXT,                       -- sub-account (Axis Bank, SBI, etc.)
  application      TEXT,                       -- payment app (Paytm, GPay, NULL for cash)
  amount           NUMERIC(12,2) NOT NULL,     -- always positive
  transaction_type TEXT NOT NULL DEFAULT 'expense', -- expense | income | transfer
  raw_input        TEXT,                       -- verbatim transcript. NULL for manual
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,               -- NULL = never edited
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX idx_transactions_category ON transactions(user_id, category);
```

### 3. cc_payments (Credit Card Bills)
```sql
CREATE TABLE cc_payments (
  row_id       TEXT PRIMARY KEY,              -- CCB-u001-0003 (immutable)
  user_id      TEXT NOT NULL REFERENCES users(user_id),
  date         DATE NOT NULL,
  paid_from    TEXT NOT NULL,                 -- bank account used to pay
  credit_card  TEXT NOT NULL,                 -- card being paid off
  amount       NUMERIC(12,2) NOT NULL,
  raw_input    TEXT,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cc_payments_user_date ON cc_payments(user_id, date);
```

### 4. transfers (Adhoc/Self Transfer)
```sql
CREATE TABLE transfers (
  row_id      TEXT PRIMARY KEY,               -- ADH-u001-0012 (immutable)
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  date        DATE NOT NULL,
  from_acct   TEXT NOT NULL,                  -- source (flat account + Dividend/Refund/Cashback)
  to_acct     TEXT NOT NULL,                  -- destination (flat account only)
  amount      NUMERIC(12,2) NOT NULL,
  buffer      NUMERIC(12,2) DEFAULT 0.00,     -- rounding buffer for reconciliation
  raw_input   TEXT,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transfers_user_date ON transfers(user_id, date);
```

### 5. user_items (Dropdown Lists — EAV long-table)
```sql
CREATE TABLE user_items (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  item_type   TEXT NOT NULL,    -- Accounts | Category | AppMapping | DefaultAccount
  item_name   TEXT NOT NULL,    -- category name / account group / app name
  item_value  TEXT DEFAULT '',  -- subcategory / sub-account / bank name
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- Prevents duplicate entries; allows natural list growth
  UNIQUE (user_id, item_type, item_name, item_value)
);

CREATE INDEX idx_user_items_user_type ON user_items(user_id, item_type, is_active);
```

### 6. investment_snapshots (Actual Investments)
```sql
CREATE TABLE investment_snapshots (
  row_id          TEXT PRIMARY KEY,           -- INV-u001-2026M03-EQ
  user_id         TEXT NOT NULL REFERENCES users(user_id),
  snapshot_date   DATE NOT NULL,              -- first of month
  fund_type       TEXT NOT NULL,              -- Equity Stocks | SIP | Mutual Funds | NPS | etc.
  initial_amount  NUMERIC(12,2) DEFAULT 0.00,
  new_amount      NUMERIC(12,2) DEFAULT 0.00,
  total           NUMERIC(12,2) GENERATED ALWAYS AS (initial_amount + new_amount) STORED,
  target_amount   NUMERIC(12,2) DEFAULT 0.00,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, snapshot_date, fund_type)
);

CREATE INDEX idx_investments_user_date ON investment_snapshots(user_id, snapshot_date);
```

### 7. edit_log
```sql
CREATE TABLE edit_log (
  log_id      TEXT PRIMARY KEY,              -- EDL-u001-0089
  timestamp   TIMESTAMPTZ DEFAULT now(),
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  source      TEXT NOT NULL,                 -- whatsapp_bot | direct_sheet | api | migration
  action      TEXT NOT NULL,                 -- INSERT | UPDATE | SOFT_DELETE | UPSERT
  sheet       TEXT NOT NULL,                 -- sheet/table name affected
  row_id      TEXT NOT NULL,                 -- row_id of affected row. "(new)" for fresh inserts
  field       TEXT NOT NULL,                 -- field changed. "(new row)" for INSERTs
  old_value   TEXT,                          -- NULL for INSERT
  new_value   TEXT,                          -- full JSON snapshot for INSERT; field value for UPDATE
  raw_input   TEXT,                          -- verbatim user input for bot. NULL for direct_sheet
  confirmed   BOOLEAN DEFAULT TRUE
  -- NOTE: No UPDATE or DELETE permissions on this table at DB level
);

CREATE INDEX idx_edit_log_row_id ON edit_log(row_id);
CREATE INDEX idx_edit_log_user_ts ON edit_log(user_id, timestamp);
```

---

## Row Level Security (RLS)

Enable after creating all tables. Supabase pattern.

```sql
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_log            ENABLE ROW LEVEL SECURITY;

-- Policy template for each table:
CREATE POLICY "Users can only access own data"
  ON transactions FOR ALL
  USING (user_id = auth.uid());
-- Repeat for each table
```

---

## Key Design Rules

| Rule | Detail |
|------|--------|
| Soft deletes only | `is_deleted = TRUE`. Never `DELETE FROM` on financial data |
| Kharche cols A–H frozen | New columns go RIGHT of col H only (protects Overall SUMIFS) |
| Categories: retire, never rename | `is_active = FALSE`. Historical rows keep original value |
| row_id is immutable | Generated on insert. Never changes. Used by Edit Log as stable reference |
| Append-only financial tables | transactions, cc_payments, transfers — no bulk deletes |
| edit_log is truly append-only | DB permissions: no UPDATE/DELETE granted on this table |

---

## Current Category & Account Reference

*(From live Google Sheet, March 2026)*

**Expense Categories:**
Food and Drinks · Cigarettes · Recreation · Transport · Household · Apparel · Others · Trip · Subscriptions · Education · Medical Spends · Investments · Income

**Subcategories by category:**
- Food and Drinks: Delivery, Eating Out
- Transport: Local, Metro, Auto/Cab, Petrol
- Household: House Rent, Fixed Groceries, Random Groceries, Maid Salary, Electricity, Furniture Rent
- Trip: Travelling, Food, Accommodation, Household, Drinks and Cigarettes, Recreation, Miscellaneous, Gifts
- Investments: Equity Stocks, SIP, Mutual Funds, NPS, Fixed Deposits, Brokerage, IPO locked/Limit Buy

**Accounts:**
- Cash Payment (no sub-accounts)
- UPI/Bank Accounts: Axis Bank, State Bank of India (SBI), Amazon Pay, Groww Account
- Credit Card: Axis Bank CC, ICICI, Scapia
- Investments (no sub-accounts, tracked via investment_snapshots)
- Splitwise (no sub-accounts)
