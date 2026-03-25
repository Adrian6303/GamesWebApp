import { useEffect, useState } from 'react'
import './App.css'
import { JigsawGame } from './games/JigsawGame'
import { PuzzleGame } from './games/PuzzleGame'

type Screen = 'menu' | 'simple-puzzle' | 'jigsaw-puzzle'

const GAME_OPTIONS = [
  {
    id: 'simple-puzzle',
    title: 'Simple Puzzle',
    detail: 'Upload a photo and rebuild it tile by tile.',
    tabTitle: 'simple puzzle',
  },
  {
    id: 'jigsaw-puzzle',
    title: 'Jigsaw Puzzle',
    detail: 'Scatter 40 to 60 pieces around the border and build in the center.',
    tabTitle: 'jigsaw puzzle',
  },
] as const

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('menu')
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  useEffect(() => {
    document.title =
      activeScreen === 'menu'
        ? 'Games'
        : GAME_OPTIONS.find((game) => game.id === activeScreen)?.tabTitle ?? 'Games'
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
                onClick={() => setActiveScreen(game.id)}
              >
                <span className="game-card__name">{game.title}</span>
                <span className="game-card__detail">{game.detail}</span>
              </button>
            ))}
          </section>
        </>
      ) : activeScreen === 'simple-puzzle' ? (
        <PuzzleGame
          isDarkMode={isDarkMode}
          onBack={() => setActiveScreen('menu')}
        />
      ) : (
        <JigsawGame onBack={() => setActiveScreen('menu')} />
      )}
    </main>
  )
}

export default App
