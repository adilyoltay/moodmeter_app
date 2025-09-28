/**
 * 🔍 Usage Audit System - Core Logger
 * 
 * Minimal overhead, privacy-first usage tracking
 * for identifying unused code in production scenarios.
 * 
 * ONLY ACTIVE when USAGE_AUDIT=true
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Basit, hafif event kuyruğu. PII loglamaz.
export type UsageEvent =
  | { t: 'screen_view'; screen: string; ts: number }
  | { t: 'component_mount'; name: string; file?: string; line?: number; ts: number }
  | { t: 'svc_call'; id: string; ts: number }
  | { t: 'network'; method: string; url: string; status?: number; ts: number }
  | { t: 'info'; msg: string; ts: number };

type Sink = (batch: UsageEvent[]) => Promise<void>;

let queue: UsageEvent[] = [];
let timer: any;
let enabled = false;
let sink: Sink | null = null;
let sessionId = '';

/**
 * Initialize usage tracking system
 */
export function initUsage(opts: { enabled: boolean; sink?: Sink; flushMs?: number }) {
  enabled = !!opts.enabled;
  sink = opts.sink ?? defaultAsyncStorageSink;
  sessionId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (enabled) {
    timer = setInterval(flush, opts.flushMs ?? 3000);
    trackInfo('usage_audit_started');
    console.log('🔍 Usage Audit System ACTIVE - Session:', sessionId);
  }
}

/**
 * Stop usage tracking and flush remaining events
 */
export function stopUsage() {
  enabled = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  trackInfo('usage_audit_stopped');
  return flush();
}

/**
 * Track a usage event
 */
export function track(e: UsageEvent) {
  if (!enabled) return;
  queue.push(e);
  if (queue.length > 200) void flush(); // Prevent memory overflow
}

function trackInfo(msg: string) { 
  track({ t: 'info', msg, ts: Date.now() }); 
}

/**
 * Flush events to sink
 */
export async function flush() {
  if (!enabled || !sink || queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try { 
    await sink(batch); 
  } catch (error) { 
    console.warn('🔍 Usage flush failed:', error);
  }
}

// ---- Event Helpers ----

export const trackScreen = (screen: string) =>
  track({ t: 'screen_view', screen, ts: Date.now() });

export const trackComponentMount = (name: string, file?: string, line?: number) =>
  track({ t: 'component_mount', name, file, line, ts: Date.now() });

export const trackSvcCall = (id: string) =>
  track({ t: 'svc_call', id, ts: Date.now() });

export const trackNetwork = (method: string, url: string, status?: number) =>
  track({ t: 'network', method, url: sanitizeUrl(url), status, ts: Date.now() });

// ---- Sinks ----

const defaultConsoleSink: Sink = async (batch) => {
  console.log('[USAGE AUDIT]', batch.length, 'events');
  // Uncomment for detailed logging:
  // batch.forEach(e => console.log('  ', e));
};

const defaultAsyncStorageSink: Sink = async (batch) => {
  try {
    const key = `usage_audit_${sessionId}`;
    const existing = await AsyncStorage.getItem(key);
    const existingEvents = existing ? JSON.parse(existing) : [];
    const combined = [...existingEvents, ...batch];
    await AsyncStorage.setItem(key, JSON.stringify(combined));
  } catch (error) {
    console.warn('🔍 AsyncStorage sink failed:', error);
    // Fallback to console
    console.log('[USAGE AUDIT - FALLBACK]', batch.length, 'events');
  }
};

// ---- URL Sanitization ----

/**
 * Remove sensitive data from URLs (query params, etc.)
 */
function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = ''; // Remove query parameters
    u.hash = '';   // Remove hash
    return u.origin + u.pathname;
  } catch { 
    // Not a valid URL, return as-is but truncate if too long
    return url.length > 100 ? url.substring(0, 100) + '...' : url;
  }
}

// ---- Service Wrapper Helper ----

/**
 * Wrap a service function to track its usage
 */
export function wrapSvc<T extends (...args: any[]) => any>(id: string, fn: T): T {
  const wrapped: any = (...args: any[]) => {
    trackSvcCall(id);
    return fn(...args);
  };
  
  // Preserve function name for debugging
  Object.defineProperty(wrapped, 'name', { 
    value: `tracked_${id.replace(/[^\w]/g, '_')}` 
  });
  
  return wrapped as T;
}

// ---- Export Session Info ----

/**
 * Get current session info for reporting
 */
export function getSessionInfo() {
  return {
    sessionId,
    enabled,
    queueLength: queue.length,
    startTime: sessionId.split('_')[1]
  };
}

/**
 * Export usage data for analysis
 */
export async function exportUsageData(): Promise<UsageEvent[]> {
  await flush(); // Ensure all events are saved
  
  try {
    const key = `usage_audit_${sessionId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('🔍 Export usage data failed:', error);
    return [];
  }
}

/**
 * Clear usage data
 */
export async function clearUsageData(): Promise<void> {
  try {
    const key = `usage_audit_${sessionId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('🔍 Clear usage data failed:', error);
  }
}
