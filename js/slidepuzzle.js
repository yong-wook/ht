// ── 슬라이드 퍼즐 (3×3 8-퍼즐) ──────────────────────────────────────────
const GRID = 3;
const BLANK = GRID * GRID - 1; // 8 = 빈 칸

let _container  = null;
let _grid       = null;
let _timerText  = null;
let _timerFill  = null;
let _movesEl    = null;
let _preview    = null;

let _tiles        = [];
let _imagePath    = '';
let _timeLeft     = 0;
let _timeTotal    = 90;
let _moveCount    = 0;
let _timerInterval = null;
let _onComplete   = null;

// ── DOM 초기화 (최초 1회) ──────────────────────────────────────────────
function initDOM() {
    _container = document.getElementById('slidepuzzle-container');
    _grid      = document.getElementById('sp-grid');
    _timerText = document.getElementById('sp-timer-text');
    _timerFill = document.getElementById('sp-timer-fill');
    _movesEl   = document.getElementById('sp-moves');
    _preview   = document.getElementById('sp-preview');
    document.getElementById('sp-giveup-btn').addEventListener('click', () => finish(false));
}

// ── Public API ─────────────────────────────────────────────────────────
export function showSlidePuzzle(imgPath, callback, timeLimit = 90) {
    if (!_container) initDOM();

    _imagePath  = imgPath;
    _onComplete = callback;
    _timeTotal  = timeLimit;
    _timeLeft   = timeLimit;
    _moveCount  = 0;

    _preview.style.backgroundImage = `url('${imgPath}')`;

    // 해결 가능한 상태로 셔플
    _tiles = Array.from({ length: GRID * GRID }, (_, i) => i);
    shuffleTiles(_tiles, 100);

    renderGrid();
    updateFooter();
    startTimer();

    _container.style.display = 'flex';
}

export function hideSlidePuzzle() {
    stopTimer();
    if (_container) _container.style.display = 'none';
}

// ── 셔플 (유효한 이동만 사용 → 항상 풀 수 있음) ────────────────────────
function shuffleTiles(state, moves) {
    let blankPos = state.indexOf(BLANK);
    let lastSwap = -1;
    for (let i = 0; i < moves; i++) {
        const candidates = getNeighbors(blankPos).filter(n => n !== lastSwap);
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        [state[blankPos], state[pick]] = [state[pick], state[blankPos]];
        lastSwap = blankPos;
        blankPos = pick;
    }
}

function getNeighbors(pos) {
    const row = Math.floor(pos / GRID);
    const col = pos % GRID;
    const n = [];
    if (row > 0)      n.push(pos - GRID);
    if (row < GRID-1) n.push(pos + GRID);
    if (col > 0)      n.push(pos - 1);
    if (col < GRID-1) n.push(pos + 1);
    return n;
}

// ── 렌더링 ────────────────────────────────────────────────────────────
function renderGrid() {
    _grid.innerHTML = '';
    const blankPos  = _tiles.indexOf(BLANK);
    const movable   = new Set(getNeighbors(blankPos));

    _tiles.forEach((piece, pos) => {
        const cell = document.createElement('div');
        cell.className = 'sp-tile';

        if (piece === BLANK) {
            cell.classList.add('sp-blank');
        } else {
            const srcRow = Math.floor(piece / GRID);
            const srcCol = piece % GRID;
            cell.style.backgroundImage    = `url('${_imagePath}')`;
            cell.style.backgroundSize     = `${GRID * 100}% ${GRID * 100}%`;
            // 0 / (GRID-1) = 0, 1/(GRID-1)=50%, 2/(GRID-1)=100%
            cell.style.backgroundPosition =
                `${(srcCol / (GRID - 1)) * 100}% ${(srcRow / (GRID - 1)) * 100}%`;
            if (movable.has(pos)) cell.classList.add('sp-movable');
        }

        cell.addEventListener('click', () => onTileClick(pos));
        _grid.appendChild(cell);
    });
}

function onTileClick(pos) {
    const blankPos = _tiles.indexOf(BLANK);
    if (!getNeighbors(blankPos).includes(pos)) return;

    [_tiles[blankPos], _tiles[pos]] = [_tiles[pos], _tiles[blankPos]];
    _moveCount++;
    renderGrid();
    updateFooter();

    if (isSolved()) setTimeout(() => finish(true), 250);
}

function isSolved() {
    return _tiles.every((piece, pos) => piece === pos);
}

function updateFooter() {
    if (_movesEl) _movesEl.textContent = `이동: ${_moveCount}`;
}

// ── 타이머 ────────────────────────────────────────────────────────────
function startTimer() {
    stopTimer();
    syncTimerUI();
    _timerInterval = setInterval(() => {
        _timeLeft--;
        syncTimerUI();
        if (_timeLeft <= 0) finish(false);
    }, 1000);
}

function stopTimer() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

function syncTimerUI() {
    if (_timerText) _timerText.textContent = _timeLeft;
    const pct = (_timeLeft / _timeTotal) * 100;
    if (_timerFill) {
        _timerFill.style.width = `${pct}%`;
        _timerFill.classList.toggle('sp-timer-warning', pct <= 25);
    }
}

// ── 종료 ──────────────────────────────────────────────────────────────
function finish(won) {
    stopTimer();
    hideSlidePuzzle();
    if (_onComplete) _onComplete(won, _moveCount);
}
