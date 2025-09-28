import { AuthService } from '@/services/supabase/authService';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
}));

jest.mock('expo-constants', () => ({
  appOwnership: 'expo',
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `https://example.com/${path}`),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'exp://auth/callback'),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

type MockAuthClient = ReturnType<typeof createMockClient>['client'];

function createMockClient() {
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: { name: 'Test User', avatar_url: 'https://avatar.example.com/u.png' },
  } as any;

  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: mockUser,
  } as any;

  const usersTable = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    upsert: jest.fn().mockResolvedValue({ data: null }),
  };

  const client = {
    auth: {
      setSession: jest.fn().mockResolvedValue({ data: { session, user: mockUser }, error: null }),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { session, user: mockUser }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session } }),
    },
    from: jest.fn((table: string) => {
      if (table === 'users') return usersTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as any;

  return { client, session, mockUser, usersTable };
}

function createService() {
  const { client, session, mockUser, usersTable } = createMockClient();
  const setCurrentUser = jest.fn();
  const service = new AuthService(client as unknown as MockAuthClient, setCurrentUser);
  return { service, client, session, mockUser, usersTable, setCurrentUser };
}

describe('AuthService.completeGoogleOAuth', () => {
  const baseUrl = 'https://example.com/auth/callback';

  it('prefers custom app_state for validation even when Supabase adds its own state', async () => {
    const { service, client } = createService();
    const callbackUrl = `${baseUrl}#access_token=a&refresh_token=b&app_state=expected-state&state=supabase_auth_state`;

    await expect(service.completeGoogleOAuth(callbackUrl, 'expected-state')).resolves.toBeDefined();

    expect(client.auth.setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'b' });
  });

  it('ignores Supabase state when app_state is missing', async () => {
    const { service } = createService();
    const callbackUrl = `${baseUrl}#access_token=a&refresh_token=b&state=supabase_auth_state`;

    await expect(service.completeGoogleOAuth(callbackUrl, 'expected-state')).resolves.toBeDefined();
  });

  it('throws OAUTH_STATE_MISMATCH when app_state differs from expected', async () => {
    const { service } = createService();
    const callbackUrl = `${baseUrl}#access_token=a&refresh_token=b&app_state=unexpected`;

    await expect(service.completeGoogleOAuth(callbackUrl, 'expected-state')).rejects.toMatchObject({
      code: 'OAUTH_STATE_MISMATCH',
    });
  });
});

