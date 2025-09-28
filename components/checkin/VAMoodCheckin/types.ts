import type { ReactNode } from 'react';

export interface VAMoodCheckinProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete?: (result: any) => void;
  disableVoice?: boolean;
  initialMEA?: { mood: number; energy: number; anxiety: number } | null;
  serviceMeta?: any | null;
  autoVoiceStart?: boolean;
  forceFullScreen?: boolean;
}

export type VAMoodCheckinStep = 'mood' | 'details' | 'completion';

export interface MoodDetailsPayload {
  notes: string;
  triggers: string[];
  activities: string[];
}

export interface CompletionStepProps {
  accentColor: string;
  onClose: () => void;
  summary?: ReactNode;
}
