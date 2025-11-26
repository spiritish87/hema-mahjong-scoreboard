import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekzzeccnojwlxaoqagst.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrenplY2Nub2p3bHhhb3FhZ3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzA4MzQsImV4cCI6MjA3OTc0NjgzNH0.2vflSBJvF4MJnkT8Ox-xy3ynmGq1bejUMqcGYKUSYbo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
