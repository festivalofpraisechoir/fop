import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export type ContactRecord = {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  singer_or_musician: 'Singer' | 'Musician';
  part_or_instrument: string | null;
  church_name: string | null;
  church_letter_submitted: boolean;
  badge_collected: boolean;
  barcode_code: string | null;
  registered_at: string | null;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  contact_id: string;
  event_id: string;
  status: 'Present' | 'Late' | 'Absent' | 'Permission';
  check_in_time: string | null;
  notes?: string | null;
};

export type EventSession = {
  id: string;
  title: string;
  event_date: string;
  type: 'Rehearsal' | 'Service' | 'Meeting';
  created_by: string | null;
  status: 'open' | 'closed';
};

export const appConfig = {
  appName: 'FOP Attendance',
  roleLabels: { super_admin: 'Super Admin', admin: 'Admin' },
};
