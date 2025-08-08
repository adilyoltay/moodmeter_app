/**
 * 🤖 AI System Types - FAZ 1: Core Type Definitions
 * 
 * Bu dosya tüm AI sisteminin temel TypeScript interface'lerini içerir.
 * FAZ 0 güvenlik prensiplerine uygun olarak tasarlanmıştır.
 * 
 * ⚠️ CRITICAL: Bu dosya features/ai/types dizininde yer alır
 * ⚠️ Tüm import'lar @/ alias kullanmalı, relative path'ler yasak
 */

import { FEATURE_FLAGS } from '@/constants/featureFlags';

// =============================================================================
// 🎯 CORE AI MESSAGE TYPES
// =============================================================================

/**
 * Temel AI mesaj yapısı - Tüm AI etkileşimlerinin temeli
 */
export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: AIMessageMetadata;
}

/**
 * AI mesaj metadata'sı - Terapötik context ve güvenlik için
 */
export interface AIMessageMetadata {
  sessionId: string;
  contextType: 'onboarding' | 'chat' | 'erp' | 'crisis' | 'insights' | 'art_therapy';
  
  // Therapeutic context
  therapeuticIntent?: string[];
  cbtTechnique?: CBTTechnique;
  emotionalTone?: EmotionalTone;
  
  // Safety & quality
  sentiment?: SentimentScore;
  confidence?: number; // 0-1
  safetyScore?: number; // 0-1
  crisisRisk?: CrisisRiskLevel;
  
  // Performance
  responseTime?: number;
  modelUsed?: string;
  tokenCount?: number;
  
  // Privacy
  containsPII?: boolean;
  anonymized?: boolean;
}

// =============================================================================
// 🧠 CBT & THERAPEUTIC TYPES
// =============================================================================

/**
 * CBT teknikleri enum'u
 */
export enum CBTTechnique {
  SOCRATIC_QUESTIONING = 'socratic_questioning',
  THOUGHT_CHALLENGING = 'thought_challenging',
  BEHAVIORAL_EXPERIMENT = 'behavioral_experiment',
  COGNITIVE_RESTRUCTURING = 'cognitive_restructuring',
  MINDFULNESS = 'mindfulness',
  EXPOSURE_THERAPY = 'exposure_therapy',
  ACTIVITY_SCHEDULING = 'activity_scheduling',
  PROBLEM_SOLVING = 'problem_solving'
}

/**
 * Duygusal ton kategorileri
 */
export enum EmotionalTone {
  SUPPORTIVE = 'supportive',
  ENCOURAGING = 'encouraging',
  EMPATHETIC = 'empathetic',
  EDUCATIONAL = 'educational',
  CHALLENGING = 'challenging',
  CALMING = 'calming',
  MOTIVATING = 'motivating'
}

/**
 * Sentiment analizi sonucu
 */
export interface SentimentScore {
  polarity: 'positive' | 'neutral' | 'negative';
  intensity: number; // 0-1
  emotions: EmotionScore[];
}

/**
 * Emotion detection sonucu
 */
export interface EmotionScore {
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'anxiety' | 'hope' | 'frustration';
  confidence: number; // 0-1
}

// =============================================================================
// 🚨 CRISIS & SAFETY TYPES
// =============================================================================

/**
 * Kriz risk seviyeleri
 */
export enum CrisisRiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Crisis detection sonucu
 */
export interface CrisisDetectionResult {
  riskLevel: CrisisRiskLevel;
  confidence: number;
  triggers: string[];
  recommendedAction: CrisisAction;
  humanReviewRequired: boolean;
  timestamp: Date;
}

/**
 * Kriz müdahale aksiyonları
 */
export enum CrisisAction {
  CONTINUE_NORMAL = 'continue_normal',
  PROVIDE_RESOURCES = 'provide_resources',
  ESCALATE_TO_HUMAN = 'escalate_to_human',
  EMERGENCY_CONTACTS = 'emergency_contacts',
  IMMEDIATE_INTERVENTION = 'immediate_intervention'
}

// =============================================================================
// ⚙️ AI CONFIGURATION TYPES
// =============================================================================

/**
 * AI servis konfigürasyonu
 */
export interface AIConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackBehavior: FallbackBehavior;
  featureFlag: keyof typeof FEATURE_FLAGS;
  
  // Safety settings
  safetyThreshold: number; // 0-1
  crisisDetectionEnabled: boolean;
  contentFilteringEnabled: boolean;
  
  // Performance settings
  timeoutMs: number;
  retryAttempts: number;
  cachingEnabled: boolean;
}

/**
 * Desteklenen AI sağlayıcıları
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  LOCAL = 'local',
  MOCK = 'mock' // Development/testing için
}

/**
 * Fallback davranışları
 */
export enum FallbackBehavior {
  GENERIC_RESPONSE = 'generic',
  SILENCE = 'silence',
  REDIRECT_TO_HUMAN = 'redirect',
  OFFLINE_RESOURCES = 'offline_resources'
}

// =============================================================================
// 💬 CONVERSATION CONTEXT TYPES
// =============================================================================

/**
 * Conversation context - Tüm conversation state'i
 */
export interface ConversationContext {
  userId: string;
  sessionId: string;
  conversationHistory: AIMessage[];
  userProfile: UserTherapeuticProfile;
  currentState: ConversationState;
  
  // Context tracking
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  topicHistory: string[];
  
  // Therapeutic progress
  therapeuticGoals: string[];
  sessionObjectives: string[];
  progressNotes: ProgressNote[];
}

/**
 * Kullanıcı terapötik profili
 */
export interface UserTherapeuticProfile {
  // Basic info
  preferredLanguage: string;
  culturalContext?: string;
  
  // Clinical context
  symptomSeverity: number; // 0-10
  diagnosticInfo?: DiagnosticInfo;
  treatmentHistory?: TreatmentHistory;
  
  // Personalization
  communicationStyle: CommunicationStyle;
  triggerWords: string[];
  avoidanceTopics: string[];
  preferredCBTTechniques: CBTTechnique[];
  therapeuticGoals: string[];
  
  // Safety
  crisisContactInfo?: CrisisContact[];
  safetyPlan?: SafetyPlan;
  riskFactors: string[];
}

/**
 * Conversation durumları
 */
export enum ConversationState {
  STABLE = 'stable',
  ELEVATED = 'elevated', // Stress/anxiety elevated
  CRISIS = 'crisis', // Crisis situation
  THERAPEUTIC = 'therapeutic', // Active therapy session
  EDUCATIONAL = 'educational', // Learning mode
  CELEBRATION = 'celebration' // Progress celebration
}

/**
 * İletişim stili tercihleri
 */
export interface CommunicationStyle {
  formality: 'casual' | 'professional' | 'warm';
  directness: 'direct' | 'gentle' | 'indirect';
  supportStyle: 'encouraging' | 'challenging' | 'nurturing';
  humorAcceptable: boolean;
  preferredPronoun: string;
}

// =============================================================================
// 📊 ANALYTICS & INSIGHTS TYPES
// =============================================================================

/**
 * AI etkileşim analytics
 */
export interface AIInteractionAnalytics {
  userId: string;
  sessionId: string;
  timestamp: Date;
  
  // Interaction details
  interactionType: AIInteractionType;
  feature: string;
  duration: number;
  messageCount: number;
  
  // Quality metrics
  userSatisfaction?: number; // 1-5
  therapeuticValue?: number; // 1-5
  helpfulness?: number; // 1-5
  
  // Performance metrics
  responseTime: number;
  errorCount: number;
  fallbacksUsed: number;
  
  // Privacy compliance
  dataRetentionDays: number;
  anonymized: boolean;
}

/**
 * AI etkileşim türleri
 */
export enum AIInteractionType {
  CHAT_MESSAGE = 'chat_message',
  INSIGHT_GENERATED = 'insight_generated',
  CRISIS_DETECTED = 'crisis_detected',
  ONBOARDING_STEP = 'onboarding_step',
  ART_THERAPY_SESSION = 'art_therapy_session',
  CBT_EXERCISE = 'cbt_exercise'
}

// =============================================================================
// 🔒 ERROR & VALIDATION TYPES
// =============================================================================

/**
 * AI sistem hataları
 */
export interface AIError {
  code: AIErrorCode;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage?: string; // Kullanıcıya gösterilecek mesaj
}

/**
 * AI hata kodları
 */
export enum AIErrorCode {
  FEATURE_DISABLED = 'feature_disabled',
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT = 'rate_limit',
  INVALID_RESPONSE = 'invalid_response',
  SAFETY_VIOLATION = 'safety_violation',
  PRIVACY_VIOLATION = 'privacy_violation',
  MODEL_ERROR = 'model_error',
  INITIALIZATION_FAILED = 'initialization_failed',
  PROCESSING_FAILED = 'processing_failed',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  SESSION_NOT_FOUND = 'session_not_found',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Hata ciddiyet seviyeleri
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Input validation schema
 */
export interface ValidationSchema {
  maxLength: number;
  minLength: number;
  allowedPatterns: RegExp[];
  forbiddenPatterns: RegExp[];
  requiredFields: string[];
  sensitiveDataCheck: boolean;
}

// =============================================================================
// 🎨 ART THERAPY TYPES
// =============================================================================

/**
 * Sanat terapisi session
 */
export interface ArtTherapySession {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Creation context
  emotionalState: EmotionalState;
  therapeuticGoal: string;
  aiPrompt?: string;
  userPrompt?: string;
  
  // Artwork data
  artworkType: ArtworkType;
  artworkData: ArtworkData;
  creationDuration: number;
  
  // Analysis
  emotionalAnalysis?: EmotionalAnalysis;
  therapeuticValue?: number;
  progressIndicators?: string[];
}

/**
 * Sanat türleri
 */
export enum ArtworkType {
  AI_GENERATED = 'ai_generated',
  USER_DRAWN = 'user_drawn',
  COLLABORATIVE = 'collaborative',
  GUIDED_CREATION = 'guided_creation'
}

/**
 * Duygusal durum
 */
export interface EmotionalState {
  primary: string;
  intensity: number; // 1-10
  secondary?: string[];
  physicalSymptoms?: string[];
  cognitiveSymptoms?: string[];
}

// =============================================================================
// 📋 SUPPORTING TYPES
// =============================================================================

/**
 * Diagnostic bilgiler (opsiyonel)
 */
export interface DiagnosticInfo {
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string[];
  comorbidities?: string[];
  severityLevel?: number; // 1-10
  diagnosisDate?: Date;
}

/**
 * Tedavi geçmişi
 */
export interface TreatmentHistory {
  previousTreatments: TreatmentType[];
  currentMedications?: string[];
  allergies?: string[];
  treatmentResponse?: string;
}

/**
 * Tedavi türleri
 */
export enum TreatmentType {
  CBT = 'cbt',
  EXPOSURE_THERAPY = 'exposure_therapy',
  MEDICATION = 'medication',
  GROUP_THERAPY = 'group_therapy',
  FAMILY_THERAPY = 'family_therapy',
  ART_THERAPY = 'art_therapy'
}

/**
 * Kriz iletişim bilgileri
 */
export interface CrisisContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  preferredContactMethod: 'phone' | 'email' | 'text';
  availability: string;
}

/**
 * Güvenlik planı
 */
export interface SafetyPlan {
  warningSignals: string[];
  copingStrategies: string[];
  socialSupports: CrisisContact[];
  professionalContacts: CrisisContact[];
  environmentalSafety: string[];
  reasonsToLive: string[];
}

/**
 * Progress note
 */
export interface ProgressNote {
  timestamp: Date;
  content: string;
  type: 'observation' | 'goal' | 'intervention' | 'outcome';
  clinician?: string;
  private: boolean;
}

/**
 * Artwork data
 */
export interface ArtworkData {
  format: 'image' | 'drawing' | 'text' | 'mixed';
  content: string | Uint8Array;
  metadata: {
    width?: number;
    height?: number;
    colors?: string[];
    tools?: string[];
    style?: string;
  };
}

/**
 * Emotional analysis result
 */
export interface EmotionalAnalysis {
  dominantEmotions: EmotionScore[];
  symbolism?: string[];
  therapeuticThemes?: string[];
  progressIndicators?: string[];
  recommendedFollowUp?: string[];
}

// =============================================================================
// 🔄 TYPE UTILITIES & GUARDS
// =============================================================================

/**
 * Type guard for AIMessage
 */
export const isAIMessage = (obj: any): obj is AIMessage => {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.content === 'string' &&
         ['user', 'assistant', 'system'].includes(obj.role) &&
         obj.timestamp instanceof Date;
};

/**
 * Type guard for crisis detection
 */
export const isCrisisLevel = (level: string): level is CrisisRiskLevel => {
  return Object.values(CrisisRiskLevel).includes(level as CrisisRiskLevel);
};

/**
 * Feature flag requirement check
 */
export const requiresFeatureFlag = (config: AIConfig): boolean => {
  return FEATURE_FLAGS.isEnabled(config.featureFlag);
};

// =============================================================================
// 🧭 SPRINT 7: AI ONBOARDING RECREATION TYPES
// =============================================================================

/**
 * Y-BOCS Assessment Answer
 */
export interface YBOCSAnswer {
  questionId: string;
  questionText: string;
  response: string | number;
  severity?: number; // 0-4 scale
  timestamp: Date;
  metadata?: {
    responseTime: number; // ms
    revisionCount: number;
    confidence?: number; // 0-1
  };
}

/**
 * Y-BOCS Analysis Result
 */
export interface OCDAnalysis {
  totalScore: number; // 0-40
  subscores: {
    obsessions: number; // 0-20
    compulsions: number; // 0-20
  };
  severityLevel: OCDSeverityLevel;
  dominantSymptoms: string[];
  riskFactors: string[];
  confidence: number; // 0-1
  culturalConsiderations: string[];
  recommendedInterventions: string[];
}

/**
 * OCD Severity Levels
 */
export enum OCDSeverityLevel {
  MINIMAL = 'minimal', // 0-7
  MILD = 'mild', // 8-15
  MODERATE = 'moderate', // 16-23
  SEVERE = 'severe', // 24-31
  EXTREME = 'extreme' // 32-40
}

/**
 * Enhanced Y-BOCS Score with AI Enhancement
 */
export interface EnhancedYBOCSScore {
  baseScore: OCDAnalysis;
  aiEnhancements: {
    contextualAdjustments: number;
    culturalFactors: string[];
    personalityConsiderations: string[];
    environmentalInfluences: string[];
  };
  finalScore: number;
  confidence: number;
  rationale: string;
}

/**
 * Onboarding Session
 */
export interface OnboardingSession {
  id: string;
  userId: string;
  startTime: Date;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  ybocsData: YBOCSAnswer[];
  userProfile: PartialUserProfile;
  sessionState: OnboardingSessionState;
  culturalContext: CulturalContext;
  progress: {
    totalSteps: number;
    completedSteps: number;
    estimatedTimeRemaining: number; // minutes
  };
}

/**
 * Onboarding Steps
 */
export enum OnboardingStep {
  WELCOME = 'welcome',
  CONSENT = 'consent',
  BASIC_INFO = 'basic_info',
  CULTURAL_PREFERENCES = 'cultural_preferences',
  YBOCS_ASSESSMENT = 'ybocs_assessment',
  SYMPTOM_EXPLORATION = 'symptom_exploration',
  THERAPEUTIC_PREFERENCES = 'therapeutic_preferences',
  RISK_ASSESSMENT = 'risk_assessment',
  GOAL_SETTING = 'goal_setting',
  TREATMENT_PLANNING = 'treatment_planning',
  SAFETY_PLANNING = 'safety_planning',
  COMPLETION = 'completion'
}

/**
 * Onboarding Session State
 */
export enum OnboardingSessionState {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  ERROR = 'error'
}

/**
 * Cultural Context
 */
export interface CulturalContext {
  language: string;
  country: string;
  culturalBackground: string[];
  religiousConsiderations?: string[];
  familyDynamics?: string;
  communicationStyle: CommunicationStyle;
  stigmaFactors?: string[];
  supportSystemStructure?: string;
}

/**
 * Partial User Profile (during onboarding)
 */
export interface PartialUserProfile {
  basicInfo?: {
    age?: number;
    gender?: string;
    occupation?: string;
    educationLevel?: string;
  };
  therapeuticHistory?: {
    previousTreatment: boolean;
    treatmentTypes?: TreatmentType[];
    currentMedication: boolean;
    medicationDetails?: string[];
  };
  preferences?: TherapeuticPreferences;
  goals?: string[];
  concerns?: string[];
}

/**
 * Therapeutic Preferences
 */
export interface TherapeuticPreferences {
  preferredApproach: TherapeuticApproach[];
  communicationStyle: CommunicationStyle;
  sessionFrequency: SessionFrequency;
  contentPreferences: ContentPreferences;
  accessibilityNeeds?: AccessibilityNeed[];
  triggerWarnings?: string[];
}

/**
 * Therapeutic Approaches
 */
export enum TherapeuticApproach {
  CBT = 'cbt',
  EXPOSURE_THERAPY = 'exposure_therapy',
  MINDFULNESS = 'mindfulness',
  BEHAVIORAL_ACTIVATION = 'behavioral_activation',
  ACCEPTANCE_COMMITMENT = 'acceptance_commitment',
  PEER_SUPPORT = 'peer_support',
  FAMILY_INVOLVEMENT = 'family_involvement'
}

/**
 * Session Frequency Preferences
 */
export enum SessionFrequency {
  DAILY = 'daily',
  TWICE_WEEKLY = 'twice_weekly',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  AS_NEEDED = 'as_needed'
}

/**
 * Content Preferences
 */
export interface ContentPreferences {
  textBased: boolean;
  audioSupport: boolean;
  visualAids: boolean;
  interactiveExercises: boolean;
  progressTracking: boolean;
  peerStories: boolean;
  professionalGuidance: boolean;
}

/**
 * Accessibility Needs
 */
export enum AccessibilityNeed {
  LARGE_TEXT = 'large_text',
  HIGH_CONTRAST = 'high_contrast',
  SCREEN_READER = 'screen_reader',
  VOICE_CONTROL = 'voice_control',
  SIMPLIFIED_UI = 'simplified_ui',
  EXTENDED_TIME = 'extended_time'
}

/**
 * Treatment Plan
 */
export interface TreatmentPlan {
  id: string;
  userId: string;
  createdAt: Date;
  lastUpdated: Date;
  
  // Plan structure
  phases: TreatmentPhase[];
  currentPhase: number;
  estimatedDuration: number; // weeks
  
  // Personalization
  userProfile: UserTherapeuticProfile;
  culturalAdaptations: string[];
  accessibilityAccommodations: string[];
  
  // Evidence base
  evidenceBasedInterventions: EvidenceBasedIntervention[];
  expectedOutcomes: ExpectedOutcome[];
  successMetrics: SuccessMetric[];
  
  // Adaptive elements
  adaptationTriggers: AdaptationTrigger[];
  fallbackStrategies: FallbackStrategy[];
  emergencyProtocols: EmergencyProtocol[];
}

/**
 * Treatment Phase
 */
export interface TreatmentPhase {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // weeks
  objectives: string[];
  interventions: Intervention[];
  milestones: Milestone[];
  prerequisites?: string[];
  successCriteria: string[];
}

/**
 * Evidence-Based Intervention
 */
export interface EvidenceBasedIntervention {
  id: string;
  name: string;
  type: InterventionType;
  evidenceLevel: EvidenceLevel;
  description: string;
  protocol: InterventionProtocol;
  expectedOutcome: string;
  contraindications?: string[];
  culturalConsiderations?: string[];
}

/**
 * Intervention Types
 */
export enum InterventionType {
  EXPOSURE_RESPONSE_PREVENTION = 'erp',
  COGNITIVE_RESTRUCTURING = 'cognitive_restructuring',
  MINDFULNESS_TRAINING = 'mindfulness_training',
  BEHAVIORAL_ACTIVATION = 'behavioral_activation',
  PSYCHOEDUCATION = 'psychoeducation',
  RELAPSE_PREVENTION = 'relapse_prevention',
  FAMILY_EDUCATION = 'family_education'
}

/**
 * Evidence Levels
 */
export enum EvidenceLevel {
  GRADE_A = 'grade_a', // Strong evidence
  GRADE_B = 'grade_b', // Moderate evidence
  GRADE_C = 'grade_c', // Weak evidence
  EXPERT_CONSENSUS = 'expert_consensus',
  EMERGING = 'emerging'
}

/**
 * Risk Assessment Result
 */
export interface RiskAssessment {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Risk categories
  immediateRisk: RiskLevel;
  shortTermRisk: RiskLevel;
  longTermRisk: RiskLevel;
  
  // Risk factors
  identifiedRisks: RiskFactor[];
  protectiveFactors: ProtectiveFactor[];
  
  // Recommendations
  immediateActions: ImmediateAction[];
  monitoringPlan: MonitoringPlan;
  safeguards: Safeguard[];
  
  // Validation
  confidence: number;
  humanReviewRequired: boolean;
  reassessmentInterval: number; // days
}

/**
 * Risk Levels
 */
export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  IMMINENT = 'imminent'
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  category: RiskCategory;
  description: string;
  severity: RiskLevel;
  modifiable: boolean;
  timeframe: 'immediate' | 'short_term' | 'long_term';
}

/**
 * Risk Categories
 */
export enum RiskCategory {
  CLINICAL = 'clinical',
  PSYCHOSOCIAL = 'psychosocial',
  ENVIRONMENTAL = 'environmental',
  BEHAVIORAL = 'behavioral',
  COGNITIVE = 'cognitive'
}

/**
 * Protective Factor
 */
export interface ProtectiveFactor {
  category: string;
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
  reinforceable: boolean;
}

/**
 * Onboarding Result
 */
export interface OnboardingResult {
  sessionId: string;
  userId: string;
  completedAt: Date;
  duration: number; // minutes
  
  // Assessments
  ybocsAnalysis: OCDAnalysis;
  enhancedScore: EnhancedYBOCSScore;
  riskAssessment: RiskAssessment;
  
  // Generated profiles
  userProfile: UserTherapeuticProfile;
  treatmentPlan: TreatmentPlan;
  
  // Quality metrics
  completionRate: number; // 0-1
  dataQuality: number; // 0-1
  userSatisfaction?: number; // 1-5
  
  // Next steps
  recommendedNextSteps: string[];
  followUpSchedule: FollowUpSchedule;
}

/**
 * Follow-up Schedule
 */
export interface FollowUpSchedule {
  initialCheckIn: Date;
  weeklyReviews: Date[];
  monthlyAssessments: Date[];
  emergencyContactInfo: CrisisContact[];
}

// =============================================================================
// 📤 EXPORTS
// =============================================================================

// All types are already exported as named exports above
// No default export needed since TypeScript interfaces cannot be used as values