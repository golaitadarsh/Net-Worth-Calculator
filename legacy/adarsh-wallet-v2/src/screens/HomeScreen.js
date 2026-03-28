// src/screens/HomeScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, RefreshControl,
  Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../utils/AppContext';
import { COLORS } from '../utils/constants';
import {
  GlassCard, GradientCard, NeumorphicCard,
  H1, H2, H3, Body, Caption, AmountText, Badge, StatusDot, Divider, Skeleton,
} from '../components/UI';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 48;

export default function HomeScreen({ navigation }) {
  const {
    dashboard, categoryTotals, monthlyTotals,
    balances, isOnline, refreshData, loading,
    selectedMonth, selectedYear,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Computed values
  const totalBalance = balances.reduce((s, b) => s + (b.balance || 0), 0);
  const monthlySpend = categoryTotals.reduce((s, c) => s + (c.total || 0), 0);
  const netWorth = dashboard?.netWorth || totalBalance;

  const pieData = categoryTotals.slice(0, 6).map((c, i) => ({
    name: c.category?.length > 10 ? c.category.substring(0, 10) + '…' : (c.category || 'Other'),
    amount: Math.round(c.total || 0),
    color: COLORS.chartColors[i % COLORS.chartColors.length],
    legendFontColor: COLORS.textSecondary,
    legendFontSize: 11,
  }));

  const lineData = {
    labels: monthlyTotals.slice(0, 5).reverse().map(m => {
      const parts = (m.month || '').split('-');
      return parts[1] ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1])-1] : '';
    }),
    datasets: [{
      data: monthlyTotals.slice(0, 5).reverse().map(m => Math.round(m.total || 0)),
      color: (o = 1) => `rgba(16, 185, 129, ${o})`,
      strokeWidth: 2.5,
    }],
  };

  const chartConfig = {
    backgroundGradientFrom: COLORS.cardDark,
    backgroundGradientTo: COLORS.cardDark,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 179, 237, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.green },
    formatYLabel: (v) => `₹${parseInt(v/1000)}k`,
  };

  const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selectedMonth - 1];

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#0f172a']}
      locations={[0, 0.4, 1]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.green}
            colors={[COLORS.green]}
          />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerTop}>
            <View>
              <Caption>Good {getGreeting()}, Adarsh 👋</Caption>
              <H1>AdarshWallet</H1>
            </View>
            <View style={styles.headerRight}>
              <StatusDot online={isOnline} />
              <Caption style={{ marginLeft: 4 }}>{isOnline ? 'Live' : 'Offline'}</Caption>
            </View>
          </View>
        </Animated.View>

        {/* Net Worth Hero Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <GradientCard
            colors={['#1d4ed8', '#1e3a8a', '#0d1b3e']}
            style={styles.heroCard}
          >
            <Caption style={{ color: 'rgba(255,255,255,0.6)' }}>TOTAL NET WORTH</Caption>
            {loading ? (
              <Skeleton width={200} height={48} style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.heroAmount}>
                ₹{netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            )}
            <View style={styles.heroRow}>
              <View>
                <Caption style={{ color: 'rgba(255,255,255,0.5)' }}>{monthName} Spend</Caption>
                <Text style={[styles.heroSub, { color: COLORS.red }]}>
                  −₹{monthlySpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.netWorthGauge}>
                <GaugeBar value={netWorth} max={1500000} />
              </View>
            </View>
          </GradientCard>
        </Animated.View>

        {/* Account Balances */}
        <H3 style={styles.sectionTitle}>Accounts</H3>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsRow}>
          {(balances.length ? balances : PLACEHOLDER_ACCOUNTS).map((acc, i) => (
            <GlassCard key={i} style={styles.accountCard}>
              <View style={[styles.accountDot, { backgroundColor: COLORS.chartColors[i % 10] }]} />
              <Caption style={{ marginTop: 4 }}>{truncate(acc.account, 14)}</Caption>
              {loading ? (
                <Skeleton width={80} height={20} style={{ marginTop: 4 }} />
              ) : (
                <Text style={styles.accountBalance}>
                  ₹{(acc.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              )}
            </GlassCard>
          ))}
        </ScrollView>

        {/* Category Breakdown */}
        {categoryTotals.length > 0 && (
          <>
            <H3 style={styles.sectionTitle}>Spend Breakdown — {monthName}</H3>
            <NeumorphicCard style={styles.chartCard}>
              <PieChart
                data={pieData.length ? pieData : PLACEHOLDER_PIE}
                width={CHART_W - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="16"
                center={[0, 0]}
                hasLegend={true}
                absolute={false}
              />
            </NeumorphicCard>

            {/* Category List */}
            <GlassCard style={styles.catListCard}>
              {categoryTotals.map((cat, i) => (
                <React.Fragment key={cat.category}>
                  <View style={styles.catRow}>
                    <View style={[styles.catDot, { backgroundColor: COLORS.chartColors[i % 10] }]} />
                    <Text style={styles.catName}>{cat.category}</Text>
                    <Text style={styles.catCount}>{cat.count}×</Text>
                    <Text style={styles.catAmount}>
                      ₹{Math.round(cat.total).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {i < categoryTotals.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </GlassCard>
          </>
        )}

        {/* Monthly Trend */}
        {lineData.labels.length > 1 && (
          <>
            <H3 style={styles.sectionTitle}>Monthly Trend</H3>
            <NeumorphicCard style={styles.chartCard}>
              <LineChart
                data={lineData}
                width={CHART_W - 32}
                height={180}
                chartConfig={chartConfig}
                bezier
                withInnerLines={false}
                withOuterLines={false}
                style={{ borderRadius: 12 }}
              />
            </NeumorphicCard>
          </>
        )}

        {/* Investments Summary */}
        {dashboard?.investments && (
          <>
            <H3 style={styles.sectionTitle}>Investments</H3>
            <GlassCard style={styles.investCard}>
              {dashboard.investments.map((inv, i) => (
                <View key={i} style={styles.invRow}>
                  <Badge label={inv.type} color={COLORS.chartColors[i % 10]} />
                  <Text style={styles.invAmount}>₹{inv.amount.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              <Divider />
              <View style={[styles.invRow, { marginTop: 4 }]}>
                <Text style={[styles.catName, { color: COLORS.textPrimary, fontWeight: '700' }]}>Total</Text>
                <Text style={[styles.invAmount, { color: COLORS.green }]}>
                  ₹{dashboard.investments.reduce((s, i) => s + i.amount, 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </GlassCard>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function GaugeBar({ value, max }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeBg}>
        <LinearGradient
          colors={[COLORS.green, COLORS.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gaugeFill, { width: `${pct * 100}%` }]}
        />
      </View>
      <Caption style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
        {(pct * 100).toFixed(0)}% of ₹15L goal
      </Caption>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.substring(0, n) + '…' : str;
}

const PLACEHOLDER_ACCOUNTS = [
  { account: 'Axis Bank', balance: 0 },
  { account: 'SBI', balance: 0 },
  { account: 'Splitwise', balance: 0 },
];
const PLACEHOLDER_PIE = [{ name: 'No data', amount: 1, color: COLORS.textMuted, legendFontColor: COLORS.textMuted, legendFontSize: 11 }];

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  heroCard: { marginBottom: 24, padding: 24 },
  heroAmount: {
    fontSize: 40, fontWeight: '900', color: '#fff',
    letterSpacing: -1, marginTop: 4, marginBottom: 16,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroSub: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  gauge: { flex: 1, marginLeft: 16 },
  gaugeBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3, overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { marginBottom: 12, marginTop: 8 },
  accountsRow: { marginBottom: 20 },
  accountCard: { width: 120, marginRight: 10, padding: 12 },
  accountDot: { width: 28, height: 28, borderRadius: 14 },
  accountBalance: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  chartCard: { marginBottom: 16, padding: 16, overflow: 'hidden' },
  catListCard: { marginBottom: 16 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  catName: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  catCount: { fontSize: 12, color: COLORS.textMuted, marginRight: 8 },
  catAmount: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  investCard: { marginBottom: 16 },
  invRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  invAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  netWorthGauge: { flex: 1, marginLeft: 16, justifyContent: 'flex-end' },
});
