# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step required. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

The game requires a server (not `file://`) for ES Modules to work in most browsers.

## Architecture Overview

Vanilla JavaScript using ES Modules — no framework, no bundler, no package.json. All state is module-level variables exported from `js/game.js`.

### Module Responsibilities

| Module | Role |
|---|---|
| `js/main.js` | Entry point, app lifecycle, screen transitions, cheat keys, roulette reward application |
| `js/game.js` | **Single source of truth** — all game state as exported `let` variables; score calculation; localStorage persistence |
| `js/turn_manager.js` | Card play logic, flip resolution, ppeok/jjok/ssak-sseuri (뻑/쪽/싹쓸이), go/stop prompts, computer AI turn |
| `js/game_logic.js` | AI card selection (`findBestCardToPlay`), card value heuristics, 총통 detection |
| `js/ui.js` | DOM rendering — hand display, acquired cards, score/money, modals, toast messages |
| `js/config.js` | Static data: 48-card CARDS array, 5 STAGES, ROULETTE_ITEMS, SHOWTIME_RESPIN_COST |
| `js/stage.js` | Stage selection screen and unlock logic |
| `js/roulette.js` | Canvas-based roulette wheel animation and spin result |
| `js/showtime.js` | Victory screen with image viewer, zoom, drag-to-pan, confetti |
| `js/showtime_card_select.js` | Card-flip minigame played after winning (selects a background image) |
| `js/effects.js` | `ParticleSystem` class for confetti/particle animations |
| `js/event_handlers.js` | Wires up global event listeners (called once from `main.js`) |

### State Management Pattern

`js/game.js` exports all state as bare `let` variables (e.g., `export let playerHand = []`). Because ES Modules export live bindings, other modules import and read these directly but must call setter functions (e.g., `setPlayerHand`, `setFieldCards`) to mutate them. Direct mutation of arrays (`.push`, `.splice`) is used in-place when the reference doesn't change.

### Game Flow

```
initializeApp() [main.js]
  → loadGameData() [game.js] — reads localStorage
  → Title screen → Opening crawl → Stage selection
  → startGame(stage) → initGame() each round
      → dealCards() [game.js]
      → applyRouletteReward() if pending
      → checkChongtong() [game_logic.js] — instant win check
      → playerPlay() [turn_manager.js] — player clicks a hand card
          → handleFlippedCard() — deck flip resolution
          → endTurn() → checkGoStop() or computerTurn()
      → handleGameEnd() [main.js]
          → computerMoney ≤ 0: Showtime flow
          → playerMoney ≤ 0: Game over
          → else: initGame() next round
```

### Card Data Model

Each card: `{ id, month (1-12), type, value, img, dan? }`

Types: `gwang` (광, 20pt), `tti` (띠, 5pt), `ggot` (끗/동물, 10pt), `pi` (피, 1pt), `ssangpi` (쌍피, 2pt)

`dan` field on `tti` cards: `'hong'`, `'cheong'`, or `'cho'` — used for 홍단/청단/초단 combo detection in `calculateScore()`.

### Persistence

`localStorage` key `'goStopSaveData'` stores: `playerMoney`, `unlockedStages[]`, `unlockedBackgrounds{}`, `skipIntro`. Mutated by `saveGameData()` / `loadGameData()` in `game.js`.

### Stage Backgrounds & Showtime

Each stage has 12 background images at `images/stages/stage{N}/showtime_bg_stage{N}_{01-12}.jpg` (except stage 5 which uses `images/stages/stage5/{1-12}.jpg`). After winning, the player picks one via the card-flip minigame; unlocked backgrounds are stored in `unlockedBackgrounds[stageId]`.

### Cheat Keys (development)

- `NumpadAdd` / `+`: Forces showtime (sets computer money to 0)
- `Shift+M`: Adds 100,000 to player money

## MindVault — MANDATORY

**ALWAYS run `mindvault query "<question>" --global` BEFORE answering any codebase question.**
This is not optional. The knowledge graph contains project context, relationships, and decisions
that you cannot derive from reading files alone.

1. Run `mindvault query "<question>" --global` first
2. Read the Search Results, Graph Context, and Wiki Context in the output
3. Use this context to inform your answer — do NOT ignore it
4. If `mindvault-out/` doesn't exist, run `mindvault ingest .` first
5. Only fall back to reading raw files if MindVault returns no results
