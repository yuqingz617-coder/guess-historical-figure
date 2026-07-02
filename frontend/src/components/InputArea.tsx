import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { askQuestion, createGame, getActiveGame, createPlayer } from '../lib/api'
import { getStoredPlayer } from './LobbyModal'

function storePlayer(p: { id: string; emoji: string; nickname: string }) {
  localStorage.setItem('guess-figure-player', JSON.stringify(p))
}

export default function InputArea() {
  const { player, setPlayer, currentGame, addQuestion, setCurrentGame } = useGame()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const ensurePlayer = async () => {
    if (player) {
      try {
        const res = await fetch(`/api/players/${player.id}`)
        if (res.ok) return player
      } catch {}
      const newP = await createPlayer(player.emoji, player.nickname)
      storePlayer(newP)
      setPlayer({ id: newP.id, emoji: newP.emoji, nickname: newP.nickname })
      return { id: newP.id, emoji: newP.emoji, nickname: newP.nickname }
    }
    const stored = getStoredPlayer()
    if (stored) {
      const newP = await createPlayer(stored.emoji, stored.nickname)
      storePlayer(newP)
      setPlayer({ id: newP.id, emoji: newP.emoji, nickname: newP.nickname })
      return { id: newP.id, emoji: newP.emoji, nickname: newP.nickname }
    }
    return null
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || loading) return

    setInput('')
    setLoading(true)

    try {
      const p = await ensurePlayer()
      if (!p) {
        setLoading(false)
        return
      }

      let game = currentGame
      if (!game) {
        const { game: active } = await getActiveGame()
        if (active) {
          game = { id: active.id, status: active.status, startedAt: active.started_at }
        } else {
          const newGame = await createGame()
          game = { id: newGame.id, status: 'active', startedAt: newGame.started_at }
        }
        setCurrentGame(game)
      }

      const result = await askQuestion(game.id, p.id, content)

      addQuestion({
        id: result.id,
        gameId: result.gameId,
        playerId: result.playerId,
        playerEmoji: result.playerEmoji,
        playerNickname: result.playerNickname,
        content: result.content,
        aiAnswer: result.aiAnswer,
        sequence: result.sequence,
        createdAt: result.createdAt,
      })
    } catch (err) {
      console.error('[InputArea] Error:', err)
      setInput(content)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={loading ? 'AI 判定中...' : input}
          onChange={(e) => { if (!loading) setInput(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="是某个朝代/身份/性别/功绩...吗？"
          disabled={loading}
          className={`flex-1 px-4 py-3 rounded-xl border text-sm
            focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100
            transition-all ${loading
              ? 'bg-gray-50 border-gray-100 text-gray-400'
              : 'border-gray-200 bg-white'
            }`}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="shrink-0 w-12 h-12 rounded-xl bg-yellow-500 hover:bg-yellow-600
            active:bg-yellow-700 disabled:bg-gray-200 disabled:cursor-not-allowed
            text-white font-bold transition-all flex items-center justify-center"
        >
          {loading ? (
            <span className="text-xs">...</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
