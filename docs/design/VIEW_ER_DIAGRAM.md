# How to View Your ER Diagram Visually

**3 ways to see it — pick the one that takes 30 seconds.**

---

## ✅ Option 1 — dbdiagram.io (Fastest, Best, Recommended)

**Time:** 30 seconds. No login needed. Renders instantly.

1. Go to **https://dbdiagram.io/d**
2. Delete all the default code on the left panel
3. Copy the entire DBML block below and paste it in
4. Your diagram renders live on the right
5. **Export → PNG** to download · **Share → Copy link** to share

That's it. Looks exactly like a professional database diagram with color-coded FK arrows.

---

## ✅ Option 2 — Eraser.io (Best for teams + documentation)

**Time:** 2 minutes. Free account needed.

1. Go to **https://app.eraser.io**
2. New diagram → Entity Relationship Diagram
3. Switch to "Code" mode (top right toggle)
4. Paste the DBML block below
5. Beautiful styled diagram with diagram-as-code sync

Eraser also lets you add notes, swimlanes, and export to Confluence/Notion.

---

## ✅ Option 3 — Gemini (Best for AI review + visual together)

**Time:** 2 minutes. Paste prompt into gemini.google.com/app

Copy the prompt at the bottom of this file → paste into Gemini → it draws an ASCII ER diagram AND reviews your schema design.

---

## ✅ Option 4 — GitHub (Already working, zero effort)

The ER diagram file already has a Mermaid diagram that **renders automatically on GitHub**:

Open: **https://github.com/golaitadarsh/Net-Worth-Calculator/blob/main/docs/design/er_diagram.md**

GitHub renders Mermaid code blocks as interactive diagrams. Click any entity to highlight relationships.

---

## DBML — Paste This Into dbdiagram.io or Eraser.io

```dbml
// Net Worth Calculator — Database Schema v2.1
// Voice-first personal finance app for Indian users
// 12 tables · Supabase PostgreSQL · Free tier

Table users {
  id uuid [pk]
  whatsapp_number text [unique, note: 'NULL if web-only']
  display_name text
  created_at timestamptz
}

Table categories {
  id uuid [pk]
  user_id uuid [ref: > users.id, note: 'NULL = global base']
  parent_id uuid [ref: > categories.id, note: 'subcategory link']
  name text [not null]
  icon text [note: '🍔 emoji']
  is_active boolean [default: true]
  is_global boolean [default: false, note: 'shared across all users']
  is_auto_created boolean [default: false, note: 'AI created']
  ai_confidence numeric
  promotion_candidate_count integer [default: 0]
  promotion_flagged boolean [default: false]
  created_at timestamptz
}

Table accounts {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  parent_id uuid [ref: > accounts.id, note: 'sub-account link']
  name text [not null, note: 'Axis Bank, SBI, Scapia, Splitwise']
  type text [note: 'cash|savings|credit|investment|wallet|other']
  is_active boolean [default: true]
  created_at timestamptz
}

Table app_mappings {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  app_name text [not null, note: 'Paytm, GPay, PhonePe']
  account_id uuid [not null, ref: > accounts.id, note: 'which bank this app uses']
  is_active boolean [default: true]
  created_at timestamptz
}

Table transactions {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  particulars text
  category_id uuid [not null, ref: > categories.id]
  account_id uuid [not null, ref: > accounts.id]
  application text [note: 'Paytm/GPay — raw text, not a FK']
  amount numeric [not null, note: '> 0 always']
  transaction_type text [note: 'expense | income']
  raw_input text [note: 'verbatim voice transcript']
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz
}

Table cc_payments {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  paid_from_account_id uuid [not null, ref: > accounts.id, note: 'savings/wallet only']
  credit_card_account_id uuid [not null, ref: > accounts.id, note: 'credit type only']
  amount numeric [not null]
  raw_input text
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz
}

Table transfers {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  from_account_id uuid [ref: > accounts.id, note: 'NULL for dividend/refund/cashback']
  from_source_type text [note: 'dividend|refund|cashback|profit_booking_equity']
  to_account_id uuid [not null, ref: > accounts.id]
  amount numeric [not null]
  buffer numeric [default: 0, note: 'rounding < ₹1000']
  transfer_type text [note: 'transfer|dividend|refund|cashback|profit_booking']
  raw_input text
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz
}

Table investment_snapshots {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [not null, note: 'first of month always']
  category_id uuid [not null, ref: > categories.id, note: 'Equity Stocks, SIP, MF, NPS, FD']
  initial_amount numeric [default: 0]
  new_amount numeric [default: 0, note: 'new money this month']
  total numeric [note: 'GENERATED: initial + new']
  target_amount numeric [default: 0]
  created_at timestamptz

  indexes {
    (user_id, snapshot_date, category_id) [unique]
  }
}

Table net_worth_snapshots {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [not null, note: 'first of month']
  account_name text [not null, note: 'denormalised for history']
  balance numeric
  total_net_worth numeric [note: 'all accounts sum']
  created_at timestamptz
}

Table pending_entries {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  channel text [note: 'whatsapp | browser_voice']
  raw_input text
  parsed_json jsonb [note: 'LLM output awaiting Y/N']
  entry_type text [note: 'transaction|cc_payment|transfer']
  expires_at timestamptz [note: 'now + 10 minutes']
  is_expired boolean [default: false]
  created_at timestamptz
}

Table budgets {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  category_id uuid [not null, ref: > categories.id]
  month date [not null, note: 'first of month']
  amount numeric [not null]
  created_at timestamptz

  indexes {
    (user_id, category_id, month) [unique]
  }
}

Table edit_log {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  timestamp timestamptz
  source text [note: 'whatsapp_bot|browser_voice|direct_sheet|api|migration']
  action text [note: 'INSERT|UPDATE|SOFT_DELETE|UPSERT']
  table_name text
  record_id uuid
  field_changed text
  old_value text
  new_value text
  raw_input text
  confirmed boolean [default: true]

  Note: 'APPEND ONLY — no UPDATE or DELETE ever'
}
```

---

## Gemini Prompt (Copy-Paste Ready)

Open **https://gemini.google.com/app** and paste this entire block:

```
I am building a personal finance app called "Net Worth Calculator" — a voice-first expense tracker for Indian users. I need you to help me visualize and review my database schema.

Here is my complete schema in DBML format. Please:

1. Draw a clear entity-relationship diagram showing all 12 tables, their key columns, and all relationships between them. Group tables into 4 clusters:
   - USER CORE: users, accounts, categories, app_mappings
   - TRANSACTIONS: transactions, cc_payments, transfers
   - TRACKING: investment_snapshots, net_worth_snapshots, budgets
   - SYSTEM: pending_entries, edit_log

2. List every foreign key relationship in plain English (e.g. "transactions.category_id → categories.id")

3. Point out any design issues you see

4. Tell me: is this schema ready to build a production personal finance app on?

SCHEMA:

Table users {
  id uuid [pk]
  whatsapp_number text [unique]
  display_name text
  created_at timestamptz
}

Table categories {
  id uuid [pk]
  user_id uuid [ref: > users.id, note: 'NULL = global base category shared across all users']
  parent_id uuid [ref: > categories.id, note: '1-level subcategory self-reference']
  name text [not null]
  icon text
  is_active boolean [default: true, note: 'retire = FALSE, never delete']
  is_global boolean [default: false, note: 'TRUE = visible to all users']
  is_auto_created boolean [default: false, note: 'AI created this category']
  ai_confidence numeric
  promotion_candidate_count integer [default: 0, note: 'how many users use this name']
  promotion_flagged boolean [default: false]
  created_at timestamptz
}

Table accounts {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  parent_id uuid [ref: > accounts.id, note: '1-level sub-account self-reference']
  name text [not null]
  type text [note: 'cash | savings | credit | investment | wallet | other']
  is_active boolean [default: true]
  created_at timestamptz
}

Table app_mappings {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  app_name text [not null, note: 'Paytm, GPay, PhonePe etc.']
  account_id uuid [not null, ref: > accounts.id]
  is_active boolean [default: true]
  created_at timestamptz
}

Table transactions {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  particulars text
  category_id uuid [not null, ref: > categories.id]
  account_id uuid [not null, ref: > accounts.id]
  application text [note: 'payment app name, NOT a FK']
  amount numeric [not null, note: 'always positive']
  transaction_type text [default: 'expense', note: 'expense | income']
  raw_input text [note: 'verbatim voice transcript']
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz
}

Table cc_payments {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  paid_from_account_id uuid [not null, ref: > accounts.id]
  credit_card_account_id uuid [not null, ref: > accounts.id]
  amount numeric [not null]
  raw_input text
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz
}

Table transfers {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [not null]
  from_account_id uuid [ref: > accounts.id, note: 'NULL when from_source_type set']
  from_source_type text [note: 'dividend | refund | cashback | profit_booking_equity']
  to_account_id uuid [not null, ref: > accounts.id]
  amount numeric [not null]
  buffer numeric [default: 0]
  transfer_type text [note: 'transfer | dividend | refund | cashback | profit_booking']
  raw_input text
  is_deleted boolean [default: false]
  edited_at timestamptz
  created_at timestamptz
}

Table investment_snapshots {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [not null, note: 'always first of month']
  category_id uuid [not null, ref: > categories.id]
  initial_amount numeric [default: 0]
  new_amount numeric [default: 0]
  total numeric [note: 'GENERATED: initial + new_amount']
  target_amount numeric [default: 0]
  created_at timestamptz

  indexes {
    (user_id, snapshot_date, category_id) [unique]
  }
}

Table net_worth_snapshots {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [not null]
  account_name text [not null, note: 'denormalised for history']
  balance numeric
  total_net_worth numeric
  created_at timestamptz
}

Table pending_entries {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  channel text [note: 'whatsapp | browser_voice']
  raw_input text
  parsed_json jsonb [note: 'LLM output awaiting user confirmation']
  entry_type text [note: 'transaction | cc_payment | transfer']
  expires_at timestamptz [note: 'auto-expire after 10 minutes']
  is_expired boolean [default: false]
  created_at timestamptz
}

Table budgets {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  category_id uuid [not null, ref: > categories.id]
  month date [not null]
  amount numeric [not null]
  created_at timestamptz

  indexes {
    (user_id, category_id, month) [unique]
  }
}

Table edit_log {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  timestamp timestamptz
  source text [note: 'whatsapp_bot | browser_voice | direct_sheet | api | migration']
  action text [note: 'INSERT | UPDATE | SOFT_DELETE | UPSERT']
  table_name text
  record_id uuid
  field_changed text
  old_value text
  new_value text
  raw_input text
  confirmed boolean [default: true]
}

Context:
- Indian users (UPI payments, WhatsApp, Paytm/GPay/PhonePe)
- Voice-first: speak expense → AI parses → user confirms → saved
- Zero cost: Supabase free tier + Vercel + Gemini API
- Migrating from Google Sheets (current live system, ₹10,98,208 net worth)
- No hard deletes ever — financial data permanent like a bank ledger
- Multi-user from day one (user_id on every table)
- Net worth = ALL accounts including cash (confirmed design decision)
- Brokerage = expense (not investment capital)
```

---

*VIEW_ER_DIAGRAM.md · Net Worth Calculator · March 2026*
*3 ways to see your schema visually — dbdiagram.io takes 30 seconds*
