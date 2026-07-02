import { Hono } from 'hono'
import { z } from 'zod'
import { store } from '../lib/store'

const players = new Hono()

const CreatePlayerSchema = z.object({
  emoji: z.string().min(1, '请选择一个头像'),
  nickname: z.string().min(2, '昵称至少2个字符').max(8, '昵称最多8个字符'),
})

players.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = CreatePlayerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400)
  }
  const { emoji, nickname } = parsed.data
  const player = store.createPlayer(emoji, nickname)
  return c.json(player, 201)
})

players.get('/:id', async (c) => {
  const player = store.getPlayer(c.req.param('id'))
  if (!player) return c.json({ error: '玩家不存在' }, 404)
  return c.json(player)
})

export default players
