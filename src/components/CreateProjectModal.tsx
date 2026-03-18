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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import { PROJECT_COLORS, Project } from '../types/project';

interface CreateProjectModalProps {
  visible: boolean;
  editingProject?: Project | null;
  onSubmit: (name: string, color: string) => void;
  onClose: () => void;
}

export default function CreateProjectModal({
  visible,
  editingProject,
  onSubmit,
  onClose,
}: CreateProjectModalProps) {
  const { colors } = useTheme();
  const [name, setName]           = useState('');
  const [color, setColor]         = useState(PROJECT_COLORS[0]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef  = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible) {
      if (editingProject) {
        setName(editingProject.name);
        setColor(editingProject.color);
      } else {
        setName('');
        setColor(PROJECT_COLORS[0]);
      }
      Animated.spring(slideAnim, {
        toValue: 1, useNativeDriver: true, bounciness: 4, speed: 14,
      }).start();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, color);
    onClose();
  }

  const canSubmit  = name.trim().length > 0;
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const isEditing  = !!editingProject;

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
            <View style={styles.header}>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {isEditing ? 'Edit Project' : 'New Project'}
                </Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                  {isEditing ? 'Update project details' : 'Name your project and pick a color'}
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

            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="e.g. Work, Personal, Fitness…"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
                maxLength={80}
              />
            </View>

            <View style={[styles.colorSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>PROJECT COLOR</Text>
              <View style={styles.colorGrid}>
                {PROJECT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      color === c && styles.colorSwatchSelected,
                    ]}
                  >
                    {color === c && (
                      <Text style={styles.colorCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={canSubmit ? 0.85 : 1}
              disabled={!canSubmit}
              style={[styles.submitBtnWrap, !canSubmit && { opacity: 0.4 }]}
            >
              <LinearGradient
                colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>
                  {isEditing ? 'Save Changes' : 'Create Project'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + Spacing.md,
    gap: Spacing.md,
  },
  handleRow: { alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  headerTitle: { ...Typography.h2 },
  headerSub: { ...Typography.caption, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 56,
  },
  input: { ...Typography.body, lineHeight: 24 },
  colorSection: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  colorLabel: { ...Typography.captionMedium, letterSpacing: 1 },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheck: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitBtnWrap: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.xs },
  submitBtn: { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  submitBtnText: { ...Typography.bodyMedium, color: '#FFFFFF', letterSpacing: 0.4 },
});
