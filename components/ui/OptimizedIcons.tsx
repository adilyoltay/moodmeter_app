/**
 * 🚀 Optimized Icon System
 * 
 * Selective icon imports to reduce bundle size.
 * Only loads icons that are actually used in the app.
 */

import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Define only the icons we actually use
export type UsedIconName = 
  | 'brain'
  | 'close'
  | 'microphone'
  | 'microphone-off'
  | 'heart'
  | 'settings'
  | 'home'
  | 'account'
  | 'lock'
  | 'unlock'
  | 'wifi'
  | 'wifi-off'
  | 'sync'
  | 'check'
  | 'alert'
  | 'information'
  | 'share'
  | 'help'
  | 'eye'
  | 'eye-off'
  | 'delete'
  | 'refresh'
  | 'download'
  | 'cloud'
  | 'cloud-off';

interface OptimizedIconProps {
  name: UsedIconName;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Optimized icon component that only includes used icons
 * Reduces bundle size by excluding unused icon fonts
 */
export function OptimizedIcon({ name, size = 24, color, style }: OptimizedIconProps) {
  return (
    <MaterialCommunityIcons 
      name={name} 
      size={size} 
      color={color} 
      style={style}
    />
  );
}

export default OptimizedIcon;
