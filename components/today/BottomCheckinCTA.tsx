import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getGradientFromBase } from '@/utils/colorUtils';

type RoutingResult = {
  type: 'MOOD' | 'BREATHWORK' | 'UNKNOWN';
  confidence: number;
  screen?: string;
  params?: any;
  status?: 'SUCCESS' | 'QUEUED_OFFLINE';
  queueItemId?: string;
  toastShown?: boolean;
};

type Props = {
  isVisible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onComplete: (routingResult?: RoutingResult) => void;
  accentColor?: string;
  gradientColors?: [string, string];
  onQuickVoice?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  lastMoodEntry?: any;
  pendingQueueCount?: number;
  onOfflineEnqueue?: () => void;
  onManageSync?: () => void;
};

/**
 * BottomCheckinCTA - Simplified Direct Check-in Button
 * 
 * Direkt detaylı VA check-in formuna yönlendirir.
 * Hızlı mood paneli kaldırıldı.
 */
export default function BottomCheckinCTA({
  onOpen,
  accentColor = '#10B981',
  gradientColors,
}: Props) {
  const insets = useSafeAreaInsets();
  
  const buttonGradient = gradientColors || getGradientFromBase(accentColor);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onOpen?.();
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom ? insets.bottom / 2 : 12 }]}>
      <View style={styles.buttonWrapper}>
        <LinearGradient
          colors={buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
        />
        <TouchableOpacity
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel="Detaylı mood check-in"
          accessibilityHint="VA form ile mood kaydı yap"
          style={styles.buttonContent}
        >
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Mood Check-in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    position: 'relative',
  },
  buttonWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});