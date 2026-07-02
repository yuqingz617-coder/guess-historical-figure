import { useState, useEffect } from 'react'
import { getCompletedGames, type GameResponse } from '../lib/api'
import HistoryModal from './HistoryModal'

interface CompletedFigure {
  id: string
  name: string
  dynasty: string
  questionCount: number
}

export default function CompletedList() {
  const [figures, setFigures] = useState<CompletedFigure[]>([])
  const [selectedGame, setSelectedGame] = useState<CompletedFigure | null>(null)

  useEffect(() => {
    getCompletedGames()
      .then(({ games }) => {
        setFigures(
          games.map((g: GameResponse) => ({
            id: g.id,
            name: g.figure_name,
            dynasty: g.figure_dynasty,
            questionCount: (g.questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
          }))
        )
      })
      .catch(console.error)
  }, [])

  if (figures.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">还没有猜出过人物</p>
        <p className="text-gray-300 text-xs mt-1">快去挑战吧！</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-500 px-1">已猜出人物</h3>
        {figures.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedGame(f)}
            className="w-full flex items-center justify-between px-4 py-3
              bg-white rounded-xl border border-gray-100 hover:border-yellow-200
              active:bg-yellow-50 transition-all text-left"
          >
            <div>
              <span className="font-medium text-gray-800">{f.name}</span>
              <span className="text-xs text-gray-400 ml-2">{f.dynasty}</span>
            </div>
            <span className="text-xs text-gray-400">{f.questionCount} 次提问</span>
          </button>
        ))}
      </div>

      <HistoryModal
        open={!!selectedGame}
        gameId={selectedGame?.id ?? ''}
        figureName={selectedGame?.name ?? ''}
        onClose={() => setSelectedGame(null)}
      />
    </>
  )
}
