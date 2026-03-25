import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { Spacing, Radius } from '../theme';

WebBrowser.maybeCompleteAuthSession();

interface AuthScreenProps {
  visible?: boolean;
  onClose?: () => void;
}

export default function AuthScreen({ visible, onClose }: AuthScreenProps = {}) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      const redirectTo = makeRedirectUri({ scheme: 'momenza', path: 'auth/callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        Alert.alert('Sign in failed', error?.message ?? 'Could not get auth URL');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const url = result.url;
        const params = new URLSearchParams(url.includes('#') ? url.split('#')[1] : url.split('?')[1]);
        const access_token  = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessionError) Alert.alert('Sign in failed', sessionError.message);
        } else {
          Alert.alert('Sign in failed', 'Could not retrieve session from Google.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const inner = (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.full}>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Momenza</Text>
        <Text style={styles.tagline}>Organize your day, your way</Text>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleSignIn}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Image source={{ uri: 'https://www.google.com/favicon.ico' }} style={styles.googleIcon} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  if (visible !== undefined) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        {inner}
      </Modal>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  full: { flex: 1 },

  modalCloseBtn: {
    position: 'absolute', top: 52, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.sm,
  },
  logoWrap: {
    width: 100, height: 100, borderRadius: 24,
    overflow: 'hidden', marginBottom: Spacing.md,
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  logo: { width: 100, height: 100 },
  title: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: Spacing.xl },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: '#fff',
    paddingVertical: Spacing.md, borderRadius: Radius.lg,
    width: '100%', marginTop: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: '#333' },
});
