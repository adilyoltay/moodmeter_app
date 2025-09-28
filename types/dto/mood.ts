import type { PostgrestError } from '@supabase/supabase-js';

export interface MoodEntryRow {
  id: string;
  user_id: string;
  mood_score: number;
  energy_level: number;
  anxiety_level: number;
  notes?: string | null;
  triggers?: string[] | null;
  activities?: string[] | null;
  content_hash?: string | null;
  created_at: string;
}

export interface CreateMoodEntryDto {
  user_id: string;
  mood_score: number;
  energy_level: number;
  anxiety_level: number;
  notes?: string;
  trigger?: string;
  triggers?: string[];
  activities?: string[];
  timestamp?: string;
  created_at?: string;
  source?: string;
  method?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMoodEntryDto {
  mood_score?: number;
  energy_level?: number;
  anxiety_level?: number;
  notes?: string;
  triggers?: string[];
  activities?: string[];
}

export type MoodServiceError = PostgrestError | Error;
