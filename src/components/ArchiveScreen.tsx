import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';

type TopTab = 'projects' | 'tasks';

interface ArchiveScreenProps {
  visible: boolean;
  tasks: Task[];
  projects: Project[];
  archivedProjects: Project[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onClose: () => void;
}

export default function ArchiveScreen({
  visible,
  tasks,
  projects,
  archivedProjects,
  onRestore,
  onDelete,
  onDeleteMany,
  onRestoreProject,
  onDeleteProject,
  onClose,
}: ArchiveScreenProps) {
  const { colors } = useTheme();
  const [topTab, setTopTab] = useState<TopTab>('projects');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function enterSelecting(id: string) {
    setIsSelecting(true);
    setSelectedIds(new Set([id]));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function cancelSelecting() {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }

  function deleteSelected() {
    const ids = [...selectedIds];
    cancelSelecting();
    onDeleteMany(ids);
  }

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSelecting) { cancelSelecting(); } else { onClose(); }
      return true;
    });
    return () => sub.remove();
  }, [visible, isSelecting]);

  function handleDeleteProject(id: string) {
    Alert.alert(
      'Delete Project',
      'This will permanently delete the project and all its tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteProject(id) },
      ]
    );
  }

  // Build project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) map.set(p.id, p);
    for (const p of archivedProjects) map.set(p.id, p);
    return map;
  }, [projects, archivedProjects]);

  // Group archived tasks by project —
  // includes individually archived tasks AND all tasks belonging to an archived project
  const archivedProjectIds = useMemo(
    () => new Set(archivedProjects.map(p => p.id)),
    [archivedProjects],
  );

  const taskSections = useMemo(() => {
    const relevant = tasks.filter(
      t => t.status === 'archived' || archivedProjectIds.has(t.projectId),
    );
    const byProject: Record<string, Task[]> = {};
    for (const t of relevant) {
      if (!byProject[t.projectId]) byProject[t.projectId] = [];
      byProject[t.projectId].push(t);
    }
    return Object.entries(byProject).map(([projectId, data]) => {
      const proj = projectMap.get(projectId);
      return {
        projectId,
        projectName: proj?.name ?? 'Unknown',
        projectColor: proj?.color ?? '#999',
        isArchivedProject: archivedProjectIds.has(projectId),
        data,
      };
    });
  }, [tasks, projectMap, archivedProjectIds]);

  const archivedTaskCount = useMemo(
    () => tasks.filter(t => t.status === 'archived' || archivedProjectIds.has(t.projectId)).length,
    [tasks, archivedProjectIds],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Archive</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Top tabs */}
        <View style={[styles.topTabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {([
            { key: 'projects' as TopTab, label: 'Projects', count: archivedProjects.length },
            { key: 'tasks'    as TopTab, label: 'Tasks',    count: archivedTaskCount },
          ]).map(({ key, label, count }) => {
            const isActive = topTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.topTab,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  isActive && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => setTopTab(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.topTabLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
                  {label}
                </Text>
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: isActive ? colors.primary : colors.border }]}>
                    <Text style={[styles.badgeText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Projects tab */}
        {topTab === 'projects' ? (
          archivedProjects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No archived projects</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Archived projects will appear here</Text>
            </View>
          ) : (
            <SectionList
              sections={[{ data: archivedProjects }]}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.sm]}>
                  <View style={[styles.projectColorDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.restoreButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                      onPress={() => onRestoreProject(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.restoreText, { color: colors.primary }]}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.dangerLight }]}
                      onPress={() => handleDeleteProject(item.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={15} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )
        ) : (
          /* Tasks tab — grouped by project */
          taskSections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No archived tasks</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Archived tasks will appear here</Text>
            </View>
          ) : (
            <View style={styles.flex}>
              <SectionList
                sections={taskSections}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, isSelecting && { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
                renderSectionHeader={({ section }) => (
                  <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                    <View style={[styles.sectionDot, { backgroundColor: section.projectColor }]} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      {section.projectName}
                    </Text>
                    {section.isArchivedProject && (
                      <View style={[styles.archivedProjectBadge, { backgroundColor: colors.border }]}>
                        <Feather name="archive" size={10} color={colors.textSecondary} />
                        <Text style={[styles.archivedProjectBadgeText, { color: colors.textSecondary }]}>
                          project archived
                        </Text>
                      </View>
                    )}
                    <View style={[styles.sectionCount, { backgroundColor: colors.border }]}>
                      <Text style={[styles.sectionCountText, { color: colors.textSecondary }]}>
                        {section.data.length}
                      </Text>
                    </View>
                  </View>
                )}
                renderItem={({ item }) => {
                  const selected = selectedIds.has(item.id);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onLongPress={isSelecting ? undefined : () => enterSelecting(item.id)}
                      onPress={isSelecting ? () => toggleSelect(item.id) : undefined}
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        Shadow.sm,
                        selected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                      ]}
                    >
                      {isSelecting ? (
                        <View style={[
                          styles.selectionCircle,
                          { borderColor: selected ? colors.primary : colors.border },
                          selected && { backgroundColor: colors.primary },
                        ]}>
                          {selected && <Feather name="check" size={12} color="#fff" />}
                        </View>
                      ) : (
                        <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                          <Feather name="archive" size={12} color={colors.primary} />
                        </View>
                      )}
                      <Text
                        style={[styles.cardTitle, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      {!isSelecting && (
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={[styles.restoreButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                            onPress={() => onRestore(item.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.restoreText, { color: colors.primary }]}>Restore</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: colors.dangerLight }]}
                            onPress={() => onDelete(item.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="trash-2" size={15} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              {isSelecting && (
                <LinearGradient
                  colors={['rgba(91,95,237,0)', 'rgba(91,95,237,0.12)', 'rgba(91,95,237,0.22)']}
                  style={styles.selectionBarWrap}
                  pointerEvents="box-none"
                >
                  <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.selectionCountBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.selectionCount, { color: colors.primary }]}>
                        {selectedIds.size}
                      </Text>
                    </View>
                    <Text style={[styles.selectionLabel, { color: colors.textSecondary }]}>selected</Text>
                    <View style={styles.selectionActions}>
                      <TouchableOpacity
                        style={[styles.selectionIconBtn, { backgroundColor: colors.dangerLight, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
                        onPress={deleteSelected}
                        activeOpacity={0.75}
                        disabled={selectedIds.size === 0}
                      >
                        <Feather name="trash-2" size={18} color={colors.danger} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.selectionIconBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                        onPress={cancelSelecting}
                        activeOpacity={0.75}
                      >
                        <Feather name="x" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              )}
            </View>
          )
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40, height: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', ...Typography.h2 },
  headerRight: { width: 40 },

  topTabBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  topTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  topTabLabel: { ...Typography.captionMedium },
  badge: {
    minWidth: 18, height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  sectionTitle: { ...Typography.captionMedium, letterSpacing: 0.5, flex: 1 },
  sectionCount: {
    minWidth: 18, height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sectionCountText: { fontSize: 10, fontWeight: '600' },

  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, paddingTop: Spacing.xs, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardIcon: {
    width: 28, height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  cardTitle: { flex: 1, ...Typography.body, marginRight: Spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 0 },
  restoreButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  restoreText: { ...Typography.captionMedium },
  iconBtn: {
    width: 32, height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectColorDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0, marginRight: Spacing.sm },
  archivedProjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
  },
  archivedProjectBadgeText: { fontSize: 10, fontWeight: '500' as const },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.h2, marginBottom: Spacing.sm, textAlign: 'center' },
  emptySubtitle: { ...Typography.body, textAlign: 'center' },

  selectionCircle: {
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  selectionBarWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  selectionCountBadge: {
    minWidth: 28, height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  selectionCount: { ...Typography.bodyMedium },
  selectionLabel: { ...Typography.caption, flex: 1 },
  selectionActions: { flexDirection: 'row', gap: Spacing.sm },
  selectionIconBtn: {
    width: 38, height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
