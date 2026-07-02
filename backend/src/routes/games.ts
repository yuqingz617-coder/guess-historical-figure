import { Hono } from 'hono'
import { store } from '../lib/store'
import { generateFigure } from '../lib/ai'

const games = new Hono()

games.get('/active', async (c) => {
  const game = store.getActiveGame()
  if (!game) return c.json({ game: null })
  return c.json({ game })
})

games.post('/', async (c) => {
  const guessedNames = store.getGuessedNames()
  const { name, dynasty } = await generateFigure(guessedNames)
  const game = store.createGame(name, dynasty)
  return c.json(game, 201)
})

games.patch('/:id/complete', async (c) => {
  const body = await c.req.json()
  const game = store.completeGame(c.req.param('id'), body.winnerPlayerId)
  if (!game) return c.json({ error: '游戏不存在' }, 404)
  return c.json(game)
})

games.get('/completed', async (c) => {
  const games = store.getCompletedGames()
  const result = games.map(g => ({
    ...g,
    questions: [{ count: store.getQuestionCount(g.id) }],
  }))
  return c.json({ games: result })
})

export default games
