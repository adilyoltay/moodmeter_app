import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';

type ScreenLoaderProps = {
  message?: string;
};

export default function ScreenLoader({ message = 'Yükleniyor…' }: ScreenLoaderProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={Colors.primary.green} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.background,
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.text.secondary,
  },
});
