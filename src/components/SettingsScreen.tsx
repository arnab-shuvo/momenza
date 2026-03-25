import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Typography } from '../theme';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme();

  async function handleSignOut() {
    await supabase.auth.signOut();
    onClose();
  }

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name='arrow-left' size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Section: Appearance */}
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
            Appearance
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingRow
              label='Theme'
              description={isDark ? 'Dark' : 'Light'}
              colors={colors}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                  thumbColor='#FFFFFF'
                  ios_backgroundColor='#CBD5E1'
                />
              }
            />
          </View>

          {/* Section: Account */}
          <Text style={[styles.sectionHeader, { color: colors.textPrimary, marginTop: Spacing.xl }]}>
            Account
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Feather name="log-out" size={18} color={colors.danger} />
              <Text style={[styles.rowLabel, { color: colors.danger }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Reusable row ─────────────────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  colors,
  right,
  isLast,
}: {
  label: string;
  description?: string;
  colors: any;
  right: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },

  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.md,
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowDesc: { fontSize: 13, marginTop: 2 },
});
