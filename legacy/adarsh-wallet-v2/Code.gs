// ============================================================
//  AdarshWallet — Google Apps Script Backend  (Code.gs)
//  Works with Net_worth_Tracker.xlsx structure
//  Deploy as: Extensions → Apps Script → Deploy → Web App
//  Access: "Anyone" | Execute as: "Me"
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

// Sheet names (match your actual sheet names exactly)
const SHEETS = {
  OVERALL: 'Overall',
  KHARCHE: 'Kharche',
  INVESTMENTS: 'Actual Investments',
  CC_BILLS: 'Credit Card Bills',
  ADHOC: 'AdhocSelf Transfer',
};

// Kharche sheet column mapping (1-indexed)
const COL = {
  DATE: 1,         // A
  PARTICULARS: 2,  // B
  CATEGORY: 3,     // C
  SUBCATEGORY: 4,  // D
  ACCOUNT: 5,      // E
  ACCOUNT_SUB: 6,  // F
  APP: 7,          // G
  AMOUNT: 8,       // H
};

// Category list column in Kharche (column K = 11)
const CAT_LIST_COL = 11;

// ── CORS headers ────────────────────────────────────────────
function setCORSHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── GET handler ─────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action || 'getDashboard';
    let result;

    switch (action) {
      case 'getDashboard':
        result = getDashboard();
        break;
      case 'getExpenses':
        result = getExpenses(e.parameter.month);
        break;
      case 'getMetadata':
        result = getMetadata();
        break;
      case 'getNetWorth':
        result = getNetWorth();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    const output = ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    return setCORSHeaders(output);

  } catch (err) {
    const output = ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
    return setCORSHeaders(output);
  }
}

// ── POST handler ────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'addExpense';
    let result;

    switch (action) {
      case 'addExpense':
        result = addExpense(data);
        break;
      case 'addCCBill':
        result = addCCBill(data);
        break;
      case 'updateBalance':
        result = updateBalance(data);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    const output = ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    return setCORSHeaders(output);

  } catch (err) {
    const output = ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
    return setCORSHeaders(output);
  }
}

// ── getDashboard ────────────────────────────────────────────
function getDashboard() {
  const overallSheet = SS.getSheetByName(SHEETS.OVERALL);
  const investSheet = SS.getSheetByName(SHEETS.INVESTMENTS);
  const ccSheet = SS.getSheetByName(SHEETS.CC_BILLS);

  // Accounts from Overall sheet (rows 1–6, cols A–F)
  const overallData = overallSheet.getDataRange().getValues();
  const accounts = [];
  let totalBalance = 0;

  for (let i = 1; i < overallData.length; i++) {
    const row = overallData[i];
    if (!row[0]) continue;
    const name = row[0];
    const balance = parseFloat(row[5]) || 0; // Current Balance = col F (index 5)
    accounts.push({ name, balance });
    totalBalance += balance;
  }

  // Investments
  const investData = investSheet ? investSheet.getDataRange().getValues() : [];
  const investments = [];
  for (let i = 1; i < investData.length - 1; i++) {
    const row = investData[i];
    if (row[0] && row[1]) {
      investments.push({ type: row[0], amount: parseFloat(row[1]) || 0 });
    }
  }

  // Credit card bills
  const ccData = ccSheet ? ccSheet.getDataRange().getValues() : [];
  const creditCards = [];
  for (let i = 1; i < ccData.length; i++) {
    const row = ccData[i];
    if (row[2] && row[3]) {
      creditCards.push({
        date: formatDate(row[0]),
        card: row[2],
        amount: parseFloat(row[3]) || 0,
      });
    }
  }

  // Monthly spend this month
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const expenses = getExpensesRaw(monthKey);
  const monthlySpend = expenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return {
    accounts,
    netWorth: totalBalance,
    monthlySpend,
    investments,
    creditCards,
    lastUpdated: new Date().toISOString(),
  };
}

// ── getExpenses ─────────────────────────────────────────────
function getExpenses(monthFilter) {
  const expenses = getExpensesRaw(monthFilter);
  return { expenses, count: expenses.length, month: monthFilter };
}

function getExpensesRaw(monthFilter) {
  const sheet = SS.getSheetByName(SHEETS.KHARCHE);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const expenses = [];

  // Data starts at row index 2 (row 1 = header labels, row 2 = column headers)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row[COL.DATE - 1] || !row[COL.AMOUNT - 1]) continue;

    const date = row[COL.DATE - 1];
    const dateStr = date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : String(date).substring(0, 10);

    if (monthFilter && !dateStr.startsWith(monthFilter)) continue;

    expenses.push({
      id: i,
      date: dateStr,
      particulars: row[COL.PARTICULARS - 1] || '',
      category: row[COL.CATEGORY - 1] || '',
      subcategory: row[COL.SUBCATEGORY - 1] || '',
      account: row[COL.ACCOUNT - 1] || '',
      accountSub: row[COL.ACCOUNT_SUB - 1] || '',
      application: row[COL.APP - 1] || '',
      amount: parseFloat(row[COL.AMOUNT - 1]) || 0,
    });
  }
  return expenses;
}

// ── addExpense ───────────────────────────────────────────────
function addExpense(data) {
  const sheet = SS.getSheetByName(SHEETS.KHARCHE);
  if (!sheet) return { error: 'Kharche sheet not found' };

  // Validate
  if (!data.amount || isNaN(parseFloat(data.amount))) {
    return { error: 'Invalid amount' };
  }

  const dateVal = data.date ? new Date(data.date) : new Date();
  const rowData = [
    dateVal,
    data.particulars || '',
    data.category || 'Others',
    data.subcategory || '',
    data.account || 'UPI/Bank Accounts',
    data.accountSub || '',
    data.application || '',
    parseFloat(data.amount),
    '', '', // empty cols I, J
  ];

  // Find first empty row after row 2
  const lastRow = sheet.getLastRow();
  const targetRow = lastRow + 1;
  sheet.getRange(targetRow, COL.DATE, 1, rowData.length).setValues([rowData]);

  // Format date cell
  sheet.getRange(targetRow, COL.DATE).setNumberFormat('dd-mmm-yyyy');

  // Auto-add new category to category list if not already there
  if (data.category) {
    addCategoryIfNew(sheet, data.category);
  }

  // Update Overall sheet Direct Spend (SUMIFS-based formula stays, just trigger recalc)
  SpreadsheetApp.flush();

  return {
    success: true,
    row: targetRow,
    entry: {
      date: Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      particulars: data.particulars,
      category: data.category,
      amount: data.amount,
    }
  };
}

// ── addCategoryIfNew ─────────────────────────────────────────
function addCategoryIfNew(sheet, categoryName) {
  const catColData = sheet.getRange(2, CAT_LIST_COL, sheet.getLastRow(), 1).getValues();
  const existingCats = catColData.map(r => String(r[0]).trim().toLowerCase());

  if (!existingCats.includes(categoryName.trim().toLowerCase())) {
    // Find first empty cell in category list column
    let emptyRow = 2;
    for (let i = 0; i < catColData.length; i++) {
      if (!catColData[i][0]) { emptyRow = i + 2; break; }
      emptyRow = i + 3;
    }
    sheet.getRange(emptyRow, CAT_LIST_COL).setValue(categoryName.trim());
  }
}

// ── getMetadata ──────────────────────────────────────────────
function getMetadata() {
  const sheet = SS.getSheetByName(SHEETS.KHARCHE);
  if (!sheet) return { categories: [], accounts: [] };

  // Categories from column K
  const catData = sheet.getRange(2, CAT_LIST_COL, sheet.getLastRow(), 1).getValues();
  const categories = catData
    .map(r => String(r[0]).trim())
    .filter(c => c && c !== 'Category');

  // Accounts from column U (21)
  const accData = sheet.getRange(2, 21, sheet.getLastRow(), 4).getValues();
  const accounts = [];
  for (const row of accData) {
    if (row[0]) accounts.push({ type: String(row[0]).trim(), sub: String(row[1] || '').trim() });
  }

  return { categories: [...new Set(categories)], accounts };
}

// ── getNetWorth ──────────────────────────────────────────────
function getNetWorth() {
  const sheet = SS.getSheetByName(SHEETS.OVERALL);
  if (!sheet) return { netWorth: 0 };
  const data = sheet.getDataRange().getValues();
  let total = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) total += parseFloat(data[i][5]) || 0;
  }
  return { netWorth: total };
}

// ── addCCBill ────────────────────────────────────────────────
function addCCBill(data) {
  const sheet = SS.getSheetByName(SHEETS.CC_BILLS);
  if (!sheet) return { error: 'CC Bills sheet not found' };
  const dateVal = data.date ? new Date(data.date) : new Date();
  sheet.appendRow([dateVal, data.paidFrom || '', data.creditCard || '', parseFloat(data.amount) || 0]);
  SpreadsheetApp.flush();
  return { success: true };
}

// ── Helpers ──────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(d).substring(0, 10);
}

// ── onEdit trigger (auto-update formulas) ────────────────────
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() === SHEETS.KHARCHE) {
    // Could trigger cache refresh or dashboard update here
    PropertiesService.getScriptProperties().setProperty('lastEdit', new Date().toISOString());
  }
}

// ── Fix SUMIFS with IFERROR across Overall sheet ─────────────
function fixOverallFormulas() {
  const sheet = SS.getSheetByName(SHEETS.OVERALL);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();

  // Wrap any SUMIFS formulas with IFERROR
  for (let row = 2; row <= lastRow; row++) {
    for (let col = 3; col <= 6; col++) {
      const cell = sheet.getRange(row, col);
      const formula = cell.getFormula();
      if (formula && formula.includes('SUMIFS') && !formula.includes('IFERROR')) {
        cell.setFormula('=IFERROR(' + formula.substring(1) + ',0)');
      }
    }
  }
  SpreadsheetApp.flush();
}

// ── Run once to add IFERROR protection ───────────────────────
function setupIferrorProtection() {
  fixOverallFormulas();
  Logger.log('IFERROR protection applied to Overall sheet');
}
