import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://njsccgnyuxztxcrdbeso.supabase.co'
const supabaseAnonKey = 'sb_publishable_9VSvojmqtaw9vU0SFX6Zyw_af-Pbqs6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
