import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import '../App.css'

type SlidingPuzzleGameProps = {
  onBack: () => void
}

type ModalState = {
  title: string
  message: string
}

type SlidingAnimation = {
  tile: number
  deltaX: number
  deltaY: number
}

const GRID_SIZE = 4
const SHUFFLE_MOVES = 220
const SOLVED_BOARD = [...Array.from({ length: GRID_SIZE * GRID_SIZE - 1 }, (_, index) => index + 1), 0]

function getRow(index: number) {
  return Math.floor(index / GRID_SIZE)
}

function getCol(index: number) {
  return index % GRID_SIZE
}

function isSolved(board: number[]) {
  return board.every((value, index) => value === SOLVED_BOARD[index])
}

function getAdjacentIndices(emptyIndex: number) {
  const row = getRow(emptyIndex)
  const col = getCol(emptyIndex)
  const indices: number[] = []

  if (row > 0) {
    indices.push(emptyIndex - GRID_SIZE)
  }

  if (row < GRID_SIZE - 1) {
    indices.push(emptyIndex + GRID_SIZE)
  }

  if (col > 0) {
    indices.push(emptyIndex - 1)
  }

  if (col < GRID_SIZE - 1) {
    indices.push(emptyIndex + 1)
  }

  return indices
}

function swap(board: number[], firstIndex: number, secondIndex: number) {
  const nextBoard = [...board]
  ;[nextBoard[firstIndex], nextBoard[secondIndex]] = [nextBoard[secondIndex], nextBoard[firstIndex]]
  return nextBoard
}

function generateShuffledBoard() {
  let board = [...SOLVED_BOARD]
  let emptyIndex = board.indexOf(0)
  let lastIndex = -1

  for (let move = 0; move < SHUFFLE_MOVES; move += 1) {
    const candidates = getAdjacentIndices(emptyIndex).filter((candidate) => candidate !== lastIndex)
    const nextIndex = candidates[Math.floor(Math.random() * candidates.length)]

    board = swap(board, emptyIndex, nextIndex)
    lastIndex = emptyIndex
    emptyIndex = nextIndex
  }

  if (isSolved(board)) {
    return generateShuffledBoard()
  }

  return board
}

function getMoveIndex(emptyIndex: number, direction: 'up' | 'down' | 'left' | 'right') {
  const row = getRow(emptyIndex)
  const col = getCol(emptyIndex)

  if (direction === 'up' && row < GRID_SIZE - 1) {
    return emptyIndex + GRID_SIZE
  }

  if (direction === 'down' && row > 0) {
    return emptyIndex - GRID_SIZE
  }

  if (direction === 'left' && col < GRID_SIZE - 1) {
    return emptyIndex + 1
  }

  if (direction === 'right' && col > 0) {
    return emptyIndex - 1
  }

  return null
}

function getTileBackgroundStyle(tile: number, previewUrl: string) {
  const tileIndex = tile - 1
  const row = Math.floor(tileIndex / GRID_SIZE)
  const col = tileIndex % GRID_SIZE

  return {
    backgroundImage: `url(${previewUrl})`,
    backgroundSize: `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`,
    backgroundPosition: `${(col / (GRID_SIZE - 1)) * 100}% ${(row / (GRID_SIZE - 1)) * 100}%`,
  }
}

export function SlidingPuzzleGame({ onBack }: SlidingPuzzleGameProps) {
  const animationTimeoutRef = useRef<number | null>(null)
  const [board, setBoard] = useState<number[]>(() => generateShuffledBoard())
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)
  const [movingTile, setMovingTile] = useState<SlidingAnimation | null>(null)
  const [status, setStatus] = useState(
    'Number mode is ready. Click a tile next to the empty space or use arrow keys / WASD to slide.',
  )
  const [completionModal, setCompletionModal] = useState<ModalState | null>(null)

  const shuffleBoard = (nextStatus?: string) => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }

    setBoard(generateShuffledBoard())
    setMovingTile(null)
    setCompletionModal(null)
    setStatus(nextStatus ?? (previewUrl
      ? `Photo puzzle ready: ${imageName || 'your image'} is cut into a sliding 15-puzzle.`
      : 'Number mode is ready. Click a tile next to the empty space or use arrow keys / WASD to slide.'))
  }

  const completePuzzle = useCallback(() => {
    setStatus(
      previewUrl
        ? `You solved the sliding photo puzzle for "${imageName}". Shuffle again or upload another image for a new challenge.`
        : 'You solved the classic 15-puzzle. Shuffle again whenever you want another round.',
    )
    setCompletionModal({
      title: '15-puzzle complete',
      message: previewUrl
        ? `You rebuilt "${imageName}" tile by tile. Shuffle again or choose a different photo for the next round.`
        : 'You arranged all fifteen tiles in order. Shuffle again if you want a fresh number puzzle.',
    })
  }, [imageName, previewUrl])

  const moveTile = useCallback((targetIndex: number, viaKeyboard = false) => {
    setBoard((currentBoard) => {
      const emptyIndex = currentBoard.indexOf(0)

      if (!getAdjacentIndices(emptyIndex).includes(targetIndex)) {
        if (viaKeyboard) {
          setStatus('That move is blocked. Try a different direction.')
        }
        return currentBoard
      }

      const tile = currentBoard[targetIndex]
      const deltaX = getCol(targetIndex) - getCol(emptyIndex)
      const deltaY = getRow(targetIndex) - getRow(emptyIndex)
      const nextBoard = swap(currentBoard, emptyIndex, targetIndex)

      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }

      setMovingTile({ tile, deltaX, deltaY })
      animationTimeoutRef.current = window.setTimeout(() => {
        setMovingTile(null)
        animationTimeoutRef.current = null
      }, 300)

      setStatus(
        previewUrl
          ? 'Sliding photo puzzle in progress. Keep moving tiles until the image is complete.'
          : 'Sliding puzzle in progress. Keep ordering the numbers from 1 to 15.',
      )

      if (isSolved(nextBoard)) {
        completePuzzle()
      }

      return nextBoard
    })
  }, [completePuzzle, previewUrl])

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const objectUrl = URL.createObjectURL(file)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setPreviewUrl(objectUrl)
    setImageName(file.name)
    setShowTemplate(false)
    setBoard(generateShuffledBoard())
    setCompletionModal(null)
    setStatus(`Photo puzzle ready: ${file.name} is cut into a sliding 15-puzzle.`)
    event.target.value = ''
  }

  useEffect(() => {
    const keyToDirection: Record<string, 'up' | 'down' | 'left' | 'right' | undefined> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      W: 'up',
      s: 'down',
      S: 'down',
      a: 'left',
      A: 'left',
      d: 'right',
      D: 'right',
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = keyToDirection[event.key]

      if (!direction || completionModal) {
        return
      }

      event.preventDefault()

      const emptyIndex = board.indexOf(0)
      const targetIndex = getMoveIndex(emptyIndex, direction)

      if (targetIndex === null) {
        setStatus('That move is blocked. Try a different direction.')
        return
      }

      moveTile(targetIndex, true)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [board, completionModal, moveTile, previewUrl])

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <>
      {completionModal ? (
        <div className="completion-modal-backdrop" role="presentation">
          <section
            className="completion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sliding-puzzle-modal-title"
          >
            <p className="completion-kicker">Finished</p>
            <h2 id="sliding-puzzle-modal-title">{completionModal.title}</h2>
            <p className="completion-copy">{completionModal.message}</p>
            <button
              type="button"
              className="completion-button"
              onClick={() => setCompletionModal(null)}
            >
              Keep playing
            </button>
          </section>
        </div>
      ) : null}

      <button type="button" className="back-button back-button--corner" onClick={onBack}>
        Back to Menu
      </button>

      <section className="hero">
        <p className="eyebrow">Sliding 15-Puzzle</p>
        <h1>Slide fifteen tiles into order, with numbers by default or a photo if you upload one.</h1>
        <p className="hero-copy">
          The classic 4x4 sliding puzzle starts in number mode. Upload an image at any time to
          turn the same board into a photo-based 15-puzzle.
        </p>
      </section>

      <section className="board-panel board-panel--compact">
        <div className="board-toolbar">
          <button type="button" className="upload-control sliding15-shuffle" onClick={() => shuffleBoard()}>
            Shuffle board
          </button>

          <label className="upload-control" htmlFor="sliding15-image-upload">
            <span>Choose photo</span>
            <input
              id="sliding15-image-upload"
              type="file"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>

          <label
            className={`inline-toggle${previewUrl ? '' : ' is-disabled'}`}
            htmlFor="sliding15-template-toggle"
          >
            <span className="inline-toggle__label">Show template</span>
            <input
              id="sliding15-template-toggle"
              type="checkbox"
              checked={showTemplate}
              disabled={!previewUrl}
              onChange={() => setShowTemplate((current) => !current)}
            />
            <span className="inline-toggle__track" aria-hidden="true">
              <span className="inline-toggle__thumb" />
            </span>
          </label>
        </div>

        <p className="status-text">{status}</p>
        <p className="hint-text">
          Controls: click a neighboring tile or use `Arrow keys` / `W`, `A`, `S`, `D` to slide the tiles in that direction.
        </p>

        <div className="sliding15-board" aria-label="Sliding 15-puzzle board">
          {board.map((tile, index) => {
            const emptyIndex = board.indexOf(0)
            const movable = tile !== 0 && getAdjacentIndices(emptyIndex).includes(index)

            return (
              <button
                key={tile === 0 ? `empty-${index}` : tile}
                type="button"
                className={`sliding15-tile${tile === 0 ? ' is-empty' : ''}${movable ? ' is-movable' : ''}${previewUrl && tile !== 0 ? ' is-photo' : ''}${movingTile?.tile === tile ? ' is-sliding' : ''}`}
                onClick={() => {
                  if (tile !== 0) {
                    moveTile(index)
                  }
                }}
                disabled={tile === 0}
                style={{
                  ...(previewUrl && tile !== 0 ? getTileBackgroundStyle(tile, previewUrl) : {}),
                  ...(movingTile?.tile === tile
                    ? {
                        ['--slide-x' as const]: `${movingTile.deltaX}`,
                        ['--slide-y' as const]: `${movingTile.deltaY}`,
                      }
                    : {}),
                }}
                aria-label={tile === 0 ? 'empty space' : `tile ${tile}`}
              >
                {!previewUrl && tile !== 0 ? tile : ''}
              </button>
            )
          })}
        </div>

        {showTemplate && previewUrl ? (
          <section className="template-card" aria-label="Original photo reference">
            <div className="template-card__header">
              <p className="template-card__eyebrow">Reference</p>
              <p className="template-card__caption">Use the original image underneath as a guide while sliding the tiles.</p>
            </div>
            <img
              className="template-card__image"
              src={previewUrl}
              alt={`Original upload preview for ${imageName || 'the current sliding puzzle'}`}
            />
          </section>
        ) : null}
      </section>
    </>
  )
}
