# Database Schema — Net Worth Calculator v2.0

**Version:** 2.0 (Normalised — supersedes schema_v1.md EAV approach)
**Status:** Designed, not yet deployed
**Target:** Supabase PostgreSQL (Phase 2)
**Region:** Singapore (lowest latency from India)

**Why v2 over v1:**
- v1 used an EAV `user_items` table for categories + accounts → hard to query, no FK constraints
- v2 uses dedicated `categories` and `accounts` tables with proper FK constraints, UUID PKs, self-referencing `parent_id`, and an `is_global` flag for the shared global base

---

## Tables

### 1. users
```sql
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number  TEXT UNIQUE,                  -- +919876543210 (NULL if web-only user)
  display_name     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

### 2. categories
```sql
CREATE TABLE categories (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES users(id),   -- NULL = global base
  parent_id                 UUID REFERENCES categories(id), -- NULL = top-level
  name                      TEXT NOT NULL,
  icon                      TEXT,                        -- emoji e.g. "🍔"
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  is_global                 BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = visible to all users
  is_auto_created           BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = AI created it
  ai_confidence             NUMERIC(4,2),                -- e.g. 0.73. NULL if manually created
  promotion_candidate_count INTEGER NOT NULL DEFAULT 0,  -- distinct users with this name
  promotion_flagged         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT now(),

  -- Global categories have no user_id; personal categories must have one
  CONSTRAINT chk_global_has_no_user CHECK (
    NOT (is_global = TRUE AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_categories_user ON categories(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_categories_global ON categories(is_global) WHERE is_global = TRUE AND is_active = TRUE;
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
```

**Global base seed (from live sheet):**
- Food and Drinks (parent) → Delivery, Eating Out
- Cigarettes
- Recreation
- Transport (parent) → Local, Metro, Auto/Cab, Petrol
- Household (parent) → House Rent, Fixed Groceries, Random Groceries, Maid Salary, Electricity, Furniture Rent
- Apparel
- Others
- Trip (parent) → Travelling, Food, Accommodation, Household, Drinks and Cigarettes, Recreation, Miscellaneous, Gifts
- Subscriptions
- Education
- Medical Spends
- Investments (parent) → Equity Stocks, SIP, Mutual Funds, NPS, Fixed Deposits, Brokerage, IPO locked/Limit Buy
- Income

### 3. accounts
```sql
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  parent_id   UUID REFERENCES accounts(id),       -- NULL = top-level account group
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'cash', 'savings', 'credit', 'investment', 'wallet', 'other'
              )),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, name, parent_id)               -- no duplicate account names at same level
);

CREATE INDEX idx_accounts_user ON accounts(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_accounts_parent ON accounts(parent_id) WHERE parent_id IS NOT NULL;
```

**Seed data for initial user (from live sheet):**
- Cash Payment (cash)
- UPI/Bank Accounts (savings, parent)
  - Axis Bank
  - State Bank of India (SBI)
  - Amazon Pay
  - Groww Account
- Credit Card (credit, parent)
  - Axis Bank CC
  - ICICI
  - Scapia
- Investments (investment — tracked via investment_snapshots)
- Splitwise (other)

### 4. app_mappings
```sql
CREATE TABLE app_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  app_name    TEXT NOT NULL,                       -- "Paytm", "GPay", "PhonePe", etc.
  account_id  UUID NOT NULL REFERENCES accounts(id), -- which bank this app draws from
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, app_name)
);

CREATE INDEX idx_app_mappings_user ON app_mappings(user_id) WHERE is_active = TRUE;
```

**Seed data:** Paytm → SBI, GPay → Axis Bank (user configures in Settings)

### 5. transactions
```sql
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  date             DATE NOT NULL,
  particulars      TEXT,                           -- free-text description
  category_id      UUID NOT NULL REFERENCES categories(id),
  account_id       UUID NOT NULL REFERENCES accounts(id),
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  transaction_type TEXT NOT NULL DEFAULT 'expense'
                     CHECK (transaction_type IN ('expense', 'income')),
  raw_input        TEXT,                           -- verbatim voice transcript. NULL for manual
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,                    -- NULL = never edited
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_account ON transactions(user_id, account_id)
  WHERE is_deleted = FALSE;
```

### 6. cc_payments
```sql
CREATE TABLE cc_payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id),
  date                    DATE NOT NULL,
  paid_from_account_id    UUID NOT NULL REFERENCES accounts(id),
  credit_card_account_id  UUID NOT NULL REFERENCES accounts(id),
  amount                  NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  raw_input               TEXT,
  is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cc_payments_user_date ON cc_payments(user_id, date DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_cc_payments_card ON cc_payments(user_id, credit_card_account_id)
  WHERE is_deleted = FALSE;
```

### 7. transfers
```sql
CREATE TABLE transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  date            DATE NOT NULL,
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id   UUID NOT NULL REFERENCES accounts(id),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  buffer          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  transfer_type   TEXT NOT NULL DEFAULT 'transfer'
                    CHECK (transfer_type IN (
                      'transfer', 'dividend', 'refund', 'cashback', 'profit_booking'
                    )),
  raw_input       TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_different_accounts CHECK (from_account_id != to_account_id)
);

CREATE INDEX idx_transfers_user_date ON transfers(user_id, date DESC)
  WHERE is_deleted = FALSE;
```

### 8. investment_snapshots
```sql
CREATE TABLE investment_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  snapshot_date   DATE NOT NULL,                  -- always first of month
  category_id     UUID NOT NULL REFERENCES categories(id),
  initial_amount  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  new_amount      NUMERIC(12,2) NOT NULL DEFAULT 0.00,  -- new money added this month
  total           NUMERIC(12,2) GENERATED ALWAYS AS (initial_amount + new_amount) STORED,
  target_amount   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, snapshot_date, category_id)    -- one snapshot per fund per month
);

CREATE INDEX idx_investments_user_date ON investment_snapshots(user_id, snapshot_date DESC);
```

### 9. budgets
```sql
-- Phase 3+ feature. Table created now to avoid future migration.
CREATE TABLE budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  category_id  UUID NOT NULL REFERENCES categories(id),
  month        DATE NOT NULL,                     -- always first of month (2026-04-01)
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at   TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, category_id, month)            -- one budget per category per month
);

CREATE INDEX idx_budgets_user_month ON budgets(user_id, month DESC);
```

### 10. edit_log
```sql
-- Append-only. No UPDATE or DELETE permissions granted on this table.
CREATE TABLE edit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  timestamp     TIMESTAMPTZ DEFAULT now(),
  source        TEXT NOT NULL CHECK (source IN ('voice', 'manual', 'api', 'migration')),
  action        TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'SOFT_DELETE')),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,                    -- UUID of the affected row
  field_changed TEXT,                             -- NULL for INSERT (full row captured)
  old_value     TEXT,                             -- NULL for INSERT
  new_value     TEXT,                             -- full JSON snapshot for INSERT; field value for UPDATE
  raw_input     TEXT                              -- verbatim user input for voice. NULL for manual
);

CREATE INDEX idx_edit_log_record ON edit_log(record_id);
CREATE INDEX idx_edit_log_user_ts ON edit_log(user_id, timestamp DESC);
```

---

## Row Level Security (RLS)

Enable after creating all tables. Users can only read/write their own data.

```sql
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_mappings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_log            ENABLE ROW LEVEL SECURITY;

-- Template: repeat for each table with user_id
CREATE POLICY "Own data only"
  ON transactions FOR ALL
  USING (user_id = auth.uid());

-- Categories: users see global base + their own
CREATE POLICY "Global base + own categories"
  ON categories FOR SELECT
  USING (is_global = TRUE OR user_id = auth.uid());

CREATE POLICY "Own categories only for write"
  ON categories FOR INSERT WITH CHECK (user_id = auth.uid() AND is_global = FALSE);
```

---

## Key Design Rules

| Rule | Detail |
|------|--------|
| Soft deletes only | `is_deleted = TRUE`. Never `DELETE FROM` financial tables |
| Categories: retire, never rename | `is_active = FALSE`. Historical rows keep original `category_id` |
| Global base + per-user | `is_global = TRUE` + `user_id = NULL` for global; `user_id` set for personal |
| Max 1 level hierarchy | `parent_id` allowed once. No grandparent categories or sub-sub-accounts |
| Append-only edit_log | No UPDATE/DELETE granted at DB level |
| UUID PKs everywhere | Supabase native. No sequential integers exposed in URLs |
| Amounts always positive | Sign is carried by `transaction_type` (expense/income), not the number |
| snapshot_date = first of month | Enforced at application layer. Simplifies monthly queries |

---

## Dashboard Query Examples

**Net worth (sum of all account balances):**
```sql
SELECT
  SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE -t.amount END) as net_worth
FROM transactions t
WHERE t.user_id = $1 AND t.is_deleted = FALSE;
```

**CC outstanding per card:**
```sql
SELECT
  a.name as card_name,
  COALESCE(SUM(t.amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.is_deleted = FALSE
LEFT JOIN cc_payments p ON p.credit_card_account_id = a.id AND p.is_deleted = FALSE
WHERE a.user_id = $1 AND a.type = 'credit'
GROUP BY a.id, a.name;
```

**Top spending categories this month:**
```sql
SELECT c.name, c.icon, SUM(t.amount) as total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = $1
  AND t.transaction_type = 'expense'
  AND t.is_deleted = FALSE
  AND date_trunc('month', t.date) = date_trunc('month', CURRENT_DATE)
GROUP BY c.id, c.name, c.icon
ORDER BY total DESC
LIMIT 5;
```

---

*Net Worth Calculator Schema v2.0 · March 2026*
*Update this document before running the Supabase DDL in Phase 2.*
