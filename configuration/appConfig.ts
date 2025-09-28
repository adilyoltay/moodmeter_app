import Constants from 'expo-constants';

export type Environment = 'development' | 'preview' | 'production';

export interface FeatureFlagsConfig {
  ai: {
    masterEnabled: boolean;
    chatEnabled: boolean;
    telemetryEnabled: boolean;
    promptLogging: boolean;
  };
  onboarding: {
    v2Enabled: boolean;
  };
  offline: {
    syncEnabled: boolean;
    maxQueueSize: number;
  };
  gamification: {
    dynamicRewards: boolean;
  };
}

export interface CacheConfig {
  insightsTtlHours: number;
  erpPlanTtlHours: number;
  voiceTtlHours: number;
  todayDigestTtlHours: number;
}

export interface AiConfig {
  provider: string;
  geminiModel: string;
  confidenceThresholds: {
    heuristicMood: number;
    llmLow: number;
    llmComplex: number;
  };
  textLengthThreshold: number;
  llmRateLimitPer10Min: number;
  llmDailyTokenSoftLimit: number;
}

export interface AppConfig {
  environment: Environment;
  featureFlags: FeatureFlagsConfig;
  cache: CacheConfig;
  ai: AiConfig;
  supabase: {
    url?: string;
    anonKey?: string;
  };
  telemetry: {
    sentryDsn?: string;
  };
  misc: {
    enableHealthkit: boolean;
    mockApiResponses: boolean;
  };
}

const defaultConfig: AppConfig = {
  environment: (__DEV__ ? 'development' : 'production'),
  featureFlags: {
    ai: {
      masterEnabled: false,
      chatEnabled: false,
      telemetryEnabled: false,
      promptLogging: false,
    },
    onboarding: {
      v2Enabled: true,
    },
    offline: {
      syncEnabled: true,
      maxQueueSize: 1000,
    },
    gamification: {
      dynamicRewards: false,
    },
  },
  cache: {
    insightsTtlHours: 24,
    erpPlanTtlHours: 12,
    voiceTtlHours: 1,
    todayDigestTtlHours: 12,
  },
  ai: {
    provider: 'gemini',
    geminiModel: 'gemini-1.5-flash',
    confidenceThresholds: {
      heuristicMood: 0.65,
      llmLow: 0.6,
      llmComplex: 0.8,
    },
    textLengthThreshold: 280,
    llmRateLimitPer10Min: 3,
    llmDailyTokenSoftLimit: 20000,
  },
  supabase: {
    url: undefined,
    anonKey: undefined,
  },
  telemetry: {
    sentryDsn: undefined,
  },
  misc: {
    enableHealthkit: true,
    mockApiResponses: false,
  },
};

function readExtra(key: string): string | undefined {
  return (Constants?.expoConfig?.extra?.[key] as string | undefined) ?? process.env[key];
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadAppConfig(): AppConfig {
  const environment = (__DEV__ ? 'development' : (Constants?.expoConfig?.releaseChannel?.includes('preview') ? 'preview' : 'production')) as Environment;

  const aiMaster = parseBool(readExtra('EXPO_PUBLIC_ENABLE_AI'), defaultConfig.featureFlags.ai.masterEnabled);
  const aiChat = parseBool(readExtra('EXPO_PUBLIC_ENABLE_AI_CHAT'), defaultConfig.featureFlags.ai.chatEnabled);
  const aiTelemetry = parseBool(readExtra('EXPO_PUBLIC_ENABLE_AI_TELEMETRY'), defaultConfig.featureFlags.ai.telemetryEnabled);
  const aiPromptLogging = parseBool(readExtra('EXPO_PUBLIC_AI_PROMPT_LOGGING'), defaultConfig.featureFlags.ai.promptLogging);

  const mockApi = parseBool(process.env.EXPO_PUBLIC_MOCK_API, defaultConfig.misc.mockApiResponses);

  return {
    environment,
    featureFlags: {
      ai: {
        masterEnabled: aiMaster,
        chatEnabled: aiChat,
        telemetryEnabled: aiTelemetry,
        promptLogging: aiPromptLogging,
      },
      onboarding: {
        v2Enabled: parseBool(process.env.EXPO_PUBLIC_ONBOARDING_V2, defaultConfig.featureFlags.onboarding.v2Enabled),
      },
      offline: {
        syncEnabled: parseBool(process.env.EXPO_PUBLIC_OFFLINE_SYNC_ENABLED, defaultConfig.featureFlags.offline.syncEnabled),
        maxQueueSize: parseNumber(process.env.EXPO_PUBLIC_OFFLINE_MAX_QUEUE_SIZE, defaultConfig.featureFlags.offline.maxQueueSize),
      },
      gamification: {
        dynamicRewards: parseBool(process.env.EXPO_PUBLIC_DYNAMIC_REWARDS, defaultConfig.featureFlags.gamification.dynamicRewards),
      },
    },
    cache: {
      insightsTtlHours: parseNumber(readExtra('EXPO_PUBLIC_CACHE_TTL_INSIGHTS_HOURS'), defaultConfig.cache.insightsTtlHours),
      erpPlanTtlHours: parseNumber(readExtra('EXPO_PUBLIC_CACHE_TTL_ERP_PLAN_HOURS'), defaultConfig.cache.erpPlanTtlHours),
      voiceTtlHours: parseNumber(readExtra('EXPO_PUBLIC_CACHE_TTL_VOICE_HOURS'), defaultConfig.cache.voiceTtlHours),
      todayDigestTtlHours: parseNumber(readExtra('EXPO_PUBLIC_CACHE_TTL_TODAY_DIGEST_HOURS'), defaultConfig.cache.todayDigestTtlHours),
    },
    ai: {
      provider: readExtra('EXPO_PUBLIC_AI_PROVIDER') ?? defaultConfig.ai.provider,
      geminiModel: readExtra('EXPO_PUBLIC_GEMINI_MODEL') ?? defaultConfig.ai.geminiModel,
      confidenceThresholds: {
        heuristicMood: parseNumber(readExtra('EXPO_PUBLIC_AI_CONFIDENCE_THRESHOLD_HEURISTIC_MOOD'), defaultConfig.ai.confidenceThresholds.heuristicMood),
        llmLow: parseNumber(readExtra('EXPO_PUBLIC_AI_CONFIDENCE_THRESHOLD_LLM_LOW'), defaultConfig.ai.confidenceThresholds.llmLow),
        llmComplex: parseNumber(readExtra('EXPO_PUBLIC_AI_CONFIDENCE_THRESHOLD_LLM_COMPLEX'), defaultConfig.ai.confidenceThresholds.llmComplex),
      },
      textLengthThreshold: parseNumber(readExtra('EXPO_PUBLIC_AI_TEXT_LENGTH_THRESHOLD'), defaultConfig.ai.textLengthThreshold),
      llmRateLimitPer10Min: parseNumber(readExtra('EXPO_PUBLIC_AI_LLM_RATE_LIMIT_PER_10MIN'), defaultConfig.ai.llmRateLimitPer10Min),
      llmDailyTokenSoftLimit: parseNumber(readExtra('EXPO_PUBLIC_AI_LLM_DAILY_TOKEN_SOFT_LIMIT'), defaultConfig.ai.llmDailyTokenSoftLimit),
    },
    supabase: {
      url: readExtra('EXPO_PUBLIC_SUPABASE_URL') ?? defaultConfig.supabase.url,
      anonKey: readExtra('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? defaultConfig.supabase.anonKey,
    },
    telemetry: {
      sentryDsn: readExtra('EXPO_PUBLIC_SENTRY_DSN') ?? defaultConfig.telemetry.sentryDsn,
    },
    misc: {
      enableHealthkit: parseBool(process.env.EXPO_PUBLIC_ENABLE_HEALTHKIT, defaultConfig.misc.enableHealthkit),
      mockApiResponses: mockApi,
    },
  };
}

let cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadAppConfig();
  }
  return cachedConfig;
}

export default getAppConfig;
