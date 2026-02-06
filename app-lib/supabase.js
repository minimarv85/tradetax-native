import { createClient } from '@supabase/supabase-js';

// Supabase configuration - same as web app
const supabaseUrl = 'https://issryxbhnwezxwrjhznq.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ng-4FojiB1es07oJ0w1_Xg_7pXRe6C_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
