import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/services/supabase';

export type BiometricFailureReason =
  | 'not_available'
  | 'not_enrolled'
  | 'locked'
  | 'canceled'
  | 'permission_denied'
  | 'fallback'
  | 'unknown';

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel;
  reason?: BiometricFailureReason;
}

export interface BiometricPromptOptions {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  requireConfirmation?: boolean;
}

export interface BiometricAuthenticateResult {
  success: boolean;
  reason?: BiometricFailureReason;
}

interface StoredBiometricAccount {
  userId: string;
  email: string;
  updatedAt: string;
}

const PREFERENCE_KEY = (userId: string) => `biometric_pref_${userId}`;
const KNOWN_ACCOUNTS_KEY = 'biometric_known_accounts';


function mapErrorToReason(error?: string | null): BiometricFailureReason {
  if (!error) return 'unknown';
  const normalized = error.toLowerCase();
  if (normalized.includes('locked')) return 'locked';
  if (normalized.includes('permission') || normalized.includes('denied')) return 'permission_denied';
  if (normalized.includes('fallback')) return 'fallback';
  if (normalized.includes('cance')) return 'canceled';
  if (normalized.includes('enrolled')) return 'not_enrolled';
  return 'unknown';
}

async function updateKnownAccounts(update: (accounts: StoredBiometricAccount[]) => StoredBiometricAccount[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KNOWN_ACCOUNTS_KEY);
    const existing: StoredBiometricAccount[] = raw ? JSON.parse(raw) : [];
    const next = update(existing);
    await AsyncStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('⚠️ Failed to update biometric account registry:', error);
  }
}

class BiometricService {
  async getCapability(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          available: false,
          enrolled: false,
          supportedTypes: [],
          securityLevel: LocalAuthentication.SecurityLevel.NONE,
          reason: 'not_available',
        };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      return {
        available: true,
        enrolled: isEnrolled,
        supportedTypes,
        securityLevel,
        reason: isEnrolled ? undefined : 'not_enrolled',
      };
    } catch (error) {
      console.warn('⚠️ Failed to determine biometric capability:', error);
      return {
        available: false,
        enrolled: false,
        supportedTypes: [],
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
        reason: 'unknown',
      };
    }
  }

  async ensurePermission(): Promise<{ granted: boolean; reason?: BiometricFailureReason }> {
    try {
      if (Platform.OS !== 'ios') {
        // Android does not require an explicit permission prompt for biometrics
        return { granted: true };
      }

      const permission = await LocalAuthentication.getEnrolledLevelAsync();
      if (permission !== LocalAuthentication.SecurityLevel.NONE) {
        return { granted: true };
      }

      const request = await LocalAuthentication.requestPermissionsAsync();
      if (request.granted) {
        return { granted: true };
      }
      return { granted: false, reason: 'permission_denied' };
    } catch (error) {
      console.warn('⚠️ Failed to request biometric permission:', error);
      return { granted: false, reason: 'unknown' };
    }
  }

  async authenticate(options: BiometricPromptOptions = {}): Promise<BiometricAuthenticateResult> {
    try {
      const capability = await this.getCapability();
      if (!capability.available) {
        return { success: false, reason: 'not_available' };
      }
      if (!capability.enrolled) {
        return { success: false, reason: 'not_enrolled' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || 'Biometrik doğrulama',
        cancelLabel: options.cancelLabel || 'İptal',
        fallbackLabel: options.fallbackLabel,
        disableDeviceFallback: options.requireConfirmation ?? false,
      });

      if (result.success) {
        return { success: true };
      }

      if ((result.error || '').includes('lockout')) {
        return { success: false, reason: 'locked' };
      }

      return { success: false, reason: mapErrorToReason(result.error) };
    } catch (error: any) {
      return { success: false, reason: mapErrorToReason(error?.message) };
    }
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await supabaseService.storeBiometricRefreshToken(userId, refreshToken);
  }

  async getStoredRefreshToken(userId: string): Promise<string | null> {
    return supabaseService.getBiometricRefreshToken(userId);
  }

  async clearStoredRefreshToken(userId: string): Promise<void> {
    await supabaseService.clearBiometricRefreshToken(userId);
  }

  async setPreference(userId: string, enabled: boolean, email?: string | null): Promise<void> {
    try {
      if (enabled) {
        await AsyncStorage.setItem(PREFERENCE_KEY(userId), 'true');
        if (email) {
          await updateKnownAccounts((accounts) => {
            const filtered = accounts.filter((a) => a.userId !== userId);
            return [...filtered, { userId, email, updatedAt: new Date().toISOString() }];
          });
        }
      } else {
        await AsyncStorage.removeItem(PREFERENCE_KEY(userId));
        await updateKnownAccounts((accounts) => accounts.filter((a) => a.userId !== userId));
      }
    } catch (error) {
      console.warn('⚠️ Failed to persist biometric preference:', error);
    }
  }

  async getPreference(userId: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCE_KEY(userId));
      return stored === 'true';
    } catch {
      return false;
    }
  }

  async listKnownAccounts(): Promise<StoredBiometricAccount[]> {
    try {
      const raw = await AsyncStorage.getItem(KNOWN_ACCOUNTS_KEY);
      if (!raw) return [];
      const accounts = JSON.parse(raw) as StoredBiometricAccount[];
      return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
      console.warn('⚠️ Failed to load biometric accounts:', error);
      return [];
    }
  }
}

export const biometricService = new BiometricService();
