import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Typography, Radius } from '../theme';
import ProjectCard from './ProjectCard';

type SortMode = 'due-asc' | 'due-desc' | 'name-asc' | 'name-desc' | 'tasks-desc' | 'tasks-asc';

const SORT_OPTIONS: { key: SortMode; label: string; icon: string }[] = [
  { key: 'due-asc',    label: 'Due ↑',    icon: 'calendar' },
  { key: 'due-desc',   label: 'Due ↓',    icon: 'calendar' },
  { key: 'name-asc',   label: 'A → Z',    icon: 'type' },
  { key: 'name-desc',  label: 'Z → A',    icon: 'type' },
  { key: 'tasks-desc', label: 'Tasks ↓',  icon: 'list' },
  { key: 'tasks-asc',  label: 'Tasks ↑',  icon: 'list' },
];

function SummaryPill({
  icon, label, value, color, bg,
}: { icon: string; label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.summaryPill, { backgroundColor: bg }]}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color + '30' }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

interface HomeScreenProps {
  projects: Project[];
  tasks: Task[];
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export default function HomeScreen({
  projects,
  tasks,
  onSelectProject,
  onEditProject,
  onArchiveProject,
  onDeleteProject,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const [sort, setSort] = useState<SortMode>('due-asc');

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

  function handleDeleteProject(id: string) {
    Alert.alert(
      'Delete Project',
      'This will permanently delete the project and all its tasks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteProject(id) },
      ]
    );
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
    <FlatList
      data={sortedProjects}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <View style={styles.listHeader} />

          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <SummaryPill icon="layers"    label="Open tasks"     value={summary.totalActive}       color={colors.primary}  bg={colors.primaryLight} />
            <SummaryPill icon="zap"       label="Due today"      value={summary.dueToday}          color={colors.danger}   bg={colors.dangerLight} />
            <SummaryPill icon="award"     label="Done this week" value={summary.completedThisWeek} color={colors.success}  bg={colors.successLight} />
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
            onEdit={onEditProject}
            onArchive={onArchiveProject}
            onDelete={handleDeleteProject}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
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
