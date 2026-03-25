import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent } from 'react'
import './App.css'

type PuzzlePiece = {
  id: number
  sx: number
  sy: number
  correctX: number
  correctY: number
  x: number
  y: number
}

type Point = {
  x: number
  y: number
}

type Cell = {
  x: number
  y: number
}

type DragState = {
  pieceId: number
  origin: Cell
  pointer: Point
  offset: Point
  hoverCell: Cell | null
}

type CompletionModal = {
  title: string
  message: string
}

const THEMES = {
  light: {
    boardBackground: '#f7efe4',
    gridLine: 'rgba(57, 35, 22, 0.1)',
    placeholderText: '#6d5f56',
    pieceStroke: 'rgba(39, 24, 14, 0.18)',
    highlightFill: 'rgba(255, 107, 53, 0.16)',
    highlightStroke: 'rgba(255, 107, 53, 0.9)',
    shadow: 'rgba(42, 20, 10, 0.28)',
  },
  dark: {
    boardBackground: '#161b21',
    gridLine: 'rgba(244, 225, 206, 0.1)',
    placeholderText: '#d6c2b2',
    pieceStroke: 'rgba(245, 229, 214, 0.16)',
    highlightFill: 'rgba(255, 153, 112, 0.2)',
    highlightStroke: 'rgba(255, 153, 112, 0.95)',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
}

const BOARD_SIZE = 520
const DEFAULT_GRID_SIZE = 3
const SIZE_OPTIONS = [
  { grid: 3, label: '3 x 3', detail: 'Quick warm-up' },
  { grid: 4, label: '4 x 4', detail: 'Balanced challenge' },
  { grid: 5, label: '5 x 5', detail: 'Hard mode' },
]

function shuffle<T>(items: T[]) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function isSolved(pieces: PuzzlePiece[]) {
  return pieces.every((piece) => piece.x === piece.correctX && piece.y === piece.correctY)
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageName, setImageName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [pieces, setPieces] = useState<PuzzlePiece[]>([])
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [showTemplate, setShowTemplate] = useState(false)
  const [completionModal, setCompletionModal] = useState<CompletionModal | null>(null)
  const [status, setStatus] = useState(
    'Choose one of the three puzzle sizes, then upload an image to start playing.',
  )

  const pieceSize = BOARD_SIZE / gridSize
  const theme = isDarkMode ? THEMES.dark : THEMES.light

  const buildPuzzle = (img: HTMLImageElement, nextGridSize: number) => {
    const positions = shuffle(
      Array.from({ length: nextGridSize * nextGridSize }, (_, index) => ({
        x: index % nextGridSize,
        y: Math.floor(index / nextGridSize),
      })),
    )

    const nextPieces: PuzzlePiece[] = []
    let id = 0

    for (let y = 0; y < nextGridSize; y += 1) {
      for (let x = 0; x < nextGridSize; x += 1) {
        const position = positions[id]

        nextPieces.push({
          id,
          sx: x * (img.width / nextGridSize),
          sy: y * (img.height / nextGridSize),
          correctX: x,
          correctY: y,
          x: position.x,
          y: position.y,
        })

        id += 1
      }
    }

    if (isSolved(nextPieces) && nextPieces.length > 1) {
      const firstPiece = nextPieces[0]
      const secondPiece = nextPieces[1]

      nextPieces[0] = { ...firstPiece, x: secondPiece.x, y: secondPiece.y }
      nextPieces[1] = { ...secondPiece, x: firstPiece.x, y: firstPiece.y }
    }

    return nextPieces
  }

  const startPuzzle = (img: HTMLImageElement, nextGridSize: number, nextStatus: string) => {
    setPieces(buildPuzzle(img, nextGridSize))
    setDragState(null)
    setCompletionModal(null)
    setStatus(nextStatus)
  }

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current

    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const getCellFromPoint = (point: Point, nextGridSize: number): Cell | null => {
    const nextPieceSize = BOARD_SIZE / nextGridSize

    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= BOARD_SIZE ||
      point.y >= BOARD_SIZE
    ) {
      return null
    }

    return {
      x: Math.floor(point.x / nextPieceSize),
      y: Math.floor(point.y / nextPieceSize),
    }
  }

  const checkSolved = (nextPieces: PuzzlePiece[]) => {
    if (isSolved(nextPieces)) {
      const completedPuzzleName = imageName ? `"${imageName}"` : 'your image'

      setStatus(
        `Beautiful work. You completed the ${gridSize} x ${gridSize} puzzle for ${completedPuzzleName}. Choose another size or upload a new photo for the next round.`,
      )
      setCompletionModal({
        title: 'Puzzle complete',
        message: `You rebuilt ${completedPuzzleName} on a ${gridSize} x ${gridSize} board. Pick a new size or upload another image whenever you want the next challenge.`,
      })
    }
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      setImage(img)
      setImageName(file.name)
      setPreviewUrl(objectUrl)
      setShowTemplate(false)
      startPuzzle(img, gridSize, `Puzzle ready: ${file.name} loaded as a ${gridSize} x ${gridSize} board.`)
      event.target.value = ''
    }

    img.onerror = () => {
      setStatus('That image could not be loaded. Try a different file.')
      URL.revokeObjectURL(objectUrl)
      event.target.value = ''
    }

    img.src = objectUrl
  }

  const handleSizeChange = (nextGridSize: number) => {
    setGridSize(nextGridSize)
    setDragState(null)

    if (image) {
      startPuzzle(
        image,
        nextGridSize,
        `Started a fresh ${nextGridSize} x ${nextGridSize} puzzle with your current image.`,
      )
      return
    }

    setStatus(`Puzzle size set to ${nextGridSize} x ${nextGridSize}. Upload an image to begin.`)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    context.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE)
    context.fillStyle = theme.boardBackground
    context.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE)

    context.strokeStyle = theme.gridLine
    context.lineWidth = 1

    for (let index = 0; index <= gridSize; index += 1) {
      const offset = index * pieceSize

      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset, BOARD_SIZE)
      context.stroke()

      context.beginPath()
      context.moveTo(0, offset)
      context.lineTo(BOARD_SIZE, offset)
      context.stroke()
    }

    if (!image) {
      context.fillStyle = theme.placeholderText
      context.font = "600 18px 'Trebuchet MS', sans-serif"
      context.textAlign = 'center'
      context.fillText(
        `Upload an image for a ${gridSize} x ${gridSize} puzzle`,
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
      )
      return
    }

    const drawPiece = (piece: PuzzlePiece, x: number, y: number, highlighted: boolean) => {
      context.save()
      context.drawImage(
        image,
        piece.sx,
        piece.sy,
        image.width / gridSize,
        image.height / gridSize,
        x,
        y,
        pieceSize,
        pieceSize,
      )

      context.lineWidth = highlighted ? 4 : 2
      context.strokeStyle = highlighted ? theme.highlightStroke : theme.pieceStroke
      context.strokeRect(x + 1, y + 1, pieceSize - 2, pieceSize - 2)
      context.restore()
    }

    const draggedPiece = dragState ? pieces.find((piece) => piece.id === dragState.pieceId) : null

    pieces
      .filter((piece) => piece.id !== draggedPiece?.id)
      .forEach((piece) => {
        drawPiece(piece, piece.x * pieceSize, piece.y * pieceSize, false)
      })

    if (dragState?.hoverCell) {
      context.save()
      context.fillStyle = theme.highlightFill
      context.fillRect(
        dragState.hoverCell.x * pieceSize,
        dragState.hoverCell.y * pieceSize,
        pieceSize,
        pieceSize,
      )
      context.lineWidth = 3
      context.strokeStyle = theme.highlightStroke
      context.strokeRect(
        dragState.hoverCell.x * pieceSize + 1.5,
        dragState.hoverCell.y * pieceSize + 1.5,
        pieceSize - 3,
        pieceSize - 3,
      )
      context.restore()
    }

    if (draggedPiece && dragState) {
      context.save()
      context.shadowColor = theme.shadow
      context.shadowBlur = 24
      context.globalAlpha = 0.98
      drawPiece(
        draggedPiece,
        dragState.pointer.x - dragState.offset.x,
        dragState.pointer.y - dragState.offset.y,
        true,
      )
      context.restore()
    }
  }, [dragState, gridSize, image, pieceSize, pieces, theme])

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pieces.length || !canvasRef.current) {
      return
    }

    const point = getCanvasPoint(event)

    if (!point) {
      return
    }

    const clickedCell = getCellFromPoint(point, gridSize)

    if (!clickedCell) {
      return
    }

    const clickedPiece = pieces.find(
      (piece) => piece.x === clickedCell.x && piece.y === clickedCell.y,
    )

    if (!clickedPiece) {
      return
    }

    canvasRef.current.setPointerCapture(event.pointerId)
    setDragState({
      pieceId: clickedPiece.id,
      origin: { x: clickedPiece.x, y: clickedPiece.y },
      pointer: point,
      offset: {
        x: point.x - clickedPiece.x * pieceSize,
        y: point.y - clickedPiece.y * pieceSize,
      },
      hoverCell: { x: clickedPiece.x, y: clickedPiece.y },
    })
    setStatus('Drag the tile to another spot on the board and release to swap it.')
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragState) {
      return
    }

    const point = getCanvasPoint(event)

    if (!point) {
      return
    }

    setDragState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        pointer: point,
        hoverCell: getCellFromPoint(point, gridSize),
      }
    })
  }

  const finishDrag = (event: PointerEvent<HTMLCanvasElement>, cancelled: boolean) => {
    const canvas = canvasRef.current

    if (!dragState || !canvas) {
      return
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    if (cancelled) {
      setDragState(null)
      setStatus('Move cancelled. Drag a tile onto another position to switch them.')
      return
    }

    const point = getCanvasPoint(event)
    const dropCell = point ? getCellFromPoint(point, gridSize) : null
    const draggedPiece = pieces.find((piece) => piece.id === dragState.pieceId)

    if (!draggedPiece || !dropCell) {
      setDragState(null)
      setStatus('Move cancelled. Keep the tile inside the board to place it.')
      return
    }

    const droppedOnOrigin =
      dropCell.x === dragState.origin.x && dropCell.y === dragState.origin.y

    if (droppedOnOrigin) {
      setDragState(null)
      setStatus('Tile returned to its original place. Drag it farther to make a move.')
      return
    }

    const targetPiece = pieces.find((piece) => piece.x === dropCell.x && piece.y === dropCell.y)

    if (!targetPiece) {
      setDragState(null)
      setStatus('No target tile found there. Try another drop location.')
      return
    }

    const nextPieces = pieces.map((piece) => {
      if (piece.id === draggedPiece.id) {
        return { ...piece, x: targetPiece.x, y: targetPiece.y }
      }

      if (piece.id === targetPiece.id) {
        return { ...piece, x: draggedPiece.x, y: draggedPiece.y }
      }

      return piece
    })

    setPieces(nextPieces)
    setDragState(null)
    setStatus(
      `Moved a tile into row ${dropCell.y + 1}, column ${dropCell.x + 1}. Keep arranging the board.`,
    )
    checkSolved(nextPieces)
  }

  return (
    <main className="app-shell">
      {completionModal ? (
        <div className="completion-modal-backdrop" role="presentation">
          <section
            className="completion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
          >
            <p className="completion-kicker">Finished</p>
            <h2 id="completion-title">{completionModal.title}</h2>
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

      <section className="hero">
        <p className="eyebrow">Puzzle Generator</p>
        <h1>Upload a photo, pick a board size, and drag pieces wherever you want.</h1>
        <p className="hero-copy">
          Choose between three puzzle sizes, then move tiles freely across the canvas by
          dragging and dropping them onto a new position.
        </p>
      </section>

      <section className="board-panel">
        <div className="size-picker" aria-label="Puzzle size">
          {SIZE_OPTIONS.map((option) => {
            const active = option.grid === gridSize

            return (
              <button
                key={option.grid}
                type="button"
                className={`size-option${active ? ' is-active' : ''}`}
                onClick={() => handleSizeChange(option.grid)}
              >
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </button>
            )
          })}
        </div>

        <div className="board-toolbar">
          <label className="upload-control" htmlFor="image-upload">
            <span>Choose photo</span>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>

          <label
            className={`inline-toggle${image ? '' : ' is-disabled'}`}
            htmlFor="template-toggle"
          >
            <span className="inline-toggle__label">Show template</span>
            <input
              id="template-toggle"
              type="checkbox"
              checked={showTemplate}
              disabled={!image}
              onChange={() => setShowTemplate((current) => !current)}
            />
            <span className="inline-toggle__track" aria-hidden="true">
              <span className="inline-toggle__thumb" />
            </span>
          </label>
        </div>

        <p className="status-text">{status}</p>
        <p className="hint-text">Drag a tile over any other tile to swap their places.</p>

        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event, false)}
          onPointerCancel={(event) => finishDrag(event, true)}
          className="puzzle-canvas"
        />

        {showTemplate && image && previewUrl ? (
          <section className="template-card" aria-label="Original photo reference">
            <div className="template-card__header">
              <p className="template-card__eyebrow">Reference</p>
              <p className="template-card__caption">Use the original photo as a guide.</p>
            </div>
            <img
              className="template-card__image"
              src={previewUrl}
              alt={`Original upload preview for ${imageName || 'the current puzzle'}`}
            />
          </section>
        ) : null}
      </section>
    </main>
  )
}

export default App
