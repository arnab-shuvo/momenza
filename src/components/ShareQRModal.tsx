import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types/task';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Typography, Shadow } from '../theme';

interface Props {
  visible: boolean;
  tasks: Task[];
  projectName?: string;
  projectColor?: string;
  onClose: () => void;
}

function encodeTasks(tasks: Task[], projectName?: string, projectColor?: string): string {
  const payload: Record<string, unknown> = {
    tasks: tasks.map(t => ({
      t: t.title,
      ...(t.description ? { d: t.description } : {}),
      ...(t.taskDate ? {
        dt: t.taskDate.type,
        s:  t.taskDate.start,
        ...(t.taskDate.end ? { e: t.taskDate.end } : {}),
      } : {}),
    })),
  };
  if (projectName)  payload.pn = projectName;
  if (projectColor) payload.pc = projectColor;

  const json    = JSON.stringify(payload);
  const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  return `momenza://import?d=${encoded}`;
}

const MAX_TASKS = 10;

export default function ShareQRModal({ visible, tasks, projectName, projectColor, onClose }: Props) {
  const { colors, isDark } = useTheme();

  const limited   = tasks.slice(0, MAX_TASKS);
  const truncated = tasks.length > MAX_TASKS;
  const url       = useMemo(() => encodeTasks(limited, projectName, projectColor), [limited, projectName, projectColor]);
  const byteSize  = url.length;
  const tooBig    = byteSize > 2800;

  async function handleShareLink() {
    await Share.share({ message: url });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>

        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Share Tasks</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <LinearGradient
            colors={isDark ? ['#2D2260', '#1A1440'] : ['#EEF0FF', '#F5F3FF']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.qrCard, { borderColor: colors.primary + '44' }]}
          >
            {projectName && (
              <View style={styles.projectBadge}>
                {projectColor && (
                  <View style={[styles.projectDotBadge, { backgroundColor: projectColor }]} />
                )}
                <Text style={[styles.projectBadgeText, { color: colors.textSecondary }]}>
                  {projectName}
                </Text>
              </View>
            )}

            {tooBig ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorEmoji}>⚠️</Text>
                <Text style={[styles.errorText, { color: colors.textPrimary }]}>
                  Too much data for a single QR code.
                  {'\n'}Select fewer tasks.
                </Text>
              </View>
            ) : (
              <View style={[styles.qrWrap, { backgroundColor: '#fff' }]}>
                <QRCode
                  value={url}
                  size={220}
                  color="#111"
                  backgroundColor="#fff"
                  ecl="M"
                />
              </View>
            )}

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Ask the other person to open Momenza and tap{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>Scan QR</Text>
            </Text>
          </LinearGradient>

          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleShareLink}
            activeOpacity={0.75}
          >
            <Feather name="share-2" size={18} color={colors.primary} />
            <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share as Link</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              TASKS IN THIS QR  ·  {limited.length}{truncated ? ` of ${tasks.length}` : ''}
            </Text>
            {truncated && (
              <Text style={[styles.truncNote, { color: colors.danger }]}>
                Only first {MAX_TASKS} tasks included
              </Text>
            )}
            <View style={[styles.taskList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {limited.map((t, i) => (
                <View
                  key={t.id}
                  style={[
                    styles.taskRow,
                    i < limited.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36 },
  title: { flex: 1, textAlign: 'center', ...Typography.h2 },

  content: { padding: Spacing.lg, gap: Spacing.xl },

  qrCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.sm,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  projectDotBadge: { width: 10, height: 10, borderRadius: 5 },
  projectBadgeText: { ...Typography.captionMedium },
  qrWrap: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  hint: { textAlign: 'center', ...Typography.caption, lineHeight: 18 },

  errorBox: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  errorEmoji: { fontSize: 40 },
  errorText: { textAlign: 'center', ...Typography.body },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  shareBtnText: { ...Typography.bodyMedium },

  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.captionMedium, letterSpacing: 0.8 },
  truncNote: { ...Typography.caption, fontWeight: '600' },

  taskList: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  taskTitle: { flex: 1, ...Typography.body },
});
