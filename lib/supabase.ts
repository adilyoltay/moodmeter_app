import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { getAppConfig } from '../configuration/appConfig'

const { supabase: supabaseConfig } = getAppConfig()
const supabaseUrl = supabaseConfig.url || ''
const supabaseAnonKey = supabaseConfig.anonKey || ''

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase environment variables are missing!')
  console.error('Please create a .env.local file with:')
  console.error('EXPO_PUBLIC_SUPABASE_URL=your_url')
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) 
