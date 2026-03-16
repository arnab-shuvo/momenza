import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius, Typography } from '../theme';
import type { ThemeColors } from '../theme';

// ─── Calendar ─────────────────────────────────────────────────────────────────

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface DatePickerProps {
  value: Date;
  minimumDate?: Date;
  colors: ThemeColors;
  onChange: (date: Date) => void;
}

export function CustomDatePicker({ value, minimumDate, colors, onChange }: DatePickerProps) {
  const [viewYear,  setViewYear]  = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function isSelected(day: number) {
    return value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === day;
  }
  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }
  function isDisabled(day: number): boolean {
    if (!minimumDate) return false;
    const d = new Date(viewYear, viewMonth, day, 0, 0, 0, 0);
    const min = new Date(minimumDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  }
  function selectDay(day: number) {
    if (isDisabled(day)) return;
    const d = new Date(value);
    d.setFullYear(viewYear, viewMonth, day);
    onChange(d);
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} style={[cal.navBtn, { backgroundColor: cal_bg(colors) }]} activeOpacity={0.7}>
          <Text style={[cal.navArrow, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[cal.monthTitle, { color: colors.textPrimary }]}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={[cal.navBtn, { backgroundColor: cal_bg(colors) }]} activeOpacity={0.7}>
          <Text style={[cal.navArrow, { color: colors.textPrimary }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={cal.weekRow}>
        {DAYS.map(d => (
          <Text key={d} style={[cal.weekDay, { color: colors.textSecondary }]}>{d}</Text>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={cal.dayRow}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={cal.cell} />;
            const sel = isSelected(day);
            const tod = isToday(day);
            const dis = isDisabled(day);
            return (
              <TouchableOpacity key={ci} style={cal.cell} onPress={() => selectDay(day)} activeOpacity={dis ? 1 : 0.7}>
                {sel ? (
                  <LinearGradient colors={['#A78BFA', '#5B5FED']} style={cal.circle}>
                    <Text style={cal.selText}>{day}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[cal.circle, tod && { borderWidth: 1.5, borderColor: colors.primary }]}>
                    <Text style={[cal.dayText, { color: dis ? colors.border : colors.textPrimary }, tod && { color: colors.primary, fontWeight: '600' }]}>
                      {day}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function cal_bg(colors: ThemeColors) { return colors.surface; }

const CELL = 38;
const cal = StyleSheet.create({
  navRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  navBtn:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  navArrow:   { fontSize: 20, fontWeight: '400', lineHeight: 22 },
  monthTitle: { ...Typography.bodyMedium },
  weekRow:    { flexDirection: 'row', marginBottom: Spacing.xs },
  weekDay:    { width: CELL, textAlign: 'center', ...Typography.caption, fontWeight: '600' },
  dayRow:     { flexDirection: 'row', marginBottom: 2 },
  cell:       { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  circle:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selText:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  dayText:    { fontSize: 13 },
});

// ─── Clock dial time picker ────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
// Modal has 24px padding each side + card has 16px body padding each side = 80px total
const DIAL_SIZE     = Math.min(280, SCREEN_W - 80);
const CENTER        = DIAL_SIZE / 2;
const INNER_RADIUS  = CENTER - 36;   // ring where numbers sit
const NUM_SIZE      = 32;            // number circle diameter
const HAND_GAP      = 10;            // gap between hand tip and center dot
// Hand geometry: sits inside a full-dial rotating container
const HAND_SPACER   = CENTER - INNER_RADIUS + NUM_SIZE / 2;   // top spacer height
const HAND_HEIGHT   = INNER_RADIUS - NUM_SIZE / 2 - HAND_GAP; // line height

const HOUR_LABELS   = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_LABELS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface TimePickerProps {
  value: Date;
  colors: ThemeColors;
  onChange: (date: Date) => void;
}

export function CustomTimePicker({ value, colors, onChange }: TimePickerProps) {
  const toHour12 = (d: Date) => d.getHours() % 12 || 12;
  const toPeriod = (d: Date): 'AM' | 'PM' => d.getHours() >= 12 ? 'PM' : 'AM';

  // Local state — initialised from value once on mount (parent uses key= to remount on field switch)
  const [mode,   setMode]   = useState<'hour' | 'minute'>('hour');
  const [hour,   setHour]   = useState(() => toHour12(value));
  const [minute, setMinute] = useState(() => value.getMinutes());
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => toPeriod(value));

  // Refs so PanResponder callbacks always see the latest values without stale closures
  const hourRef   = useRef(hour);
  const minuteRef = useRef(minute);
  const periodRef = useRef(period);
  const modeRef   = useRef(mode);
  hourRef.current   = hour;
  minuteRef.current = minute;
  periodRef.current = period;
  modeRef.current   = mode;

  function emit(h: number, m: number, p: 'AM' | 'PM') {
    const d = new Date(value);
    let h24 = h % 12;
    if (p === 'PM') h24 += 12;
    d.setHours(h24, m, 0, 0);
    onChange(d);
  }

  function togglePeriod() {
    const p: 'AM' | 'PM' = period === 'AM' ? 'PM' : 'AM';
    setPeriod(p);
    emit(hour, minute, p);
  }

  function angleFromTouch(lx: number, ly: number): number {
    const dx = lx - CENTER;
    const dy = ly - CENTER;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }

  // Read refs in pan callbacks to avoid stale closures + guard against no-op moves
  function applyTouch(lx: number, ly: number) {
    const angle = angleFromTouch(lx, ly);
    if (modeRef.current === 'hour') {
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;
      if (h === hourRef.current) return;   // no change — skip
      hourRef.current = h;
      setHour(h);
      emit(h, minuteRef.current, periodRef.current);
    } else {
      const m = Math.round(angle / 6) % 60;
      if (m === minuteRef.current) return; // no change — skip
      minuteRef.current = m;
      setMinute(m);
      emit(hourRef.current, m, periodRef.current);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        applyTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        applyTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        if (modeRef.current === 'hour') {
          setTimeout(() => setMode('minute'), 200);
        }
      },
    })
  ).current;

  // Angle of the clock hand (0° = 12 o'clock, clockwise)
  const handAngle = mode === 'hour' ? (hour % 12) * 30 : minute * 6;
  const labels    = mode === 'hour' ? HOUR_LABELS : MINUTE_LABELS;

  return (
    <View style={tp.root}>

      {/* ── Time display ─────────────────────────────────────── */}
      <View style={tp.display}>
        <TouchableOpacity
          onPress={() => setMode('hour')}
          style={[tp.timeSegment, { backgroundColor: mode === 'hour' ? colors.primaryLight : colors.background }]}
          activeOpacity={0.7}
        >
          <Text style={[tp.timeDigit, { color: mode === 'hour' ? colors.primary : colors.textPrimary }]}>
            {String(hour).padStart(2, '0')}
          </Text>
          <Text style={[tp.timeSegmentLabel, { color: colors.textSecondary }]}>HR</Text>
        </TouchableOpacity>

        <Text style={[tp.colon, { color: colors.textPrimary }]}>:</Text>

        <TouchableOpacity
          onPress={() => setMode('minute')}
          style={[tp.timeSegment, { backgroundColor: mode === 'minute' ? colors.primaryLight : colors.background }]}
          activeOpacity={0.7}
        >
          <Text style={[tp.timeDigit, { color: mode === 'minute' ? colors.primary : colors.textPrimary }]}>
            {String(minute).padStart(2, '0')}
          </Text>
          <Text style={[tp.timeSegmentLabel, { color: colors.textSecondary }]}>MIN</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePeriod} activeOpacity={0.8} style={tp.periodWrap}>
          <LinearGradient colors={['#A78BFA', '#5B5FED']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={tp.periodBtn}>
            <Text style={tp.periodText}>{period}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Mode hint ─────────────────────────────────────────── */}
      <Text style={[tp.modeHint, { color: colors.textSecondary }]}>
        {mode === 'hour' ? 'Select hour' : 'Select minute'}
      </Text>

      {/* ── Clock dial ────────────────────────────────────────── */}
      <View
        style={[tp.dial, { backgroundColor: colors.background, borderColor: colors.border }]}
        {...panResponder.panHandlers}
      >
        {/* Outer ring */}
        <View style={[tp.ring, { borderColor: colors.border }]} />

        {/* Numbers */}
        {labels.map((label, i) => {
          const angleRad = (i * 30 - 90) * (Math.PI / 180);
          const x = CENTER + INNER_RADIUS * Math.cos(angleRad);
          const y = CENTER + INNER_RADIUS * Math.sin(angleRad);
          const isSelected = mode === 'hour' ? label === hour : label === minute;

          return (
            <View
              key={label}
              style={[tp.numCircle, {
                left: x - NUM_SIZE / 2,
                top:  y - NUM_SIZE / 2,
                width: NUM_SIZE,
                height: NUM_SIZE,
                borderRadius: NUM_SIZE / 2,
                overflow: 'hidden',
              }]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#A78BFA', '#5B5FED']}
                  style={tp.numGrad}
                >
                  <Text style={tp.numTextSel}>{label}</Text>
                </LinearGradient>
              ) : (
                <Text style={[tp.numText, { color: colors.textPrimary }]}>{label}</Text>
              )}
            </View>
          );
        })}

        {/* Rotating hand — full-dial container rotates around dial center */}
        <View
          style={[tp.handContainer, { transform: [{ rotate: `${handAngle}deg` }] }]}
          pointerEvents="none"
        >
          <View style={tp.handSpacer} />
          <LinearGradient
            colors={['#A78BFA', '#5B5FED']}
            style={tp.handLine}
          />
        </View>

        {/* Hand tip dot */}
        {(() => {
          const angleRad = (handAngle - 90) * (Math.PI / 180);
          const tx = CENTER + (INNER_RADIUS - NUM_SIZE / 2) * Math.cos(angleRad);
          const ty = CENTER + (INNER_RADIUS - NUM_SIZE / 2) * Math.sin(angleRad);
          return (
            <LinearGradient
              colors={['#A78BFA', '#5B5FED']}
              style={[tp.tipDot, { left: tx - 5, top: ty - 5 }]}
              pointerEvents="none"
            />
          );
        })()}

        {/* Center dot */}
        <LinearGradient
          colors={['#A78BFA', '#5B5FED']}
          style={tp.centerDot}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const tp = StyleSheet.create({
  root: { gap: Spacing.md, alignItems: 'center' },

  // Time display
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeSegment: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: 72,
  },
  timeDigit: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  timeSegmentLabel: { ...Typography.caption, fontWeight: '600', letterSpacing: 1, marginTop: 2 },
  colon: { fontSize: 34, fontWeight: '700', marginBottom: Spacing.lg },
  periodWrap: { borderRadius: Radius.md, overflow: 'hidden', marginLeft: Spacing.xs },
  periodBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, alignItems: 'center', minWidth: 52 },
  periodText: { color: '#fff', ...Typography.bodyMedium },

  modeHint: { ...Typography.caption, letterSpacing: 0.3 },

  // Dial
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 1,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    left: 16,
    top: 16,
    right: 16,
    bottom: 16,
    borderRadius: (DIAL_SIZE - 32) / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.3,
  },

  // Number
  numCircle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  numGrad:   { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  numText:   { fontSize: 13, fontWeight: '500' },
  numTextSel: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Hand — container rotates around the dial center
  handContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
  },
  handSpacer: { height: HAND_SPACER },
  handLine: {
    width: 2,
    height: HAND_HEIGHT,
    borderRadius: 1,
  },

  // Dots
  tipDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  centerDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    left: CENTER - 5,
    top: CENTER - 5,
  },
});
