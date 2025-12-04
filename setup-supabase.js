#!/usr/bin/env node

/**
 * Supabase Setup Script for Network Rewind
 * This script will set up the required database schema
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ufqjnesldbacyltbsvys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcWpuZXNsZGJhY3lsdGJzdnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjA4MTUsImV4cCI6MjA3NjI5NjgxNX0.9lZXSp3mRNb9h4Q0aO5wKouZ5yp8FVjotJunFF_bu4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDatabase() {
  console.log('🚀 Setting up Supabase for Network Rewind...\n');

  // Test connection
  console.log('📡 Testing connection...');
  try {
    const { data, error } = await supabase.from('service_metrics_snapshots').select('count', { count: 'exact', head: true });

    if (error && error.code === '42P01') {
      console.log('❌ Table does not exist. Creating...\n');
      console.log('⚠️  Note: Creating tables requires manual setup via Supabase dashboard');
      console.log('📋 Please follow these steps:');
      console.log('');
      console.log('1. Go to: https://supabase.com/dashboard/project/ufqjnesldbacyltbsvys/sql');
      console.log('2. Copy and paste the contents of supabase-schema.sql');
      console.log('3. Click "Run" to execute the SQL');
      console.log('4. Run this script again to verify');
      console.log('');
      process.exit(1);
    } else if (error) {
      console.log('❌ Connection error:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Connection successful!');
      console.log(`✅ Table exists with ${data?.length || 0} records`);
      console.log('');
      console.log('🎉 Supabase is configured and ready!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Deploy your application');
      console.log('2. Navigate to Service Levels page');
      console.log('3. Select a service');
      console.log('4. The Network Rewind slider will appear after 15 minutes of data collection');
      console.log('');
      console.log('📊 Free Tier Usage:');
      console.log('   - Estimated storage: ~8.6 MB for 90 days');
      console.log('   - Database limit: 500 MB');
      console.log('   - ✅ Well within free tier limits!');
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
