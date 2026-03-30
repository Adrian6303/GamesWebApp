import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import '../App.css'

type Game2048Props = {
  onBack: () => void
}

type Direction = 'up' | 'down' | 'left' | 'right'

type ModalState = {
  title: string
  message: string
  actionLabel: string
  action: 'continue' | 'restart'
}

type CellPosition = {
  row: number
  col: number
}

type SlideAnimation = CellPosition & {
  deltaRow: number
  deltaCol: number
}

type LineEntry = {
  value: number
  sources: number[]
}

const GRID_SIZE = 4
const START_TILES = 2

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array<number>(GRID_SIZE).fill(0))
}

function cloneBoard(board: number[][]) {
  return board.map((row) => [...row])
}

function boardsEqual(first: number[][], second: number[][]) {
  return first.every((row, rowIndex) =>
    row.every((value, columnIndex) => value === second[rowIndex][columnIndex]),
  )
}

function getEmptyCells(board: number[][]) {
  const cells: Array<CellPosition> = []

  board.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value === 0) {
        cells.push({ row: rowIndex, col: columnIndex })
      }
    })
  })

  return cells
}

function addRandomTile(board: number[][]) {
  const nextBoard = cloneBoard(board)
  const emptyCells = getEmptyCells(nextBoard)

  if (!emptyCells.length) {
    return { board: nextBoard, spawnCell: null as CellPosition | null }
  }

  const chosenCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  nextBoard[chosenCell.row][chosenCell.col] = Math.random() < 0.9 ? 2 : 4

  return { board: nextBoard, spawnCell: chosenCell }
}

function createStartingBoard() {
  let board = createEmptyBoard()

  for (let count = 0; count < START_TILES; count += 1) {
    board = addRandomTile(board).board
  }

  return board
}

function collapseLine(values: number[]) {
  const compact = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value !== 0)
  const merged: LineEntry[] = []
  let scoreGain = 0

  for (let index = 0; index < compact.length; index += 1) {
    const current = compact[index]
    const next = compact[index + 1]

    if (next && current.value === next.value) {
      const mergedValue = current.value * 2
      merged.push({ value: mergedValue, sources: [current.index, next.index] })
      scoreGain += mergedValue
      index += 1
    } else {
      merged.push({ value: current.value, sources: [current.index] })
    }
  }

  while (merged.length < GRID_SIZE) {
    merged.push({ value: 0, sources: [] })
  }

  return {
    entries: merged,
    line: merged.map((entry) => entry.value),
    scoreGain,
  }
}

function getColumn(board: number[][], columnIndex: number) {
  return board.map((row) => row[columnIndex])
}

function setColumn(board: number[][], columnIndex: number, values: number[]) {
  values.forEach((value, rowIndex) => {
    board[rowIndex][columnIndex] = value
  })
}

function applyMove(board: number[][], direction: Direction) {
  const nextBoard = createEmptyBoard()
  let scoreGain = 0
  const slideAnimations: SlideAnimation[] = []
  const popCells: string[] = []

  if (direction === 'left' || direction === 'right') {
    board.forEach((row, rowIndex) => {
      const source = direction === 'right' ? [...row].reverse() : [...row]
      const collapsed = collapseLine(source)
      const finalLine = direction === 'right' ? [...collapsed.line].reverse() : collapsed.line

      nextBoard[rowIndex] = finalLine
      scoreGain += collapsed.scoreGain

      collapsed.entries.forEach((entry, logicalColumnIndex) => {
        if (entry.value === 0) {
          return
        }

        const columnIndex =
          direction === 'right' ? GRID_SIZE - 1 - logicalColumnIndex : logicalColumnIndex

        if (entry.sources.length > 1) {
          popCells.push(`${rowIndex}-${columnIndex}`)
          return
        }

        const sourceColumnIndex =
          direction === 'right' ? GRID_SIZE - 1 - entry.sources[0] : entry.sources[0]

        if (sourceColumnIndex !== columnIndex) {
          slideAnimations.push({
            row: rowIndex,
            col: columnIndex,
            deltaRow: 0,
            deltaCol: sourceColumnIndex - columnIndex,
          })
        }
      })
    })
  } else {
    for (let columnIndex = 0; columnIndex < GRID_SIZE; columnIndex += 1) {
      const sourceColumn = getColumn(board, columnIndex)
      const source = direction === 'down' ? [...sourceColumn].reverse() : sourceColumn
      const collapsed = collapseLine(source)
      const finalColumn = direction === 'down' ? [...collapsed.line].reverse() : collapsed.line

      setColumn(nextBoard, columnIndex, finalColumn)
      scoreGain += collapsed.scoreGain

      collapsed.entries.forEach((entry, logicalRowIndex) => {
        if (entry.value === 0) {
          return
        }

        const rowIndex = direction === 'down' ? GRID_SIZE - 1 - logicalRowIndex : logicalRowIndex

        if (entry.sources.length > 1) {
          popCells.push(`${rowIndex}-${columnIndex}`)
          return
        }

        const sourceRowIndex = direction === 'down' ? GRID_SIZE - 1 - entry.sources[0] : entry.sources[0]

        if (sourceRowIndex !== rowIndex) {
          slideAnimations.push({
            row: rowIndex,
            col: columnIndex,
            deltaRow: sourceRowIndex - rowIndex,
            deltaCol: 0,
          })
        }
      })
    }
  }

  return {
    board: nextBoard,
    scoreGain,
    slideAnimations,
    popCells,
  }
}

function canMove(board: number[][]) {
  if (getEmptyCells(board).length > 0) {
    return true
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col]

      if (col + 1 < GRID_SIZE && board[row][col + 1] === value) {
        return true
      }

      if (row + 1 < GRID_SIZE && board[row + 1][col] === value) {
        return true
      }
    }
  }

  return false
}

function getTileClass(value: number) {
  return `game2048-tile game2048-tile--${Math.min(value, 2048)}`
}

export function Game2048({ onBack }: Game2048Props) {
  const animationTimeoutRef = useRef<number | null>(null)
  const [board, setBoard] = useState<number[][]>(() => createStartingBoard())
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [slideAnimations, setSlideAnimations] = useState<Record<string, SlideAnimation>>({})
  const [popCells, setPopCells] = useState<string[]>([])
  const [status, setStatus] = useState('Use your arrow keys or WASD to combine matching tiles.')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [wonAlready, setWonAlready] = useState(false)

  const highestTile = useMemo(
    () => Math.max(...board.flat()),
    [board],
  )

  const restartGame = () => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }

    setBoard(createStartingBoard())
    setScore(0)
    setSlideAnimations({})
    setPopCells([])
    setStatus('Fresh board ready. Use arrows or WASD to reach 2048.')
    setModal(null)
    setWonAlready(false)
  }

  useEffect(() => {
    const keyToDirection: Record<string, Direction | undefined> = {
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

      if (!direction || modal?.action === 'restart') {
        return
      }

      event.preventDefault()

      setBoard((currentBoard) => {
        const moveResult = applyMove(currentBoard, direction)

        if (boardsEqual(currentBoard, moveResult.board)) {
          setStatus('No tiles moved. Try a different direction.')
          return currentBoard
        }

        const spawnResult = addRandomTile(moveResult.board)
        const boardWithSpawn = spawnResult.board
        const nextHighestTile = Math.max(...boardWithSpawn.flat())
        const movesRemain = canMove(boardWithSpawn)
        const nextSlideAnimations = Object.fromEntries(
          moveResult.slideAnimations.map((animation) => [
            `${animation.row}-${animation.col}`,
            animation,
          ]),
        )
        const nextPopCells = [...moveResult.popCells]

        if (spawnResult.spawnCell) {
          nextPopCells.push(`${spawnResult.spawnCell.row}-${spawnResult.spawnCell.col}`)
        }

        setScore((currentScore) => {
          const nextScore = currentScore + moveResult.scoreGain
          setBestScore((currentBest) => Math.max(currentBest, nextScore))
          return nextScore
        })
        setSlideAnimations(nextSlideAnimations)
        setPopCells(nextPopCells)
        if (animationTimeoutRef.current) {
          window.clearTimeout(animationTimeoutRef.current)
        }
        animationTimeoutRef.current = window.setTimeout(() => {
          setSlideAnimations({})
          setPopCells([])
          animationTimeoutRef.current = null
        }, 340)
        setStatus(`Moved ${direction}. Keep combining tiles to reach 2048.`)

        if (!wonAlready && nextHighestTile >= 2048) {
          setWonAlready(true)
          setModal({
            title: '2048 reached',
            message: 'You made the 2048 tile. Keep going if you want to push for an even higher score.',
            actionLabel: 'Keep going',
            action: 'continue',
          })
        } else if (!movesRemain) {
          setModal({
            title: 'Game over',
            message: 'No more moves are available on the board. Start a new round and try for a bigger merge.',
            actionLabel: 'Play again',
            action: 'restart',
          })
          setStatus('Game over. Start a new round and go again.')
        }

        return boardWithSpawn
      })
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modal, wonAlready])

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      {modal ? (
        <div className="completion-modal-backdrop" role="presentation">
          <section
            className="completion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game2048-modal-title"
          >
            <p className="completion-kicker">2048</p>
            <h2 id="game2048-modal-title">{modal.title}</h2>
            <p className="completion-copy">{modal.message}</p>
            <button
              type="button"
              className="completion-button"
              onClick={() => {
                if (modal.action === 'restart') {
                  restartGame()
                } else {
                  setModal(null)
                }
              }}
            >
              {modal.actionLabel}
            </button>
          </section>
        </div>
      ) : null}

      <button type="button" className="back-button back-button--corner" onClick={onBack}>
        Back to Menu
      </button>

      <section className="hero">
        <p className="eyebrow">2048</p>
        <h1>Slide the board with arrows or WASD and merge your way to 2048.</h1>
        <p className="hero-copy">
          Combine matching numbers, protect your open spaces, and keep the chain going until
          you reach the 2048 tile just like the original.
        </p>
      </section>

      <section className="board-panel board-panel--compact">
        <div className="game2048-toolbar">
          <div className="game2048-score-card">
            <span className="game2048-score-label">Score</span>
            <strong className="game2048-score-value">{score}</strong>
          </div>

          <div className="game2048-score-card">
            <span className="game2048-score-label">Best</span>
            <strong className="game2048-score-value">{bestScore}</strong>
          </div>

          <button type="button" className="upload-control game2048-restart" onClick={restartGame}>
            New game
          </button>
        </div>

        <p className="status-text">{status}</p>
        <p className="hint-text">
          Controls: `Arrow keys` or `W`, `A`, `S`, `D`. Highest tile: {highestTile}.
        </p>

        <div className="game2048-board" aria-label="2048 board">
          {board.map((row, rowIndex) =>
            row.map((value, columnIndex) => {
              const cellKey = `${rowIndex}-${columnIndex}`
              const slideAnimation = slideAnimations[cellKey]
              const isPopping = value !== 0 && popCells.includes(cellKey)

              return (
                <div
                  key={cellKey}
                  className={`${getTileClass(value)}${slideAnimation ? ' is-sliding' : ''}${isPopping ? ' is-animated' : ''}`}
                  aria-label={value === 0 ? 'empty tile' : `tile ${value}`}
                  style={
                    slideAnimation
                      ? ({
                          '--move-x': slideAnimation.deltaCol,
                          '--move-y': slideAnimation.deltaRow,
                        } as CSSProperties)
                      : undefined
                  }
                >
                  {value === 0 ? '' : value}
                </div>
              )
            }),
          )}
        </div>
      </section>
    </>
  )
}
