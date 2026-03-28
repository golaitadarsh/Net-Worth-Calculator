# Gemini Prompt — Visual ER Diagram

**Purpose:** Give this file + the prompt below to Gemini 1.5 Pro to generate a visual ER diagram, review the schema design, and export it to a shareable format.

**Tools Gemini can use:**
- Google AI Studio (gemini.google.com/app) — paste the prompt directly
- Or: Google Colab + graphviz Python library for a rendered PNG

---

## Prompt to Paste into Gemini

```
You are a senior database architect. I am building a personal finance app called "Net Worth Calculator" — a voice-first expense tracker for Indian users.

Below is my complete database schema in DBML format (dbdiagram.io notation). Please:

1. **Render a visual ER diagram** — draw all 12 tables, their columns (with types), and every relationship. Use clear box notation with PK/FK labels. Group related tables visually (User core, Transaction tables, Reference/Lookup tables, Utility tables).

2. **Validate the design** — check for:
   - Missing foreign keys
   - Nullable FK fields that may cause data integrity issues
   - Constraint gaps (amounts that should be positive, etc.)
   - Any circular references
   - Tables that could be merged without loss
   - Any normal form violations (1NF, 2NF, 3NF)

3. **Highlight the 3 most important design decisions** you observe and whether they're correctly implemented.

4. **Give me one thing to change** — the single most important improvement you'd make.

Here is the schema:

---

// Net Worth Calculator — Database Schema v2.1
// 12 tables. All free-tier Supabase PostgreSQL.

Table users {
  id uuid [pk, default: `gen_random_uuid()`]
  whatsapp_number text [unique, note: 'NULL if web-only user']
  display_name text
  created_at timestamptz [default: `now()`]
}

Table categories {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [ref: > users.id, note: 'NULL = global base category shared across all users']
  parent_id uuid [ref: > categories.id, note: 'NULL = top-level category. Self-referencing for subcategories (1 level only)']
  name text [not null]
  icon text [note: 'emoji for UI e.g. 🍔']
  is_active boolean [default: true, note: 'FALSE = retired. Categories are NEVER renamed, only retired']
  is_global boolean [default: false, note: 'TRUE = visible to all users (global base)']
  is_auto_created boolean [default: false, note: 'TRUE = created by AI parser, not user']
  ai_confidence numeric(4,2) [note: '0.0–1.0 confidence when AI created it. NULL if manually created']
  promotion_candidate_count integer [default: 0, note: 'distinct users using this category name']
  promotion_flagged boolean [default: false, note: 'agent flagged: this user category should become global']
  created_at timestamptz [default: `now()`]
}

Table accounts {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  parent_id uuid [ref: > accounts.id, note: 'NULL = top-level account group e.g. UPI/Bank Accounts']
  name text [not null, note: 'Axis Bank, SBI, Scapia, Splitwise, Cash Payment']
  type text [not null, note: 'cash | savings | credit | investment | wallet | other']
  is_active boolean [default: true]
  created_at timestamptz [default: `now()`]
}

Table app_mappings {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  app_name text [not null, note: 'Paytm, GPay, PhonePe, Swiggy, Amazon Pay app — raw text as spoken by user']
  account_id uuid [not null, ref: > accounts.id, note: 'which bank/CC this payment app draws from']
  is_active boolean [default: true]
  created_at timestamptz [default: `now()`]
}

Table transactions {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  date date [not null, note: 'when expense occurred. NOT when logged. User can backdate.']
  particulars text [note: 'free-text description e.g. Medicines from Apollo']
  category_id uuid [not null, ref: > categories.id]
  account_id uuid [not null, ref: > accounts.id, note: 'can be parent or sub-account']
  application text [note: 'payment app used: Paytm, GPay, NULL for cash/direct. NOT a FK — stored raw']
  amount numeric(12,2) [not null, note: 'CHECK amount > 0. Always positive.']
  transaction_type text [default: 'expense', note: 'expense | income']
  raw_input text [note: 'verbatim voice transcript. NULL for manual entries']
  is_deleted boolean [default: false, note: 'soft delete only. NEVER hard delete financial rows']
  edited_at timestamptz [note: 'NULL = never edited. Set on first edit, immutable after']
  created_at timestamptz [default: `now()`]
}

Table cc_payments {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  paid_from_account_id uuid [not null, ref: > accounts.id, note: 'ONLY accounts with type=savings|wallet|cash. Never credit.']
  credit_card_account_id uuid [not null, ref: > accounts.id, note: 'ONLY accounts with type=credit']
  amount numeric(12,2) [not null, note: 'CHECK amount > 0']
  raw_input text
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz [default: `now()`]
}

Table transfers {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  from_account_id uuid [ref: > accounts.id, note: 'NULL when from_source_type is set (for Dividend, Refund, Cashback)']
  from_source_type text [note: 'NULL | dividend | refund | cashback | profit_booking_equity']
  to_account_id uuid [not null, ref: > accounts.id]
  amount numeric(12,2) [not null, note: 'CHECK amount > 0']
  buffer numeric(12,2) [default: 0.00, note: 'reconciliation rounding. CHECK buffer < 1000']
  transfer_type text [default: 'transfer', note: 'transfer | dividend | refund | cashback | profit_booking']
  raw_input text
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz [default: `now()`]
}

Table investment_snapshots {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [not null, note: 'ALWAYS first of month (2026-03-01). One row per fund per month.']
  category_id uuid [not null, ref: > categories.id, note: 'Equity Stocks, SIP, Mutual Funds, NPS, FD, Brokerage, IPO']
  initial_amount numeric(12,2) [default: 0.00, note: 'portfolio value at month start']
  new_amount numeric(12,2) [default: 0.00, note: 'new money added this month']
  total numeric(12,2) [note: 'GENERATED ALWAYS AS (initial_amount + new_amount) STORED']
  target_amount numeric(12,2) [default: 0.00, note: 'user-set investment goal']
  created_at timestamptz [default: `now()`]

  indexes {
    (user_id, snapshot_date, category_id) [unique, name: 'one_snapshot_per_fund_per_month']
  }
}

Table net_worth_snapshots {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [not null, note: 'first of month. Monthly point-in-time balance capture.']
  account_name text [not null, note: 'denormalised — stored as text so history is accurate even if account renamed']
  balance numeric(12,2) [note: 'computed balance for this account at this month']
  total_net_worth numeric(12,2) [note: 'sum of all account balances for this user this month']
  created_at timestamptz [default: `now()`]
}

Table pending_entries {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  channel text [not null, note: 'whatsapp | browser_voice']
  raw_input text [note: 'verbatim transcript from voice input']
  parsed_json jsonb [not null, note: 'LLM-parsed entry awaiting user Y/N confirmation']
  entry_type text [not null, note: 'transaction | cc_payment | transfer']
  expires_at timestamptz [not null, note: 'created_at + 10 minutes. Entry auto-discarded after.']
  is_expired boolean [default: false]
  created_at timestamptz [default: `now()`]
}

Table budgets {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  category_id uuid [not null, ref: > categories.id]
  month date [not null, note: 'first of month e.g. 2026-04-01']
  amount numeric(12,2) [not null, note: 'CHECK amount > 0. Monthly budget for this category.']
  created_at timestamptz [default: `now()`]

  indexes {
    (user_id, category_id, month) [unique, name: 'one_budget_per_category_per_month']
  }
}

Table edit_log {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  timestamp timestamptz [default: `now()`]
  source text [not null, note: 'whatsapp_bot | browser_voice | direct_sheet | api | migration']
  action text [not null, note: 'INSERT | UPDATE | SOFT_DELETE | UPSERT']
  table_name text [not null, note: 'which table was affected']
  record_id uuid [not null, note: 'UUID of the affected row in that table']
  field_changed text [note: 'NULL for INSERT (full row in new_value). Field name for UPDATE.']
  old_value text [note: 'NULL for INSERT']
  new_value text [note: 'full JSON snapshot for INSERT. Changed field value for UPDATE.']
  raw_input text [note: 'verbatim voice transcript if voice-sourced. NULL for manual.']
  confirmed boolean [default: true, note: 'TRUE = user confirmed. FALSE = system auto-write.']

  Note: 'APPEND ONLY. No UPDATE or DELETE permissions at DB level. This is the permanent audit trail.'
}

---

**Context about this app:**
- Personal finance tracker for Indian users (₹, UPI payments, WhatsApp-native)
- Voice-first: user speaks expense → AI parses → user confirms → saved
- Zero cost: all free tiers (Supabase, Vercel, Gemini API, WhatsApp Cloud API)
- Currently lives in Google Sheets → migrating to Supabase PostgreSQL
- Current net worth: ₹10,98,208 across 7 accounts (Cash, Axis Bank, SBI, Amazon Pay, Groww, Splitwise, Investments)
- Key constraint: no hard deletes ever. Financial data is permanent (like a bank ledger).
- Multi-user from day one: user_id on every table.

Please give me:
1. A clear visual ER diagram (ASCII or structured table format if you cannot render graphics)
2. Your validation findings
3. Top 3 design decisions you observe
4. Your single most important suggested change
```

---

## What Gemini Will Give You

Gemini will output:
- An ASCII ER diagram or a clear table-format entity relationship description
- Validation issues (if any) with specific table/column references
- Architecture commentary

**Then in Google Colab, you can render it as a proper visual:**

```python
# Paste into Google Colab to render a PNG
!pip install graphviz

from graphviz import Digraph

dot = Digraph('Net Worth Calculator', format='png')
dot.attr(rankdir='LR', size='20,14')

# Define nodes (tables)
tables = {
    'users': ['id PK', 'whatsapp_number UK', 'display_name', 'created_at'],
    'categories': ['id PK', 'user_id FK', 'parent_id FK', 'name', 'is_global', 'is_active', 'is_auto_created'],
    'accounts': ['id PK', 'user_id FK', 'parent_id FK', 'name', 'type', 'is_active'],
    'app_mappings': ['id PK', 'user_id FK', 'app_name', 'account_id FK'],
    'transactions': ['id PK', 'user_id FK', 'date', 'category_id FK', 'account_id FK', 'application', 'amount', 'transaction_type'],
    'cc_payments': ['id PK', 'user_id FK', 'date', 'paid_from_account_id FK', 'credit_card_account_id FK', 'amount'],
    'transfers': ['id PK', 'user_id FK', 'date', 'from_account_id FK', 'from_source_type', 'to_account_id FK', 'amount'],
    'investment_snapshots': ['id PK', 'user_id FK', 'snapshot_date', 'category_id FK', 'initial_amount', 'new_amount', 'total GENERATED'],
    'net_worth_snapshots': ['id PK', 'user_id FK', 'snapshot_date', 'account_name', 'balance', 'total_net_worth'],
    'pending_entries': ['id PK', 'user_id FK', 'channel', 'parsed_json JSONB', 'entry_type', 'expires_at'],
    'budgets': ['id PK', 'user_id FK', 'category_id FK', 'month', 'amount'],
    'edit_log': ['id PK', 'user_id FK', 'source', 'action', 'table_name', 'record_id', 'field_changed', 'old_value', 'new_value', 'confirmed'],
}

for table, cols in tables.items():
    label = '{{' + table + '|' + '|'.join(cols) + '}}'
    dot.node(table, label=label, shape='record', style='filled', fillcolor='lightblue')

# Define relationships
edges = [
    ('categories', 'users'), ('categories', 'categories'),
    ('accounts', 'users'), ('accounts', 'accounts'),
    ('app_mappings', 'users'), ('app_mappings', 'accounts'),
    ('transactions', 'users'), ('transactions', 'categories'), ('transactions', 'accounts'),
    ('cc_payments', 'users'), ('cc_payments', 'accounts'),
    ('transfers', 'users'), ('transfers', 'accounts'),
    ('investment_snapshots', 'users'), ('investment_snapshots', 'categories'),
    ('net_worth_snapshots', 'users'),
    ('pending_entries', 'users'),
    ('budgets', 'users'), ('budgets', 'categories'),
    ('edit_log', 'users'),
]

for src, dst in edges:
    dot.edge(src, dst)

dot.render('net_worth_er', cleanup=True)
print('Saved: net_worth_er.png')
from IPython.display import Image
Image('net_worth_er.png')
```

---

## Quick dbdiagram.io Instructions

1. Go to **https://dbdiagram.io/d**
2. Clear the default code on the left panel
3. Paste the DBML block from `er_diagram.md` (the big code block under "DBML — Paste Into dbdiagram.io")
4. Diagram renders instantly on the right
5. Click **Export → PNG** or **Export → PDF** to download
6. Click **Share → Get link** for a shareable URL

The diagram will auto-layout all 12 tables with proper FK arrows.

---

*Gemini ER Prompt · Net Worth Calculator · March 2026*
