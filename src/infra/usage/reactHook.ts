/**
 * ⚛️ React Component Tracking for Usage Audit
 * 
 * Patches React.createElement to track component renders
 * in real usage scenarios. Only active when USAGE_AUDIT=true.
 */

import * as React from 'react';
import { trackComponentMount } from './index';

let installed = false;

/**
 * Install React.createElement hook to track component mounts
 * 
 * WARNING: Only use during audit sessions (short periods)
 * This patches React's core function and may impact performance
 */
export function installReactElementHook() {
  if (installed) return;
  installed = true;

  const originalCreateElement = React.createElement;
  
  // @ts-ignore - Patching React core function
  React.createElement = (type: any, props: any, ...children: any[]) => {
    try {
      // Skip host components (View, Text, etc.) - only track custom components
      const isHostComponent = typeof type === 'string';
      
      if (!isHostComponent && type) {
        const componentName = type?.displayName || type?.name || 'Anonymous';
        
        // Get source info from babel jsx-source plugin
        const source = props?.__source;
        const fileName = source?.fileName;
        const lineNumber = source?.lineNumber;
        
        // Only track components from our codebase (not node_modules)
        if (!fileName || !fileName.includes('node_modules')) {
          trackComponentMount(componentName, fileName, lineNumber);
        }
      }
    } catch (error) {
      // Silent failure - don't break app if tracking fails
      console.warn('🔍 Component tracking failed:', error);
    }
    
    // Call original createElement
    return originalCreateElement(type, props, ...children);
  };
  
  console.log('🔍 React.createElement hook installed for usage audit');
}

/**
 * Uninstall the React hook (restore original behavior)
 */
export function uninstallReactElementHook() {
  if (!installed) return;
  
  // Note: In practice, we can't easily restore the original function
  // This is why we recommend short audit sessions only
  console.log('🔍 React hook uninstall requested (restart app to fully restore)');
  installed = false;
}
