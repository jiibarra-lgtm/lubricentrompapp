import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// mismo proyecto de Supabase que usa el sitio principal de Lubricentro MP,
// así los datos de vehículos/historial están siempre sincronizados
const SUPABASE_URL = "https://klqlmmnwzouwznfpbvfm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtscWxtbW53em91d3puZnBidmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTczMjksImV4cCI6MjEwMzk3MzMyOX0.4AwRxo2kA5WmNaQn2_Ri2AnHWPWItpt_7DQ9ILIEKMY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
