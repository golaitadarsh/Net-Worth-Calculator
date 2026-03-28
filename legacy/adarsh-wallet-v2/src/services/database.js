// src/services/database.js
import * as SQLite from 'expo-sqlite';

let db = null;

export const initDB = async () => {
  db = await SQLite.openDatabaseAsync('adarshwallet.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      particulars TEXT,
      category TEXT,
      subcategory TEXT,
      account TEXT,
      account_sub TEXT,
      application TEXT,
      amount REAL,
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account TEXT UNIQUE,
      balance REAL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT UNIQUE,
      monthly_budget REAL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_synced ON expenses(synced);
  `);
  return db;
};

export const dbOps = {
  async insertExpense(entry) {
    if (!db) await initDB();
    return await db.runAsync(
      `INSERT INTO expenses (date, particulars, category, subcategory, account, account_sub, application, amount, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.date || new Date().toISOString(),
        entry.particulars,
        entry.category,
        entry.subcategory || null,
        entry.account,
        entry.accountSub || null,
        entry.application || null,
        entry.amount,
        entry.synced ? 1 : 0,
      ]
    );
  },

  async getExpenses(limit = 100, offset = 0) {
    if (!db) await initDB();
    return await db.getAllAsync(
      `SELECT * FROM expenses ORDER BY date DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  },

  async getExpensesByMonth(year, month) {
    if (!db) await initDB();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return await db.getAllAsync(
      `SELECT * FROM expenses WHERE date LIKE ? ORDER BY date DESC`,
      [`${monthStr}%`]
    );
  },

  async getCategoryTotals(year, month) {
    if (!db) await initDB();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return await db.getAllAsync(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM expenses WHERE date LIKE ?
       GROUP BY category ORDER BY total DESC`,
      [`${monthStr}%`]
    );
  },

  async getMonthlyTotals(months = 6) {
    if (!db) await initDB();
    return await db.getAllAsync(
      `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
       FROM expenses
       GROUP BY month
       ORDER BY month DESC
       LIMIT ?`,
      [months]
    );
  },

  async upsertBalance(account, balance) {
    if (!db) await initDB();
    return await db.runAsync(
      `INSERT INTO balances (account, balance) VALUES (?, ?)
       ON CONFLICT(account) DO UPDATE SET balance=excluded.balance, updated_at=datetime('now')`,
      [account, balance]
    );
  },

  async getBalances() {
    if (!db) await initDB();
    return await db.getAllAsync(`SELECT * FROM balances`);
  },

  async getUnsyncedExpenses() {
    if (!db) await initDB();
    return await db.getAllAsync(`SELECT * FROM expenses WHERE synced = 0`);
  },

  async markSynced(id) {
    if (!db) await initDB();
    return await db.runAsync(`UPDATE expenses SET synced = 1 WHERE id = ?`, [id]);
  },

  async getTotalByAccount(year, month) {
    if (!db) await initDB();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return await db.getAllAsync(
      `SELECT account, account_sub, SUM(amount) as total
       FROM expenses WHERE date LIKE ?
       GROUP BY account, account_sub ORDER BY total DESC`,
      [`${monthStr}%`]
    );
  },
};
