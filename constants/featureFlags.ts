/**
 * 🛡️ MoodMeter Feature Flag System - FAZ 0: Güvenlik ve Stabilite Hazırlığı
 * 
 * Bu sistem "Kapsamlı Yol Haritası" belgesindeki Görev 0.0.1 gereksinimlerine uygun olarak
 * tasarlanmıştır. Tüm AI özellikleri tek bir master switch ile kontrol edilir.
 * 
 * KRİTİK: Bu dosyadaki değişiklikler prodüksiyonu etkileyebilir!
 */

import { getAppConfig } from '../configuration/appConfig';

const appConfig = getAppConfig();
const { features, misc, environment, ai } = appConfig;
const aiFeatures = features.ai;

const AI_MASTER_ENABLED = aiFeatures.masterEnabled;
const AI_CHAT_ENABLED = aiFeatures.chatEnabled;
const AI_PROMPT_LOGGING_ENV = aiFeatures.promptLogging;

if (__DEV__) {
  console.log('🔧 Feature Flags Debug:', {
    environment,
    aiFeatures,
    telemetryEnabled: aiFeatures.telemetryEnabled,
    mockApiResponses: misc.mockApiResponses,
  });
}

// Feature flag değerlerini runtime'da değiştirmek için mutable obje
const featureFlagState: Record<string, boolean | number> = {
  // 🎯 MASTER AI SWITCH
  AI_ENABLED: AI_MASTER_ENABLED,
  // 🧩 AI RUNTIME MODULES: Onboarding’dan bağımsız ek analiz/telemetry modülleri
  AI_RUNTIME_MODULES: AI_MASTER_ENABLED,
  
  // 🤖 Tüm AI Features - Master switch'e bağlı
  AI_CHAT: AI_CHAT_ENABLED,
  AI_ONBOARDING: AI_MASTER_ENABLED,
  AI_INSIGHTS: AI_MASTER_ENABLED,
  AI_VOICE: AI_MASTER_ENABLED,
  // AI_CBT_ENGINE removed
  AI_EXTERNAL_API: AI_MASTER_ENABLED,
  AI_THERAPEUTIC_PROMPTS: AI_MASTER_ENABLED,
  AI_REAL_RESPONSES: AI_MASTER_ENABLED,
  AI_INSIGHTS_ENGINE_V2: AI_MASTER_ENABLED,
  AI_PATTERN_RECOGNITION_V2: AI_MASTER_ENABLED,
  AI_SMART_NOTIFICATIONS: AI_MASTER_ENABLED,
  // Removed deprecated flags
  AI_ADAPTIVE_INTERVENTIONS: AI_MASTER_ENABLED,
  AI_CONTEXT_INTELLIGENCE: AI_MASTER_ENABLED,
  AI_JITAI_SYSTEM: AI_MASTER_ENABLED,
  AI_ADVANCED_PERSONALIZATION: AI_MASTER_ENABLED,
  AI_MODEL_OPTIMIZATION: AI_MASTER_ENABLED,
  AI_PERFORMANCE_MONITORING: AI_MASTER_ENABLED,
  AI_ADVANCED_ANALYTICS: AI_MASTER_ENABLED,
  AI_DASHBOARD: AI_MASTER_ENABLED,
  // 🚀 Onboarding v2 (enhanced with AI personalization)
  ONBOARDING_V1: false, // DEPRECATED - switched to V2
  ONBOARDING_V2: true,  // NEW - Enhanced onboarding with progressive AI insights
  // Onboarding Flow varsayılan olarak aktif; V2 ile AI destekli kişiselleştirme aktif
  AI_YBOCS_ANALYSIS: AI_MASTER_ENABLED,
  AI_USER_PROFILING: AI_MASTER_ENABLED,
  AI_TREATMENT_PLANNING: AI_MASTER_ENABLED,
  AI_RISK_ASSESSMENT: AI_MASTER_ENABLED,
  AI_ONBOARDING_UI: AI_MASTER_ENABLED,
  AI_ONBOARDING_CONTEXT_INTEGRATION: AI_MASTER_ENABLED,
  AI_ONBOARDING_INTERVENTIONS_INTEGRATION: AI_MASTER_ENABLED,
  AI_ART_THERAPY: false, // TEMPORARILY DISABLED - geçici olarak kapatıldı

  AI_PREDICTIVE_INTERVENTION: AI_MASTER_ENABLED,
  // KALDIRILDI: AI_CRISIS_DETECTION
  
    // 🚀 Legacy AI flags (deprecated/cleanup) - ALL DISABLED Phase 7
  AI_CORE_ANALYSIS: false, // ❌ REMOVED - CoreAnalysisService deleted
  AI_BATCH_JOBS: false, // ❌ DISABLED - AI batch processing 
  AI_LLM_GATING: false, // ❌ DISABLED - LLM gating logic
  AI_PROGRESSIVE: false, // ❌ DISABLED - Progressive UI updates
  AI_ONBOARDING_REFINE: false, // ❌ DISABLED - Onboarding skeleton->refine
  AI_THERAPY_STAIRCASE: false, // ❌ DISABLED - Deterministic therapy difficulty
  
  // 🎯 Unified AI Pipeline flags (NEW - Jan 2025) - ALL DISABLED Phase 7
  AI_UNIFIED_PIPELINE: false, // ❌ DISABLED - Master toggle for unified pipeline
  AI_UNIFIED_PIPELINE_PERCENTAGE: 0, // ❌ DISABLED - 0% rollout
  AI_UNIFIED_VOICE: false, // ❌ DISABLED - Voice module in pipeline
  AI_UNIFIED_PATTERNS: false, // ❌ DISABLED - Pattern recognition in pipeline
  AI_UNIFIED_INSIGHTS: false, // ❌ DISABLED - Insights generation in pipeline
  // AI_UNIFIED_CBT removed
  
  // 🌬️ Breathwork Suggestions (NEW - Week 2) - DISABLED Phase 7
  AI_BREATHWORK_SUGGESTIONS: false, // ❌ DISABLED - AI-powered breathwork recommendations
  
  // 🎮 Dynamic Gamification (NEW - Week 2) - DISABLED Phase 7
  AI_DYNAMIC_GAMIFICATION: false, // ❌ DISABLED - Context-based dynamic points calculation
  AI_DYNAMIC_MISSIONS: false, // ❌ DISABLED - AI-generated daily missions
  
  // 🗂️ Smart Routing & Prefilling (NEW - Week 2) - DISABLED Phase 7
  AI_SMART_ROUTING: false, // ❌ DISABLED - Intelligent screen navigation with context
  AI_FORM_PREFILLING: false, // ❌ DISABLED - Automatic form prefilling from analysis
  
  // 🎯 Multi-Intent Voice Analysis (NEW - Jan 2025)
  MULTI_INTENT_VOICE: AI_MASTER_ENABLED, // Çoklu modül desteği
  
  // 🎯 OCD AI Services (NEW - Critical for OCD functionality)
  // OCD services removed
  AI_OCD_PATTERN_ANALYSIS: AI_MASTER_ENABLED, // OCD pattern recognition
  
  // 🔀 LLM Flags (aliases → AI master)
  LLM_ROUTER: AI_MASTER_ENABLED,
  LLM_REFRAME: AI_MASTER_ENABLED,
  LLM_COACH_ADAPT: AI_MASTER_ENABLED,
  LLM_PDF_SUMMARY: AI_MASTER_ENABLED,
  
  // ⏰ JITAI granular flags
  JITAI_TIME: AI_MASTER_ENABLED,
  JITAI_GEOFENCE: false,
  
  // 📝 Prompt Logging (sanitized) – geçici debugging toggle
  AI_PROMPT_LOGGING: !!AI_PROMPT_LOGGING_ENV,
  
  // 🔧 Development Features
  DEBUG_MODE: __DEV__,
  MOCK_API_RESPONSES: misc.mockApiResponses,
  
  // 📊 Telemetry Features
  AI_TELEMETRY: AI_MASTER_ENABLED && aiFeatures.telemetryEnabled,
  PERFORMANCE_MONITORING: true,
  ERROR_REPORTING: true,
  
  // 🚨 Safety Features (Always Enabled)
  SAFETY_CHECKS: true,
  CONTENT_FILTERING: true,
  RATE_LIMITING: true,
  
  // 🛡️ (Removed) ERP Module Feature Flag
  // ERP_MODULE_ENABLED: false, // Removed ERP module
};

// AI Master Switch durumunu telemetriye gönder
if (typeof window !== 'undefined') {
  setTimeout(() => {
    import('@/services/telemetry/noopTelemetry')
      .then(({ trackAIInteraction, AIEventType }) => {
        trackAIInteraction(AIEventType.SYSTEM_STATUS, {
          aiMasterEnabled: AI_MASTER_ENABLED,
          environment,
          enabledFeatureCount: Object.values(featureFlagState).filter(Boolean).length,
        });
      })
      .catch(() => {
        // Telemetry yüklenemezse sessizce devam et
      });
  }, 1000);
}

// Feature flag logging için
const featureUsageLog: Record<string, number> = {};

export const FEATURE_FLAGS = {
  ...featureFlagState,
  
  /**
   * 🔍 Feature durumunu kontrol eder
   * Kullanım loglaması ve runtime kontrolleri içerir
   */
  isEnabled: (feature: keyof typeof featureFlagState): boolean => {
    // Kullanım sayacı
    featureUsageLog[feature] = (featureUsageLog[feature] || 0) + 1;
    
    // Geliştirme modunda log (throttled)
    if (__DEV__) {
      // 🔇 THROTTLE: Only log first 3 calls per feature to reduce console spam
      const logKey = `__flag_logged_${feature}`;
      const logCount = (global as any)[logKey] || 0;
      if (logCount < 3) {
        console.log(`🏳️ Feature Flag Check: ${feature} = ${featureFlagState[feature]}`);
        (global as any)[logKey] = logCount + 1;
      }
    }
    
    // Master AI switch kontrolü
    if (feature.startsWith('AI_') && feature !== 'AI_ENABLED' && !featureFlagState.AI_ENABLED) {
      return false;
    }
    
    // Additional runtime checks
    if (feature.startsWith('AI_') && !featureFlagState.SAFETY_CHECKS) {
      console.warn('⚠️ AI features disabled: Safety checks are off');
      return false;
    }
    
    // Remote kill switch capability (gelecekte API'den kontrol edilebilir)
    if (typeof (global as any).__MOODMETER_KILL_SWITCH !== 'undefined') {
      console.warn('🚨 Emergency kill switch activated');
      return false;
    }
    
    // Handle number values (like percentages) - treat as enabled if > 0
    const value = featureFlagState[feature];
    if (typeof value === 'number') {
      return value > 0;
    }
    
    return !!value;
  },
  
  /**
   * 🚨 Acil durum fonksiyonu - Tüm AI özelliklerini kapatır
   */
  disableAll: async (): Promise<void> => {
    console.warn('🚨 EMERGENCY: Disabling all AI features');
    
    Object.keys(featureFlagState).forEach(key => {
      if (key.startsWith('AI_')) {
        featureFlagState[key] = false;
      }
    });
    
    // Global kill switch aktive et
    (global as any).__MOODMETER_KILL_SWITCH = true;
    
    // Telemetry + persist
    try {
      const { trackAIInteraction, AIEventType } = await import('@/services/telemetry/noopTelemetry');
      await trackAIInteraction(AIEventType.EMERGENCY_SHUTDOWN, {
        timestamp: new Date().toISOString(),
        reason: 'feature_flags_disabled',
        previousFlags: { ...featureFlagState }
      });
    } catch {}
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('emergency_shutdown_timestamp', new Date().toISOString());
    } catch {}
  },
  
  /**
   * 🔧 Runtime'da feature flag değiştirme (sadece development)
   * Master AI switch değiştirildiğinde tüm AI özellikleri etkilenir
   */
  setFlag: (feature: keyof typeof featureFlagState, value: boolean | number): void => {
    if (!__DEV__) {
      console.warn('⚠️ Feature flag changes only allowed in development');
      return;
    }
    
    console.log(`🔧 Changing feature flag: ${feature} = ${value}`);
    
    // Master AI switch değiştiriliyorsa tüm AI özelliklerini güncelle
    if (feature === 'AI_ENABLED') {
      Object.keys(featureFlagState).forEach(key => {
        if (key.startsWith('AI_')) {
          featureFlagState[key] = value;
        }
      });
    } else {
      featureFlagState[feature] = value;
    }
  },
  
  /**
   * 📊 Feature kullanım istatistikleri
   */
  getUsageStats: (): Record<string, number> => {
    return { ...featureUsageLog };
  },
  
  /**
   * 🔄 Tüm AI özelliklerini yeniden aktifleştir (development only)
   */
  reactivateAll: (): void => {
    if (!__DEV__) {
      console.warn('⚠️ Feature reactivation only allowed in development');
      return;
    }
    
    console.log('🔄 Reactivating all AI features');
    delete (global as any).__MOODMETER_KILL_SWITCH;
    
    // Master switch'i aktifleştir
    const masterEnabled = getAppConfig().features.ai.masterEnabled;
    Object.keys(featureFlagState).forEach(key => {
      if (key.startsWith('AI_')) {
        featureFlagState[key] = masterEnabled;
      }
    });
  }
} as const;

// AI Configuration - Yol Haritası Uyumlu
export const AI_CONFIG = {
  DEFAULT_PROVIDER: ai.provider,
  MODEL: ai.geminiModel,
  CONFIDENCE_THRESHOLDS: ai.confidenceThresholds,
  TEXT_LENGTH_THRESHOLD: ai.textLengthThreshold,
  LLM_RATE_LIMIT_PER_10MIN: ai.llmRateLimitPer10Min,
  LLM_DAILY_TOKEN_SOFT_LIMIT: ai.llmDailyTokenSoftLimit,
  TELEMETRY_ENABLED: aiFeatures.telemetryEnabled,
} as const;
