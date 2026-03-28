// src/screens/DashboardScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useApp } from '../utils/AppContext';
import { COLORS } from '../utils/constants';
import { GlassCard, NeumorphicCard, H2, H3, Caption, AmountText, Badge } from '../components/UI';

const { width: W } = Dimensions.get('window');
const CHART_W = W - 48;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DashboardScreen() {
  const {
    expenses, categoryTotals, monthlyTotals,
    dashboard, balances,
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    refreshData,
  } = useApp();

  const [activeTab, setActiveTab] = useState('spending');

  const chartConfig = {
    backgroundGradientFrom: '#0d1b3e',
    backgroundGradientTo: '#0d1b3e',
    decimalPlaces: 0,
    color: (o = 1) => `rgba(99, 179, 237, ${o})`,
    labelColor: (o = 1) => `rgba(148, 163, 184, ${o})`,
    style: { borderRadius: 12 },
    barPercentage: 0.65,
    propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.05)' },
    formatYLabel: v => `₹${parseInt(v/1000)}k`,
  };

  const barData = {
    labels: categoryTotals.slice(0, 6).map(c =>
      (c.category || 'Other').substring(0, 5)
    ),
    datasets: [{
      data: categoryTotals.slice(0, 6).map(c => Math.round(c.total || 0)),
      colors: categoryTotals.slice(0, 6).map((_, i) =>
        (o) => COLORS.chartColors[i % 10]
      ),
    }],
  };

  const lineData = {
    labels: [...monthlyTotals].reverse().slice(0, 5).map(m => {
      const parts = (m.month || '').split('-');
      return parts[1] ? MONTHS[parseInt(parts[1]) - 1] : '';
    }),
    datasets: [{
      data: [...monthlyTotals].reverse().slice(0, 5).map(m => Math.round(m.total || 0)),
      color: (o = 1) => `rgba(16, 185, 129, ${o})`,
      strokeWidth: 3,
    }],
  };

  const totalSpend = categoryTotals.reduce((s, c) => s + c.total, 0);
  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  // Month navigator
  function changeMonth(dir) {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a', '#0f172a']} locations={[0, 0.4, 1]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <H2>Dashboard</H2>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Total Spend" value={totalSpend} color={COLORS.red} emoji="💸" />
          <SummaryCard label="Net Worth" value={totalBalance} color={COLORS.green} emoji="💰" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['spending', 'trend', 'accounts'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spending Tab */}
        {activeTab === 'spending' && (
          <>
            {barData.labels.length > 0 && (
              <NeumorphicCard style={styles.chartCard}>
                <H3 style={{ marginBottom: 12 }}>By Category</H3>
                <BarChart
                  data={barData}
                  width={CHART_W - 32}
                  height={200}
                  chartConfig={chartConfig}
                  style={{ borderRadius: 12 }}
                  showValuesOnTopOfBars
                  withCustomBarColorFromData
                  flatColor
                  withInnerLines={false}
                />
              </NeumorphicCard>
            )}

            {/* Expense List */}
            <GlassCard style={styles.listCard}>
              <H3 style={{ marginBottom: 12 }}>All Categories</H3>
              {categoryTotals.length === 0 ? (
                <Caption style={{ textAlign: 'center', paddingVertical: 20 }}>No expenses this month</Caption>
              ) : (
                categoryTotals.map((cat, i) => {
                  const pct = totalSpend > 0 ? (cat.total / totalSpend * 100) : 0;
                  return (
                    <View key={cat.category} style={styles.catItem}>
                      <View style={styles.catItemTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.catDot, { backgroundColor: COLORS.chartColors[i % 10] }]} />
                          <Text style={styles.catName}>{cat.category}</Text>
                        </View>
                        <Text style={styles.catAmt}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={styles.progressBg}>
                        <LinearGradient
                          colors={[COLORS.chartColors[i % 10], COLORS.chartColors[(i + 1) % 10]]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]}
                        />
                      </View>
                      <Caption style={{ marginTop: 2 }}>{pct.toFixed(1)}% of spend · {cat.count} transactions</Caption>
                    </View>
                  );
                })
              )}
            </GlassCard>
          </>
        )}

        {/* Trend Tab */}
        {activeTab === 'trend' && (
          <>
            {lineData.labels.length > 1 && (
              <NeumorphicCard style={styles.chartCard}>
                <H3 style={{ marginBottom: 12 }}>Monthly Spend Trend</H3>
                <LineChart
                  data={lineData}
                  width={CHART_W - 32}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  withInnerLines={false}
                  withOuterLines={false}
                  style={{ borderRadius: 12 }}
                />
              </NeumorphicCard>
            )}

            <GlassCard style={styles.listCard}>
              <H3 style={{ marginBottom: 12 }}>Monthly Breakdown</H3>
              {[...monthlyTotals].reverse().map((m, i) => {
                const prev = monthlyTotals[monthlyTotals.length - i - 2];
                const diff = prev ? m.total - prev.total : 0;
                return (
                  <View key={m.month} style={styles.monthRow}>
                    <Text style={styles.monthLabel2}>{m.month}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.monthAmt}>₹{Math.round(m.total).toLocaleString('en-IN')}</Text>
                      {diff !== 0 && (
                        <Text style={[styles.monthDiff, { color: diff > 0 ? COLORS.red : COLORS.green }]}>
                          {diff > 0 ? '▲' : '▼'} ₹{Math.abs(Math.round(diff)).toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </GlassCard>
          </>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <>
            <GlassCard style={styles.listCard}>
              <H3 style={{ marginBottom: 12 }}>Account Balances</H3>
              {balances.map((acc, i) => (
                <View key={acc.account} style={styles.accountRow}>
                  <View style={[styles.accountIcon, { backgroundColor: COLORS.chartColors[i % 10] + '33' }]}>
                    <Text style={styles.accountInitial}>
                      {(acc.account || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.accountName}>{acc.account}</Text>
                  <Text style={[styles.accountBal, { color: acc.balance >= 0 ? COLORS.green : COLORS.red }]}>
                    ₹{(acc.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ))}
              <View style={[styles.accountRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 4 }]}>
                <Text style={[styles.accountName, { fontWeight: '700', color: COLORS.textPrimary }]}>Total</Text>
                <Text style={[styles.accountBal, { color: COLORS.green, fontWeight: '800', fontSize: 18 }]}>
                  ₹{totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </GlassCard>

            {/* CC Bills */}
            {dashboard?.creditCards && (
              <GlassCard style={styles.listCard}>
                <H3 style={{ marginBottom: 12 }}>Credit Card Bills</H3>
                {dashboard.creditCards.map((cc, i) => (
                  <View key={i} style={styles.accountRow}>
                    <Badge label={cc.card} color={COLORS.amber} />
                    <Text style={[styles.accountBal, { color: COLORS.red }]}>
                      ₹{(cc.amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

function SummaryCard({ label, value, color, emoji }) {
  return (
    <GlassCard style={styles.summaryCard}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Caption>{label}</Caption>
      <Text style={[styles.summaryValue, { color }]}>
        ₹{Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { color: COLORS.textPrimary, fontSize: 18 },
  monthLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 14 },
  summaryEmoji: { fontSize: 24, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  tabs: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 3, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: COLORS.bgMid },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  chartCard: { marginBottom: 16, overflow: 'hidden' },
  listCard: { marginBottom: 16 },
  catItem: { marginBottom: 16 },
  catItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  catName: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  catAmt: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  monthRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  monthLabel2: { fontSize: 14, color: COLORS.textSecondary },
  monthAmt: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  monthDiff: { fontSize: 11, marginTop: 2 },
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
  },
  accountIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  accountInitial: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  accountName: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  accountBal: { fontSize: 14, fontWeight: '700' },
});
