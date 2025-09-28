import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Components
import VAPad from './VAPad';
import MoodDetailsStep from './MoodDetailsStep';

// Services
import voiceCheckInHeuristicService, { RealtimeState } from '@/services/voiceCheckInHeuristicService';
import moodTracker from '@/services/moodTrackingService';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useRouter } from 'expo-router';
import { useGamificationStore } from '@/store/gamificationStore';
import { moodDataLoader } from '@/services/moodDataLoader';
import { mapTriggerIdsToLabels, mapTriggerTokensToIds } from '@/utils/moodTriggers';

// 🎤 REAL STT - İOS crash riski var ama gerçek konuşma için aktif
import speechToTextService from '@/services/speechToTextService';
import { useAccentColor } from '@/contexts/AccentColorContext';
import { getPaletteVAColor } from '@/utils/colorUtils';

const { width: W } = Dimensions.get('window');
const PAD = Math.min(W - 48, 340);

// Utility functions
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const to01 = (t: number) => (t + 1) / 2;
// IMPROVED: Convert to mood score (0-100) directly, not 1-10 then *10
const toMoodScore = (t01: number) => {
  const score = Math.round(50 + 50 * (t01 * 2 - 1)); // -1..1 → 0-100 with 50 center
  return Math.max(0, Math.min(100, score));
};

const toEnergyLevel = (t01: number) => {
  const level = Math.round(1 + 9 * t01); // 0..1 → 1-10
  return Math.max(1, Math.min(10, level));
};
const from1_10 = (v: number) => {
  const result = ((v - 1) / 9) * 2 - 1;
  return Math.max(-1, Math.min(1, result));
};

// Service-compatible coordinate mapping (5.5 center like service)
const toCoordServiceLike = (v: number) => clamp((v - 5.5) / 4.5, -1, 1);

// Color functions
const mixHex = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ra = (A >> 16) & 255, ga = (A >> 8) & 255, ba = A & 255;
  const rb = (B >> 16) & 255, gb = (B >> 8) & 255, bb = B & 255;
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  const hx = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hx(m(ra, rb))}${hx(m(ga, gb))}${hx(m(ba, bb))}`;
};

const lighten = (hex: string, amt: number) => mixHex(hex, '#ffffff', clamp(amt, 0, 1));

const withA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${clamp(a, 0, 1)})`;
};

// Color scheme
const C_NEG_LOW = '#64748b';  // sad-calm
const C_POS_LOW = '#22d3ee';  // calm-positive
const C_NEG_HIGH = '#ef4444'; // anxiety/anger
const C_POS_HIGH = '#22c55e'; // excited-positive
const C_NEUTRAL = '#60a5fa';  // center

function colorFromVA(x: number, y: number) {
  const u = (x + 1) / 2, v = (y + 1) / 2;
  const bottom = mixHex(C_NEG_LOW, C_POS_LOW, u);
  const top = mixHex(C_NEG_HIGH, C_POS_HIGH, u);
  let base = mixHex(bottom, top, v);
  const d = Math.sqrt(x * x + y * y) / Math.SQRT2;
  const clampedD = Math.max(0, Math.min(1, d));
  const wCenter = Math.pow(1 - clampedD, 1.4) * 0.45;
  base = mixHex(base, C_NEUTRAL, wCenter);
  return lighten(base, v * 0.15);
}

// Label functions
const valenceLabel = (x: number) => {
  if (x <= -0.6) return 'Çok keyifsiz';
  if (x < -0.2) return 'Keyifsiz';
  if (Math.abs(x) <= 0.2) return 'Nötr';
  if (x < 0.6) return 'Keyifli';
  return 'Çok keyifli';
};

const energyLabel = (y: number) => {
  if (y <= -0.6) return 'Çok yorgun';
  if (y < -0.2) return 'Yorgun';
  if (Math.abs(y) <= 0.2) return 'Normal';
  if (y < 0.6) return 'Enerjik';
  return 'Çok enerjik';
};

interface VAMoodCheckinProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete?: (result: any) => void;
  disableVoice?: boolean;
  initialMEA?: { mood: number; energy: number; anxiety: number } | null;
  serviceMeta?: any | null;
  autoVoiceStart?: boolean;
  forceFullScreen?: boolean;
}

export default function VAMoodCheckin({
  isVisible,
  onClose,
  onComplete,
  disableVoice = false,
  initialMEA = null,
  serviceMeta = null,
  autoVoiceStart = false,
  forceFullScreen = false,
}: VAMoodCheckinProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { color: accentColor, setScore, setVA, palette } = useAccentColor();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // VA Pad state
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [xy, setXY] = useState({ x: 0, y: 0 });
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [detectedTriggers, setDetectedTriggers] = useState<string[]>([]);
  const [detectedAnxiety, setDetectedAnxiety] = useState<number | null>(null);
  const [isNativeSTTAvailable, setIsNativeSTTAvailable] = useState(!disableVoice);
  const [detailsDraft, setDetailsDraft] = useState<{ notes: string; triggers: string[]; activities: string[] }>({
    notes: '',
    triggers: [],
    activities: [],
  });
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  // Realtime analysis state
  const realtimeStateRef = useRef<RealtimeState | null>(null);
  
  // Track last coordinates for smooth from→to transitions
  const xyRef = useRef(xy);
  useEffect(() => { xyRef.current = xy; }, [xy]);
  
  // Recording animation
  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(1);
  
  // Slider haptic zones
  const lastZoneRef = useRef<number>(-1);
  const zoneOf = (v01: number) => (v01 < 0.2 ? 0 : v01 < 0.5 ? 1 : v01 < 0.8 ? 2 : 3);

  // Realtime analysis refs and guards
  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRealtimeAnalyzingRef = useRef(false);
  const lastRealtimeTextRef = useRef('');
  const crisisShownRef = useRef(false);

  const updateXY = useCallback((nx: number, ny: number) => {
    setXY({ x: nx, y: ny });
  }, []);

  const recordButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingScale.value }],
    opacity: recordingOpacity.value,
  }));

  // VA Pad color matches selected palette across app
  const color = useMemo(() => getPaletteVAColor(palette as any, xy.x, xy.y), [xy, palette]);

  const modalPresentation = useMemo(() => {
    if (forceFullScreen) {
      return 'fullScreen';
    }
    return Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen';
  }, [forceFullScreen]);

  const fmt = (v: any) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    const r = Math.round(n * 10) / 10;
    return String(r);
  };

  // Keep global accent palette in sync with current valence (0-100)
  const accentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoVoiceTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isVisible) {
      autoVoiceTriggeredRef.current = false;
    }
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    accentDebounceRef.current = setTimeout(() => {
      const mood01 = to01(xy.x);
      const score = Math.round(mood01 * 100);
      setScore(score);
      setVA({ x: xy.x, y: xy.y });
    }, 90); // 60–120ms hedef: 90ms
    return () => {
      if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    };
  }, [xy.x, xy.y, setScore, setVA]);

  // STT availability handled internally by service (disabled when disableVoice)
  useEffect(() => {
    if (disableVoice) {
      setIsNativeSTTAvailable(false);
      return;
    }
    console.log('🔍 Real native STT - availability handled by service internally');
    setIsNativeSTTAvailable(true);
  }, [disableVoice]);

  // Clean up realtime analysis when modal closes
  useEffect(() => {
    if (!isVisible) {
      // Modal closed - clean up realtime analysis
      if (partialTimerRef.current) {
        clearTimeout(partialTimerRef.current);
        partialTimerRef.current = null;
      }
      realtimeStateRef.current = null;
      isRealtimeAnalyzingRef.current = false;
      lastRealtimeTextRef.current = '';
      console.log('🎧 Realtime v3.5: cleaned up on modal close');

      // Also stop native STT if still active
      (async () => {
        try {
          await speechToTextService.stopRealtimeListening();
          console.log('🛑 Native STT force-stopped on modal close');
        } catch (e) {
          console.warn('⚠️ Failed stopping STT on close (non-critical):', e);
        }
      })();
    }
  }, [isVisible]);

  // Final cleanup on unmount to ensure no background STT remains
  useEffect(() => {
    return () => {
      try {
        if (partialTimerRef.current) {
          clearTimeout(partialTimerRef.current);
          partialTimerRef.current = null;
        }
        if (!disableVoice) speechToTextService.stopRealtimeListening().catch(() => {});
        console.log('🧹 VAMoodCheckin unmounted: STT cleanup executed');
      } catch {}
    };
  }, [disableVoice]);

  // AI prefill: map initial MEA to VA coordinates when provided
  useEffect(() => {
    if (!initialMEA) return;
    try {
      const mood01 = Math.max(0, Math.min(1, Number(initialMEA.mood) / 100));
      const energy01 = Math.max(0, Math.min(1, (Number(initialMEA.energy) - 1) / 9));
      const nx = Math.max(-1, Math.min(1, mood01 * 2 - 1));
      const ny = Math.max(-1, Math.min(1, energy01 * 2 - 1));
      x.value = nx; y.value = ny; setXY({ x: nx, y: ny });
    } catch {}
  }, [initialMEA]);

  // Handle voice recording
  const handleVoiceToggle = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsProcessing(true);
      
      // Cancel animations and reset
      cancelAnimation(recordingScale);
      cancelAnimation(recordingOpacity);
      recordingScale.value = withTiming(1, { duration: 180 });
      recordingOpacity.value = withTiming(1, { duration: 180 });
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Clean up realtime analysis
      if (partialTimerRef.current) {
        clearTimeout(partialTimerRef.current);
        partialTimerRef.current = null;
      }
      realtimeStateRef.current = null;
      isRealtimeAnalyzingRef.current = false;
      
      try {
        // 🛑 Stop real STT - no fallback, surface real errors
        console.log('🛑 Stopping native STT...');
        const result = await speechToTextService.stopRealtimeListening();
        console.log('✅ Native STT stopped, result:', { success: result.success, textLength: result.text?.length });
        
        if (result && result.success && result.text) {
          setTranscript(result.text);
          setShowTranscript(true);
          
          // Analyze with heuristic
          const analysis = await voiceCheckInHeuristicService.analyzeMoodFromVoice(result);
          
          // Store detected triggers for Step 2
          if (analysis.triggers && analysis.triggers.length > 0) {
            const normalizedVoiceTriggers = mapTriggerTokensToIds(analysis.triggers);
            const effectiveTriggers = normalizedVoiceTriggers.length ? normalizedVoiceTriggers : analysis.triggers;
            setDetectedTriggers(effectiveTriggers);
            console.log('🎯 Detected triggers from voice:', {
              raw: analysis.triggers,
              normalized: normalizedVoiceTriggers,
            });
          }
          
          // Convert to VA coordinates (service-compatible 5.5 center)
          const vx = toCoordServiceLike(analysis.moodScore);
          const vy = toCoordServiceLike(analysis.energyLevel);
          
          // 🎯 Final positioning: Service-compatible coordinates, faster animation
          console.log('🎧 Final: precise positioning ->', { 
            vx, vy, 
            mood: analysis.moodScore, 
            energy: analysis.energyLevel 
          });
          
          // Fast final positioning (no excessive smoothing)
          x.value = withTiming(vx, { duration: 300 });
          y.value = withTiming(vy, { duration: 300 });
          setXY({ x: vx, y: vy });
          // Persist detected anxiety level for save
          try {
            const anx = Math.max(1, Math.min(10, Math.round(analysis.anxietyLevel)));
            setDetectedAnxiety(Number.isFinite(anx) ? anx : 5);
          } catch { setDetectedAnxiety(5); }
          
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          // If no result, show detailed error
          setTranscript('STT failed: No transcript received from native service');
          setShowTranscript(true);
        }
      } catch (error) {
        console.error('❌ Native STT processing failed:', error);
        // 🚨 Show real error details instead of generic message
        const errorMsg = error instanceof Error ? error.message : 'Unknown STT error';
        setTranscript(`Native STT Error: ${errorMsg}`);
        setShowTranscript(true);
        
        // Re-throw to surface the problem in console
        throw error;
      } finally {
        setIsProcessing(false);
        // Cancel animations again in case of error
        cancelAnimation(recordingScale);
        cancelAnimation(recordingOpacity);
        recordingScale.value = 1;
        recordingOpacity.value = 1;
      }
    } else {
      // 🚨 NO FALLBACK - Force real STT to surface the actual error
      console.log('🎤 Starting REAL native STT (no fallback)...');
      
      // Start recording
      setIsRecording(true);
      setIsProcessing(true);
      setTranscript('');
      setShowTranscript(false);
      
      // Initialize realtime analysis state
      realtimeStateRef.current = voiceCheckInHeuristicService.beginRealtime();
      lastRealtimeTextRef.current = '';
      console.log('🎧 Realtime v3.5: started with fresh state');
      
      // Start infinite pulsing animation
      recordingScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      recordingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      try {
        // 🎤 Real STT - no fallback, let errors surface
        console.log('🎤 Starting real-time speech recognition with native STT...');
        await speechToTextService.startRealtimeListening(
          scheduleRealtimeAnalysis,
          'tr-TR'
        );
        console.log('✅ Native STT started successfully');
        setIsProcessing(false);
      } catch (error) {
        console.error('❌ Native STT failed to start:', error);
        setIsRecording(false);
        setIsProcessing(false);
        // Cancel animations
        cancelAnimation(recordingScale);
        cancelAnimation(recordingOpacity);
        recordingScale.value = 1;
        recordingOpacity.value = 1;
        
        // 🚨 Show real error instead of generic message
        const errorMsg = error instanceof Error ? error.message : 'Unknown STT error';
        setTranscript(`STT Error: ${errorMsg}`);
        setShowTranscript(true);
        
        // Re-throw to surface the actual problem
        throw error;
      }
    }
  };

  useEffect(() => {
    if (!isVisible || disableVoice || !autoVoiceStart || autoVoiceTriggeredRef.current) {
      return;
    }
    autoVoiceTriggeredRef.current = true;
    // Allow sheet animation to settle before starting voice record
    const timer = setTimeout(() => {
      handleVoiceToggle().catch(() => {
        autoVoiceTriggeredRef.current = false;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [autoVoiceStart, disableVoice, isVisible]);

  const handleNext = () => {
    // Clean up realtime analysis before moving to step 2
    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }
          realtimeStateRef.current = null;
    isRealtimeAnalyzingRef.current = false;
    lastRealtimeTextRef.current = '';

    // Ensure STT is stopped if user proceeds without explicitly stopping
    try { speechToTextService.stopRealtimeListening().catch(() => {}); } catch {}
    
    // Move to step 2 (details)
    setCurrentStep(2);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBack = () => {
    // Go back to step 1
    setCurrentStep(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async (details: { notes: string; triggers: string[]; activities: string[] }): Promise<boolean> => {
    if (isSavingEntry) {
      return false;
    }
    setIsSavingEntry(true);

    try {
      // Resolve user id robustly if AuthContext not yet ready
      let uid = user?.id;
      if (!uid) {
        try {
          const { getCurrentUserId } = await import('@/services/mood/userIdResolver');
          uid = await getCurrentUserId();
        } catch {}
      }
      if (!uid) {
        console.error('❌ No user ID available');
        Alert.alert('Giriş Gerekli', 'Kaydetmek için lütfen yeniden giriş yapın.');
        setIsSavingEntry(false);
        return false;
      }

      const mood01 = to01(xy.x);
      const energy01 = to01(xy.y);
      const moodScore = toMoodScore(mood01); // Direct 0-100 conversion
      const energyLevel = toEnergyLevel(energy01); // 1-10 conversion
      
      // Prepare mood entry data with VA coordinates and details
      // IMPROVED: Smart anxiety calculation - derive from mood/energy if voice analysis failed
      const finalAnx10 = (() => {
        if (detectedAnxiety != null && detectedAnxiety !== 5) {
          return Math.max(1, Math.min(10, detectedAnxiety)); // Use voice-detected anxiety
        }
        
        // Voice analysis failed or returned default - derive from mood/energy
        const m10 = Math.max(1, Math.min(10, Math.round(moodScore / 10))); // Convert 0-100 to 1-10
        const e10 = Math.max(1, Math.min(10, energyLevel)); // Already 1-10
        
        // Smart anxiety derivation based on psychological patterns
        let derivedAnxiety = 5; // baseline
        
        if (m10 <= 3) derivedAnxiety = 7; // Very low mood often correlates with anxiety
        else if (m10 >= 8 && e10 <= 4) derivedAnxiety = 6; // High mood + low energy = underlying anxiety
        else if (m10 <= 5 && e10 >= 7) derivedAnxiety = 8; // Low mood + high energy = agitation/anxiety
        else if (m10 >= 7 && e10 >= 7) derivedAnxiety = 4; // High mood + high energy = low anxiety
        else if (m10 >= 6 && e10 <= 6) derivedAnxiety = Math.max(2, 7 - m10); // Inverse mood relationship
        else derivedAnxiety = Math.max(2, Math.min(8, 6 - (m10 - 5))); // General inverse relationship
        
        console.log('🧠 Derived anxiety:', {
          mood: m10,
          energy: e10,
          derivedAnxiety,
          detectedAnxiety,
          source: detectedAnxiety != null ? 'voice' : 'derived'
        });
        
        return Math.max(1, Math.min(10, Math.round(derivedAnxiety)));
      })();

      const triggerLabels = mapTriggerIdsToLabels(details.triggers);
      const activities = Array.isArray(details.activities) ? details.activities : [];

      const moodData = {
        mood_score: moodScore, // Already 0-100 scale
        energy_level: energyLevel, // Already 1-10 scale  
        anxiety_level: finalAnx10,
        notes: details.notes || `Duygu: ${valenceLabel(xy.x)}, Enerji: ${energyLabel(xy.y)}`,
        triggers: triggerLabels,
        activities,
        user_id: uid,
        source: 'va_pad_voice',
        method: 'va_pad+slider+voice',
        // Store raw VA coordinates for analytics
        metadata: {
          va_point: { x: xy.x, y: xy.y },
          transcript,
          triggers: triggerLabels,
          activities,
        } as any
      };

      console.log('💾 Saving mood entry:', moodData);
      
      // Save mood entry
      const saveResult = await moodTracker.saveMoodEntry(moodData);

      if (saveResult.status === 'QUEUED_OFFLINE') {
        setCurrentStep(1);
        setTranscript('');
        setShowTranscript(false);
        setDetectedTriggers([]);
        setDetailsDraft({ notes: '', triggers: [], activities: [] });

        if (partialTimerRef.current) {
          clearTimeout(partialTimerRef.current);
          partialTimerRef.current = null;
        }
        realtimeStateRef.current = null;
        isRealtimeAnalyzingRef.current = false;
        lastRealtimeTextRef.current = '';

        x.value = 0;
        y.value = 0;
        setXY({ x: 0, y: 0 });

        onClose();

        onComplete?.({
          type: 'MOOD',
          confidence: 0.5,
          data: moodData,
          status: 'QUEUED_OFFLINE',
          queueItemId: saveResult.itemId,
          toastShown: false,
        });

        setIsSavingEntry(false);
        return true;
      }

      if (saveResult.status === 'SUCCESS') {
        const savedEntry = saveResult.entry;
        console.log('✅ Mood entry saved successfully');
        try {
          // Invalidate cached chart datasets so new entry reflects immediately
          if (uid) moodDataLoader.invalidate(uid);
        } catch (e) {
          console.warn('⚠️ Failed to invalidate moodDataLoader cache:', e);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // 🎮 Minimal gamification: update streak and award micro-reward
        try {
          const { updateStreak, awardMicroReward } = useGamificationStore.getState();
          await updateStreak();
          await awardMicroReward('voice_mood_checkin', { timestamp: new Date().toISOString() });
        } catch (gamiError) {
          console.warn('⚠️ Gamification update after check-in failed:', gamiError);
        }
        
        // Reset to step 1 for next use
        setCurrentStep(1);
        setTranscript('');
        setShowTranscript(false);
        setDetectedTriggers([]);
        setDetailsDraft({ notes: '', triggers: [], activities: [] });
        
        // Clean up realtime analysis
        if (partialTimerRef.current) {
          clearTimeout(partialTimerRef.current);
          partialTimerRef.current = null;
        }
        realtimeStateRef.current = null;
        isRealtimeAnalyzingRef.current = false;
        lastRealtimeTextRef.current = '';
        
        x.value = 0;
        y.value = 0;
        setXY({ x: 0, y: 0 });
        
        // Close modal and navigate to mood page
        onClose();
        
        // Optional: Call onComplete callback
        onComplete?.({
          type: 'MOOD',
          confidence: 0.95,
          data: moodData,
          status: 'SUCCESS',
          toastShown: false,
        });
        
        // Stay on Today: do not navigate away after save
        setIsSavingEntry(false);
        return true;
      }
    } catch (error) {
      // Treat idempotent duplicate as success (user already saved)
      const code = (error as any)?.code || (error as any)?.message;
      if (code === 'DUPLICATE_PREVENTED' || String(code).includes('DUPLICATE_MOOD_ENTRY_PREVENTED')) {
        console.warn('🛡️ Duplicate mood save detected – treating as success');
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        onClose();
        setDetailsDraft({ notes: '', triggers: [], activities: [] });
        // Stay on Today (no navigation)
        setIsSavingEntry(false);
        return true;
      }
      console.error('❌ Failed to save mood entry:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSavingEntry(false);
      return false;
    }
    setIsSavingEntry(false);
    return false;
  };

  const handleDetailsChange = useCallback((payload: { notes: string; triggers: string[]; activities: string[] }) => {
    setDetailsDraft(payload);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setIsSavingEntry(false);
    }
  }, [isVisible]);

  const mood01 = to01(xy.x);
  const valenceText = valenceLabel(xy.x);
  const energyText = energyLabel(xy.y);

  // Helper: Get recency window for more accurate realtime analysis
  const getRecencyWindow = useCallback((text: string, maxWords = 15): string => {
    const lower = text.toLowerCase();
    
    // Çelişki/akış kelimeleri: recency segment ayırıcılar
    const splitters = [' ama ', ' fakat ', ' ancak ', ' lakin ', ' sonra ', ' birden ', ' şimdi ', ' artık '];
    let seg = lower;
    
    // Son çelişki kelimesinden sonrasını al
    for (const s of splitters) {
      const idx = seg.lastIndexOf(s);
      if (idx !== -1) {
        seg = seg.slice(idx + s.length);
        break; // İlk bulunan (en son) splitter'dan sonrasını al
      }
    }
    
    // Son maxWords kelimeyi al
    const words = seg.trim().split(/\s+/).filter(Boolean);
    const tail = words.slice(-maxWords);
    return tail.join(' ');
  }, []);

  // Enhanced realtime analysis with incremental API
  const scheduleRealtimeAnalysis = useCallback((partial: string) => {
    // 1) UI transcript'ı göster
    setTranscript(partial);

    // 2) Sadece Step 1'de ve anlamlı uzunluktaysa çalış
    if (currentStep !== 1) return;
    const clean = partial.trim();
    if (clean.length < 8) return; // tek kelimelik parçalarda analiz yok

    // 3) Initialize realtime state if needed
    if (!realtimeStateRef.current) {
      realtimeStateRef.current = voiceCheckInHeuristicService.beginRealtime();
      console.log('🎧 Realtime: initialized state');
    }

    // 4) Get new chunk (difference from last analysis)
    const lastText = lastRealtimeTextRef.current;
    const newChunk = clean.length > lastText.length ? clean.slice(lastText.length).trim() : clean;
    
    // 5) Min-chunk gate: En az 2 kelime veya 8+ karakter
    const words = newChunk.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || newChunk.length < 8) return;
    
    lastRealtimeTextRef.current = clean;

    // 6) Debounce
    if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
    partialTimerRef.current = setTimeout(async () => {
      // Re-entrancy guard
      if (isRealtimeAnalyzingRef.current) return;
      isRealtimeAnalyzingRef.current = true;
      
      try {
        console.log('🎧 Realtime v3.5: analyzing chunk ->', newChunk.slice(0, 50));
        
        // Incremental analysis (compiled patterns + EMA smoothing)
        const res = voiceCheckInHeuristicService.incrementalAnalyze(
          realtimeStateRef.current!,
          newChunk
        );

        // Crisis detection
        const crisis = voiceCheckInHeuristicService.detectCrisis(clean);
        if (crisis.flagged && !crisisShownRef.current) {
          crisisShownRef.current = true;
          console.log('🚨 Crisis detected:', crisis.hits);
          Alert.alert(
            'Destek Önerisi',
            'Riskli ifadeler tespit edildi. Lütfen acil destek hatlarını veya güvendiğiniz bir kişiyi arayın.',
            [{ text: 'Tamam', style: 'cancel' }]
          );
        }

        // servis merkezine uyumlu fallback mapping
        const clamp = (n:number, a:number, b:number) => Math.max(a, Math.min(b, n));
        const toCoordServiceLike = (v:number) => clamp((v - 5.5) / 4.5, -1, 1);

        // sayıya zorlayıcı yardımcı
        const toNum = (v:any) => (typeof v === 'number' ? v : Number(v));

        // gate ismi geriye dönük uyumlu
        const isGated = (res.gateActive ?? (res as any).gated) === true;
        if (isGated) {
          console.log('🎧 Service gate active - no movement');
          return;
        }

        // Koordinat yoksa servis ile tutarlı fallback mapping uygula
        const hasCoord = Number.isFinite(Number(res.coordX)) && Number.isFinite(Number(res.coordY));
        const vx = hasCoord ? Number(res.coordX) : toCoordServiceLike(toNum(res.moodScore || 5));
        const vy = hasCoord ? Number(res.coordY) : toCoordServiceLike(toNum(res.energyLevel || 5));

        // Aynı pozisyona animasyon yapma (boşa animasyon önleme)
        if (Math.abs(vx - xyRef.current.x) < 0.001 && Math.abs(vy - xyRef.current.y) < 0.001) {
          if (__DEV__) console.log('🎧 Skipping: identical position, no animation needed');
          return;
        }

        // snappy animasyon
        x.value = withTiming(vx, { duration: 200 });
        y.value = withTiming(vy, { duration: 200 });
        setXY({ x: vx, y: vy });

        // Haptic feedback for visible moves
        if (Math.abs(vx - xyRef.current.x) > 0.1 || Math.abs(vy - xyRef.current.y) > 0.1) {
          Haptics.selectionAsync();
        }

        // net sayı log (string değil)
        const r3 = (n:number) => Math.round(n*1000)/1000;
        console.log('🎧 Dot moved ->', {
          duration: 200,
          from: { x: r3(xyRef.current.x), y: r3(xyRef.current.y) },
          to:   { x: r3(vx), y: r3(vy) }
        });
      } catch (e) {
        // Sessiz fail: realtime'da gürültü olabilir
        if (__DEV__) console.warn('🎧 Realtime v3.5 analysis failed:', e);
      } finally {
        isRealtimeAnalyzingRef.current = false;
      }
    }, 350); // 350ms debounce - faster response
  }, [currentStep, x, y, xy]);

  // Slider value change handler - must be defined before render to avoid hook count mismatch
  const handleSliderChange = useCallback((v: number) => {
    // Inline clamp to avoid any issues
    const rawX = v * 2 - 1;
    const vx = Math.max(-1, Math.min(1, rawX));
    x.value = vx;
    setXY(prev => ({ x: vx, y: prev.y }));
    
    // Haptic feedback on zone transitions
    const z = zoneOf(v);
    if (z !== lastZoneRef.current) {
      lastZoneRef.current = z;
      Haptics.selectionAsync();
    }
  }, []);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={modalPresentation}
      onRequestClose={onClose}
      transparent={false}
      statusBarTranslucent={forceFullScreen}
      hardwareAccelerated={forceFullScreen}
    >
      {currentStep === 1 ? (
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </Pressable>
            <Text style={[styles.title, { color: accentColor }]}>Duygu Kontrolü</Text>
            <View style={styles.placeholder} />
          </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>Şu anda nasıl hissettiğinizi seçin</Text>

          {/* VA Pad Component */}
          <VAPad
            x={x}
            y={y}
            onChangeXY={updateXY}
            color={color}
          />

          {/* Mood labels */}
          <View style={styles.moodDisplay}>
            <Text style={[styles.moodLabel, { color: accentColor }]}>{valenceText}</Text>
            <Text style={styles.energyLabel}>{energyText}</Text>
          </View>
          {/* Inference Meta Panel */}
          {serviceMeta && (
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>AI Tahmin</Text>
              <Text style={styles.metaText}>Kaynak: {serviceMeta.source || '—'}  •  Model: {serviceMeta.model || '—'}</Text>
              <Text style={styles.metaText}>MEA: mood={serviceMeta.prefillMEA?.mood ?? '—'}, energy={serviceMeta.prefillMEA?.energy ?? '—'}, anxiety={serviceMeta.prefillMEA?.anxiety ?? '—'}{serviceMeta.confidence != null ? `  •  conf=${Math.round((serviceMeta.confidence || 0)*100)}%` : ''}</Text>
              {serviceMeta.request_id ? (<Text style={styles.metaText}>Req: {String(serviceMeta.request_id).slice(0,8)}  •  {serviceMeta.elapsed_ms ? `${serviceMeta.elapsed_ms}ms` : ''}</Text>) : null}
              {serviceMeta.input_quality?.flags ? (
                <Text style={styles.metaText}>Flags: {Object.keys(serviceMeta.input_quality.flags).filter((k:any) => serviceMeta.input_quality.flags[k]).join('|') || '—'}</Text>
              ) : null}
              {serviceMeta.metrics ? (
                <Text style={styles.metaText}>HRV: bpm={fmt(serviceMeta.metrics.bpm)} rmssd={fmt(serviceMeta.metrics.rmssd)} sdnn={fmt(serviceMeta.metrics.sdnn)} pNN50={fmt(serviceMeta.metrics.pnn50)}</Text>
              ) : null}
            </View>
          )}

          {/* Valence Slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderWrap}>
              <Slider
                value={mood01}
                onValueChange={handleSliderChange}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor={accentColor}
                style={styles.slider}
              />
              <View style={styles.barBg} />
              <View style={[styles.barFill, { width: `${mood01 * 100}%`, backgroundColor: accentColor }]} />
            </View>
            
            {/* Slider labels */}
            <View style={styles.scale}>
              <Text style={styles.scaleText}>Çok keyifsiz</Text>
              <Text style={styles.scaleText}>Nötr</Text>
              <Text style={styles.scaleText}>Çok keyifli</Text>
            </View>
          </View>

          {/* Voice Check-in Button (disabled mode hides) */}
          {!disableVoice && (
            <Pressable
              style={styles.voiceButton}
              onPress={handleVoiceToggle}
              disabled={isProcessing}
              accessibilityLabel={isRecording ? "Kaydı durdur" : "Voice Check-in"}
            >
              <Animated.View style={[styles.voiceButtonInner, recordButtonStyle]}>
                {isProcessing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name={isRecording ? "stop" : "microphone"} 
                      size={20} 
                      color="white" 
                    />
                    <Text style={styles.voiceButtonText}>
                      {isRecording ? 'Kaydı Durdur' : 'Voice Check-in'}
                    </Text>
                  </>
                )}
              </Animated.View>
            </Pressable>
          )}

          {/* Transcript display */}
          {showTranscript && transcript && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          )}

          {/* Action Button - Next */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.primary, { backgroundColor: accentColor }]}
              onPress={handleNext}
            >
              <Text style={styles.btnTxt}>İleri</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
      ) : (
        <MoodDetailsStep
          transcript={transcript}
          detectedTriggers={detectedTriggers}
          moodLabel={valenceText}
          energyLabel={energyText}
          userId={user?.id ?? null}
          initialNotes={detailsDraft.notes}
          initialTriggers={detailsDraft.triggers}
          initialActivities={detailsDraft.activities}
          isSaving={isSavingEntry}
          onBack={handleBack}
          onChange={handleDetailsChange}
          onSave={handleSave}
          moodColor={accentColor}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 20,
    fontSize: 14,
  },

  moodDisplay: {
    marginTop: 20,
    alignItems: 'center',
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  energyLabel: {
    fontSize: 16,
    color: '#93a6b7',
  },
  metaCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
  },
  sliderSection: {
    width: PAD,
    marginTop: 24,
  },
  sliderWrap: {
    width: PAD,
    height: 20,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
    position: 'absolute',
    zIndex: 2,
  },
  barBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 6,
    height: 8,
    borderRadius: 999,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  voiceButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#12202b',
  },
  voiceButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceButtonText: {
    color: '#e8f2ff',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1a2530',
    borderRadius: 12,
    width: PAD,
  },
  transcriptText: {
    fontSize: 14,
    color: '#93a6b7',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  btn: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: '#22C55E',
  },
  secondary: {
    backgroundColor: '#2a3540',
  },
  btnTxt: {
    color: '#e8f2ff',
    fontWeight: '700',
    fontSize: 16,
  },
});
