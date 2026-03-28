# Formula Audit Report — Net Worth Calculator Sheet (v1.0)

**Spreadsheet:** [Net Worth Calculator Sheet (v1.0)](https://docs.google.com/spreadsheets/d/1le4JT-4he0jGFlxTwn63ZGsiZfWrVZSyFbkcPsmsm7s)
**Audit date:** 2026-03-28
**Audited by:** Claude Code (cell-by-cell formula bar inspection with formula view enabled)

---

## Table of Contents

1. [Overall Sheet](#1-overall-sheet)
2. [Kharche Sheet](#2-kharche-sheet)
3. [Credit Card Bills Sheet](#3-credit-card-bills-sheet)
4. [Adhoc/Self Transfer Sheet](#4-adhocself-transfer-sheet)
5. [Actual Investments Sheet](#5-actual-investments-sheet)
6. [Dropdown Lists Sheet](#6-dropdown-lists-sheet)
7. [Cross-Sheet Reference Map](#7-cross-sheet-reference-map)
8. [Risk Assessment](#8-risk-assessment)
9. [SQL Equivalents](#9-sql-equivalents-for-key-formulas)

---

## 1. Overall Sheet

The dashboard sheet. Contains all computed views — no raw data entry.

### 1.1 Account Balance Section (Rows 1-10)

| Cell | Formula | What It Computes | Risk |
|------|---------|-----------------|------|
| A1 | `='Dropdown Lists'!E3` | Header label "UPI/Bank Accounts" | LOW |
| A2 | `='Dropdown Lists'!E2` | Account name "Cash Payment" | LOW |
| A3 | `='Dropdown Lists'!F3` | Account name "Axis Bank" | LOW |
| A4 | `='Dropdown Lists'!F4` | Account name "State Bank of India (SBI)" | LOW |
| A5 | `='Dropdown Lists'!F5` | Account name "Amazon Pay" | LOW |
| A6 | `='Dropdown Lists'!F6` | Account name "Groww Account" | LOW |
| A7 | `='Dropdown Lists'!E10` | Account name "Splitwise" | LOW |
| A8 | `Investments` | Hardcoded label (not a formula) | LOW |
| B1 | `Starting Balance` | Header label (hardcoded) | LOW |
| B2 | `2080` | Hardcoded starting balance — Cash Payment | **HIGH** |
| B3 | `=564507.85+sum(K2:K16)` | Hardcoded base + sum of salary entries (K column) | **HIGH** |
| B4 | `11835` | Hardcoded starting balance — SBI | **HIGH** |
| B5 | `271.66` | Hardcoded starting balance — Amazon Pay | **HIGH** |
| B6 | `0` | Hardcoded starting balance — Groww Account | LOW |
| B7 | `116146.39` | Hardcoded starting balance — Splitwise | **HIGH** |
| B8 | `348935` | Hardcoded starting balance — Investments | **HIGH** |
| C2 | `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$E:$E, $A2, Kharche!$E:$E, "<>Credit Card"), 0)` | Direct spend for account in $A2 (excludes CC transactions) | **MED** — see note 1 |
| C3–C7 | Same pattern as C2 with row reference changing | Direct spend per account | MED |
| C8 | `=-IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$C:$C, $A8, Kharche!$E:$E, "<>Credit Card"), 0)` | Investment spend — **different**: matches on Category ($C) not Account ($E), negated | **HIGH** — see note 2 |
| D2 | `=IFERROR(SUMIF('Credit Card Bills'!$B:$B, $A2, 'Credit Card Bills'!$D:$D), 0)` | CC bill payments FROM this account | LOW |
| D3–D8 | Same pattern as D2 | CC bill payments per account | LOW |
| E2 | `=IFERROR(SUMIF('Adhoc/Self Transfer'!$C:$C, $A2, 'Adhoc/Self Transfer'!$D:$D), 0) - IFERROR(SUMIF('Adhoc/Self Transfer'!$B:$B, $A2, 'Adhoc/Self Transfer'!$D:$D), 0)` | Net transfer = (transfers IN) - (transfers OUT) | LOW |
| E3–E7 | Same pattern as E2 | Net transfers per account | LOW |
| E8 | *(empty)* | Investments have no self-transfers | LOW |
| F2 | `=$B2 - $C2 - $D2 + $E2` | Current Balance = Starting - DirectSpend - CCBillPaid + NetTransfer | LOW |
| F3–F8 | Same pattern as F2 | Current balance per account | LOW |
| **F9** | **`=Sum(F3:F8)`** | **NET WORTH** (sum of all current balances, excludes Cash row F2) | **HIGH** — see note 3 |
| **F10** | **`=sum(F3:F4)`** | **CASH IN BANK** (Axis Bank + SBI only) | LOW |

**Notes:**
1. C2 formula uses `$E:$E` (Account column) for BOTH the match criteria AND the exclusion `"<>Credit Card"`. This means it sums Kharche amounts where Account = "Cash Payment" AND Account <> "Credit Card" — the second condition is redundant since "Cash Payment" already isn't "Credit Card". This works but is logically unnecessary.
2. C8 (Investments) uses `Kharche!$C:$C` (Category column) instead of `$E:$E` (Account), and has a leading negative sign. This means investment amounts appear positive in the balance calculation even though they are expenses.
3. F9 `=Sum(F3:F8)` **excludes F2 (Cash Payment)**. Net Worth = bank balances + investments, but not petty cash.

### 1.2 Salary Section (Columns H-K, Rows 1-16)

| Cell | Formula | What It Computes | Risk |
|------|---------|-----------------|------|
| H1 | `Salary Date` | Header | LOW |
| I1 | `Salary Month` | Header | LOW |
| K1 | `Amount` | Header | LOW |
| H2 | `=DATE(2026,2,27)` | Salary date entry | LOW |
| I2 | `February 2026` | Salary month (hardcoded text) | LOW |
| K2 | `111559` | Salary amount (hardcoded) | **MED** |

Salary entries are stored in columns H-K (rows 2-16), referenced by B3's `sum(K2:K16)`.

### 1.3 CC Outstanding Section (Rows 14-18)

| Cell | Formula | What It Computes | Risk |
|------|---------|-----------------|------|
| A14 | `Total CC Spends` | Section header (hardcoded) | LOW |
| A15 | `='Dropdown Lists'!E7` | "Credit Card" header label | LOW |
| A16 | `='Dropdown Lists'!F7` | CC name "Axis Bank CC" | LOW |
| A17 | `='Dropdown Lists'!F8` | CC name "ICICI" | LOW |
| A18 | `='Dropdown Lists'!F9` | CC name "Scapia" | LOW |
| B15 | `Total Spend` | Header | LOW |
| B16 | `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$E:$E, "Credit Card", Kharche!$F:$F, $A16), 0)` | Total CC spend on this card (all time) | LOW |
| B17–B18 | Same pattern as B16 | Total CC spend per card | LOW |
| C15 | `Cashback` | Header | LOW |
| C16 | `=-IFERROR(SUMIFS(...)` | Cashback amount (negated SUMIFS — likely from Adhoc/Self Transfer Cashback rows) | **MED** — see note 4 |
| C17–C18 | Same pattern as C16 | Cashback per card | MED |
| D15 | `Total Paid` | Header | LOW |
| D16 | `=IFERROR(SUMIF('Credit Card Bills'!$C:$C, $A16, 'Credit Card Bills'!$D:$D), 0)` | Total amount paid toward this CC bill (matches on CC Bills column C) | LOW |
| D17–D18 | Same pattern as D16 | Total paid per card | LOW |
| E15 | `Outstanding` | Header | LOW |
| **E16** | **`=$B16 - $D16 - C16`** | **CC Outstanding = TotalSpend - TotalPaid - Cashback** | LOW |
| E17–E18 | Same pattern: `=$B{n} - $D{n} - C{n}` | Outstanding per card | LOW |

**Note 4:** C16-C18 Cashback formulas appear to be negated IFERROR(SUMIFS(...)) pulling from Adhoc/Self Transfer rows where B column = "Cashback". The negation makes cashback reduce the outstanding balance.

### 1.4 Monthly Analytics Section (Rows 19-22+)

| Cell | Formula | What It Computes | Risk |
|------|---------|-----------------|------|
| A19 | `Monthly Analytics` | Section header | LOW |
| A20 | `Month` | Column header | LOW |
| A21 | `2/1/2026` | Month start date (Feb 2026) — hardcoded | LOW |
| A22 | *(next month)* | Month start date (Mar 2026) | LOW |
| B20 | `Income` | Header | LOW |
| **B21** | **`=IFERROR(SUMIFS($K:$K, $J:$J, ">="&$A21, $J:$J, "<="&EOMONTH($A21,0)), 0)`** | Monthly income — sums salary amounts (col K) where salary month (col J) is within the month | **HIGH** — see note 5 |
| C20 | `Total Expense` | Header | LOW |
| **C21** | **`=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&$A21, Kharche!$A:$A, "<="&EOMONTH($A21, 0)), 0)`** | Monthly total expense — sums ALL Kharche amounts within the month | LOW |
| D20 | `=concat('Dropdown Lists'!F3, " Spends")` | Dynamic header "Axis Bank Spends" | LOW |
| D21 | `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&$A21, Kharche!$A:$A, "<="&EOMONTH($A21,0), Kharche!$E:$E, 'Dropdown Lists'!$F3), 0)` | Monthly spend from Axis Bank account | **MED** — see note 6 |
| E20 | `=concat('Dropdown Lists'!F4, " Spends")` | Dynamic header "State Bank of India (SBI) Spends" | LOW |
| E21 | Same SUMIFS pattern, matching `'Dropdown Lists'!$F4` | Monthly SBI spend | MED |
| F20 | `=concat('Dropdown Lists'!F5, " Spends")` | "Amazon Pay Spends" | LOW |
| F21 | Same SUMIFS pattern, matching `'Dropdown Lists'!$F5` | Monthly Amazon Pay spend | MED |
| G20 | `=concat('Dropdown Lists'!F6, " Spends")` | "Groww Account Spends" | LOW |
| G21 | Same SUMIFS pattern, matching `'Dropdown Lists'!$F6` | Monthly Groww spend | MED |
| H20 | `=concat('Dropdown Lists'!E10, " Spends")` | "Splitwise Spends" | LOW |
| H21 | Same SUMIFS pattern, matching `'Dropdown Lists'!$E10` | Monthly Splitwise spend | MED |
| I20 | `Other Spends` | Header (hardcoded) | LOW |
| I21 | `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&$A21, Kharche!$A:$A, "<="&EOMONTH($A21,0), Kharche!$E:$E, 'Dropdown Lists'!$E2), 0)` | Monthly Cash Payment spends (likely) | MED |
| J20 | `=concat('Dropdown Lists'!F7, " Spends")` | "Axis Bank CC Spends" | LOW |
| J21 | `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&$A21, ..., Kharche!$E:$E, "Credit Card", Kharche!$F:$F, 'Dropdown Lists'!$F7), 0)` | Monthly Axis Bank CC spend | MED |
| K20 | `=concat('Dropdown Lists'!F8, " Spends")` | "ICICI Spends" | LOW |
| K21 | Same CC pattern matching `'Dropdown Lists'!$F8` | Monthly ICICI CC spend | MED |
| L20 | `=concat('Dropdown Lists'!F9, " Spends")` | "Scapia Spends" | LOW |
| L21 | Same CC pattern matching `'Dropdown Lists'!$F9` | Monthly Scapia CC spend | MED |
| M20 | `Total CC Spends` | Header | LOW |
| M21 | `=sum(J21:L21)` | Sum of all CC card spends for the month | LOW |
| N20 | `CC Bills Paid (Total)` | Header | LOW |
| N21 | `=IFERROR(SUMIFS('Credit Card Bills'!$D:$D, ...)` | Monthly CC bill payments (date-filtered from CC Bills sheet) | MED |
| O20 | `Monthly Investments` | Header | LOW |
| O21 | `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&$A21, ..., Kharche!$C:$C, "Investments"), 0)` | Monthly investment amount from Kharche | MED |

**Note 5:** B21 Income formula uses columns $J and $K from the Overall sheet itself (salary data in the H-K section), NOT from another sheet. Column J appears to be the salary date column used for date filtering.

**Note 6:** All monthly analytics formulas use date-range filtering via `">="&$A21` and `"<="&EOMONTH($A21,0)` against `Kharche!$A:$A` (date column). This is a fragile pattern that breaks if Kharche column order changes.

---

## 2. Kharche Sheet

**Purpose:** Day-to-day expense ledger. Primary data input sheet.

### Column Structure

| Column | Header | Type | Formulas? |
|--------|--------|------|-----------|
| A | Date | `=DATE(year,month,day)` | YES — date formulas |
| B | Particulars | Text | NO |
| C | Category | Text (dropdown) | NO |
| D | Subcategory | Text (dropdown) | NO |
| E | Account | Text (dropdown) | NO |
| F | Account - Subcategory | Text (dropdown) | NO |
| G | Application | Text (dropdown) | NO |
| H | Amount | Number | NO (plain values) |

### Additional Sections

| Area | Content |
|------|---------|
| L1:M9 | **Monthly Fixed Budget** — Hardcoded budget items (Maid Salary, Rent, Furniture Rent, Fixed Groceries, Electricity, Gas Bill, Random Groceries) with a `=SUM(M3:M9)` total |
| Right side | "Monthly Household Tracker" bar chart |

### Key Observations
- Row 1: Title "Day to Day Expenses"
- Row 2: Column headers
- Row 3+: Data starts
- **No formula columns beyond column H** in the data area
- All dropdowns source from the Dropdown Lists sheet
- Column A uses `=DATE()` formulas instead of typed dates — this is how the voice assistant enters dates

---

## 3. Credit Card Bills Sheet

**Purpose:** Records CC bill payments.

### Column Structure

| Column | Header | Type | Formulas? |
|--------|--------|------|-----------|
| A | Date | `=date(...)` | YES — date formula |
| B | Paid From Account | Text (dropdown) | NO |
| C | Credit Card | Text (dropdown) | NO |
| D | Amount | Number | NO |

### Key Observations
- Row 1: Headers
- Row 2: Single entry (Axis Bank paying Axis Bank CC, 2,371.50)
- Rows 3-27: Empty with pre-configured dropdowns in B and C
- **Very sparse** — only 1 payment recorded
- No computed columns
- Column B is referenced by Overall!D formula (which account paid the CC bill)
- Column C is referenced by Overall!D16-D18 (which CC was paid)

---

## 4. Adhoc/Self Transfer Sheet

**Purpose:** Records inter-account transfers, refunds, dividends, cashbacks.

### Column Structure

| Column | Header | Type | Formulas? |
|--------|--------|------|-----------|
| A | Date | `=DATE(year,month,day)` | YES — date formulas |
| B | From | Text (dropdown) | NO |
| C | To | Text (dropdown) | NO |
| D | Amount | Number | Mostly NO (one formula: `=59.37+24.44` in row 22) |
| E | Buffer Amount | Number | All zeros |

### Key Observations
- Row 1: Title "Self Transfer, Refunds, Dividends"
- Row 2: Headers
- Row 3+: Transfer data
- Includes diverse transaction types: inter-bank transfers, dividends, cashbacks, refunds, profit booking
- **Column B "From"** is used by Overall's Net Transfer formula (transfers OUT)
- **Column C "To"** is used by Overall's Net Transfer formula (transfers IN)
- Row 3 has no date and no From — appears to be an opening Splitwise settlement
- "Cashback" entries in column B are used for CC outstanding calculations
- "Profit Booking" entries represent investment gains
- **Buffer Amount column (E)** appears unused (all zeros)

---

## 5. Actual Investments Sheet

**Purpose:** Investment portfolio summary by type, with monthly breakdown.

### Column Structure

| Column | Header | Type | Formulas? |
|--------|--------|------|-----------|
| A | Investment Summary | Text labels | NO |
| B | Initial Invested Amount | Number | Hardcoded starting values |
| C | Feb 2026 (New Invested Amount) | Formula | YES |
| D | Mar 2026 (New Invested Amount) | Formula | YES |
| E | Total Investments | Formula | YES |

### Formula Details

| Cell | Formula | What It Computes | Risk |
|------|---------|-----------------|------|
| C2 | `2/1/2026` (date) | Month header (Feb 2026) | LOW |
| D2 | Date for Mar 2026 | Month header | LOW |
| **C3** | **`=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&C$2, Kharche!$A:$A, "<="&EOMONTH(C$2, 0), Kharche!$C:$C, "Investments", Kharche!$D:$D, $A3), 0)`** | Monthly investment in this category — matches Kharche by date range + Category "Investments" + Subcategory = row label | **MED** — see note 7 |
| C4–C10 | Same pattern as C3 | Monthly investment per type | MED |
| D3–D10 | Same pattern as C3 with D$2 date | Next month's investment per type | MED |
| E3 | `=sum($B3:$D3)` | Total investment for Equity Stocks | LOW |
| E4–E10 | Same pattern | Total per investment type | LOW |
| B11 | `=sum(B3:B10)` | Total initial invested | LOW |
| C11 | `=sum(C3:C8)` | Total Feb new investment (**note: C3:C8, not C3:C10**) | **HIGH** — see note 8 |
| D11 | `=sum(D3:D8)` | Total Mar new investment (same issue) | HIGH |
| E11 | `=sum(E3:E8)` | Total all investments (same issue) | HIGH |

### Investment Types (Rows 3-10)
- Equity Stocks (B3=213,100)
- SIP (B4=0)
- Mutual Funds (B5=92,995.16)
- NPS (B6=42,840)
- Fixed Deposits (B7=0)
- IPO locked/Limit Buy (B8=0)
- Brokerage (B9=0)
- Profit Booking - Equity Stocks (B10=0)

**Note 7:** The investment formula cross-references Kharche using Category "Investments" and Subcategory matching the investment type name in column A. This is name-dependent — if subcategory text in Kharche doesn't exactly match column A labels, the SUMIFS returns 0.

**Note 8:** Row 11 totals use `C3:C8` range, which **excludes rows 9-10 (Brokerage, Profit Booking)**. This is likely intentional (brokerage fees and profit bookings shouldn't count as new investment), but it's fragile — adding new investment types below row 8 would be silently excluded.

---

## 6. Dropdown Lists Sheet

**Purpose:** Reference/lookup data for all dropdown menus. No formulas.

### Layout

| Column | Content |
|--------|---------|
| A | Merged label "Category Lists" with description |
| B | Category values: Food and Drinks, Cigarettes, Recreation, Transport, Household, Apparel, Others, Trip, Subscriptions, Investments, Medical Spends, Education |
| C | Subcategory values: Delivery, Eating Out, Local, Metro, Auto/Cab, Petrol, House Rent, Fixed Groceries, Random Groceries, Maid Salary, Electricity, Furniture Rent, Travelling, Food, Accommodation, Household, Drinks and Cigarettes, Recreation, Miscellaneous, Gifts, Equity Stocks, Mutual Funds, SIP, NPS, Brokerage, Fixed Deposits |
| D | *(unused/empty)* |
| E | Account types: E2="Cash Payment", E3="UPI/Bank Accounts" (header), E4-E6="UPI/Bank Accounts" (repeated), E7="Credit Card" (header), E8-E9="Credit Card" (repeated), E10="Splitwise" |
| F | Account names: F3="Axis Bank", F4="State Bank of India (SBI)", F5="Amazon Pay", F6="Groww Account", F7="Axis Bank CC", F8="ICICI", F9="Scapia" |

### Critical Cell References Used by Overall Sheet

| Dropdown Cell | Value | Referenced By |
|---------------|-------|--------------|
| E2 | Cash Payment | Overall!A2 |
| E3 | UPI/Bank Accounts | Overall!A1 (header) |
| F3 | Axis Bank | Overall!A3, Monthly Analytics headers |
| F4 | State Bank of India (SBI) | Overall!A4, Monthly Analytics headers |
| F5 | Amazon Pay | Overall!A5, Monthly Analytics headers |
| F6 | Groww Account | Overall!A6, Monthly Analytics headers |
| E7 | Credit Card | Overall!A15 (CC section header) |
| F7 | Axis Bank CC | Overall!A16, CC Monthly Analytics |
| F8 | ICICI | Overall!A17, CC Monthly Analytics |
| F9 | Scapia | Overall!A18, CC Monthly Analytics |
| E10 | Splitwise | Overall!A7, Monthly Analytics headers |

---

## 7. Cross-Sheet Reference Map

### Overall Sheet References

```
Overall          Kharche              Credit Card Bills       Adhoc/Self Transfer     Dropdown Lists
--------         --------             -----------------       -------------------     --------------
C2-C7  -------> $H:$H (Amount)
               + $E:$E (Account)
               + $E:$E <> "Credit Card"

C8     -------> $H:$H (Amount)
               + $C:$C (Category = "Investments")
               + $E:$E <> "Credit Card"

D2-D8  ----------------------------------------> $B:$B (Paid From)
                                                + $D:$D (Amount)

E2-E7  ----------------------------------------------------------------> $C:$C (To)
                                                                         + $D:$D (Amount)
                                                                         - $B:$B (From)
                                                                         - $D:$D (Amount)

B16-B18 -------> $H:$H (Amount)
                + $E:$E = "Credit Card"
                + $F:$F (Account-Subcategory)

D16-D18 ----------------------------------------> $C:$C (Credit Card)
                                                 + $D:$D (Amount)

Monthly  -------> $H:$H (Amount)
Analytics        + $A:$A (Date range)
D-L rows         + $E:$E or $F:$F (Account filter)

B21     -------> Overall $K:$K (Salary Amount)    (self-reference)
                + Overall $J:$J (Salary Date)
```

### Column Dependencies (Fragile References)

| Source Sheet | Column | Letter | Used In | Breaks If |
|-------------|--------|--------|---------|-----------|
| Kharche | Date | A | Monthly Analytics date filters | Column inserted before A |
| Kharche | Category | C | Overall C8, Actual Investments | Column inserted before C |
| Kharche | Subcategory | D | Actual Investments C3-C10 | Column inserted before D |
| Kharche | Account | E | Overall C2-C7, B16-B18, Monthly Analytics | Column inserted before E |
| Kharche | Account-Subcategory | F | Overall B16-B18, Monthly Analytics CC | Column inserted before F |
| Kharche | Amount | H | ALL Overall formulas | Column inserted before H |
| Credit Card Bills | Paid From Account | B | Overall D2-D8 | Column inserted before B |
| Credit Card Bills | Credit Card | C | Overall D16-D18 | Column inserted before C |
| Credit Card Bills | Amount | D | Overall D2-D8, D16-D18 | Column inserted before D |
| Adhoc/Self Transfer | From | B | Overall E2-E7 | Column inserted before B |
| Adhoc/Self Transfer | To | C | Overall E2-E7 | Column inserted before C |
| Adhoc/Self Transfer | Amount | D | Overall E2-E7 | Column inserted before D |

**All cross-sheet references use full-column notation ($H:$H, $E:$E, etc.)** — this is resilient to row insertions but fragile to column insertions/deletions.

---

## 8. Risk Assessment

### HIGH Risk Items

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 1 | **Hardcoded starting balances** (B2-B8) | Cannot track balance changes over time; must manually update each period | Store as initial seed in `accounts` table with `opening_balance` and `effective_date` |
| 2 | **B3 formula `=564507.85+sum(K2:K16)`** mixes hardcoded value with salary sum | If salary section grows past K16, new salaries silently excluded | In DB: JOIN accounts.opening_balance + SUM(salary_entries) |
| 3 | **F9 Net Worth excludes Cash (F2)** | `=Sum(F3:F8)` starts at F3, skipping F2 (Cash Payment). Petty cash not in net worth | Design decision to document — or include cash in net worth calculation |
| 4 | **Investment totals exclude rows 9-10** | `=sum(C3:C8)` in row 11 misses Brokerage and Profit Booking rows | Use dynamic range or named range in SQL |
| 5 | **C8 uses different column** for matching | C8 matches on `$C:$C` (Category) while C2-C7 match on `$E:$E` (Account) | Inconsistent logic — document intent clearly for SQL migration |
| 6 | **Salary data stored in Overall sheet** (columns H-K) | Salary is metadata on the dashboard, not in a proper data table | Create dedicated `salary_entries` or `income` table |

### MEDIUM Risk Items

| # | Issue | Impact |
|---|-------|--------|
| 7 | Column-letter references in all SUMIFS | Inserting a column in Kharche/CC Bills/Adhoc breaks all Overall formulas |
| 8 | String matching for account names ("Credit Card", "Investments") | Typos or name changes silently break calculations |
| 9 | EOMONTH date filtering assumes clean month boundaries | Edge cases with timezone differences could miscount |
| 10 | No validation on duplicate entries | Same transaction could be entered twice with no warning |
| 11 | Monthly Analytics date columns (J:J) reference local salary columns | Self-referencing within Overall is confusing and non-standard |

### LOW Risk Items

| # | Issue |
|---|-------|
| 12 | Buffer Amount column in Adhoc sheet is unused |
| 13 | Colour Codes sheet is documentation only |
| 14 | Dropdown Lists has no formulas (pure reference data) |

---

## 9. SQL Equivalents for Key Formulas

### Net Worth Calculation

**Sheet:** `=Sum(F3:F8)` where each F = `$B - $C - $D + $E`

```sql
-- Net Worth = SUM of all account current balances (excluding cash)
SELECT SUM(
    a.opening_balance
    - COALESCE(direct_spend, 0)
    - COALESCE(cc_bill_paid, 0)
    + COALESCE(net_transfer, 0)
) AS net_worth
FROM accounts a
LEFT JOIN (
    -- Direct spend per account (excludes CC transactions)
    SELECT account_name, SUM(amount) AS direct_spend
    FROM transactions
    WHERE account_type != 'Credit Card'
    GROUP BY account_name
) ds ON a.name = ds.account_name
LEFT JOIN (
    -- CC bill payments from this account
    SELECT paid_from_account, SUM(amount) AS cc_bill_paid
    FROM cc_payments
    GROUP BY paid_from_account
) cc ON a.name = cc.paid_from_account
LEFT JOIN (
    -- Net transfers (in - out)
    SELECT account_name,
        COALESCE(SUM(CASE WHEN direction = 'in' THEN amount END), 0)
        - COALESCE(SUM(CASE WHEN direction = 'out' THEN amount END), 0)
        AS net_transfer
    FROM (
        SELECT to_account AS account_name, amount, 'in' AS direction FROM transfers
        UNION ALL
        SELECT from_account AS account_name, amount, 'out' AS direction FROM transfers
    ) t
    GROUP BY account_name
) tr ON a.name = tr.account_name
WHERE a.name != 'Cash Payment';  -- F9 excludes cash
```

### CC Outstanding

**Sheet:** `=$B16 - $D16 - C16` (Total Spend - Total Paid - Cashback)

```sql
SELECT
    cc.card_name,
    COALESCE(spend.total, 0) AS total_spend,
    COALESCE(cashback.total, 0) AS cashback,
    COALESCE(paid.total, 0) AS total_paid,
    COALESCE(spend.total, 0) - COALESCE(paid.total, 0) - COALESCE(cashback.total, 0) AS outstanding
FROM credit_cards cc
LEFT JOIN (
    SELECT account_subcategory, SUM(amount) AS total
    FROM transactions
    WHERE account_type = 'Credit Card'
    GROUP BY account_subcategory
) spend ON cc.card_name = spend.account_subcategory
LEFT JOIN (
    SELECT credit_card, SUM(amount) AS total
    FROM cc_payments
    GROUP BY credit_card
) paid ON cc.card_name = paid.credit_card
LEFT JOIN (
    SELECT from_account, SUM(amount) AS total
    FROM transfers
    WHERE from_account = 'Cashback'
    GROUP BY from_account
) cashback ON cc.card_name = cashback.to_account;
```

### Monthly Expense by Account

**Sheet:** `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&$A21, Kharche!$A:$A, "<="&EOMONTH($A21,0), Kharche!$E:$E, 'Dropdown Lists'!$F3), 0)`

```sql
SELECT
    DATE_TRUNC('month', t.date) AS month,
    a.name AS account_name,
    SUM(t.amount) AS monthly_spend
FROM transactions t
JOIN accounts a ON t.account_name = a.name
GROUP BY DATE_TRUNC('month', t.date), a.name
ORDER BY month, account_name;
```

### Monthly Income

**Sheet:** `=IFERROR(SUMIFS($K:$K, $J:$J, ">="&$A21, $J:$J, "<="&EOMONTH($A21,0)), 0)`

```sql
SELECT
    DATE_TRUNC('month', salary_date) AS month,
    SUM(amount) AS monthly_income
FROM income_entries
GROUP BY DATE_TRUNC('month', salary_date);
```

### Monthly Investment by Type

**Sheet:** `=IFERROR(SUMIFS(Kharche!$H:$H, Kharche!$A:$A, ">="&C$2, ..., Kharche!$C:$C, "Investments", Kharche!$D:$D, $A3), 0)`

```sql
SELECT
    DATE_TRUNC('month', t.date) AS month,
    t.subcategory AS investment_type,
    SUM(t.amount) AS invested_amount
FROM transactions t
WHERE t.category = 'Investments'
GROUP BY DATE_TRUNC('month', t.date), t.subcategory
ORDER BY month, investment_type;
```

### Current Balance per Account

**Sheet:** `=$B{n} - $C{n} - $D{n} + $E{n}`

```sql
-- Comprehensive current balance view
CREATE VIEW account_balances AS
SELECT
    a.name,
    a.account_type,
    a.opening_balance,
    a.opening_balance
        - COALESCE(ds.direct_spend, 0)
        - COALESCE(cc.cc_paid, 0)
        + COALESCE(tr.net_transfer, 0) AS current_balance
FROM accounts a
LEFT JOIN LATERAL (
    SELECT SUM(amount) AS direct_spend
    FROM transactions
    WHERE account_name = a.name
      AND account_type != 'Credit Card'
) ds ON true
LEFT JOIN LATERAL (
    SELECT SUM(amount) AS cc_paid
    FROM cc_payments
    WHERE paid_from_account = a.name
) cc ON true
LEFT JOIN LATERAL (
    SELECT
        COALESCE(SUM(CASE WHEN to_account = a.name THEN amount END), 0)
        - COALESCE(SUM(CASE WHEN from_account = a.name THEN amount END), 0)
        AS net_transfer
    FROM transfers
) tr ON true;
```

---

## Appendix: Sheet Tab GIDs

| Sheet | GID | Purpose |
|-------|-----|---------|
| Overall | 0 | Dashboard with all computed views |
| Kharche | 619198260 | Day-to-day expenses |
| Dropdown Lists | 1522417320 | Reference data for dropdowns |
| Colour Codes | 1509767445 | Color legend (documentation) |
| Actual Investments | 366436593 | Investment portfolio summary |
| Credit Card Bills | 1539031901 | CC payment records |
| Adhoc/Self Transfer | 824013061 | Inter-account transfers |
| Claude Cache | *(hidden)* | Claude for Sheets cache |
| Sheet8 | *(hidden)* | Unknown/unused |
| New Investments Planner | *(visible)* | Planning sheet (not audited) |
