import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { QuestionResponse } from '../lib/api'

type QuestionHandler = (question: QuestionResponse) => void
type GameHandler = (gameId: string) => void
interface CorrectData {
  winnerNickname: string
  winnerEmoji: string
  figureName: string
}

const CHANNEL = 'game-room'

/**
 * Hook to subscribe to real-time game events via Supabase Broadcast.
 *
 * Use cases:
 * - New question added → all clients update timeline
 * - Game completed (correct guess) → all clients show result modal
 * - New game started → all clients reset
 */
export function useRealtime(callbacks: {
  onNewQuestion?: QuestionHandler
  onCorrect?: (data: CorrectData) => void
  onNewGame?: GameHandler
}) {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    const channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: true } },
    })

    channel
      .on('broadcast', { event: 'new_question' }, ({ payload }) => {
        callbacksRef.current.onNewQuestion?.(payload as QuestionResponse)
      })
      .on('broadcast', { event: 'correct_guess' }, ({ payload }) => {
        callbacksRef.current.onCorrect?.(payload as CorrectData)
      })
      .on('broadcast', { event: 'new_game' }, ({ payload }) => {
        callbacksRef.current.onNewGame?.(payload.gameId as string)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] Connected to game room')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}

/**
 * Broadcast a new question to all clients.
 */
export async function broadcastNewQuestion(question: QuestionResponse) {
  await supabase.channel(CHANNEL).send({
    type: 'broadcast',
    event: 'new_question',
    payload: question,
  })
}

/**
 * Broadcast a correct guess to all clients.
 */
export async function broadcastCorrectGuess(data: {
  winnerNickname: string
  winnerEmoji: string
  figureName: string
}) {
  await supabase.channel(CHANNEL).send({
    type: 'broadcast',
    event: 'correct_guess',
    payload: data,
  })
}

/**
 * Broadcast a new game start to all clients.
 */
export async function broadcastNewGame(gameId: string) {
  await supabase.channel(CHANNEL).send({
    type: 'broadcast',
    event: 'new_game',
    payload: { gameId },
  })
}
