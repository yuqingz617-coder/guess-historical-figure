import { Hono } from 'hono'
import { store } from '../lib/store'

const stats = new Hono()

stats.get('/', async (c) => {
  return c.json({
    totalCorrect: store.getTotalCorrect(),
    totalQuestions: store.getTotalQuestions(),
  })
})

export default stats
