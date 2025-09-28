import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AnimatedButtonStyle } from './useVAMoodCheckinLogic';

interface VoiceRecordingStepProps {
  isRecording: boolean;
  isProcessing: boolean;
  onToggle: () => void;
  recordButtonStyle: AnimatedButtonStyle;
  showTranscript: boolean;
  transcript: string;
  disabled?: boolean;
}

export function VoiceRecordingStep({
  isRecording,
  isProcessing,
  onToggle,
  recordButtonStyle,
  showTranscript,
  transcript,
  disabled = false,
}: VoiceRecordingStepProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[styles.voiceButton, disabled && styles.voiceButtonDisabled]}
        onPress={onToggle}
        disabled={disabled || isProcessing}
        accessibilityLabel={isRecording ? 'Kaydı durdur' : 'Voice Check-in'}
      >
        <Animated.View style={[styles.voiceButtonInner, recordButtonStyle]}>
          {isProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={isRecording ? 'stop' : 'microphone'}
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

      {showTranscript && transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  voiceButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#12202b',
  },
  voiceButtonDisabled: {
    opacity: 0.4,
  },
  voiceButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButtonText: {
    color: '#e8f2ff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transcriptBox: {
    marginTop: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  transcriptText: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
});

export default VoiceRecordingStep;
