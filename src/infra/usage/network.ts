/**
 * 🌐 Network Tracking for Usage Audit
 * 
 * Tracks network requests to identify which API endpoints
 * are actually used in real scenarios.
 */

import { trackNetwork } from './index';

let fetchPatched = false;

/**
 * Patch global fetch to track network requests
 */
export function patchFetch() {
  if (fetchPatched) return;
  fetchPatched = true;

  // @ts-ignore - Patching global fetch
  const originalFetch = global.fetch;
  
  // @ts-ignore
  global.fetch = async (input: RequestInfo, init?: RequestInit) => {
    const method = (init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input.toString();
    
    try {
      const response = await originalFetch(input, init);
      trackNetwork(method, url, response.status);
      return response;
    } catch (error) {
      trackNetwork(method, url); // Track failed requests too
      throw error;
    }
  };
  
  console.log('🔍 Global fetch patched for usage audit');
}

/**
 * Patch axios instance to track requests
 */
export function patchAxios(axiosInstance: any) {
  if (!axiosInstance) return;
  
  // Request interceptor
  axiosInstance.interceptors.request.use((config: any) => {
    (config as any).__usageAuditTs = Date.now();
    return config;
  });
  
  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response: any) => {
      const method = response.config?.method?.toUpperCase() || 'GET';
      const url = response.config?.url || '';
      trackNetwork(method, url, response.status);
      return response;
    },
    (error: any) => {
      const config = error?.config || {};
      const method = config.method?.toUpperCase() || 'GET';
      const url = config.url || '';
      const status = error?.response?.status;
      trackNetwork(method, url, status);
      return Promise.reject(error);
    }
  );
  
  console.log('🔍 Axios interceptors installed for usage audit');
}

/**
 * Patch Supabase client to track database operations
 */
export function patchSupabase(supabaseClient: any) {
  if (!supabaseClient) return;
  
  try {
    // Track Supabase REST operations
    const originalFrom = supabaseClient.from;
    supabaseClient.from = function(table: string) {
      trackNetwork('SUPABASE', `table:${table}`);
      return originalFrom.call(this, table);
    };
    
    // Track Auth operations
    if (supabaseClient.auth) {
      const originalSignIn = supabaseClient.auth.signInWithPassword;
      if (originalSignIn) {
        supabaseClient.auth.signInWithPassword = function(...args: any[]) {
          trackNetwork('AUTH', 'signInWithPassword');
          return originalSignIn.apply(this, args);
        };
      }
      
      const originalSignUp = supabaseClient.auth.signUp;
      if (originalSignUp) {
        supabaseClient.auth.signUp = function(...args: any[]) {
          trackNetwork('AUTH', 'signUp');
          return originalSignUp.apply(this, args);
        };
      }
    }
    
    console.log('🔍 Supabase client patched for usage audit');
  } catch (error) {
    console.warn('🔍 Supabase patching failed:', error);
  }
}
