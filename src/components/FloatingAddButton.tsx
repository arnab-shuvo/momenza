import React, { useRef, useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Easing, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FloatingAddButtonProps {
  isInsideProject: boolean;
  onAddProject: () => void;
  onAddTask: () => void;
}

const OPEN_DURATION  = 220;
const CLOSE_DURATION = 160;

export default function FloatingAddButton({ isInsideProject, onAddProject, onAddTask }: FloatingAddButtonProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const dialAnim     = useRef(new Animated.Value(0)).current;
  const rotateAnim   = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    if (isInsideProject)
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }
  function handlePressOut() {
    if (isInsideProject)
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  }

  function openDial() {
    setOpen(true);
    Animated.parallel([
      Animated.timing(dialAnim, {
        toValue: 1, duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1, duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: OPEN_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeDial(cb?: () => void) {
    Animated.parallel([
      Animated.timing(dialAnim, {
        toValue: 0, duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0, duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0, duration: CLOSE_DURATION,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => { setOpen(false); cb?.(); });
  }

  function handleMainPress() {
    if (isInsideProject) { onAddTask(); return; }
    open ? closeDial() : openDial();
  }

  const taskTranslateY    = dialAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -82] });
  const projectTranslateY = dialAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -158] });
  const rotate            = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    // Always full-screen container for home (no layout switch = no flash)
    <View
      style={isInsideProject ? styles.container : styles.containerFull}
      pointerEvents="box-none"
    >
      {/* Backdrop — always in tree, pointerEvents toggled */}
      {!isInsideProject && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeDial()} />
        </Animated.View>
      )}

      {/* Dial anchor — pinned bottom-right */}
      <View style={styles.dialAnchor} pointerEvents="box-none">

        {/* Task mini button */}
        {!isInsideProject && (
          <Animated.View
            style={[styles.miniWrap, { transform: [{ translateY: taskTranslateY }], opacity: dialAnim }]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <View style={styles.miniRow}>
              <View style={[styles.miniLabel, { backgroundColor: colors.surface }]}>
                <Text style={[styles.miniLabelText, { color: colors.textPrimary }]}>Task</Text>
              </View>
              <TouchableOpacity onPress={() => closeDial(onAddTask)} activeOpacity={0.85} style={styles.miniShadow}>
                <LinearGradient colors={['#4CAF82', '#2E9E6A']} style={styles.miniButton}>
                  <Feather name="check-square" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Project mini button */}
        {!isInsideProject && (
          <Animated.View
            style={[styles.miniWrap, { transform: [{ translateY: projectTranslateY }], opacity: dialAnim }]}
            pointerEvents={open ? 'auto' : 'none'}
          >
            <View style={styles.miniRow}>
              <View style={[styles.miniLabel, { backgroundColor: colors.surface }]}>
                <Text style={[styles.miniLabelText, { color: colors.textPrimary }]}>Project</Text>
              </View>
              <TouchableOpacity onPress={() => closeDial(onAddProject)} activeOpacity={0.85} style={styles.miniShadow}>
                <LinearGradient colors={['#A78BFA', '#5B5FED']} style={styles.miniButton}>
                  <Feather name="folder-plus" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Main FAB */}
        <Animated.View style={[styles.mainShadow, { transform: [{ scale: isInsideProject ? scaleAnim : new Animated.Value(1) }] }]}>
          <TouchableOpacity
            onPress={handleMainPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <LinearGradient
              colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.mainButton}
            >
              <Animated.Text style={[styles.icon, !isInsideProject && { transform: [{ rotate }] }]}>+</Animated.Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    zIndex: 100,
  },
  containerFull: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dialAnchor: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    alignItems: 'flex-end',
  },
  miniWrap: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  miniLabelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  miniShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 999,
  },
  miniButton: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainShadow: {
    shadowColor: '#5B5FED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
    borderRadius: 999,
  },
  mainButton: {
    width: 62,
    height: 62,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -2,
  },
});
