let ExpoConstants = null;
try {
  const resolved = require('expo-constants');
  ExpoConstants = resolved?.default ?? resolved;
} catch {
  ExpoConstants = null;
}

const isDevelopmentRuntime = (() => {
  const globalDev = globalThis && typeof globalThis.__DEV__ === 'boolean' ? globalThis.__DEV__ : undefined;
  if (typeof globalDev === 'boolean') {
    return globalDev;
  }
  return process.env.NODE_ENV !== 'production';
})();

function resolveEnvironment() {
  if (isDevelopmentRuntime) {
    return 'development';
  }

  const releaseChannel = (() => {
    const fromExpo = typeof ExpoConstants?.expoConfig?.releaseChannel === 'string'
      ? ExpoConstants.expoConfig.releaseChannel
      : undefined;
    if (fromExpo) return fromExpo;
    return process.env.EXPO_RELEASE_CHANNEL ?? process.env.EAS_BUILD_PROFILE ?? '';
  })();

  if (releaseChannel?.includes?.('preview')) {
    return 'preview';
  }
  return 'production';
}

const defaultFeatures = {
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
};

const defaultConfig = {
  environment: resolveEnvironment(),
  features: defaultFeatures,
  featureFlags: defaultFeatures,
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

function readExtra(key) {
  const extra = (ExpoConstants?.expoConfig?.extra ?? {});
  const value = extra[key];
  if (typeof value === 'string') {
    return value;
  }
  if (value != null) {
    return String(value);
  }
  return process.env[key];
}

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mergeWithDefaults(partial = {}) {
  const featureSource = partial.featureFlags || partial.features || {};

  const features = {
    ai: {
      masterEnabled: featureSource.ai?.masterEnabled ?? defaultConfig.features.ai.masterEnabled,
      chatEnabled: featureSource.ai?.chatEnabled ?? defaultConfig.features.ai.chatEnabled,
      telemetryEnabled: featureSource.ai?.telemetryEnabled ?? defaultConfig.features.ai.telemetryEnabled,
      promptLogging: featureSource.ai?.promptLogging ?? defaultConfig.features.ai.promptLogging,
    },
    onboarding: {
      v2Enabled: featureSource.onboarding?.v2Enabled ?? defaultConfig.features.onboarding.v2Enabled,
    },
    offline: {
      syncEnabled: featureSource.offline?.syncEnabled ?? defaultConfig.features.offline.syncEnabled,
      maxQueueSize: featureSource.offline?.maxQueueSize ?? defaultConfig.features.offline.maxQueueSize,
    },
    gamification: {
      dynamicRewards: featureSource.gamification?.dynamicRewards ?? defaultConfig.features.gamification.dynamicRewards,
    },
  };

  return {
    environment: partial.environment ?? resolveEnvironment(),
    features,
    featureFlags: features,
    cache: {
      insightsTtlHours: partial.cache?.insightsTtlHours ?? defaultConfig.cache.insightsTtlHours,
      erpPlanTtlHours: partial.cache?.erpPlanTtlHours ?? defaultConfig.cache.erpPlanTtlHours,
      voiceTtlHours: partial.cache?.voiceTtlHours ?? defaultConfig.cache.voiceTtlHours,
      todayDigestTtlHours: partial.cache?.todayDigestTtlHours ?? defaultConfig.cache.todayDigestTtlHours,
    },
    ai: {
      provider: partial.ai?.provider ?? defaultConfig.ai.provider,
      geminiModel: partial.ai?.geminiModel ?? defaultConfig.ai.geminiModel,
      confidenceThresholds: {
        heuristicMood: partial.ai?.confidenceThresholds?.heuristicMood ?? defaultConfig.ai.confidenceThresholds.heuristicMood,
        llmLow: partial.ai?.confidenceThresholds?.llmLow ?? defaultConfig.ai.confidenceThresholds.llmLow,
        llmComplex: partial.ai?.confidenceThresholds?.llmComplex ?? defaultConfig.ai.confidenceThresholds.llmComplex,
      },
      textLengthThreshold: partial.ai?.textLengthThreshold ?? defaultConfig.ai.textLengthThreshold,
      llmRateLimitPer10Min: partial.ai?.llmRateLimitPer10Min ?? defaultConfig.ai.llmRateLimitPer10Min,
      llmDailyTokenSoftLimit: partial.ai?.llmDailyTokenSoftLimit ?? defaultConfig.ai.llmDailyTokenSoftLimit,
    },
    supabase: {
      url: partial.supabase?.url ?? defaultConfig.supabase.url,
      anonKey: partial.supabase?.anonKey ?? defaultConfig.supabase.anonKey,
    },
    telemetry: {
      sentryDsn: partial.telemetry?.sentryDsn ?? defaultConfig.telemetry.sentryDsn,
    },
    misc: {
      enableHealthkit: partial.misc?.enableHealthkit ?? defaultConfig.misc.enableHealthkit,
      mockApiResponses: partial.misc?.mockApiResponses ?? defaultConfig.misc.mockApiResponses,
    },
  };
}

function loadAppConfig() {
  const extra = (ExpoConstants?.expoConfig?.extra ?? {});
  const preloaded = extra.appConfig;
  if (preloaded && typeof preloaded === 'object') {
    return mergeWithDefaults(preloaded);
  }

  const aiMaster = parseBool(readExtra('EXPO_PUBLIC_ENABLE_AI'), defaultConfig.features.ai.masterEnabled);
  const aiChat = parseBool(readExtra('EXPO_PUBLIC_ENABLE_AI_CHAT'), defaultConfig.features.ai.chatEnabled);
  const aiTelemetry = parseBool(readExtra('EXPO_PUBLIC_ENABLE_AI_TELEMETRY'), defaultConfig.features.ai.telemetryEnabled);
  const aiPromptLogging = parseBool(readExtra('EXPO_PUBLIC_AI_PROMPT_LOGGING'), defaultConfig.features.ai.promptLogging);

  const featureOverrides = {
    ai: {
      masterEnabled: aiMaster,
      chatEnabled: aiChat,
      telemetryEnabled: aiTelemetry,
      promptLogging: aiPromptLogging,
    },
    onboarding: {
      v2Enabled: parseBool(readExtra('EXPO_PUBLIC_ONBOARDING_V2'), defaultConfig.features.onboarding.v2Enabled),
    },
    offline: {
      syncEnabled: parseBool(readExtra('EXPO_PUBLIC_OFFLINE_SYNC_ENABLED'), defaultConfig.features.offline.syncEnabled),
      maxQueueSize: parseNumber(readExtra('EXPO_PUBLIC_OFFLINE_MAX_QUEUE_SIZE'), defaultConfig.features.offline.maxQueueSize),
    },
    gamification: {
      dynamicRewards: parseBool(readExtra('EXPO_PUBLIC_DYNAMIC_REWARDS'), defaultConfig.features.gamification.dynamicRewards),
    },
  };

  const partial = {
    environment: resolveEnvironment(),
    features: featureOverrides,
    featureFlags: featureOverrides,
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
      enableHealthkit: parseBool(readExtra('EXPO_PUBLIC_ENABLE_HEALTHKIT'), defaultConfig.misc.enableHealthkit),
      mockApiResponses: parseBool(readExtra('EXPO_PUBLIC_MOCK_API'), defaultConfig.misc.mockApiResponses),
    },
  };

  return mergeWithDefaults(partial);
}

let cachedConfig = null;

function getAppConfig() {
  if (!cachedConfig) {
    cachedConfig = loadAppConfig();
  }
  return cachedConfig;
}

module.exports = {
  loadAppConfig,
  getAppConfig,
  default: getAppConfig,
  resolveEnvironment,
};
