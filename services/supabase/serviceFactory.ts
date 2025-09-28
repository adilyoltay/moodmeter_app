import type { SupabaseClient, User } from '@supabase/supabase-js';

import { AuthService } from '@/services/supabase/authService';
import { ProfileService } from '@/services/supabase/profileService';
import { MoodService } from '@/services/supabase/moodService';
import { VoiceService } from '@/services/supabase/voiceService';
import { ThoughtService } from '@/services/supabase/thoughtService';
import { CompulsionService } from '@/services/supabase/compulsionService';
import { BreathService } from '@/services/supabase/breathService';
import { AIService } from '@/services/supabase/aiService';
import { AIPredictionService } from '@/services/supabase/aiPredictionService';

export const SUPABASE_SERVICE_TOKENS = [
  'auth',
  'profile',
  'mood',
  'voice',
  'thought',
  'compulsion',
  'breath',
  'ai',
  'aiPrediction',
] as const;

export type SupabaseServiceToken = (typeof SUPABASE_SERVICE_TOKENS)[number];

export interface SupabaseServiceMap {
  auth: AuthService;
  profile: ProfileService;
  mood: MoodService;
  voice: VoiceService;
  thought: ThoughtService;
  compulsion: CompulsionService;
  breath: BreathService;
  ai: AIService;
  aiPrediction: AIPredictionService;
}

export type SupabaseServiceSubset<TTokens extends readonly SupabaseServiceToken[]> = Pick<
  SupabaseServiceMap,
  TTokens[number]
>;

export interface SupabaseServiceFactoryDependencies {
  client: SupabaseClient;
  setCurrentUser: (user: User | null) => void;
}

type ServiceBuilder<TToken extends SupabaseServiceToken> = (
  deps: SupabaseServiceFactoryDependencies,
) => SupabaseServiceMap[TToken];

type SupabaseServiceRegistry = {
  [Token in SupabaseServiceToken]: ServiceBuilder<Token>;
};

const registry: SupabaseServiceRegistry = {
  auth: (deps) => new AuthService(deps.client, deps.setCurrentUser),
  profile: ({ client }) => new ProfileService(client),
  mood: ({ client }) => new MoodService(client),
  voice: ({ client }) => new VoiceService(client),
  thought: ({ client }) => new ThoughtService(client),
  compulsion: ({ client }) => new CompulsionService(client),
  breath: ({ client }) => new BreathService(client),
  ai: ({ client }) => new AIService(client),
  aiPrediction: ({ client }) => new AIPredictionService(client),
};

export class SupabaseServiceFactory {
  private cache: Partial<SupabaseServiceMap> = {};

  constructor(private readonly deps: SupabaseServiceFactoryDependencies) {}

  get<Token extends SupabaseServiceToken>(token: Token): SupabaseServiceMap[Token] {
    if (!this.cache[token]) {
      const build = registry[token];
      this.cache[token] = build(this.deps);
    }
    return this.cache[token] as SupabaseServiceMap[Token];
  }

  create<TTokens extends readonly SupabaseServiceToken[]>(
    tokens: TTokens,
  ): SupabaseServiceSubset<TTokens> {
    const subset: Record<string, unknown> = {};

    tokens.forEach((token) => {
      Object.defineProperty(subset, token, {
        enumerable: true,
        configurable: false,
        get: () => this.get(token),
      });
    });

    return subset as SupabaseServiceSubset<TTokens>;
  }
}

export const createSupabaseServiceFactory = (
  deps: SupabaseServiceFactoryDependencies,
): SupabaseServiceFactory => new SupabaseServiceFactory(deps);

export function getSupabaseService<Token extends SupabaseServiceToken>(
  factory: SupabaseServiceFactory,
  token: Token,
): SupabaseServiceMap[Token] {
  return factory.get(token);
}

export type { SupabaseServiceRegistry };
