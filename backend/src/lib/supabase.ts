import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '..', '..', '.env') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!

// Use service role key if available (not placeholder), otherwise use anon key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseKey = (serviceKey && !serviceKey.startsWith('PLACEHOLDER'))
  ? serviceKey
  : (anonKey || '')

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] Missing Supabase environment variables. DB operations will fail.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface DbPlayer {
  id: string
  emoji: string
  nickname: string
  created_at: string
}

export interface DbGame {
  id: string
  figure_name: string
  figure_dynasty: string
  status: 'active' | 'completed'
  started_at: string
  completed_at: string | null
  winner_player_id: string | null
}

export interface DbQuestion {
  id: string
  game_id: string
  player_id: string
  content: string
  ai_answer: '是' | '不是' | '不确定' | '无关' | '猜对了'
  sequence: number
  created_at: string
}
