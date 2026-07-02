/**
 * In-memory store as Supabase replacement.
 * Works without network - data persists within the process lifetime.
 */

import { randomUUID } from 'crypto'

interface Player {
  id: string
  emoji: string
  nickname: string
  created_at: string
}

interface Game {
  id: string
  figure_name: string
  figure_dynasty: string
  status: 'active' | 'completed'
  started_at: string
  completed_at: string | null
  winner_player_id: string | null
}

interface Question {
  id: string
  game_id: string
  player_id: string
  content: string
  ai_answer: string
  sequence: number
  created_at: string
}

class Store {
  players: Player[] = []
  games: Game[] = []
  questions: Question[] = []

  // ---- Players ----
  createPlayer(emoji: string, nickname: string): Player {
    const p: Player = {
      id: randomUUID(),
      emoji,
      nickname,
      created_at: new Date().toISOString(),
    }
    this.players.push(p)
    return p
  }

  getPlayer(id: string): Player | null {
    return this.players.find(p => p.id === id) ?? null
  }

  // ---- Games ----
  createGame(name: string, dynasty: string): Game {
    const g: Game = {
      id: randomUUID(),
      figure_name: name,
      figure_dynasty: dynasty,
      status: 'active',
      started_at: new Date().toISOString(),
      completed_at: null,
      winner_player_id: null,
    }
    this.games.push(g)
    return g
  }

  getActiveGame(): Game | null {
    const active = this.games.filter(g => g.status === 'active')
    active.sort((a, b) => b.started_at.localeCompare(a.started_at))
    return active[0] ?? null
  }

  getGame(id: string): Game | null {
    return this.games.find(g => g.id === id) ?? null
  }

  completeGame(id: string, winnerId?: string): Game | null {
    const g = this.games.find(g => g.id === id)
    if (g) {
      g.status = 'completed'
      g.completed_at = new Date().toISOString()
      if (winnerId) g.winner_player_id = winnerId
    }
    return g ?? null
  }

  getCompletedGames(): Game[] {
    return this.games
      .filter(g => g.status === 'completed')
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
  }

  getGuessedNames(): string[] {
    return this.games
      .filter(g => g.status === 'completed')
      .map(g => g.figure_name)
  }

  // ---- Questions ----
  createQuestion(gameId: string, playerId: string, content: string, aiAnswer: string): Question {
    const existingCount = this.questions.filter(q => q.game_id === gameId).length
    const q: Question = {
      id: randomUUID(),
      game_id: gameId,
      player_id: playerId,
      content,
      ai_answer: aiAnswer,
      sequence: existingCount + 1,
      created_at: new Date().toISOString(),
    }
    this.questions.push(q)
    return q
  }

  getQuestions(gameId: string): Question[] {
    return this.questions
      .filter(q => q.game_id === gameId)
      .sort((a, b) => a.sequence - b.sequence)
  }

  getQuestionCount(gameId: string): number {
    return this.questions.filter(q => q.game_id === gameId).length
  }

  getTotalQuestions(): number {
    return this.questions.length
  }

  getTotalCorrect(): number {
    return this.games.filter(g => g.status === 'completed').length
  }
}

export const store = new Store()
