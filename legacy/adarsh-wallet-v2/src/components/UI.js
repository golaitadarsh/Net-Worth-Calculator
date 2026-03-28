// src/components/UI.js
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../utils/constants';

// ─── GlassCard ───────────────────────────────────────────────────────────────
export function GlassCard({ children, style, onPress }) {
  const Inner = (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{Inner}</TouchableOpacity>;
  return Inner;
}

// ─── GradientCard ────────────────────────────────────────────────────────────
export function GradientCard({ children, style, colors, onPress }) {
  const Inner = (
    <LinearGradient
      colors={colors || [COLORS.cardDark, COLORS.cardLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientCard, style]}
    >
      {children}
    </LinearGradient>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{Inner}</TouchableOpacity>;
  return Inner;
}

// ─── NeumorphicCard ──────────────────────────────────────────────────────────
export function NeumorphicCard({ children, style, onPress }) {
  const Inner = (
    <View style={[styles.neumorphic, style]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.9}>{Inner}</TouchableOpacity>;
  return Inner;
}

// ─── Typography ──────────────────────────────────────────────────────────────
export function H1({ children, style }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function H3({ children, style }) {
  return <Text style={[styles.h3, style]}>{children}</Text>;
}
export function Body({ children, style }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Caption({ children, style }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}
export function AmountText({ value, style, showSign = false }) {
  const color = value < 0 ? COLORS.red : COLORS.green;
  const sign = showSign && value > 0 ? '+' : '';
  return (
    <Text style={[styles.amount, { color }, style]}>
      {sign}₹{Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </Text>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function PrimaryButton({ title, onPress, loading: isLoading, style, icon }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={isLoading} activeOpacity={0.85}>
      <LinearGradient
        colors={[COLORS.bgMid, COLORS.bgLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.primaryBtn, style]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon}
            <Text style={styles.primaryBtnText}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.secondaryBtn, style]}
    >
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: (color || COLORS.purple) + '33' }]}>
      <Text style={[styles.badgeText, { color: color || COLORS.purple }]}>{label}</Text>
    </View>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
export function Skeleton({ width, height, style }) {
  return (
    <View style={[styles.skeleton, { width, height }, style]} />
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
export function StatusDot({ online }) {
  return (
    <View style={[styles.statusDot, { backgroundColor: online ? COLORS.green : COLORS.red }]} />
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
  },
  gradientCard: {
    borderRadius: 20,
    padding: 16,
  },
  neumorphic: {
    backgroundColor: '#0d1b3e',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  amount: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skeleton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
});
