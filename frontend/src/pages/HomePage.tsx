import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import LobbyModal, { getStoredPlayer } from '../components/LobbyModal'
import HeaderStats from '../components/HeaderStats'
import MysteryCard from '../components/MysteryCard'
import CompletedList from '../components/CompletedList'
import { getActiveGame, createGame, getStats } from '../lib/api'

export default function HomePage() {
  const { setPlayer, setCurrentGame, setTotalCorrect, setTotalQuestions } = useGame()
  const [showLobby, setShowLobby] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const stored = getStoredPlayer()
      if (stored) {
        setPlayer(stored)
      } else {
        setShowLobby(true)
      }

      try {
        const stats = await getStats()
        setTotalCorrect(stats.totalCorrect)
        setTotalQuestions(stats.totalQuestions)
      } catch (e) {
        console.error('Stats load failed:', e)
      }

      try {
        const { game } = await getActiveGame()
        if (game) {
          setCurrentGame({ id: game.id, status: game.status, startedAt: game.started_at })
        } else {
          const newGame = await createGame()
          setCurrentGame({ id: newGame.id, status: 'active', startedAt: newGame.started_at })
        }
      } catch (e) {
        console.error('Game load failed:', e)
      }

      setLoading(false)
    }

    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <span className="text-4xl animate-bounce">🎮</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-primary-50">
      <HeaderStats />
      <MysteryCard />
      <div className="px-4 pb-8 mt-4">
        <CompletedList />
      </div>
      <LobbyModal open={showLobby} onComplete={() => setShowLobby(false)} />
    </div>
  )
}
