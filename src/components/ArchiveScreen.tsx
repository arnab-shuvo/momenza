import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Task, ArchiveFilterType } from '../types/task';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';

interface ArchiveScreenProps {
  visible: boolean;
  tasks: Task[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ArchiveScreen({
  visible,
  tasks,
  onRestore,
  onDelete,
  onClose,
}: ArchiveScreenProps) {
  const { colors } = useTheme();
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilterType>('completed');

  const filteredTasks  = tasks.filter((t) => t.status === archiveFilter);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const archivedCount  = tasks.filter((t) => t.status === 'archived').length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.backIcon, { color: colors.textPrimary }]}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Archive</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {([
            { key: 'completed' as ArchiveFilterType, label: 'Done', emoji: '✅', count: completedCount },
            { key: 'archived' as ArchiveFilterType, label: 'Archived', emoji: '📦', count: archivedCount },
          ]).map(({ key, label, emoji, count }) => {
            const isActive = archiveFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterTab,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  isActive && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => setArchiveFilter(key)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterEmoji}>{emoji}</Text>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }, isActive && { color: colors.primary }]}>
                  {label}
                </Text>
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.border }, isActive && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }, isActive && { color: '#FFFFFF' }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{archiveFilter === 'completed' ? '📋' : '📦'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {archiveFilter === 'completed' ? 'No completed tasks' : 'No archived tasks'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {archiveFilter === 'completed'
                ? 'Completed tasks will appear here'
                : 'Archived tasks will appear here'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.sm]}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: item.status === 'completed' ? colors.success : colors.primaryLight },
                  ]}
                >
                  <Text style={styles.cardIconText}>
                    {item.status === 'completed' ? '✓' : '📦'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: item.status === 'completed' ? colors.completed : colors.textSecondary },
                  ]}
                  numberOfLines={3}
                >
                  {item.title}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.restoreButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => onRestore(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.restoreText, { color: colors.primary }]}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.dangerLight }]}
                    onPress={() => onDelete(item.id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backIcon: { fontSize: 18, marginTop: -1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...Typography.h2 },
  headerSubtitle: { ...Typography.caption, marginTop: 2 },
  headerRight: { width: 36 },
  filterBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  filterEmoji: { fontSize: 14 },
  filterLabel: { ...Typography.captionMedium },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1 },
  cardIcon: { width: 24, height: 24, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, flexShrink: 0 },
  cardIconText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardTitle: { flex: 1, ...Typography.body, textDecorationLine: 'line-through', marginRight: Spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 0 },
  restoreButton: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, borderWidth: 1 },
  restoreText: { ...Typography.captionMedium },
  deleteButton: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { fontSize: 14, color: '#E53935' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.h2, marginBottom: Spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...Typography.body, textAlign: 'center' },
});
