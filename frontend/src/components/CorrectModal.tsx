import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import { useGame } from '../context/GameContext'
import { createGame } from '../lib/api'
interface CorrectModalProps {
  open: boolean
  onClose: () => void
  winnerNickname: string
  winnerEmoji: string
  figureName: string
  isSelf: boolean
}

export default function CorrectModal({
  open, onClose, winnerNickname, winnerEmoji, figureName, isSelf,
}: CorrectModalProps) {
  const navigate = useNavigate()
  const { setCurrentGame, setQuestions, setTotalCorrect, totalCorrect } = useGame()

  const handleNewGame = async () => {
    onClose()
    try {
      const newGame = await createGame()
      setCurrentGame({
        id: newGame.id,
        status: 'active',
        startedAt: newGame.started_at,
      })
      setQuestions([])
      setTotalCorrect(totalCorrect + 1)
    } catch (err) {
      console.error('[CorrectModal] Error creating new game:', err)
    }
  }

  const handleGoHome = () => {
    onClose()
    setTotalCorrect(totalCorrect + 1)
    navigate('/')
  }

  return (
    <Modal open={open} showClose={false}>
      <div className="text-center">
        <span className="text-6xl">🎉</span>

        <h2 className="text-xl font-bold text-gray-800 mt-4">
          {isSelf ? '你猜对了！' : `${winnerEmoji} ${winnerNickname} 猜对了！`}
        </h2>

        <p className="text-lg text-yellow-600 font-bold mt-2">
          答案是 {figureName}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={handleNewGame} className="btn-primary">
            再猜一个
          </button>
          <button onClick={handleGoHome} className="btn-secondary">
            返回主页
          </button>
        </div>
      </div>
    </Modal>
  )
}
