import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// Using existing project credentials from utils/supabase/info.tsx
const SUPABASE_URL = 'https://ufqjnesldbacyltbsvys.supabase.co';

// This is the anon key (public), not the service role key
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcWpuZXNsZGJhY3lsdGJzdnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjA4MTUsImV4cCI6MjA3NjI5NjgxNX0.9lZXSp3mRNb9h4Q0aO5wKouZ5yp8FVjotJunFF_bu4g';

// Create a single supabase client for interacting with your database
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'edge-services-site'
    }
  }
});

// Database types for TypeScript
export interface ServiceMetricsSnapshot {
  id?: string;
  service_id: string;
  service_name: string;
  timestamp: string;
  metrics: {
    throughput?: number;
    latency?: number;
    jitter?: number;
    packetLoss?: number;
    reliability?: number;
    uptime?: number;
    clientCount?: number;
    successRate?: number;
    errorRate?: number;
    averageRssi?: number;
    averageSnr?: number;
  };
  created_at?: string;
}

export interface NetworkSnapshot {
  id?: string;
  timestamp: string;
  site_id?: string;
  site_name?: string;
  total_services: number;
  total_clients: number;
  total_throughput: number;
  average_reliability: number;
  created_at?: string;
}
