import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';

interface SettingsModalProps {
  visible: boolean;
  archivedCount: number;
  onOpenArchive: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  visible,
  archivedCount,
  onOpenArchive,
  onClose,
}: SettingsModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STORAGE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.sm]}>
            <TouchableOpacity style={styles.row} onPress={onOpenArchive} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: colors.successLight }]}>
                <Text style={styles.rowEmoji}>📦</Text>
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Archive</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Done & deleted tasks</Text>
              </View>
              <View style={styles.rowRight}>
                {archivedCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{archivedCount}</Text>
                  </View>
                )}
                <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>TaskManager • v1.0.0</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: { width: 48 },
  headerTitle: { ...Typography.h2 },
  closeButton: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  closeText: { ...Typography.bodyMedium },
  section: { marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  sectionLabel: { ...Typography.captionMedium, letterSpacing: 0.8, marginBottom: Spacing.sm },
  card: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  rowEmoji: { fontSize: 18 },
  rowContent: { flex: 1 },
  rowTitle: { ...Typography.bodyMedium },
  rowSubtitle: { ...Typography.caption, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  badge: { minWidth: 22, height: 22, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  chevron: { fontSize: 22, marginTop: -1 },
  footer: { position: 'absolute', bottom: Spacing.xl, left: 0, right: 0, alignItems: 'center' },
  footerText: { ...Typography.caption },
});
