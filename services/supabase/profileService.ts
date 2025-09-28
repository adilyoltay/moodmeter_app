import type { SupabaseClient } from '@supabase/supabase-js';
import type { OCDProfile, UserProfile } from '@/types/supabase';
import { TableClient } from '@/services/supabase/tableClient';
import { err, ok, type Result } from '@/types/result';
import type {
  CreateUserProfileDto,
  ProfileServiceError,
  UpsertOCDProfileDto,
} from '@/types/dto/profile';

/**
 * ProfileService: user profile CRUD and helpers.
 * Scaffold only; logic remains in facade until delegated.
 */
export class ProfileService {
  constructor(private client: SupabaseClient) {}

  async getUserProfile(userId: string): Promise<Result<OCDProfile | null, ProfileServiceError>> {
    const table = new TableClient<OCDProfile>(this.client, 'user_profiles');
    const res: any = await table
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (res.error) return err(res.error);
    return ok((res.data || null) as OCDProfile | null);
  }

  async createUserProfile({ user_id, email, name, provider }: CreateUserProfileDto): Promise<Result<UserProfile, ProfileServiceError>> {
    const users = new TableClient<UserProfile>(this.client, 'users');
    const { data, error } = await users
      .insert({ id: user_id, email, name, provider, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .select()
      .single();
    if (error) return err(error);
    return ok(data as UserProfile);
  }

  async saveUserProfile(profile: UpsertOCDProfileDto): Promise<Result<OCDProfile, ProfileServiceError>> {
    const table = new TableClient<OCDProfile>(this.client, 'user_profiles');
    const res: any = await table
      .upsert({ ...profile, updated_at: new Date().toISOString() } as any)
      .select()
      .single();
    if (res.error) return err(res.error);
    return ok(res.data as OCDProfile);
  }
}
