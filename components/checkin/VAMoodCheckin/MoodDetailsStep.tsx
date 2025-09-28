import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TRIGGER_OPTIONS, mapTriggerIdsToLabels, mapTriggerTokensToIds } from '@/utils/moodTriggers';

const NOTE_CHAR_LIMIT = 500;
const NOTE_STORAGE_PREFIX = 'draft_note_';
const RECENT_ACTIVITY_STORAGE_PREFIX = 'recent_activities_';

type ActivityOption = {
  id: string;
  label: string;
  icon: string;
};

const ACTIVITY_OPTIONS: ActivityOption[] = [
  { id: 'walk', label: 'Yürüyüş', icon: 'walk' },
  { id: 'meditation', label: 'Meditasyon', icon: 'meditation' },
  { id: 'work', label: 'Çalışma', icon: 'briefcase-clock' },
  { id: 'social', label: 'Sosyal buluşma', icon: 'account-multiple-outline' },
  { id: 'sleep', label: 'Uyku', icon: 'power-sleep' },
  { id: 'nutrition', label: 'Beslenme', icon: 'food-apple-outline' },
  { id: 'exercise', label: 'Egzersiz', icon: 'dumbbell' },
  { id: 'other', label: 'Diğer', icon: 'pencil-plus' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TriggerChipProps = {
  label: string;
  icon: string;
  selected: boolean;
  color: string;
  onPress: () => void;
};

type ActivityChipProps = {
  label: string;
  icon: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
};

const TriggerChip = React.memo<TriggerChipProps>(({ label, icon, selected, color, onPress }) => {
  const scale = useSharedValue(selected ? 1.04 : 1);

  useEffect(() => {
    scale.value = withTiming(selected ? 1.04 : 1, { duration: 90 });
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.chip,
        animatedStyle,
        selected && [styles.chipSelected, { backgroundColor: color }],
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} tetikleyicisi`}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        color={selected ? '#FFFFFF' : '#6B7280'}
      />
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </AnimatedPressable>
  );
});

TriggerChip.displayName = 'TriggerChip';

const ActivityChip = React.memo<ActivityChipProps>(({ label, icon, selected, accent, onPress }) => {
  const scale = useSharedValue(selected ? 1.04 : 1);

  useEffect(() => {
    scale.value = withTiming(selected ? 1.04 : 1, { duration: 90 });
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.activityChip,
        animatedStyle,
        selected && [styles.activityChipSelected, { borderColor: accent }],
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} aktivitesi`}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={18}
        color={selected ? accent : '#6B7280'}
      />
      <Text style={[styles.activityLabel, selected && { color: accent }]}>{label}</Text>
    </AnimatedPressable>
  );
});

ActivityChip.displayName = 'ActivityChip';

const toTriggerIds = (detected: string[] = []) => mapTriggerTokensToIds(detected);

const addAlpha = (hex: string, alpha: number) => {
  const safeHex = hex.replace('#', '');
  if (safeHex.length !== 6) return `rgba(16, 185, 129, ${alpha})`;
  const bigint = parseInt(safeHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const sanitizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

interface MoodDetailsStepProps {
  transcript?: string;
  detectedTriggers?: string[];
  moodColor: string;
  moodLabel: string;
  energyLabel: string;
  userId?: string | null;
  initialNotes?: string;
  initialTriggers?: string[];
  initialActivities?: string[];
  isSaving?: boolean;
  onBack: () => void;
  onChange?: (details: { notes: string; triggers: string[]; activities: string[] }) => void;
  onSave: (details: { notes: string; triggers: string[]; activities: string[] }) => Promise<boolean> | boolean;
}

export default function MoodDetailsStep({
  transcript = '',
  detectedTriggers = [],
  moodColor,
  moodLabel,
  energyLabel,
  userId,
  initialNotes,
  initialTriggers,
  initialActivities,
  isSaving = false,
  onBack,
  onChange,
  onSave,
}: MoodDetailsStepProps) {
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(initialTriggers ?? []);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(initialActivities ?? []);
  const [customActivityDraft, setCustomActivityDraft] = useState('');
  const [customActivityModalVisible, setCustomActivityModalVisible] = useState(false);

  const noteDraftKey = useMemo(() => (userId ? `${NOTE_STORAGE_PREFIX}${userId}` : null), [userId]);
  const activitiesKey = useMemo(
    () => (userId ? `${RECENT_ACTIVITY_STORAGE_PREFIX}${userId}` : null),
    [userId]
  );

  const hydratedNoteRef = useRef(false);
  const hydratedActivitiesRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (hydratedNoteRef.current) return;
    hydratedNoteRef.current = true;

    const hydrate = async () => {
      try {
        if (!isMounted) return;
        if (initialNotes) {
          setNotes(initialNotes);
          return;
        }

        if (noteDraftKey) {
          const stored = await AsyncStorage.getItem(noteDraftKey);
          if (stored && isMounted) {
            setNotes(stored);
            return;
          }
        }

        if (transcript) {
          setNotes(transcript);
        }
      } catch {
        if (transcript) setNotes(transcript);
      }
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [initialNotes, noteDraftKey, transcript]);

  useEffect(() => {
    let isMounted = true;
    if (hydratedActivitiesRef.current) return;
    hydratedActivitiesRef.current = true;

    const hydrateActivities = async () => {
      try {
        if (!isMounted) return;
        if (initialActivities?.length) {
          setSelectedActivities(initialActivities);
          return;
        }
        if (!activitiesKey) return;
        const stored = await AsyncStorage.getItem(activitiesKey);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored) as string[];
          if (Array.isArray(parsed) && parsed.length) {
            setSelectedActivities(parsed);
          }
        }
      } catch {
        // ignore hydrate errors
      }
    };

    hydrateActivities();
    return () => {
      isMounted = false;
    };
  }, [activitiesKey, initialActivities]);

  useEffect(() => {
    if (!detectedTriggers.length) return;
    setSelectedTriggers((prev) => {
      const next = new Set(prev);
      toTriggerIds(detectedTriggers).forEach((id) => next.add(id));
      return Array.from(next);
    });
  }, [detectedTriggers]);

  useEffect(() => {
    onChange?.({
      notes,
      triggers: selectedTriggers,
      activities: selectedActivities,
    });
  }, [notes, selectedTriggers, selectedActivities, onChange]);

  useEffect(() => {
    if (!noteDraftKey) return;
    const handler = setTimeout(() => {
      const trimmed = notes.trim();
      if (!trimmed) {
        AsyncStorage.removeItem(noteDraftKey).catch(() => {});
        return;
      }
      AsyncStorage.setItem(noteDraftKey, trimmed).catch(() => {});
    }, 400);

    return () => clearTimeout(handler);
  }, [noteDraftKey, notes]);

  useEffect(() => {
    if (!activitiesKey || !hydratedActivitiesRef.current) return;
    AsyncStorage.setItem(activitiesKey, JSON.stringify(selectedActivities)).catch(() => {});
  }, [activitiesKey, selectedActivities]);

  const noteLength = notes.length;
  const noteTooLong = noteLength > NOTE_CHAR_LIMIT;
  const summaryBackground = useMemo(() => addAlpha(moodColor, 0.12), [moodColor]);

  const toggleTrigger = useCallback((id: string) => {
    setSelectedTriggers((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const toggleActivity = useCallback((label: string) => {
    setSelectedActivities((prev) => {
      const exists = prev.includes(label);
      if (exists) {
        return prev.filter((item) => item !== label);
      }
      return [...prev, label];
    });
  }, []);

  const handleCustomActivity = useCallback(() => {
    setCustomActivityDraft('');
    setCustomActivityModalVisible(true);
  }, []);

  const confirmCustomActivity = useCallback(() => {
    const sanitized = sanitizeText(customActivityDraft);
    if (!sanitized) {
      setCustomActivityModalVisible(false);
      return;
    }
    setSelectedActivities((prev) => {
      if (prev.includes(sanitized)) return prev;
      return [...prev, sanitized];
    });
    setCustomActivityModalVisible(false);
    Haptics.selectionAsync().catch(() => {});
  }, [customActivityDraft]);

  const resolveTriggerLabels = useCallback(
    () => mapTriggerIdsToLabels(selectedTriggers),
    [selectedTriggers],
  );

  const handleSave = useCallback(async () => {
    if (noteTooLong || isSaving) return;
    const payload = {
      notes: sanitizeText(notes),
      triggers: resolveTriggerLabels(),
      activities: selectedActivities,
    };

    const result = await Promise.resolve(onSave(payload));
    if (result !== false && noteDraftKey) {
      AsyncStorage.removeItem(noteDraftKey).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [isSaving, noteDraftKey, noteTooLong, notes, onSave, resolveTriggerLabels, selectedActivities]);

  const handleSavePress = useCallback(() => {
    handleSave().catch(() => {});
  }, [handleSave]);

  const triggerChips = useMemo(
    () =>
      TRIGGER_OPTIONS.map((option) => (
        <TriggerChip
          key={option.id}
          label={option.label}
          icon={option.icon}
          selected={selectedTriggers.includes(option.id)}
          color={moodColor}
          onPress={() => {
            toggleTrigger(option.id);
            Haptics.selectionAsync().catch(() => {});
          }}
        />
      )),
    [moodColor, selectedTriggers, toggleTrigger]
  );

  const activityChips = useMemo(
    () =>
      ACTIVITY_OPTIONS.map((option) => (
        <ActivityChip
          key={option.id}
          label={option.label}
          icon={option.icon}
          selected={selectedActivities.includes(option.label)}
          accent={moodColor}
          onPress={() => {
            if (option.id === 'other') {
              handleCustomActivity();
              return;
            }
            toggleActivity(option.label);
            Haptics.selectionAsync().catch(() => {});
          }}
        />
      )),
    [handleCustomActivity, moodColor, selectedActivities, toggleActivity]
  );

  const customActivities = useMemo(
    () => selectedActivities.filter((label) => !ACTIVITY_OPTIONS.some((opt) => opt.label === label)),
    [selectedActivities]
  );

  const isSaveDisabled = isSaving || noteTooLong;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.headerButton} accessibilityRole="button">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#6B7280" />
          </Pressable>
          <Text style={styles.headerTitle}>Detaylar</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.summaryCard, { backgroundColor: summaryBackground }]}
            accessible
            accessibilityLabel={`Seçili mood: ${moodLabel}, Enerji: ${energyLabel}`}
          >
            <View style={styles.summaryMoodRow}>
              <MaterialCommunityIcons name="emoticon-outline" size={18} color={moodColor} />
              <Text style={[styles.summaryMood, { color: moodColor }]}>{moodLabel}</Text>
            </View>
            <View style={styles.summaryMoodRow}>
              <MaterialCommunityIcons name="flash-outline" size={18} color={moodColor} />
              <Text style={styles.summaryEnergy}>{energyLabel}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bugün seni en çok etkileyenler</Text>
            <Text style={styles.sectionHint}>Birden fazla seçim yapabilirsin.</Text>
            <View style={styles.chipRow}>{triggerChips}</View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not</Text>
            <Text style={styles.sectionHint}>Düşüncelerin yalnızca sana görünür.</Text>
            <TextInput
              style={[styles.textInput, noteTooLong && styles.textInputError]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Bugünü nasıl deneyimledin?"
              multiline
              maxLength={NOTE_CHAR_LIMIT + 200}
              numberOfLines={6}
              textAlignVertical="top"
              accessibilityLabel="Mood notu"
            />
            <View style={styles.noteFooter}>
              {noteTooLong ? (
                <Text style={styles.noteError}>Not {NOTE_CHAR_LIMIT} karakteri geçemez.</Text>
              ) : (
                <View style={styles.notePlaceholder} />
              )}
              <Text style={[styles.charCount, noteTooLong && styles.noteError]}>
                {noteLength}/{NOTE_CHAR_LIMIT}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktiviteler</Text>
            <Text style={styles.sectionHint}>Bugün yaptığın aktiviteleri seç.</Text>
            <View style={styles.activityRow}>{activityChips}</View>
            {customActivities.length > 0 && (
              <View style={styles.customActivityContainer}>
                {customActivities.map((label) => (
                  <TouchableOpacity
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} aktivitesini kaldır`}
                    onPress={() => toggleActivity(label)}
                    style={[styles.customActivityChip, { borderColor: moodColor }]}
                  >
                    <Text style={[styles.customActivityText, { color: moodColor }]}>{label}</Text>
                    <MaterialCommunityIcons name="close" size={16} color={moodColor} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.secondaryButton} onPress={onBack} accessibilityRole="button">
            <MaterialCommunityIcons name="arrow-left" size={18} color="#6B7280" />
            <Text style={styles.secondaryText}>Geri</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: isSaveDisabled ? '#CBD5F5' : moodColor }]}
            onPress={handleSavePress}
            disabled={isSaveDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaveDisabled }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.primaryText}>Kaydet</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={customActivityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomActivityModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomActivityModalVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Yeni aktivite</Text>
            <TextInput
              style={styles.modalInput}
              value={customActivityDraft}
              onChangeText={setCustomActivityDraft}
              placeholder="Örn. Doğa yürüyüşü"
              autoFocus
              onSubmitEditing={confirmCustomActivity}
              blurOnSubmit
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondary}
                onPress={() => {
                  setCustomActivityModalVisible(false);
                  setCustomActivityDraft('');
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.modalSecondaryText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimary, { backgroundColor: moodColor }]}
                onPress={confirmCustomActivity}
              >
                <Text style={styles.modalPrimaryText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerPlaceholder: {
    width: 32,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryMood: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryEnergy: {
    fontSize: 14,
    color: '#475569',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  chipSelected: {
    backgroundColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 130,
    lineHeight: 22,
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  notePlaceholder: {
    height: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  noteError: {
    color: '#EF4444',
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  activityChipSelected: {
    borderColor: '#2563EB',
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  customActivityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  customActivityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  customActivityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
