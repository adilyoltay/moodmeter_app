import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CompletionStepProps } from './types';

export function CompletionStep({ accentColor, onClose, summary }: CompletionStepProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: accentColor }]}>Check-in tamamlandı</Text>
      <Text style={styles.subtitle}>
        Duygu kaydınız başarıyla oluşturuldu. Günlük akışınıza dönmeye hazırsınız.
      </Text>
      {summary ? <View style={styles.summary}>{summary}</View> : null}
      <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onClose}>
        <Text style={styles.buttonText}>Kapat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    color: '#4B5563',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 16,
  },
  summary: {
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompletionStep;
