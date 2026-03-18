import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  Animated,
  ScrollView,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import { TaskDate, DateType } from '../types/task';
import { CustomDatePicker, CustomTimePicker } from './CustomPickers';

// ─── types ────────────────────────────────────────────────────────────────────
type DateMode = 'range' | 'single';
type ActiveField = 'start-date' | 'start-time' | 'end-date' | 'end-time' | null;

interface AddTaskModalProps {
  visible: boolean;
  onAdd: (title: string, taskDate?: TaskDate, description?: string) => void;
  onClose: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
function defaultEnd(): Date {
  const d = defaultStart();
  d.setDate(d.getDate() + 1);
  return d;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const DATE_MODES: { key: DateMode; label: string; emoji: string; desc: string }[] = [
  { key: 'range',  label: 'Date Range',    emoji: '📆', desc: 'Start & end dates' },
  { key: 'single', label: 'Specific Date', emoji: '📌', desc: 'A single date' },
];

// ─── component ────────────────────────────────────────────────────────────────
export default function AddTaskModal({ visible, onAdd, onClose }: AddTaskModalProps) {
  const { colors, isDark } = useTheme();

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [descEnabled, setDescEnabled]    = useState(false);
  const [dateEnabled, setDateEnabled]    = useState(false);
  const [dateMode, setDateMode]     = useState<DateMode>('range');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [startDT, setStartDT]       = useState<Date>(defaultStart);
  const [endDT, setEndDT]           = useState<Date>(defaultEnd);
  const [activeField, setActiveField]   = useState<ActiveField>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef    = useRef<TextInput>(null);
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const dropAnim    = useRef(new Animated.Value(0)).current;

  // ── keyboard height (Android only) ─────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      slideAnim.setValue(0);
      reset();
    }
  }, [visible]);

  function reset() {
    setTitle('');
    setDescription('');
    setDescEnabled(false);
    setDateEnabled(false);
    setDateMode('range');
    setDropdownOpen(false);
    setStartDT(defaultStart());
    setEndDT(defaultEnd());
    setActiveField(null);
    setPickerVisible(false);
    dropAnim.setValue(0);
  }

  // ── dropdown ───────────────────────────────────────────────────────────────
  function toggleDropdown() {
    const opening = !dropdownOpen;
    setDropdownOpen(opening);
    Animated.spring(dropAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: false,
      bounciness: 2,
      speed: 18,
    }).start();
  }

  function selectMode(mode: DateMode) {
    setDateMode(mode);
    setDropdownOpen(false);
    setActiveField(null);
    Animated.spring(dropAnim, { toValue: 0, useNativeDriver: false, speed: 18, bounciness: 2 }).start();
    if (mode === 'single' && (activeField === 'end-date' || activeField === 'end-time')) setActiveField(null);
  }

  // ── field taps ─────────────────────────────────────────────────────────────
  function tapField(field: ActiveField) {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setActiveField(field);
    setPickerVisible(true);
  }

  function closePicker() {
    setPickerVisible(false);
    setActiveField(null);
  }

  function applyField(field: ActiveField, val: Date) {
    const patch = (prev: Date, isDate: boolean) => {
      const d = new Date(prev);
      if (isDate) d.setFullYear(val.getFullYear(), val.getMonth(), val.getDate());
      else        d.setHours(val.getHours(), val.getMinutes(), 0, 0);
      return d;
    };
    if (field === 'start-date') setStartDT((p) => patch(p, true));
    if (field === 'start-time') setStartDT((p) => patch(p, false));
    if (field === 'end-date')   setEndDT((p) => patch(p, true));
    if (field === 'end-time')   setEndDT((p) => patch(p, false));
  }

  // Picker config
  const pickerIsTime  = activeField?.endsWith('time') ?? false;
const pickerValue   = (activeField?.startsWith('end') ? endDT : startDT);
  const pickerMinDate = activeField === 'end-date' ? startDT : undefined;

  // ── submit ─────────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!title.trim()) return;
    let taskDate: TaskDate | undefined;
    if (dateEnabled) {
      taskDate = {
        type: dateMode,
        start: startDT.getTime(),
        ...(dateMode === 'range' ? { end: endDT.getTime() } : {}),
      };
    }
    onAdd(title.trim(), taskDate, description);
    onClose();
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const canAdd       = title.trim().length > 0;
  const currentMode  = DATE_MODES.find((m) => m.key === dateMode)!;
  const translateY   = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const dropHeight   = dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, DATE_MODES.length * 64] });
  const dropOpacity  = dropAnim;

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={Platform.OS === 'ios'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY }] }, Shadow.md, Platform.OS === 'android' && { marginBottom: keyboardHeight }]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <LinearGradient
              colors={['#A78BFA', '#5B5FED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.handle}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Task</Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                  What do you need to get done?
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Title input */}
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="e.g. Finish the design mockup…"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={handleAdd}
                returnKeyType="next"
                blurOnSubmit={false}
                multiline
                maxLength={200}
              />
            </View>

            {/* Description toggle + input */}
            <View style={[styles.scheduleCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleLabelRow}>
                  <LinearGradient
                    colors={['#A78BFA', '#5B5FED']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.scheduleDot}
                  />
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
                </View>
                <Switch
                  value={descEnabled}
                  onValueChange={setDescEnabled}
                  trackColor={{ false: colors.border, true: '#7B6FFF' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                />
              </View>
              {descEnabled && (
                <TextInput
                  style={[styles.descInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Add notes or details…"
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
              )}
            </View>

            {/* ── Schedule section ──────────────────────────────── */}
            <View style={[styles.scheduleCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {/* Section label + toggle */}
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleLabelRow}>
                  <LinearGradient
                    colors={['#A78BFA', '#5B5FED']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.scheduleDot}
                  />
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>SCHEDULE</Text>
                </View>
                <Switch
                  value={dateEnabled}
                  onValueChange={(v) => { setDateEnabled(v); if (!v) setActiveField(null); }}
                  trackColor={{ false: colors.border, true: '#7B6FFF' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                />
              </View>

              {dateEnabled && (
                <>
                  {/* ── Dropdown trigger ─────────────────────────── */}
                  <TouchableOpacity
                    style={[styles.dropdownTrigger, { borderColor: dropdownOpen ? colors.primary : colors.border }]}
                    onPress={toggleDropdown}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#A78BFA22', '#5B5FED22']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.dropdownTriggerGrad}
                    >
                      <View style={styles.dropdownTriggerLeft}>
                        <Text style={styles.dropdownEmoji}>{currentMode.emoji}</Text>
                        <View>
                          <Text style={[styles.dropdownLabel, { color: colors.textPrimary }]}>
                            {currentMode.label}
                          </Text>
                          <Text style={[styles.dropdownDesc, { color: colors.textSecondary }]}>
                            {currentMode.desc}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.dropdownChevron, { color: colors.primary }, dropdownOpen && styles.chevronUp]}>
                        ›
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* ── Dropdown options ─────────────────────────── */}
                  <Animated.View style={[styles.dropdownMenu, { height: dropHeight, opacity: dropOpacity, borderColor: colors.border }]}>
                    {DATE_MODES.map((mode, i) => {
                      const selected = mode.key === dateMode;
                      return (
                        <TouchableOpacity
                          key={mode.key}
                          style={[
                            styles.dropdownOption,
                            { borderBottomColor: colors.border },
                            i === DATE_MODES.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => selectMode(mode.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownOptionEmoji}>{mode.emoji}</Text>
                          <View style={styles.dropdownOptionText}>
                            <Text style={[styles.dropdownOptionLabel, { color: selected ? colors.primary : colors.textPrimary }]}>
                              {mode.label}
                            </Text>
                            <Text style={[styles.dropdownOptionDesc, { color: colors.textSecondary }]}>
                              {mode.desc}
                            </Text>
                          </View>
                          {selected && (
                            <LinearGradient
                              colors={['#A78BFA', '#5B5FED']}
                              style={styles.checkBadge}
                            >
                              <Text style={styles.checkMark}>✓</Text>
                            </LinearGradient>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </Animated.View>

                  {/* ── Date / time cards ────────────────────────── */}
                  {dateMode === 'range' ? (
                    <View style={styles.rangeRow}>
                      {/* FROM */}
                      <DateTimeCard
                        label="FROM"
                        accentColors={['#4CAF82', '#2E9E6A']}
                        date={startDT}
                        activeField={activeField}
                        dateFieldKey="start-date"
                        timeFieldKey="start-time"
                        onTapField={tapField}
                        colors={colors}
                      />
                      {/* Connector */}
                      <View style={styles.rangeConnector}>
                        <LinearGradient
                          colors={['#4CAF82', '#7B6FFF']}
                          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                          style={styles.connectorLine}
                        />
                        <Text style={[styles.connectorArrow, { color: colors.textSecondary }]}>›</Text>
                      </View>
                      {/* TO */}
                      <DateTimeCard
                        label="TO"
                        accentColors={['#7B6FFF', '#5B5FED']}
                        date={endDT}
                        activeField={activeField}
                        dateFieldKey="end-date"
                        timeFieldKey="end-time"
                        onTapField={tapField}
                        colors={colors}
                      />
                    </View>
                  ) : (
                    <DateTimeCard
                      label="DATE"
                      accentColors={['#A78BFA', '#5B5FED']}
                      date={startDT}
                      activeField={activeField}
                      dateFieldKey="start-date"
                      timeFieldKey="start-time"
                      onTapField={tapField}
                      colors={colors}
                      fullWidth
                    />
                  )}

                </>
              )}
            </View>

            {/* ── Add button ────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={canAdd ? 0.85 : 1}
              disabled={!canAdd}
              style={[styles.addBtnWrap, !canAdd && { opacity: 0.4 }]}
            >
              <LinearGradient
                colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>Add Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

      </KeyboardAvoidingView>

      {/* ── Picker modal ──────────────────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.pickerOverlay} onPress={closePicker} />

        <View style={styles.pickerModalWrap} pointerEvents="box-none">
          <View style={[styles.pickerCard, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <LinearGradient
              colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.pickerCardHeader}
            >
              <Text style={styles.pickerCardTitle}>
                {pickerIsTime ? '⏰  Set Time' : '📅  Set Date'}
              </Text>
              <TouchableOpacity onPress={closePicker} style={styles.pickerDoneBtn} activeOpacity={0.8}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Picker content */}
            <View style={[styles.pickerCardBody, { backgroundColor: colors.background }]}>
              {pickerIsTime ? (
                <CustomTimePicker
                  key={String(activeField)}
                  value={pickerValue}
                  colors={colors}
                  onChange={(d) => applyField(activeField, d)}
                />
              ) : (
                <CustomDatePicker
                  key={String(activeField)}
                  value={pickerValue}
                  minimumDate={pickerMinDate}
                  colors={colors}
                  onChange={(d) => applyField(activeField, d)}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── DateTimeCard sub-component ───────────────────────────────────────────────
interface DateTimeCardProps {
  label: string;
  accentColors: [string, string];
  date: Date;
  activeField: ActiveField;
  dateFieldKey: ActiveField;
  timeFieldKey: ActiveField;
  onTapField: (f: ActiveField) => void;
  colors: any;
  fullWidth?: boolean;
}

function DateTimeCard({
  label, accentColors, date, activeField, dateFieldKey, timeFieldKey, onTapField, colors, fullWidth,
}: DateTimeCardProps) {
  const dateActive = activeField === dateFieldKey;
  const timeActive = activeField === timeFieldKey;

  return (
    <View style={[styles.card, fullWidth && styles.cardFull, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Gradient accent bar */}
      <LinearGradient
        colors={accentColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />
      <Text style={[styles.cardLabel, { color: accentColors[0] }]}>{label}</Text>

      {/* Date tap zone */}
      <TouchableOpacity
        onPress={() => onTapField(dateFieldKey)}
        activeOpacity={0.7}
        style={[styles.cardField, dateActive && { backgroundColor: colors.primaryLight, borderRadius: Radius.sm }]}
      >
        <Text style={styles.cardFieldIcon}>📅</Text>
        <Text style={[styles.cardFieldText, { color: dateActive ? colors.primary : colors.textPrimary }]}>
          {fmtDate(date)}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      {/* Time tap zone */}
      <TouchableOpacity
        onPress={() => onTapField(timeFieldKey)}
        activeOpacity={0.7}
        style={[styles.cardField, timeActive && { backgroundColor: colors.primaryLight, borderRadius: Radius.sm }]}
      >
        <Text style={styles.cardFieldIcon}>⏰</Text>
        <Text style={[styles.cardFieldText, { color: timeActive ? colors.primary : colors.textSecondary }]}>
          {fmtTime(date)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '92%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.md,
    gap: Spacing.md,
  },
  handleRow: { alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  handle: { width: 40, height: 4, borderRadius: 2 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: Spacing.xs },
  headerTitle: { ...Typography.h2 },
  headerSub: { ...Typography.caption, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '600' },

  // Input
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 56,
  },
  input: { ...Typography.body, lineHeight: 24 },

  descInput: {
    ...Typography.body,
    lineHeight: 22,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },

  // Schedule card
  scheduleCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleLabel: { ...Typography.captionMedium, letterSpacing: 1 },

  // Dropdown trigger
  dropdownTrigger: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  dropdownTriggerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  dropdownTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dropdownEmoji: { fontSize: 20 },
  dropdownLabel: { ...Typography.bodyMedium },
  dropdownDesc: { ...Typography.caption, marginTop: 1 },
  dropdownChevron: { fontSize: 22, transform: [{ rotate: '90deg' }] },
  chevronUp: { transform: [{ rotate: '-90deg' }] },

  // Dropdown menu
  dropdownMenu: {
    overflow: 'hidden',
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  dropdownOptionEmoji: { fontSize: 18 },
  dropdownOptionText: { flex: 1 },
  dropdownOptionLabel: { ...Typography.bodyMedium },
  dropdownOptionDesc: { ...Typography.caption, marginTop: 1 },
  checkBadge: { width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Date range row
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rangeConnector: { alignItems: 'center', gap: 2 },
  connectorLine: { width: 2, height: 24, borderRadius: 1 },
  connectorArrow: { fontSize: 16 },

  // Date/time card
  card: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 0,
  },
  cardFull: { flex: undefined },
  cardAccent: { height: 3 },
  cardLabel: { ...Typography.caption, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs },
  cardField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  cardFieldIcon: { fontSize: 12 },
  cardFieldText: { ...Typography.caption, fontWeight: '500', flexShrink: 1 },
  cardDivider: { height: 1, marginHorizontal: Spacing.sm },

  // Picker modal
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerModalWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pickerCard: {
    width: '100%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  pickerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pickerCardTitle: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
  },
  pickerDoneBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  pickerDoneText: {
    ...Typography.captionMedium,
    color: '#FFFFFF',
  },
  pickerCardBody: {
    padding: Spacing.md,
  },
  iosPickerNative: { width: '100%' },

  // Add button
  addBtnWrap: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.xs },
  addBtn: { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  addBtnText: { ...Typography.bodyMedium, color: '#FFFFFF', letterSpacing: 0.4 },
});
