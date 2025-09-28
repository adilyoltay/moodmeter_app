import { useCallback, useEffect, useMemo, useState } from 'react';
import { biometricService, type BiometricCapability, type BiometricFailureReason } from '@/services/biometric';
import supabaseService from '@/services/supabase';

type Language = 'tr' | 'en';

export interface UseBiometricOptions {
  userId?: string | null;
  email?: string | null;
  language?: Language;
}

interface BiometricAccountSummary {
  userId: string;
  email: string;
  updatedAt: string;
}

export interface UseBiometricResult {
  capability: BiometricCapability | null;
  enabled: boolean;
  loading: boolean;
  processing: boolean;
  error: string | null;
  knownAccounts: BiometricAccountSummary[];
  toggleBiometric: (enable: boolean) => Promise<boolean>;
  loginWithBiometrics: (userId?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const messages: Record<Language, Record<BiometricFailureReason | 'generic', string>> = {
  tr: {
    not_available: 'Cihazınızda biometrik donanım bulunmuyor.',
    not_enrolled: 'Lütfen Ayarlar üzerinden FaceID/TouchID kaydı oluşturun.',
    locked: 'Biometrik doğrulama geçici olarak kilitlendi. Lütfen cihaz şifrenizi girin.',
    canceled: 'Biometrik doğrulama iptal edildi.',
    permission_denied: 'Biometrik iznine izin verilmedi.',
    fallback: 'Cihaz şifresi seçildi.',
    unknown: 'Biometrik doğrulama gerçekleştirilemedi.',
    generic: 'Biometrik doğrulama başarısız oldu.',
  },
  en: {
    not_available: 'Biometric hardware is not available on this device.',
    not_enrolled: 'Please enroll FaceID/TouchID from device settings.',
    locked: 'Biometric authentication is temporarily locked. Unlock your device first.',
    canceled: 'Biometric authentication was cancelled.',
    permission_denied: 'Biometric permission was denied.',
    fallback: 'Fallback authentication was chosen.',
    unknown: 'Biometric authentication could not be completed.',
    generic: 'Biometric authentication failed.',
  },
};

function translateError(reason: BiometricFailureReason | undefined, language: Language): string {
  if (!reason) return messages[language].generic;
  return messages[language][reason] || messages[language].generic;
}

export function useBiometric(options: UseBiometricOptions = {}): UseBiometricResult {
  const language = options.language ?? 'tr';
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownAccounts, setKnownAccounts] = useState<BiometricAccountSummary[]>([]);
  const capabilityReady = capability?.available && capability.enrolled;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cap, accounts] = await Promise.all([
        biometricService.getCapability(),
        biometricService.listKnownAccounts(),
      ]);
      setCapability(cap);
      setKnownAccounts(accounts);
      if (options.userId) {
        const preference = await biometricService.getPreference(options.userId);
        setEnabled(preference && cap.available && cap.enrolled);
      } else {
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }, [options.userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mapErrorToReason = useCallback((message?: string) => {
    if (!message) return 'unknown';
    const normalized = message.toLowerCase();
    if (normalized.includes('not_enrolled')) return 'not_enrolled';
    if (normalized.includes('not_available')) return 'not_available';
    if (normalized.includes('locked')) return 'locked';
    if (normalized.includes('permission')) return 'permission_denied';
    if (normalized.includes('cancel')) return 'canceled';
    return 'unknown';
  }, []);

  const persistAccount = useCallback(async () => {
    if (!options.userId) return;
    const session = await supabaseService.supabaseClient.auth.getSession();
    const refreshToken = session.data.session?.refresh_token;
    if (!refreshToken) {
      throw new Error('REFRESH_TOKEN_MISSING');
    }
    await supabaseService.storeBiometricRefreshToken(options.userId, refreshToken);
    await biometricService.setPreference(options.userId, true, options.email ?? session.data.session?.user?.email ?? null);
    setEnabled(true);
    setKnownAccounts(await biometricService.listKnownAccounts());
  }, [options.userId, options.email]);

  const toggleBiometric = useCallback(
    async (enableBiometric: boolean) => {
      if (!options.userId) {
        setError(language === 'tr' ? 'Biometrik giriş için önce oturum açın.' : 'Sign in before enabling biometrics.');
        return false;
      }

      setProcessing(true);
      setError(null);
      try {
        if (enableBiometric) {
          const cap = capability ?? (await biometricService.getCapability());
          if (!cap.available) {
            setError(translateError('not_available', language));
            return false;
          }
          if (!cap.enrolled) {
            setError(translateError('not_enrolled', language));
            return false;
          }

          const permission = await biometricService.ensurePermission();
          if (!permission.granted) {
            setError(translateError(permission.reason ?? 'permission_denied', language));
            return false;
          }

          const authResult = await biometricService.authenticate({
            promptMessage: language === 'tr' ? 'Biometrik doğrulama' : 'Biometric authentication',
            cancelLabel: language === 'tr' ? 'İptal' : 'Cancel',
          });
          if (!authResult.success) {
            setError(translateError(authResult.reason, language));
            return false;
          }

          await persistAccount();
          return true;
        }

        await biometricService.setPreference(options.userId, false);
        await supabaseService.clearBiometricRefreshToken(options.userId);
        setEnabled(false);
        setKnownAccounts(await biometricService.listKnownAccounts());
        return true;
      } catch (err: any) {
        const reason = mapErrorToReason(err?.message);
        setError(translateError(reason, language));
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [capability, language, options.userId, persistAccount]
  );

  const loginWithBiometrics = useCallback(
    async (explicitUserId?: string) => {
      setProcessing(true);
      setError(null);
      try {
        const accounts = await biometricService.listKnownAccounts();
        const targetAccount = explicitUserId
          ? accounts.find((account) => account.userId === explicitUserId)
          : accounts[accounts.length - 1];

        if (!targetAccount) {
          setError(language === 'tr' ? 'Kayıtlı bir biyometrik hesap bulunamadı.' : 'No biometric-enabled account found.');
          return false;
        }

        const refreshToken = await supabaseService.getBiometricRefreshToken(targetAccount.userId);
        if (!refreshToken) {
          setError(language === 'tr' ? 'Oturum anahtarı bulunamadı.' : 'Refresh token is missing.');
          return false;
        }

        const authResult = await biometricService.authenticate({
          promptMessage: language === 'tr' ? 'Biometrik giriş' : 'Biometric login',
          cancelLabel: language === 'tr' ? 'İptal' : 'Cancel',
        });

        if (!authResult.success) {
          setError(translateError(authResult.reason, language));
          if (authResult.reason === 'locked') {
            await supabaseService.clearBiometricRefreshToken(targetAccount.userId);
          }
          return false;
        }

        const result = await supabaseService.signInWithRefreshToken(refreshToken);
        if (result.session?.refresh_token) {
          await supabaseService.storeBiometricRefreshToken(targetAccount.userId, result.session.refresh_token);
          await biometricService.setPreference(targetAccount.userId, true, result.user.email ?? targetAccount.email);
        }
        setKnownAccounts(await biometricService.listKnownAccounts());
        return true;
      } catch (err: any) {
        const reason = mapErrorToReason(err?.message);
        setError(translateError(reason, language));
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [language, mapErrorToReason]
  );

  const value = useMemo<UseBiometricResult>(
    () => ({
      capability,
      enabled: enabled && !!capabilityReady,
      loading,
      processing,
      error,
      knownAccounts,
      toggleBiometric,
      loginWithBiometrics,
      refresh,
    }),
    [capability, capabilityReady, enabled, loading, processing, error, knownAccounts, toggleBiometric, loginWithBiometrics, refresh]
  );

  return value;
}
