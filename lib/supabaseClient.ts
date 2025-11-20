import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kgwpxqwlqnfvbzyjtkxi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnd3B4cXdscW5mdmJ6eWp0a3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwMDg5MzgsImV4cCI6MjA2MDU4NDkzOH0.7g6oVGW-WFy5zB_Uwi9xLr5XciCjSR5tXAI0FsommwY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);