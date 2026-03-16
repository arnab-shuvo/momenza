import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Typography } from '../theme';

export default function EmptyState() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📝</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>No tasks yet</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add your first task above to get started</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emoji: { fontSize: 56, marginBottom: Spacing.lg },
  title: { ...Typography.h2, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
});
