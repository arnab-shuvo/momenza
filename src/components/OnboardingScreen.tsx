import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: null,
    isLogo: true,
    title: 'Welcome to Momenza',
    subtitle: 'Your simple, powerful task manager. Stay on top of everything — at work, at home, on the go.',
    gradient: ['#1a1a2e', '#16213e', '#0f3460'] as const,
    accent: '#A78BFA',
  },
  {
    id: '2',
    emoji: '📁',
    isLogo: false,
    title: 'Organize with Projects',
    subtitle: 'Group your tasks by project. Work, personal, side hustle — keep everything neatly separated.',
    gradient: ['#0f2027', '#203a43', '#2c5364'] as const,
    accent: '#6C5CE7',
  },
  {
    id: '3',
    emoji: '📅',
    isLogo: false,
    title: 'Never Miss a Deadline',
    subtitle: 'Switch to calendar view to see all your tasks laid out by date. Plan your week at a glance.',
    gradient: ['#1a1a2e', '#16213e', '#1a3a5c'] as const,
    accent: '#74B9FF',
  },
  {
    id: '4',
    emoji: '☁️',
    isLogo: false,
    title: 'Your Data, Everywhere',
    subtitle: 'Sign in with Google to back up and sync across devices. Or stay offline — completely your choice.',
    gradient: ['#0f0c29', '#302b63', '#24243e'] as const,
    accent: '#A78BFA',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      setActiveIndex(activeIndex + 1);
    } else {
      onDone();
    }
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={s => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradient} style={styles.slide}>
            <View style={[styles.slideContent, { paddingTop: insets.top + 40 }]}>
              {item.isLogo ? (
                <View style={styles.logoWrap}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={[styles.emojiWrap, { backgroundColor: item.accent + '22' }]}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
              )}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </LinearGradient>
        )}
      />

      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.btnRow}>
          {!isLast ? (
            <TouchableOpacity onPress={onDone} activeOpacity={0.7} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipBtn} />
          )}

          <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={styles.nextBtn}>
            <LinearGradient
              colors={['#A78BFA', '#7B6FFF', '#5B5FED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a2e' },

  slide: { width: W, flex: 1 },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 20,
    paddingBottom: 160,
  },

  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 8,
  },
  logo: { width: 110, height: 110 },

  emojiWrap: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: { fontSize: 56 },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
  },

  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    gap: 20,
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: '#A78BFA' },
  dotInactive: { width: 8, backgroundColor: 'rgba(167,139,250,0.35)' },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '500',
  },
  nextBtn: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
  },
  nextGradient: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
