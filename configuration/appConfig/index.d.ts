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
  features: FeatureFlagsConfig;
  /**
   * @deprecated Use `features` instead.
   */
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

export function resolveEnvironment(): Environment;
export function loadAppConfig(): AppConfig;
export function getAppConfig(): AppConfig;

export default getAppConfig;
