import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ugtqsmrgwnyxzuwrolcz.supabase.co";

const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndHFzbXJnd255eHp1d3JvbGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNTQ5NTYsImV4cCI6MjA5NzgzMDk1Nn0.iXYxTbIEMWPZBzxjBmLpCwixWl6mnmrFXHUxxSP9_M8";

export const supabase = createClient(supabaseUrl, supabaseKey);