import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthResult, SignUpResult } from '@/types/supabase';
import { buildUsersUpsertRow } from '@/utils/userRowMapper';

const SECURE_STORE_KEYS = {
  accessToken: 'mm_supabase_access_token',
  refreshToken: 'mm_supabase_refresh_token',
};

const BIOMETRIC_REFRESH_TOKEN_KEY = (userId: string) => `mm_biometric_refresh_token_${userId}`;

export interface GoogleOAuthStartResult {
  url: string;
  redirectTo: string;
  provider: 'google';
}

export interface GoogleOAuthCompleteResult {
  user: User;
  session: Session;
  profile: {
    email: string;
    name: string;
    avatarUrl?: string | null;
    provider: string;
    isNewUser: boolean;
  };
}

/**
 * AuthService: focuses only on authentication responsibilities.
 * This is a scaffold; the main facade still lives in services/supabase.ts.
 */
export class AuthService {
  constructor(private client: SupabaseClient, private setCurrentUser: (u: User | null) => void) {}

  async initialize(): Promise<User | null> {
    const { data: { session } } = await this.client.auth.getSession();
    const user = session?.user || null;
    this.setCurrentUser(user);
    return user;
  }

  async signUpWithEmail(email: string, password: string, name: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { name, full_name: name, provider: 'email' } }
    });
    if (error) throw error;
    if (data.user && !data.session) return { user: data.user, session: null, needsConfirmation: true };
    if (data.user && data.session) { this.setCurrentUser(data.user); return { user: data.user, session: data.session, needsConfirmation: false }; }
    throw new Error('Unexpected signup result');
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user && data.session) {
      this.setCurrentUser(data.user);
      await this.persistSessionTokens(data.session);
      return { user: data.user, session: data.session };
    }
    throw new Error('Login failed: No user or session');
  }

  async signInWithGoogle(): Promise<GoogleOAuthStartResult> {
    const isExpoGo = Constants.appOwnership === 'expo';
    const redirectTo = isExpoGo
      ? makeRedirectUri({ path: 'auth/callback' })
      : Linking.createURL('auth/callback');

    try {
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const providerUrl = (data as any)?.url;
      if (!providerUrl) {
        const err: any = new Error('Google OAuth başlatılamadı. Lütfen yapılandırmayı kontrol edin.');
        err.code = 'GOOGLE_OAUTH_URL_MISSING';
        throw err;
      }

      return {
        url: providerUrl,
        redirectTo,
        provider: 'google',
      };
    } catch (error: any) {
      throw this.transformOAuthError(error, 'Google ile giriş başlatılamadı. Lütfen daha sonra tekrar deneyin.');
    }
  }

  async completeGoogleOAuth(callbackUrl: string, expectedState?: string): Promise<GoogleOAuthCompleteResult> {
    if (!callbackUrl) {
      const err: any = new Error('Google OAuth dönüş URL\'si alınamadı.');
      err.code = 'GOOGLE_OAUTH_CALLBACK_MISSING';
      throw err;
    }

    try {
      const parsed = this.normalizeCallbackUrl(callbackUrl);
      const params = parsed.searchParams;

      const callbackState = params.get('app_state') ?? params.get('state');
      const hasAppState = params.has('app_state');
      if (expectedState && hasAppState && expectedState !== callbackState) {
        const err: any = new Error('Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.');
        err.code = 'OAUTH_STATE_MISMATCH';
        throw err;
      }

      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');
      if (errorParam) {
        const err: any = new Error(errorDescription || errorParam);
        err.code = errorParam;
        throw err;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const authCode = params.get('code');

      let session: Session | null = null;
      let user: User | null = null;

      if (accessToken && refreshToken) {
        const { data, error } = await this.client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;
        session = data.session ?? null;
        user = data.user ?? data.session?.user ?? null;
      } else if (authCode) {
        const { data, error } = await this.client.auth.exchangeCodeForSession(authCode as any);
        if (error) throw error;
        session = data.session ?? null;
        user = data.user ?? data.session?.user ?? null;
      } else {
        const { data } = await this.client.auth.getSession();
        session = data.session ?? null;
        user = data.session?.user ?? null;
      }

      if (!user || !session) {
        const err: any = new Error('Google OAuth oturumu oluşturulamadı.');
        err.code = 'GOOGLE_OAUTH_SESSION_MISSING';
        throw err;
      }

      this.setCurrentUser(user);

      await this.persistSessionTokens(session, {
        access_token: accessToken || session.access_token,
        refresh_token: refreshToken || session.refresh_token,
      });

      const profile = await this.upsertBasicProfile(user);

      return { user, session, profile };
    } catch (error: any) {
      throw this.transformOAuthError(error, 'Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.');
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    this.setCurrentUser(null);
    try { await AsyncStorage.removeItem('currentUserId'); } catch {}
    try { await this.clearPersistedTokens(); } catch {}
  }

  async storeBiometricRefreshToken(userId: string, refreshToken: string): Promise<void> {
    if (!userId || !refreshToken) return;
    try {
      if (!SecureStore?.isAvailableAsync) return;
      const available = await SecureStore.isAvailableAsync();
      if (!available) return;
      const secureOptions = Platform.OS === 'ios'
        ? { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
        : undefined;
      await SecureStore.setItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY(userId), refreshToken, secureOptions as any);
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Failed to persist biometric refresh token:', error);
    }
  }

  async getBiometricRefreshToken(userId: string): Promise<string | null> {
    if (!userId) return null;
    try {
      if (!SecureStore?.isAvailableAsync) return null;
      const available = await SecureStore.isAvailableAsync();
      if (!available) return null;
      return await SecureStore.getItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY(userId));
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Failed to fetch biometric refresh token:', error);
      return null;
    }
  }

  async clearBiometricRefreshToken(userId: string): Promise<void> {
    if (!userId) return;
    try {
      if (!SecureStore?.isAvailableAsync) return;
      const available = await SecureStore.isAvailableAsync();
      if (!available) return;
      await SecureStore.deleteItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY(userId));
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Failed to clear biometric refresh token:', error);
    }
  }

  async signInWithRefreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      if (!refreshToken) throw new Error('REFRESH_TOKEN_MISSING');
      const { data, error } = await this.client.auth.refreshSession({ refresh_token: refreshToken } as any);
      if (error) throw error;
      if (!data?.session || !data.user) {
        throw new Error('REFRESH_SESSION_FAILED');
      }
      this.setCurrentUser(data.user);
      await this.persistSessionTokens(data.session, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('❌ Biometric refresh login failed:', error);
      throw error;
    }
  }

  private normalizeCallbackUrl(callbackUrl: string): URL {
    if (!callbackUrl.includes('#')) {
      return new URL(callbackUrl);
    }

    const [base, fragment] = callbackUrl.split('#', 2);
    if (!fragment) {
      return new URL(base);
    }

    const separator = base.includes('?') ? '&' : '?';
    return new URL(`${base}${separator}${fragment}`);
  }

  private async persistSessionTokens(
    session: Session | null,
    overrides?: { access_token?: string | null; refresh_token?: string | null }
  ): Promise<void> {
    try {
      if (!SecureStore?.isAvailableAsync) return;
      const available = await SecureStore.isAvailableAsync();
      if (!available) return;

      const accessToken = overrides?.access_token ?? session?.access_token ?? null;
      const refreshToken = overrides?.refresh_token ?? session?.refresh_token ?? null;

      if (!accessToken && !refreshToken) return;

      const secureOptions = Platform.OS === 'ios'
        ? { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
        : undefined;

      if (accessToken) {
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.accessToken, accessToken, secureOptions as any);
      }

      if (refreshToken) {
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.refreshToken, refreshToken, secureOptions as any);
      }
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Token secure storage failed:', error);
    }
  }

  private async clearPersistedTokens(): Promise<void> {
    try {
      if (!SecureStore?.isAvailableAsync) return;
      const available = await SecureStore.isAvailableAsync();
      if (!available) return;

      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.accessToken);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.refreshToken);
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Token cleanup failed:', error);
    }
  }

  private async upsertBasicProfile(user: User): Promise<GoogleOAuthCompleteResult['profile']> {
    const name = user.user_metadata?.name
      || user.user_metadata?.full_name
      || (user.email ? user.email.split('@')[0] : 'User');
    const avatarUrl = user.user_metadata?.avatar_url
      || user.user_metadata?.picture
      || null;
    const provider = (user.app_metadata as any)?.provider || 'google';

    let isNewUser = false;
    try {
      const { data } = await this.client
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      isNewUser = !data;
    } catch (error) {
      if (__DEV__) console.warn('⚠️ Kullanıcı varlığı kontrolü başarısız:', error);
    }

    try {
      const upsertRow = { ...buildUsersUpsertRow(user), name, provider } as any;
      await this.client.from('users').upsert(upsertRow, { onConflict: 'id' });
    } catch (error: any) {
      if (this.isUniqueViolation(error)) {
        throw this.transformOAuthError(error, 'Bu email adresi ile zaten bir hesap var. Lütfen email ile giriş yapın.');
      }
      if (__DEV__) console.warn('⚠️ User profile upsert failed:', error);
    }

    return {
      email: user.email || '',
      name,
      avatarUrl,
      provider,
      isNewUser,
    };
  }

  private isUniqueViolation(error: any): boolean {
    const code = error?.code || error?.status || error?.details;
    return code === '23505' || (typeof code === 'string' && code.includes('duplicate key'));
  }

  private transformOAuthError(error: any, fallbackMessage: string): Error {
    if (!error) {
      return new Error(fallbackMessage);
    }

    if (error?.code === 'OAUTH_STATE_MISMATCH' || error?.code === 'GOOGLE_OAUTH_CALLBACK_MISSING') {
      return error;
    }

    const code = error?.code || error?.status || 'OAUTH_ERROR';
    const rawMessage = error?.message || error?.error_description || error?.error;
    const normalized = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';

    let message = fallbackMessage;

    if (normalized.includes('access_denied') || normalized.includes('cancel')) {
      message = 'Google ile giriş iptal edildi.';
    } else if (normalized.includes('network')) {
      message = 'Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.';
    } else if (normalized.includes('configuration') || normalized.includes('project id')) {
      message = 'Google OAuth yapılandırması eksik veya hatalı.';
    } else if (normalized.includes('identity_already_exists') || normalized.includes('already registered')) {
      message = 'Bu email adresi ile zaten bir hesap var. Lütfen email ile giriş yapın.';
    } else if (normalized.includes('invalid_grant')) {
      message = 'Google OAuth isteği geçersiz veya süresi dolmuş.';
    } else if (rawMessage) {
      message = String(rawMessage);
    }

    const err = new Error(message);
    (err as any).code = code;
    (err as any).cause = error;
    return err;
  }
}
