import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { biometricService } from '@/services/biometric';
import supabaseService from '@/services/supabase';
import * as LocalAuthentication from 'expo-local-authentication';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((key: string, value: string) => storage.set(key, value)),
      getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
      removeItem: jest.fn((key: string) => storage.delete(key)),
    },
    __storage: storage,
  };
});

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  default: {
    storeBiometricRefreshToken: jest.fn(),
    getBiometricRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    clearBiometricRefreshToken: jest.fn(),
    signInWithRefreshToken: jest.fn(),
  },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([]),
  getEnrolledLevelAsync: jest.fn().mockResolvedValue(0),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  SecurityLevel: { NONE: 0, SECRET: 2 },
  AuthenticationType: { FINGERPRINT: 1 },
}));

const mockedSupabaseService = supabaseService as jest.Mocked<typeof supabaseService>;

describe('biometricService', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
  });

  it('returns unavailable capability when hardware is missing', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(false);
    const capability = await biometricService.getCapability();
    expect(capability.available).toBe(false);
    expect(capability.reason).toBe('not_available');
  });

  it('registers account metadata when preference enabled', async () => {
    const storage = (AsyncStorage as unknown as { __storage: Map<string, string> }).__storage;
    storage.clear();

    await biometricService.setPreference('user-1', true, 'user@example.com');
    const accountsRaw = await AsyncStorage.getItem('biometric_known_accounts');
    expect(accountsRaw).not.toBeNull();
    const accounts = JSON.parse(accountsRaw!);
    expect(accounts).toEqual([
      expect.objectContaining({ userId: 'user-1', email: 'user@example.com' }),
    ]);
  });

  it('clears metadata when preference disabled', async () => {
    const storage = (AsyncStorage as unknown as { __storage: Map<string, string> }).__storage;
    storage.clear();

    await biometricService.setPreference('user-2', true, 'sample@example.com');
    await biometricService.setPreference('user-2', false);

    const accountsRaw = await AsyncStorage.getItem('biometric_known_accounts');
    expect(accountsRaw).toBe(JSON.stringify([]));
  });

  it('delegates refresh-token persistence to supabase service', async () => {
    await biometricService.storeRefreshToken('user-3', 'token');
    expect(mockedSupabaseService.storeBiometricRefreshToken).toHaveBeenCalledWith('user-3', 'token');

    await biometricService.clearStoredRefreshToken('user-3');
    expect(mockedSupabaseService.clearBiometricRefreshToken).toHaveBeenCalledWith('user-3');

    const token = await biometricService.getStoredRefreshToken('user-3');
    expect(mockedSupabaseService.getBiometricRefreshToken).toHaveBeenCalledWith('user-3');
    expect(token).toBe('refresh-token');
  });

  it('ensures permission on iOS devices', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    (LocalAuthentication.getEnrolledLevelAsync as jest.Mock).mockResolvedValueOnce(0);
    (LocalAuthentication.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

    const result = await biometricService.ensurePermission();
    expect(result.granted).toBe(false);
  });
});
