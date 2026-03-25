import { useEffect, useState } from 'react'
import './App.css'
import { PuzzleGame } from './games/PuzzleGame'

type Screen = 'menu' | 'puzzle'

const GAME_OPTIONS = [
  {
    id: 'simple-puzzle',
    title: 'Simple Puzzle',
    detail: 'Upload a photo and rebuild it tile by tile.',
  },
]

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('menu')
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  useEffect(() => {
    document.title = activeScreen === 'menu' ? 'Games' : 'simple puzzle'
  }, [activeScreen])

  return (
    <main className="app-shell">
      <label className="theme-toggle" htmlFor="dark-mode-toggle">
        <span className="theme-toggle__label">Dark mode</span>
        <input
          id="dark-mode-toggle"
          type="checkbox"
          checked={isDarkMode}
          onChange={() => setIsDarkMode((current) => !current)}
        />
        <span className="theme-toggle__track" aria-hidden="true">
          <span className="theme-toggle__thumb" />
        </span>
      </label>

      {activeScreen === 'menu' ? (
        <>
          <section className="hero">
            <p className="eyebrow">Game Menu</p>
            <h1>Choose the game you want to play.</h1>
            <p className="hero-copy">
              Start from a simple square card menu now, and we can grow this into a full
              mini-game collection later.
            </p>
          </section>

          <section className="menu-grid" aria-label="Available games">
            {GAME_OPTIONS.map((game) => (
              <button
                key={game.id}
                type="button"
                className="game-card"
                onClick={() => setActiveScreen('puzzle')}
              >
                <span className="game-card__name">{game.title}</span>
                <span className="game-card__detail">{game.detail}</span>
              </button>
            ))}
          </section>
        </>
      ) : (
        <PuzzleGame
          isDarkMode={isDarkMode}
          onBack={() => setActiveScreen('menu')}
        />
      )}
    </main>
  )
}

export default App
