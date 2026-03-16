import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Switch,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SCREEN_W * 0.78);

interface BurgerMenuProps {
  visible: boolean;
  archivedCount: number;
  onClose: () => void;
  onArchive: () => void;
}

export default function BurgerMenu({
  visible,
  archivedCount,
  onClose,
  onArchive,
}: BurgerMenuProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 2,
          speed: 18,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -DRAWER_W,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      setSettingsOpen(false);
      settingsAnim.setValue(0);
    }
  }, [visible]);

  function toggleSettings() {
    const open = !settingsOpen;
    setSettingsOpen(open);
    Animated.spring(settingsAnim, {
      toValue: open ? 1 : 0,
      useNativeDriver: false,
      bounciness: 2,
      speed: 16,
    }).start();
  }

  const settingsMaxH = settingsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  function nav(action: () => void) {
    onClose();
    setTimeout(action, 260);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType='none'
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: colors.surface, transform: [{ translateX }] },
          Shadow.md,
        ]}
      >
        {/* Branding */}
        <LinearGradient
          colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brand}
        >
          <View style={styles.brandIconWrap}>
            <Text style={styles.brandCheckmark}>✓</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Momenza</Text>
            <Text style={styles.brandTagline}>Organize your day</Text>
          </View>
        </LinearGradient>

        {/* Nav items */}
        <View style={styles.nav}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            NAVIGATION
          </Text>

          {/* Settings — expands inline */}
          <TouchableOpacity
            onPress={toggleSettings}
            activeOpacity={0.7}
            style={[
              styles.navItem,
              settingsOpen && { backgroundColor: colors.primaryLight },
            ]}
          >
            <View style={[styles.navIcon, { backgroundColor: '#F59E0B22' }]}>
              <Text style={styles.navEmoji}>⚙️</Text>
            </View>
            <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
              Settings
            </Text>
            <Animated.Text
              style={[
                styles.chevron,
                { color: colors.textSecondary },
                {
                  transform: [
                    {
                      rotate: settingsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '90deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              ›
            </Animated.Text>
          </TouchableOpacity>

          <Animated.View
            style={{ maxHeight: settingsMaxH, overflow: 'hidden' }}
          >
            <View
              style={[
                styles.settingsPanel,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.settingsPanelLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {isDark ? '🌙  Dark mode' : '☀️  Light mode'}
              </Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E8EAF0', true: colors.primary }}
                thumbColor={isDark ? colors.primaryDark : '#FFFFFF'}
                ios_backgroundColor='#E8EAF0'
              />
            </View>
          </Animated.View>

          <NavItem
            emoji='🗄️'
            label='Archive'
            accent='#5F27CD'
            badge={archivedCount > 0 ? archivedCount : undefined}
            colors={colors}
            onPress={() => nav(onArchive)}
          />
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Momenza v1.0
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({
  emoji,
  label,
  accent,
  badge,
  colors,
  onPress,
}: {
  emoji: string;
  label: string;
  accent: string;
  badge?: number;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.navItem}
    >
      <View style={[styles.navIcon, { backgroundColor: accent + '22' }]}>
        <Text style={styles.navEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      {badge !== undefined && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_W,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: 72,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  brandIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCheckmark: { fontSize: 32, color: '#fff', fontWeight: '700' },
  brandName: { fontSize: 24, fontWeight: '700', color: '#fff' },
  brandTagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 3 },

  nav: { flex: 1, paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.1,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xl,
    marginBottom: Spacing.xs + 2,
  },
  navIcon: {
    width: 54,
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navEmoji: { fontSize: 26 },
  navLabel: { flex: 1, fontSize: 19, fontWeight: '600' },
  chevron: { fontSize: 24, fontWeight: '300' },

  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  settingsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginLeft: 54 + Spacing.lg + Spacing.md,
    marginRight: Spacing.xs,
  },
  settingsPanelLabel: { fontSize: 15, fontWeight: '500' },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 13 },
});
