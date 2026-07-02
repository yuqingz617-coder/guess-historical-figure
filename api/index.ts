import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'

const app = new Hono()

app.use('*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// ---- Kimi (Moonshot) API helper ----
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

async function callKimi(systemPrompt: string, userMessage: string): Promise<string | null> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey || apiKey.startsWith('PLACEHOLDER')) {
    console.warn('[AI] No valid API key, using fallback')
    return null
  }

  try {
    const response = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 20,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('[AI] Kimi API error:', response.status)
      return null
    }

    const data = await response.json()
    return (data.choices?.[0]?.message?.content || '').trim()
  } catch (err) {
    console.error('[AI] Kimi API exception:', err)
    return null
  }
}

const FIVE_ANSWERS = ['是', '不是', '不确定', '无关', '猜对了']

function validateAnswer(text: string): string {
  const cleaned = text.replace(/[^一-鿿]/g, '').trim()
  for (const answer of FIVE_ANSWERS) {
    if (cleaned === answer || cleaned.startsWith(answer) || cleaned.includes(answer)) {
      return answer
    }
  }
  if (cleaned.includes('猜对') || cleaned.includes('正确') || cleaned.includes('恭喜')) return '猜对了'
  console.warn(`[AI] Non-standard answer: "${text}", falling back to 不确定`)
  return '不确定'
}

// Import and mount routes
// NOTE: For Vercel deployment, routes are inlined to avoid build issues
// with the pnpm workspace structure. During local dev, use the backend/ package.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// ---- Players ----
app.post('/api/players', async (c) => {
  const body = await c.req.json()
  const { emoji, nickname } = body

  if (!emoji || !nickname || nickname.length < 2 || nickname.length > 8) {
    return c.json({ error: '无效的昵称或头像' }, 400)
  }

  const { data, error } = await supabase
    .from('players')
    .insert({ emoji, nickname })
    .select()
    .single()

  if (error) return c.json({ error: '创建玩家失败' }, 500)
  return c.json(data, 201)
})

app.get('/api/players/:id', async (c) => {
  const { data, error } = await supabase
    .from('players')
    .select()
    .eq('id', c.req.param('id'))
    .single()

  if (error || !data) return c.json({ error: '玩家不存在' }, 404)
  return c.json(data)
})

// ---- Games ----
app.get('/api/games/active', async (c) => {
  const { data, error } = await supabase
    .from('games')
    .select()
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') return c.json({ error: '查询游戏失败' }, 500)
  return c.json({ game: data ?? null })
})

app.post('/api/games', async (c) => {
  // Get previously guessed names for dedup
  const { data: completed } = await supabase
    .from('games')
    .select('figure_name')
    .eq('status', 'completed')

  const guessed = new Set((completed || []).map(g => g.figure_name))
  const guessedList = Array.from(guessed)
  const excludeHint = guessedList.length > 0
    ? `\n\n以下人物已被猜过，绝对不能重复：${guessedList.join('、')}`
    : ''

  let name = ''
  let dynasty = ''

  // Try Kimi first for random figure generation
  const kimiResult = await callKimi(
    `你是中国古代历史人物生成器。仅返回格式："人物名称，朝代"，不要任何额外文字。人物需真实存在（1840年以前），知名度适中。`,
    `请随机生成一位中国古代历史人物${excludeHint}`
  )

  if (kimiResult) {
    const parts = kimiResult.split(/[,，]/)
    name = (parts[0] || '').replace(/^["'「『]|["'」』]$/g, '').trim()
    dynasty = (parts[1] || '').replace(/^["'「『]|["'」』]$/g, '').trim()
  }

  // Fallback if Kimi fails or returns invalid
  if (!name) {
    const FIGURES = [
      ['李白', '唐朝'], ['杜甫', '唐朝'], ['苏轼', '宋朝'], ['秦始皇', '秦朝'],
      ['诸葛亮', '三国'], ['关羽', '三国'], ['岳飞', '宋朝'], ['武则天', '唐朝'],
      ['康熙', '清朝'], ['成吉思汗', '元朝'], ['郑和', '明朝'], ['屈原', '战国'],
      ['王羲之', '东晋'], ['司马迁', '汉朝'], ['张衡', '汉朝'], ['曹操', '三国'],
      ['白居易', '唐朝'], ['辛弃疾', '宋朝'], ['文天祥', '宋朝'], ['林则徐', '清朝'],
    ]
    const available = FIGURES.filter(([n]) => !guessed.has(n))
    const pool = available.length > 0 ? available : FIGURES
    ;[name, dynasty] = pool[Math.floor(Math.random() * pool.length)]
  }

  const { data, error } = await supabase
    .from('games')
    .insert({ figure_name: name, figure_dynasty: dynasty, status: 'active' })
    .select()
    .single()

  if (error) return c.json({ error: '创建游戏失败' }, 500)
  return c.json(data, 201)
})

app.patch('/api/games/:id/complete', async (c) => {
  const body = await c.req.json()
  const { data, error } = await supabase
    .from('games')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      winner_player_id: body.winnerPlayerId || null,
    })
    .eq('id', c.req.param('id'))
    .select()
    .single()

  if (error) return c.json({ error: '更新游戏失败' }, 500)
  return c.json(data)
})

app.get('/api/games/completed', async (c) => {
  const { data, error } = await supabase
    .from('games')
    .select('id, figure_name, figure_dynasty, status, started_at, completed_at, winner_player_id, questions(count)')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error) return c.json({ error: '查询游戏失败' }, 500)
  return c.json({ games: data || [] })
})

// ---- Questions ----
app.post('/api/questions', async (c) => {
  const body = await c.req.json()
  const { gameId, playerId, content } = body

  if (!gameId || !playerId || !content || content.length > 200) {
    return c.json({ error: '无效的请求参数' }, 400)
  }

  // Get game
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single()

  if (gameErr || !game) return c.json({ error: '游戏不存在' }, 404)
  if (game.status !== 'active') return c.json({ error: '游戏已结束' }, 400)

  // Get player
  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select()
    .eq('id', playerId)
    .single()

  if (playerErr || !player) return c.json({ error: '玩家不存在' }, 404)

  // Get next sequence
  const { data: last } = await supabase
    .from('questions')
    .select('sequence')
    .eq('game_id', gameId)
    .order('sequence', { ascending: false })
    .limit(1)
    .single()

  const nextSeq = (last?.sequence ?? 0) + 1

  // Get question history for AI context
  const { data: history } = await supabase
    .from('questions')
    .select('content, ai_answer')
    .eq('game_id', gameId)
    .order('sequence', { ascending: true })

  const historyTexts = (history || []).map(
    (q: Record<string, unknown>) => `问：${q.content} → 答：${q.ai_answer}`
  ).join('\n')

  const historyContext = historyTexts
    ? `\n\n已经问过的问题和回答：\n${historyTexts}`
    : ''

  // Use Kimi to judge the question
  const kimiResult = await callKimi(
    `你正在主持"猜历史人物"游戏。谜底是：${game.figure_name}（${game.figure_dynasty}）。

你的唯一任务：判断玩家的提问，从以下五个答案中选择一个回复：
- "是"：提问内容与谜底人物信息完全或基本符合
- "不是"：提问内容与谜底人物信息明确矛盾
- "不确定"：提问内容涉及历史记载模糊、有争议或无法确定的信息
- "无关"：提问内容与判断人物身份完全无关（如闲聊）
- "猜对了"：玩家准确说出了谜底的人名（包括字、号、别称等）

重要：你只能回复这五个词中的一个，不要解释、不要补充。`,
    `${content}${historyContext}`
  )

  let aiAnswer: string
  if (kimiResult) {
    aiAnswer = validateAnswer(kimiResult)
  } else {
    // Fallback: simple string matching
    const lowerQ = content.toLowerCase()
    if (lowerQ.includes(game.figure_name) || lowerQ.includes(game.figure_name.toLowerCase())) {
      aiAnswer = '猜对了'
    } else if (lowerQ.includes(game.figure_dynasty.replace('朝', ''))) {
      aiAnswer = '是'
    } else if (lowerQ.length < 2) {
      aiAnswer = '无关'
    } else {
      aiAnswer = '不确定'
    }
  }

  // Insert
  const { data: question, error: insertErr } = await supabase
    .from('questions')
    .insert({
      game_id: gameId,
      player_id: playerId,
      content,
      ai_answer: aiAnswer,
      sequence: nextSeq,
    })
    .select()
    .single()

  if (insertErr) return c.json({ error: '记录问题失败' }, 500)

  // If correct, complete game
  if (aiAnswer === '猜对了') {
    await supabase
      .from('games')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        winner_player_id: playerId,
      })
      .eq('id', gameId)
  }

  return c.json({
    ...question,
    player_emoji: player.emoji,
    player_nickname: player.nickname,
    is_correct: aiAnswer === '猜对了',
  }, 201)
})

app.get('/api/questions', async (c) => {
  const gameId = c.req.query('gameId')
  if (!gameId) return c.json({ error: '缺少 gameId 参数' }, 400)

  const { data, error } = await supabase
    .from('questions')
    .select(`
      id, game_id, player_id, content, ai_answer, sequence, created_at,
      players!inner(emoji, nickname)
    `)
    .eq('game_id', gameId)
    .order('sequence', { ascending: true })

  if (error) return c.json({ error: '查询问题失败' }, 500)

  const questions = (data || []).map((q: Record<string, unknown>) => {
    const p = q.players as { emoji: string; nickname: string } | null
    return {
      id: q.id,
      gameId: q.game_id,
      playerId: q.player_id,
      content: q.content,
      aiAnswer: q.ai_answer,
      sequence: q.sequence,
      createdAt: q.created_at,
      playerEmoji: p?.emoji ?? '❓',
      playerNickname: p?.nickname ?? '未知',
    }
  })

  return c.json({ questions })
})

// ---- Stats ----
app.get('/api/stats', async (c) => {
  const { count: totalCorrect } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  return c.json({
    totalCorrect: totalCorrect ?? 0,
    totalQuestions: totalQuestions ?? 0,
  })
})

export default handle(app)
