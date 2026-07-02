const API_BASE = '/api'

// Types matching backend responses
export interface PlayerResponse {
  id: string
  emoji: string
  nickname: string
  created_at: string
}

export interface GameResponse {
  id: string
  figure_name: string
  figure_dynasty: string
  status: 'active' | 'completed'
  started_at: string
  completed_at: string | null
  winner_player_id: string | null
  questions?: [{ count: number }]
}

export interface QuestionResponse {
  id: string
  gameId: string
  playerId: string
  content: string
  aiAnswer: string
  sequence: number
  createdAt: string
  playerEmoji: string
  playerNickname: string
  isCorrect?: boolean
}

export interface StatsResponse {
  totalCorrect: number
  totalQuestions: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[API] ${options?.method || 'GET'} ${path} → ${res.status}:`, text)
    let msg = `HTTP ${res.status}`
    try {
      const body = JSON.parse(text)
      if (body.error) msg = body.error
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// Players
export const createPlayer = (emoji: string, nickname: string) =>
  request<PlayerResponse>('/players', {
    method: 'POST',
    body: JSON.stringify({ emoji, nickname }),
  })

export const getPlayer = (id: string) =>
  request<PlayerResponse>(`/players/${id}`)

// Games
export const getActiveGame = () =>
  request<{ game: GameResponse | null }>('/games/active')

export const createGame = () =>
  request<GameResponse>('/games', { method: 'POST' })

export const completeGame = (id: string, winnerPlayerId?: string) =>
  request<GameResponse>(`/games/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ winnerPlayerId }),
  })

export const getCompletedGames = () =>
  request<{ games: GameResponse[] }>('/games/completed')

// Questions
export const askQuestion = (gameId: string, playerId: string, content: string) =>
  request<QuestionResponse>('/questions', {
    method: 'POST',
    body: JSON.stringify({ gameId, playerId, content }),
  })

export const getQuestions = (gameId: string) =>
  request<{ questions: QuestionResponse[] }>(`/questions?gameId=${gameId}`)

// Stats
export const getStats = () =>
  request<StatsResponse>('/stats')
