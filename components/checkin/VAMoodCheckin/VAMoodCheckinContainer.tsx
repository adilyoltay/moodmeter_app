import React from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MoodPadStep } from './MoodPadStep';
import { VoiceRecordingStep } from './VoiceRecordingStep';
import MoodDetailsStep from './MoodDetailsStep';
import { CompletionStep } from './CompletionStep';
import { useVAMoodCheckinLogic } from './useVAMoodCheckinLogic';
import type { VAMoodCheckinProps } from './types';
import { ComponentErrorBoundary, ScreenErrorBoundary } from '@/components/error';

const STEP_TITLES: Record<string, string> = {
  mood: 'Duygu Kontrolü',
  details: 'Detaylar',
  completion: 'Tamamlandı',
};

export function VAMoodCheckinContainer(props: VAMoodCheckinProps) {
  const {
    accentColor,
    currentStep,
    disableVoice,
    isRecording,
    isProcessing,
    recordButtonStyle,
    showTranscript,
    transcript,
    handleVoiceToggle,
    mood01,
    moodColor,
    valenceText,
    energyText,
    serviceMeta,
    x,
    y,
    updateXY,
    handleSliderChange,
    handleNext,
    handleBack,
    handleSave,
    handleDetailsChange,
    detailsDraft,
    detectedTriggers,
    isSavingEntry,
    modalPresentation,
    userId,
  } = useVAMoodCheckinLogic(props);

  const title = STEP_TITLES[currentStep] ?? 'Duygu Kontrolü';

  return (
    <ScreenErrorBoundary screen="va-mood-checkin" telemetryExtra={{ step: currentStep }}>
      <Modal
        visible={props.isVisible}
        animationType="slide"
        presentationStyle={modalPresentation}
        onRequestClose={props.onClose}
        transparent={false}
        statusBarTranslucent={props.forceFullScreen}
        hardwareAccelerated={props.forceFullScreen}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={props.onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </Pressable>
            <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
            <View style={styles.placeholder} />
          </View>

          {currentStep === 'mood' && (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <ComponentErrorBoundary componentName="MoodPadStep">
                <MoodPadStep
                  accentColor={accentColor}
                  moodColor={moodColor}
                  valenceText={valenceText}
                  energyText={energyText}
                  mood01={mood01}
                  serviceMeta={serviceMeta}
                  x={x}
                  y={y}
                  onChangeXY={updateXY}
                  onSliderChange={handleSliderChange}
                />
              </ComponentErrorBoundary>

              {!disableVoice && (
                <ComponentErrorBoundary componentName="VoiceRecordingStep">
                  <VoiceRecordingStep
                    isRecording={isRecording}
                    isProcessing={isProcessing}
                    onToggle={handleVoiceToggle}
                    recordButtonStyle={recordButtonStyle}
                    showTranscript={showTranscript}
                    transcript={transcript}
                  />
                </ComponentErrorBoundary>
              )}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.primary, { backgroundColor: accentColor }]}
                  onPress={handleNext}
                >
                  <Text style={styles.btnTxt}>İleri</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="#FFFFFF"
                    style={styles.btnIcon}
                  />
                </Pressable>
              </View>
            </ScrollView>
          )}

          {currentStep === 'details' && (
            <ComponentErrorBoundary componentName="MoodDetailsStep">
              <MoodDetailsStep
                transcript={transcript}
                detectedTriggers={detectedTriggers}
                moodLabel={valenceText}
                energyLabel={energyText}
                userId={userId}
                initialNotes={detailsDraft.notes}
                initialTriggers={detailsDraft.triggers}
                initialActivities={detailsDraft.activities}
                isSaving={isSavingEntry}
                onBack={handleBack}
                onChange={handleDetailsChange}
                onSave={handleSave}
                moodColor={accentColor}
              />
            </ComponentErrorBoundary>
          )}

          {currentStep === 'completion' && (
            <ComponentErrorBoundary componentName="CompletionStep">
              <CompletionStep accentColor={accentColor} onClose={props.onClose} />
            </ComponentErrorBoundary>
          )}
        </SafeAreaView>
      </Modal>
    </ScreenErrorBoundary>
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
    paddingVertical: 16,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
  },
  primary: {
    backgroundColor: '#2563EB',
  },
  btnIcon: {
    marginLeft: 8,
  },
  btnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VAMoodCheckinContainer;
