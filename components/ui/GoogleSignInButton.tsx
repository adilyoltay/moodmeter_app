import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

interface Props {
  disabled?: boolean;
  mode?: 'signin' | 'signup';
}

export function GoogleSignInButton({ disabled = false, mode = 'signin' }: Props) {
  const { language } = useLanguage();
  const { signInWithGoogle, isLoading, clearError } = useAuth();
  const [pending, setPending] = useState(false);

  const buttonText = useMemo(() => {
    if (language === 'tr') {
      return mode === 'signin' ? 'Google ile Giriş Yap' : 'Google ile Kayıt Ol';
    }
    return mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google';
  }, [language, mode]);

  const connectingText = language === 'tr' ? 'Bağlanıyor...' : 'Connecting...';
  const isBusy = pending || isLoading;

  const handlePress = useCallback(async () => {
    if (disabled || isBusy) return;

    try {
      clearError();
      setPending(true);
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      await signInWithGoogle();
    } catch (error: any) {
      const title = language === 'tr' ? 'Google Girişi' : 'Google Sign-In';
      const message = error?.message || (language === 'tr'
        ? 'Google ile giriş başarısız oldu. Lütfen daha sonra tekrar deneyin.'
        : 'Google sign-in failed. Please try again.');
      Alert.alert(title, message);
    } finally {
      setPending(false);
    }
  }, [clearError, disabled, isBusy, language, signInWithGoogle]);

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || isBusy) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled || isBusy}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        {isBusy ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <Text style={styles.googleIcon}>G</Text>
        )}
      </View>
      <Text style={[styles.text, (disabled || isBusy) && styles.textDisabled]}>
        {isBusy ? connectingText : buttonText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
});
