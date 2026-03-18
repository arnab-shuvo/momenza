import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';
import { Project } from '../types/project';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SCREEN_W * 0.78);

interface BurgerMenuProps {
  visible: boolean;
  archivedCount: number;
  projects: Project[];
  onClose: () => void;
  onArchive: () => void;
  onSettings: () => void;

  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

export default function BurgerMenu({
  visible,
  archivedCount,
  projects,
  onClose,
  onArchive,
  onSettings,

  onSelectProject,
  onNewProject,
}: BurgerMenuProps) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
    }
  }, [visible]);

  function nav(action: () => void) {
    action();
    onClose();
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
        <LinearGradient
          colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.brand,
            {
              paddingTop: Spacing.md,
              paddingBottom: Spacing.md,
              borderBottomColor: 'rgba(255,255,255,0.15)',
            },
          ]}
        >
          <View style={styles.brandIconWrap}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.brandIcon}
              resizeMode='contain'
            />
          </View>
          <View>
            <Text style={[styles.brandName, { color: '#fff' }]}>Momenza</Text>
            <Text style={[styles.brandTagline, { color: 'rgba(255,255,255,0.75)' }]}>
              Organize your day
            </Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Projects section */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                PROJECTS
              </Text>
              <TouchableOpacity
                onPress={() => nav(onNewProject)}
                activeOpacity={0.7}
                style={[styles.newProjectBtn, { backgroundColor: colors.primaryLight }]}
              >
                <Text style={[styles.newProjectText, { color: colors.primary }]}>+ New</Text>
              </TouchableOpacity>
            </View>

            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                onPress={() => nav(() => onSelectProject(project))}
                activeOpacity={0.7}
                style={styles.projectItem}
              >
                <View style={[styles.projectDot, { backgroundColor: project.color }]} />
                <Text style={[styles.projectName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {project.name}
                </Text>
                <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            ))}

            {projects.length === 0 && (
              <Text style={[styles.noProjects, { color: colors.textSecondary }]}>
                No projects yet
              </Text>
            )}
          </View>

          {/* Nav section */}
          <View style={[styles.section, styles.navSection]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              NAVIGATION
            </Text>

            <NavItem
              emoji='⚙️'
              label='Settings'
              accent='#F59E0B'
              colors={colors}
              onPress={() => nav(onSettings)}
            />

            <NavItem
              emoji='🗄️'
              label='Archive'
              accent='#5F27CD'
              badge={archivedCount > 0 ? archivedCount : undefined}
              colors={colors}
              onPress={() => nav(onArchive)}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Momenza v1.0
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  brandIconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: { width: 72, height: 72 },
  brandName: { fontSize: 24, fontWeight: '700' },
  brandTagline: { fontSize: 14, marginTop: 3 },

  scrollArea: { flex: 1 },

  section: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.lg },
  navSection: { paddingTop: Spacing.md },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    marginRight: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  newProjectBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  newProjectText: { ...Typography.captionMedium },

  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 2,
  },
  projectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  projectName: { flex: 1, ...Typography.bodyMedium },
  noProjects: { ...Typography.caption, marginLeft: Spacing.sm, marginTop: Spacing.xs },

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

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 13 },
});
