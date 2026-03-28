# Gemini Prompt — Visual ER Diagram for Net Worth Calculator

**Purpose:** Paste the prompt below into Gemini to get a visual explanation of the database design.
**Updated:** v2.2 (March 2026) — includes opening_balance, income_entries, cash in net worth, brokerage as expense

---

## Step 1: Quickest Visual — dbdiagram.io (No AI needed, 30 seconds)

1. Open **https://dbdiagram.io/d**
2. Delete all existing text on the left panel
3. Copy the DBML block from `docs/design/er_diagram.md` (bottom section "DBML — Paste Into dbdiagram.io")
4. Paste it → diagram appears instantly on the right
5. Click **"Share"** to get a shareable link

**For Eraser.io:**
1. Open **https://app.eraser.io** → New file → Entity Relationship Diagram
2. Paste the same DBML block

---

## Step 2: Gemini Full Analysis Prompt

Copy everything below the dashes and paste into **gemini.google.com** (use Gemini 2.0 Flash or 1.5 Pro):

---

I'm building a personal finance web app called **"Net Worth Calculator"** — a voice-first expense tracker for Indian users that shows a live net worth dashboard. The tech stack is: Supabase (PostgreSQL), Next.js, Tailwind, Vercel (all free tier). Users speak their expenses → AI parses → user confirms → saved.

I want you to:
1. Draw a visual ER diagram (use ASCII boxes or table format — whatever renders clearly)
2. Group tables into clusters: **Core Ledger** / **Reference Data** / **Voice/AI Pipeline** / **Analytics**
3. Explain each table in 1 plain sentence
4. Point out any design flaws you see

Here is the full database schema (13 tables, DBML format):

```
Table users {
  id uuid [pk]
  whatsapp_number text [unique, note: 'NULL = web-only user']
  display_name text
  created_at timestamptz
}

Table categories {
  id uuid [pk]
  user_id uuid [ref: > users.id, note: 'NULL = global base (visible to all)']
  parent_id uuid [ref: > categories.id, note: 'NULL = top-level; set = subcategory']
  name text [not null]
  icon text [note: 'emoji: 🍔 🚌 🏠']
  is_active boolean [note: 'FALSE = retired. Never rename.']
  is_global boolean [note: 'TRUE = curated base visible to all users']
  is_auto_created boolean [note: 'TRUE = AI created from voice input']
  ai_confidence numeric [note: '0.0-1.0']
  promotion_candidate_count integer [note: 'how many users use this name']
  promotion_flagged boolean [note: 'flagged for promotion to global base']
  created_at timestamptz
}

Table accounts {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  parent_id uuid [ref: > accounts.id, note: 'UPI/Bank Accounts → Axis Bank']
  name text [not null, note: 'Axis Bank, SBI, Cash Payment, Scapia, Splitwise']
  type text [note: 'cash | savings | credit | investment | wallet | other']
  opening_balance numeric [note: 'Starting balance seeded from Google Sheet. Critical.']
  opening_balance_date date
  include_in_net_worth boolean [default: true, note: 'Cash IS included in net worth']
  is_active boolean
  created_at timestamptz
}

Table app_mappings {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  app_name text [note: 'Paytm, GPay, PhonePe, Swiggy, Amazon Pay']
  account_id uuid [not null, ref: > accounts.id, note: 'Paytm → SBI Bank']
  is_active boolean
  created_at timestamptz
}

Table income_entries {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date
  type text [note: 'salary | freelance | interest | other']
  particulars text [note: 'February 2026 Salary']
  account_id uuid [not null, ref: > accounts.id, note: 'which bank received it']
  amount numeric [note: 'always positive']
  raw_input text
  is_deleted boolean
  created_at timestamptz
}

Table transactions {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date [note: 'when expense occurred']
  particulars text [note: 'Medicines, Uber, Electricity Bill']
  category_id uuid [not null, ref: > categories.id]
  account_id uuid [not null, ref: > accounts.id]
  application text [note: 'Paytm / GPay UPI app used. Plain text, not a FK.']
  amount numeric [note: 'always positive']
  transaction_type text [note: 'expense | income']
  raw_input text [note: 'verbatim voice transcript']
  is_deleted boolean [note: 'NEVER hard delete. Soft delete only.']
  edited_at timestamptz
  created_at timestamptz
}

Table cc_payments {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date
  paid_from_account_id uuid [not null, ref: > accounts.id, note: 'Bank/wallet that paid. NOT a credit card.']
  credit_card_account_id uuid [not null, ref: > accounts.id, note: 'The CC being paid off.']
  amount numeric
  raw_input text
  is_deleted boolean
  edited_at timestamptz
  created_at timestamptz
}

Table transfers {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  date date
  from_account_id uuid [ref: > accounts.id, note: 'NULL when money comes from outside (dividend, refund)']
  from_source_type text [note: 'dividend | refund | cashback | profit_booking_equity']
  to_account_id uuid [not null, ref: > accounts.id]
  amount numeric
  buffer numeric [note: 'rounding reconciliation. Usually 0.']
  transfer_type text [note: 'transfer | dividend | refund | cashback | profit_booking']
  raw_input text
  is_deleted boolean
  edited_at timestamptz
  created_at timestamptz
}

Table investment_snapshots {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [note: 'always 1st of month']
  category_id uuid [not null, ref: > categories.id, note: 'Equity Stocks, SIP, MF, NPS, FD, IPO. NOT Brokerage.']
  initial_amount numeric [note: 'portfolio value at start of month']
  new_amount numeric [note: 'new money added this month']
  total numeric [note: 'GENERATED: initial + new_amount']
  target_amount numeric [note: 'user-set goal']
  created_at timestamptz
}

Table net_worth_snapshots {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  snapshot_date date [note: 'first of month']
  account_id uuid [not null, ref: > accounts.id]
  account_name text [note: 'denormalised: name at snapshot time']
  balance numeric [note: 'account balance at snapshot. Cash INCLUDED.']
  total_net_worth numeric [note: 'sum of all account balances. Cash included.']
  created_at timestamptz
}

Table pending_entries {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  channel text [note: 'whatsapp | browser_voice']
  raw_input text [note: 'voice transcript waiting for Y/N confirmation']
  parsed_json jsonb [note: 'AI-parsed result: category, amount, account, etc.']
  entry_type text [note: 'transaction | cc_payment | transfer | income']
  expires_at timestamptz [note: 'auto-expires 10 minutes after creation']
  is_expired boolean
  created_at timestamptz
}

Table budgets {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  category_id uuid [not null, ref: > categories.id]
  month date [note: 'first of month']
  amount numeric
  created_at timestamptz
}

Table edit_log {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  timestamp timestamptz
  source text [note: 'whatsapp_bot | browser_voice | direct_sheet | api | migration']
  action text [note: 'INSERT | UPDATE | SOFT_DELETE | UPSERT']
  table_name text
  record_id uuid [note: 'which row was changed']
  field_changed text [note: 'NULL for INSERT']
  old_value text
  new_value text [note: 'full JSON for INSERT; field value for UPDATE']
  raw_input text
  confirmed boolean [note: 'TRUE = user confirmed. FALSE = system write.']
}
```

**Business rules to know:**
- Amounts are always positive. Direction comes from `transaction_type` or table context.
- **Cash (type=cash) IS included in net worth** — it is a real account
- **Brokerage = expense** — goes to `transactions`, NOT `investment_snapshots`
- **CC payments are net-zero** — paying Scapia CC from Axis Bank just moves money between own accounts
- `transfers.from_account_id` is nullable — for dividends/refunds that arrive from outside
- **Salary** has its own `income_entries` table
- `pending_entries` = voice entries waiting for 10-min user confirmation
- `edit_log` = append-only bank ledger (no UPDATE or DELETE ever)
- `categories` hierarchy = max 1 level deep (Food → Delivery, not Food → Delivery → Zomato)
- `accounts` hierarchy = max 1 level deep (UPI/Bank Accounts → Axis Bank)

**Real seed data (current net worth ₹10,98,208):**
- Accounts: Axis Bank (₹5.64L opening), SBI (₹11,835), Amazon Pay (₹271), Groww (₹0), Cash (₹2,080), Splitwise (₹1.16L), Axis CC, ICICI CC, Scapia CC, Investments (₹3.49L)
- Payment apps: Paytm→SBI, GPay→Axis, PhonePe→SBI, Scapia app→Scapia CC, Swiggy→Axis CC
- Monthly salary: ₹1,11,559 credited to Axis Bank

---

Now please draw the ER diagram and explain the design. Focus especially on:
1. How net worth is computed (which tables contribute)
2. How a voice entry "spent 340 on medicines via Paytm" flows through the tables
3. How credit card outstanding is tracked

---

## Step 3: Gemini Test Cases Prompt

Copy this separately to test specific entries:

---

Using the Net Worth Calculator database schema (13 tables: users, categories, accounts, app_mappings, income_entries, transactions, cc_payments, transfers, investment_snapshots, net_worth_snapshots, pending_entries, budgets, edit_log):

For each of these real-life entries, tell me: which table(s) get written, what key fields are set, and what's the net worth impact (+/-/zero)?

1. "Paid ₹340 for medicines via Paytm" → Paytm maps to SBI Bank
2. "Received salary ₹1,11,559 in Axis Bank"
3. "Paid Scapia CC bill ₹8,000 from Axis Bank"
4. "Transferred ₹20,000 from Axis to SBI"
5. "Received ₹41 dividend in Groww Account"
6. "Paid ₹47 brokerage fee to Zerodha"
7. "Bought groceries ₹650 cash from market"
8. "Invested ₹5,000 new money into SIP this month"
9. "Scapia gave ₹200 cashback on my Amazon order"
10. "Sold shares, booked ₹15,000 profit, money in Zerodha/Groww"

---

## Quick Reference: Which Table for What

| Entry | Table |
|-------|-------|
| Groceries, petrol, medicines, food delivery | `transactions` |
| Salary, freelance payment received | `income_entries` |
| Paying your CC bill from bank | `cc_payments` |
| Bank to bank transfer | `transfers` (type=transfer) |
| Dividend received | `transfers` (type=dividend, from=NULL) |
| Cashback from CC | `transfers` (type=cashback) |
| Refund received | `transfers` (type=refund) |
| Brokerage fee paid | `transactions` (expense, category=Brokerage) |
| Monthly SIP / MF portfolio snapshot | `investment_snapshots` |
| Profit booking from stocks | `transfers` (type=profit_booking) — design TBD |
| Cash expense | `transactions` (account → Cash Payment) |

---

*Net Worth Calculator · Gemini ER Prompt v2.2 · March 2026*
