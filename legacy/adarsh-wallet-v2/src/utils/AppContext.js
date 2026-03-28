// src/utils/AppContext.js
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sheetsAPI } from '../services/api';
import { initDB, dbOps } from '../services/database';
import { CONFIG } from './constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [dashboard, setDashboard] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [balances, setBalances] = useState([]);

  // Selected month
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const refreshTimer = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await initDB();
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
      const savedTheme = await AsyncStorage.getItem('theme') || 'dark';
      setTheme(savedTheme);
      await refreshData();
      setLoading(false);
    })();
  }, []);

  // ── Live polling ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(refreshData, CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(refreshTimer.current);
  }, [selectedYear, selectedMonth]);

  // ── Refresh data ──────────────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    try {
      // Local SQLite (instant)
      const [cats, months, bals] = await Promise.all([
        dbOps.getCategoryTotals(selectedYear, selectedMonth),
        dbOps.getMonthlyTotals(6),
        dbOps.getBalances(),
      ]);
      setCategoryTotals(cats);
      setMonthlyTotals(months);
      setBalances(bals);

      // Remote Sheets (may take longer)
      const [dashData, expData] = await Promise.all([
        sheetsAPI.getDashboard(),
        sheetsAPI.getExpenses(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`),
      ]);
      if (dashData) {
        setDashboard(dashData);
        await AsyncStorage.setItem('cached_dashboard', JSON.stringify(dashData));
        // Mirror balances to SQLite
        if (dashData.accounts) {
          for (const acc of dashData.accounts) {
            await dbOps.upsertBalance(acc.name, acc.balance);
          }
        }
      }
      if (expData?.expenses) {
        setExpenses(expData.expenses);
        setIsOnline(true);
      }
    } catch (err) {
      setIsOnline(false);
      console.log('Offline mode, using cached data');
    }
  }, [selectedYear, selectedMonth]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const signIn = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  const addExpense = async (entry) => {
    // Optimistic local insert
    await dbOps.insertExpense({ ...entry, synced: false });
    const cats = await dbOps.getCategoryTotals(selectedYear, selectedMonth);
    setCategoryTotals(cats);

    // Remote sync
    const result = await sheetsAPI.addExpense(entry);
    if (result.success) {
      const unsynced = await dbOps.getUnsyncedExpenses();
      for (const e of unsynced) {
        if (e.particulars === entry.particulars && !e.synced) {
          await dbOps.markSynced(e.id);
          break;
        }
      }
    }
    return result;
  };

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      user, signIn, signOut,
      isOnline,
      loading,
      dashboard, expenses, categoryTotals, monthlyTotals, balances,
      selectedYear, setSelectedYear,
      selectedMonth, setSelectedMonth,
      refreshData,
      addExpense,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
