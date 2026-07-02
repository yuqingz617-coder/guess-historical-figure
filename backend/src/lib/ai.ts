import { config } from 'dotenv'
import { resolve } from 'path'

// Explicitly load .env from project root
config({ path: resolve(import.meta.dirname, '..', '..', '..', '.env') })

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-8k'

const FIVE_ANSWERS = ['是', '不是', '不确定', '无关', '猜对了'] as const
type Answer = (typeof FIVE_ANSWERS)[number]

/**
 * Call Kimi (Moonshot) API using OpenAI-compatible format.
 */
async function callKimi(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey || apiKey.startsWith('PLACEHOLDER')) {
    console.warn('[AI] No valid API key set. Using fallback.')
    return fallbackResponse(userMessage)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

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
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[AI] Kimi API error:', response.status, errBody)
      return fallbackResponse(userMessage)
    }

    const data = await response.json()
    const text = (data.choices?.[0]?.message?.content || '').trim()
    return text
  } catch (err) {
    console.error('[AI] Kimi request failed:', err)
    return fallbackResponse(userMessage)
  }
}

/**
 * Validate that the response is one of the five allowed answers.
 */
function validateAnswer(text: string): Answer {
  const cleaned = text.replace(/[^一-鿿]/g, '').trim()
  for (const answer of FIVE_ANSWERS) {
    if (cleaned === answer) return answer
    if (cleaned.startsWith(answer)) return answer
  }
  // Fuzzy match
  for (const answer of FIVE_ANSWERS) {
    if (cleaned.includes(answer)) return answer
  }
  // Check for "猜对了" variants
  if (cleaned.includes('猜对') || cleaned.includes('正确') || cleaned.includes('恭喜')) return '猜对了'
  console.warn(`[AI] Non-standard answer, falling back to 不确定: "${text}"`)
  return '不确定'
}

/**
 * Fallback response for development without API key.
 */
function fallbackResponse(question: string): string {
  const lower = question.toLowerCase()
  if (lower.length <= 6 && Math.random() < 0.1) return '猜对了'
  const answers: Answer[] = ['是', '不是', '不确定', '无关']
  return answers[Math.floor(Math.random() * answers.length)]
}

/**
 * Generate a random Chinese historical figure.
 */
export async function generateFigure(guessedNames: string[]): Promise<{ name: string; dynasty: string }> {
  const excludeList = guessedNames.length > 0
    ? `\n\n重要：以下人物已经被猜过，绝对不能重复：${guessedNames.join('、')}`
    : ''

  const userMessage = `请随机生成一位中国古代历史人物（真实存在过的），返回格式：人物名称，朝代${excludeList}`

  const systemPrompt = `你是一个中国古代历史人物生成器。你的任务是为"猜历史人物"游戏随机生成谜底。

规则：
1. 人物必须是真实存在的中国古代历史人物（1840年以前）
2. 知名度适中——既不是太冷门也不是太普通
3. 每次用户要求时随机生成，不需要考虑之前生成过谁
4. 仅返回格式："人物名称，朝代"，不要任何额外文字
5. 示例："李白，唐朝"、"秦始皇，秦朝"、"诸葛亮，三国"`

  const text = await callKimi(systemPrompt, userMessage)
  const parts = text.split(/[,，]/)
  let name = parts[0]?.trim() || ''
  let dynasty = parts[1]?.trim() || ''

  // Clean up common AI response artifacts
  name = name.replace(/^["'「『]|["'」』]$/g, '').trim()
  dynasty = dynasty.replace(/^["'「『]|["'」』]$/g, '').trim()

  if (!name) {
    // Fallback: pick from built-in list
    const fallbacks = [
      ['李白', '唐朝'], ['秦始皇', '秦朝'], ['诸葛亮', '三国'],
      ['苏轼', '宋朝'], ['武则天', '唐朝'], ['康熙', '清朝'],
    ]
    const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)]
    return { name: pick[0], dynasty: pick[1] }
  }

  return { name, dynasty }
}

/**
 * Judge a player's question against the secret figure.
 */
export async function judgeQuestion(
  figureName: string,
  figureDynasty: string,
  question: string,
  questionHistory: string[]
): Promise<Answer> {
  const historyContext = questionHistory.length > 0
    ? `\n\n已经问过的问题和回答（供参考）：\n${questionHistory.join('\n')}`
    : ''

  const systemPrompt = `你正在主持"猜历史人物"游戏。谜底是：${figureName}（${figureDynasty}）。

你的唯一任务：判断玩家的提问，从以下五个答案中选择一个回复：

- "是"：提问内容与谜底人物信息完全或基本符合
- "不是"：提问内容与谜底人物信息明确矛盾
- "不确定"：提问内容涉及历史记载模糊、有争议或无法确定的信息
- "无关"：提问内容与判断人物身份完全无关（如闲聊、询问天气等）
- "猜对了"：玩家准确说出了谜底的人名（包括字、号、别称等常见称呼）

重要规则：
1. 你只能回复这五个词中的一个，绝对不能回复任何其他内容
2. 不要解释、不要补充、不要道歉
3. 如果玩家问"是不是某某某"，说出准确姓名才算"猜对了"
4. 对于朝代、身份、性别等简单事实问题，直接回答"是"或"不是"
5. 如果玩家说的内容部分正确但不完全是谜底，回答"不是"，不要提示`

  const text = await callKimi(systemPrompt, `${question}${historyContext}`)
  return validateAnswer(text)
}

/**
 * AI call queue for serializing requests within a game.
 */
const gameQueues = new Map<string, Promise<void>>()

export async function enqueueAI<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
  const prev = gameQueues.get(gameId) ?? Promise.resolve()
  let resolve: () => void
  const next = new Promise<void>(r => { resolve = r })
  gameQueues.set(gameId, next)

  await prev
  try {
    return await fn()
  } finally {
    resolve!()
    if (gameQueues.get(gameId) === next) {
      gameQueues.delete(gameId)
    }
  }
}
