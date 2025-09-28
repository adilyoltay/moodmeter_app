import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ title: 'Hoş Geldin', headerBackVisible: false }} />
      <Stack.Screen name="motivation" options={{ title: 'Motivasyon' }} />
      <Stack.Screen name="first-mood" options={{ title: 'İlk Mood' }} />
      <Stack.Screen name="lifestyle" options={{ title: 'Yaşam Tarzı' }} />
      <Stack.Screen name="notifications" options={{ title: 'Hatırlatmalar' }} />
      <Stack.Screen name="summary" options={{ title: 'Özet' }} />
    </Stack>
  );
}
