import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/vercel'

const app = new Hono()
app.use('*', cors())

// ---- In-memory store ----
// Note: On Vercel serverless, data resets on cold starts.
// For production, use a database (e.g., Vercel KV, Neon, Supabase).

interface Player { id: string; emoji: string; nickname: string; created_at: string }
interface Game { id: string; figure_name: string; figure_dynasty: string; status: string; started_at: string; completed_at: string | null; winner_player_id: string | null }
interface Question { id: string; game_id: string; player_id: string; content: string; ai_answer: string; sequence: number; created_at: string }

const store = {
  players: [] as Player[],
  games: [] as Game[],
  questions: [] as Question[],
}

function uid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

// ---- Kimi AI helper ----
const KIMI_URL = 'https://api.moonshot.cn/v1/chat/completions'
const ANSWERS = ['是', '不是', '不确定', '无关', '猜对了']

async function callAI(system: string, msg: string): Promise<string> {
  const key = process.env.CLAUDE_API_KEY
  if (!key) return ANSWERS[Math.floor(Math.random() * 3)]
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(KIMI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'moonshot-v1-8k', messages: [{ role: 'system', content: system }, { role: 'user', content: msg }], max_tokens: 20, temperature: 0.7 }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) return ANSWERS[Math.floor(Math.random() * 3)]
    const d = await res.json() as { choices?: [{ message?: { content?: string } }] }
    const text = (d.choices?.[0]?.message?.content || '').trim()
    for (const a of ANSWERS) { if (text.includes(a)) return a }
    return '不确定'
  } catch {
    return ANSWERS[Math.floor(Math.random() * 3)]
  }
}

async function genFigure(guessed: string[]): Promise<[string, string]> {
  const list = guessed.length > 0 ? `\n不能重复：${guessed.join('、')}` : ''
  const text = await callAI('你是历史人物生成器。仅返回"名称，朝代"，不要其他。', `随机生成一位中国古代人物${list}`)
  const parts = text.replace(/["'「」『』]/g, '').split(/[,，]/)
  const name = parts[0]?.trim()
  const dynasty = parts[1]?.trim()
  if (name && dynasty) return [name, dynasty]
  const fallbacks: [string, string][] = [
  ['李白', '唐朝'],
  ['苏轼', '宋朝'],
  ['秦始皇', '秦朝'],
  ['诸葛亮', '三国'],
  ['武则天', '唐朝'],
  ['岳飞', '宋朝'],
  ['康熙', '清朝'],
]
  const avail = fallbacks.filter(([n]) => !guessed.includes(n))
  return avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : fallbacks[Math.floor(Math.random() * fallbacks.length)]
}

// ---- Routes ----
app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/players', async (c) => {
  const { emoji, nickname } = await c.req.json()
  if (!emoji || !nickname || nickname.length < 2 || nickname.length > 8) {
    return c.json({ error: '无效输入' }, 400)
  }
  const p: Player = { id: uid(), emoji, nickname, created_at: new Date().toISOString() }
  store.players.push(p)
  return c.json(p, 201)
})

app.get('/api/players/:id', (c) => {
  const p = store.players.find(x => x.id === c.req.param('id'))
  return p ? c.json(p) : c.json({ error: '玩家不存在' }, 404)
})

app.get('/api/games/active', (c) => {
  const g = store.games.filter(x => x.status === 'active').sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
  return c.json({ game: g ?? null })
})

app.post('/api/games', async (c) => {
  const guessed = store.games.filter(x => x.status === 'completed').map(x => x.figure_name)
  const [name, dynasty] = await genFigure(guessed)
  const g: Game = { id: uid(), figure_name: name, figure_dynasty: dynasty, status: 'active', started_at: new Date().toISOString(), completed_at: null, winner_player_id: null }
  store.games.push(g)
  return c.json(g, 201)
})

app.patch('/api/games/:id/complete', async (c) => {
  const g = store.games.find(x => x.id === c.req.param('id'))
  if (!g) return c.json({ error: '游戏不存在' }, 404)
  const { winnerPlayerId } = await c.req.json()
  g.status = 'completed'; g.completed_at = new Date().toISOString(); g.winner_player_id = winnerPlayerId ?? null
  return c.json(g)
})

app.get('/api/games/completed', (c) => {
  const games = store.games.filter(x => x.status === 'completed')
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
    .map(g => ({ ...g, questions: [{ count: store.questions.filter(q => q.game_id === g.id).length }] }))
  return c.json({ games })
})

app.post('/api/questions', async (c) => {
  const { gameId, playerId, content } = await c.req.json()
  if (!gameId || !playerId || !content || content.length > 200) return c.json({ error: '无效参数' }, 400)

  const game = store.games.find(x => x.id === gameId)
  if (!game || game.status !== 'active') return c.json({ error: '游戏不可用' }, 400)

  const player = store.players.find(x => x.id === playerId)
  if (!player) return c.json({ error: '玩家不存在' }, 400)

  const history = store.questions.filter(q => q.game_id === gameId)
    .map(q => `问：${q.content} → ${q.ai_answer}`).join('\n')

  const aiAnswer = await callAI(
    `谜底：${game.figure_name}（${game.figure_dynasty}）。只回复：是/不是/不确定/无关/猜对了。`,
    `${content}${history ? '\n' + history : ''}`
  )

  const seq = store.questions.filter(q => q.game_id === gameId).length + 1
  const q: Question = { id: uid(), game_id: gameId, player_id: playerId, content, ai_answer: aiAnswer, sequence: seq, created_at: new Date().toISOString() }
  store.questions.push(q)

  if (aiAnswer === '猜对了') {
    game.status = 'completed'; game.completed_at = new Date().toISOString(); game.winner_player_id = playerId
  }

  return c.json({
    id: q.id, gameId: q.game_id, playerId: q.player_id, content: q.content,
    aiAnswer: q.ai_answer, sequence: q.sequence, createdAt: q.created_at,
    playerEmoji: player.emoji, playerNickname: player.nickname, isCorrect: aiAnswer === '猜对了',
  }, 201)
})

app.get('/api/questions', (c) => {
  const gid = c.req.query('gameId')
  if (!gid) return c.json({ error: '缺少gameId' }, 400)
  const qs = store.questions.filter(x => x.game_id === gid).sort((a, b) => a.sequence - b.sequence)
  return c.json({ questions: qs.map(q => {
    const p = store.players.find(x => x.id === q.player_id)
    return { id: q.id, gameId: q.game_id, playerId: q.player_id, content: q.content, aiAnswer: q.ai_answer, sequence: q.sequence, createdAt: q.created_at, playerEmoji: p?.emoji ?? '?', playerNickname: p?.nickname ?? '未知' }
  })})
})

app.get('/api/stats', (c) => {
  return c.json({
    totalCorrect: store.games.filter(x => x.status === 'completed').length,
    totalQuestions: store.questions.length,
  })
})

export default handle(app)
