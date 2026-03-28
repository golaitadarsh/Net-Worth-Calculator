// src/screens/SetupScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  Animated, KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../utils/AppContext';
import { COLORS } from '../utils/constants';
import { PrimaryButton, GlassCard, Caption, Body } from '../components/UI';
import * as SecureStore from 'expo-secure-store';

export default function SetupScreen() {
  const { signIn } = useApp();
  const [step, setStep] = useState(0); // 0=welcome, 1=config, 2=done
  const [name, setName] = useState('Adarsh');
  const [scriptUrl, setScriptUrl] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [step]);

  async function handleSetup() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setLoading(true);
    try {
      // Save keys securely
      if (scriptUrl) await SecureStore.setItemAsync('APPS_SCRIPT_URL', scriptUrl);
      if (geminiKey) await SecureStore.setItemAsync('GEMINI_API_KEY', geminiKey);
      if (spreadsheetId) await SecureStore.setItemAsync('SPREADSHEET_ID', spreadsheetId);

      // Patch CONFIG at runtime
      const { CONFIG } = require('../utils/constants');
      if (scriptUrl) CONFIG.APPS_SCRIPT_URL = scriptUrl;
      if (geminiKey) CONFIG.GEMINI_API_KEY = geminiKey;
      if (spreadsheetId) CONFIG.SPREADSHEET_ID = spreadsheetId;

      await signIn({
        name: name.trim(),
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@adarshwallet.app`,
        setupComplete: true,
        setupAt: new Date().toISOString(),
      });
    } catch (err) {
      Alert.alert('Setup failed', err.message);
    }
    setLoading(false);
  }

  async function skipSetup() {
    await signIn({
      name: name.trim() || 'Adarsh',
      email: 'demo@adarshwallet.app',
      setupComplete: false,
      demo: true,
    });
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a', '#0f172a']} locations={[0, 0.5, 1]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Logo */}
            <Text style={styles.logo}>💰</Text>
            <Text style={styles.title}>AdarshWallet</Text>
            <Caption style={styles.subtitle}>Your Personal AI Finance Tracker</Caption>

            {step === 0 && (
              <>
                <View style={styles.featureList}>
                  {[
                    ['🎤', 'Voice Entry', 'Say "Spent ₹500 groceries SBI" — AI does the rest'],
                    ['📊', 'Live Dashboard', 'Real-time charts synced from Google Sheets'],
                    ['✨', 'AI Insights', 'Ask Gemini about your spending patterns'],
                    ['📴', 'Offline Mode', 'Works without internet, syncs when back'],
                  ].map(([icon, title, desc]) => (
                    <GlassCard key={title} style={styles.featureCard}>
                      <View style={styles.featureRow}>
                        <Text style={styles.featureIcon}>{icon}</Text>
                        <View style={styles.featureText}>
                          <Text style={styles.featureTitle}>{title}</Text>
                          <Caption>{desc}</Caption>
                        </View>
                      </View>
                    </GlassCard>
                  ))}
                </View>
                <PrimaryButton title="Get Started →" onPress={() => setStep(1)} style={{ width: '100%', marginTop: 8 }} />
                <TouchableOpacity onPress={skipSetup} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Caption>Skip for now (demo mode)</Caption>
                </TouchableOpacity>
              </>
            )}

            {step === 1 && (
              <>
                <GlassCard style={styles.configCard}>
                  <Text style={styles.configTitle}>⚙️ Connect Your Sheets</Text>
                  <Caption style={{ marginBottom: 20 }}>
                    These settings connect AdarshWallet to your Google Sheet. You can update them later in Settings.
                  </Caption>

                  <ConfigInput
                    label="Your Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Adarsh"
                    required
                  />

                  <ConfigInput
                    label="Google Apps Script URL"
                    value={scriptUrl}
                    onChangeText={setScriptUrl}
                    placeholder="https://script.google.com/macros/s/..."
                    hint="Deploy Code.gs as web app → copy URL"
                  />

                  <ConfigInput
                    label="Gemini API Key (Free)"
                    value={geminiKey}
                    onChangeText={setGeminiKey}
                    placeholder="AIza..."
                    hint="Get free key at ai.google.dev"
                    secure
                  />

                  <ConfigInput
                    label="Google Spreadsheet ID"
                    value={spreadsheetId}
                    onChangeText={setSpreadsheetId}
                    placeholder="1BxiMV..."
                    hint="From your Sheet URL: /d/YOUR_ID/edit"
                  />
                </GlassCard>

                <PrimaryButton
                  title={loading ? 'Setting up…' : 'Launch AdarshWallet 🚀'}
                  onPress={handleSetup}
                  loading={loading}
                  style={{ width: '100%' }}
                />
                <TouchableOpacity onPress={skipSetup} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Caption>Skip → Use demo mode</Caption>
                </TouchableOpacity>
              </>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function ConfigInput({ label, value, onChangeText, placeholder, hint, required, secure }) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint && <Caption style={{ marginTop: 4, fontSize: 11 }}>💡 {hint}</Caption>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  content: { alignItems: 'center' },
  logo: { fontSize: 72, marginBottom: 8 },
  title: {
    fontSize: 36, fontWeight: '900', color: '#fff',
    letterSpacing: -1, marginBottom: 4,
  },
  subtitle: { marginBottom: 32, textAlign: 'center', fontSize: 15 },
  featureList: { width: '100%', gap: 10, marginBottom: 24 },
  featureCard: { padding: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { fontSize: 28, marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  configCard: { width: '100%', marginBottom: 20, padding: 20 },
  configTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  inputGroup: { marginBottom: 16 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { color: COLORS.red, marginLeft: 4, fontSize: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
});
