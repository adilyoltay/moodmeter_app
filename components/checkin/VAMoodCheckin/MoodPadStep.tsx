import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import type { SharedValue } from 'react-native-reanimated';

import VAPad from '../VAPad';

interface MoodPadStepProps {
  accentColor: string;
  moodColor: string;
  valenceText: string;
  energyText: string;
  mood01: number;
  serviceMeta?: any | null;
  x: SharedValue<number>;
  y: SharedValue<number>;
  onChangeXY: (x: number, y: number) => void;
  onSliderChange: (value: number) => void;
}

const fmt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  return String(rounded);
};

export function MoodPadStep({
  accentColor,
  moodColor,
  valenceText,
  energyText,
  mood01,
  serviceMeta,
  x,
  y,
  onChangeXY,
  onSliderChange,
}: MoodPadStepProps) {
  const padSize = useMemo(() => {
    const { width } = Dimensions.get('window');
    return Math.min(width - 48, 340);
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>Şu anda nasıl hissettiğinizi seçin</Text>

      <VAPad x={x} y={y} onChangeXY={onChangeXY} color={moodColor} />

      <View style={styles.moodDisplay}>
        <Text style={[styles.moodLabel, { color: accentColor }]}>{valenceText}</Text>
        <Text style={styles.energyLabel}>{energyText}</Text>
      </View>

      {serviceMeta && (
        <View style={styles.metaCard}>
          <Text style={styles.metaTitle}>AI Tahmin</Text>
          <Text style={styles.metaText}>
            Kaynak: {serviceMeta.source || '—'} • Model: {serviceMeta.model || '—'}
          </Text>
          <Text style={styles.metaText}>
            MEA: mood={serviceMeta.prefillMEA?.mood ?? '—'}, energy={serviceMeta.prefillMEA?.energy ?? '—'}, anxiety={serviceMeta.prefillMEA?.anxiety ?? '—'}
            {serviceMeta.confidence != null ? ` • conf=${Math.round((serviceMeta.confidence || 0) * 100)}%` : ''}
          </Text>
          {serviceMeta.request_id ? (
            <Text style={styles.metaText}>
              Req: {String(serviceMeta.request_id).slice(0, 8)}
              {serviceMeta.elapsed_ms ? ` • ${serviceMeta.elapsed_ms}ms` : ''}
            </Text>
          ) : null}
          {serviceMeta.input_quality?.flags ? (
            <Text style={styles.metaText}>
              Flags: {
                Object.keys(serviceMeta.input_quality.flags)
                  .filter((key: string) => serviceMeta.input_quality.flags[key])
                  .join('|') || '—'
              }
            </Text>
          ) : null}
          {serviceMeta.metrics ? (
            <Text style={styles.metaText}>
              HRV: bpm={fmt(serviceMeta.metrics.bpm)} rmssd={fmt(serviceMeta.metrics.rmssd)} sdnn={fmt(serviceMeta.metrics.sdnn)} pNN50={fmt(serviceMeta.metrics.pnn50)}
            </Text>
          ) : null}
        </View>
      )}

      <View style={[styles.sliderSection, { width: padSize }]}> 
        <View style={[styles.sliderWrap, { width: padSize }]}> 
          <Slider
            value={mood01}
            onValueChange={onSliderChange}
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

        <View style={styles.scale}>
          <Text style={styles.scaleText}>Çok keyifsiz</Text>
          <Text style={styles.scaleText}>Nötr</Text>
          <Text style={styles.scaleText}>Çok keyifli</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    paddingHorizontal: 16,
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
    borderColor: '#E5E7EB',
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
    marginTop: 24,
  },
  sliderWrap: {
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
    width: '100%',
  },
  scaleText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
});

export default MoodPadStep;
