# Games Web App

A small React + TypeScript game hub built with Vite.

The app opens on a main menu and lets you launch individual mini-games from square cards. Each game lives in its own file under `src/games`, so the project is set up to grow as more games are added.

## Current Games

- `Simple Puzzle`  
  Upload a photo and rebuild it by swapping tiles on the board. Supports multiple puzzle sizes.

- `Jigsaw Puzzle`  
  Upload a photo and assemble a jigsaw with irregular pieces scattered around the stage.

- `2048`  
  Classic 4x4 2048 gameplay with keyboard controls.

- `Sliding 15-Puzzle`  
  Play the classic numbered sliding puzzle, or upload a photo and solve it as an image puzzle.

## Shared App Features

- Main menu with one card per game
- Dark mode toggle
- Looping background music toggle
- Optional ADHD mode video panel
- Responsive layout for desktop and smaller screens

## Tech Stack

- React 19
- TypeScript
- Vite
- ESLint

## Requirements

- Node.js
- npm

## Install

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

If you want to expose it on a custom host and port:

```bash
npm run dev -- --host --port=8100
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Controls

### Global

- `Dark mode` toggle in the top-right corner
- `Play music` / `Pause music`
- `Play ADHD mode` / `Pause ADHD mode`

### 2048

- Arrow keys
- `W`, `A`, `S`, `D`

### Sliding 15-Puzzle

- Click a movable tile to slide it
- Arrow keys
- `W`, `A`, `S`, `D`

## Media Files

The shared media lives in `public/media`:

- `coace-doamne-prunele.mp3`
- `subway-surfers-gameplay.mp4`

These files are served directly by Vite from the `/media/...` path.

## Adding A New Game

1. Create a new component in `src/games`.
2. Import it in `src/App.tsx`.
3. Add a new entry to the `GAME_OPTIONS` list.
4. Render the new component from the screen switch in `App.tsx`.

This keeps the menu centralized while each game stays isolated in its own file.