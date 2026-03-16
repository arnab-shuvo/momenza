import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Pressable, Animated, ScrollView, Platform, Switch, Keyboard,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import { Task, TaskDate } from '../types/task';
import { CustomDatePicker, CustomTimePicker } from './CustomPickers';

// ─── shared color palette (mirrors CalendarView) ──────────────────────────────
const PALETTE = [
  '#FF6B6B', '#FF9F43', '#1DD1A1', '#48DBFB',
  '#5F27CD', '#FD79A8', '#6C5CE7', '#00B894',
  '#E17055', '#74B9FF', '#A29BFE', '#FDCB6E',
];
function taskColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = (h << 5) - h + id.charCodeAt(i); h |= 0; }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ─── helpers ──────────────────────────────────────────────────────────────────
type ActiveField = 'start-date' | 'start-time' | 'end-date' | 'end-time' | null;
type DateMode = 'single' | 'range';

function defaultStart() {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d;
}
function defaultEnd() {
  const d = defaultStart(); d.setDate(d.getDate() + 1); return d;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtFull(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── props ────────────────────────────────────────────────────────────────────
interface Props {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, title: string, taskDate?: TaskDate, description?: string) => void;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function TaskDetailModal({
  task, visible, onClose, onSave, onComplete, onArchive, onDelete, onRestore,
}: Props) {
  const { colors, isDark } = useTheme();

  // ── edit state ──────────────────────────────────────────────────────────────
  const [isEditing,       setIsEditing]       = useState(false);
  const [editTitle,       setEditTitle]       = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [dateEnabled,  setDateEnabled]  = useState(false);
  const [dateMode,     setDateMode]     = useState<DateMode>('single');
  const [startDT,      setStartDT]      = useState<Date>(defaultStart);
  const [endDT,        setEndDT]        = useState<Date>(defaultEnd);
  const [activeField,  setActiveField]  = useState<ActiveField>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const titleRef  = useRef<TextInput>(null);

  // ── sync state when task changes ────────────────────────────────────────────
  useEffect(() => {
    if (task && visible) {
      setIsEditing(false);
      setEditTitle(task.title);
      setEditDescription(task.description ?? '');
      setActiveField(null);
      setPickerVisible(false);
      if (task.taskDate) {
        setDateEnabled(true);
        setDateMode(task.taskDate.type === 'range' ? 'range' : 'single');
        setStartDT(new Date(task.taskDate.start));
        setEndDT(task.taskDate.end ? new Date(task.taskDate.end) : new Date(task.taskDate.start));
      } else {
        setDateEnabled(false);
        setDateMode('single');
        setStartDT(defaultStart());
        setEndDT(defaultEnd());
      }
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [task, visible]);

  if (!task) return null;

  // ── derived ─────────────────────────────────────────────────────────────────
  const accent = taskColor(task.id);
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] });

  const statusLabel = task.status === 'active' ? 'Active' : task.status === 'completed' ? 'Completed' : 'Deleted';
  const statusColor = task.status === 'active' ? colors.primary : task.status === 'completed' ? colors.success : colors.danger;
  const statusBg    = task.status === 'active' ? colors.primaryLight : task.status === 'completed' ? colors.successLight : colors.dangerLight;

  // ── picker helpers ───────────────────────────────────────────────────────────
  function tapField(field: ActiveField) {
    Keyboard.dismiss();
    titleRef.current?.blur();
    setActiveField(field);
    setPickerVisible(true);
  }

  function closePicker() { setPickerVisible(false); setActiveField(null); }

  function applyField(field: ActiveField, val: Date) {
    const patch = (prev: Date, isDate: boolean) => {
      const d = new Date(prev);
      if (isDate) d.setFullYear(val.getFullYear(), val.getMonth(), val.getDate());
      else        d.setHours(val.getHours(), val.getMinutes(), 0, 0);
      return d;
    };
    if (field === 'start-date') setStartDT(p => patch(p, true));
    if (field === 'start-time') setStartDT(p => patch(p, false));
    if (field === 'end-date')   setEndDT(p => patch(p, true));
    if (field === 'end-time')   setEndDT(p => patch(p, false));
  }

  const pickerIsTime  = activeField?.endsWith('time') ?? false;
  const pickerMode    = pickerIsTime ? 'time' : 'date';
  const pickerDisplay = pickerIsTime ? 'spinner' : 'inline';
  const pickerValue   = activeField?.startsWith('end') ? endDT : startDT;
  const pickerMinDate = activeField === 'end-date' ? startDT : undefined;

  function handleNativeChange(_e: DateTimePickerEvent, sel?: Date) {
    if (sel) applyField(activeField, sel);
  }

  // ── actions ──────────────────────────────────────────────────────────────────
  function handleEdit() { setIsEditing(true); setTimeout(() => titleRef.current?.focus(), 100); }

  function handleCancel() {
    if (!task) return;
    setIsEditing(false);
    setPickerVisible(false);
    setActiveField(null);
    // Revert to original
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    if (task.taskDate) {
      setDateEnabled(true);
      setDateMode(task.taskDate.type === 'range' ? 'range' : 'single');
      setStartDT(new Date(task.taskDate.start));
      setEndDT(task.taskDate.end ? new Date(task.taskDate.end) : new Date(task.taskDate.start));
    } else {
      setDateEnabled(false);
    }
  }

  function handleSave() {
    if (!task || !editTitle.trim()) return;
    let td: TaskDate | undefined;
    if (dateEnabled) {
      td = {
        type: dateMode,
        start: startDT.getTime(),
        ...(dateMode === 'range' ? { end: endDT.getTime() } : {}),
      };
    }
    onSave(task.id, editTitle.trim(), td, editDescription);
    setIsEditing(false);
  }

  function handleAction(action: () => void) { onClose(); setTimeout(action, 200); }

  // ── date display card ────────────────────────────────────────────────────────
  function DateCard({
    label, dt, dateField, timeField,
  }: { label: string; dt: Date; dateField: ActiveField; timeField: ActiveField }) {
    return (
      <View style={[styles.dateCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[styles.dateCardAccent, { backgroundColor: accent }]} />
        <View style={styles.dateCardBody}>
          <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>{label}</Text>
          <View style={styles.dateCardRow}>
            <TouchableOpacity
              onPress={() => isEditing && tapField(dateField)}
              style={[styles.dateChip, { backgroundColor: colors.surface, borderColor: activeField === dateField ? accent : colors.border }]}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <Text style={styles.dateChipIcon}>📅</Text>
              <Text style={[styles.dateChipText, { color: colors.textPrimary }]}>{fmtDate(dt)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => isEditing && tapField(timeField)}
              style={[styles.dateChip, { backgroundColor: colors.surface, borderColor: activeField === timeField ? accent : colors.border }]}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <Text style={styles.dateChipIcon}>⏰</Text>
              <Text style={[styles.dateChipText, { color: colors.textPrimary }]}>{fmtTime(dt)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.surface }, Shadow.md, { transform: [{ translateY }] }]}
      >
        {/* Header */}
        <LinearGradient
          colors={[accent + 'DD', accent + '88', colors.primary + 'CC']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.headerClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Task' : 'Task Details'}</Text>
            {!isEditing ? (
              <TouchableOpacity
                onPress={handleEdit}
                style={styles.editBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.editBtnText}>✏️  Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          {/* Color swatch */}
          <View style={[styles.colorSwatch, { backgroundColor: accent }]} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {/* Title */}
          {isEditing ? (
            <TextInput
              ref={titleRef}
              style={[styles.titleInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editTitle}
              onChangeText={setEditTitle}
              multiline
              placeholder="Task title"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={[styles.titleText, { color: colors.textPrimary }]}>{task.title}</Text>
          )}

          {/* Description */}
          {isEditing ? (
            <View style={[styles.descWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.descInput, { color: colors.textPrimary }]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                placeholder="Add notes or details…"
                placeholderTextColor={colors.textSecondary}
                textAlignVertical="top"
                maxLength={1000}
              />
            </View>
          ) : task.description ? (
            <View style={[styles.descWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              <Text style={[styles.descText, { color: colors.textPrimary }]}>{task.description}</Text>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Date section */}
          {isEditing ? (
            <View style={styles.dateSection}>
              <View style={styles.dateSectionHeader}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE & TIME</Text>
                <Switch
                  value={dateEnabled}
                  onValueChange={setDateEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={dateEnabled ? colors.primaryDark : '#fff'}
                  ios_backgroundColor={colors.border}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
              </View>

              {dateEnabled && (
                <>
                  {/* Mode toggle */}
                  <View style={[styles.modeRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {(['single', 'range'] as DateMode[]).map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setDateMode(m)}
                        style={[styles.modeBtn, dateMode === m && { backgroundColor: colors.primaryLight }]}
                      >
                        <Text style={[styles.modeBtnText, { color: dateMode === m ? colors.primary : colors.textSecondary }]}>
                          {m === 'single' ? '📌 Specific Date' : '📆 Date Range'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <DateCard label="START" dt={startDT} dateField="start-date" timeField="start-time" />
                  {dateMode === 'range' && (
                    <DateCard label="END" dt={endDT} dateField="end-date" timeField="end-time" />
                  )}
                </>
              )}
            </View>
          ) : (
            <View style={styles.dateSection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE & TIME</Text>
              {task.taskDate ? (
                task.taskDate.type === 'range' ? (
                  <View style={styles.dateRangeDisplay}>
                    <View style={[styles.dateLine, { borderLeftColor: accent }]}>
                      <Text style={[styles.dateLineLabel, { color: colors.textSecondary }]}>Start</Text>
                      <Text style={[styles.dateLineValue, { color: colors.textPrimary }]}>
                        {fmtDate(new Date(task.taskDate.start))}  ·  {fmtTime(new Date(task.taskDate.start))}
                      </Text>
                    </View>
                    <View style={[styles.dateLine, { borderLeftColor: accent }]}>
                      <Text style={[styles.dateLineLabel, { color: colors.textSecondary }]}>End</Text>
                      <Text style={[styles.dateLineValue, { color: colors.textPrimary }]}>
                        {fmtDate(new Date(task.taskDate.end!))}  ·  {fmtTime(new Date(task.taskDate.end!))}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.dateLine, { borderLeftColor: accent }]}>
                    <Text style={[styles.dateLineValue, { color: colors.textPrimary }]}>
                      {fmtDate(new Date(task.taskDate.start))}  ·  {fmtTime(new Date(task.taskDate.start))}
                    </Text>
                  </View>
                )
              ) : (
                <Text style={[styles.noDate, { color: colors.textSecondary }]}>No date set</Text>
              )}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Meta */}
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Created  {fmtFull(new Date(task.createdAt))}
          </Text>
        </ScrollView>

        {/* Footer actions */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {isEditing ? (
            <>
              <TouchableOpacity
                onPress={handleCancel}
                style={[styles.footerBtnOutline, { borderColor: colors.border }]}
              >
                <Text style={[styles.footerBtnOutlineText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.footerBtnPrimary} disabled={!editTitle.trim()}>
                <LinearGradient
                  colors={['#A78BFA', '#5B5FED']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.footerBtnGrad}
                >
                  <Text style={styles.footerBtnPrimaryText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {task.status === 'active' ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleAction(() => onComplete(task.id))}
                    style={[styles.footerBtnOutline, { borderColor: colors.success }]}
                  >
                    <Text style={[styles.footerBtnOutlineText, { color: colors.success }]}>✓  Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAction(() => onArchive(task.id))}
                    style={[styles.footerBtnOutline, { borderColor: colors.primary }]}
                  >
                    <Text style={[styles.footerBtnOutlineText, { color: colors.primary }]}>📦  Archive</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => handleAction(() => onRestore(task.id))}
                  style={[styles.footerBtnOutline, { borderColor: colors.primary }]}
                >
                  <Text style={[styles.footerBtnOutlineText, { color: colors.primary }]}>↩  Restore</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleAction(() => onDelete(task.id))}
                style={[styles.footerBtnOutline, { borderColor: colors.danger }]}
              >
                <Text style={[styles.footerBtnOutlineText, { color: colors.danger }]}>🗑  Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      {/* ── Picker sub-modal ─────────────────────────────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.pickerBackdrop} onPress={closePicker} />
        <View style={styles.pickerWrap} pointerEvents="box-none">
          <View style={[styles.pickerCard, { backgroundColor: colors.surface }, Shadow.md]}>
            <LinearGradient
              colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.pickerHeader}
            >
              <Text style={styles.pickerTitle}>
                {pickerIsTime ? '⏰  Set Time' : '📅  Set Date'}
              </Text>
              <TouchableOpacity onPress={closePicker} style={styles.pickerDoneBtn}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            </LinearGradient>
            <View style={[styles.pickerBody, { backgroundColor: colors.background }]}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={pickerValue}
                  mode={pickerMode}
                  display={pickerDisplay}
                  minimumDate={pickerMinDate}
                  onChange={handleNativeChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  accentColor={colors.primary}
                />
              ) : pickerIsTime ? (
                <CustomTimePicker
                  key={String(activeField)}
                  value={pickerValue}
                  colors={colors}
                  onChange={d => applyField(activeField, d)}
                />
              ) : (
                <CustomDatePicker
                  key={String(activeField)}
                  value={pickerValue}
                  minimumDate={pickerMinDate}
                  colors={colors}
                  onChange={d => applyField(activeField, d)}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
    maxHeight: '90%',
  },

  // Header
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerClose: { color: 'rgba(255,255,255,0.85)', fontSize: 18, fontWeight: '600' },
  headerTitle: { color: '#fff', ...Typography.bodyMedium, fontWeight: '700' },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  colorSwatch: {
    width: 32, height: 4,
    borderRadius: 2,
    marginTop: Spacing.xs,
  },

  // Body
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 12, fontWeight: '600' },

  titleText: { ...Typography.h2, lineHeight: 28 },
  titleInput: {
    ...Typography.h2,
    lineHeight: 28,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 56,
    textAlignVertical: 'top',
  },

  divider: { height: 1, marginVertical: Spacing.xs },

  descWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  descInput: { ...Typography.body, lineHeight: 22, minHeight: 72 },
  descText:  { ...Typography.body, lineHeight: 22 },

  sectionLabel: {
    ...Typography.captionMedium,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },

  // Date display (view mode)
  dateSection: { gap: Spacing.xs },
  dateSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  dateRangeDisplay: { gap: Spacing.sm },
  dateLine: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    paddingVertical: 4,
    gap: 2,
  },
  dateLineLabel: { ...Typography.caption },
  dateLineValue: { ...Typography.bodyMedium },
  noDate: { ...Typography.body, fontStyle: 'italic' },

  // Date edit (edit mode)
  modeRow: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modeBtnText: { ...Typography.captionMedium },

  dateCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  dateCardAccent: { width: 4 },
  dateCardBody: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  dateCardLabel: { ...Typography.captionMedium, letterSpacing: 0.5 },
  dateCardRow: { flexDirection: 'row', gap: Spacing.sm },
  dateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  dateChipIcon: { fontSize: 14 },
  dateChipText: { ...Typography.caption, flex: 1 },

  meta: { ...Typography.caption, marginTop: Spacing.xs },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  footerBtnOutline: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnOutlineText: { ...Typography.bodyMedium, fontWeight: '600' },
  footerBtnPrimary: { flex: 1.5 },
  footerBtnGrad: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimaryText: { color: '#fff', ...Typography.bodyMedium, fontWeight: '700' },

  // Picker sub-modal
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  pickerTitle:   { ...Typography.bodyMedium, color: '#fff' },
  pickerDoneBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  pickerDoneText: { ...Typography.captionMedium, color: '#fff' },
  pickerBody:    { padding: Spacing.md },
});
