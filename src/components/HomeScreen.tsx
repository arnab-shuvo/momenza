import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Typography, Radius, Shadow } from '../theme';
import ProjectCard from './ProjectCard';
import ShareQRModal from './ShareQRModal';
import SummaryTasksModal from './SummaryTasksModal';

type SortMode = 'due-asc' | 'due-desc' | 'name-asc' | 'name-desc' | 'tasks-desc' | 'tasks-asc';

function NudgeBanner({ onSignIn, onDismiss }: { onSignIn?: () => void; onDismiss: () => void }) {
  const { colors } = useTheme();
  const pulse = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient
      colors={['#FF6B35', '#F7931E']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={styles.nudge}
    >
      <Animated.Text style={[styles.nudgeEmoji, { transform: [{ scale: pulse }] }]}>☁️</Animated.Text>
      <View style={styles.nudgeText}>
        <Text style={styles.nudgeTitle}>Your data lives only on this phone</Text>
        <Text style={styles.nudgeSub}>Sign in to back up &amp; sync across devices</Text>
      </View>
      <TouchableOpacity onPress={onSignIn} style={styles.nudgeBtn} activeOpacity={0.85}>
        <Text style={styles.nudgeBtnText}>Sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={styles.nudgeDismiss} activeOpacity={0.7}>
        <Feather name="x" size={14} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const SORT_OPTIONS: { key: SortMode; label: string; icon: string }[] = [
  { key: 'due-asc',    label: 'Due ↑',    icon: 'calendar' },
  { key: 'due-desc',   label: 'Due ↓',    icon: 'calendar' },
  { key: 'name-asc',   label: 'A → Z',    icon: 'type' },
  { key: 'name-desc',  label: 'Z → A',    icon: 'type' },
  { key: 'tasks-desc', label: 'Tasks ↓',  icon: 'list' },
  { key: 'tasks-asc',  label: 'Tasks ↑',  icon: 'list' },
];

function SummaryPill({
  icon, label, value, color, bg, onPress,
}: { icon: string; label: string; value: number; color: string; bg: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.summaryPill, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color + '30' }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type SummaryTab = 'active' | 'today' | 'week';

interface HomeScreenProps {
  projects: Project[];
  tasks: Task[];
  isAuthenticated: boolean;
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onArchiveManyProjects: (ids: string[]) => void;
  onDeleteManyProjects: (ids: string[]) => void;
  onSelectingChange?: (isSelecting: boolean) => void;
  onTaskPress?: (task: Task) => void;
  onSignIn?: () => void;
}

export default function HomeScreen({
  projects,
  tasks,
  isAuthenticated,
  onSelectProject,
  onEditProject,
  onArchiveProject,
  onDeleteProject,
  onArchiveManyProjects,
  onDeleteManyProjects,
  onSelectingChange,
  onTaskPress,
  onSignIn,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const [sort, setSort] = useState<SortMode>('due-asc');
  const [summaryTab, setSummaryTab] = useState<SummaryTab | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // ── batch selection ──────────────────────────────────────────────────────────
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareProject, setShareProject] = useState<Project | null>(null);

  function enterSelecting(id: string) {
    setIsSelecting(true);
    setSelectedIds(new Set([id]));
    onSelectingChange?.(true);
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
    onSelectingChange?.(false);
  }

  function toggleSelectAll() {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map(p => p.id)));
    }
  }

  function archiveSelected() {
    const ids = [...selectedIds];
    const totalTasks = ids.reduce((sum, id) => sum + (projectStats[id]?.taskCount ?? 0), 0);
    const msg = totalTasks > 0
      ? `Archive ${ids.length} project${ids.length > 1 ? 's' : ''} and their ${totalTasks} task${totalTasks > 1 ? 's' : ''}?`
      : `Archive ${ids.length} project${ids.length > 1 ? 's' : ''}?`;
    Alert.alert('Archive Projects', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', onPress: () => { cancelSelecting(); onArchiveManyProjects(ids); } },
    ]);
  }

  function deleteSelected() {
    const ids = [...selectedIds];
    const totalTasks = ids.reduce((sum, id) => sum + (projectStats[id]?.taskCount ?? 0), 0);
    const msg = totalTasks > 0
      ? `Permanently delete ${ids.length} project${ids.length > 1 ? 's' : ''} and their ${totalTasks} task${totalTasks > 1 ? 's' : ''}? This cannot be undone.`
      : `Permanently delete ${ids.length} project${ids.length > 1 ? 's' : ''}? This cannot be undone.`;
    Alert.alert('Delete Projects', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { cancelSelecting(); onDeleteManyProjects(ids); } },
    ]);
  }

  const shareTasks = useMemo(() =>
    shareProject ? tasks.filter(t => t.projectId === shareProject.id && t.status === 'active') : [],
    [tasks, shareProject]
  );

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);
  const todayEnd   = useMemo(() => todayStart + 86_400_000 - 1, [todayStart]);
  const weekStart  = useMemo(() => todayStart - (new Date().getDay() * 86_400_000), [todayStart]);

  const summary = useMemo(() => {
    let totalActive = 0;
    let dueToday    = 0;
    let completedThisWeek = 0;
    for (const t of tasks) {
      if (t.status === 'active') {
        totalActive++;
        if (t.taskDate) {
          const s = t.taskDate.start;
          const e = t.taskDate.end ?? s;
          if (s <= todayEnd && e >= todayStart) dueToday++;
        }
      }
      if (t.status === 'completed' && t.createdAt >= weekStart) {
        completedThisWeek++;
      }
    }
    return { totalActive, dueToday, completedThisWeek };
  }, [tasks, todayStart, todayEnd, weekStart]);

  const activeTasks       = useMemo(() => tasks.filter(t => t.status === 'active'), [tasks]);
  const dueTodayTasks     = useMemo(() => activeTasks.filter(t => {
    if (!t.taskDate) return false;
    const s = t.taskDate.start, e = t.taskDate.end ?? s;
    return s <= todayEnd && e >= todayStart;
  }), [activeTasks, todayStart, todayEnd]);
  const completedWeekTasks = useMemo(() =>
    tasks.filter(t => t.status === 'completed' && t.createdAt >= weekStart),
    [tasks, weekStart],
  );

  const summaryModalTasks = useMemo(() => {
    if (summaryTab === 'active') return activeTasks;
    if (summaryTab === 'today')  return dueTodayTasks;
    if (summaryTab === 'week')   return completedWeekTasks;
    return [];
  }, [summaryTab, activeTasks, dueTodayTasks, completedWeekTasks]);

  const projectStats = useMemo(() => {
    const stats: Record<string, { taskCount: number; dueTodayCount: number; earliestDue: number }> = {};
    for (const t of tasks) {
      if (t.status !== 'active') continue;
      if (!stats[t.projectId]) stats[t.projectId] = { taskCount: 0, dueTodayCount: 0, earliestDue: Infinity };
      stats[t.projectId].taskCount += 1;
      if (t.taskDate) {
        const s = t.taskDate.start;
        const e = t.taskDate.end ?? s;
        if (s <= todayEnd && e >= todayStart) stats[t.projectId].dueTodayCount += 1;
        if (s < stats[t.projectId].earliestDue) stats[t.projectId].earliestDue = s;
      }
    }
    return stats;
  }, [tasks, todayStart, todayEnd]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const sa = projectStats[a.id] ?? { taskCount: 0, dueTodayCount: 0, earliestDue: Infinity };
      const sb = projectStats[b.id] ?? { taskCount: 0, dueTodayCount: 0, earliestDue: Infinity };
      switch (sort) {
        case 'due-asc':
          return sa.earliestDue - sb.earliestDue;
        case 'due-desc':
          // push no-date projects to bottom
          if (sa.earliestDue === Infinity && sb.earliestDue === Infinity) return 0;
          if (sa.earliestDue === Infinity) return 1;
          if (sb.earliestDue === Infinity) return -1;
          return sb.earliestDue - sa.earliestDue;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'tasks-desc':
          return sb.taskCount - sa.taskCount;
        case 'tasks-asc':
          return sa.taskCount - sb.taskCount;
        default:
          return 0;
      }
    });
  }, [projects, projectStats, sort]);

  function handleArchiveProject(id: string) {
    const taskCount = projectStats[id]?.taskCount ?? 0;
    const msg = taskCount > 0
      ? `Archive this project and its ${taskCount} task${taskCount > 1 ? 's' : ''}?`
      : 'Archive this project?';
    Alert.alert('Archive Project', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', onPress: () => onArchiveProject(id) },
    ]);
  }

  function handleDeleteProject(id: string) {
    const taskCount = projectStats[id]?.taskCount ?? 0;
    const msg = taskCount > 0
      ? `Permanently delete this project and its ${taskCount} task${taskCount > 1 ? 's' : ''}? This cannot be undone.`
      : 'Permanently delete this project? This cannot be undone.';
    Alert.alert('Delete Project', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteProject(id) },
    ]);
  }

  if (projects.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📁</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No projects yet</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Tap + to create your first project
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <FlatList
      data={sortedProjects}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <View style={styles.listHeader} />

          {/* Nudge banner */}
          {!isAuthenticated && !nudgeDismissed && (
            <NudgeBanner onSignIn={onSignIn} onDismiss={() => setNudgeDismissed(true)} />
          )}

          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <SummaryPill icon="layers" label="Open tasks"     value={summary.totalActive}       color={colors.primary} bg={colors.primaryLight} onPress={() => setSummaryTab('active')} />
            <SummaryPill icon="zap"    label="Due today"      value={summary.dueToday}          color={colors.danger}  bg={colors.dangerLight}  onPress={() => setSummaryTab('today')} />
            <SummaryPill icon="award"  label="Done this week" value={summary.completedThisWeek} color={colors.success} bg={colors.successLight} onPress={() => setSummaryTab('week')} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortBar}
          >
            {SORT_OPTIONS.map(opt => {
              const active = sort === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSort(opt.key)}
                  activeOpacity={0.7}
                  style={[
                    styles.sortPill,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon as any}
                    size={12}
                    color={active ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.sortPillText, { color: active ? '#fff' : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      }
      ListFooterComponent={<View style={styles.listFooter} />}
      renderItem={({ item }) => {
        const stats = projectStats[item.id] ?? { taskCount: 0, dueTodayCount: 0, earliestDue: Infinity };
        return (
          <ProjectCard
            project={item}
            taskCount={stats.taskCount}
            dueTodayCount={stats.dueTodayCount}
            onPress={() => onSelectProject(item)}
            onLongPress={() => enterSelecting(item.id)}
            onEdit={onEditProject}
            onShare={setShareProject}
            onArchive={handleArchiveProject}
            onDelete={handleDeleteProject}
            isSelecting={isSelecting}
            isSelected={selectedIds.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
          />
        );
      }}
    />

    {/* ── Selection bar ── */}
    {isSelecting && (
      <LinearGradient
        colors={['rgba(91,95,237,0)', 'rgba(91,95,237,0.12)', 'rgba(91,95,237,0.22)']}
        style={styles.selectionBarWrap}
        pointerEvents="box-none"
      >
        <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={toggleSelectAll}
            activeOpacity={0.7}
            style={[styles.selectAllBox, {
              borderColor: selectedIds.size === projects.length ? colors.primary : colors.border,
              backgroundColor: selectedIds.size === projects.length ? colors.primary : 'transparent',
            }]}
          >
            {selectedIds.size > 0 && (
              <Feather name={selectedIds.size === projects.length ? 'check' : 'minus'} size={12} color="#fff" />
            )}
          </TouchableOpacity>

          <View style={[styles.selectionCountBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.selectionCount, { color: colors.primary }]}>{selectedIds.size}</Text>
          </View>
          <Text style={[styles.selectionLabel, { color: colors.textSecondary }]}>selected</Text>

          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.selectionIconBtn, { backgroundColor: colors.primaryLight, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
              onPress={archiveSelected}
              activeOpacity={0.75}
              disabled={selectedIds.size === 0}
            >
              <Feather name="archive" size={18} color={colors.primary} />
            </TouchableOpacity>

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

    <ShareQRModal
      visible={shareProject !== null}
      tasks={shareTasks}
      projectName={shareProject?.name}
      projectColor={shareProject?.color}
      onClose={() => setShareProject(null)}
    />

    <SummaryTasksModal
      visible={summaryTab !== null}
      title={summaryTab === 'active' ? 'Open Tasks' : summaryTab === 'today' ? 'Due Today' : 'Done This Week'}
      icon={summaryTab === 'active' ? 'layers' : summaryTab === 'today' ? 'zap' : 'award'}
      accentColor={summaryTab === 'active' ? colors.primary : summaryTab === 'today' ? colors.danger : colors.success}
      tasks={summaryModalTasks}
      projects={projects}
      onClose={() => setSummaryTab(null)}
      onTaskPress={task => { setSummaryTab(null); onTaskPress?.(task); }}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: 0 },
  listHeader: { height: Spacing.sm },
  listFooter: { height: Spacing.xl * 3 },
  summaryStrip: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  summaryPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.sm,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '700' as const, lineHeight: 26 },
  summaryLabel: { ...Typography.caption, textAlign: 'center', opacity: 0.85 },

  sortBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sortPillText: { ...Typography.caption, fontWeight: '600' },
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
  selectAllBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  selectionCountBadge: {
    minWidth: 28, height: 28, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  selectionCount: { ...Typography.bodyMedium },
  selectionLabel: { ...Typography.caption, flex: 1 },
  selectionActions: { flexDirection: 'row', gap: Spacing.sm },
  selectionIconBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  nudge: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm,
  },
  nudgeEmoji: { fontSize: 26 },
  nudgeText: { flex: 1 },
  nudgeTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  nudgeSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  nudgeBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  nudgeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  nudgeDismiss: { padding: 4 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.h2, textAlign: 'center' },
  emptySub: { ...Typography.body, textAlign: 'center', opacity: 0.8 },
});
