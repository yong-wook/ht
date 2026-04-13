import { CARDS } from './config.js';
import { particleSystem } from './effects.js';
import { audioManager, SFX } from './audio.js';

// ── DOM 참조 ──────────────────────────────────────────────────────────────────
const showtimeContainer      = document.getElementById('showtime-container');
const showtimeReturnButton   = document.getElementById('showtime-return-button');
const showtimeRespinButton   = document.getElementById('showtime-respin-button');
const showtimeImage          = document.getElementById('showtime-image');
const showtimeImageWrapper   = document.querySelector('.showtime-image-wrapper');
const showtimeRespinCostDisplay = document.getElementById('showtime-respin-cost');
const minigameUI             = document.getElementById('showtime-minigame-ui');
const timerEl                = document.getElementById('showtime-timer');
const pairsEl                = document.getElementById('showtime-hit-count');
const postgameInfo           = document.getElementById('showtime-postgame-info');
const resultTextEl           = document.getElementById('showtime-result-text');
const showtimeButtons        = document.querySelector('.showtime-buttons');
const exploreUI              = document.getElementById('showtime-explore-ui');
const exploreTimerEl         = document.getElementById('showtime-explore-timer');
const exploreControls        = document.getElementById('showtime-explore-controls');
const exploreZoomLevelEl     = document.getElementById('explore-zoom-level');
const exploreZoomInBtn       = document.getElementById('explore-zoom-in');
const exploreZoomOutBtn      = document.getElementById('explore-zoom-out');
const exploreZoomResetBtn    = document.getElementById('explore-zoom-reset');
const exploreEndBtn          = document.getElementById('explore-end-btn');
const comboEl                = document.getElementById('showtime-combo');

// ── 타일 게임 상수 ─────────────────────────────────────────────────────────────
const COLS          = 4;
const ROWS          = 4;
const TOTAL_PAIRS   = (COLS * ROWS) / 2; // 8쌍
const GAME_DURATION = 60;                // 초
const FLIP_BACK_MS  = 900;              // 미매칭 시 뒤집기 전 딜레이

// 월별 대표 카드 이미지 (광 > 끗 > 띠 > 피 순서로 선택)
const TILE_IMAGES = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const card =
        CARDS.find(c => c.month === month && c.type === 'gwang') ||
        CARDS.find(c => c.month === month && c.type === 'ggot')  ||
        CARDS.find(c => c.month === month && c.type === 'tti')   ||
        CARDS.find(c => c.month === month);
    return card ? card.img : null;
}).filter(Boolean);

// ── 슬라이딩 퍼즐 상수 ─────────────────────────────────────────────────────────
const PUZZLE_ROWS     = 3;
const PUZZLE_COLS     = 3;
const PUZZLE_DURATION = 180;
const PUZZLE_SHUFFLE  = 150;

// ── 게임 상태 ──────────────────────────────────────────────────────────────────
let currentGameMode = 'tile'; // 'tile' | 'puzzle'
let gameActive    = false;
let timeLeft      = GAME_DURATION;
let matchedPairs  = 0;
let firstTile     = null;
let isLocked      = false;
let gameTimerId   = null;
let tileGrid      = null;
let skipToExplore = false;

// ── 슬라이딩 퍼즐 상태 ─────────────────────────────────────────────────────────
let board     = [];
let emptyR    = 0;
let emptyC    = 0;
let puzzleEl     = null;
let tileEls      = [];
let emptySlotEl  = null;
let moveCount    = 0;

// ── 콜백 ──────────────────────────────────────────────────────────────────────
let onShowtimeEndCallback = null;
let onRespinCallback      = null;
let onWinCallback         = null; // 타일 클리어 성공 시 배경 해금 처리

// ── 탐색 모드 상태 ─────────────────────────────────────────────────────────────
let exploreActive   = false;
let exploreTimerId  = null;
let exploreTimeLeft = 0;
let zoomLevel       = 1.0;
let exploreNatW     = 0;
let exploreNatH     = 0;
let isDragging      = false;
let dragStartX      = 0;
let dragStartY      = 0;
let imgLeft         = 0;
let imgTop          = 0;
let exploreMinLeft  = 0;
let exploreMaxLeft  = 0;
let exploreMinTop   = 0;
let exploreMaxTop   = 0;

const KEYBOARD_STEP = 8;
const pressedKeys   = new Set();
let   exploreRafId  = null;
const ZOOM_STEP     = 1.25;
const ZOOM_MIN      = 0.1;
const ZOOM_MAX      = 8.0;

function getExploreTime() { return 30; }

// ── 공개 API ──────────────────────────────────────────────────────────────────
export function showShowtime(callback, stage, selectedImagePath, respinCallback, onWin, alreadyOwned = false, gameMode = 'tile') {
    onShowtimeEndCallback = callback;
    onRespinCallback      = respinCallback;
    onWinCallback         = onWin || null;
    skipToExplore         = alreadyOwned;
    currentGameMode       = alreadyOwned ? 'skip' : gameMode;

    if (selectedImagePath) {
        showtimeImage.src = selectedImagePath;
    } else if (stage && stage.showtimeImage) {
        showtimeImage.src = stage.showtimeImage;
    }

    showtimeRespinCostDisplay.style.display = 'none';
    showtimeRespinButton.style.display = 'none';

    showtimeButtons.style.display         = 'none';
    postgameInfo.style.display            = 'none';
    exploreUI.style.display               = 'none';
    exploreControls.style.display         = 'none';
    comboEl.style.display                 = 'none';
    minigameUI.style.display              = skipToExplore ? 'none' : 'flex';
    showtimeImageWrapper.style.display    = 'flex';
    showtimeContainer.style.display       = 'flex';

    let starter;
    if (skipToExplore)              starter = startExploreOnly;
    else if (gameMode === 'puzzle') starter = startSlidingPuzzle;
    else                            starter = startMiniGame;

    if (showtimeImage.complete && showtimeImage.naturalWidth > 0) {
        starter();
    } else {
        showtimeImage.onload = starter;
    }
}

export function hideShowtime() {
    cleanupGame();
    cleanupPuzzle();
    cleanupExploreMode();
    particleSystem.clear();
    showtimeContainer.style.display = 'none';
}

// ── 이미 해금된 배경: 타일 없이 바로 탐색 ────────────────────────────────────────
function startExploreOnly() {
    audioManager.playSfx(SFX.SHOWTIME);
    setTimeout(() => startExploreMode(getExploreTime()), 400);
}

// ── 타일 매칭 미니게임 ────────────────────────────────────────────────────────
function startMiniGame() {
    gameActive   = true;
    timeLeft     = GAME_DURATION;
    matchedPairs = 0;
    firstTile    = null;
    isLocked     = false;

    audioManager.playSfx(SFX.SHOWTIME);
    buildTileGrid();
    updateHUD();
    startTimer();
}

function buildTileGrid() {
    removeTileGrid();
    showtimeImageWrapper.classList.add('minigame-active');

    tileGrid = document.createElement('div');
    tileGrid.id = 'tile-grid';
    showtimeImageWrapper.appendChild(tileGrid);

    // 12쌍 = 24장, 셔플
    const pairIds = [];
    for (let i = 0; i < TOTAL_PAIRS; i++) pairIds.push(i, i);
    shuffleArray(pairIds);

    pairIds.forEach((pairId, index) => {
        const imgSrc = TILE_IMAGES[pairId % TILE_IMAGES.length];

        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.pair = String(pairId);
        tile.style.animationDelay = `${index * 25}ms`;

        const inner = document.createElement('div');
        inner.className = 'tile-inner';

        const back = document.createElement('div');
        back.className = 'tile-face tile-back';
        back.innerHTML = '<span class="tile-back-emblem">🌸</span>';

        const front = document.createElement('div');
        front.className = 'tile-face tile-front';
        front.style.backgroundImage = `url(${imgSrc})`;

        inner.appendChild(back);
        inner.appendChild(front);
        tile.appendChild(inner);
        tileGrid.appendChild(tile);

        tile.addEventListener('click', () => onTileClick(tile));
    });
}

function onTileClick(tile) {
    if (!gameActive || isLocked) return;
    if (tile.classList.contains('flipped') || tile.classList.contains('tile-matched')) return;

    tile.classList.add('flipped');
    audioManager.playSfx(SFX.CARD_FLIP);

    if (!firstTile) {
        firstTile = tile;
        return;
    }

    // 두 번째 타일 선택
    const second = tile;
    isLocked = true;

    if (firstTile.dataset.pair === second.dataset.pair) {
        // ── 매칭 성공 ──
        matchedPairs++;
        audioManager.playSfx(SFX.CARD_MATCH);

        firstTile.classList.add('tile-matched');
        second.classList.add('tile-matched');

        // 파티클 — 두 타일 중간 지점
        const r1 = firstTile.getBoundingClientRect();
        const r2 = second.getBoundingClientRect();
        particleSystem.createConfetti(
            (r1.left + r1.right + r2.left + r2.right) / 4,
            (r1.top  + r1.bottom + r2.top + r2.bottom) / 4,
            18
        );

        firstTile = null;
        isLocked  = false;
        updateHUD();

        if (matchedPairs === TOTAL_PAIRS) {
            setTimeout(() => endGame(true), 500);
        }
    } else {
        // ── 매칭 실패 — 잠시 후 뒤집기 ──
        updateHUD();
        const f = firstTile;
        setTimeout(() => {
            f.classList.remove('flipped');
            second.classList.remove('flipped');
            firstTile = null;
            isLocked  = false;
        }, FLIP_BACK_MS);
    }
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function startTimer() {
    gameTimerId = setInterval(() => {
        timeLeft--;
        updateHUD();
        if (timeLeft <= 0) {
            if (currentGameMode === 'puzzle') endPuzzle(false);
            else endGame(false);
        }
    }, 1000);
}

function updateHUD() {
    timerEl.textContent = `⏱ ${timeLeft}`;
    if (currentGameMode === 'puzzle') {
        timerEl.style.color = timeLeft <= 30 ? '#ff4444' : '#fff';
        pairsEl.textContent = `🔢 ${moveCount}회 이동`;
    } else {
        timerEl.style.color = timeLeft <= 10 ? '#ff4444' : '#fff';
        pairsEl.textContent = `🃏 ${TOTAL_PAIRS - matchedPairs}쌍 남음`;
    }
    comboEl.style.display = 'none';
}

function endGame(won) {
    gameActive = false;
    clearInterval(gameTimerId);
    minigameUI.style.display = 'none';

    if (won) {
        // 배경 해금 콜백 호출
        if (onWinCallback) onWinCallback();

        // 축하 파티클
        setTimeout(() => {
            particleSystem.createConfetti(window.innerWidth / 2,       window.innerHeight / 2);
        }, 200);
        setTimeout(() => {
            particleSystem.createConfetti(window.innerWidth * 0.25, window.innerHeight * 0.4);
            particleSystem.createConfetti(window.innerWidth * 0.75, window.innerHeight * 0.4);
        }, 700);

        // 타일 제거 후 탐색 모드
        setTimeout(() => {
            removeTileGrid();
            showtimeImageWrapper.classList.remove('minigame-active');
            startExploreMode(getExploreTime());
        }, 1200);

    } else {
        // 실패: 남은 타일 잠깐 공개 후 실패 결과 표시
        flipAllRemaining();
        setTimeout(() => {
            removeTileGrid();
            showtimeImageWrapper.classList.remove('minigame-active');
            showLoseResult();
        }, 1500);
    }
}

function flipAllRemaining() {
    if (!tileGrid) return;
    tileGrid.querySelectorAll('.tile:not(.flipped):not(.tile-matched)').forEach(tile => {
        tile.classList.add('flipped', 'tile-timeout');
    });
}

function removeTileGrid() {
    if (tileGrid) { tileGrid.remove(); tileGrid = null; }
}

function cleanupGame() {
    gameActive = false;
    clearInterval(gameTimerId);
    firstTile = null;
    isLocked  = false;
    removeTileGrid();
    showtimeImageWrapper.classList.remove('minigame-active');
    minigameUI.style.display  = 'none';
    showtimeButtons.style.display = 'flex';
}

function showLoseResult() {
    resultTextEl.textContent   = '⏰ 시간 초과! 배경을 획득하지 못했습니다.';
    postgameInfo.style.display = 'block';
    showtimeButtons.style.display = 'flex';
}

// ── 슬라이딩 퍼즐 미니게임 ────────────────────────────────────────────────────
function startSlidingPuzzle() {
    gameActive = true;
    timeLeft   = PUZZLE_DURATION;
    moveCount  = 0;

    audioManager.playSfx(SFX.SHOWTIME);
    showtimeImageWrapper.classList.add('minigame-active', 'puzzle-mode');
    buildPuzzleGrid();
    updateHUD();
    startTimer();
}

function buildPuzzleGrid() {
    removePuzzle();

    const wrapW  = showtimeImageWrapper.clientWidth  || 600;
    const wrapH  = showtimeImageWrapper.clientHeight || 400;
    const tileW  = wrapW / PUZZLE_COLS;
    const tileH  = wrapH / PUZZLE_ROWS;
    const N      = PUZZLE_ROWS * PUZZLE_COLS;
    const imgSrc = showtimeImage.src;

    // Solved 상태로 초기화
    board = Array.from({ length: PUZZLE_ROWS }, (_, r) =>
        Array.from({ length: PUZZLE_COLS }, (_, c) => r * PUZZLE_COLS + c)
    );
    emptyR = PUZZLE_ROWS - 1;
    emptyC = PUZZLE_COLS - 1;

    shufflePuzzle(PUZZLE_SHUFFLE);

    puzzleEl = document.createElement('div');
    puzzleEl.id = 'sliding-puzzle';
    showtimeImageWrapper.appendChild(puzzleEl);

    tileEls = new Array(N);

    for (let r = 0; r < PUZZLE_ROWS; r++) {
        for (let c = 0; c < PUZZLE_COLS; c++) {
            const piece = board[r][c];
            if (piece === N - 1) continue; // 빈 칸 건너뜀

            const origR = Math.floor(piece / PUZZLE_COLS);
            const origC = piece % PUZZLE_COLS;

            const tile = document.createElement('div');
            tile.className = 'puzzle-tile';
            tile.style.width  = `${tileW}px`;
            tile.style.height = `${tileH}px`;
            tile.style.left   = `${c * tileW}px`;
            tile.style.top    = `${r * tileH}px`;
            tile.style.backgroundImage    = `url('${imgSrc}')`;
            tile.style.backgroundSize     = `${wrapW}px ${wrapH}px`;
            tile.style.backgroundPosition = `-${origC * tileW}px -${origR * tileH}px`;

            const num = document.createElement('div');
            num.className = 'puzzle-tile-num';
            num.textContent = piece + 1;
            tile.appendChild(num);

            tile.addEventListener('click', () => onPuzzleTileClick(piece));
            puzzleEl.appendChild(tile);
            tileEls[piece] = tile;
        }
    }

    // 빈칸 표시
    emptySlotEl = document.createElement('div');
    emptySlotEl.className = 'puzzle-empty-slot';
    emptySlotEl.style.width  = `${tileW}px`;
    emptySlotEl.style.height = `${tileH}px`;
    emptySlotEl.style.left   = `${emptyC * tileW}px`;
    emptySlotEl.style.top    = `${emptyR * tileH}px`;
    puzzleEl.appendChild(emptySlotEl);
}

function shufflePuzzle(moves) {
    const N    = PUZZLE_ROWS * PUZZLE_COLS;
    const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    let lastDir = null;

    for (let i = 0; i < moves; i++) {
        const valid = dirs.filter(d => {
            if (lastDir && d.dr === -lastDir.dr && d.dc === -lastDir.dc) return false; // 역방향 제외
            const nr = emptyR + d.dr;
            const nc = emptyC + d.dc;
            return nr >= 0 && nr < PUZZLE_ROWS && nc >= 0 && nc < PUZZLE_COLS;
        });
        const dir = valid[Math.floor(Math.random() * valid.length)];
        const nr = emptyR + dir.dr;
        const nc = emptyC + dir.dc;
        board[emptyR][emptyC] = board[nr][nc];
        board[nr][nc] = N - 1;
        emptyR = nr;
        emptyC = nc;
        lastDir = dir;
    }
}

function onPuzzleTileClick(piece) {
    if (!gameActive) return;

    // 해당 피스 현재 위치 탐색
    let pieceR = -1, pieceC = -1;
    outer: for (let r = 0; r < PUZZLE_ROWS; r++) {
        for (let c = 0; c < PUZZLE_COLS; c++) {
            if (board[r][c] === piece) { pieceR = r; pieceC = c; break outer; }
        }
    }

    // 빈 칸과 인접 여부 확인
    const dr = Math.abs(pieceR - emptyR);
    const dc = Math.abs(pieceC - emptyC);
    if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return;

    const wrapW = showtimeImageWrapper.clientWidth  || 600;
    const wrapH = showtimeImageWrapper.clientHeight || 400;
    const tileW = wrapW / PUZZLE_COLS;
    const tileH = wrapH / PUZZLE_ROWS;

    // 상태 업데이트
    board[emptyR][emptyC] = piece;
    board[pieceR][pieceC] = PUZZLE_ROWS * PUZZLE_COLS - 1;

    // DOM 이동 (CSS transition으로 부드럽게)
    tileEls[piece].style.left = `${emptyC * tileW}px`;
    tileEls[piece].style.top  = `${emptyR * tileH}px`;

    emptyR = pieceR;
    emptyC = pieceC;

    // 빈칸 표시 이동
    if (emptySlotEl) {
        emptySlotEl.style.left = `${emptyC * tileW}px`;
        emptySlotEl.style.top  = `${emptyR * tileH}px`;
    }

    moveCount++;
    audioManager.playSfx(SFX.CARD_FLIP);
    updateHUD();

    if (checkPuzzleWin()) {
        setTimeout(() => endPuzzle(true), 150);
    }
}

function checkPuzzleWin() {
    for (let r = 0; r < PUZZLE_ROWS; r++) {
        for (let c = 0; c < PUZZLE_COLS; c++) {
            if (board[r][c] !== r * PUZZLE_COLS + c) return false;
        }
    }
    return true;
}

function endPuzzle(won) {
    gameActive = false;
    clearInterval(gameTimerId);
    minigameUI.style.display = 'none';

    if (won) {
        if (onWinCallback) onWinCallback();
        audioManager.playSfx(SFX.WIN);
        particleSystem.createConfetti(window.innerWidth / 2, window.innerHeight / 2);
        setTimeout(() => {
            particleSystem.createConfetti(window.innerWidth * 0.25, window.innerHeight * 0.4);
            particleSystem.createConfetti(window.innerWidth * 0.75, window.innerHeight * 0.4);
        }, 500);
        setTimeout(() => {
            removePuzzle();
            showtimeImageWrapper.classList.remove('minigame-active', 'puzzle-mode');
            startExploreMode(30);
        }, 1000);
    } else {
        // 시간 초과: 퍼즐 제거 후 결과 표시
        removePuzzle();
        showtimeImageWrapper.classList.remove('minigame-active', 'puzzle-mode');
        resultTextEl.textContent   = `⏰ 시간 초과! ${moveCount}회 이동했습니다.`;
        postgameInfo.style.display = 'block';
        showtimeButtons.style.display = 'flex';
    }
}

function removePuzzle() {
    if (puzzleEl) { puzzleEl.remove(); puzzleEl = null; }
    tileEls = [];
    emptySlotEl = null;
}

function cleanupPuzzle() {
    if (!puzzleEl) return;
    gameActive = false;
    clearInterval(gameTimerId);
    removePuzzle();
    showtimeImageWrapper.classList.remove('puzzle-mode');
}

// ── 탐색 모드 ──────────────────────────────────────────────────────────────────
function startExploreMode(duration) {
    exploreActive   = true;
    exploreTimeLeft = duration;

    exploreNatW = showtimeImage.naturalWidth  || showtimeImageWrapper.clientWidth;
    exploreNatH = showtimeImage.naturalHeight || showtimeImageWrapper.clientHeight;

    zoomLevel = 1.0;
    applyZoom(zoomLevel, true);

    showtimeImageWrapper.classList.add('explore-mode');

    exploreUI.style.display       = 'flex';
    exploreControls.style.display = 'flex';
    updateExploreHUD();

    showtimeImageWrapper.addEventListener('mousedown',  onExploreDragStart);
    showtimeImageWrapper.addEventListener('touchstart', onExploreDragStart, { passive: true });
    showtimeImageWrapper.addEventListener('wheel',      onExploreWheel,     { passive: false });
    document.addEventListener('keydown', onExploreKeyDown);
    document.addEventListener('keyup',   onExploreKeyUp);

    if (exploreEndBtn) exploreEndBtn.addEventListener('click', endExploreMode);

    exploreTimerId = setInterval(() => {
        exploreTimeLeft--;
        updateExploreHUD();
        if (exploreTimeLeft <= 0) endExploreMode();
    }, 1000);
}

function applyZoom(newZoom, centerReset = false) {
    const wrapperW = showtimeImageWrapper.clientWidth  || 600;
    const wrapperH = showtimeImageWrapper.clientHeight || 400;

    let imgCenterX = (wrapperW / 2 - imgLeft) / zoomLevel;
    let imgCenterY = (wrapperH / 2 - imgTop)  / zoomLevel;

    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));

    const scaledW = Math.round(exploreNatW * zoomLevel);
    const scaledH = Math.round(exploreNatH * zoomLevel);

    exploreMinLeft = scaledW <= wrapperW ? Math.round((wrapperW - scaledW) / 2) : wrapperW - scaledW;
    exploreMaxLeft = scaledW <= wrapperW ? Math.round((wrapperW - scaledW) / 2) : 0;
    exploreMinTop  = scaledH <= wrapperH ? Math.round((wrapperH - scaledH) / 2) : wrapperH - scaledH;
    exploreMaxTop  = scaledH <= wrapperH ? Math.round((wrapperH - scaledH) / 2) : 0;

    if (centerReset) {
        imgLeft = Math.round((wrapperW - scaledW) / 2);
        imgTop  = Math.round((wrapperH - scaledH) / 2);
    } else {
        imgLeft = Math.round(wrapperW / 2 - imgCenterX * zoomLevel);
        imgTop  = Math.round(wrapperH / 2 - imgCenterY * zoomLevel);
    }

    imgLeft = Math.max(exploreMinLeft, Math.min(exploreMaxLeft, imgLeft));
    imgTop  = Math.max(exploreMinTop,  Math.min(exploreMaxTop,  imgTop));

    showtimeImage.style.position  = 'absolute';
    showtimeImage.style.width     = scaledW + 'px';
    showtimeImage.style.height    = scaledH + 'px';
    showtimeImage.style.objectFit = 'fill';
    showtimeImage.style.left      = imgLeft + 'px';
    showtimeImage.style.top       = imgTop  + 'px';
    showtimeImage.style.maxWidth  = 'none';
    showtimeImage.style.maxHeight = 'none';

    if (exploreZoomLevelEl) exploreZoomLevelEl.textContent = Math.round(zoomLevel * 100) + '%';
}

function updateExploreHUD() {
    exploreTimerEl.textContent = `⏱ ${exploreTimeLeft}`;
    exploreTimerEl.style.color = exploreTimeLeft <= 5 ? '#ff4444' : '#fff';
}

function onExploreDragStart(e) {
    if (!exploreActive) return;
    isDragging = true;
    const pos = e.touches ? e.touches[0] : e;
    dragStartX = pos.clientX - imgLeft;
    dragStartY = pos.clientY - imgTop;
    showtimeImage.style.cursor = 'grabbing';
    showtimeImageWrapper.addEventListener('mousemove',  onExploreDragMove);
    showtimeImageWrapper.addEventListener('touchmove',  onExploreDragMove, { passive: false });
    document.addEventListener('mouseup',  onExploreDragEnd);
    document.addEventListener('touchend', onExploreDragEnd);
}

function onExploreDragMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    const pos = e.touches ? e.touches[0] : e;
    imgLeft = Math.max(exploreMinLeft, Math.min(exploreMaxLeft, pos.clientX - dragStartX));
    imgTop  = Math.max(exploreMinTop,  Math.min(exploreMaxTop,  pos.clientY - dragStartY));
    showtimeImage.style.left = imgLeft + 'px';
    showtimeImage.style.top  = imgTop  + 'px';
}

function onExploreDragEnd() {
    isDragging = false;
    showtimeImage.style.cursor = 'grab';
    showtimeImageWrapper.removeEventListener('mousemove',  onExploreDragMove);
    showtimeImageWrapper.removeEventListener('touchmove',  onExploreDragMove);
    document.removeEventListener('mouseup',  onExploreDragEnd);
    document.removeEventListener('touchend', onExploreDragEnd);
}

function onExploreWheel(e) {
    if (!exploreActive) return;
    e.preventDefault();
    applyZoom(zoomLevel * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
}

const PAN_KEYS  = new Set(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s']);
const ZOOM_KEYS = new Set(['+','=','-','0']);

function onExploreKeyDown(e) {
    if (!exploreActive) return;
    const key = e.key.toLowerCase();
    if (PAN_KEYS.has(key)) {
        e.preventDefault();
        pressedKeys.add(key);
        if (!exploreRafId) exploreRafId = requestAnimationFrame(exploreRafLoop);
        return;
    }
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); endExploreMode(); return; }
    if (ZOOM_KEYS.has(e.key)) {
        e.preventDefault();
        if (e.key === '+' || e.key === '=') applyZoom(zoomLevel * ZOOM_STEP);
        else if (e.key === '-')             applyZoom(zoomLevel / ZOOM_STEP);
        else if (e.key === '0')             applyZoom(1.0, true);
    }
}

function onExploreKeyUp(e) { pressedKeys.delete(e.key.toLowerCase()); }

function exploreRafLoop() {
    if (!exploreActive || pressedKeys.size === 0) { exploreRafId = null; return; }
    let dx = 0, dy = 0;
    if (pressedKeys.has('arrowleft')  || pressedKeys.has('a')) dx += KEYBOARD_STEP;
    if (pressedKeys.has('arrowright') || pressedKeys.has('d')) dx -= KEYBOARD_STEP;
    if (pressedKeys.has('arrowup')    || pressedKeys.has('w')) dy += KEYBOARD_STEP;
    if (pressedKeys.has('arrowdown')  || pressedKeys.has('s')) dy -= KEYBOARD_STEP;
    imgLeft = Math.max(exploreMinLeft, Math.min(exploreMaxLeft, imgLeft + dx));
    imgTop  = Math.max(exploreMinTop,  Math.min(exploreMaxTop,  imgTop  + dy));
    showtimeImage.style.left = imgLeft + 'px';
    showtimeImage.style.top  = imgTop  + 'px';
    exploreRafId = requestAnimationFrame(exploreRafLoop);
}

function endExploreMode() {
    cleanupExploreMode();
    resultTextEl.textContent   = skipToExplore ? '이미 보유 중인 배경입니다.' : '🎉 배경 획득 성공!';
    postgameInfo.style.display = 'block';
    showtimeButtons.style.display = 'flex';
}

function cleanupExploreMode() {
    if (!exploreActive) return;
    exploreActive = false;
    clearInterval(exploreTimerId);
    if (exploreEndBtn) exploreEndBtn.removeEventListener('click', endExploreMode);
    onExploreDragEnd();
    showtimeImageWrapper.removeEventListener('mousedown',  onExploreDragStart);
    showtimeImageWrapper.removeEventListener('touchstart', onExploreDragStart);
    showtimeImageWrapper.removeEventListener('wheel',      onExploreWheel);
    document.removeEventListener('keydown', onExploreKeyDown);
    document.removeEventListener('keyup',   onExploreKeyUp);
    pressedKeys.clear();
    if (exploreRafId) { cancelAnimationFrame(exploreRafId); exploreRafId = null; }
    showtimeImageWrapper.classList.remove('explore-mode');
    ['position','width','height','objectFit','left','top','maxWidth','maxHeight','cursor']
        .forEach(p => showtimeImage.style[p] = '');
    exploreUI.style.display       = 'none';
    exploreControls.style.display = 'none';
}

// ── 버튼 이벤트 ────────────────────────────────────────────────────────────────
showtimeReturnButton.addEventListener('click', () => {
    hideShowtime();
    if (onShowtimeEndCallback) onShowtimeEndCallback();
});

showtimeRespinButton.addEventListener('click', () => {
    if (onRespinCallback) onRespinCallback();
});

exploreZoomInBtn.addEventListener('click',    () => applyZoom(zoomLevel * ZOOM_STEP));
exploreZoomOutBtn.addEventListener('click',   () => applyZoom(zoomLevel / ZOOM_STEP));
exploreZoomResetBtn.addEventListener('click', () => applyZoom(1.0, true));
