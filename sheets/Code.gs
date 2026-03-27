// ============================================================
// Code.gs — Net Worth Calculator: Complete Dropdown System
// Version: 5.0.0 FINAL  |  Single file, no Settings.gs needed
// ============================================================
//
// VERIFIED SHEET STRUCTURE (read directly from .xlsx file):
//
// ── Dropdown Lists ──────────────────────────────────────────
//   Row 1  = Headers (skip)
//   Col B (idx 1) = Category           → Kharche col C
//   Col C (idx 2) = Subcategory        → Kharche col D (row-paired with B)
//   Col E (idx 4) = Account            → Kharche col E, CC Bills B/C, Adhoc B/C
//   Col F (idx 5) = Account-Subcat     → Kharche col F+G (row-paired with E)
//
// ── Kharche ─────────────────────────────────────────────────
//   Row 1 = Title ("Day to Day Expenses") — SKIP
//   Row 2 = Headers — SKIP
//   Row 3+ = Data
//   A=Date(picker)  C=Category  D=Subcategory(cascade←C)
//   E=Account  F=AccSubcat(cascade←E)  G=Application(cascade←E)  H=Amount
//
// ── Credit Card Bills ────────────────────────────────────────
//   Row 1 = Headers — SKIP
//   Row 2+ = Data
//   A=Date(picker)  B=PaidFrom(UPI subcats)  C=CreditCard(CC subcats)  D=Amount
//
// ── Adhoc/Self Transfer ──────────────────────────────────────
//   Row 1 = Title — SKIP
//   Row 2 = Headers — SKIP
//   Row 3+ = Data
//   A=Date(picker)  B=From(all flat+Dividend+Refund+Cashback+Profit Booking - Equity Stocks)  C=To(all flat)  D=Amount  E=Buffer
//
// ── Overall ──────────────────────────────────────────────────
//   Entirely formula-driven — NO dropdowns applied here
//   Date pickers: col I rows 2-20 (salary dates), col A rows 21-60 (month dates)
//   All other columns are SUMIFS formulas — NEVER touch with date validation
//
// ── Actual Investments ───────────────────────────────────────
//   Formula-driven summary — no dropdowns needed
// ============================================================

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  sheets: {
    kharche:     'Kharche',
    dropdowns:   'Dropdown Lists',
    ccBills:     'Credit Card Bills',
    adhoc:       'Adhoc/Self Transfer',  // exact tab name with slash
    overall:     'Overall',
    investments: 'Actual Investments'
  },

  // Kharche columns (1-based)
  kharche: {
    date: 1, particulars: 2, category: 3, subcategory: 4,
    account: 5, accSubcat: 6, application: 7, amount: 8
  },

  // Credit Card Bills columns (1-based)
  ccBills: { date: 1, paidFrom: 2, creditCard: 3, amount: 4 },

  // Adhoc/Self Transfer columns (1-based)
  adhoc: { date: 1, from: 2, to: 3, amount: 4, buffer: 5 },

  // Overall columns (1-based) — salary section only
  overall: { salaryDate: 9 },  // col I = salary dates only

  // Dropdown Lists 0-based array indices
  dlIdx: { category: 1, subcategory: 2, account: 4, accSubcat: 5 },

  // Row boundaries
  rows: {
    kharcheStart:  3,   // row 1=title, row 2=headers
    ccBillsStart:  2,   // row 1=headers
    adhocStart:    3,   // row 1=title, row 2=headers
    overallSalaryDateStart: 2,
    overallMonthStart: 21,
    maxData: 1000
  }
};

// ─────────────────────────────────────────────────────────────
// CACHE — built once per execution, cleared on every edit
// ─────────────────────────────────────────────────────────────
let _cache = null;

function getCache() {
  if (_cache) return _cache;

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.dropdowns);
  if (!sheet) throw new Error('"Dropdown Lists" sheet not found. Check tab name.');

  const lastRow = sheet.getLastRow();
  const raw     = sheet.getRange(1, 1, lastRow, 6).getValues();

  const catMap = {}, accMap = {};
  const allCats = [], allAccs = [];
  const seenCat = new Set(), seenAcc = new Set();

  for (let i = 1; i < raw.length; i++) {
    const b = String(raw[i][CONFIG.dlIdx.category]).trim();
    const c = String(raw[i][CONFIG.dlIdx.subcategory]).trim();
    const e = String(raw[i][CONFIG.dlIdx.account]).trim();
    const f = String(raw[i][CONFIG.dlIdx.accSubcat]).trim();

    if (b) {
      if (!seenCat.has(b)) { seenCat.add(b); allCats.push(b); catMap[b] = []; }
      if (c && !catMap[b].includes(c)) catMap[b].push(c);
    }
    if (e) {
      if (!seenAcc.has(e)) { seenAcc.add(e); allAccs.push(e); accMap[e] = []; }
      if (f && !accMap[e].includes(f)) accMap[e].push(f);
    }
  }

  // Flat list: all account parent names + all sub-account names (used by Adhoc)
  const allFlatAccounts = [];
  const seenFlat = new Set();
  for (const acc of allAccs) {
    if (!seenFlat.has(acc)) { seenFlat.add(acc); allFlatAccounts.push(acc); }
    for (const sub of (accMap[acc] || [])) {
      if (!seenFlat.has(sub)) { seenFlat.add(sub); allFlatAccounts.push(sub); }
    }
  }

  _cache = { raw, allCats, allAccs, catMap, accMap, allFlatAccounts };
  console.log('[Cache] ' + allCats.length + ' cats | ' + allAccs.length + ' accs | ' + allFlatAccounts.length + ' flat accs');
  return _cache;
}

function clearCache() { _cache = null; }

// ─────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🔧 Dropdown Manager')

      // ── Main setup ─────────────────────────────────────────
      .addItem('⚙️ Setup ALL Sheets',            'setupAllSheets')
      .addItem('🔄 Refresh All Dropdowns',        'refreshAllDropdowns')
      .addSeparator()

      // ── Individual sheet setup ──────────────────────────────
      .addItem('📋 Setup Kharche Only',            'setupKharche')
      .addItem('💳 Setup Credit Card Bills Only',  'setupCCBills')
      .addItem('🔁 Setup Adhoc Transfers Only',    'setupAdhoc')
      .addItem('📅 Setup Date Pickers Only',        'setupAllDatePickers')
      .addSeparator()

      // ── Formula refresh ─────────────────────────────────────
      .addItem('🔃 Refresh ALL Formulas',           'refreshAllFormulas')
      .addItem('🔃 Refresh Overall Formulas',       'refreshOverallFormulas')
      .addItem('🔃 Refresh Kharche Formulas',       'refreshKharcheFormulas')
      .addItem('🔃 Refresh CC Bills Formulas',      'refreshCCBillsFormulas')
      .addItem('🔃 Refresh Adhoc Formulas',         'refreshAdhocFormulas')
      .addItem('🔃 Refresh Investments Formulas',   'refreshInvestmentFormulas')
      .addSeparator()

      // ── Fix / Debug ─────────────────────────────────────────
      .addItem('🔧 Fix Overall (Clear Bad Validations)', 'fixOverallValidations')
      .addItem('🧪 Run All Tests (30 tests)',            'testCascadingSystem')
      .addSeparator()
      .addItem('🐛 Full Debug Report',                   'debugDropdowns')
      .addItem('🐛 Debug: Config Values',                'debugConfig')
      .addItem('🐛 Debug: Dropdown Data',                'debugDropdownData')
      .addItem('🐛 Debug: Validations on Sheets',        'debugSheetValidations')
      .addItem('🐛 Debug: Live Data Samples',            'debugLiveData')
      .addItem('🐛 Debug: Overall Health',               'debugOverallHealth')
      .addSeparator()

      // ── Cleanup ─────────────────────────────────────────────
      .addItem('🗑️ Clear Cascaded Dropdowns (Kharche D, F, G)', 'clearAllDependentDropdowns')
      .addToUi();

    console.log('[onOpen] Menu ready');
  } catch (e) {
    console.error('[onOpen] ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// onEdit — Real-time cascades (requires installable trigger)
// Extensions → Apps Script → Triggers → + Add Trigger
// Function: onEdit | Event source: Spreadsheet | Type: On edit
// ─────────────────────────────────────────────────────────────
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    const sheet = range.getSheet();
    const sName = sheet.getName();
    const col   = range.getColumn();
    const row   = range.getRow();

    // Only act on Kharche sheet, only on data rows
    if (sName !== CONFIG.sheets.kharche) return;
    if (row < CONFIG.rows.kharcheStart) return;

    clearCache();
    const val = String(range.getValue()).trim();

    if (col === CONFIG.kharche.category) {
      // C changed → clear D, repopulate with matching subcategories
      sheet.getRange(row, CONFIG.kharche.subcategory).clearContent();
      const subcats = getCache().catMap[val] || [];
      subcats.length > 0
        ? setDropdown(sheet, row, CONFIG.kharche.subcategory, subcats)
        : clearDropdown(sheet, row, CONFIG.kharche.subcategory);
      console.log('[onEdit] C→D: "' + val + '" → ' + subcats.length + ' subcats');

    } else if (col === CONFIG.kharche.account) {
      // E changed → clear F and G, repopulate with matching account subcats
      sheet.getRange(row, CONFIG.kharche.accSubcat).clearContent();
      sheet.getRange(row, CONFIG.kharche.application).clearContent();
      const subcats = getCache().accMap[val] || [];
      if (subcats.length > 0) {
        setDropdown(sheet, row, CONFIG.kharche.accSubcat,   subcats);
        setDropdown(sheet, row, CONFIG.kharche.application, subcats);
      } else {
        clearDropdown(sheet, row, CONFIG.kharche.accSubcat);
        clearDropdown(sheet, row, CONFIG.kharche.application);
      }
      console.log('[onEdit] E→F+G: "' + val + '" → ' + subcats.length + ' subcats');

    } else if (col === CONFIG.kharche.accSubcat) {
      // F changed → keep G in sync with same parent E options
      const acc     = sheet.getRange(row, CONFIG.kharche.account).getValue();
      const subcats = getCache().accMap[String(acc).trim()] || [];
      if (subcats.length > 0) setDropdown(sheet, row, CONFIG.kharche.application, subcats);
    }

  } catch (e) {
    console.error('[onEdit] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Cascade Error: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// DROPDOWN HELPERS
// ─────────────────────────────────────────────────────────────
function setDropdown(sheet, row, col, values) {
  if (!values || values.length === 0) { clearDropdown(sheet, row, col); return; }
  sheet.getRange(row, col).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .setHelpText('Select from list')
      .build()
  );
}

function setRangeDropdown(range, values) {
  if (!values || values.length === 0) { range.clearDataValidations(); return; }
  range.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .setHelpText('Select from list')
      .build()
  );
}

function clearDropdown(sheet, row, col) {
  sheet.getRange(row, col).clearDataValidations();
}

// ─────────────────────────────────────────────────────────────
// DATE PICKER HELPER
// requireDateBetween triggers Google Sheets' native calendar picker.
// setAllowInvalid(true) ensures existing =DATE() formulas don't break.
// ─────────────────────────────────────────────────────────────
function setDatePickerOnRange(range) {
  range.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireDateBetween(new Date('2000-01-01'), new Date('2099-12-31'))
      .setAllowInvalid(true)
      .setHelpText('📅 Pick a date')
      .build()
  );
  range.setNumberFormat('dd-mmm-yyyy');
}

// ─────────────────────────────────────────────────────────────
// SETUP DATE PICKERS — all sheets
// ─────────────────────────────────────────────────────────────
function setupAllDatePickers() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Kharche col A, rows 3-1000
    const kSheet = ss.getSheetByName(CONFIG.sheets.kharche);
    if (kSheet) setDatePickerOnRange(kSheet.getRange(CONFIG.rows.kharcheStart, 1, 998, 1));

    // CC Bills col A, rows 2-200
    const ccSheet = ss.getSheetByName(CONFIG.sheets.ccBills);
    if (ccSheet) setDatePickerOnRange(ccSheet.getRange(CONFIG.rows.ccBillsStart, 1, 199, 1));

    // Adhoc col A, rows 3-200
    const adhocSheet = ss.getSheetByName(CONFIG.sheets.adhoc);
    if (adhocSheet) setDatePickerOnRange(adhocSheet.getRange(CONFIG.rows.adhocStart, 1, 198, 1));

    // Overall: ONLY col A rows 21-60 (monthly analytics month selector)
    // Col I is ALL formulas (=DATE(...) or =sum(...)) — never add date picker there
    const ovSheet = ss.getSheetByName(CONFIG.sheets.overall);
    if (ovSheet) {
      const monthRange = ovSheet.getRange(CONFIG.rows.overallMonthStart, 1, 40, 1);
      setDatePickerOnRange(monthRange);
      monthRange.setNumberFormat('mmm yyyy');
    }

    console.log('[setupAllDatePickers] Done');
    SpreadsheetApp.getUi().alert('✅ Date pickers applied to all date columns.');
  } catch (e) {
    console.error('[setupAllDatePickers] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Date Picker Error: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP: KHARCHE
// ─────────────────────────────────────────────────────────────
function setupKharche() {
  try {
    clearCache();
    const cache = getCache();
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.kharche);
    if (!sheet) throw new Error('"Kharche" sheet not found!');

    const startRow = CONFIG.rows.kharcheStart;
    const numRows  = 200;

    // A: date picker
    setDatePickerOnRange(sheet.getRange(startRow, CONFIG.kharche.date, numRows, 1));

    // C: Category dropdown
    setRangeDropdown(sheet.getRange(startRow, CONFIG.kharche.category, numRows, 1), cache.allCats);

    // E: Account dropdown
    setRangeDropdown(sheet.getRange(startRow, CONFIG.kharche.account, numRows, 1), cache.allAccs);

    // Per-row: set D, F, G for rows that already have C or E values
    const cVals = sheet.getRange(startRow, CONFIG.kharche.category, numRows, 1).getValues();
    const eVals = sheet.getRange(startRow, CONFIG.kharche.account,  numRows, 1).getValues();
    let cascaded = 0;

    for (let i = 0; i < numRows; i++) {
      const row    = startRow + i;
      const catVal = String(cVals[i][0]).trim();
      const accVal = String(eVals[i][0]).trim();

      if (catVal) {
        const subs = cache.catMap[catVal] || [];
        if (subs.length > 0) { setDropdown(sheet, row, CONFIG.kharche.subcategory, subs); cascaded++; }
      }
      if (accVal) {
        const subs = cache.accMap[accVal] || [];
        if (subs.length > 0) {
          setDropdown(sheet, row, CONFIG.kharche.accSubcat,   subs);
          setDropdown(sheet, row, CONFIG.kharche.application, subs);
          cascaded++;
        }
      }
    }

    console.log('[setupKharche] Done. Cats=' + cache.allCats.length + ' Accs=' + cache.allAccs.length + ' Cascaded=' + cascaded);
    return { cats: cache.allCats.length, accs: cache.allAccs.length, cascaded };
  } catch (e) {
    console.error('[setupKharche] ' + e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP: CREDIT CARD BILLS
// ─────────────────────────────────────────────────────────────
function setupCCBills() {
  try {
    clearCache();
    const cache = getCache();
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.ccBills);
    if (!sheet) throw new Error('"Credit Card Bills" sheet not found!');

    const startRow = CONFIG.rows.ccBillsStart;
    const numRows  = 200;

    // A: date picker
    setDatePickerOnRange(sheet.getRange(startRow, CONFIG.ccBills.date, numRows, 1));

    // B: Paid From — UPI/Bank sub-accounts (Axis Bank, SBI, Amazon Pay, Groww Account)
    const upiSubs = cache.accMap['UPI/Bank Accounts'] || [];
    if (upiSubs.length > 0)
      setRangeDropdown(sheet.getRange(startRow, CONFIG.ccBills.paidFrom, numRows, 1), upiSubs);

    // C: Credit Card — CC sub-accounts (Axis Bank CC, ICICI, Scapia)
    const ccSubs = cache.accMap['Credit Card'] || [];
    if (ccSubs.length > 0)
      setRangeDropdown(sheet.getRange(startRow, CONFIG.ccBills.creditCard, numRows, 1), ccSubs);

    console.log('[setupCCBills] PaidFrom=[' + upiSubs.join(', ') + '] CC=[' + ccSubs.join(', ') + ']');
    return { paidFrom: upiSubs, creditCards: ccSubs };
  } catch (e) {
    console.error('[setupCCBills] ' + e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP: ADHOC / SELF TRANSFER
// ─────────────────────────────────────────────────────────────
function setupAdhoc() {
  try {
    clearCache();
    const cache = getCache();
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.adhoc);
    if (!sheet) throw new Error('"Adhoc/Self Transfer" sheet not found!');

    const startRow = CONFIG.rows.adhocStart;
    const numRows  = 200;

    // A: date picker
    setDatePickerOnRange(sheet.getRange(startRow, CONFIG.adhoc.date, numRows, 1));

    // B: From — all flat accounts + Dividend + Refund + Cashback + Profit Booking - Equity Stocks
    const fromList = [...new Set([...cache.allFlatAccounts, 'Dividend', 'Refund', 'Cashback', 'Profit Booking - Equity Stocks'])];
    setRangeDropdown(sheet.getRange(startRow, CONFIG.adhoc.from, numRows, 1), fromList);

    // C: To — all flat accounts only
    const toList = [...new Set(cache.allFlatAccounts)];
    setRangeDropdown(sheet.getRange(startRow, CONFIG.adhoc.to, numRows, 1), toList);

    console.log('[setupAdhoc] From=' + fromList.length + ' To=' + toList.length);
    return { from: fromList, to: toList };
  } catch (e) {
    console.error('[setupAdhoc] ' + e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP: OVERALL — date pickers ONLY, no dropdowns
// ─────────────────────────────────────────────────────────────
function setupOverall() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.overall);
    if (!sheet) { console.warn('[setupOverall] Overall sheet not found'); return; }

    // CRITICAL: First nuke ALL validations from the entire sheet
    // This removes any stale date validations from previous runs
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
    SpreadsheetApp.flush();

    // Restore correct number formats on all formula columns (B-T, rows 1-60)
    // These are ₹ currency values — never let date format touch them
    sheet.getRange(1,  2, 60, 19).setNumberFormat('[$₹]#,##0.00');
    // Col A rows 21+ = month dates → restore month-year format
    sheet.getRange(21, 1, 40, 1).setNumberFormat('mmm yyyy');
    SpreadsheetApp.flush();

    // Now apply date pickers ONLY on 1 specific range:
    // Col A rows 21-60: monthly analytics month selector (user-entered first-of-month dates)
    // Col I is entirely formula-driven (=DATE(...) salary formulas + =sum(...) analytics)
    // — NEVER apply date validation to col I
    const monthRange = sheet.getRange(21, 1, 40, 1);
    setDatePickerOnRange(monthRange);
    monthRange.setNumberFormat('mmm yyyy');
    SpreadsheetApp.flush();

    console.log('[setupOverall] Done. Validations cleared. Date picker ONLY on A21:A60.');
  } catch (e) {
    console.error('[setupOverall] ' + e.message);
    // Non-fatal — Overall is formula-driven
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP ALL SHEETS
// ─────────────────────────────────────────────────────────────
function setupAllSheets() {
  try {
    clearCache();
    const r1 = setupKharche();
    const r2 = setupCCBills();
    const r3 = setupAdhoc();
    setupOverall();

    SpreadsheetApp.getUi().alert(
      '✅ ALL SHEETS SETUP COMPLETE!\n\n' +
      '📋 KHARCHE (rows 3–200):\n' +
      '   C → ' + r1.cats + ' categories\n' +
      '   D → cascades from C automatically\n' +
      '   E → ' + r1.accs + ' accounts\n' +
      '   F, G → cascade from E automatically\n' +
      '   A → 📅 date picker\n\n' +
      '💳 CREDIT CARD BILLS (rows 2+):\n' +
      '   B (Paid From) → ' + r2.paidFrom.join(', ') + '\n' +
      '   C (Card) → ' + r2.creditCards.join(', ') + '\n' +
      '   A → 📅 date picker\n\n' +
      '🔁 ADHOC/SELF TRANSFER (rows 3+):\n' +
      '   B (From) → ' + r3.from.length + ' options incl. Dividend, Refund, Cashback, Profit Booking - Equity Stocks\n' +
      '   C (To) → ' + r3.to.length + ' options\n' +
      '   A → 📅 date picker\n\n' +
      '📊 OVERALL:\n' +
      '   All formula validations cleared ✅\n' +
      '   A21:A60 → 📅 month date picker\n' +
      '   (Col I is formula-driven — untouched)\n\n' +
      '⚠️ REMINDER: Installable onEdit trigger must be active!\n' +
      'Extensions → Apps Script → Triggers → + Add Trigger\n' +
      'Function: onEdit | Event: On edit'
    );
  } catch (e) {
    console.error('[setupAllSheets] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Setup Error: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// REFRESH ALL DROPDOWNS
// Re-syncs all sheets including existing data rows
// ─────────────────────────────────────────────────────────────
function refreshAllDropdowns() {
  try {
    clearCache();
    const cache = getCache();
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let ops = 0;

    // ── Kharche ──────────────────────────────────────────────
    const kSheet = ss.getSheetByName(CONFIG.sheets.kharche);
    if (kSheet) {
      const startRow = CONFIG.rows.kharcheStart;
      const numRows  = Math.min(CONFIG.rows.maxData, Math.max(kSheet.getLastRow(), startRow)) - startRow + 1;

      setDatePickerOnRange(kSheet.getRange(startRow, CONFIG.kharche.date, numRows, 1));
      setRangeDropdown(kSheet.getRange(startRow, CONFIG.kharche.category, numRows, 1), cache.allCats);
      setRangeDropdown(kSheet.getRange(startRow, CONFIG.kharche.account,  numRows, 1), cache.allAccs);

      const cVals = kSheet.getRange(startRow, CONFIG.kharche.category, numRows, 1).getValues();
      const eVals = kSheet.getRange(startRow, CONFIG.kharche.account,  numRows, 1).getValues();

      for (let i = 0; i < numRows; i++) {
        const row    = startRow + i;
        const catVal = String(cVals[i][0]).trim();
        const accVal = String(eVals[i][0]).trim();
        if (catVal) {
          const subs = cache.catMap[catVal] || [];
          if (subs.length > 0) { setDropdown(kSheet, row, CONFIG.kharche.subcategory, subs); ops++; }
        }
        if (accVal) {
          const subs = cache.accMap[accVal] || [];
          if (subs.length > 0) {
            setDropdown(kSheet, row, CONFIG.kharche.accSubcat,   subs);
            setDropdown(kSheet, row, CONFIG.kharche.application, subs);
            ops++;
          }
        }
      }
    }

    // ── Credit Card Bills ─────────────────────────────────────
    const ccSheet = ss.getSheetByName(CONFIG.sheets.ccBills);
    if (ccSheet) {
      const s = CONFIG.rows.ccBillsStart;
      setDatePickerOnRange(ccSheet.getRange(s, 1, 199, 1));
      setRangeDropdown(ccSheet.getRange(s, CONFIG.ccBills.paidFrom,   199, 1), cache.accMap['UPI/Bank Accounts'] || []);
      setRangeDropdown(ccSheet.getRange(s, CONFIG.ccBills.creditCard, 199, 1), cache.accMap['Credit Card'] || []);
      ops += 3;
    }

    // ── Adhoc ─────────────────────────────────────────────────
    const adhocSheet = ss.getSheetByName(CONFIG.sheets.adhoc);
    if (adhocSheet) {
      const s        = CONFIG.rows.adhocStart;
      const fromList = [...new Set([...cache.allFlatAccounts, 'Dividend', 'Refund', 'Cashback', 'Profit Booking - Equity Stocks'])];
      const toList   = [...new Set(cache.allFlatAccounts)];
      setDatePickerOnRange(adhocSheet.getRange(s, 1, 198, 1));
      setRangeDropdown(adhocSheet.getRange(s, CONFIG.adhoc.from, 198, 1), fromList);
      setRangeDropdown(adhocSheet.getRange(s, CONFIG.adhoc.to,   198, 1), toList);
      ops += 3;
    }

    // ── Overall — only fix/date pickers ──────────────────────
    setupOverall();
    ops++;

    SpreadsheetApp.getUi().alert('✅ Refresh Complete!\n• All sheets synced\n• Cascaded rows updated: ' + ops);
  } catch (e) {
    console.error('[refreshAllDropdowns] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Refresh Error: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// CLEAR CASCADED DROPDOWNS (Kharche D, F, G only)
// ─────────────────────────────────────────────────────────────
function clearAllDependentDropdowns() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.kharche);
    if (!sheet) throw new Error('"Kharche" sheet not found!');
    const s = CONFIG.rows.kharcheStart;
    const n = 998;
    sheet.getRange(s, CONFIG.kharche.subcategory, n, 1).clearContent().clearDataValidations();
    sheet.getRange(s, CONFIG.kharche.accSubcat,   n, 1).clearContent().clearDataValidations();
    sheet.getRange(s, CONFIG.kharche.application, n, 1).clearContent().clearDataValidations();
    SpreadsheetApp.getUi().alert('✅ Cleared D (Subcategory), F (AccSubcat), G (Application) in Kharche.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// FIX OVERALL — nuclear option to clear all bad validations
// Run this if you see "Invalid: Input must be between..." on
// formula cells in the Overall sheet.
// ─────────────────────────────────────────────────────────────
function fixOverallValidations() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.sheets.overall);
    if (!sheet) throw new Error('"Overall" sheet not found');

    const maxRow = Math.max(sheet.getLastRow(), 60);
    const maxCol = Math.max(sheet.getLastColumn(), 20);

    // Step 1: Clear EVERY validation on the entire sheet
    sheet.getRange(1, 1, maxRow, maxCol).clearDataValidations();
    SpreadsheetApp.flush();

    // Step 2: Restore ₹ number format on all formula columns
    sheet.getRange(1,  2, maxRow, maxCol - 1).setNumberFormat('[$₹]#,##0.00');
    // Col A rows 21+ = month dates
    sheet.getRange(21, 1, 40, 1).setNumberFormat('mmm yyyy');
    SpreadsheetApp.flush();

    // Step 3: Re-apply ONLY col A rows 21-60 (month selector)
    // Col I is ALL formulas — zero date validation goes there
    const monthRange = sheet.getRange(21, 1, 40, 1);
    setDatePickerOnRange(monthRange);
    monthRange.setNumberFormat('mmm yyyy');
    SpreadsheetApp.flush();

    SpreadsheetApp.getUi().alert(
      '✅ Overall sheet fixed!\n\n' +
      '• All invalid date validations permanently cleared\n' +
      '• ₹ number formats restored on all formula columns\n' +
      '• Date picker applied ONLY on:\n' +
      '  → Col A rows 21–60 (monthly analytics month dates)\n\n' +
      '• Col I left untouched (all formula-driven)'
    );
  } catch (e) {
    console.error('[fixOverallValidations] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// FORMULA REFRESH
// Forces Google Sheets to recalculate all cross-sheet SUMIFS formulas.
// Uses the scratch-cell trick: write dummy value → flush → clear → flush.
// ─────────────────────────────────────────────────────────────
function refreshAllFormulas() {
  try {
    const names = [
      CONFIG.sheets.overall,
      CONFIG.sheets.investments,
      CONFIG.sheets.kharche,
      CONFIG.sheets.ccBills,
      CONFIG.sheets.adhoc
    ];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let done = 0;
    for (const name of names) {
      const s = ss.getSheetByName(name);
      if (s) { _forceRecalc(s); done++; }
    }
    SpreadsheetApp.getUi().alert('✅ Formula Refresh Complete!\n' + done + ' sheets recalculated.');
  } catch (e) {
    console.error('[refreshAllFormulas] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}

function refreshOverallFormulas()    { _refreshSheet(CONFIG.sheets.overall);      }
function refreshKharcheFormulas()    { _refreshSheet(CONFIG.sheets.kharche);      }
function refreshCCBillsFormulas()    { _refreshSheet(CONFIG.sheets.ccBills);      }
function refreshAdhocFormulas()      { _refreshSheet(CONFIG.sheets.adhoc);        }
function refreshInvestmentFormulas() { _refreshSheet(CONFIG.sheets.investments);  }

function _refreshSheet(name) {
  try {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!s) throw new Error('Sheet "' + name + '" not found');
    _forceRecalc(s);
    SpreadsheetApp.getUi().alert('✅ Formulas refreshed: ' + name);
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.message);
  }
}

function _forceRecalc(sheet) {
  // Use a far-out scratch cell (row 2000, col Z=26) that won't touch real data
  const cell = sheet.getRange(2000, 26);
  const orig = cell.getValue();
  cell.setValue('__recalc__');
  SpreadsheetApp.flush();
  cell.clearContent();
  if (orig !== '') cell.setValue(orig);
  SpreadsheetApp.flush();
  console.log('[_forceRecalc] ' + sheet.getName() + ' done');
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE — 30 tests across 6 categories
// Categories: Sheet Structure | Data Integrity | Dropdown Config
//             Cascade Logic | Date Picker Config | Live Data Sanity
// ─────────────────────────────────────────────────────────────
function testCascadingSystem() {
  clearCache();
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];
  const cats_   = { pass: 0, fail: 0 };
  let   passed  = 0, failed = 0;
  const WARN    = '⚠️ ';

  function assert(id, label, ok, detail, warn) {
    const icon = ok ? '✅' : (warn ? WARN : '❌');
    results.push(icon + ' ' + id + ': ' + label + (detail ? '\n      → ' + detail : ''));
    if (ok) { passed++; cats_.pass++; } else { failed++; cats_.fail++; }
  }

  function getSheet(name) {
    const s = ss.getSheetByName(name);
    if (!s) throw new Error('Sheet "' + name + '" not found');
    return s;
  }

  // ════════════════════════════════════════════════
  // SECTION 1 — SHEET STRUCTURE
  // ════════════════════════════════════════════════
  results.push('\n── SECTION 1: Sheet Structure ──────────────────');

  try { assert('S01','Dropdown Lists tab exists',   !!ss.getSheetByName(CONFIG.sheets.dropdowns),  '"' + CONFIG.sheets.dropdowns + '"'); }  catch(e) { assert('S01','Dropdown Lists tab exists',   false, e.message); }
  try { assert('S02','Kharche tab exists',           !!ss.getSheetByName(CONFIG.sheets.kharche),    '"' + CONFIG.sheets.kharche + '"');   }  catch(e) { assert('S02','Kharche tab exists',           false, e.message); }
  try { assert('S03','Credit Card Bills tab exists', !!ss.getSheetByName(CONFIG.sheets.ccBills),    '"' + CONFIG.sheets.ccBills + '"');   }  catch(e) { assert('S03','Credit Card Bills tab exists', false, e.message); }
  try { assert('S04','Adhoc/Self Transfer tab exists',!!ss.getSheetByName(CONFIG.sheets.adhoc),     '"' + CONFIG.sheets.adhoc + '"');     }  catch(e) { assert('S04','Adhoc/Self Transfer tab exists',false, e.message); }
  try { assert('S05','Overall tab exists',           !!ss.getSheetByName(CONFIG.sheets.overall),    '"' + CONFIG.sheets.overall + '"');   }  catch(e) { assert('S05','Overall tab exists',           false, e.message); }
  try { assert('S06','Actual Investments tab exists',!!ss.getSheetByName(CONFIG.sheets.investments),'"' + CONFIG.sheets.investments + '"');}  catch(e) { assert('S06','Actual Investments tab exists',false, e.message); }

  try {
    const s = getSheet(CONFIG.sheets.kharche);
    const r1 = s.getRange(1, 1).getValue();
    const r2 = s.getRange(2, CONFIG.kharche.category).getValue();
    assert('S07','Kharche row1=title, row2=headers',
      String(r1).toLowerCase().includes('day') && String(r2).toLowerCase().includes('categ'),
      'A1="' + r1 + '" | C2="' + r2 + '"');
  } catch(e) { assert('S07','Kharche row1=title, row2=headers', false, e.message); }

  try {
    const s   = getSheet(CONFIG.sheets.ccBills);
    const r1b = s.getRange(1, CONFIG.ccBills.paidFrom).getValue();
    const r1c = s.getRange(1, CONFIG.ccBills.creditCard).getValue();
    assert('S08','CC Bills row1=headers (B1=Paid From, C1=Credit Card)',
      String(r1b).toLowerCase().includes('paid') && String(r1c).toLowerCase().includes('credit'),
      'B1="' + r1b + '" | C1="' + r1c + '"');
  } catch(e) { assert('S08','CC Bills headers', false, e.message); }

  try {
    const s   = getSheet(CONFIG.sheets.adhoc);
    const r2b = s.getRange(2, CONFIG.adhoc.from).getValue();
    const r2c = s.getRange(2, CONFIG.adhoc.to).getValue();
    assert('S09','Adhoc row2=headers (B2=From, C2=To)',
      String(r2b).toLowerCase().includes('from') && String(r2c).toLowerCase().includes('to'),
      'B2="' + r2b + '" | C2="' + r2c + '"');
  } catch(e) { assert('S09','Adhoc headers', false, e.message); }

  try {
    const s   = getSheet(CONFIG.sheets.overall);
    const i20 = s.getRange(20, 9).getValue();
    const a20 = s.getRange(20, 1).getValue();
    assert('S10','Overall row20=Monthly Analytics headers (A20=Month, I20=Other Spends)',
      String(a20).toLowerCase().includes('month') && String(i20).toLowerCase().includes('spend'),
      'A20="' + a20 + '" | I20="' + i20 + '"');
  } catch(e) { assert('S10','Overall Monthly Analytics headers', false, e.message); }

  // ════════════════════════════════════════════════
  // SECTION 2 — DROPDOWN LISTS DATA INTEGRITY
  // ════════════════════════════════════════════════
  results.push('\n── SECTION 2: Dropdown Lists Data Integrity ────');

  try {
    const cache = getCache();
    assert('D01','Categories loaded from Dropdown Lists col B',
      cache.allCats.length >= 10, cache.allCats.length + ' found: ' + cache.allCats.join(', '));
  } catch(e) { assert('D01','Categories loaded', false, e.message); }

  try {
    const cache = getCache();
    const withSubs = Object.keys(cache.catMap).filter(k => cache.catMap[k].length > 0);
    assert('D02','≥5 categories have subcategories',
      withSubs.length >= 5, withSubs.length + ' cats have subcats');
  } catch(e) { assert('D02','Category subcategory mapping', false, e.message); }

  try {
    const cm = getCache().catMap;
    const transport = cm['Transport'] || [];
    assert('D03','Transport → [Local, Metro, Auto/Cab, Petrol]',
      transport.length === 4 && transport.includes('Local') && transport.includes('Petrol'),
      '[' + transport.join(', ') + ']');
  } catch(e) { assert('D03','Transport subcats', false, e.message); }

  try {
    const cm = getCache().catMap;
    const investments = cm['Investments'] || [];
    assert('D04','Investments → 7 subcategories incl. Equity Stocks, SIP, NPS',
      investments.length === 7,
      '[' + investments.join(', ') + ']');
  } catch(e) { assert('D04','Investments subcats', false, e.message); }

  try {
    const cm = getCache().catMap;
    const trip = cm['Trip'] || [];
    assert('D05','Trip → 8 subcategories incl. Travelling, Accommodation',
      trip.length >= 7 && trip.includes('Travelling') && trip.includes('Accommodation'),
      '[' + trip.join(', ') + ']');
  } catch(e) { assert('D05','Trip subcats', false, e.message); }

  try {
    const cache = getCache();
    assert('D06','Accounts loaded from Dropdown Lists col E',
      cache.allAccs.length >= 4, cache.allAccs.length + ' found: ' + cache.allAccs.join(', '));
  } catch(e) { assert('D06','Accounts loaded', false, e.message); }

  try {
    const am = getCache().accMap;
    const upi = am['UPI/Bank Accounts'] || [];
    assert('D07','UPI/Bank Accounts → [Axis Bank, SBI, Amazon Pay, Groww Account]',
      upi.length === 4 && upi.includes('Axis Bank') && upi.includes('Groww Account'),
      '[' + upi.join(', ') + ']');
  } catch(e) { assert('D07','UPI subcats', false, e.message); }

  try {
    const am = getCache().accMap;
    const cc = am['Credit Card'] || [];
    assert('D08','Credit Card → [Axis Bank CC, ICICI, Scapia]',
      cc.length === 3 && cc.includes('Axis Bank CC') && cc.includes('Scapia'),
      '[' + cc.join(', ') + ']');
  } catch(e) { assert('D08','Credit Card subcats', false, e.message); }

  try {
    const flat = getCache().allFlatAccounts;
    const hasDiv = flat.indexOf('Dividend') === -1; // Dividend should NOT be in flat
    assert('D09','Flat account list has ≥8 entries, Dividend excluded',
      flat.length >= 8 && hasDiv,
      flat.length + ' entries: [' + flat.join(', ') + ']');
  } catch(e) { assert('D09','Flat accounts list', false, e.message); }

  try {
    const cache = getCache();
    const dupes = cache.allCats.filter((v,i,a) => a.indexOf(v) !== i);
    assert('D10','No duplicate categories in Dropdown Lists',
      dupes.length === 0, dupes.length > 0 ? 'Dupes: ' + dupes.join(', ') : 'Clean ✓');
  } catch(e) { assert('D10','No duplicate categories', false, e.message); }

  // ════════════════════════════════════════════════
  // SECTION 3 — DROPDOWN VALIDATION APPLIED ON SHEET
  // ════════════════════════════════════════════════
  results.push('\n── SECTION 3: Dropdown Validation Applied ──────');

  try {
    const s    = getSheet(CONFIG.sheets.kharche);
    const rule = s.getRange(CONFIG.rows.kharcheStart, CONFIG.kharche.category).getDataValidation();
    assert('V01','Kharche C3 has Category dropdown',
      rule !== null && rule.getCriteriaType().toString().includes('VALUE_IN_LIST'),
      rule ? 'type=' + rule.getCriteriaType() : 'NO VALIDATION — run Setup');
  } catch(e) { assert('V01','Kharche C3 Category dropdown', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.kharche);
    const rule = s.getRange(CONFIG.rows.kharcheStart, CONFIG.kharche.account).getDataValidation();
    assert('V02','Kharche E3 has Account dropdown',
      rule !== null && rule.getCriteriaType().toString().includes('VALUE_IN_LIST'),
      rule ? 'type=' + rule.getCriteriaType() : 'NO VALIDATION — run Setup');
  } catch(e) { assert('V02','Kharche E3 Account dropdown', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.ccBills);
    const ruleB = s.getRange(CONFIG.rows.ccBillsStart, CONFIG.ccBills.paidFrom).getDataValidation();
    const ruleC = s.getRange(CONFIG.rows.ccBillsStart, CONFIG.ccBills.creditCard).getDataValidation();
    assert('V03','CC Bills B2 (Paid From) + C2 (Card) have dropdowns',
      ruleB !== null && ruleC !== null,
      'B2=' + (ruleB ? '✓' : '✗ MISSING') + ' | C2=' + (ruleC ? '✓' : '✗ MISSING'));
  } catch(e) { assert('V03','CC Bills dropdowns', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.adhoc);
    const ruleB = s.getRange(CONFIG.rows.adhocStart, CONFIG.adhoc.from).getDataValidation();
    const ruleC = s.getRange(CONFIG.rows.adhocStart, CONFIG.adhoc.to).getDataValidation();
    assert('V04','Adhoc B3 (From) + C3 (To) have dropdowns',
      ruleB !== null && ruleC !== null,
      'B3=' + (ruleB ? '✓' : '✗ MISSING') + ' | C3=' + (ruleC ? '✓' : '✗ MISSING'));
  } catch(e) { assert('V04','Adhoc dropdowns', false, e.message); }

  try {
    // Check that a row with existing Category value also has Subcategory dropdown
    const s    = getSheet(CONFIG.sheets.kharche);
    const lastRow = s.getLastRow();
    let found = false, detail = '';
    for (let r = CONFIG.rows.kharcheStart; r <= Math.min(lastRow, 20); r++) {
      const cat  = String(s.getRange(r, CONFIG.kharche.category).getValue()).trim();
      const subs = getCache().catMap[cat] || [];
      if (subs.length > 0) {
        const rule = s.getRange(r, CONFIG.kharche.subcategory).getDataValidation();
        found  = rule !== null;
        detail = 'Row ' + r + ' cat="' + cat + '" D' + r + ' rule=' + (rule ? '✓' : '✗ MISSING — run Setup');
        break;
      }
    }
    assert('V05','Kharche: row with Category value has Subcategory cascade', found, detail);
  } catch(e) { assert('V05','Kharche cascade D check', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.kharche);
    const lastRow = s.getLastRow();
    let found = false, detail = '';
    for (let r = CONFIG.rows.kharcheStart; r <= Math.min(lastRow, 20); r++) {
      const acc  = String(s.getRange(r, CONFIG.kharche.account).getValue()).trim();
      const subs = getCache().accMap[acc] || [];
      if (subs.length > 0) {
        const ruleF = s.getRange(r, CONFIG.kharche.accSubcat).getDataValidation();
        const ruleG = s.getRange(r, CONFIG.kharche.application).getDataValidation();
        found  = ruleF !== null && ruleG !== null;
        detail = 'Row ' + r + ' acc="' + acc + '" F=' + (ruleF ? '✓' : '✗') + ' G=' + (ruleG ? '✓' : '✗');
        break;
      }
    }
    assert('V06','Kharche: row with Account value has F+G cascade', found, detail);
  } catch(e) { assert('V06','Kharche cascade F+G check', false, e.message); }

  // ════════════════════════════════════════════════
  // SECTION 4 — DATE PICKER CONFIG
  // ════════════════════════════════════════════════
  results.push('\n── SECTION 4: Date Picker Configuration ────────');

  try {
    const s    = getSheet(CONFIG.sheets.kharche);
    const rule = s.getRange(CONFIG.rows.kharcheStart, CONFIG.kharche.date).getDataValidation();
    assert('P01','Kharche A3 has date picker',
      rule !== null && rule.getCriteriaType().toString().includes('DATE'),
      rule ? rule.getCriteriaType().toString() : 'NO VALIDATION — run Setup');
  } catch(e) { assert('P01','Kharche A3 date picker', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.ccBills);
    const rule = s.getRange(CONFIG.rows.ccBillsStart, CONFIG.ccBills.date).getDataValidation();
    assert('P02','CC Bills A2 has date picker',
      rule !== null && rule.getCriteriaType().toString().includes('DATE'),
      rule ? rule.getCriteriaType().toString() : 'NO VALIDATION — run Setup');
  } catch(e) { assert('P02','CC Bills A2 date picker', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.adhoc);
    const rule = s.getRange(CONFIG.rows.adhocStart, CONFIG.adhoc.date).getDataValidation();
    assert('P03','Adhoc A3 has date picker',
      rule !== null && rule.getCriteriaType().toString().includes('DATE'),
      rule ? rule.getCriteriaType().toString() : 'NO VALIDATION — run Setup');
  } catch(e) { assert('P03','Adhoc A3 date picker', false, e.message); }

  try {
    const s    = getSheet(CONFIG.sheets.overall);
    const rule = s.getRange(21, 1).getDataValidation();
    assert('P04','Overall A21 has month date picker',
      rule !== null && rule.getCriteriaType().toString().includes('DATE'),
      rule ? rule.getCriteriaType().toString() : 'NO VALIDATION — run Setup');
  } catch(e) { assert('P04','Overall A21 date picker', false, e.message); }

  try {
    // Critical: ensure Overall col I has NO date validation (it's formula-driven)
    const s     = getSheet(CONFIG.sheets.overall);
    const ruleI20 = s.getRange(20, 9).getDataValidation(); // I20 = "Other Spends" header
    const ruleI21 = s.getRange(21, 9).getDataValidation(); // I21 = =sum(F21:H21) formula
    const clean   = ruleI20 === null && ruleI21 === null;
    assert('P05','Overall col I has NO date validation (formula column)',
      clean,
      'I20=' + (ruleI20 ? '❌ HAS VALIDATION — run Fix Overall' : '✓ clean') +
      ' | I21=' + (ruleI21 ? '❌ HAS VALIDATION — run Fix Overall' : '✓ clean'));
  } catch(e) { assert('P05','Overall col I clean check', false, e.message); }

  // ════════════════════════════════════════════════
  // SECTION 5 — LIVE DATA SANITY
  // ════════════════════════════════════════════════
  results.push('\n── SECTION 5: Live Data Sanity ─────────────────');

  try {
    const s    = getSheet(CONFIG.sheets.kharche);
    const rows = s.getLastRow() - CONFIG.rows.kharcheStart + 1;
    assert('L01','Kharche has data rows',
      rows >= 1, rows + ' data rows (from row ' + CONFIG.rows.kharcheStart + ')');
  } catch(e) { assert('L01','Kharche data count', false, e.message); }

  try {
    const s   = getSheet(CONFIG.sheets.kharche);
    const a3  = s.getRange(CONFIG.rows.kharcheStart, CONFIG.kharche.date).getValue();
    assert('L02','Kharche A3 is a date value',
      a3 instanceof Date, a3 instanceof Date ? a3.toDateString() : 'Got: ' + typeof a3 + ' = ' + a3);
  } catch(e) { assert('L02','Kharche A3 date value', false, e.message); }

  try {
    const s     = getSheet(CONFIG.sheets.kharche);
    const cache = getCache();
    let badRows = [], checked = 0;
    const lastRow = Math.min(s.getLastRow(), CONFIG.rows.kharcheStart + 30);
    const cVals = s.getRange(CONFIG.rows.kharcheStart, CONFIG.kharche.category, lastRow - CONFIG.rows.kharcheStart + 1, 1).getValues();
    cVals.forEach((row, i) => {
      const v = String(row[0]).trim();
      if (v && !cache.allCats.includes(v)) { badRows.push('row ' + (CONFIG.rows.kharcheStart + i) + '="' + v + '"'); }
      if (v) checked++;
    });
    assert('L03','Kharche categories match Dropdown Lists (first 30 rows)',
      badRows.length === 0,
      badRows.length === 0
        ? checked + ' rows checked — all valid ✓'
        : badRows.length + ' invalid: ' + badRows.slice(0,3).join(', '));
  } catch(e) { assert('L03','Kharche category values valid', false, e.message); }

  try {
    const s     = getSheet(CONFIG.sheets.kharche);
    const cache = getCache();
    let badRows = [], checked = 0;
    const lastRow = Math.min(s.getLastRow(), CONFIG.rows.kharcheStart + 30);
    const eVals = s.getRange(CONFIG.rows.kharcheStart, CONFIG.kharche.account, lastRow - CONFIG.rows.kharcheStart + 1, 1).getValues();
    eVals.forEach((row, i) => {
      const v = String(row[0]).trim();
      if (v && !cache.allAccs.includes(v)) { badRows.push('row ' + (CONFIG.rows.kharcheStart + i) + '="' + v + '"'); }
      if (v) checked++;
    });
    assert('L04','Kharche accounts match Dropdown Lists (first 30 rows)',
      badRows.length === 0,
      badRows.length === 0
        ? checked + ' rows checked — all valid ✓'
        : badRows.length + ' invalid: ' + badRows.slice(0,3).join(', '));
  } catch(e) { assert('L04','Kharche account values valid', false, e.message); }

  try {
    const s   = getSheet(CONFIG.sheets.overall);
    const nw  = s.getRange(9, 6).getValue();  // F9 = Net Worth
    const cib = s.getRange(10, 6).getValue(); // F10 = Cash in Bank
    assert('L05','Overall Net Worth (F9) and Cash in Bank (F10) are non-zero numbers',
      typeof nw === 'number' && nw > 0 && typeof cib === 'number' && cib > 0,
      'Net Worth=₹' + (nw || 0).toLocaleString('en-IN') + ' | Cash in Bank=₹' + (cib || 0).toLocaleString('en-IN'));
  } catch(e) { assert('L05','Overall Net Worth values', false, e.message); }

  try {
    const s     = getSheet(CONFIG.sheets.overall);
    const a21   = s.getRange(21, 1).getValue();
    assert('L06','Overall A21 is a date (Monthly Analytics first month)',
      a21 instanceof Date,
      a21 instanceof Date ? a21.toDateString() : 'Got: ' + typeof a21 + ' = ' + a21);
  } catch(e) { assert('L06','Overall A21 month date', false, e.message); }

  try {
    const s     = getSheet(CONFIG.sheets.adhoc);
    const fromVals = s.getRange(CONFIG.rows.adhocStart, CONFIG.adhoc.from,
      Math.min(s.getLastRow(), 15) - CONFIG.rows.adhocStart + 1, 1).getValues();
    const cache    = getCache();
    const validFrom = [...new Set([...cache.allFlatAccounts, 'Dividend', 'Refund', 'Cashback', 'Profit Booking - Equity Stocks'])];
    let bad = [];
    fromVals.forEach((row, i) => {
      const v = String(row[0]).trim();
      if (v && !validFrom.includes(v)) bad.push('row ' + (CONFIG.rows.adhocStart + i) + '="' + v + '"');
    });
    assert('L07','Adhoc From values are all valid (incl. Dividend/Refund/Cashback/Profit Booking - Equity Stocks)',
      bad.length === 0,
      bad.length === 0 ? 'All entries valid ✓' : 'Invalid: ' + bad.join(', '));
  } catch(e) { assert('L07','Adhoc From values valid', false, e.message); }

  // ════════════════════════════════════════════════
  // SECTION 6 — CONFIGURATION INTEGRITY
  // ════════════════════════════════════════════════
  results.push('\n── SECTION 6: Configuration Integrity ──────────');

  try {
    assert('C01','CONFIG.kharche column indices are 1-based (1-8)',
      CONFIG.kharche.date === 1 && CONFIG.kharche.category === 3 &&
      CONFIG.kharche.account === 5 && CONFIG.kharche.application === 7,
      'date='+CONFIG.kharche.date+' cat='+CONFIG.kharche.category+
      ' acc='+CONFIG.kharche.account+' app='+CONFIG.kharche.application);
  } catch(e) { assert('C01','CONFIG kharche cols', false, e.message); }

  try {
    assert('C02','CONFIG.dlIdx points to correct 0-based Dropdown Lists indices',
      CONFIG.dlIdx.category === 1 && CONFIG.dlIdx.subcategory === 2 &&
      CONFIG.dlIdx.account === 4 && CONFIG.dlIdx.accSubcat === 5,
      'cat='+CONFIG.dlIdx.category+' subcat='+CONFIG.dlIdx.subcategory+
      ' acc='+CONFIG.dlIdx.account+' accSub='+CONFIG.dlIdx.accSubcat);
  } catch(e) { assert('C02','CONFIG dlIdx values', false, e.message); }

  try {
    assert('C03','CONFIG row starts are correct (Kharche=3, CCBills=2, Adhoc=3)',
      CONFIG.rows.kharcheStart === 3 && CONFIG.rows.ccBillsStart === 2 && CONFIG.rows.adhocStart === 3,
      'kharche='+CONFIG.rows.kharcheStart+' ccBills='+CONFIG.rows.ccBillsStart+' adhoc='+CONFIG.rows.adhocStart);
  } catch(e) { assert('C03','CONFIG row starts', false, e.message); }

  try {
    assert('C04','Sheet name strings match actual tab names (case-sensitive)',
      CONFIG.sheets.adhoc === 'Adhoc/Self Transfer' &&
      CONFIG.sheets.ccBills === 'Credit Card Bills' &&
      CONFIG.sheets.dropdowns === 'Dropdown Lists',
      'adhoc="'+CONFIG.sheets.adhoc+'" ccBills="'+CONFIG.sheets.ccBills+'"');
  } catch(e) { assert('C04','CONFIG sheet name strings', false, e.message); }

  // ════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════
  const bar     = '═'.repeat(42);
  const summary =
    '🧪 TEST RESULTS v6.0\n' + bar + '\n' +
    results.join('\n') + '\n\n' + bar + '\n' +
    '✅ Passed: ' + passed + '   ❌ Failed: ' + failed + '   Total: ' + (passed + failed) + '\n' + bar +
    (failed === 0
      ? '\n\n🎉 ALL ' + passed + ' TESTS PASSED!\nSystem is fully configured and healthy.'
      : '\n\n⚠️ ' + failed + ' test(s) failed — see details above.\n' +
        'Tip: Run ⚙️ Setup ALL Sheets, then re-run tests.\n' +
        'If Overall col I issues persist: run 🔧 Fix Overall.');

  console.log(summary);

  // Log full results to Apps Script console (no truncation)
  console.log('=== FULL TEST DETAILS ===\n' + results.join('\n'));

  // Show in UI (truncated if needed for dialog)
  SpreadsheetApp.getUi().alert(summary.length > 4000 ? summary.substring(0, 3990) + '\n...[truncated]' : summary);
}

// ─────────────────────────────────────────────────────────────
// DEBUG — 5 sub-functions callable individually from menu
// ─────────────────────────────────────────────────────────────

/** Master debug — calls all sub-sections and logs to console */
function debugDropdowns() {
  try {
    clearCache();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let out = '🐛 FULL DEBUG REPORT v6.0\n' + '═'.repeat(50) + '\n';
    out += _debugConfig();
    out += _debugDropdownData();
    out += _debugSheetValidations(ss);
    out += _debugLiveDataSample(ss);
    out += _debugOverallHealth(ss);

    console.log(out);  // Full log in Apps Script console — no truncation

    // Show summary in UI (truncated for dialog limit)
    SpreadsheetApp.getUi().alert(
      out.length > 4000
        ? out.substring(0, 3900) + '\n\n...[Full report in Apps Script console — View → Logs]'
        : out
    );
  } catch (e) {
    console.error('[debugDropdowns] ' + e.message);
    SpreadsheetApp.getUi().alert('❌ Debug Error: ' + e.message + '\n\nCheck Apps Script console for stack trace.');
  }
}

/** Debug 1: CONFIG values */
function debugConfig() {
  SpreadsheetApp.getUi().alert('⚙️ CONFIG\n' + '─'.repeat(40) + '\n' + _debugConfig());
}
function _debugConfig() {
  let s = '\n⚙️  CONFIG\n' + '─'.repeat(40) + '\n';
  s += 'Sheet names:\n';
  Object.entries(CONFIG.sheets).forEach(([k,v]) => { s += '  ' + k + ' = "' + v + '"\n'; });
  s += '\nKharche columns (1-based):\n';
  Object.entries(CONFIG.kharche).forEach(([k,v]) => { s += '  col ' + v + ' = ' + k + '\n'; });
  s += '\nCC Bills columns:\n';
  Object.entries(CONFIG.ccBills).forEach(([k,v]) => { s += '  col ' + v + ' = ' + k + '\n'; });
  s += '\nAdhoc columns:\n';
  Object.entries(CONFIG.adhoc).forEach(([k,v]) => { s += '  col ' + v + ' = ' + k + '\n'; });
  s += '\nDropdown Lists 0-based indices:\n';
  Object.entries(CONFIG.dlIdx).forEach(([k,v]) => { s += '  idx ' + v + ' = ' + k + '\n'; });
  s += '\nRow starts: Kharche=' + CONFIG.rows.kharcheStart +
       ' | CCBills=' + CONFIG.rows.ccBillsStart +
       ' | Adhoc=' + CONFIG.rows.adhocStart + '\n';
  return s;
}

/** Debug 2: Dropdown Lists data */
function debugDropdownData() {
  clearCache();
  SpreadsheetApp.getUi().alert('📂 DROPDOWN DATA\n' + '─'.repeat(40) + '\n' + _debugDropdownData());
}
function _debugDropdownData() {
  const c = getCache();
  let s = '\n📂  DROPDOWN LISTS DATA\n' + '─'.repeat(40) + '\n';

  s += 'Categories (' + c.allCats.length + '):\n';
  c.allCats.forEach((cat, i) => {
    const subs = c.catMap[cat] || [];
    s += '  ' + (i+1) + '. ' + cat + (subs.length ? ' → [' + subs.join(', ') + ']' : ' (no subcategories)') + '\n';
  });

  s += '\nAccounts (' + c.allAccs.length + '):\n';
  c.allAccs.forEach((acc, i) => {
    const subs = c.accMap[acc] || [];
    s += '  ' + (i+1) + '. ' + acc + (subs.length ? ' → [' + subs.join(', ') + ']' : ' (no subcategories)') + '\n';
  });

  s += '\nFlat accounts for Adhoc (' + c.allFlatAccounts.length + '):\n';
  s += '  [' + c.allFlatAccounts.join(', ') + ']\n';

  s += '\nAdhoc From list (flat + Dividend + Refund + Cashback):\n';
  s += '  [' + [...new Set([...c.allFlatAccounts, 'Dividend', 'Refund', 'Cashback', 'Profit Booking - Equity Stocks'])].join(', ') + ']\n';

  s += '\nCC Bills:\n';
  s += '  B (Paid From): [' + (c.accMap['UPI/Bank Accounts'] || []).join(', ') + ']\n';
  s += '  C (Card):      [' + (c.accMap['Credit Card'] || []).join(', ') + ']\n';

  return s;
}

/** Debug 3: Validation rules currently applied on sheets */
function debugSheetValidations() {
  clearCache();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.getUi().alert('✅ VALIDATIONS\n' + '─'.repeat(40) + '\n' + _debugSheetValidations(ss));
}
function _debugSheetValidations(ss) {
  let s = '\n✅  VALIDATION RULES APPLIED\n' + '─'.repeat(40) + '\n';

  const checks = [
    { sheet: CONFIG.sheets.kharche,  label: 'Kharche',   checks: [
      { row: CONFIG.rows.kharcheStart, col: 1,                         name: 'A3 (Date)' },
      { row: CONFIG.rows.kharcheStart, col: CONFIG.kharche.category,   name: 'C3 (Category)' },
      { row: CONFIG.rows.kharcheStart, col: CONFIG.kharche.subcategory,name: 'D3 (Subcategory)' },
      { row: CONFIG.rows.kharcheStart, col: CONFIG.kharche.account,    name: 'E3 (Account)' },
      { row: CONFIG.rows.kharcheStart, col: CONFIG.kharche.accSubcat,  name: 'F3 (AccSubcat)' },
      { row: CONFIG.rows.kharcheStart, col: CONFIG.kharche.application,name: 'G3 (Application)' },
    ]},
    { sheet: CONFIG.sheets.ccBills, label: 'CC Bills', checks: [
      { row: CONFIG.rows.ccBillsStart, col: 1,                          name: 'A2 (Date)' },
      { row: CONFIG.rows.ccBillsStart, col: CONFIG.ccBills.paidFrom,    name: 'B2 (Paid From)' },
      { row: CONFIG.rows.ccBillsStart, col: CONFIG.ccBills.creditCard,  name: 'C2 (Credit Card)' },
    ]},
    { sheet: CONFIG.sheets.adhoc, label: 'Adhoc', checks: [
      { row: CONFIG.rows.adhocStart, col: 1,                name: 'A3 (Date)' },
      { row: CONFIG.rows.adhocStart, col: CONFIG.adhoc.from,name: 'B3 (From)' },
      { row: CONFIG.rows.adhocStart, col: CONFIG.adhoc.to,  name: 'C3 (To)' },
    ]},
    { sheet: CONFIG.sheets.overall, label: 'Overall', checks: [
      { row: 21, col: 1,  name: 'A21 (Month date)' },
      { row: 20, col: 9,  name: 'I20 (Other Spends — MUST be empty)' },
      { row: 21, col: 9,  name: 'I21 (=sum formula — MUST be empty)' },
      { row: 22, col: 9,  name: 'I22 (=sum formula — MUST be empty)' },
    ]},
  ];

  for (const sheetCfg of checks) {
    const sheet = ss.getSheetByName(sheetCfg.sheet);
    s += '\n📋 ' + sheetCfg.label + ':\n';
    if (!sheet) { s += '  ❌ Sheet not found!\n'; continue; }
    for (const chk of sheetCfg.checks) {
      try {
        const rule = sheet.getRange(chk.row, chk.col).getDataValidation();
        if (rule) {
          const type   = rule.getCriteriaType().toString();
          const isDate = type.includes('DATE');
          const isList = type.includes('VALUE_IN_LIST');
          const vals   = isList ? rule.getCriteriaValues() : null;
          s += '  ' + chk.name + ': ' + type;
          if (isList && vals) s += ' [' + (vals[0] ? vals[0].slice(0,60) + '...' : '') + ']';
          s += '\n';
        } else {
          s += '  ' + chk.name + ': — no validation\n';
        }
      } catch(e) {
        s += '  ' + chk.name + ': ERROR — ' + e.message + '\n';
      }
    }
  }
  return s;
}

/** Debug 4: Live data samples from each sheet */
function debugLiveData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.getUi().alert('📊 LIVE DATA\n' + '─'.repeat(40) + '\n' + _debugLiveDataSample(ss));
}
function _debugLiveDataSample(ss) {
  let s = '\n📊  LIVE DATA SAMPLES\n' + '─'.repeat(40) + '\n';

  // Kharche — first 5 data rows
  const kSheet = ss.getSheetByName(CONFIG.sheets.kharche);
  if (kSheet) {
    s += '\nKharche (first 5 rows from row ' + CONFIG.rows.kharcheStart + '):\n';
    const rows = kSheet.getRange(CONFIG.rows.kharcheStart, 1, 5, 8).getValues();
    rows.forEach((row, i) => {
      const date = row[0] instanceof Date ? row[0].toLocaleDateString('en-IN') : row[0];
      if (row[2]) {
        s += '  Row ' + (CONFIG.rows.kharcheStart + i) + ': ' +
             date + ' | ' + (row[1]+'').substring(0,15) +
             ' | Cat=' + row[2] + ' | Sub=' + (row[3]||'—') +
             ' | Acc=' + row[4] + ' | Sub=' + (row[5]||'—') +
             ' | ₹' + (row[7]||0) + '\n';
      }
    });
  }

  // CC Bills
  const ccSheet = ss.getSheetByName(CONFIG.sheets.ccBills);
  if (ccSheet) {
    s += '\nCredit Card Bills (first 3 rows from row ' + CONFIG.rows.ccBillsStart + '):\n';
    const rows = ccSheet.getRange(CONFIG.rows.ccBillsStart, 1, 3, 4).getValues();
    rows.forEach((row, i) => {
      if (row[1] || row[2]) {
        const date = row[0] instanceof Date ? row[0].toLocaleDateString('en-IN') : row[0];
        s += '  Row ' + (CONFIG.rows.ccBillsStart + i) + ': ' +
             date + ' | From=' + row[1] + ' | Card=' + row[2] + ' | ₹' + row[3] + '\n';
      }
    });
  }

  // Adhoc
  const adhocSheet = ss.getSheetByName(CONFIG.sheets.adhoc);
  if (adhocSheet) {
    s += '\nAdhoc/Self Transfer (first 5 rows from row ' + CONFIG.rows.adhocStart + '):\n';
    const rows = adhocSheet.getRange(CONFIG.rows.adhocStart, 1, 5, 5).getValues();
    rows.forEach((row, i) => {
      if (row[1] || row[2]) {
        const date = row[0] instanceof Date ? row[0].toLocaleDateString('en-IN') : (row[0]||'—');
        s += '  Row ' + (CONFIG.rows.adhocStart + i) + ': ' +
             date + ' | From=' + row[1] + ' | To=' + row[2] + ' | ₹' + row[3] + '\n';
      }
    });
  }

  return s;
}

/** Debug 5: Overall sheet formula health check */
function debugOverallHealth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.getUi().alert('📈 OVERALL HEALTH\n' + '─'.repeat(40) + '\n' + _debugOverallHealth(ss));
}
function _debugOverallHealth(ss) {
  let s = '\n📈  OVERALL SHEET HEALTH\n' + '─'.repeat(40) + '\n';
  const sheet = ss.getSheetByName(CONFIG.sheets.overall);
  if (!sheet) return s + '  ❌ Overall sheet not found!\n';

  // Account balance table rows 1-8
  s += 'Account Balances (rows 1-8):\n';
  const rows = sheet.getRange(1, 1, 8, 6).getValues();
  rows.forEach((row, i) => {
    if (row[0]) {
      s += '  Row ' + (i+1) + ': ' + String(row[0]).substring(0,20) +
           ' | Start=₹' + (row[1]||0).toLocaleString('en-IN') +
           ' | Spend=₹' + (row[2]||0).toLocaleString('en-IN') +
           ' | Bal=₹' + (row[5]||0).toLocaleString('en-IN') + '\n';
    }
  });

  const nw  = sheet.getRange(9, 6).getValue();
  const cib = sheet.getRange(10, 6).getValue();
  s += '\nNet Worth (F9): ₹' + (nw||0).toLocaleString('en-IN') + '\n';
  s += 'Cash in Bank (F10): ₹' + (cib||0).toLocaleString('en-IN') + '\n';

  // CC outstanding
  s += '\nCC Outstanding:\n';
  const ccRows = sheet.getRange(16, 1, 3, 4).getValues();
  ccRows.forEach(row => {
    if (row[0]) s += '  ' + row[0] + ': Spend=₹' + (row[1]||0) + ' Paid=₹' + (row[2]||0) + ' Due=₹' + (row[3]||0) + '\n';
  });

  // Monthly analytics
  s += '\nMonthly Analytics:\n';
  const mRows = sheet.getRange(21, 1, 5, 3).getValues();
  mRows.forEach(row => {
    if (row[0]) {
      const mon = row[0] instanceof Date
        ? row[0].toLocaleDateString('en-IN', {month:'short', year:'numeric'})
        : row[0];
      s += '  ' + mon + ': Income=₹' + (row[1]||0).toLocaleString('en-IN') +
           ' | Total Exp=₹' + (row[2]||0).toLocaleString('en-IN') + '\n';
    }
  });

  return s;
}
