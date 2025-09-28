import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import voiceCheckInHeuristicService from '@/services/voiceCheckInHeuristicService';
import speechToTextService from '@/services/speechToTextService';
import moodTracker from '@/services/moodTrackingService';
import { moodDataLoader } from '@/services/moodDataLoader';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAccentColor } from '@/contexts/AccentColorContext';
import { useGamificationStore } from '@/store/gamificationStore';
import { mapTriggerIdsToLabels, mapTriggerTokensToIds } from '@/utils/moodTriggers';
import { getPaletteVAColor } from '@/utils/colorUtils';

import type {
  MoodDetailsPayload,
  VAMoodCheckinProps,
  VAMoodCheckinStep,
} from './types';

export type AnimatedButtonStyle = ReturnType<typeof useAnimatedStyle>;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const to01 = (t: number) => (t + 1) / 2;
const toMoodScore = (t01: number) => {
  const score = Math.round(50 + 50 * (t01 * 2 - 1));
  return Math.max(0, Math.min(100, score));
};
const toEnergyLevel = (t01: number) => {
  const level = Math.round(1 + 9 * t01);
  return Math.max(1, Math.min(10, level));
};

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

interface UseVAMoodCheckinLogicParams extends VAMoodCheckinProps {}

export interface VAMoodCheckinLogic {
  accentColor: string;
  palette: unknown;
  currentStep: VAMoodCheckinStep;
  disableVoice: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isNativeSTTAvailable: boolean;
  showTranscript: boolean;
  transcript: string;
  detectedTriggers: string[];
  detectedAnxiety: number | null;
  detailsDraft: MoodDetailsPayload;
  isSavingEntry: boolean;
  x: Animated.SharedValue<number>;
  y: Animated.SharedValue<number>;
  xy: { x: number; y: number };
  updateXY: (x: number, y: number) => void;
  recordButtonStyle: AnimatedButtonStyle;
  mood01: number;
  valenceText: string;
  energyText: string;
  moodColor: string;
  modalPresentation: 'fullScreen' | 'pageSheet';
  handleSliderChange: (value: number) => void;
  handleVoiceToggle: () => Promise<void>;
  handleNext: () => void;
  handleBack: () => void;
  handleSave: (payload: MoodDetailsPayload) => Promise<boolean>;
  handleDetailsChange: (payload: MoodDetailsPayload) => void;
  reset: () => void;
  serviceMeta: any | null;
  userId: string | null;
}

export function useVAMoodCheckinLogic({
  isVisible,
  onClose,
  onComplete,
  disableVoice = false,
  initialMEA = null,
  serviceMeta = null,
  autoVoiceStart = false,
  forceFullScreen = false,
}: UseVAMoodCheckinLogicParams): VAMoodCheckinLogic {
  const { user } = useAuth();
  const { color: accentColor, setScore, setVA, palette } = useAccentColor();

  const voiceService = voiceCheckInHeuristicService as any;
  const speechService = speechToTextService as any;

  const [currentStep, setCurrentStep] = useState<VAMoodCheckinStep>('mood');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [detectedTriggers, setDetectedTriggers] = useState<string[]>([]);
  const [detectedAnxiety, setDetectedAnxiety] = useState<number | null>(null);
  const [isNativeSTTAvailable, setIsNativeSTTAvailable] = useState(!disableVoice);
  const [detailsDraft, setDetailsDraft] = useState<MoodDetailsPayload>({
    notes: '',
    triggers: [],
    activities: [],
  });
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [xy, setXY] = useState({ x: 0, y: 0 });
  const updateXY = useCallback((nx: number, ny: number) => {
    setXY({ x: nx, y: ny });
  }, []);

  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(1);
  const recordButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingScale.value }],
    opacity: recordingOpacity.value,
  }));

  const realtimeStateRef = useRef<any>(null);
  const xyRef = useRef(xy);
  useEffect(() => { xyRef.current = xy; }, [xy]);

  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRealtimeAnalyzingRef = useRef(false);
  const lastRealtimeTextRef = useRef('');
  const crisisShownRef = useRef(false);
  const lastZoneRef = useRef(-1);
  const accentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoVoiceTriggeredRef = useRef(false);

  const mood01 = to01(xy.x);
  const valenceText = useMemo(() => valenceLabel(xy.x), [xy.x]);
  const energyText = useMemo(() => energyLabel(xy.y), [xy.y]);
  const moodColor = useMemo(() => getPaletteVAColor(palette as any, xy.x, xy.y), [xy, palette]);

  const modalPresentation = useMemo<'fullScreen' | 'pageSheet'>(() => {
    if (forceFullScreen) return 'fullScreen';
    return Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen';
  }, [forceFullScreen]);

  useEffect(() => {
    if (!isVisible) {
      autoVoiceTriggeredRef.current = false;
    }
    if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    accentDebounceRef.current = setTimeout(() => {
      const score = Math.round(to01(xy.x) * 100);
      setScore(score);
      setVA({ x: xy.x, y: xy.y });
    }, 90);
    return () => {
      if (accentDebounceRef.current) clearTimeout(accentDebounceRef.current);
    };
  }, [xy.x, xy.y, setScore, setVA, isVisible]);

  useEffect(() => {
    if (disableVoice) {
      setIsNativeSTTAvailable(false);
      return;
    }
    setIsNativeSTTAvailable(true);
  }, [disableVoice]);

  useEffect(() => {
    if (!isVisible) {
      if (partialTimerRef.current) {
        clearTimeout(partialTimerRef.current);
        partialTimerRef.current = null;
      }
      realtimeStateRef.current = null;
      isRealtimeAnalyzingRef.current = false;
      lastRealtimeTextRef.current = '';

      (async () => {
        try {
          await speechToTextService.stopRealtimeListening();
        } catch (e) {
          console.warn('⚠️ Failed stopping STT on close (non-critical):', e);
        }
      })();
    }
  }, [isVisible]);

  useEffect(() => () => {
    try {
      if (partialTimerRef.current) {
        clearTimeout(partialTimerRef.current);
        partialTimerRef.current = null;
      }
      if (!disableVoice) speechService?.stopRealtimeListening?.().catch(() => {});
    } catch {}
  }, [disableVoice, speechService]);

  useEffect(() => {
    if (!initialMEA) return;
    try {
      const mood01Prefill = Math.max(0, Math.min(1, Number(initialMEA.mood) / 100));
      const energy01Prefill = Math.max(0, Math.min(1, (Number(initialMEA.energy) - 1) / 9));
      const nx = clamp(mood01Prefill * 2 - 1, -1, 1);
      const ny = clamp(energy01Prefill * 2 - 1, -1, 1);
      x.value = nx;
      y.value = ny;
      setXY({ x: nx, y: ny });
    } catch {}
  }, [initialMEA, x, y]);

  const scheduleRealtimeAnalysis = useCallback((partial: string, isFinal: boolean) => {
    if (currentStep !== 'mood') return;
    const trimmed = (partial || '').trim();
    if (!trimmed) return;

    lastRealtimeTextRef.current = trimmed;

    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
    }

    partialTimerRef.current = setTimeout(async () => {
      if (isRealtimeAnalyzingRef.current || !trimmed) return;
      try {
        isRealtimeAnalyzingRef.current = true;
        const textForService = trimmed.slice(-350);
        realtimeStateRef.current = await voiceService?.analyzeRealtime?.(
          textForService,
          realtimeStateRef.current
        );
        const state = realtimeStateRef.current as any;
        if (!state) return;

        setTranscript((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
        setShowTranscript(true);

        if (state?.primaryMood) {
          const mood = clamp(state.primaryMood.valence ?? xyRef.current.x, -1, 1);
          const energy = clamp(state.primaryMood.energy ?? xyRef.current.y, -1, 1);
          x.value = mood;
          y.value = energy;
          setXY({ x: mood, y: energy });
        }

        if (Array.isArray(state?.triggers) && state.triggers.length > 0) {
          const ids = mapTriggerTokensToIds(state.triggers as string[]);
          setDetectedTriggers(ids);
        }

        if (typeof state?.anxiety === 'number') {
          setDetectedAnxiety(clamp(state.anxiety, 1, 10));
        }

        if (!crisisShownRef.current && state?.flags?.crisis) {
          crisisShownRef.current = true;
          Alert.alert(
            'Destek Gerekli Olabilir',
            'Konuşmanızda yüksek kaygı sinyalleri saptandı. Bir uzmandan destek almayı düşünebilirsiniz.'
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('🎧 Realtime analysis failed:', error);
        }
      } finally {
        isRealtimeAnalyzingRef.current = false;
      }
    }, 350);
  }, [currentStep, voiceService, x, y]);

  const zoneOf = useCallback((v01: number) => (v01 < 0.2 ? 0 : v01 < 0.5 ? 1 : v01 < 0.8 ? 2 : 3), []);

  const handleSliderChange = useCallback((v: number) => {
    const rawX = v * 2 - 1;
    const vx = clamp(rawX, -1, 1);
    x.value = vx;
    setXY(prev => ({ x: vx, y: prev.y }));

    const zone = zoneOf(v);
    if (zone !== lastZoneRef.current) {
      lastZoneRef.current = zone;
      Haptics.selectionAsync();
    }
  }, [x, zoneOf]);

  const resetRealtimeRefs = useCallback(() => {
    if (partialTimerRef.current) {
      clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }
    realtimeStateRef.current = null;
    isRealtimeAnalyzingRef.current = false;
    lastRealtimeTextRef.current = '';
  }, []);

  const stopRealtimeListening = useCallback(async () => {
    try {
      await speechService?.stopRealtimeListening?.();
    } catch {}
  }, [speechService]);

  const handleVoiceToggle = useCallback(async () => {
    if (disableVoice) return;

    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);

      cancelAnimation(recordingScale);
      cancelAnimation(recordingOpacity);
      recordingScale.value = withTiming(1, { duration: 180 });
      recordingOpacity.value = withTiming(1, { duration: 180 });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      resetRealtimeRefs();

      try {
        const transcriptResult = await speechService?.stopRealtimeListening?.();
        setIsProcessing(false);
        const transcriptText = typeof transcriptResult === 'string'
          ? transcriptResult
          : transcriptResult?.text ?? '';
        if (transcriptText) {
          setTranscript(prev => (prev ? `${prev}\n${transcriptText}` : transcriptText));
          setShowTranscript(true);
        }
      } catch (error) {
        console.error('❌ Failed to stop STT cleanly:', error);
        setIsProcessing(false);
      }

      return;
    }

    const guard = await speechService?.guardPermissions?.();
    if (!guard?.granted) {
      Alert.alert(
        'Mikrofon İzni Gerekli',
        'Voice Check-in kullanmak için mikrofon izni vermeniz gerekiyor. Lütfen ayarlardan izin verin.'
      );
      return;
    }

    try {
      resetRealtimeRefs();
      setIsRecording(true);
      setIsProcessing(true);

      recordingScale.value = withSequence(
        withSpring(0.88, { damping: 9, stiffness: 180 }),
        withRepeat(withSpring(1.08, { damping: 8, stiffness: 120 }), -1, true)
      );
      recordingOpacity.value = withRepeat(withTiming(0.72, { duration: 400 }), -1, true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await speechService?.startRealtimeListening?.(scheduleRealtimeAnalysis, 'tr-TR');
      setIsProcessing(false);
    } catch (error) {
      console.error('❌ Native STT failed to start:', error);
      setIsRecording(false);
      setIsProcessing(false);
      cancelAnimation(recordingScale);
      cancelAnimation(recordingOpacity);
      recordingScale.value = 1;
      recordingOpacity.value = 1;

      const errorMsg = error instanceof Error ? error.message : 'Unknown STT error';
      setTranscript(`STT Error: ${errorMsg}`);
      setShowTranscript(true);

      throw error;
    }
  }, [disableVoice, isRecording, recordingScale, recordingOpacity, resetRealtimeRefs, scheduleRealtimeAnalysis, speechService]);

  useEffect(() => {
    if (!isVisible || disableVoice || !autoVoiceStart || autoVoiceTriggeredRef.current) {
      return;
    }
    autoVoiceTriggeredRef.current = true;
    const timer = setTimeout(() => {
      handleVoiceToggle().catch(() => {
        autoVoiceTriggeredRef.current = false;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [autoVoiceStart, disableVoice, isVisible, handleVoiceToggle]);

  const reset = useCallback(() => {
    setCurrentStep('mood');
    setTranscript('');
    setShowTranscript(false);
    setDetectedTriggers([]);
    setDetailsDraft({ notes: '', triggers: [], activities: [] });
    setDetectedAnxiety(null);
    resetRealtimeRefs();
    x.value = 0;
    y.value = 0;
    setXY({ x: 0, y: 0 });
  }, [resetRealtimeRefs, x, y]);

  const handleNext = useCallback(() => {
    resetRealtimeRefs();
    stopRealtimeListening().catch(() => {});
    setCurrentStep('details');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [resetRealtimeRefs, stopRealtimeListening]);

  const handleBack = useCallback(() => {
    setCurrentStep('mood');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDetailsChange = useCallback((payload: MoodDetailsPayload) => {
    setDetailsDraft(payload);
  }, []);

  const handleSave = useCallback(async (details: MoodDetailsPayload): Promise<boolean> => {
    if (isSavingEntry) {
      return false;
    }
    setIsSavingEntry(true);

    try {
      let uid = user?.id;
      if (!uid) {
        try {
          const { getCurrentUserId } = await import('@/services/mood/userIdResolver');
          uid = await getCurrentUserId();
        } catch {}
      }
      if (!uid) {
        Alert.alert('Giriş Gerekli', 'Kaydetmek için lütfen yeniden giriş yapın.');
        setIsSavingEntry(false);
        return false;
      }

      const moodScore = toMoodScore(mood01);
      const energyLevel = toEnergyLevel(to01(xy.y));

      const finalAnxiety = (() => {
        if (detectedAnxiety != null && detectedAnxiety !== 5) {
          return clamp(detectedAnxiety, 1, 10);
        }

        const mood10 = clamp(Math.round(moodScore / 10), 1, 10);
        const energy10 = clamp(Math.round(energyLevel), 1, 10);

        let derivedAnxiety = 5;
        if (mood10 <= 3) derivedAnxiety = 7;
        else if (mood10 >= 8 && energy10 <= 4) derivedAnxiety = 6;
        else if (mood10 <= 5 && energy10 >= 7) derivedAnxiety = 8;
        else if (mood10 >= 7 && energy10 >= 7) derivedAnxiety = 4;
        else if (mood10 >= 6 && energy10 <= 6) derivedAnxiety = Math.max(2, 7 - mood10);
        else derivedAnxiety = Math.max(2, Math.min(8, 6 - (mood10 - 5)));

        return clamp(Math.round(derivedAnxiety), 1, 10);
      })();

      const triggerLabels = mapTriggerIdsToLabels(details.triggers);
      const activities = Array.isArray(details.activities) ? details.activities : [];

      const moodData = {
        mood_score: moodScore,
        energy_level: energyLevel,
        anxiety_level: finalAnxiety,
        notes: details.notes || `Duygu: ${valenceLabel(xy.x)}, Enerji: ${energyLabel(xy.y)}`,
        triggers: triggerLabels,
        activities,
        user_id: uid,
        source: 'va_pad_voice',
        method: 'va_pad+slider+voice',
        metadata: {
          va_point: { x: xy.x, y: xy.y },
          transcript,
          triggers: triggerLabels,
          activities,
        } as any,
      };

      const saveResult = await moodTracker.saveMoodEntry(moodData);

      if (saveResult.status === 'QUEUED_OFFLINE') {
        reset();
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
        try {
          if (uid) moodDataLoader.invalidate(uid);
        } catch (e) {
          console.warn('⚠️ Failed to invalidate moodDataLoader cache:', e);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
          const { updateStreak, awardMicroReward } = useGamificationStore.getState();
          await updateStreak();
          await awardMicroReward('voice_mood_checkin', { timestamp: new Date().toISOString() });
        } catch (gamiError) {
          console.warn('⚠️ Gamification update after check-in failed:', gamiError);
        }

        reset();
        onClose();
        onComplete?.({
          type: 'MOOD',
          confidence: 0.95,
          data: moodData,
          status: 'SUCCESS',
          toastShown: false,
        });
        setIsSavingEntry(false);
        return true;
      }
    } catch (error) {
      const code = (error as any)?.code || (error as any)?.message;
      if (code === 'DUPLICATE_PREVENTED' || String(code).includes('DUPLICATE_MOOD_ENTRY_PREVENTED')) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        onClose();
        setDetailsDraft({ notes: '', triggers: [], activities: [] });
        setIsSavingEntry(false);
        return true;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Kaydetme başarısız',
        'Mood kaydı kaydedilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.'
      );
      setIsSavingEntry(false);
      return false;
    }

    setIsSavingEntry(false);
    return false;
  }, [
    isSavingEntry,
    user?.id,
    mood01,
    xy.x,
    xy.y,
    detectedAnxiety,
    transcript,
    onClose,
    onComplete,
    reset,
  ]);

  useEffect(() => {
    if (!isVisible) {
      setIsSavingEntry(false);
    }
  }, [isVisible]);

  return {
    accentColor,
    palette,
    currentStep,
    disableVoice,
    isRecording,
    isProcessing,
    isNativeSTTAvailable,
    showTranscript,
    transcript,
    detectedTriggers,
    detectedAnxiety,
    detailsDraft,
    isSavingEntry,
    x,
    y,
    xy,
    updateXY,
    recordButtonStyle,
    mood01,
    valenceText,
    energyText,
    moodColor,
    modalPresentation,
    handleSliderChange,
    handleVoiceToggle,
    handleNext,
    handleBack,
    handleSave,
    handleDetailsChange,
    reset,
    serviceMeta,
    userId: user?.id ?? null,
  };
}
