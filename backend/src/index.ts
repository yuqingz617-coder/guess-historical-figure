import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import players from './routes/players'
import games from './routes/games'
import questions from './routes/questions'
import stats from './routes/stats'

const app = new Hono()

app.use('*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// API routes
app.route('/api/players', players)
app.route('/api/games', games)
app.route('/api/questions', questions)
app.route('/api/stats', stats)

const port = Number(process.env.PORT) || 3001

console.log(`🎮 猜历史人物 - Backend server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})
