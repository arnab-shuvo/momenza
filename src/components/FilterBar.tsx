import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { TaskFilter, DateFilterMode, SortMode } from '../types/filter';
import { CustomDatePicker } from './CustomPickers';

// ─── helpers ──────────────────────────────────────────────────────────────────
function startOfDay(d: Date): number {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r.getTime();
}
function endOfDay(d: Date): number {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r.getTime();
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MODES: { key: DateFilterMode; label: string }[] = [
  { key: 'none',    label: 'Any Date' },
  { key: 'single',  label: 'Specific Day' },
  { key: 'range',   label: 'Date Range' },
  { key: 'no-date', label: 'No Date' },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'priority',  label: '⠿  Priority' },
  { key: 'alpha',     label: 'A → Z' },
  { key: 'date-asc',  label: '📅  Date ↑' },
];

// ─── component ────────────────────────────────────────────────────────────────
interface FilterBarProps {
  onChange: (filter: TaskFilter) => void;
  currentSort: SortMode;
  onSortChange: (sort: SortMode) => void;
}

export default function FilterBar({ onChange, currentSort, onSortChange }: FilterBarProps) {
  const { colors, isDark } = useTheme();

  const [query, setQuery]               = useState('');
  const [panelOpen, setPanelOpen]       = useState(false);
  const [dateMode, setDateMode]         = useState<DateFilterMode>('none');
  const [startDate, setStartDate]       = useState(() => new Date());
  const [endDate, setEndDate]           = useState(() => new Date());
  const [activeField, setActiveField]   = useState<'start' | 'end'>('start');
  const [pickerVisible, setPickerVisible] = useState(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const [sortPanelOpen, setSortPanelOpen] = useState(false);
  const sortPanelAnim = useRef(new Animated.Value(0)).current;
  const isDateActive = dateMode !== 'none';

  // ── emit ──────────────────────────────────────────────────────────────────
  function emit(q: string, mode: DateFilterMode, s: Date, e: Date) {
    const date =
      mode === 'none'
        ? null
        : { mode, start: startOfDay(s), end: endOfDay(mode === 'range' ? e : s) };
    onChange({ query: q, date });
  }

  // ── query ─────────────────────────────────────────────────────────────────
  function handleQueryChange(text: string) {
    setQuery(text);
    emit(text, dateMode, startDate, endDate);
  }

  function clearQuery() {
    setQuery('');
    emit('', dateMode, startDate, endDate);
  }

  // ── panel toggle ──────────────────────────────────────────────────────────
  function togglePanel() {
    const opening = !panelOpen;
    setPanelOpen(opening);
    Animated.spring(panelAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: false,
      bounciness: 3,
      speed: 18,
    }).start();
  }

  function toggleSortPanel() {
    const opening = !sortPanelOpen;
    setSortPanelOpen(opening);
    Animated.spring(sortPanelAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: false,
      bounciness: 3,
      speed: 18,
    }).start();
  }

  // ── date mode ─────────────────────────────────────────────────────────────
  function selectMode(mode: DateFilterMode) {
    setDateMode(mode);
    emit(query, mode, startDate, endDate);
  }

  // ── date picker ───────────────────────────────────────────────────────────
  function openPicker(field: 'start' | 'end') {
    setActiveField(field);
    setPickerVisible(true);
  }

  function applyDate(date: Date) {
    if (activeField === 'start') {
      const newEnd = date > endDate ? date : endDate;
      setStartDate(date);
      setEndDate(newEnd);
      emit(query, dateMode, date, newEnd);
    } else {
      setEndDate(date);
      emit(query, dateMode, startDate, date);
    }
  }

  function clearDateFilter() {
    const today = new Date();
    setDateMode('none');
    setStartDate(today);
    setEndDate(today);
    emit(query, 'none', today, today);
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const panelMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });
  const sortPanelMaxHeight = sortPanelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });
  const pickerValue = activeField === 'end' ? endDate : startDate;
  const pickerMin   = activeField === 'end' ? startDate : undefined;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>

      {/* ── Search + calendar button ──────────────────────── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search tasks…"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={clearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearX, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sort button */}
        <TouchableOpacity onPress={toggleSortPanel} activeOpacity={0.75} style={styles.calBtn}>
          {currentSort !== 'priority' ? (
            <LinearGradient colors={['#A78BFA', '#5B5FED']} style={styles.calBtnGrad}>
              <Text style={styles.sortIconActive}>⇅</Text>
            </LinearGradient>
          ) : (
            <View style={[
              styles.calBtnPlain,
              { backgroundColor: colors.background, borderColor: sortPanelOpen ? colors.primary : colors.border },
            ]}>
              <Text style={[styles.sortIcon, { color: colors.textSecondary }]}>⇅</Text>
            </View>
          )}
          {currentSort !== 'priority' && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePanel} activeOpacity={0.75} style={styles.calBtn}>
          {isDateActive ? (
            <LinearGradient colors={['#A78BFA', '#5B5FED']} style={styles.calBtnGrad}>
              <Text style={styles.calIconActive}>📅</Text>
            </LinearGradient>
          ) : (
            <View style={[
              styles.calBtnPlain,
              { backgroundColor: colors.background, borderColor: panelOpen ? colors.primary : colors.border },
            ]}>
              <Text style={styles.calIcon}>📅</Text>
            </View>
          )}
          {isDateActive && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* ── Collapsible sort panel ────────────────────────── */}
      <Animated.View style={{ maxHeight: sortPanelMaxHeight, overflow: 'hidden' }}>
        <View style={[styles.panel, { paddingBottom: Spacing.xs }]}>
          <View style={styles.pills}>
            {SORT_OPTIONS.map(({ key, label }) => {
              const active = currentSort === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => onSortChange(key)}
                  activeOpacity={0.75}
                  style={[
                    styles.pill,
                    { borderColor: active ? colors.primary : colors.border },
                    active && { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? colors.primary : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* ── Collapsible date filter panel ─────────────────── */}
      <Animated.View style={{ maxHeight: panelMaxHeight, overflow: 'hidden' }}>
        <View style={styles.panel}>

          {/* Mode pills */}
          <View style={styles.pills}>
            {MODES.map(({ key, label }) => {
              const active = dateMode === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => selectMode(key)}
                  activeOpacity={0.75}
                  style={[
                    styles.pill,
                    { borderColor: active ? colors.primary : colors.border },
                    active && { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? colors.primary : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date inputs (Specific Day or Date Range) */}
          {dateMode !== 'none' && dateMode !== 'no-date' && (
            <View style={styles.dateInputRow}>
              <TouchableOpacity
                onPress={() => openPicker('start')}
                activeOpacity={0.75}
                style={[styles.dateChip, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
              >
                <Text style={styles.chipIcon}>📅</Text>
                <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {fmtDate(startOfDay(startDate))}
                </Text>
              </TouchableOpacity>

              {dateMode === 'range' && (
                <>
                  <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
                  <TouchableOpacity
                    onPress={() => openPicker('end')}
                    activeOpacity={0.75}
                    style={[styles.dateChip, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
                  >
                    <Text style={styles.chipIcon}>📅</Text>
                    <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {fmtDate(endOfDay(endDate))}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={clearDateFilter}
                activeOpacity={0.75}
                style={[styles.clearDateBtn, { backgroundColor: colors.dangerLight }]}
              >
                <Text style={[styles.clearDateText, { color: colors.danger }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>

      {/* ── Date picker modal ──────────────────────────────── */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerVisible(false)} />
        <View style={styles.pickerWrap} pointerEvents="box-none">
          <View style={[styles.pickerCard, { backgroundColor: colors.surface }, Shadow.md]}>
            <LinearGradient
              colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.pickerHeader}
            >
              <Text style={styles.pickerTitle}>
                {activeField === 'end' ? '📅  End Date' : '📅  Start Date'}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.doneBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={[styles.pickerBody, { backgroundColor: colors.background }]}>
              <CustomDatePicker
                key={activeField}
                value={pickerValue}
                minimumDate={pickerMin}
                colors={colors}
                onChange={applyDate}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },

  // Search row
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.sm,
    height: 42,
    gap: Spacing.xs,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, ...Typography.body, paddingVertical: 0 },
  clearX:      { fontSize: 13, paddingHorizontal: 4 },

  // Calendar filter button
  calBtn:     { position: 'relative' },
  calBtnGrad: {
    width: 42, height: 42, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  calBtnPlain: {
    width: 42, height: 42, borderRadius: Radius.md,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  calIcon:       { fontSize: 18 },
  calIconActive: { fontSize: 18 },
  sortIcon:      { fontSize: 20, fontWeight: '700' },
  sortIconActive: { fontSize: 20, fontWeight: '700', color: '#fff' },
  activeDot: {
    position: 'absolute', top: -3, right: -3,
    width: 9, height: 9, borderRadius: 5,
  },

  // Filter panel
  panel: { paddingTop: Spacing.sm, gap: Spacing.sm },
  pills: { flexDirection: 'row', gap: Spacing.xs },
  pill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  pillText: { ...Typography.captionMedium },

  // Date inputs
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  chipIcon: { fontSize: 12 },
  chipText: { ...Typography.caption, fontWeight: '500', flexShrink: 1 },
  arrow:    { fontSize: 14, fontWeight: '600' },
  clearDateBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  clearDateText: { ...Typography.captionMedium },

  // Picker modal
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pickerCard: {
    width: '100%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pickerTitle:  { ...Typography.bodyMedium, color: '#FFFFFF' },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  doneBtnText: { ...Typography.captionMedium, color: '#FFFFFF' },
  pickerBody:  { padding: Spacing.md },
});
