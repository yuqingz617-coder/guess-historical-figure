import { Hono } from 'hono'
import { z } from 'zod'
import { store } from '../lib/store'
import { judgeQuestion, enqueueAI } from '../lib/ai'

const questions = new Hono()

const CreateQuestionSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  content: z.string().min(1, '问题不能为空').max(200, '问题最长200字'),
})

questions.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = CreateQuestionSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }

  const { gameId, playerId, content } = parsed.data

  const game = store.getGame(gameId)
  if (!game) return c.json({ error: '游戏不存在' }, 404)
  if (game.status !== 'active') return c.json({ error: '游戏已结束' }, 400)

  const player = store.getPlayer(playerId)
  if (!player) return c.json({ error: '玩家不存在' }, 404)

  // Get history for AI context
  const history = store.getQuestions(gameId)
  const historyTexts = history.map(q => `问：${q.content} → 答：${q.ai_answer}`)

  const aiAnswer = await enqueueAI(gameId, async () => {
    return judgeQuestion(game.figure_name, game.figure_dynasty, content, historyTexts)
  })

  const question = store.createQuestion(gameId, playerId, content, aiAnswer)

  if (aiAnswer === '猜对了') {
    store.completeGame(gameId, playerId)
  }

  return c.json({
    id: question.id,
    gameId: question.game_id,
    playerId: question.player_id,
    content: question.content,
    aiAnswer: question.ai_answer,
    sequence: question.sequence,
    createdAt: question.created_at,
    playerEmoji: player.emoji,
    playerNickname: player.nickname,
    isCorrect: aiAnswer === '猜对了',
  }, 201)
})

questions.get('/', async (c) => {
  const gameId = c.req.query('gameId')
  if (!gameId) return c.json({ error: '缺少 gameId 参数' }, 400)

  const questions = store.getQuestions(gameId)
  const result = questions.map(q => {
    const p = store.getPlayer(q.player_id)
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

  return c.json({ questions: result })
})

export default questions
