// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../utils/constants';

// ─── Apps Script API ───────────────────────────────────────────────────────

export const sheetsAPI = {
  /** Fetch dashboard summary data */
  async getDashboard() {
    try {
      const res = await axios.get(CONFIG.APPS_SCRIPT_URL, {
        params: { action: 'getDashboard' },
        timeout: 10000,
      });
      return res.data;
    } catch (err) {
      console.error('getDashboard error:', err.message);
      return getCachedDashboard();
    }
  },

  /** Fetch all Kharche entries */
  async getExpenses(month = null) {
    try {
      const params = { action: 'getExpenses' };
      if (month) params.month = month;
      const res = await axios.get(CONFIG.APPS_SCRIPT_URL, { params, timeout: 10000 });
      await AsyncStorage.setItem('cached_expenses', JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      const cached = await AsyncStorage.getItem('cached_expenses');
      return cached ? JSON.parse(cached) : { expenses: [], error: err.message };
    }
  },

  /** Add a new expense entry */
  async addExpense(entry) {
    try {
      const res = await axios.post(CONFIG.APPS_SCRIPT_URL, {
        action: 'addExpense',
        ...entry,
      }, { timeout: 15000 });
      return { success: true, data: res.data };
    } catch (err) {
      // Queue for offline sync
      await queueOfflineEntry(entry);
      return { success: false, queued: true, error: err.message };
    }
  },

  /** Sync queued offline entries */
  async syncOfflineQueue() {
    const queue = await getOfflineQueue();
    if (!queue.length) return { synced: 0 };
    let synced = 0;
    const remaining = [];
    for (const entry of queue) {
      try {
        await axios.post(CONFIG.APPS_SCRIPT_URL, { action: 'addExpense', ...entry }, { timeout: 15000 });
        synced++;
      } catch {
        remaining.push(entry);
      }
    }
    await AsyncStorage.setItem('offline_queue', JSON.stringify(remaining));
    return { synced, remaining: remaining.length };
  },

  /** Get category & account lists */
  async getMetadata() {
    try {
      const res = await axios.get(CONFIG.APPS_SCRIPT_URL, {
        params: { action: 'getMetadata' },
        timeout: 8000,
      });
      await AsyncStorage.setItem('cached_metadata', JSON.stringify(res.data));
      return res.data;
    } catch {
      const cached = await AsyncStorage.getItem('cached_metadata');
      return cached ? JSON.parse(cached) : null;
    }
  },
};

// ─── Gemini AI API ─────────────────────────────────────────────────────────

export const geminiAPI = {
  /** Parse voice/text expense input */
  async parseExpenseInput(rawText) {
    const prompt = `You are a personal finance assistant for an Indian user.
Parse this expense input and return ONLY valid JSON (no markdown, no explanation):
Input: "${rawText}"

Return JSON:
{
  "particulars": "description of expense",
  "category": "main category",
  "subcategory": "subcategory or null",
  "amount": numeric_amount_in_rupees,
  "account": "account type used",
  "accountSub": "specific bank/card or null",
  "application": "payment app used or null",
  "confidence": 0.0-1.0
}

Categories available: Food and Drinks, Household, Transport, Recreation, Cigarettes, Education, Subscriptions, Credit Card, Trip, Others, Medical Spends, Apparel, Investment
Accounts: UPI/Bank Accounts, Credit Card, Cash Payment, Splitwise
Account subs for UPI: Axis Bank, State Bank of India (SBI)
Account subs for Credit Card: Axis Bank, ICICI, Scapia
Common Indian apps: Paytm, GPay, PhonePe, BHIM, Amazon Pay

Examples:
"Spent 500 on groceries via SBI Paytm" → category: Household, subcategory: Random Groceries, account: UPI/Bank Accounts, accountSub: State Bank of India (SBI), application: Paytm
"Swiggy 350 Axis credit card" → category: Food and Drinks, subcategory: Delivery, account: Credit Card, accountSub: Axis Bank
"200 auto Uber" → category: Transport, subcategory: Auto/Cab, account: UPI/Bank Accounts`;

    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        },
        { timeout: 15000 }
      );
      const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      console.error('Gemini parse error:', err.message);
      return fallbackParse(rawText);
    }
  },

  /** AI financial insights chat */
  async getInsight(question, context) {
    const prompt = `You are AdarshWallet AI, a personal finance assistant for an Indian user named Adarsh.
Context (current financial data):
${JSON.stringify(context, null, 2)}

User question: "${question}"

Respond in 2-3 sentences, be specific with ₹ amounts, give actionable advice. Use Indian financial context.`;

    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        },
        { timeout: 15000 }
      );
      return res.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to get insights right now.';
    } catch (err) {
      return 'AI insights temporarily unavailable. Check your connection.';
    }
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getCachedDashboard() {
  const cached = await AsyncStorage.getItem('cached_dashboard');
  return cached ? JSON.parse(cached) : null;
}

async function queueOfflineEntry(entry) {
  const queue = await getOfflineQueue();
  queue.push({ ...entry, _queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
}

async function getOfflineQueue() {
  const q = await AsyncStorage.getItem('offline_queue');
  return q ? JSON.parse(q) : [];
}

function fallbackParse(text) {
  // Simple regex fallback when Gemini fails
  const amountMatch = text.match(/₹?\s*(\d+(?:\.\d+)?)/);
  return {
    particulars: text,
    category: 'Others',
    subcategory: null,
    amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
    account: 'UPI/Bank Accounts',
    accountSub: 'State Bank of India (SBI)',
    application: null,
    confidence: 0.3,
  };
}
