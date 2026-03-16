import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Task } from '../types/task';
import { Spacing, Radius, Typography } from '../theme';

// ─── constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const DAY_NUM_H   = 32;
const BAR_H       = 17;
const BAR_GAP     = 2;
const MAX_ROWS    = 3;
const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Vibrant, theme-agnostic palette
const PALETTE = [
  '#FF6B6B', '#FF9F43', '#1DD1A1', '#48DBFB',
  '#5F27CD', '#FD79A8', '#6C5CE7', '#00B894',
  '#E17055', '#74B9FF', '#A29BFE', '#FDCB6E',
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
     Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
    86400000
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function taskColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = (h << 5) - h + id.charCodeAt(i); h |= 0; }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function calendarWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const start    = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= lastDay) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

// ─── task bar computation ─────────────────────────────────────────────────────
interface Bar {
  task: Task;
  color: string;
  startCol: number;
  endCol: number;
  beforeWeek: boolean; // starts in a previous week
  afterWeek: boolean;  // ends in a later week
  row: number;
}

function computeBars(week: Date[], tasks: Task[]): { bars: Bar[]; overflow: number } {
  const ws = new Date(week[0]); ws.setHours(0, 0, 0, 0);
  const we = new Date(week[6]); we.setHours(23, 59, 59, 999);

  const candidates: Omit<Bar, 'row'>[] = [];

  for (const t of tasks) {
    if (!t.taskDate) continue;
    const ts = new Date(t.taskDate.start); ts.setHours(0, 0, 0, 0);
    const te = t.taskDate.end ? new Date(t.taskDate.end) : new Date(t.taskDate.start);
    te.setHours(23, 59, 59, 999);

    if (te < ws || ts > we) continue; // no overlap

    const sc = Math.max(0, Math.min(6, daysBetween(ws, ts)));
    const ec = Math.max(0, Math.min(6, daysBetween(ws, te)));

    candidates.push({
      task: t,
      color: taskColor(t.id),
      startCol: sc,
      endCol: Math.max(sc, ec),
      beforeWeek: ts < ws,
      afterWeek:  te > we,
    });
  }

  // Sort: start column first, then longer bars first
  candidates.sort((a, b) =>
    a.startCol !== b.startCol
      ? a.startCol - b.startCol
      : (b.endCol - b.startCol) - (a.endCol - a.startCol)
  );

  // Pack into rows
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

// ─── component ────────────────────────────────────────────────────────────────
interface Props {
  tasks: Task[];
  onTaskPress?: (task: Task) => void;
}

export default function CalendarView({ tasks, onTaskPress }: Props) {
  const { colors, isDark } = useTheme();
  const [curDate, setCurDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const year  = curDate.getFullYear();
  const month = curDate.getMonth();
  const weeks = useMemo(() => calendarWeeks(year, month), [year, month]);
  const monthLabel = curDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const datedTasks = useMemo(() => tasks.filter(t => t.taskDate), [tasks]);
  const today = new Date();

  function goToday() {
    const d = new Date(); d.setDate(1); setCurDate(d);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

        {/* ── Month nav bar ───────────────────────────────────────────────── */}
        <View style={[styles.monthNavBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setCurDate(new Date(year, month - 1, 1))} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
              <Text style={[styles.navArrow, { color: colors.primary }]}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday}>
              <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCurDate(new Date(year, month + 1, 1))} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
              <Text style={[styles.navArrow, { color: colors.primary }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Week day labels */}
          <View style={styles.weekLabels}>
            {WEEK_LABELS.map((d, i) => (
              <View key={i} style={styles.weekLabelCell}>
                <Text style={[styles.weekLabelTxt, { color: colors.textSecondary }]}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Calendar Grid ───────────────────────────────────────────────── */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {weeks.map((week, wi) => {
            const { bars, overflow } = computeBars(week, datedTasks);
            const maxRow    = bars.length > 0 ? Math.max(...bars.map(b => b.row)) : -1;
            const barsH     = maxRow >= 0 ? (maxRow + 1) * (BAR_H + BAR_GAP) + 6 : 4;
            const totalH    = DAY_NUM_H + barsH + (overflow > 0 ? 16 : 0);

            return (
              <View
                key={wi}
                style={[styles.weekRow, { borderBottomColor: colors.border, minHeight: totalH }]}
              >
                {/* Day numbers */}
                <View style={styles.dayNumRow}>
                  {week.map((day, di) => {
                    const inMonth = day.getMonth() === month;
                    const isToday = isSameDay(day, today);
                    return (
                      <View key={di} style={styles.dayNumCell}>
                        <View style={[styles.dayNumBubble, isToday && { backgroundColor: colors.primary }]}>
                          <Text style={[
                            styles.dayNum,
                            {
                              color: isToday
                                ? '#fff'
                                : inMonth
                                  ? colors.textPrimary
                                  : colors.textSecondary + '55',
                            },
                            isToday && { fontWeight: '700' },
                          ]}>
                            {day.getDate()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Task bars */}
                <View style={{ height: barsH + (overflow > 0 ? 16 : 0), position: 'relative' }}>
                  {bars.map((bar) => {
                    const leftPct  = `${(bar.startCol / 7) * 100}%`;
                    const widthPct = `${((bar.endCol - bar.startCol + 1) / 7) * 100}%`;
                    const topPx    = bar.row * (BAR_H + BAR_GAP) + 2;
                    const span     = bar.endCol - bar.startCol + 1;

                    return (
                      <TouchableOpacity
                        key={`${bar.task.id}-w${wi}`}
                        activeOpacity={0.75}
                        onPress={() => onTaskPress?.(bar.task)}
                        style={[
                          styles.bar,
                          {
                            left:   leftPct as any,
                            width:  widthPct as any,
                            top:    topPx,
                            height: BAR_H,
                            backgroundColor: bar.color + (isDark ? 'CC' : 'EE'),
                            borderTopLeftRadius:    bar.beforeWeek ? 0 : Radius.sm,
                            borderBottomLeftRadius: bar.beforeWeek ? 0 : Radius.sm,
                            borderTopRightRadius:   bar.afterWeek  ? 0 : Radius.sm,
                            borderBottomRightRadius:bar.afterWeek  ? 0 : Radius.sm,
                          },
                        ]}
                      >
                        {/* Show label only when bar has room (≥2 cols) and starts this week */}
                        {!bar.beforeWeek && span >= 1 && (
                          <Text style={styles.barLabel} numberOfLines={1}>
                            {bar.task.title}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {overflow > 0 && (
                    <Text style={[styles.overflow, { color: colors.textSecondary }]}>
                      +{overflow} more
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* ── Legend ──────────────────────────────────────────────────── */}
          {datedTasks.length > 0 && (
            <View style={[styles.legend, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>ALL SCHEDULED TASKS</Text>
              {datedTasks.map(t => {
                const color = taskColor(t.id);
                const start = new Date(t.taskDate!.start);
                const end   = t.taskDate!.end ? new Date(t.taskDate!.end) : null;
                const range = end
                  ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.legendRow}
                    activeOpacity={0.7}
                    onPress={() => onTaskPress?.(t)}
                  >
                    <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                    <Text style={[styles.legendName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={[styles.legendDate, { color: colors.textSecondary }]}>
                      {range}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {datedTasks.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scheduled tasks</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Add a date or date range to a task to see it here
              </Text>
            </View>
          )}

          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  monthNavBar: {
    borderBottomWidth: 1,
    paddingTop: Spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  navBtn:     { padding: Spacing.xs },
  navArrow:   { fontSize: 26, fontWeight: '300', lineHeight: 30 },
  monthLabel: { ...Typography.h2 },

  weekLabels:    { flexDirection: 'row', paddingHorizontal: 2, paddingBottom: 6 },
  weekLabelCell: { flex: 1, alignItems: 'center' },
  weekLabelTxt:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Week rows
  weekRow: {
    borderBottomWidth: 1,
    paddingHorizontal: 2,
  },
  dayNumRow:  { flexDirection: 'row', paddingTop: 4, paddingBottom: 2 },
  dayNumCell: { flex: 1, alignItems: 'center' },
  dayNumBubble: {
    width: 26, height: 26,
    borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNum: { fontSize: 13 },

  // Bars
  bar: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  barLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  overflow: {
    position: 'absolute',
    bottom: 1,
    right: 4,
    fontSize: 9,
    fontWeight: '600',
  },

  // Legend
  legend: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  legendTitle: {
    ...Typography.captionMedium,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendSwatch: {
    width: 12, height: 12,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendName: { flex: 1, ...Typography.caption, fontWeight: '500' },
  legendDate: { ...Typography.caption, flexShrink: 0 },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.h2, textAlign: 'center' },
  emptySub:   { ...Typography.body, textAlign: 'center', opacity: 0.7 },
});
