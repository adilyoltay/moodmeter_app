/**
 * 🎯 Adaptive Interventions Engine - Context-Aware Support System
 * 
 * Kullanıcının mevcut durumuna (konum, zaman, aktivite) göre
 * kişiselleştirilmiş müdahale önerileri sunar.
 */

// Soft optional import for expo-location to satisfy lint/build in non-native envs
let Location: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Location = require('expo-location');
} catch {
  Location = {
    requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
    getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0, accuracy: 0 }, mocked: true }),
    Accuracy: { Balanced: 3 },
  };
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_FLAGS } from '@/constants/featureFlags';
import { 
  UserProfile,
  TreatmentPlan,
  AIEventType 
} from '@/features/ai/types';
import { trackAIInteraction } from '@/features/ai/telemetry/aiTelemetry';
import { externalAIService } from '@/features/ai/services/externalAIService';

export interface LocationContext {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationType: 'home' | 'work' | 'transit' | 'public' | 'unknown';
  nearbyPlaces?: string[];
  riskLevel: 'safe' | 'moderate' | 'trigger';
}

export interface TimeContext {
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isWorkHours: boolean;
  isSleepTime: boolean;
}

export interface ActivityContext {
  currentActivity: string;
  recentActivities: string[];
  screenTime: number;
  lastCompulsion?: Date;
  lastExercise?: Date;
  currentMood?: number;
}

export interface AdaptiveIntervention {
  id: string;
  type: 'breathing' | 'grounding' | 'distraction' | 'social' | 'movement' | 'mindfulness' | 'creative';
  title: string;
  description: string;
  duration: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  effectiveness: number; // 0-1
  culturallyAdapted: boolean;
  triggers: string[];
  contraindications: string[];
  instructions: string[];
  resources?: {
    audio?: string;
    video?: string;
    guide?: string;
  };
}

export interface InterventionRecommendation {
  intervention: AdaptiveIntervention;
  relevanceScore: number;
  reasoning: string;
  alternativeOptions: AdaptiveIntervention[];
  timing: 'immediate' | 'soon' | 'later';
}

class AdaptiveInterventionsEngineImpl {
  private static instance: AdaptiveInterventionsEngineImpl;
  private isInitialized: boolean = false;
  private interventionLibrary: Map<string, AdaptiveIntervention> = new Map();
  private userPreferences: Map<string, any> = new Map();
  private effectivenessHistory: Map<string, number[]> = new Map();
  private locationPermission: boolean = false;

  private constructor() {}

  static getInstance(): AdaptiveInterventionsEngineImpl {
    if (!AdaptiveInterventionsEngineImpl.instance) {
      AdaptiveInterventionsEngineImpl.instance = new AdaptiveInterventionsEngineImpl();
    }
    return AdaptiveInterventionsEngineImpl.instance;
  }

  /**
   * 🚀 Initialize the engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load intervention library
      await this.loadInterventionLibrary();
      
      // Request location permission
      await this.requestLocationPermission();
      
      // Load user preferences
      await this.loadUserPreferences();
      
      this.isInitialized = true;
      console.log('🎯 Adaptive Interventions Engine initialized');
      
    } catch (error) {
      console.error('Failed to initialize Adaptive Interventions Engine:', error);
    }
  }

  /**
   * 🎯 Get personalized intervention recommendations
   */
  async getRecommendations(
    userId: string,
    userProfile?: UserProfile,
    treatmentPlan?: TreatmentPlan
  ): Promise<InterventionRecommendation[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Gather context
      const locationContext = await this.getLocationContext();
      const timeContext = this.getTimeContext();
      const activityContext = await this.getActivityContext(userId);
      
      // Analyze situation
      const situation = await this.analyzeSituation(
        locationContext,
        timeContext,
        activityContext,
        userProfile
      );
      
      // Get relevant interventions
      const recommendations = await this.generateRecommendations(
        situation,
        userProfile,
        treatmentPlan
      );
      
      // Track interaction
      await trackAIInteraction(AIEventType.INTERVENTION_RECOMMENDED, {
        userId,
        context: {
          location: locationContext.locationType,
          time: timeContext.timeOfDay,
          activity: activityContext.currentActivity
        },
        recommendationCount: recommendations.length
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * 📍 Get location context
   */
  private async getLocationContext(): Promise<LocationContext> {
    if (!this.locationPermission) {
      return {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        locationType: 'unknown',
        riskLevel: 'moderate'
      };
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      const locationType = await this.determineLocationType(
        location.coords.latitude,
        location.coords.longitude
      );
      
      const riskLevel = await this.assessLocationRisk(locationType);
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        locationType,
        riskLevel
      };
      
    } catch (error) {
      console.error('Failed to get location:', error);
      return {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        locationType: 'unknown',
        riskLevel: 'moderate'
      };
    }
  }

  /**
   * ⏰ Get time context
   */
  private getTimeContext(): TimeContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let timeOfDay: TimeContext['timeOfDay'];
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';
    
    return {
      hour,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      timeOfDay,
      isWorkHours: hour >= 9 && hour < 18 && dayOfWeek > 0 && dayOfWeek < 6,
      isSleepTime: hour >= 23 || hour < 6
    };
  }

  /**
   * 📊 Get activity context
   */
  private async getActivityContext(userId: string): Promise<ActivityContext> {
    try {
      // Get recent compulsions
      const compulsionsKey = `compulsions_${userId}`;
      const compulsionsData = await AsyncStorage.getItem(compulsionsKey);
      const compulsions = compulsionsData ? JSON.parse(compulsionsData) : [];
      
      // Get recent exercises
      const exercisesKey = `exercises_${userId}`;
      const exercisesData = await AsyncStorage.getItem(exercisesKey);
      const exercises = exercisesData ? JSON.parse(exercisesData) : [];
      
      // Get current mood
      const moodKey = `current_mood_${userId}`;
      const moodData = await AsyncStorage.getItem(moodKey);
      const currentMood = moodData ? parseInt(moodData) : 5;
      
      // Determine current activity
      const currentActivity = await this.inferCurrentActivity(userId);
      
      return {
        currentActivity,
        recentActivities: [],
        screenTime: 0,
        lastCompulsion: compulsions.length > 0 ? new Date(compulsions[0].timestamp) : undefined,
        lastExercise: exercises.length > 0 ? new Date(exercises[0].timestamp) : undefined,
        currentMood
      };
      
    } catch (error) {
      console.error('Failed to get activity context:', error);
      return {
        currentActivity: 'unknown',
        recentActivities: [],
        screenTime: 0
      };
    }
  }

  /**
   * 🧠 Analyze current situation
   */
  private async analyzeSituation(
    location: LocationContext,
    time: TimeContext,
    activity: ActivityContext,
    userProfile?: UserProfile
  ): Promise<any> {
    // Risk factors
    const riskFactors = [];
    
    // Location-based risks
    if (location.riskLevel === 'trigger') {
      riskFactors.push('high_risk_location');
    }
    
    // Time-based risks
    if (time.isSleepTime && activity.screenTime > 0) {
      riskFactors.push('late_night_usage');
    }
    
    if (time.isWorkHours && location.locationType !== 'work') {
      riskFactors.push('work_avoidance');
    }
    
    // Activity-based risks
    if (activity.lastCompulsion) {
      const timeSinceCompulsion = Date.now() - activity.lastCompulsion.getTime();
      if (timeSinceCompulsion < 60 * 60 * 1000) { // Less than 1 hour
        riskFactors.push('recent_compulsion');
      }
    }
    
    if (activity.currentMood && activity.currentMood < 4) {
      riskFactors.push('low_mood');
    }
    
    // Protective factors
    const protectiveFactors = [];
    
    if (location.locationType === 'home' && location.riskLevel === 'safe') {
      protectiveFactors.push('safe_environment');
    }
    
    if (activity.lastExercise) {
      const timeSinceExercise = Date.now() - activity.lastExercise.getTime();
      if (timeSinceExercise < 24 * 60 * 60 * 1000) { // Less than 24 hours
        protectiveFactors.push('recent_exercise');
      }
    }
    
    return {
      riskFactors,
      protectiveFactors,
      overallRisk: this.calculateOverallRisk(riskFactors, protectiveFactors),
      recommendedInterventionTypes: this.determineInterventionTypes(
        riskFactors,
        protectiveFactors,
        time,
        location
      )
    };
  }

  /**
   * 💡 Generate intervention recommendations
   */
  private async generateRecommendations(
    situation: any,
    userProfile?: UserProfile,
    treatmentPlan?: TreatmentPlan
  ): Promise<InterventionRecommendation[]> {
    const recommendations: InterventionRecommendation[] = [];
    
    // Get relevant interventions from library
    const relevantInterventions = Array.from(this.interventionLibrary.values())
      .filter(intervention => {
        // Filter by recommended types
        return situation.recommendedInterventionTypes.includes(intervention.type);
      })
      .filter(intervention => {
        // Filter by user preferences
        const preference = this.userPreferences.get(intervention.type);
        return preference !== false;
      });
    
    // Score and rank interventions
    for (const intervention of relevantInterventions) {
      const relevanceScore = await this.calculateRelevanceScore(
        intervention,
        situation,
        userProfile
      );
      
      if (relevanceScore > 0.3) {
        const reasoning = await this.generateReasoning(
          intervention,
          situation,
          relevanceScore
        );
        
        recommendations.push({
          intervention,
          relevanceScore,
          reasoning,
          alternativeOptions: [],
          timing: this.determineTiming(situation.overallRisk)
        });
      }
    }
    
    // Sort by relevance
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Add alternatives for top recommendations
    for (let i = 0; i < Math.min(3, recommendations.length); i++) {
      recommendations[i].alternativeOptions = this.getAlternatives(
        recommendations[i].intervention,
        relevantInterventions
      );
    }
    
    return recommendations.slice(0, 5); // Return top 5
  }

  /**
   * 📏 Calculate relevance score
   */
  private async calculateRelevanceScore(
    intervention: AdaptiveIntervention,
    situation: any,
    userProfile?: UserProfile
  ): Promise<number> {
    let score = 0.5; // Base score
    
    // Adjust for risk level
    if (situation.overallRisk === 'high' && intervention.type === 'grounding') {
      score += 0.2;
    }
    
    // Adjust for user preferences
    const preference = this.userPreferences.get(intervention.type);
    if (preference === true) score += 0.1;
    
    // Adjust for past effectiveness
    const history = this.effectivenessHistory.get(intervention.id);
    if (history && history.length > 0) {
      const avgEffectiveness = history.reduce((a, b) => a + b, 0) / history.length;
      score += avgEffectiveness * 0.2;
    }
    
    // Cultural adaptation bonus
    if (intervention.culturallyAdapted && userProfile?.culturalContext) {
      score += 0.1;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  /**
   * 🎯 Load intervention library
   */
  private async loadInterventionLibrary(): Promise<void> {
    // Turkish-adapted interventions
    const interventions: AdaptiveIntervention[] = [
      {
        id: 'breathing_4_7_8',
        type: 'breathing',
        title: '4-7-8 Nefes Egzersizi',
        description: 'Anksiyeteyi azaltan güçlü bir nefes tekniği',
        duration: 5,
        difficulty: 'easy',
        effectiveness: 0.8,
        culturallyAdapted: true,
        triggers: ['anxiety', 'panic', 'stress'],
        contraindications: [],
        instructions: [
          '4 saniye boyunca burnunuzdan nefes alın',
          '7 saniye nefsinizi tutun',
          '8 saniye boyunca ağzınızdan nefes verin',
          'Bu döngüyü 4 kez tekrarlayın'
        ]
      },
      {
        id: 'grounding_5_4_3_2_1',
        type: 'grounding',
        title: '5-4-3-2-1 Topraklama',
        description: 'Şu ana odaklanmanızı sağlayan duyusal egzersiz',
        duration: 3,
        difficulty: 'easy',
        effectiveness: 0.75,
        culturallyAdapted: true,
        triggers: ['dissociation', 'panic', 'overwhelm'],
        contraindications: [],
        instructions: [
          '5 tane gördüğünüz şeyi sayın',
          '4 tane dokunabildiğiniz şeyi hissedin',
          '3 tane duyduğunuz sesi dinleyin',
          '2 tane koklayabildiğiniz kokuyu fark edin',
          '1 tane tadabildiğiniz tadı düşünün'
        ]
      },
      {
        id: 'turkish_tea_mindfulness',
        type: 'mindfulness',
        title: 'Çay Keyfi Meditasyonu',
        description: 'Geleneksel çay içme ritüelini mindfulness pratiğine dönüştürün',
        duration: 10,
        difficulty: 'easy',
        effectiveness: 0.7,
        culturallyAdapted: true,
        triggers: ['stress', 'anxiety', 'restlessness'],
        contraindications: [],
        instructions: [
          'Bir bardak çay demleyin',
          'Çayın kokusuna odaklanın',
          'İlk yudumu yavaşça alın',
          'Sıcaklığı ve tadı fark edin',
          'Her yudumda şu ana dönün'
        ]
      },
      {
        id: 'prayer_meditation',
        type: 'mindfulness',
        title: 'Dua ve Meditasyon',
        description: 'Manevi pratiklerle iç huzur bulun',
        duration: 15,
        difficulty: 'medium',
        effectiveness: 0.85,
        culturallyAdapted: true,
        triggers: ['guilt', 'shame', 'spiritual_distress'],
        contraindications: [],
        instructions: [
          'Sessiz bir yer bulun',
          'Rahat bir pozisyonda oturun',
          'Dua veya zikir ile başlayın',
          'Nefes ve kelimelere odaklanın',
          'Huzur hissiyle bitirin'
        ]
      },
      {
        id: 'nature_walk',
        type: 'movement',
        title: 'Doğa Yürüyüşü',
        description: 'Açık havada yürüyerek stresi azaltın',
        duration: 20,
        difficulty: 'easy',
        effectiveness: 0.8,
        culturallyAdapted: false,
        triggers: ['depression', 'anxiety', 'rumination'],
        contraindications: ['mobility_issues'],
        instructions: [
          'Yakındaki bir park veya yeşil alan bulun',
          'Rahat bir tempoda yürüyün',
          'Etrafınızdaki doğayı gözlemleyin',
          'Derin nefesler alın',
          'Telefonunuzu sessizde tutun'
        ]
      }
    ];
    
    // Add to library
    for (const intervention of interventions) {
      this.interventionLibrary.set(intervention.id, intervention);
    }
  }

  /**
   * 📍 Request location permission
   */
  private async requestLocationPermission(): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.locationPermission = status === 'granted';
    } catch (error) {
      console.error('Failed to get location permission:', error);
      this.locationPermission = false;
    }
  }

  /**
   * 👤 Load user preferences
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('intervention_preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        for (const [key, value] of Object.entries(preferences)) {
          this.userPreferences.set(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  /**
   * 📍 Determine location type
   */
  private async determineLocationType(lat: number, lon: number): Promise<LocationContext['locationType']> {
    // In production, this would use a geocoding API
    // For now, return a placeholder
    return 'unknown';
  }

  /**
   * 🚨 Assess location risk
   */
  private async assessLocationRisk(locationType: LocationContext['locationType']): Promise<LocationContext['riskLevel']> {
    const riskMap = {
      home: 'safe',
      work: 'moderate',
      transit: 'moderate',
      public: 'trigger',
      unknown: 'moderate'
    };
    return riskMap[locationType] as LocationContext['riskLevel'];
  }

  /**
   * 🎯 Infer current activity
   */
  private async inferCurrentActivity(userId: string): Promise<string> {
    // In production, this would use activity recognition
    return 'idle';
  }

  /**
   * 📊 Calculate overall risk
   */
  private calculateOverallRisk(riskFactors: string[], protectiveFactors: string[]): string {
    const riskScore = riskFactors.length;
    const protectiveScore = protectiveFactors.length;
    
    const netRisk = riskScore - protectiveScore;
    
    if (netRisk >= 3) return 'high';
    if (netRisk >= 1) return 'moderate';
    return 'low';
  }

  /**
   * 🎯 Determine intervention types
   */
  private determineInterventionTypes(
    riskFactors: string[],
    protectiveFactors: string[],
    time: TimeContext,
    location: LocationContext
  ): AdaptiveIntervention['type'][] {
    const types: AdaptiveIntervention['type'][] = [];
    
    // Based on risk factors
    if (riskFactors.includes('recent_compulsion')) {
      types.push('grounding', 'distraction');
    }
    
    if (riskFactors.includes('low_mood')) {
      types.push('movement', 'social', 'creative');
    }
    
    if (riskFactors.includes('late_night_usage')) {
      types.push('breathing', 'mindfulness');
    }
    
    // Based on time
    if (time.timeOfDay === 'morning') {
      types.push('movement', 'mindfulness');
    } else if (time.timeOfDay === 'evening') {
      types.push('breathing', 'mindfulness');
    }
    
    // Based on location
    if (location.locationType === 'home') {
      types.push('creative', 'mindfulness');
    } else if (location.locationType === 'public') {
      types.push('breathing', 'grounding');
    }
    
    // Remove duplicates
    return [...new Set(types)];
  }

  /**
   * ⏰ Determine timing
   */
  private determineTiming(overallRisk: string): InterventionRecommendation['timing'] {
    switch (overallRisk) {
      case 'high': return 'immediate';
      case 'moderate': return 'soon';
      default: return 'later';
    }
  }

  /**
   * 💬 Generate reasoning
   */
  private async generateReasoning(
    intervention: AdaptiveIntervention,
    situation: any,
    relevanceScore: number
  ): Promise<string> {
    const reasons = [];
    
    if (situation.riskFactors.includes('recent_compulsion')) {
      reasons.push('yakın zamanda yaşadığınız kompulsiyon sonrası rahatlamanıza yardımcı olacak');
    }
    
    if (situation.riskFactors.includes('low_mood')) {
      reasons.push('ruh halinizi yükseltmeye yardımcı olabilir');
    }
    
    if (relevanceScore > 0.7) {
      reasons.push('şu anki durumunuz için en uygun egzersiz');
    }
    
    if (intervention.culturallyAdapted) {
      reasons.push('kültürel değerlerinize uygun olarak tasarlanmış');
    }
    
    return reasons.join(', ');
  }

  /**
   * 🔄 Get alternative interventions
   */
  private getAlternatives(
    primary: AdaptiveIntervention,
    pool: AdaptiveIntervention[]
  ): AdaptiveIntervention[] {
    return pool
      .filter(i => i.id !== primary.id && i.type === primary.type)
      .slice(0, 2);
  }

  /**
   * 🔄 Get fallback recommendations
   */
  private getFallbackRecommendations(): InterventionRecommendation[] {
    const breathing = this.interventionLibrary.get('breathing_4_7_8');
    const grounding = this.interventionLibrary.get('grounding_5_4_3_2_1');
    
    const recommendations: InterventionRecommendation[] = [];
    
    if (breathing) {
      recommendations.push({
        intervention: breathing,
        relevanceScore: 0.5,
        reasoning: 'Her zaman faydalı olan temel bir rahatlama egzersizi',
        alternativeOptions: [],
        timing: 'immediate'
      });
    }
    
    if (grounding) {
      recommendations.push({
        intervention: grounding,
        relevanceScore: 0.5,
        reasoning: 'Şu ana odaklanmanızı sağlayacak basit bir teknik',
        alternativeOptions: [],
        timing: 'immediate'
      });
    }
    
    return recommendations;
  }

  /**
   * 📊 Track intervention effectiveness
   */
  async trackEffectiveness(
    interventionId: string,
    effectiveness: number,
    userId: string
  ): Promise<void> {
    // Update history
    const history = this.effectivenessHistory.get(interventionId) || [];
    history.push(effectiveness);
    
    // Keep only last 10 entries
    if (history.length > 10) {
      history.shift();
    }
    
    this.effectivenessHistory.set(interventionId, history);
    
    // Save to storage
    await AsyncStorage.setItem(
      `intervention_effectiveness_${userId}`,
      JSON.stringify(Array.from(this.effectivenessHistory.entries()))
    );
    
    // Track event
    await trackAIInteraction(AIEventType.INTERVENTION_COMPLETED, {
      userId,
      interventionId,
      effectiveness
    });
  }
}

export const adaptiveInterventionsEngine = AdaptiveInterventionsEngineImpl.getInstance();
export default adaptiveInterventionsEngine;
