import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { Task } from '../types/task';
import { Project } from '../types/project';

type TaskSortMode = 'alpha' | 'date-asc' | 'date-desc';

const SORT_OPTIONS: { key: TaskSortMode; label: string }[] = [
  { key: 'alpha',     label: 'A → Z' },
  { key: 'date-asc',  label: 'Date ↑' },
  { key: 'date-desc', label: 'Date ↓' },
];

type ListItem =
  | { type: 'header'; project: Project | null; count: number }
  | { type: 'task';   task: Task };

interface Props {
  visible: boolean;
  title: string;
  icon: string;
  accentColor: string;
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onTaskPress: (task: Task) => void;
}

const SCREEN_H = Dimensions.get('window').height;

export default function SummaryTasksModal({
  visible, title, icon, accentColor, tasks, projects, onClose, onTaskPress,
}: Props) {
  const { colors, isDark } = useTheme();
  const [sort, setSort] = useState<TaskSortMode>('date-asc');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 3, speed: 14 }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const projectMap = useMemo(() => {
    const m: Record<string, Project> = {};
    for (const p of projects) m[p.id] = p;
    return m;
  }, [projects]);

  const sortedTasks = useMemo(() => {
    const arr = [...tasks];
    if (sort === 'alpha') {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'date-asc') {
      arr.sort((a, b) => (a.taskDate?.start ?? Infinity) - (b.taskDate?.start ?? Infinity));
    } else {
      arr.sort((a, b) => {
        const ad = a.taskDate?.start ?? -Infinity;
        const bd = b.taskDate?.start ?? -Infinity;
        return bd - ad;
      });
    }
    return arr;
  }, [tasks, sort]);

  // Group tasks by project
  const listItems = useMemo((): ListItem[] => {
    const groups = new Map<string, Task[]>();
    for (const t of sortedTasks) {
      const key = t.projectId ?? '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    const items: ListItem[] = [];
    groups.forEach((groupTasks, projectId) => {
      const project = projectMap[projectId] ?? null;
      items.push({ type: 'header', project, count: groupTasks.length });
      for (const t of groupTasks) items.push({ type: 'task', task: t });
    });
    return items;
  }, [sortedTasks, projectMap]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY }] }, Shadow.md]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
            <Feather name={icon as any} size={18} color={accentColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.background }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sort bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.sortBar, { borderBottomColor: colors.border }]}
        >
          {SORT_OPTIONS.map(opt => {
            const active = sort === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSort(opt.key)}
                activeOpacity={0.7}
                style={[styles.sortPill, {
                  backgroundColor: active ? accentColor : colors.background,
                  borderColor: active ? accentColor : colors.border,
                }]}
              >
                <Text style={[styles.sortPillText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Task list */}
        {tasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing here</Text>
          </View>
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={(item, i) => item.type === 'header' ? `h-${i}` : item.task.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                const p = item.project;
                return (
                  <View style={[styles.sectionHeader, { borderLeftColor: p?.color ?? colors.border }]}>
                    {p ? (
                      <>
                        <View style={[styles.sectionDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{p.name}</Text>
                      </>
                    ) : (
                      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>No Project</Text>
                    )}
                    <View style={[styles.sectionBadge, { backgroundColor: (p?.color ?? colors.border) + '22' }]}>
                      <Text style={[styles.sectionBadgeText, { color: p?.color ?? colors.textSecondary }]}>{item.count}</Text>
                    </View>
                  </View>
                );
              }

              const { task } = item;
              const project = projectMap[task.projectId];
              const dotColor = project?.color ?? accentColor;
              const isCompleted = task.status === 'completed';
              const dateStr = task.taskDate
                ? new Date(task.taskDate.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : null;

              return (
                <TouchableOpacity
                  style={[styles.taskRow, { backgroundColor: colors.background, borderLeftColor: dotColor }]}
                  onPress={() => { onClose(); setTimeout(() => onTaskPress(task), 200); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.taskDot, { backgroundColor: dotColor }]} />
                  <View style={styles.taskBody}>
                    <Text
                      style={[styles.taskTitle, { color: colors.textPrimary }, isCompleted && styles.taskTitleDone]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>
                    {dateStr && (
                      <Text style={[styles.taskDate, { color: colors.textSecondary }]}>📅 {dateStr}</Text>
                    )}
                  </View>
                  {isCompleted && (
                    <View style={[styles.doneBadge, { backgroundColor: colors.successLight }]}>
                      <Text style={[styles.doneBadgeText, { color: colors.success }]}>Done</Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_H * 0.82,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handleRow: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  handle: { width: 40, height: 4, borderRadius: 2 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 38, height: 38, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { ...Typography.bodyMedium, fontSize: 17, fontWeight: '700' as const },
  headerCount: { ...Typography.caption, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },

  sortBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  sortPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sortPillText: { ...Typography.caption, fontWeight: '600' },

  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl * 2, gap: Spacing.xs },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderLeftWidth: 3,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { ...Typography.captionMedium, letterSpacing: 0.5, flex: 1 },
  sectionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  sectionBadgeText: { fontSize: 11, fontWeight: '700' },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
  },
  taskDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  taskBody: { flex: 1, gap: 2 },
  taskTitle: { ...Typography.body },
  taskTitleDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  taskDate: { ...Typography.caption },
  doneBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  doneBadgeText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl * 1.5, gap: Spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyText: { ...Typography.body },
});
