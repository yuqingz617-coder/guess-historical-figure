import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'

export default function MysteryCard() {
  const navigate = useNavigate()
  const { questions, currentGame } = useGame()

  const questionCount = currentGame ? questions.length : 0

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <button
        onClick={() => navigate('/game')}
        className="w-full max-w-xs aspect-square rounded-3xl bg-white shadow-lg
          border-2 border-yellow-200 hover:border-yellow-400 hover:shadow-xl
          active:scale-[0.98] transition-all duration-200 flex flex-col items-center
          justify-center gap-4 cursor-pointer"
      >
        <span className="text-8xl sm:text-9xl select-none">?</span>
        <p className="text-sm text-gray-400">
          已提问 {questionCount} 次
        </p>
        <p className="text-xs text-yellow-500">点击进入问答</p>
      </button>
    </div>
  )
}
