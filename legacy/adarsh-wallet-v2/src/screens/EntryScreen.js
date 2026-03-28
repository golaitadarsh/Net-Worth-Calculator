// src/screens/EntryScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Animated, Dimensions, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useApp } from '../utils/AppContext';
import { geminiAPI } from '../services/api';
import { COLORS, CATEGORIES, ACCOUNTS, ACCOUNT_SUBS, APPS } from '../utils/constants';
import {
  GlassCard, GradientCard, NeumorphicCard,
  H2, H3, Body, Caption, PrimaryButton, SecondaryButton, Badge,
} from '../components/UI';

const { width: W } = Dimensions.get('window');

const ENTRY_STATES = { IDLE: 'idle', LISTENING: 'listening', PROCESSING: 'processing', REVIEW: 'review', SUCCESS: 'success' };

export default function EntryScreen() {
  const { addExpense, isOnline } = useApp();
  const [state, setState] = useState(ENTRY_STATES.IDLE);
  const [rawText, setRawText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [parsedEntry, setParsedEntry] = useState(null);
  const [error, setError] = useState('');
  const [isManual, setIsManual] = useState(false);

  // Voice waveform animation
  const waveAnims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0.3))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // Recording
  const recordingRef = useRef(null);

  useEffect(() => {
    if (state === ENTRY_STATES.LISTENING) animateWaves();
    else waveAnims.forEach(a => a.setValue(0.3));

    if (state === ENTRY_STATES.SUCCESS) animateSuccess();
  }, [state]);

  function animateWaves() {
    const anims = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.spring(anim, { toValue: 1, speed: 20, useNativeDriver: true }),
          Animated.spring(anim, { toValue: 0.3, speed: 15, useNativeDriver: true }),
        ])
      )
    );
    Animated.parallel(anims).start();
  }

  function animateSuccess() {
    Animated.parallel([
      Animated.spring(successAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(confettiAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start();
  }

  // ── Voice Recording (using expo-av) ────────────────────────────────────────
  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState(ENTRY_STATES.LISTENING);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      setError('Microphone access denied. Use text input below.');
      setIsManual(true);
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    setState(ENTRY_STATES.PROCESSING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Since free Whisper.js isn't available in React Native easily,
      // we use a prompt-based approach: show user what was "heard"
      // In production, integrate with Whisper API or use on-device speech
      // For demo: use manual text box that pre-fills
      setError('');
      setIsManual(true); // Fallback to text entry after recording
      setState(ENTRY_STATES.IDLE);
      Alert.alert(
        'Voice Recorded',
        'Type or confirm your expense below. (On-device STT varies by device.)',
        [{ text: 'OK' }]
      );
    } catch (err) {
      setState(ENTRY_STATES.IDLE);
      setError('Recording failed. Use text input.');
    }
  }

  async function processText(text) {
    if (!text.trim()) return;
    setError('');
    setState(ENTRY_STATES.PROCESSING);
    try {
      const parsed = await geminiAPI.parseExpenseInput(text);
      if (!parsed.amount || parsed.amount <= 0) {
        setError('Could not detect an amount. Try: "Spent ₹500 on groceries via SBI"');
        setState(ENTRY_STATES.IDLE);
        return;
      }
      setParsedEntry({
        date: new Date().toISOString().split('T')[0],
        particulars: parsed.particulars || text,
        category: parsed.category || 'Others',
        subcategory: parsed.subcategory || null,
        account: parsed.account || 'UPI/Bank Accounts',
        accountSub: parsed.accountSub || null,
        application: parsed.application || null,
        amount: parsed.amount,
        confidence: parsed.confidence || 0.5,
      });
      setState(ENTRY_STATES.REVIEW);
    } catch (err) {
      setError('AI parsing failed. Please fill manually.');
      setState(ENTRY_STATES.IDLE);
    }
  }

  async function submitEntry() {
    if (!parsedEntry) return;
    setState(ENTRY_STATES.PROCESSING);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await addExpense(parsedEntry);
    if (result.success || result.queued) {
      setState(ENTRY_STATES.SUCCESS);
      successAnim.setValue(0);
      confettiAnim.setValue(0);
      setTimeout(() => {
        setState(ENTRY_STATES.IDLE);
        setRawText('');
        setManualInput('');
        setParsedEntry(null);
        successAnim.setValue(0);
      }, 2500);
    } else {
      setError('Save failed. Check connection.');
      setState(ENTRY_STATES.REVIEW);
    }
  }

  function updateField(field, value) {
    setParsedEntry(prev => ({ ...prev, [field]: value }));
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a', '#0f172a']} locations={[0, 0.4, 1]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <H2>Add Expense</H2>
            <Caption>Voice or text entry</Caption>
          </View>

          {/* SUCCESS STATE */}
          {state === ENTRY_STATES.SUCCESS && (
            <Animated.View style={[styles.successBox, {
              opacity: successAnim,
              transform: [{ scale: successAnim }]
            }]}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.successTitle}>Saved!</Text>
              <Text style={styles.successAmt}>
                ₹{parsedEntry?.amount?.toLocaleString('en-IN')} — {parsedEntry?.category}
              </Text>
              <Caption style={{ marginTop: 4 }}>
                {isOnline ? 'Synced to Google Sheets ✓' : 'Saved locally, will sync when online'}
              </Caption>
            </Animated.View>
          )}

          {/* VOICE MIC SECTION */}
          {state !== ENTRY_STATES.SUCCESS && (
            <GlassCard style={styles.micCard}>
              <Caption style={{ textAlign: 'center', marginBottom: 16 }}>
                Hold mic & say: "Spent ₹500 groceries SBI Paytm"
              </Caption>

              {/* Waveform */}
              <View style={styles.waveform}>
                {waveAnims.map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[styles.waveBar, {
                      transform: [{ scaleY: anim }],
                      backgroundColor: state === ENTRY_STATES.LISTENING
                        ? COLORS.chartColors[i % 10]
                        : 'rgba(255,255,255,0.2)',
                    }]}
                  />
                ))}
              </View>

              {/* Mic Button */}
              <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={state === ENTRY_STATES.PROCESSING}
                style={styles.micBtnWrap}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={state === ENTRY_STATES.LISTENING
                    ? [COLORS.red, '#dc2626']
                    : [COLORS.bgMid, COLORS.bgLight]}
                  style={styles.micBtn}
                >
                  <Text style={styles.micIcon}>
                    {state === ENTRY_STATES.PROCESSING ? '⏳' :
                     state === ENTRY_STATES.LISTENING ? '🔴' : '🎤'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <Caption style={{ textAlign: 'center', marginTop: 8 }}>
                {state === ENTRY_STATES.LISTENING ? 'Listening… release to stop' :
                 state === ENTRY_STATES.PROCESSING ? 'Processing with AI…' :
                 'Hold to record voice'}
              </Caption>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Caption style={{ marginHorizontal: 10 }}>OR TYPE</Caption>
                <View style={styles.orLine} />
              </View>

              <View style={styles.textInputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Spent 500 on groceries SBI Paytm"
                  placeholderTextColor={COLORS.textMuted}
                  value={manualInput}
                  onChangeText={setManualInput}
                  returnKeyType="done"
                  onSubmitEditing={() => processText(manualInput)}
                  editable={state !== ENTRY_STATES.PROCESSING}
                />
                <TouchableOpacity
                  onPress={() => processText(manualInput)}
                  style={styles.sendBtn}
                  disabled={!manualInput.trim() || state === ENTRY_STATES.PROCESSING}
                >
                  <LinearGradient colors={[COLORS.bgMid, COLORS.bgLight]} style={styles.sendBtnInner}>
                    <Text style={{ fontSize: 18 }}>→</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* REVIEW FORM */}
          {state === ENTRY_STATES.REVIEW && parsedEntry && (
            <NeumorphicCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <H3>Review Entry</H3>
                <Badge
                  label={parsedEntry.confidence > 0.7 ? `${Math.round(parsedEntry.confidence * 100)}% confident` : 'Low confidence'}
                  color={parsedEntry.confidence > 0.7 ? COLORS.green : COLORS.amber}
                />
              </View>
              <Caption style={{ marginBottom: 16 }}>AI-parsed. Tap any field to edit.</Caption>

              {/* Amount */}
              <FieldRow label="Amount (₹)" value={String(parsedEntry.amount)}
                onEdit={(v) => updateField('amount', parseFloat(v) || 0)}
                keyboardType="numeric" />

              {/* Particulars */}
              <FieldRow label="Description" value={parsedEntry.particulars}
                onEdit={(v) => updateField('particulars', v)} />

              {/* Category picker */}
              <View style={styles.fieldRow}>
                <Caption style={styles.fieldLabel}>Category</Caption>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {Object.keys(CATEGORIES).map(cat => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => { updateField('category', cat); updateField('subcategory', null); }}
                        style={[styles.chipBtn, parsedEntry.category === cat && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, parsedEntry.category === cat && styles.chipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Subcategory */}
              {CATEGORIES[parsedEntry.category]?.length > 0 && (
                <View style={styles.fieldRow}>
                  <Caption style={styles.fieldLabel}>Subcategory</Caption>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {CATEGORIES[parsedEntry.category].map(sub => (
                        <TouchableOpacity
                          key={sub}
                          onPress={() => updateField('subcategory', sub)}
                          style={[styles.chipBtn, parsedEntry.subcategory === sub && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, parsedEntry.subcategory === sub && styles.chipTextActive]}>
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Account */}
              <View style={styles.fieldRow}>
                <Caption style={styles.fieldLabel}>Account</Caption>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {ACCOUNTS.map(acc => (
                      <TouchableOpacity
                        key={acc}
                        onPress={() => { updateField('account', acc); updateField('accountSub', null); }}
                        style={[styles.chipBtn, parsedEntry.account === acc && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, parsedEntry.account === acc && styles.chipTextActive]}>
                          {acc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Account Sub */}
              {ACCOUNT_SUBS[parsedEntry.account]?.length > 0 && (
                <View style={styles.fieldRow}>
                  <Caption style={styles.fieldLabel}>Bank / Card</Caption>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {ACCOUNT_SUBS[parsedEntry.account].map(sub => (
                        <TouchableOpacity
                          key={sub}
                          onPress={() => updateField('accountSub', sub)}
                          style={[styles.chipBtn, parsedEntry.accountSub === sub && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, parsedEntry.accountSub === sub && styles.chipTextActive]}>
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* App */}
              <View style={styles.fieldRow}>
                <Caption style={styles.fieldLabel}>App Used</Caption>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {APPS.map(app => (
                      <TouchableOpacity
                        key={app}
                        onPress={() => updateField('application', app)}
                        style={[styles.chipBtn, parsedEntry.application === app && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, parsedEntry.application === app && styles.chipTextActive]}>
                          {app}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Date */}
              <FieldRow label="Date" value={parsedEntry.date}
                onEdit={(v) => updateField('date', v)} />

              {/* Summary */}
              <GradientCard colors={['#0d2b4e', '#0d1b3e']} style={styles.summaryBox}>
                <Text style={styles.summaryText}>
                  📅 {parsedEntry.date}  ·  {parsedEntry.category}
                  {parsedEntry.subcategory ? ` › ${parsedEntry.subcategory}` : ''}
                </Text>
                <Text style={styles.summaryText}>
                  💳 {parsedEntry.account}{parsedEntry.accountSub ? ` · ${parsedEntry.accountSub}` : ''}
                  {parsedEntry.application ? ` via ${parsedEntry.application}` : ''}
                </Text>
                <Text style={[styles.summaryText, { color: COLORS.red, fontSize: 18, fontWeight: '800', marginTop: 6 }]}>
                  −₹{parsedEntry.amount?.toLocaleString('en-IN')}
                </Text>
              </GradientCard>

              <View style={styles.reviewBtns}>
                <SecondaryButton title="Cancel" onPress={() => { setState(ENTRY_STATES.IDLE); setParsedEntry(null); }} style={{ flex: 1, marginRight: 8 }} />
                <PrimaryButton title="Save to Sheets ✓" onPress={submitEntry}
                  loading={state === ENTRY_STATES.PROCESSING} style={{ flex: 2 }} />
              </View>
            </NeumorphicCard>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── FieldRow ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, onEdit, keyboardType = 'default' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  return (
    <View style={styles.fieldRow}>
      <Caption style={styles.fieldLabel}>{label}</Caption>
      {editing ? (
        <TextInput
          style={styles.fieldInput}
          value={val}
          onChangeText={setVal}
          keyboardType={keyboardType}
          autoFocus
          onBlur={() => { onEdit(val); setEditing(false); }}
          onSubmitEditing={() => { onEdit(val); setEditing(false); }}
          returnKeyType="done"
        />
      ) : (
        <TouchableOpacity onPress={() => setEditing(true)} style={styles.fieldValue}>
          <Text style={styles.fieldValueText}>{val || '—'}</Text>
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  micCard: { marginBottom: 16, alignItems: 'center', padding: 24 },
  waveform: {
    flexDirection: 'row', alignItems: 'center',
    height: 50, gap: 5, marginBottom: 20,
  },
  waveBar: {
    width: 6, height: 40, borderRadius: 3,
  },
  micBtnWrap: { marginBottom: 8 },
  micBtn: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.bgMid, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 12,
  },
  micIcon: { fontSize: 36 },
  orRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginVertical: 16,
  },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  textInputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  textInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  sendBtn: {},
  sendBtnInner: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: COLORS.red, fontSize: 13 },
  reviewCard: { marginBottom: 16, padding: 20 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldRow: { marginBottom: 14 },
  fieldLabel: { marginBottom: 6, color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldValue: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  fieldValueText: { color: COLORS.textPrimary, fontSize: 14 },
  editIcon: { color: COLORS.textMuted, fontSize: 14 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.bgLight,
  },
  chipBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: COLORS.bgMid,
    borderColor: COLORS.bgLight,
  },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  summaryBox: { marginTop: 8, marginBottom: 16, padding: 14 },
  summaryText: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  reviewBtns: { flexDirection: 'row' },
  successBox: {
    alignItems: 'center', padding: 40,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  successEmoji: { fontSize: 60, marginBottom: 8 },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.green, marginBottom: 4 },
  successAmt: { fontSize: 16, color: COLORS.textSecondary },
});
