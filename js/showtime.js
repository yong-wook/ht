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
const comboEl                = document.getElementById('showtime-combo');
const showtimeFlash          = document.getElementById('showtime-flash');
const charQuoteEl            = document.getElementById('showtime-char-quote');
const charQuoteNameEl        = document.getElementById('showtime-char-quote-name');
const charQuoteTextEl        = document.getElementById('showtime-char-quote-text');
const victoryLineEl          = document.getElementById('showtime-victory-line');

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

// ── Ken Burns 자동 애니메이션 상태 ────────────────────────────────────────────
// background-image 방식 사용: 이미지의 자연 크기 기준으로 px 계산 → 최상단 등
// 이미지 극단부에도 gap 없이 접근 가능 (transform 방식의 커버리지 제약 없음)
let kbRafId     = null;
let kbFrom      = null;
let kbTo        = null;
let kbStartTime = 0;
let kbDuration  = 5000;
let kbEaseFn    = null;
let kbLastIdx   = -1;
let kbQueue     = [];
let kbImgW      = 0;  // 이미지 자연 너비
let kbImgH      = 0;  // 이미지 자연 높이

// zoom: 배율 (1.0 = cover 꽉 맞춤)
// fx: 가로 포커스 0.0=완전 좌측  ~ 1.0=완전 우측
// fy: 세로 포커스 0.0=완전 상단  ~ 1.0=완전 하단
const KB_ZONES = [
    { zoom: 1.0,  fx: 0.5,  fy: 0.5  }, // 전체 조망 (cover 전체)
    { zoom: 1.6,  fx: 0.5,  fy: 0.0  }, // 최상단
    { zoom: 1.6,  fx: 0.5,  fy: 1.0  }, // 최하단
    { zoom: 1.6,  fx: 0.0,  fy: 0.5  }, // 최좌측
    { zoom: 1.6,  fx: 1.0,  fy: 0.5  }, // 최우측
    { zoom: 2.2,  fx: 0.1,  fy: 0.1  }, // 좌상단 코너
    { zoom: 2.2,  fx: 0.9,  fy: 0.1  }, // 우상단 코너
    { zoom: 2.2,  fx: 0.1,  fy: 0.9  }, // 좌하단 코너
    { zoom: 2.2,  fx: 0.9,  fy: 0.9  }, // 우하단 코너
    { zoom: 3.0,  fx: 0.25, fy: 0.25 }, // 좌상 클로즈업
    { zoom: 3.0,  fx: 0.75, fy: 0.75 }, // 우하 클로즈업
    { zoom: 3.0,  fx: 0.75, fy: 0.25 }, // 우상 클로즈업
    { zoom: 3.0,  fx: 0.25, fy: 0.75 }, // 좌하 클로즈업
];

const KB_EASING_FNS = [
    t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t,
    t => 1 - Math.pow(1 - t, 3),
    t => t * t * (3 - 2 * t),
    t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
];

function nextKbIdx() {
    if (kbQueue.length === 0) {
        kbQueue = KB_ZONES.map((_, i) => i);
        for (let i = kbQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [kbQueue[i], kbQueue[j]] = [kbQueue[j], kbQueue[i]];
        }
        if (kbLastIdx >= 0 && kbQueue[0] === kbLastIdx) {
            const swap = 1 + Math.floor(Math.random() * (kbQueue.length - 1));
            [kbQueue[0], kbQueue[swap]] = [kbQueue[swap], kbQueue[0]];
        }
    }
    kbLastIdx = kbQueue.shift();
    return kbLastIdx;
}

function pickKbState() {
    const z = KB_ZONES[nextKbIdx()];
    return {
        zoom: z.zoom + (Math.random() - 0.5) * 0.1,
        fx: Math.max(0, Math.min(1, z.fx + (Math.random() - 0.5) * 0.08)),
        fy: Math.max(0, Math.min(1, z.fy + (Math.random() - 0.5) * 0.08)),
    };
}

function pickKbDuration(from, to) {
    const dZoom = Math.abs(to.zoom - from.zoom);
    const dPos  = Math.sqrt((to.fx - from.fx) ** 2 + (to.fy - from.fy) ** 2);
    return 2000 + Math.min(dPos * 3000 + dZoom * 1500, 5000);
}

// background-size/position으로 이미지 탐색 (gap 없음, 극단부 완전 접근 가능)
function applyKbBg(zoom, fx, fy) {
    const rect  = showtimeImageWrapper.getBoundingClientRect();
    const wrapW = rect.width  || showtimeImageWrapper.clientWidth  || 600;
    const wrapH = rect.height || showtimeImageWrapper.clientHeight || 400;
    if (!kbImgW || !kbImgH || !wrapW || !wrapH) return;

    const coverScale = Math.max(wrapW / kbImgW, wrapH / kbImgH);
    const dispW = kbImgW * coverScale * zoom;
    const dispH = kbImgH * coverScale * zoom;
    const extraX = Math.max(0, dispW - wrapW);
    const extraY = Math.max(0, dispH - wrapH);

    showtimeImageWrapper.style.backgroundSize     = `${dispW}px ${dispH}px`;
    showtimeImageWrapper.style.backgroundPosition = `${-(fx * extraX)}px ${-(fy * extraY)}px`;
}

function kbFrame() {
    const t = Math.min((performance.now() - kbStartTime) / kbDuration, 1);
    const e = kbEaseFn(t);
    const zoom = kbFrom.zoom + (kbTo.zoom - kbFrom.zoom) * e;
    const fx   = kbFrom.fx   + (kbTo.fx   - kbFrom.fx)   * e;
    const fy   = kbFrom.fy   + (kbTo.fy   - kbFrom.fy)   * e;
    applyKbBg(zoom, fx, fy);
    if (t >= 1) {
        kbFrom     = kbTo;
        kbTo       = pickKbState();
        kbDuration = pickKbDuration(kbFrom, kbTo);
        kbEaseFn   = KB_EASING_FNS[Math.floor(Math.random() * KB_EASING_FNS.length)];
        kbStartTime = performance.now();
    }
    kbRafId = requestAnimationFrame(kbFrame);
}

function startKenBurns() {
    stopKenBurns();
    kbImgW = showtimeImage.naturalWidth  || showtimeImageWrapper.clientWidth;
    kbImgH = showtimeImage.naturalHeight || showtimeImageWrapper.clientHeight;
    showtimeImageWrapper.style.backgroundImage  = `url('${showtimeImage.src}')`;
    showtimeImageWrapper.style.backgroundRepeat = 'no-repeat';
    // CSS animation(fade-in forwards)이 opacity:1로 덮어쓰지 않도록 animation 먼저 제거
    showtimeImage.style.animation = 'none';
    showtimeImage.style.opacity   = '0'; // img는 background로 대체, 숨김

    showtimeImageWrapper.classList.add('ken-burns-active');
    kbQueue   = [];
    kbLastIdx = -1;
    kbFrom    = pickKbState();
    kbTo      = pickKbState();
    kbDuration  = pickKbDuration(kbFrom, kbTo);
    kbEaseFn    = KB_EASING_FNS[Math.floor(Math.random() * KB_EASING_FNS.length)];
    kbStartTime = performance.now();
    kbRafId = requestAnimationFrame(kbFrame);
}

function stopKenBurns() {
    if (kbRafId) { cancelAnimationFrame(kbRafId); kbRafId = null; }
    showtimeImage.style.animation = '';
    showtimeImage.style.opacity   = '';
    showtimeImage.style.transform = '';
    showtimeImageWrapper.style.backgroundImage    = '';
    showtimeImageWrapper.style.backgroundSize     = '';
    showtimeImageWrapper.style.backgroundPosition = '';
    showtimeImageWrapper.classList.remove('ken-burns-active');
}

// ── 공개 API ──────────────────────────────────────────────────────────────────
export function showShowtime(callback, stage, selectedImagePath, respinCallback, onWin, alreadyOwned = false, gameMode = 'tile') {
    onShowtimeEndCallback = callback;
    onRespinCallback      = respinCallback;
    onWinCallback         = onWin || null;
    skipToExplore         = alreadyOwned;
    currentGameMode       = alreadyOwned ? 'skip' : gameMode;

    showtimeImage.onload = null;

    if (selectedImagePath) {
        showtimeImage.src = selectedImagePath;
    } else if (stage && stage.showtimeImage) {
        showtimeImage.src = stage.showtimeImage;
    }

    // 승리 대사 설정
    if (victoryLineEl) {
        if (stage && stage.victoryLines && stage.victoryLines.length > 0) {
            victoryLineEl.style.display = 'none'; // 처음엔 숨김 — 대사 오버레이로 표시
        } else {
            victoryLineEl.style.display = 'none';
        }
    }

    showtimeRespinCostDisplay.style.display = 'none';
    showtimeRespinButton.style.display = 'none';

    showtimeButtons.style.display         = 'none';
    postgameInfo.style.display            = 'none';
    comboEl.style.display                 = 'none';
    charQuoteEl.style.display             = 'none';
    minigameUI.style.display              = skipToExplore ? 'none' : 'flex';
    showtimeImageWrapper.style.display    = 'flex';

    // 입장 연출
    showtimeContainer.style.display = 'flex';
    triggerEntrance(stage);

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

// ── 입장 연출 ─────────────────────────────────────────────────────────────────
function triggerEntrance(stage) {
    // 컨테이너 진입 애니메이션
    showtimeContainer.classList.remove('showtime-enter');
    void showtimeContainer.offsetWidth; // reflow
    showtimeContainer.classList.add('showtime-enter');

    // 화면 플래시
    if (showtimeFlash) {
        showtimeFlash.classList.remove('flash-active');
        void showtimeFlash.offsetWidth;
        showtimeFlash.classList.add('flash-active');
    }

    // 파티클 폭발 (3연타)
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setTimeout(() => particleSystem.createConfetti(cx, cy, 60), 100);
    setTimeout(() => {
        particleSystem.createConfetti(cx * 0.3, cy * 0.5, 40);
        particleSystem.createConfetti(cx * 1.7, cy * 0.5, 40);
    }, 400);
    setTimeout(() => {
        particleSystem.createConfetti(cx * 0.15, cy, 30);
        particleSystem.createConfetti(cx * 1.85, cy, 30);
        particleSystem.createConfetti(cx, cy * 0.2, 30);
    }, 700);

    // 캐릭터 대사 오버레이 (승리 시)
    if (stage && stage.victoryLines && stage.victoryLines.length > 0) {
        const line = stage.victoryLines[Math.floor(Math.random() * stage.victoryLines.length)];
        setTimeout(() => showCharacterQuote(stage.characterName, line), 350);
    }
}

// ── 캐릭터 승리 대사 오버레이 ─────────────────────────────────────────────────
function showCharacterQuote(name, line) {
    if (!charQuoteEl) return;
    charQuoteNameEl.textContent = name;
    charQuoteTextEl.textContent = '';
    charQuoteEl.style.display = 'flex';
    charQuoteEl.classList.remove('quote-exit');
    charQuoteEl.classList.add('quote-enter');

    // 타자기 효과
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < line.length) {
            charQuoteTextEl.textContent += line[i++];
        } else {
            clearInterval(typeInterval);
        }
    }, 55);

    // 3.5초 후 페이드아웃
    setTimeout(() => {
        charQuoteEl.classList.remove('quote-enter');
        charQuoteEl.classList.add('quote-exit');
        setTimeout(() => {
            charQuoteEl.style.display = 'none';
            charQuoteEl.classList.remove('quote-exit');
        }, 700);
    }, 3500);
}

export function hideShowtime() {
    cleanupGame();
    cleanupPuzzle();
    stopKenBurns();
    particleSystem.clear();
    showtimeContainer.style.display = 'none';
}

// ── 이미 해금된 배경: 바로 Ken Burns ─────────────────────────────────────────
function startExploreOnly() {
    audioManager.playSfx(SFX.SHOWTIME);
    startKenBurns();
    showtimeButtons.style.display = 'flex';
}

// ── 타일 매칭 미니게임 ────────────────────────────────────────────────────────
function startMiniGame() {
    gameActive   = true;
    timeLeft     = GAME_DURATION;
    matchedPairs = 0;
    firstTile    = null;
    isLocked     = false;

    audioManager.playSfx(SFX.SHOWTIME);
    startKenBurns();
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

        // 타일 제거 후 Ken Burns로 감상
        setTimeout(() => {
            removeTileGrid();
            showtimeImageWrapper.classList.remove('minigame-active');
            resultTextEl.textContent   = '🎉 배경 획득 성공!';
            postgameInfo.style.display = 'block';
            showtimeButtons.style.display = 'flex';
        }, 1200);

    } else {
        // 실패: 남은 타일 잠깐 공개 후 결과 표시
        flipAllRemaining();
        setTimeout(() => {
            removeTileGrid();
            showtimeImageWrapper.classList.remove('minigame-active');
            resultTextEl.textContent   = '⏰ 시간 초과! 배경을 획득하지 못했습니다.';
            postgameInfo.style.display = 'block';
            showtimeButtons.style.display = 'flex';
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
    startKenBurns();
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
            resultTextEl.textContent   = '🎉 배경 획득 성공!';
            postgameInfo.style.display = 'block';
            showtimeButtons.style.display = 'flex';
        }, 1000);
    } else {
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

// ── 버튼 이벤트 ────────────────────────────────────────────────────────────────
showtimeReturnButton.addEventListener('click', () => {
    hideShowtime();
    if (onShowtimeEndCallback) onShowtimeEndCallback();
});

showtimeRespinButton.addEventListener('click', () => {
    if (onRespinCallback) onRespinCallback();
});
