import type { SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, supabaseAnonKey);
}

export type ContactRecord = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  singer_or_musician: 'Singer' | 'Musician';
  part_or_instrument: string;
  church_name: string;
  church_letter_submitted: boolean;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  contact_id: string;
  event_date: string;
  status: 'Present' | 'Late' | 'Absent';
  check_in_time: string | null;
  notes?: string;
};

export type EventSession = {
  id: string;
  title: string;
  event_date: string;
  type: 'Rehearsal' | 'Service' | 'Meeting';
  created_by: string;
};

export const appConfig = {
  appName: 'FOP Attendance CRM',
  roleLabels: {
    superAdmin: 'Super admin',
    admin: 'Admin',
  },
};
