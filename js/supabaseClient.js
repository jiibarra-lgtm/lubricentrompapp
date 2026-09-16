import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rzaynyxqgczltvjsjqvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXlueXhxZ2N6bHR2anNqcXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MTAzMDEsImV4cCI6MjEwNTA4NjMwMX0.4JmaSFZeOmbEL1y1uRLrFTGutchEygAbo72pHTMwfNA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
