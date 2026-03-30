import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import '../App.css'

type JigsawGameProps = {
  onBack: () => void
}

type LayoutOption = {
  id: string
  label: string
  detail: string
  cols: number
  rows: number
}

type BuildArea = {
  x: number
  y: number
  width: number
  height: number
}

type PieceEdges = {
  top: -1 | 0 | 1
  right: -1 | 0 | 1
  bottom: -1 | 0 | 1
  left: -1 | 0 | 1
}

type JigsawPiece = {
  id: number
  col: number
  row: number
  width: number
  height: number
  coreWidth: number
  coreHeight: number
  tabSize: number
  x: number
  y: number
  correctX: number
  correctY: number
  zIndex: number
  placed: boolean
  edges: PieceEdges
}

type DragState = {
  pieceId: number
  pointerId: number
  offsetX: number
  offsetY: number
}

type CompletionModal = {
  title: string
  message: string
}

const STAGE_WIDTH = 1320
const STAGE_HEIGHT = 920
const STAGE_MARGIN = 28
const BUILD_MAX_WIDTH = 720
const BUILD_MAX_HEIGHT = 500
const SNAP_TOLERANCE = 28

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: '40', label: '40 pieces', detail: 'Easy jigsaw', cols: 8, rows: 5 },
  { id: '48', label: '48 pieces', detail: 'Balanced jigsaw', cols: 8, rows: 6 },
  { id: '60', label: '60 pieces', detail: 'Detailed jigsaw', cols: 10, rows: 6 },
]

function shuffle<T>(items: T[]) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function randomDirection(): -1 | 1 {
  return Math.random() > 0.5 ? 1 : -1
}

function getBuildArea(image: HTMLImageElement | null) {
  const imageWidth = image?.width ?? 4
  const imageHeight = image?.height ?? 3
  const aspectRatio = imageWidth / imageHeight

  let width = BUILD_MAX_WIDTH
  let height = width / aspectRatio

  if (height > BUILD_MAX_HEIGHT) {
    height = BUILD_MAX_HEIGHT
    width = height * aspectRatio
  }

  return {
    x: (STAGE_WIDTH - width) / 2,
    y: (STAGE_HEIGHT - height) / 2,
    width,
    height,
  }
}

function intersectsBuildArea(
  x: number,
  y: number,
  width: number,
  height: number,
  buildArea: BuildArea,
  padding: number,
) {
  return !(
    x + width + padding < buildArea.x ||
    x - padding > buildArea.x + buildArea.width ||
    y + height + padding < buildArea.y ||
    y - padding > buildArea.y + buildArea.height
  )
}

function createFallbackSlots(pieceWidth: number, pieceHeight: number, buildArea: BuildArea) {
  const gap = 12
  const slots: Array<{ x: number; y: number }> = []

  for (let y = STAGE_MARGIN; y <= STAGE_HEIGHT - pieceHeight - STAGE_MARGIN; y += pieceHeight + gap) {
    for (let x = STAGE_MARGIN; x <= STAGE_WIDTH - pieceWidth - STAGE_MARGIN; x += pieceWidth + gap) {
      if (!intersectsBuildArea(x, y, pieceWidth, pieceHeight, buildArea, gap)) {
        slots.push({ x, y })
      }
    }
  }

  return shuffle(slots)
}

function createBorderPositions(count: number, pieceWidth: number, pieceHeight: number, buildArea: BuildArea) {
  const positions: Array<{ x: number; y: number }> = []
  const gap = 10
  const densityX = pieceWidth * 0.42
  const densityY = pieceHeight * 0.42

  for (let attempt = 0; positions.length < count && attempt < 7000; attempt += 1) {
    const side = Math.floor(Math.random() * 4)
    let x = STAGE_MARGIN
    let y = STAGE_MARGIN

    if (side === 0) {
      x = randomBetween(STAGE_MARGIN, STAGE_WIDTH - STAGE_MARGIN - pieceWidth)
      y = randomBetween(STAGE_MARGIN, Math.max(STAGE_MARGIN, buildArea.y - pieceHeight - gap))
    } else if (side === 1) {
      x = randomBetween(STAGE_MARGIN, STAGE_WIDTH - STAGE_MARGIN - pieceWidth)
      y = randomBetween(
        Math.min(STAGE_HEIGHT - STAGE_MARGIN - pieceHeight, buildArea.y + buildArea.height + gap),
        STAGE_HEIGHT - STAGE_MARGIN - pieceHeight,
      )
    } else if (side === 2) {
      x = randomBetween(STAGE_MARGIN, Math.max(STAGE_MARGIN, buildArea.x - pieceWidth - gap))
      y = randomBetween(STAGE_MARGIN, STAGE_HEIGHT - STAGE_MARGIN - pieceHeight)
    } else {
      x = randomBetween(
        Math.min(STAGE_WIDTH - STAGE_MARGIN - pieceWidth, buildArea.x + buildArea.width + gap),
        STAGE_WIDTH - STAGE_MARGIN - pieceWidth,
      )
      y = randomBetween(STAGE_MARGIN, STAGE_HEIGHT - STAGE_MARGIN - pieceHeight)
    }

    if (intersectsBuildArea(x, y, pieceWidth, pieceHeight, buildArea, gap)) {
      continue
    }

    const overlapsExisting = positions.some(
      (position) => Math.abs(position.x - x) < densityX && Math.abs(position.y - y) < densityY,
    )

    if (!overlapsExisting) {
      positions.push({ x, y })
    }
  }

  if (positions.length < count) {
    const fallbackSlots = createFallbackSlots(pieceWidth, pieceHeight, buildArea)

    fallbackSlots.forEach((slot) => {
      if (positions.length >= count) {
        return
      }

      const overlapsExisting = positions.some(
        (position) =>
          Math.abs(position.x - slot.x) < densityX && Math.abs(position.y - slot.y) < densityY,
      )

      if (!overlapsExisting) {
        positions.push(slot)
      }
    })

    while (positions.length < count && fallbackSlots.length > 0) {
      positions.push(fallbackSlots[positions.length % fallbackSlots.length])
    }
  }

  return positions.slice(0, count)
}

function createEdgeMap(layout: LayoutOption) {
  const edges: PieceEdges[][] = []

  for (let row = 0; row < layout.rows; row += 1) {
    edges[row] = []

    for (let col = 0; col < layout.cols; col += 1) {
      const top = row === 0 ? 0 : (edges[row - 1][col].bottom * -1) as -1 | 1
      const left = col === 0 ? 0 : (edges[row][col - 1].right * -1) as -1 | 1
      const right = col === layout.cols - 1 ? 0 : randomDirection()
      const bottom = row === layout.rows - 1 ? 0 : randomDirection()

      edges[row][col] = { top, right, bottom, left }
    }
  }

  return edges
}

function getPiecePath(piece: JigsawPiece) {
  const { coreWidth, coreHeight, tabSize, edges } = piece
  const x0 = tabSize
  const y0 = tabSize
  const x1 = x0 + coreWidth
  const y1 = y0 + coreHeight
  const topMidX = x0 + coreWidth / 2
  const rightMidY = y0 + coreHeight / 2
  const bottomMidX = x0 + coreWidth / 2
  const leftMidY = y0 + coreHeight / 2
  const shoulderX = coreWidth * 0.18
  const shoulderY = coreHeight * 0.18
  const neckX = coreWidth * 0.08
  const neckY = coreHeight * 0.08
  const knobX = coreWidth * 0.17
  const knobY = coreHeight * 0.17

  let path = `M ${x0} ${y0}`

  if (edges.top === 0) {
    path += ` L ${x1} ${y0}`
  } else {
    const protrusion = -edges.top * tabSize
    path += ` L ${topMidX - shoulderX} ${y0}`
    path += ` C ${topMidX - shoulderX + neckX} ${y0}, ${topMidX - knobX} ${y0 + protrusion}, ${topMidX} ${y0 + protrusion}`
    path += ` C ${topMidX + knobX} ${y0 + protrusion}, ${topMidX + shoulderX - neckX} ${y0}, ${topMidX + shoulderX} ${y0}`
    path += ` L ${x1} ${y0}`
  }

  if (edges.right === 0) {
    path += ` L ${x1} ${y1}`
  } else {
    const protrusion = edges.right * tabSize
    path += ` L ${x1} ${rightMidY - shoulderY}`
    path += ` C ${x1} ${rightMidY - shoulderY + neckY}, ${x1 + protrusion} ${rightMidY - knobY}, ${x1 + protrusion} ${rightMidY}`
    path += ` C ${x1 + protrusion} ${rightMidY + knobY}, ${x1} ${rightMidY + shoulderY - neckY}, ${x1} ${rightMidY + shoulderY}`
    path += ` L ${x1} ${y1}`
  }

  if (edges.bottom === 0) {
    path += ` L ${x0} ${y1}`
  } else {
    const protrusion = edges.bottom * tabSize
    path += ` L ${bottomMidX + shoulderX} ${y1}`
    path += ` C ${bottomMidX + shoulderX - neckX} ${y1}, ${bottomMidX + knobX} ${y1 + protrusion}, ${bottomMidX} ${y1 + protrusion}`
    path += ` C ${bottomMidX - knobX} ${y1 + protrusion}, ${bottomMidX - shoulderX + neckX} ${y1}, ${bottomMidX - shoulderX} ${y1}`
    path += ` L ${x0} ${y1}`
  }

  if (edges.left === 0) {
    path += ` L ${x0} ${y0}`
  } else {
    const protrusion = -edges.left * tabSize
    path += ` L ${x0} ${leftMidY + shoulderY}`
    path += ` C ${x0} ${leftMidY + shoulderY - neckY}, ${x0 + protrusion} ${leftMidY + knobY}, ${x0 + protrusion} ${leftMidY}`
    path += ` C ${x0 + protrusion} ${leftMidY - knobY}, ${x0} ${leftMidY - shoulderY + neckY}, ${x0} ${leftMidY - shoulderY}`
    path += ` L ${x0} ${y0}`
  }

  path += ' Z'

  return path
}

export function JigsawGame({ onBack }: JigsawGameProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const zIndexRef = useRef(1)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageName, setImageName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [selectedLayout, setSelectedLayout] = useState<LayoutOption>(LAYOUT_OPTIONS[1])
  const [pieces, setPieces] = useState<JigsawPiece[]>([])
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const [completionModal, setCompletionModal] = useState<CompletionModal | null>(null)
  const [status, setStatus] = useState(
    'Upload an image and drag the loose pieces from the border into the middle build area.',
  )

  const buildArea = useMemo(() => getBuildArea(image), [image])

  const createPieces = (nextImage: HTMLImageElement, layout: LayoutOption) => {
    const nextBuildArea = getBuildArea(nextImage)
    const coreWidth = nextBuildArea.width / layout.cols
    const coreHeight = nextBuildArea.height / layout.rows
    const tabSize = Math.min(coreWidth, coreHeight) * 0.24
    const pieceWidth = coreWidth + tabSize * 2
    const pieceHeight = coreHeight + tabSize * 2
    const positions = createBorderPositions(layout.cols * layout.rows, pieceWidth, pieceHeight, nextBuildArea)
    const edgeMap = createEdgeMap(layout)

    return Array.from({ length: layout.rows * layout.cols }, (_, index) => {
      const row = Math.floor(index / layout.cols)
      const col = index % layout.cols
      const position = positions[index]

      return {
        id: index,
        row,
        col,
        width: pieceWidth,
        height: pieceHeight,
        coreWidth,
        coreHeight,
        tabSize,
        x: position.x,
        y: position.y,
        correctX: nextBuildArea.x + col * coreWidth - tabSize,
        correctY: nextBuildArea.y + row * coreHeight - tabSize,
        zIndex: index + 1,
        placed: false,
        edges: edgeMap[row][col],
      }
    })
  }

  const startJigsaw = (nextImage: HTMLImageElement, layout: LayoutOption, nextStatus: string) => {
    zIndexRef.current = layout.cols * layout.rows + 5
    setPieces(createPieces(nextImage, layout))
    setDragState(null)
    setCompletionModal(null)
    setStatus(nextStatus)
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const nextImage = new Image()
    const objectUrl = URL.createObjectURL(file)

    nextImage.onload = () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setImage(nextImage)
      setImageName(file.name)
      setPreviewUrl(objectUrl)
      setShowTemplate(false)
      startJigsaw(
        nextImage,
        selectedLayout,
        `Jigsaw ready: ${file.name} scattered into ${selectedLayout.cols * selectedLayout.rows} interlocking pieces around the border.`,
      )
      event.target.value = ''
    }

    nextImage.onerror = () => {
      setStatus('That image could not be loaded. Try a different file.')
      URL.revokeObjectURL(objectUrl)
      event.target.value = ''
    }

    nextImage.src = objectUrl
  }

  const handleLayoutChange = (layout: LayoutOption) => {
    setSelectedLayout(layout)
    setDragState(null)

    if (image) {
      startJigsaw(
        image,
        layout,
        `Started a fresh ${layout.cols * layout.rows}-piece jigsaw with your current image.`,
      )
      return
    }

    setStatus(`Jigsaw size set to ${layout.cols * layout.rows} pieces. Upload an image to begin.`)
  }

  const handlePiecePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    piece: JigsawPiece,
  ) => {
    if (piece.placed || !stageRef.current) {
      return
    }

    const stageRect = stageRef.current.getBoundingClientRect()
    const pointerX = ((event.clientX - stageRect.left) / stageRect.width) * STAGE_WIDTH
    const pointerY = ((event.clientY - stageRect.top) / stageRect.height) * STAGE_HEIGHT

    zIndexRef.current += 1

    setPieces((currentPieces) =>
      currentPieces.map((currentPiece) =>
        currentPiece.id === piece.id
          ? { ...currentPiece, zIndex: zIndexRef.current }
          : currentPiece,
      ),
    )

    event.currentTarget.setPointerCapture(event.pointerId)
    setDragState({
      pieceId: piece.id,
      pointerId: event.pointerId,
      offsetX: pointerX - piece.x,
      offsetY: pointerY - piece.y,
    })
    setStatus('Drag a loose jigsaw piece from the border toward the center. It will snap when close enough.')
  }

  const handlePiecePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
    piece: JigsawPiece,
  ) => {
    if (!dragState || dragState.pieceId !== piece.id || !stageRef.current) {
      return
    }

    const stageRect = stageRef.current.getBoundingClientRect()
    const pointerX = ((event.clientX - stageRect.left) / stageRect.width) * STAGE_WIDTH
    const pointerY = ((event.clientY - stageRect.top) / stageRect.height) * STAGE_HEIGHT

    setPieces((currentPieces) =>
      currentPieces.map((currentPiece) => {
        if (currentPiece.id !== piece.id || currentPiece.placed) {
          return currentPiece
        }

        return {
          ...currentPiece,
          x: clamp(pointerX - dragState.offsetX, STAGE_MARGIN, STAGE_WIDTH - currentPiece.width - STAGE_MARGIN),
          y: clamp(pointerY - dragState.offsetY, STAGE_MARGIN, STAGE_HEIGHT - currentPiece.height - STAGE_MARGIN),
        }
      }),
    )
  }

  const finishPieceDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    piece: JigsawPiece,
    cancelled: boolean,
  ) => {
    if (!dragState || dragState.pieceId !== piece.id) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (cancelled) {
      setDragState(null)
      setStatus('Move cancelled. Pick another loose piece from the border and try again.')
      return
    }

    setPieces((currentPieces) => {
      const nextPieces = currentPieces.map((currentPiece) => {
        if (currentPiece.id !== piece.id || currentPiece.placed) {
          return currentPiece
        }

        const nearCorrectSpot =
          Math.abs(currentPiece.x - currentPiece.correctX) <= SNAP_TOLERANCE &&
          Math.abs(currentPiece.y - currentPiece.correctY) <= SNAP_TOLERANCE

        if (!nearCorrectSpot) {
          return currentPiece
        }

        return {
          ...currentPiece,
          x: currentPiece.correctX,
          y: currentPiece.correctY,
          placed: true,
        }
      })

      const snappedPiece = nextPieces.find((currentPiece) => currentPiece.id === piece.id)

      if (snappedPiece?.placed) {
        const remainingPieces = nextPieces.filter((currentPiece) => !currentPiece.placed).length
        const completedPuzzleName = imageName ? `"${imageName}"` : 'your image'

        if (remainingPieces === 0) {
          setStatus(
            `Amazing work. You completed the ${selectedLayout.cols * selectedLayout.rows}-piece jigsaw for ${completedPuzzleName}.`,
          )
          setCompletionModal({
            title: 'Jigsaw complete',
            message: `You rebuilt ${completedPuzzleName} from ${selectedLayout.cols * selectedLayout.rows} interlocking pieces. Upload another image or change the piece count for a new round.`,
          })
        } else {
          setStatus(`${remainingPieces} loose pieces left. Keep dragging them into the center.`)
        }
      } else {
        setStatus('Piece moved. Keep arranging the interlocking pieces around the center until they snap in.')
      }

      return nextPieces
    })

    setDragState(null)
  }

  useEffect(() => {
    return () => {
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
            aria-labelledby="jigsaw-completion-title"
          >
            <p className="completion-kicker">Finished</p>
            <h2 id="jigsaw-completion-title">{completionModal.title}</h2>
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
        <p className="eyebrow">Jigsaw Puzzle</p>
        <h1>Upload a photo and rebuild it from dozens of real jigsaw-style pieces.</h1>
        <p className="hero-copy">
          Pieces begin around the outer border of the stage, while the center stays clear as
          your assembly zone. Drag each interlocking piece inward until it snaps into place.
        </p>
      </section>

      <section className="board-panel board-panel--wide">
        <div className="size-picker" aria-label="Jigsaw size">
          {LAYOUT_OPTIONS.map((layout) => {
            const active = layout.id === selectedLayout.id

            return (
              <button
                key={layout.id}
                type="button"
                className={`size-option${active ? ' is-active' : ''}`}
                onClick={() => handleLayoutChange(layout)}
              >
                <span>{layout.label}</span>
                <small>{layout.detail}</small>
              </button>
            )
          })}
        </div>

        <div className="board-toolbar">
          <label className="upload-control" htmlFor="jigsaw-image-upload">
            <span>Choose photo</span>
            <input
              id="jigsaw-image-upload"
              type="file"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>

          <label
            className={`inline-toggle${image ? '' : ' is-disabled'}`}
            htmlFor="jigsaw-template-toggle"
          >
            <span className="inline-toggle__label">Show template</span>
            <input
              id="jigsaw-template-toggle"
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
        <p className="hint-text">
          The border holds the loose pieces. The center is your build area, and each piece
          snaps when it lands close to the correct spot.
        </p>

        <div className="jigsaw-stage-shell">
          <div ref={stageRef} className="jigsaw-stage">
            <div
              className="jigsaw-build-zone"
              style={{
                left: `${buildArea.x}px`,
                top: `${buildArea.y}px`,
                width: `${buildArea.width}px`,
                height: `${buildArea.height}px`,
              }}
            >
              {!image ? (
                <p className="jigsaw-build-zone__placeholder">
                  Upload an image to scatter 40 to 60 irregular jigsaw pieces around the border.
                </p>
              ) : null}
            </div>

            {pieces.map((piece) => {
              const path = getPiecePath(piece)

              return (
                <button
                  key={piece.id}
                  type="button"
                  className={`jigsaw-piece${piece.placed ? ' is-placed' : ''}`}
                  style={{
                    left: `${piece.x}px`,
                    top: `${piece.y}px`,
                    width: `${piece.width}px`,
                    height: `${piece.height}px`,
                    zIndex: piece.zIndex,
                  }}
                  disabled={!image || piece.placed}
                  onPointerDown={(event) => handlePiecePointerDown(event, piece)}
                  onPointerMove={(event) => handlePiecePointerMove(event, piece)}
                  onPointerUp={(event) => finishPieceDrag(event, piece, false)}
                  onPointerCancel={(event) => finishPieceDrag(event, piece, true)}
                  aria-label={`Jigsaw piece ${piece.id + 1}`}
                >
                  <svg
                    className="jigsaw-piece__svg"
                    viewBox={`0 0 ${piece.width} ${piece.height}`}
                    aria-hidden="true"
                  >
                    <defs>
                      <clipPath id={`jigsaw-piece-clip-${piece.id}`}>
                        <path d={path} />
                      </clipPath>
                    </defs>
                    <g clipPath={`url(#jigsaw-piece-clip-${piece.id})`}>
                      {previewUrl ? (
                        <image
                          href={previewUrl}
                          x={piece.tabSize - piece.col * piece.coreWidth}
                          y={piece.tabSize - piece.row * piece.coreHeight}
                          width={buildArea.width}
                          height={buildArea.height}
                          preserveAspectRatio="none"
                        />
                      ) : null}
                    </g>
                    <path className="jigsaw-piece__outline" d={path} />
                  </svg>
                  <span className="sr-only">Move piece {piece.id + 1}</span>
                </button>
              )
            })}
          </div>
        </div>

        {showTemplate && image && previewUrl ? (
          <section className="template-card template-card--wide" aria-label="Original photo reference">
            <div className="template-card__header">
              <p className="template-card__eyebrow">Reference</p>
              <p className="template-card__caption">
                Keep the original image nearby while you build the center.
              </p>
            </div>
            <img
              className="template-card__image"
              src={previewUrl}
              alt={`Original upload preview for ${imageName || 'the current jigsaw puzzle'}`}
            />
          </section>
        ) : null}
      </section>
    </>
  )
}
