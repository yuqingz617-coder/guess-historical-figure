import { useGame } from '../context/GameContext'

export default function HeaderStats() {
  const { totalCorrect, totalQuestions } = useGame()

  return (
    <div className="flex items-center justify-center gap-8 py-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-yellow-600">{totalCorrect}</p>
        <p className="text-xs text-gray-400 mt-0.5">累计猜对</p>
      </div>
      <div className="w-px h-10 bg-yellow-200" />
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-700">{totalQuestions}</p>
        <p className="text-xs text-gray-400 mt-0.5">累计提问</p>
      </div>
    </div>
  )
}
