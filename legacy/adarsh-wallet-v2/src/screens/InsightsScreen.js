// src/screens/InsightsScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Animated, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { geminiAPI } from '../services/api';
import { useApp } from '../utils/AppContext';
import { COLORS } from '../utils/constants';
import { GlassCard, GradientCard, H2, H3, Caption, Body } from '../components/UI';

const QUICK_QUESTIONS = [
  'How much did I spend this month?',
  'What\'s my biggest expense category?',
  'How is my net worth trending?',
  'Am I on track with savings?',
  'Compare this month vs last month',
  'What\'s my food spend?',
];

export default function InsightsScreen() {
  const { dashboard, categoryTotals, monthlyTotals, balances, selectedMonth, selectedYear } = useApp();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hey Adarsh! 👋 I\'m your AI finance assistant. Ask me anything about your spending, savings, or net worth.',
      ts: new Date().toLocaleTimeString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function buildContext() {
    return {
      netWorth: dashboard?.netWorth || balances.reduce((s, b) => s + b.balance, 0),
      accounts: balances,
      currentMonth: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
      categoryTotals: categoryTotals.map(c => ({ category: c.category, total: c.total, count: c.count })),
      monthlyTotals: monthlyTotals,
      totalSpend: categoryTotals.reduce((s, c) => s + c.total, 0),
      investments: dashboard?.investments,
    };
  }

  async function sendMessage(text) {
    const question = (text || input).trim();
    if (!question) return;
    setInput('');
    inputRef.current?.blur();

    const userMsg = { role: 'user', text: question, ts: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const context = buildContext();
      const answer = await geminiAPI.getInsight(question, context);
      const aiMsg = { role: 'assistant', text: answer, ts: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I couldn\'t get insights right now. Check your Gemini API key.',
        ts: new Date().toLocaleTimeString(),
      }]);
    }
    setLoading(false);
  }

  function speakLast() {
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAI) return;
    setSpeaking(true);
    Speech.speak(lastAI.text, {
      language: 'en-IN',
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
    });
  }

  function stopSpeaking() {
    Speech.stop();
    setSpeaking(false);
  }

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a', '#0f172a']} locations={[0, 0.4, 1]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <H2>AI Insights</H2>
            <Caption>Powered by Gemini</Caption>
          </View>
          <TouchableOpacity onPress={speaking ? stopSpeaking : speakLast} style={styles.speakBtn}>
            <LinearGradient
              colors={speaking ? [COLORS.red, '#dc2626'] : [COLORS.bgMid, COLORS.bgLight]}
              style={styles.speakBtnInner}
            >
              <Text style={{ fontSize: 20 }}>{speaking ? '🔇' : '🔊'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick insight cards */}
        <View style={styles.statsRow}>
          <QuickStatCard
            label="This Month"
            value={`₹${categoryTotals.reduce((s, c) => s + c.total, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub={`${categoryTotals.length} categories`}
            color={COLORS.red}
          />
          <QuickStatCard
            label="Net Worth"
            value={`₹${(balances.reduce((s, b) => s + b.balance, 0) / 1000).toFixed(0)}k`}
            sub="across all accounts"
            color={COLORS.green}
          />
        </View>

        {/* Quick Questions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
          {QUICK_QUESTIONS.map((q, i) => (
            <TouchableOpacity key={i} onPress={() => sendMessage(q)} style={styles.quickChip}>
              <Text style={styles.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Chat */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator color={COLORS.cyan} size="small" />
              <Caption style={{ marginLeft: 8 }}>Thinking…</Caption>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="Ask about your finances…"
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            multiline={false}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={styles.sendBtn}
          >
            <LinearGradient
              colors={input.trim() ? [COLORS.bgMid, COLORS.bgLight] : ['#222', '#333']}
              style={styles.sendBtnInner}
            >
              <Text style={{ fontSize: 18, color: '#fff' }}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function MessageBubble({ msg }) {
  const isAI = msg.role === 'assistant';
  return (
    <View style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleUser]}>
      {isAI && <Text style={styles.bubbleAIIcon}>✨</Text>}
      <View style={[styles.bubbleInner, isAI ? styles.bubbleInnerAI : styles.bubbleInnerUser]}>
        <Text style={[styles.bubbleText, isAI ? styles.bubbleTextAI : styles.bubbleTextUser]}>
          {msg.text}
        </Text>
        <Caption style={[styles.bubbleTs, isAI ? null : { textAlign: 'right' }]}>{msg.ts}</Caption>
      </View>
    </View>
  );
}

function QuickStatCard({ label, value, sub, color }) {
  return (
    <GlassCard style={styles.statCard}>
      <Caption>{label}</Caption>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Caption style={{ fontSize: 10 }}>{sub}</Caption>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  speakBtn: {},
  speakBtnInner: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  statCard: { flex: 1, padding: 12 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  quickRow: { paddingLeft: 20, marginBottom: 8, maxHeight: 44 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  quickChipText: { fontSize: 12, color: COLORS.textSecondary },
  chatArea: { flex: 1, paddingHorizontal: 16 },
  chatContent: { paddingBottom: 8 },
  bubble: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleAI: { justifyContent: 'flex-start' },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleAIIcon: { fontSize: 20, marginRight: 8, marginBottom: 4 },
  bubbleInner: { maxWidth: '80%', borderRadius: 18, padding: 12 },
  bubbleInnerAI: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleInnerUser: {
    backgroundColor: COLORS.bgMid,
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextAI: { color: COLORS.textPrimary },
  bubbleTextUser: { color: '#fff' },
  bubbleTs: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sendBtn: {},
  sendBtnInner: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
});
