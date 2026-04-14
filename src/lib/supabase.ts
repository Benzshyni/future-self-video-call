import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return url.startsWith('http');
  } catch {
    return false;
  }
};

const effectiveUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://ynjogoeqclmfdknvdjvp.supabase.co';
const effectiveKey = supabaseAnonKey || 'placeholder-key';

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  console.warn('Supabase credentials missing or invalid. Database features will be disabled.');
}

export const supabase = createClient(effectiveUrl, effectiveKey);
