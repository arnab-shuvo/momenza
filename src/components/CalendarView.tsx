import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { Spacing, Radius, Typography } from '../theme';

const DAY_NUM_H = 32;
const BAR_H = 17;
const BAR_GAP = 2;
const MAX_ROWS = 3;
const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86400000,
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function calendarWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());
  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= lastDay) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

interface Bar {
  task: Task;
  color: string;
  startCol: number;
  endCol: number;
  beforeWeek: boolean;
  afterWeek: boolean;
  row: number;
}

function computeBars(
  week: Date[],
  tasks: Task[],
  getColor: (t: Task) => string,
): { bars: Bar[]; overflow: number } {
  const ws = new Date(week[0]); ws.setHours(0, 0, 0, 0);
  const we = new Date(week[6]); we.setHours(23, 59, 59, 999);
  const candidates: Omit<Bar, 'row'>[] = [];

  for (const t of tasks) {
    if (!t.taskDate) continue;
    const ts = new Date(t.taskDate.start); ts.setHours(0, 0, 0, 0);
    const te = t.taskDate.end ? new Date(t.taskDate.end) : new Date(t.taskDate.start);
    te.setHours(23, 59, 59, 999);
    if (te < ws || ts > we) continue;
    const sc = Math.max(0, Math.min(6, daysBetween(ws, ts)));
    const ec = Math.max(0, Math.min(6, daysBetween(ws, te)));
    candidates.push({
      task: t, color: getColor(t),
      startCol: sc, endCol: Math.max(sc, ec),
      beforeWeek: ts < ws, afterWeek: te > we,
    });
  }

  candidates.sort((a, b) =>
    a.startCol !== b.startCol
      ? a.startCol - b.startCol
      : b.endCol - b.startCol - (a.endCol - a.startCol),
  );

  const rowGrid: boolean[][] = [];
  const bars: Bar[] = [];
  let overflow = 0;

  for (const c of candidates) {
    let placed = false;
    for (let row = 0; row < MAX_ROWS; row++) {
      if (!rowGrid[row]) rowGrid[row] = new Array(7).fill(false);
      let fits = true;
      for (let col = c.startCol; col <= c.endCol; col++) {
        if (rowGrid[row][col]) { fits = false; break; }
      }
      if (fits) {
        for (let col = c.startCol; col <= c.endCol; col++) rowGrid[row][col] = true;
        bars.push({ ...c, row });
        placed = true;
        break;
      }
    }
    if (!placed) overflow++;
  }
  return { bars, overflow };
}

interface Props {
  tasks: Task[];
  projects?: Project[];
  onTaskPress?: (task: Task) => void;
  onAddTask?: (date: Date) => void;
}

export default function CalendarView({ tasks, projects = [], onTaskPress, onAddTask }: Props) {
  const { colors, isDark } = useTheme();

  const projectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.id] = p.color;
    return map;
  }, [projects]);

  function getTaskColor(t: Task): string {
    return projectColorMap[t.projectId] ?? '#6C5CE7';
  }

  const [calView, setCalView]           = useState<'month' | 'day'>('month');
  const [curDate, setCurDate]           = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay]   = useState(() => new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear]     = useState(curDate.getFullYear());

  const year  = curDate.getFullYear();
  const month = curDate.getMonth();
  const weeks = useMemo(() => calendarWeeks(year, month), [year, month]);

  const monthLabel = curDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayLabel   = selectedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  const today      = new Date();

  const filteredTasks = useMemo(() => {
    const dated = tasks.filter(t => t.taskDate);
    if (!selectedProjectId) return dated;
    return dated.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const monthTasks = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return filteredTasks.filter(t => {
      const ts = new Date(t.taskDate!.start);
      const te = t.taskDate!.end ? new Date(t.taskDate!.end) : new Date(t.taskDate!.start);
      te.setHours(23, 59, 59, 999);
      return ts <= monthEnd && te >= monthStart;
    });
  }, [filteredTasks, year, month]);

  const dayTasks = useMemo(() => {
    const dayStart = new Date(selectedDay); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(selectedDay); dayEnd.setHours(23, 59, 59, 999);
    return filteredTasks.filter(t => {
      const ts = new Date(t.taskDate!.start); ts.setHours(0, 0, 0, 0);
      const te = t.taskDate!.end ? new Date(t.taskDate!.end) : new Date(t.taskDate!.start);
      te.setHours(23, 59, 59, 999);
      return ts <= dayEnd && te >= dayStart;
    });
  }, [filteredTasks, selectedDay]);

  function goToday() { const d = new Date(); d.setDate(1); setCurDate(d); }

  function navigateDay(dir: 1 | -1) {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + dir);
    setSelectedDay(d);
  }

  function handleDayTap(day: Date) {
    onAddTask?.(day);
  }

  function switchToDay(day: Date) {
    setSelectedDay(day);
    setCalView('day');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Nav bar */}
      <View style={[styles.monthNavBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>

        {/* Month / Day toggle */}
        <View style={[styles.viewToggleRow, { borderBottomColor: colors.border }]}>
          {(['month', 'day'] as const).map(v => (
            <TouchableOpacity
              key={v}
              onPress={() => {
                setCalView(v);
                if (v === 'day') setSelectedDay(new Date());
              }}
              style={[
                styles.viewToggleBtn,
                { borderColor: colors.border, backgroundColor: colors.background },
                calView === v && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewToggleTxt, { color: colors.textSecondary }, calView === v && { color: colors.primary }]}>
                {v === 'month' ? 'Month' : 'Day'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation row */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => calView === 'month'
              ? setCurDate(new Date(year, month - 1, 1))
              : navigateDay(-1)
            }
            style={styles.navBtn}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={[styles.navArrow, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>

          {calView === 'month' ? (
            <TouchableOpacity onPress={() => { setPickerYear(year); setPickerVisible(true); }}>
              <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel} ▾</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setCalView('month')}>
              <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{dayLabel}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => calView === 'month'
              ? setCurDate(new Date(year, month + 1, 1))
              : navigateDay(1)
            }
            style={styles.navBtn}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={[styles.navArrow, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Week labels (month view only) */}
        {calView === 'month' && (
          <View style={styles.weekLabels}>
            {WEEK_LABELS.map((d, i) => (
              <View key={i} style={styles.weekLabelCell}>
                <Text style={[styles.weekLabelTxt, { color: colors.textSecondary }]}>{d}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Project filter pills */}
      {projects.length > 1 && (
        <View style={[styles.pillsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            <TouchableOpacity
              onPress={() => setSelectedProjectId(null)}
              style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border },
                !selectedProjectId && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: colors.textSecondary }, !selectedProjectId && { color: colors.primary }]}>All</Text>
            </TouchableOpacity>
            {projects.map(p => {
              const isSelected = selectedProjectId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProjectId(isSelected ? null : p.id)}
                  style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border },
                    isSelected && { backgroundColor: p.color + '22', borderColor: p.color }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pillDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.pillText, { color: colors.textSecondary }, isSelected && { color: p.color }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Month view ── */}
      {calView === 'month' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {weeks.map((week, wi) => {
            const { bars, overflow } = computeBars(week, filteredTasks, getTaskColor);
            const maxRow = bars.length > 0 ? Math.max(...bars.map(b => b.row)) : -1;
            const barsH  = maxRow >= 0 ? (maxRow + 1) * (BAR_H + BAR_GAP) + 6 : 4;
            const totalH = DAY_NUM_H + barsH + (overflow > 0 ? 16 : 0);

            return (
              <View key={wi} style={[styles.weekRow, { borderBottomColor: colors.border, minHeight: totalH }]}>
                <View style={styles.dayNumRow}>
                  {week.map((day, di) => {
                    const inMonth = day.getMonth() === month;
                    const isToday = isSameDay(day, today);
                    return (
                      <TouchableOpacity
                        key={di}
                        style={styles.dayNumCell}
                        onPress={() => handleDayTap(day)}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.dayNumBubble, isToday && { backgroundColor: colors.primary }]}>
                          <Text style={[
                            styles.dayNum,
                            { color: isToday ? '#fff' : inMonth ? '#6BA3D6' : colors.textSecondary + '55' },
                            isToday && { fontWeight: '700' },
                          ]}>
                            {day.getDate()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ height: barsH + (overflow > 0 ? 16 : 0), position: 'relative' }}>
                  {bars.map(bar => {
                    const leftPct  = `${(bar.startCol / 7) * 100}%`;
                    const widthPct = `${((bar.endCol - bar.startCol + 1) / 7) * 100}%`;
                    const topPx    = bar.row * (BAR_H + BAR_GAP) + 2;
                    const span     = bar.endCol - bar.startCol + 1;
                    return (
                      <TouchableOpacity
                        key={`${bar.task.id}-w${wi}`}
                        activeOpacity={0.75}
                        onPress={() => onTaskPress?.(bar.task)}
                        style={[styles.bar, {
                          left: leftPct as any, width: widthPct as any,
                          top: topPx, height: BAR_H,
                          backgroundColor: bar.color + (isDark ? 'CC' : 'EE'),
                          borderTopLeftRadius:    bar.beforeWeek ? 0 : Radius.sm,
                          borderBottomLeftRadius: bar.beforeWeek ? 0 : Radius.sm,
                          borderTopRightRadius:   bar.afterWeek  ? 0 : Radius.sm,
                          borderBottomRightRadius: bar.afterWeek ? 0 : Radius.sm,
                        }]}
                      >
                        {!bar.beforeWeek && span >= 1 && (
                          <Text style={styles.barLabel} numberOfLines={1}>{bar.task.title}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {overflow > 0 && (
                    <Text style={[styles.overflow, { color: colors.textSecondary }]}>+{overflow} more</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* This month legend */}
          {monthTasks.length > 0 && (
            <View style={[styles.legend, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>THIS MONTH</Text>
              {monthTasks.map(t => {
                const color = getTaskColor(t);
                const start = new Date(t.taskDate!.start);
                const end   = t.taskDate!.end ? new Date(t.taskDate!.end) : null;
                const range = end
                  ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <TouchableOpacity key={t.id} style={styles.legendRow} activeOpacity={0.7} onPress={() => onTaskPress?.(t)}>
                    <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                    <Text style={[styles.legendName, { color: colors.textPrimary }]} numberOfLines={1}>{t.title}</Text>
                    <Text style={[styles.legendDate, { color: colors.textSecondary }]}>{range}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {monthTasks.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scheduled tasks</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tap a date to add a task, or add dates to existing tasks</Text>
            </View>
          )}
          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
      )}

      {/* ── Day view ── */}
      {calView === 'day' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dayContent}>
          {dayTasks.length === 0 ? (
            <TouchableOpacity
              style={[styles.dayEmpty, { borderColor: colors.border }]}
              onPress={() => onAddTask?.(selectedDay)}
              activeOpacity={0.7}
            >
              <Feather name="plus-circle" size={32} color={colors.textSecondary} />
              <Text style={[styles.dayEmptyTitle, { color: colors.textPrimary }]}>No tasks for this day</Text>
              <Text style={[styles.dayEmptySub, { color: colors.textSecondary }]}>Tap to add a task</Text>
            </TouchableOpacity>
          ) : (
            <>
              {dayTasks.map(t => {
                const color = getTaskColor(t);
                const start = new Date(t.taskDate!.start);
                const end   = t.taskDate!.end ? new Date(t.taskDate!.end) : null;
                const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const isRange = end && !isSameDay(start, end);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.dayTaskRow, { backgroundColor: colors.surface, borderLeftColor: color }]}
                    onPress={() => onTaskPress?.(t)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.dayTaskDot, { backgroundColor: color }]} />
                    <View style={styles.dayTaskBody}>
                      <Text style={[styles.dayTaskTitle, { color: colors.textPrimary }]} numberOfLines={2}>{t.title}</Text>
                      <Text style={[styles.dayTaskTime, { color: colors.textSecondary }]}>
                        {isRange
                          ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : timeStr
                        }
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}

              {/* Add more row */}
              <TouchableOpacity
                style={[styles.dayAddRow, { borderColor: colors.border }]}
                onPress={() => onAddTask?.(selectedDay)}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[styles.dayAddTxt, { color: colors.primary }]}>Add task for this day</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* Month / Year picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerVisible(false)} />
        <View style={styles.pickerWrap} pointerEvents="box-none">
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.pickerYearRow, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.pickerArrow, { color: colors.primary }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerYearLabel, { color: colors.textPrimary }]}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.pickerArrow, { color: colors.primary }]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {MONTHS.map((m, i) => {
                const isActive = pickerYear === year && i === month;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => { setCurDate(new Date(pickerYear, i, 1)); setPickerVisible(false); }}
                    style={[styles.pickerMonthCell, isActive && { backgroundColor: colors.primary }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerMonthText, { color: isActive ? '#fff' : colors.textPrimary }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => { goToday(); setPickerVisible(false); }} style={[styles.pickerTodayBtn, { borderTopColor: colors.border }]}>
              <Text style={[styles.pickerTodayText, { color: colors.primary }]}>Go to Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  monthNavBar: {
    borderBottomWidth: 1,
    paddingTop: Spacing.xs,
  },

  // Month / Day toggle
  viewToggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
    borderColor: 'transparent',
    gap: 2,
    paddingHorizontal: Spacing.lg,
  },
  viewToggleBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  viewToggleTxt: { ...Typography.captionMedium, fontWeight: '600' },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  navBtn: { padding: Spacing.xs },
  navArrow: { fontSize: 26, fontWeight: '300', lineHeight: 30 },
  monthLabel: { ...Typography.h2 },

  weekLabels: { flexDirection: 'row', paddingHorizontal: 2, paddingBottom: 6 },
  weekLabelCell: { flex: 1, alignItems: 'center' },
  weekLabelTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  pillsContainer: { borderBottomWidth: 1, height: 30 },
  pillsRow: { paddingHorizontal: Spacing.md, paddingVertical: 4, gap: Spacing.xs, alignItems: 'flex-start' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { ...Typography.caption, fontWeight: '500', maxWidth: 100 },

  // Month grid
  weekRow: { borderBottomWidth: 1, paddingHorizontal: 2 },
  dayNumRow: { flexDirection: 'row', paddingTop: 4, paddingBottom: 2 },
  dayNumCell: { flex: 1, alignItems: 'center' },
  dayNumBubble: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 13 },

  bar: { position: 'absolute', justifyContent: 'center', paddingHorizontal: 4, overflow: 'hidden' },
  barLabel: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.1 },
  overflow: { position: 'absolute', bottom: 1, right: 4, fontSize: 9, fontWeight: '600' },

  legend: { marginTop: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  legendTitle: { ...Typography.captionMedium, letterSpacing: 0.8, marginBottom: Spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, flexShrink: 0 },
  legendName: { flex: 1, ...Typography.caption, fontWeight: '500' },
  legendDate: { ...Typography.caption, flexShrink: 0 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.h2, textAlign: 'center' },
  emptySub: { ...Typography.body, textAlign: 'center', opacity: 0.7 },

  // Day view
  dayContent: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl * 2 },
  dayEmpty: {
    alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xxl * 1.5,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderRadius: Radius.lg, marginTop: Spacing.md,
  },
  dayEmptyTitle: { ...Typography.bodyMedium, fontWeight: '600' },
  dayEmptySub: { ...Typography.caption },
  dayTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
  },
  dayTaskDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  dayTaskBody: { flex: 1, gap: 2 },
  dayTaskTitle: { ...Typography.bodyMedium },
  dayTaskTime: { ...Typography.caption },
  dayAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.md,
    justifyContent: 'center', marginTop: Spacing.xs,
  },
  dayAddTxt: { ...Typography.bodyMedium, fontWeight: '600' },

  // Picker
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  pickerCard: { width: '100%', borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  pickerYearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  pickerArrow: { fontSize: 26, fontWeight: '300', lineHeight: 30 },
  pickerYearLabel: { ...Typography.h2 },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm },
  pickerMonthCell: { width: '25%', alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md },
  pickerMonthText: { ...Typography.bodyMedium },
  pickerTodayBtn: { alignItems: 'center', paddingVertical: Spacing.md, borderTopWidth: 1 },
  pickerTodayText: { ...Typography.bodyMedium, fontWeight: '600' },
});
