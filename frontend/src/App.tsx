import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <div className="max-w-lg mx-auto min-h-screen bg-primary-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game" element={<GamePage />} />
          </Routes>
        </div>
      </GameProvider>
    </BrowserRouter>
  )
}
