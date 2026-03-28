// App.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { AppProvider, useApp } from './src/utils/AppContext';
import { COLORS } from './src/utils/constants';
import HomeScreen from './src/screens/HomeScreen';
import EntryScreen from './src/screens/EntryScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SetupScreen from './src/screens/SetupScreen';

const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'dashboard', label: 'Charts', icon: '📊' },
  { key: 'entry', label: 'Add', icon: '✚', isPrimary: true },
  { key: 'insights', label: 'AI', icon: '✨' },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, loading } = useApp();
  const insets = useSafeAreaInsets();
  const fabAnim = useRef(new Animated.Value(1)).current;

  // Import useRef here too
  const React = require('react');
  const { useRef } = React;
  const fabRef = useRef(new Animated.Value(1)).current;

  function handleTabPress(key) {
    Animated.sequence([
      Animated.timing(fabRef, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(fabRef, { toValue: 1, useNativeDriver: true }),
    ]).start();
    setActiveTab(key);
  }

  if (loading) return <SplashScreen />;
  if (!user) return <SetupScreen />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Screens */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'dashboard' && <DashboardScreen />}
        {activeTab === 'entry' && <EntryScreen />}
        {activeTab === 'insights' && <InsightsScreen />}
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.navBar, { paddingBottom: insets.bottom + 4 }]}>
        <LinearGradient
          colors={['rgba(13,27,62,0.95)', 'rgba(13,27,62,1)']}
          style={StyleSheet.absoluteFill}
        />
        {TABS.map((tab) => (
          tab.isPrimary ? (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.85}
              style={styles.fabWrap}
            >
              <Animated.View style={{ transform: [{ scale: fabRef }] }}>
                <LinearGradient
                  colors={activeTab === tab.key
                    ? [COLORS.green, '#059669']
                    : [COLORS.bgMid, COLORS.bgLight]}
                  style={styles.fab}
                >
                  <Text style={styles.fabIcon}>{tab.icon}</Text>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.key)}
              style={styles.navItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.navIcon, activeTab === tab.key && styles.navIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.navLabel, activeTab === tab.key && styles.navLabelActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.navDot} />}
            </TouchableOpacity>
          )
        ))}
      </View>
    </View>
  );
}

function SplashScreen() {
  const scale = new Animated.Value(0.8);
  const opacity = new Animated.Value(0);
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.splash}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Text style={styles.splashIcon}>💰</Text>
        <Text style={styles.splashTitle}>AdarshWallet</Text>
        <Text style={styles.splashSub}>Your AI Finance Companion</Text>
      </Animated.View>
    </LinearGradient>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <MainAppWrapper />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MainAppWrapper() {
  return <MainApp />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  screenContainer: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  navItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4,
  },
  navIcon: { fontSize: 22, marginBottom: 2, opacity: 0.5 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  navLabelActive: { color: COLORS.textPrimary, fontWeight: '700' },
  navDot: {
    position: 'absolute', bottom: -2,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: COLORS.green,
  },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -28 },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.bgMid, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8, shadowRadius: 16, elevation: 14,
    borderWidth: 3, borderColor: '#0f172a',
  },
  fabIcon: { fontSize: 24, color: '#fff' },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashIcon: { fontSize: 80, textAlign: 'center', marginBottom: 16 },
  splashTitle: { fontSize: 36, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -1 },
  splashSub: { fontSize: 16, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
});
