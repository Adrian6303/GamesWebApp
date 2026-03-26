import { useEffect, useRef, useState } from 'react'
import './App.css'
import { Game2048 } from './games/Game2048'
import { JigsawGame } from './games/JigsawGame'
import { PuzzleGame } from './games/PuzzleGame'
import { SlidingPuzzleGame } from './games/SlidingPuzzleGame'

type Screen = 'menu' | 'simple-puzzle' | 'jigsaw-puzzle' | 'game-2048' | 'sliding-15-puzzle'

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
  {
    id: 'game-2048',
    title: '2048',
    detail: 'Merge matching tiles until you reach 2048.',
    tabTitle: '2048',
  },
  {
    id: 'sliding-15-puzzle',
    title: 'Sliding 15-Puzzle',
    detail: 'Slide number tiles or a photo into place on a classic 4x4 board.',
    tabTitle: 'sliding 15-puzzle',
  },
] as const

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeScreen, setActiveScreen] = useState<Screen>('menu')
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  useEffect(() => {
    document.title =
      activeScreen === 'menu'
        ? 'Games'
        : GAME_OPTIONS.find((game) => game.id === activeScreen)?.tabTitle ?? 'Games'
  }, [activeScreen])

  const toggleMusic = async () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.paused) {
      try {
        await audio.play()
        setIsMusicPlaying(true)
      } catch {
        setIsMusicPlaying(false)
      }
    } else {
      audio.pause()
      setIsMusicPlaying(false)
    }
  }

  return (
    <main className="app-shell">
      <audio ref={audioRef} src="/media/coace-doamne-prunele.mp3" loop />

      <div className="top-controls">
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

        <button
          type="button"
          className="music-toggle"
          onClick={toggleMusic}
          aria-pressed={isMusicPlaying}
        >
          {isMusicPlaying ? 'Pause music' : 'Play music'}
        </button>
      </div>

      {activeScreen === 'menu' ? (
        <>
          <section className="hero">
            <p className="eyebrow">Game Menu</p>
            <h1>Choose the game you want to play.</h1>
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
      ) : activeScreen === 'jigsaw-puzzle' ? (
        <JigsawGame onBack={() => setActiveScreen('menu')} />
      ) : activeScreen === 'game-2048' ? (
        <Game2048 onBack={() => setActiveScreen('menu')} />
      ) : (
        <SlidingPuzzleGame onBack={() => setActiveScreen('menu')} />
      )}
    </main>
  )
}

export default App
