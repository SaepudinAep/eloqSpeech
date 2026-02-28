// [ COPY BUTTON - ELOQSPEECH CONFIG ]
// Konfigurasi Utama dan Inisialisasi Supabase Client

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Sumber Data: Konfigurasi Supabase & Google Maps API
export const SUPABASE_CONFIG = {
  URL: "https://vkienlwfzvgneyxqzgcx.supabase.co",
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraWVubHdmenZnbmV5eHF6Z2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzc0MjIsImV4cCI6MjA4NjI1MzQyMn0.dxNuEIMwi3NCHvYTjDsdP4XJC6GtsKkyaOP5FdfCs9w"
};

// Inisialisasi Instance Supabase
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);