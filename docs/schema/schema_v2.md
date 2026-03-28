# Database Schema — Net Worth Calculator v2.1

**Version:** 2.1 (Deep-analysis fixes over v2.0)
**Status:** Designed, not yet deployed
**Target:** Supabase PostgreSQL (Phase 2)
**Region:** Singapore (lowest latency from India)

**Why v2.1 over v2.0:** 10 gaps found after full read of Code.gs (1,397 lines) and running 10 test cases:
- Added `application TEXT` to transactions (payment app is separate from bank account)
- Fixed `transfers.from_account_id` → nullable (Dividend/Refund/Cashback are not accounts)
- Added `from_source_type TEXT` to transfers
- Added `confirmed BOOLEAN` to edit_log (was in architecture spec, missing from schema)
- Fixed `edit_log.source` enum to match architecture (whatsapp_bot, direct_sheet, browser_voice)
- Added `net_worth_snapshots` table (Overall sheet equivalent for historical sparkline)
- Added `pending_entries` table (voice entries awaiting Y/N, 10-min TTL)
- Added buffer CHECK constraint (`< 1000`)
- Added CC paid_from type constraint guidance
- Total: 12 tables (was 10)

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

  CONSTRAINT chk_global_has_no_user CHECK (
    NOT (is_global = TRUE AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_categories_user   ON categories(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_categories_global ON categories(is_global) WHERE is_global = TRUE AND is_active = TRUE;
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;
```

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

  UNIQUE (user_id, name, parent_id)
);

CREATE INDEX idx_accounts_user   ON accounts(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_accounts_parent ON accounts(parent_id) WHERE parent_id IS NOT NULL;
```

**Account seed data (from live sheet):**
```
Cash Payment           → type=cash
UPI/Bank Accounts      → type=savings (parent)
  Axis Bank            → type=savings
  State Bank of India  → type=savings
  Amazon Pay           → type=wallet
  Groww Account        → type=wallet
Credit Card            → type=credit (parent)
  Axis Bank CC         → type=credit
  ICICI                → type=credit
  Scapia               → type=credit
Investments            → type=investment (no sub-accounts)
Splitwise              → type=other (running receivable balance)
```

### 4. app_mappings
```sql
CREATE TABLE app_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  app_name    TEXT NOT NULL,                       -- "Paytm", "GPay", "PhonePe", etc.
  account_id  UUID NOT NULL REFERENCES accounts(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, app_name)
);

CREATE INDEX idx_app_mappings_user ON app_mappings(user_id) WHERE is_active = TRUE;
```

**App mapping seed data:**
```
Paytm          → State Bank of India (SBI)
GPay           → Axis Bank
PhonePe        → State Bank of India (SBI)
Scapia app     → Scapia (Credit Card)
Swiggy         → Axis Bank CC
Groww app      → Groww Account
Amazon Pay app → Amazon Pay
Default UPI    → Axis Bank
Default CC     → Scapia
Default Cash   → Cash Payment
```

### 5. transactions
```sql
-- v2.1 fix: added `application TEXT` (was missing — Kharche col G is payment app, not bank)
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  date             DATE NOT NULL,
  particulars      TEXT,
  category_id      UUID NOT NULL REFERENCES categories(id),
  account_id       UUID NOT NULL REFERENCES accounts(id),
  application      TEXT,                          -- v2.1: Paytm, GPay, NULL for cash/direct. NOT a FK.
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  transaction_type TEXT NOT NULL DEFAULT 'expense'
                     CHECK (transaction_type IN ('expense', 'income')),
  raw_input        TEXT,
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,
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
-- Constraint: paid_from must be savings/wallet/cash. credit_card must be credit type.
-- Enforced at application layer (Code.gs only shows UPI subs in B dropdown).
-- Add RLS policy to enforce at DB layer.
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
  created_at              TIMESTAMPTZ DEFAULT now(),

  -- Cannot pay a CC with itself
  CONSTRAINT chk_different_accounts CHECK (paid_from_account_id != credit_card_account_id)
);

CREATE INDEX idx_cc_payments_user_date ON cc_payments(user_id, date DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX idx_cc_payments_card ON cc_payments(user_id, credit_card_account_id)
  WHERE is_deleted = FALSE;
```

### 7. transfers
```sql
-- v2.1 fix: from_account_id is now nullable.
-- When from_source_type is set (dividend/refund/cashback/profit_booking), from_account_id = NULL.
-- CONSTRAINT ensures exactly one of from_account_id OR from_source_type is set.
CREATE TABLE transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  date             DATE NOT NULL,
  from_account_id  UUID REFERENCES accounts(id),      -- v2.1: NULL when from_source_type set
  from_source_type TEXT CHECK (from_source_type IN (
                     'dividend', 'refund', 'cashback', 'profit_booking_equity'
                   )),                                 -- v2.1: new field
  to_account_id    UUID NOT NULL REFERENCES accounts(id),
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  buffer           NUMERIC(12,2) NOT NULL DEFAULT 0.00
                     CHECK (buffer >= 0 AND buffer < 1000),  -- v2.1: added upper bound
  transfer_type    TEXT NOT NULL DEFAULT 'transfer'
                     CHECK (transfer_type IN (
                       'transfer', 'dividend', 'refund', 'cashback', 'profit_booking'
                     )),
  raw_input        TEXT,
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),

  -- Must have either from_account_id OR from_source_type, never both or neither
  CONSTRAINT chk_from_source CHECK (
    (from_account_id IS NOT NULL AND from_source_type IS NULL)
    OR
    (from_account_id IS NULL AND from_source_type IS NOT NULL)
  ),
  -- Cannot transfer to same account
  CONSTRAINT chk_different_accounts CHECK (
    from_account_id IS NULL OR from_account_id != to_account_id
  )
);

CREATE INDEX idx_transfers_user_date ON transfers(user_id, date DESC)
  WHERE is_deleted = FALSE;
```

### 8. investment_snapshots
```sql
CREATE TABLE investment_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  snapshot_date   DATE NOT NULL,
  category_id     UUID NOT NULL REFERENCES categories(id),
  initial_amount  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  new_amount      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total           NUMERIC(12,2) GENERATED ALWAYS AS (initial_amount + new_amount) STORED,
  target_amount   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, snapshot_date, category_id)
);

CREATE INDEX idx_investments_user_date ON investment_snapshots(user_id, snapshot_date DESC);
```

### 9. net_worth_snapshots (NEW in v2.1)
```sql
-- v2.1: New table. Equivalent of Overall sheet in Google Sheets.
-- Captures monthly point-in-time balance per account for sparkline/trend charts.
-- Populated by a scheduled job or on-demand when user views dashboard.
CREATE TABLE net_worth_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  snapshot_date   DATE NOT NULL,                  -- first of month
  account_name    TEXT NOT NULL,                  -- denormalised: stored as text for historical accuracy
  balance         NUMERIC(12,2),
  total_net_worth NUMERIC(12,2),                  -- sum of all account balances this month
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nw_snapshots_user_date ON net_worth_snapshots(user_id, snapshot_date DESC);
```

### 10. pending_entries (NEW in v2.1)
```sql
-- v2.1: New table. Replaces in-memory sessionStore for voice entries awaiting confirmation.
-- Survives server restarts. Auto-expired after 10 minutes.
CREATE TABLE pending_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp', 'browser_voice')),
  raw_input   TEXT,
  parsed_json JSONB NOT NULL,                     -- LLM output awaiting user Y/N
  entry_type  TEXT NOT NULL CHECK (entry_type IN ('transaction', 'cc_payment', 'transfer')),
  expires_at  TIMESTAMPTZ NOT NULL,               -- created_at + interval '10 minutes'
  is_expired  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pending_user ON pending_entries(user_id, is_expired)
  WHERE is_expired = FALSE;
```

### 11. budgets
```sql
-- Phase 5+ feature. Table created now to avoid future migration.
CREATE TABLE budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  category_id  UUID NOT NULL REFERENCES categories(id),
  month        DATE NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at   TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, category_id, month)
);

CREATE INDEX idx_budgets_user_month ON budgets(user_id, month DESC);
```

### 12. edit_log
```sql
-- v2.1 fixes: added `confirmed` column + fixed `source` enum to match architecture
-- APPEND ONLY. No UPDATE or DELETE permissions granted at DB level.
CREATE TABLE edit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  timestamp     TIMESTAMPTZ DEFAULT now(),
  source        TEXT NOT NULL CHECK (source IN (
                  'whatsapp_bot', 'browser_voice', 'direct_sheet', 'api', 'migration'
                )),
  action        TEXT NOT NULL CHECK (action IN (
                  'INSERT', 'UPDATE', 'SOFT_DELETE', 'UPSERT'
                )),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  field_changed TEXT,                             -- NULL for INSERT (full row in new_value)
  old_value     TEXT,                             -- NULL for INSERT
  new_value     TEXT,                             -- full JSON for INSERT; field value for UPDATE
  raw_input     TEXT,
  confirmed     BOOLEAN DEFAULT TRUE              -- v2.1: was missing. TRUE=user confirmed, FALSE=system write
);

CREATE INDEX idx_edit_log_record  ON edit_log(record_id);
CREATE INDEX idx_edit_log_user_ts ON edit_log(user_id, timestamp DESC);
```

---

## Row Level Security (RLS)

```sql
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_mappings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_log             ENABLE ROW LEVEL SECURITY;

-- Standard policy: users see only own data
CREATE POLICY "Own data only" ON transactions    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON cc_payments     FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON transfers       FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON investment_snapshots FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON net_worth_snapshots FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON pending_entries FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON budgets         FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON edit_log        FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON app_mappings    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own data only" ON accounts        FOR ALL USING (user_id = auth.uid());

-- Categories: users see global base + their own
CREATE POLICY "Global base + own categories" ON categories FOR SELECT
  USING (is_global = TRUE OR user_id = auth.uid());
CREATE POLICY "Own categories write" ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_global = FALSE);
```

---

## Key Design Rules

| Rule | Detail |
|------|--------|
| Soft deletes only | `is_deleted = TRUE`. Never `DELETE FROM` financial tables |
| Amounts always positive | Sign comes from `transaction_type` (expense/income), not the number |
| Categories: retire, never rename | `is_active = FALSE`. Historical rows keep original `category_id` |
| Global base + per-user | `is_global=TRUE` + `user_id=NULL` for global; `user_id` set for personal |
| Max 1 level hierarchy | `parent_id` once only. No grandparent categories. Enforced at app layer. |
| Append-only edit_log | No UPDATE/DELETE granted at DB level |
| Application ≠ account | `transactions.application` stores raw app name text. Account resolved via app_mappings. |
| from_source_type XOR from_account_id | `chk_from_source` constraint enforces exactly one is set |
| snapshot_date = first of month | Enforced at application layer |
| Pending entries expire in 10 min | `expires_at = created_at + interval '10 minutes'` |

---

## Dashboard Query Examples

**Net worth (sum of account balances via latest snapshot):**
```sql
SELECT total_net_worth
FROM net_worth_snapshots
WHERE user_id = $1
ORDER BY snapshot_date DESC
LIMIT 1;
```

**CC outstanding per card:**
```sql
SELECT
  a.name as card_name,
  COALESCE(SUM(t.amount), 0) - COALESCE(SUM(p.amount), 0) as outstanding
FROM accounts a
LEFT JOIN transactions t
  ON t.account_id = a.id AND t.is_deleted = FALSE AND t.transaction_type = 'expense'
LEFT JOIN cc_payments p
  ON p.credit_card_account_id = a.id AND p.is_deleted = FALSE
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

**Month-over-month net worth trend (last 6 months):**
```sql
SELECT snapshot_date, total_net_worth
FROM net_worth_snapshots
WHERE user_id = $1
ORDER BY snapshot_date DESC
LIMIT 6;
```

**Monthly income vs expense:**
```sql
SELECT
  date_trunc('month', date) as month,
  SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense
FROM transactions
WHERE user_id = $1 AND is_deleted = FALSE
GROUP BY 1
ORDER BY 1 DESC
LIMIT 12;
```

---

*Net Worth Calculator Schema v2.1 · March 2026*
*Updated after deep analysis of Code.gs (v5.0.0, 1,397 lines) + 10 test cases run against schema*
*Run this DDL in Supabase SQL editor during Phase 2.*
