import type { PostgrestError } from '@supabase/supabase-js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
  created_at: string;
  updated_at: string;
}

export interface OCDProfileRow {
  id: string;
  user_id: string;
  ocd_symptoms?: string[] | null;
  daily_goal?: number | null;
  ybocs_score?: number | null;
  ybocs_severity?: string | null;
  onboarding_completed?: boolean | null;
  onboarding_completed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateUserProfileDto {
  user_id: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
}

export interface UpsertOCDProfileDto {
  user_id: string;
  ocd_symptoms?: string[];
  daily_goal?: number;
  ybocs_score?: number;
  ybocs_severity?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
}

export type ProfileServiceError = PostgrestError | Error;
