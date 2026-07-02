import { useState } from 'react'
import Modal from './Modal'
import EmojiPicker from './EmojiPicker'
import { createPlayer } from '../lib/api'
import { useGame } from '../context/GameContext'

const STORAGE_KEY = 'guess-figure-player'

export function getStoredPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function storePlayer(player: { id: string; emoji: string; nickname: string }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player))
}

interface LobbyModalProps {
  open: boolean
  onComplete: () => void
}

export default function LobbyModal({ open, onComplete }: LobbyModalProps) {
  const { setPlayer } = useGame()
  const [emoji, setEmoji] = useState('😊')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValid = nickname.trim().length >= 2 && nickname.trim().length <= 8

  const handleSubmit = async () => {
    if (!isValid || !emoji) return
    setError('')
    setLoading(true)

    try {
      const player = await createPlayer(emoji, nickname.trim())
      storePlayer({ id: player.id, emoji: player.emoji, nickname: player.nickname })
      setPlayer({
        id: player.id,
        emoji: player.emoji,
        nickname: player.nickname,
      })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} showClose={false}>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-1">欢迎来到</h2>
        <h1 className="text-2xl font-bold text-yellow-600 mb-6">猜历史人物</h1>

        <div className="mb-6">
          <EmojiPicker selected={emoji} onSelect={setEmoji} />
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              const val = e.target.value.slice(0, 8)
              setNickname(val)
              setError('')
            }}
            placeholder="输入昵称（2-8字）"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg
              focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100
              transition-all"
            autoFocus
          />
          {nickname.length > 0 && nickname.length < 2 && (
            <p className="text-xs text-red-400 mt-1">昵称至少 2 个字符</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="btn-primary w-full text-lg"
        >
          {loading ? '正在进入...' : '开始游戏'}
        </button>
      </div>
    </Modal>
  )
}
