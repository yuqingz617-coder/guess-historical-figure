import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface Player {
  id: string
  emoji: string
  nickname: string
}

export interface Game {
  id: string
  figureName?: string
  status: 'active' | 'completed'
  startedAt: string
}

export interface Question {
  id: string
  gameId: string
  playerId: string
  playerEmoji: string
  playerNickname: string
  content: string
  aiAnswer: string
  sequence: number
  createdAt: string
}

interface GameContextType {
  player: Player | null
  setPlayer: (player: Player | null) => void
  currentGame: Game | null
  setCurrentGame: (game: Game | null) => void
  questions: Question[]
  setQuestions: (questions: Question[]) => void
  addQuestion: (question: Question) => void
  totalCorrect: number
  setTotalCorrect: (n: number) => void
  totalQuestions: number
  setTotalQuestions: (n: number) => void
}

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)

  const addQuestion = useCallback((question: Question) => {
    setQuestions(prev => [...prev, question])
  }, [])

  return (
    <GameContext.Provider
      value={{
        player, setPlayer,
        currentGame, setCurrentGame,
        questions, setQuestions, addQuestion,
        totalCorrect, setTotalCorrect,
        totalQuestions, setTotalQuestions,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
