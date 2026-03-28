// src/utils/constants.js
export const COLORS = {
  // Gradient
  bgDark: '#0f172a',
  bgMid: '#1e3a8a',
  bgLight: '#1d4ed8',
  
  // Cards (neumorphic)
  cardDark: '#0d1b3e',
  cardLight: '#1a2f6b',
  
  // Accent
  green: '#10b981',
  greenLight: '#34d399',
  red: '#ef4444',
  redLight: '#f87171',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  
  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  
  // Chart colors
  chartColors: [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
    '#f97316', '#14b8a6'
  ],

  // Light theme overrides
  light: {
    bg: '#f1f5f9',
    card: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
  }
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

// ──────────────────────────────────────────────────
//  CONFIGURATION – fill these in after setup
// ──────────────────────────────────────────────────
export const CONFIG = {
  // Google Apps Script Web App URL (deploy as "Anyone" access)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',

  // Gemini API key (free tier – https://ai.google.dev)
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
  GEMINI_MODEL: 'gemini-1.5-flash',

  // Google OAuth Web Client ID (for Sign-In)
  GOOGLE_WEB_CLIENT_ID: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',

  // Spreadsheet ID (from the URL of your Google Sheet)
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',

  // Refresh interval for live data (ms)
  REFRESH_INTERVAL: 5000,
};

export const CATEGORIES = {
  'Food and Drinks': ['Delivery', 'Eating Out'],
  'Household': ['Fixed Groceries', 'Random Groceries', 'Maid Salary', 'Electricity', 'Furniture Rent', 'Fixed Cost'],
  'Transport': ['Local', 'Metro', 'Auto/Cab', 'Petrol'],
  'Recreation': [],
  'Cigarettes': [],
  'Education': [],
  'Subscriptions': [],
  'Credit Card': ['Scapia', 'Axis Bank', 'ICICI'],
  'Trip': ['Travelling', 'Food', 'Accommodation', 'Household', 'Drinks and Cigarettes', 'Recreation', 'Miscellaneous', 'Gifts'],
  'Others': [],
  'Medical Spends': [],
  'Apparel': [],
  'Investment': [],
};

export const ACCOUNTS = [
  'UPI/Bank Accounts',
  'Credit Card',
  'Cash Payment',
  'Splitwise',
  'Investments',
  'Groww Account',
  'Amazon Pay',
];

export const ACCOUNT_SUBS = {
  'UPI/Bank Accounts': ['Axis Bank', 'State Bank of India (SBI)'],
  'Credit Card': ['Axis Bank', 'ICICI', 'Scapia'],
};

export const APPS = [
  'Paytm', 'GPay', 'PhonePe', 'BHIM', 'Amazon Pay', 'Flipkart', 'Others'
];
