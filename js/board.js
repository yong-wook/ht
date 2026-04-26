import { STAGES, MONEY_PER_POINT_LEVELS } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';
import * as Stage from './stage.js';
import * as HighLow from './highlow.js';
import * as Roulette from './roulette.js';
import * as Showtime from './showtime.js';
import * as SlidePuzzle from './slidepuzzle.js';
import { audioManager, BGM } from './audio.js';
import {
    showGomoku, showFishing, showNumberBaseball, showBreakout,
    showSudoku, showMinesweeper, showArrowDodge, showPickpocket, showTetris, showGwageo,
} from './minigames.js';

// ── 보드 타일 정의 (24칸) ─────────────────────────────────────────────
export const BOARD_TILES = [
    // 상단 좌→우 (0~6)
    { id:  0, type: 'start',     name: '출발\n한양',  icon: '🏯', corner: true },
    { id:  1, type: 'giyeon',    name: '기연',        icon: '🌸' },
    { id:  2, type: 'character', name: '소이',        stageId: 1 },
    { id:  3, type: 'jujak',     name: '주막',        icon: '🍶' },
    { id:  4, type: 'character', name: '아린',        stageId: 2 },
    { id:  5, type: 'gwana',     name: '관아',        icon: '🏛' },
    { id:  6, type: 'jangter',   name: '장터',        icon: '🎪', corner: true },
    // 우측 상→하 (7~11)
    { id:  7, type: 'sanjeok',   name: '산적',        icon: '🗡' },
    { id:  8, type: 'character', name: '나연',        stageId: 3 },
    { id:  9, type: 'oncheon',   name: '온천',        icon: '♨' },
    { id: 10, type: 'character', name: '하은',        stageId: 4 },
    { id: 11, type: 'seodang',   name: '서당',        icon: '📚' },
    // 우하단 코너 (12)
    { id: 12, type: 'nugang',    name: '누각',        icon: '🌙', corner: true },
    // 하단 우→좌 (13~17)
    { id: 13, type: 'hyeongok',  name: '형옥',        icon: '⛓' },
    { id: 14, type: 'character', name: '채아',        stageId: 5 },
    { id: 15, type: 'gibang',    name: '기방',        icon: '🌺' },
    { id: 16, type: 'character', name: '서린',        stageId: 6 },
    { id: 17, type: 'gaekju',    name: '객주',        icon: '💰' },
    // 좌하단 코너 (18)
    { id: 18, type: 'dobakjang', name: '도박장',      icon: '🎰', corner: true },
    // 좌측 하→상 (19~23)
    { id: 19, type: 'bangnanggaek', name: '방랑객',   icon: '🧳' },
    { id: 20, type: 'character', name: '혜화',        stageId: 7 },
    { id: 21, type: 'gwageo',    name: '과거장',       icon: '📜' },
    { id: 22, type: 'character', name: '봉황',        stageId: 8 },
    { id: 23, type: 'bobusang',  name: '보부상',      icon: '💼' },
];

// CSS grid [column, row] (1-indexed)
const TILE_GRID_POS = [
    [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1], // 상단
    [7,2],[7,3],[7,4],[7,5],[7,6],             // 우측
    [7,7],[6,7],[5,7],[4,7],[3,7],[2,7],[1,7], // 하단
    [1,6],[1,5],[1,4],[1,3],[1,2],             // 좌측
];

// 타일 호버 툴팁
const TILE_TOOLTIPS = {
    start:        '출발점 통과 +10,000냥 보너스',
    giyeon:       '패 3장 중 선택 — 기연의 인연',
    jujak:        '밥 한 끼 or 막걸리 내기',
    gaekju:       '냥을 맡기고 재방문 시 이자 정산 (등급별 도박)',
    gwageo:       '조선 상식 5문제 — 정답 수에 따라 보상 차등',
    gwana:        '납세 순순히 or 뇌물 시도',
    hyeongok:     '잡혀갔습니다! 테트리스로 탈출 도전',
    nugang:       '패 3장 중 선택 — 경치 감상',
    sanjeok:      '도주 / 결투(강타·속공·방어) / 몸값 선택',
    oncheon:      '탕 3종 중 선택 — 피로 회복',
    seodang:      '그림 맞추기 도전 (90초)',
    gibang:       '공연 감상 (-25,000냥)',
    dobakjang:    '룰렛 스핀!',
    bangnanggaek: '보따리 2개 중 선택',
    bobusang:     '물건 3개 중 선택',
    jangter:      '화투 하이로우 내기',
    character:    '클릭 → 고스톱 대결',
};

const TOTAL_TILES = BOARD_TILES.length;
const DIE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// ── 컬렉션 완성 수 ─────────────────────────────────────────────────────────
function getCompletedCollectionCount() {
    return STAGES.filter(s =>
        (Game.unlockedBackgrounds[s.id.toString()] || []).length >= 12
    ).length;
}

// 미니게임 보상
const MG_REWARDS = {
    gomoku:      { win: 50000, lose: 5000  },
    fishing:     { win: 35000, lose: 8000  },
    baseball:    { win: 30000, lose: 5000  },
    breakout:    { win: 40000, lose: 8000  },
    sudoku:      { win: 30000, lose: 5000  },
    minesweeper: { win: 35000, lose: 5000  },
    arrowdodge:  { win: 40000, lose: 8000  },
    pickpocket:  { win: 35000, lose: 5000  },
    tetris:      { win: 40000, lose: 8000  },
};

function applyMgResult(won, key) {
    const r = MG_REWARDS[key];
    const win  = scaleMoney(r.win);
    const lose = scaleMoney(r.lose);
    const delta = won ? win : -lose;
    Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
    UI.updateTotalMoneyDisplay(Game.playerMoney);
    Game.saveGameData();
    updateBoardInfo();
    UI.showModal(
        won ? '미니게임 승리! 🎉' : '미니게임 패배',
        won
            ? `훌륭합니다! +${win.toLocaleString()}냥`
            : `아쉽네요. -${lose.toLocaleString()}냥`,
        () => { hasRolled = false; }
    );
}

// ── 비용·수입 설정 ─────────────────────────────────────────────────────────
const ROLL_COST          = 10000; // 주사위 굴리기 비용
const INCOME_INTERVAL_SEC = 3600; // 수입 주기 (초) — 1시간
const INCOME_AMOUNT      = 15000; // 수입 금액

let playerPosition = 0;
let isMoving = false;
let hasRolled = false;
let _onGameStart = null;

// 객주 예치금 상태: null 또는 { amount, grade: 'safe'|'normal'|'high' }
let gaekjuDeposit = null;

let countdownTimer = null;
let incomeSecondsLeft = INCOME_INTERVAL_SEC;

// ── 유틸: 배열 셔플 ────────────────────────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── 유틸: 판돈 레벨 비례 금액 계산 ─────────────────────────────────────
// 기준 레벨 1 = 1,000냥/점. 레벨 5 = 100,000냥/점이면 100배 적용
function scaleMoney(base) {
    const mult = Game.moneyPerPoint / 1000;
    return Math.round(base * mult / 1000) * 1000; // 1,000냥 단위 반올림
}

// ── 수입 타이머 ────────────────────────────────────────────────────────
function startIncomeTimer() {
    if (countdownTimer) return;
    countdownTimer = setInterval(() => {
        incomeSecondsLeft--;
        if (incomeSecondsLeft <= 0) {
            const income = scaleMoney(INCOME_AMOUNT);
            Game.setPlayerMoney(Game.playerMoney + income);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            updateBoardInfo();
            UI.showToast(`💴 세금 수입 +${income.toLocaleString()}냥`);
            incomeSecondsLeft = INCOME_INTERVAL_SEC;
        }
        updateIncomeDisplay();
    }, 1000);
}

export function stopBoardTimer() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function updateIncomeDisplay() {
    const el = document.getElementById('board-income-timer');
    if (!el) return;
    const m = Math.floor(incomeSecondsLeft / 60);
    const s = incomeSecondsLeft % 60;
    const timeStr = m > 0
        ? `${m}분 ${String(s).padStart(2,'0')}초`
        : `${s}초`;
    el.textContent = `💴 수입까지 ${timeStr}`;
}

// ── 초기화 ────────────────────────────────────────────────────────────
export function initBoard(onGameStart) {
    _onGameStart = onGameStart;
    playerPosition = 0;
    isMoving = false;
    hasRolled = false;
    gaekjuDeposit = null;
    incomeSecondsLeft = INCOME_INTERVAL_SEC;
    renderBoard();
    // 렌더 후 토큰 배치 (requestAnimationFrame으로 레이아웃 완료 후)
    requestAnimationFrame(() => updateToken());
    updateBoardInfo();
    updateIncomeDisplay();
    const rollBtn = document.getElementById('board-roll-btn');
    rollBtn.textContent = `🎲 굴리기 (-${ROLL_COST.toLocaleString()}냥)`;
    rollBtn.onclick = onRollClick;

    document.getElementById('board-levelup-btn').onclick = openLevelUpModal;
    updateLevelDisplay();
    startIncomeTimer();
}

// ── 새 턴 시작 (게임 복귀 후 호출) ────────────────────────────────────
export function startNewTurn() {
    hasRolled = false;
    isMoving = false;
    renderBoard(); // 수집 하트 갱신
    requestAnimationFrame(() => updateToken());
    updateBoardInfo();
    updateIncomeDisplay();
    updateLevelDisplay();
    startIncomeTimer(); // 게임 복귀 후 타이머가 꺼져 있으면 재시작
}

// ── 보드 렌더링 ───────────────────────────────────────────────────────
function renderBoard() {
    const grid = document.getElementById('board-grid');
    grid.querySelectorAll('.board-tile').forEach(e => e.remove());

    // 툴팁 요소 (없으면 생성)
    let tooltipEl = document.getElementById('board-tile-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'board-tile-tooltip';
        document.getElementById('board-wrapper').appendChild(tooltipEl);
    }

    BOARD_TILES.forEach((tile, idx) => {
        const [col, row] = TILE_GRID_POS[idx];
        const el = document.createElement('div');
        el.className = 'board-tile';
        el.dataset.tileId = idx;
        el.style.gridColumn = col;
        el.style.gridRow = row;

        // 타입별 클래스
        if (tile.corner) el.classList.add('tile-corner');
        if (tile.type === 'start')        el.classList.add('tile-start');
        if (tile.type === 'character')    el.classList.add('tile-character');
        if (tile.type === 'gwana')        el.classList.add('tile-gwana');
        if (tile.type === 'giyeon')       el.classList.add('tile-giyeon');
        if (tile.type === 'jujak')        el.classList.add('tile-jujak');
        if (tile.type === 'jangter')      el.classList.add('tile-jangter');
        if (tile.type === 'nugang')       el.classList.add('tile-nugang');
        if (tile.type === 'sanjeok')      el.classList.add('tile-sanjeok');
        if (tile.type === 'oncheon')      el.classList.add('tile-oncheon');
        if (tile.type === 'seodang')      el.classList.add('tile-seodang');
        if (tile.type === 'gibang')       el.classList.add('tile-gibang');
        if (tile.type === 'dobakjang')    el.classList.add('tile-dobakjang');
        if (tile.type === 'bangnanggaek') el.classList.add('tile-bangnanggaek');
        if (tile.type === 'bobusang')     el.classList.add('tile-bobusang');
        if (tile.type === 'gaekju')       el.classList.add('tile-gaekju');
        if (tile.type === 'hyeongok')     el.classList.add('tile-hyeongok');
        if (tile.type === 'gwageo')       el.classList.add('tile-gwageo');

        if (tile.type === 'character') {
            const stage = STAGES.find(s => s.id === tile.stageId);
            const collected = (Game.unlockedBackgrounds[tile.stageId.toString()] || []).length;
            const hearts = collected > 0
                ? '<span class="tile-hearts">♥</span>'.repeat(Math.min(collected, 4))
                  + (collected > 4 ? `<span class="tile-hearts" style="opacity:.6">+${collected-4}</span>` : '')
                : '';
            el.innerHTML = `
                <div class="tile-char-img-wrap">
                    <img src="${stage.image}" class="tile-char-img" alt="${tile.name}">
                </div>
                <div class="tile-char-name">${tile.name}</div>
                <div class="tile-hearts-row">${hearts}</div>
            `;
        } else {
            el.innerHTML = `
                <div class="tile-icon">${tile.icon}</div>
                <div class="tile-name">${tile.name}</div>
            `;
        }

        // 툴팁 데이터
        const tooltipText = TILE_TOOLTIPS[tile.type] || '';
        if (tooltipText) el.dataset.tooltip = tooltipText;

        grid.appendChild(el);
    });

    // 호버 툴팁 이벤트 연결
    grid.querySelectorAll('[data-tooltip]').forEach(tileEl => {
        tileEl.addEventListener('mouseenter', () => {
            tooltipEl.textContent = tileEl.dataset.tooltip;
            tooltipEl.classList.add('visible');
        });
        tileEl.addEventListener('mousemove', (e) => {
            const wRect = document.getElementById('board-wrapper').getBoundingClientRect();
            tooltipEl.style.left = (e.clientX - wRect.left + 14) + 'px';
            tooltipEl.style.top  = (e.clientY - wRect.top  - 42) + 'px';
        });
        tileEl.addEventListener('mouseleave', () => {
            tooltipEl.classList.remove('visible');
        });
    });
}

// ── 플레이어 토큰 위치 ────────────────────────────────────────────────
function updateToken() {
    const tileEl = document.querySelector(`.board-tile[data-tile-id="${playerPosition}"]`);
    const token  = document.getElementById('player-token');
    const wrapper = document.getElementById('board-wrapper');
    if (!tileEl || !token || !wrapper) return;

    // 활성 타일 강조
    document.querySelectorAll('.board-tile').forEach(t => t.classList.remove('tile-active'));
    tileEl.classList.add('tile-active');

    const wRect = wrapper.getBoundingClientRect();
    const tRect = tileEl.getBoundingClientRect();
    const tokenW = token.offsetWidth  || 22;
    const tokenH = token.offsetHeight || 22;
    token.style.left = (tRect.left - wRect.left + tRect.width  / 2 - tokenW / 2) + 'px';
    token.style.top  = (tRect.top  - wRect.top  + tRect.height / 2 - tokenH / 2) + 'px';
}

// ── 주사위 굴리기 ─────────────────────────────────────────────────────
function onRollClick() {
    if (isMoving || hasRolled) return;

    // 굴리기 비용 확인
    if (Game.playerMoney < ROLL_COST) {
        showAdModal(() => {
            Game.setPlayerMoney(Game.playerMoney + 10000);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            updateBoardInfo();
            UI.showModal('💰 충전 완료!', '광고 시청으로 10,000냥을 받았습니다!', () => {});
        });
        return;
    }

    Game.setPlayerMoney(Game.playerMoney - ROLL_COST);
    UI.updateTotalMoneyDisplay(Game.playerMoney);
    Game.saveGameData();
    updateBoardInfo();

    hasRolled = true;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    const die1El = document.getElementById('die1');
    const die2El = document.getElementById('die2');
    die1El.classList.add('rolling');
    die2El.classList.add('rolling');

    let tick = 0;
    const interval = setInterval(() => {
        die1El.textContent = DIE_FACES[Math.floor(Math.random() * 6)];
        die2El.textContent = DIE_FACES[Math.floor(Math.random() * 6)];
        tick++;
        if (tick >= 12) {
            clearInterval(interval);
            die1El.classList.remove('rolling');
            die2El.classList.remove('rolling');
            die1El.textContent = DIE_FACES[d1 - 1];
            die2El.textContent = DIE_FACES[d2 - 1];
            document.getElementById('board-dice-result').textContent = `${d1} + ${d2} = ${total}칸`;
            movePlayer(total);
        }
    }, 75);
}

// ── 이동 ──────────────────────────────────────────────────────────────
function movePlayer(steps) {
    isMoving = true;
    let remaining = steps;

    function stepOnce() {
        if (remaining <= 0) {
            isMoving = false;
            landOnTile(playerPosition);
            return;
        }

        // 떠나는 타일에 궤적 효과
        const leavingTile = document.querySelector(`.board-tile[data-tile-id="${playerPosition}"]`);

        playerPosition = (playerPosition + 1) % TOTAL_TILES;

        // 출발점 통과 보너스
        if (playerPosition === 0) {
            const bonus = scaleMoney(10000);
            Game.setPlayerMoney(Game.playerMoney + bonus);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            UI.showToast(`출발점 통과! +${bonus.toLocaleString()}냥`);
        }

        updateToken();

        // 궤적 효과 (tile-active가 제거된 직후 trail 추가)
        if (leavingTile) {
            leavingTile.classList.add('tile-trail');
            setTimeout(() => leavingTile.classList.remove('tile-trail'), 900);
        }

        updateBoardInfo();
        remaining--;
        setTimeout(stepOnce, 280);
    }

    stepOnce();
}

// ── 타일 착지 ─────────────────────────────────────────────────────────
function landOnTile(pos) {
    const tile = BOARD_TILES[pos];

    // ── 캐릭터 타일 ──────────────────────────────────────────────────
    if (tile.type === 'character') {
        const stage = STAGES.find(s => s.id === tile.stageId);
        Game.setOpponentName(stage.characterName);
        Stage.openCharPanel(
            stage,
            (s) => {
                document.getElementById('board-container').style.display = 'none';
                Game.setBoardEncounterMode(true);
                Game.setLastRoundWinner(null);
                _onGameStart(s);
            },
            () => {
                // 호의 선택: 게임 없이 이번 턴 종료
                startNewTurn();
            }
        );
        return;
    }

    // ── 장터: 소매치기잡기 (8명 수집 완료) / 하이로우 ───────────────
    if (tile.type === 'jangter') {
        if (getCompletedCollectionCount() >= 8) {
            UI.showModal('장터 — 소매치기잡기', `장터가 소란스럽습니다! 소매치기를 잡아라!\n50초 안에 10명을 잡으면 +${scaleMoney(35000).toLocaleString()}냥, 실패하면 -${scaleMoney(5000).toLocaleString()}냥`,
                () => showPickpocket(() => applyMgResult(true, 'pickpocket'), () => applyMgResult(false, 'pickpocket'))
            );
            return;
        }
        const hlWin = scaleMoney(25000), hlLose = scaleMoney(15000);
        UI.showModal('장터', `장터에서 화투 하이로우 내기를 제안받았습니다.\n2번 연속으로 맞추면 ${hlWin.toLocaleString()}냥!\n승부를 받아들이겠습니까?`,
            () => {
                HighLow.showHighLow(1, (won) => {
                    HighLow.hideHighLow();
                    const delta = won ? hlWin : -hlLose;
                    Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
                    UI.updateTotalMoneyDisplay(Game.playerMoney);
                    Game.saveGameData();
                    updateBoardInfo();
                    UI.showModal(
                        won ? '승리!' : '패배!',
                        won ? `두 번 연속 적중! +${hlWin.toLocaleString()}냥` : `하이로우에서 졌습니다. -${hlLose.toLocaleString()}냥`,
                        () => { hasRolled = false; }
                    );
                }, {
                    title: '장터 화투 내기!',
                    desc: `2번 연속으로 맞추면 ${hlWin.toLocaleString()}냥 획득!`,
                    required: 2,
                });
            }
        );
        return;
    }

    // ── 도박장: 룰렛 ─────────────────────────────────────────────────
    if (tile.type === 'dobakjang') {
        UI.showModal('도박장', '도박장의 룰렛이 돌아가고 있습니다!\n룰렛이 강제로 돌아갑니다.',
            () => {
                Roulette.showRoulette((item) => {
                    Roulette.hideRoulette();
                    const eff = item.effect;
                    if (eff.type === 'boardMoney') {
                        Game.setPlayerMoney(Game.playerMoney + eff.value);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal('도박장 결과!', `${item.name}\n+${eff.value.toLocaleString()}냥 획득!`, () => { hasRolled = false; });
                    } else if (eff.type === 'boardMoneyLoss') {
                        Game.setPlayerMoney(Math.max(0, Game.playerMoney - eff.value));
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal('도박장 결과', `${item.name}\n-${eff.value.toLocaleString()}냥...`, () => { hasRolled = false; });
                    } else if (eff.type === 'none') {
                        UI.showModal('도박장 결과', '꽝! 오늘은 운이 따르지 않네요.', () => { hasRolled = false; });
                    } else {
                        Game.setCurrentRouletteReward(item);
                        Game.saveGameData();
                        UI.showModal('도박장 결과!', `✨ ${item.name} 획득!\n다음 고스톱 승부에서 적용됩니다.`, () => { hasRolled = false; });
                    }
                });
            }
        );
        return;
    }

    // ── 서당: 슬라이드 퍼즐 ──────────────────────────────────────────
    if (tile.type === 'seodang') {
        const WIN_REWARD  = scaleMoney(30000);
        const CONSOLATION = scaleMoney(5000);

        const allUnlocked = [];
        STAGES.forEach(s => {
            (Game.unlockedBackgrounds[s.id.toString()] || []).forEach(bgId => {
                allUnlocked.push({ stageId: s.id, bgId });
            });
        });

        if (allUnlocked.length === 0) {
            const bonus = scaleMoney(10000);
            Game.setPlayerMoney(Game.playerMoney + bonus);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            updateBoardInfo();
            UI.showModal('서당', `서당에서 학문을 쌓았습니다. +${bonus.toLocaleString()}냥\n(배경을 수집하면 그림 맞추기에 도전할 수 있습니다!)`, () => { hasRolled = false; });
            return;
        }

        UI.showModal(
            '서당 — 그림 맞추기',
            `선생이 그림 맞추기 시험을 냅니다!\n90초 안에 완성 → +${WIN_REWARD.toLocaleString()}냥\n실패해도 위로금 +${CONSOLATION.toLocaleString()}냥`,
            () => {
                const pick = allUnlocked[Math.floor(Math.random() * allUnlocked.length)];
                const imgPath = `images/stages/stage${pick.stageId}/showtime_bg_stage${pick.stageId}_${String(pick.bgId).padStart(2, '0')}.jpg`;

                document.getElementById('board-container').style.display = 'none';
                SlidePuzzle.showSlidePuzzle(imgPath, (won, moves) => {
                    document.getElementById('board-container').style.display = 'block';
                    const reward = won ? WIN_REWARD : CONSOLATION;
                    Game.setPlayerMoney(Game.playerMoney + reward);
                    UI.updateTotalMoneyDisplay(Game.playerMoney);
                    Game.saveGameData();
                    updateBoardInfo();
                    UI.showModal(
                        won ? '합격!' : '시간 초과',
                        won
                            ? `훌륭합니다! ${moves}번 만에 완성!\n+${WIN_REWARD.toLocaleString()}냥`
                            : `아쉽네요. 다음엔 꼭 성공하세요!\n위로금 +${CONSOLATION.toLocaleString()}냥`,
                        () => { hasRolled = false; }
                    );
                });
            }
        );
        return;
    }

    // ── 기방: 쇼타임 감상 ────────────────────────────────────────────
    if (tile.type === 'gibang') {
        const cost = scaleMoney(25000);
        const allUnlocked = [];
        STAGES.forEach(s => {
            (Game.unlockedBackgrounds[s.id.toString()] || []).forEach(bgId => {
                allUnlocked.push({ stageId: s.id, bgId });
            });
        });

        if (allUnlocked.length === 0) {
            UI.showModal('기방', '아직 감상할 공연이 없습니다.\n고스톱에서 승리해 배경을 먼저 수집하세요!', () => { hasRolled = false; });
            return;
        }

        if (Game.playerMoney < cost) {
            UI.showModal('기방', `입장료가 부족합니다.\n필요: ${cost.toLocaleString()}냥`, () => { hasRolled = false; });
            return;
        }

        UI.showModal(
            '기방',
            `기생의 공연을 감상하시겠습니까?\n입장료: ${cost.toLocaleString()}냥\n(수집된 배경 중 무작위 공연)`,
            () => {
                Game.setPlayerMoney(Game.playerMoney - cost);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();

                const pick = allUnlocked[Math.floor(Math.random() * allUnlocked.length)];
                const imagePath = `images/stages/stage${pick.stageId}/showtime_bg_stage${pick.stageId}_${String(pick.bgId).padStart(2, '0')}.jpg`;

                document.getElementById('board-container').style.display = 'none';
                Showtime.showShowtime(
                    () => {
                        Showtime.hideShowtime();
                        document.getElementById('board-container').style.display = 'block';
                        startNewTurn();
                    },
                    null, imagePath, null, null, false
                );
            }
        );
        return;
    }

    // ── 출발점 정확 착지 ─────────────────────────────────────────────
    if (tile.type === 'start') {
        // 모든 미녀 배경 완성 → 최종 엔딩
        if (STAGES.every(s => (Game.unlockedBackgrounds[s.id.toString()] || []).length >= 12)) {
            showFinalEnding();
            return;
        }
        const extra = scaleMoney(5000);
        Game.setPlayerMoney(Game.playerMoney + extra);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        UI.showModal('출발점 도착!', `한양에 도착했습니다! 추가 보너스 +${extra.toLocaleString()}냥`, () => { hasRolled = false; });
        return;
    }

    // ════════════════════════════════════════════════════════════════
    // 인터랙티브 이벤트 타일
    // ════════════════════════════════════════════════════════════════

    // ── 과거장: 조선 상식 퀴즈 ───────────────────────────────────────
    if (tile.type === 'gwageo') {
        const [gw1, gw2, gw3, gw4] = [50000, 20000, 5000, 15000].map(scaleMoney);
        UI.showModal(
            '📜 과거 시험',
            `5문제를 풀어 정답 수에 따라 보상을 받습니다!\n장원급제(5개) +${gw1.toLocaleString()}냥 / 합격(3~4개) +${gw2.toLocaleString()}냥\n낙방(1~2개) -${gw3.toLocaleString()}냥 / 파방(0개) -${gw4.toLocaleString()}냥`,
            () => showGwageo((correct) => {
                let delta, title, msg;
                if (correct >= 5)      { delta =  gw1; title = '장원급제! 🎉'; msg = `5문제 전부 정답! +${gw1.toLocaleString()}냥`; }
                else if (correct >= 3) { delta =  gw2; title = '합격!';         msg = `${correct}문제 정답. +${gw2.toLocaleString()}냥`; }
                else if (correct >= 1) { delta = -gw3; title = '낙방';          msg = `${correct}문제 정답. -${gw3.toLocaleString()}냥`; }
                else                   { delta = -gw4; title = '파방!';         msg = `전부 오답입니다. -${gw4.toLocaleString()}냥`; }
                Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();
                UI.showModal(title, msg, () => { hasRolled = false; });
            })
        );
        return;
    }

    // ── 기연: 낚시 (2명 수집 완료) / 패 3장 뒤집기 ──────────────────
    if (tile.type === 'giyeon') {
        if (getCompletedCollectionCount() >= 2) {
            UI.showModal('기연 — 낚시', `기연의 인연으로 낚시터에서 도전!\n60초 안에 5마리를 잡으면 +${scaleMoney(35000).toLocaleString()}냥, 실패하면 -${scaleMoney(8000).toLocaleString()}냥`,
                () => showFishing(() => applyMgResult(true, 'fishing'), () => applyMgResult(false, 'fishing'))
            );
            return;
        }
        const rewards = shuffle([8000, 15000, 25000].map(scaleMoney));
        const icons = ['🌸', '🌺', '🌼'];
        const cards = rewards.map((r, i) => ({
            frontIcon: icons[i],
            frontLabel: `+${r.toLocaleString()}냥`,
            value: r,
        }));
        showCardFlipChoice(
            '기연',
            '세 장의 패 중 하나를 골라 인연을 맺으세요.',
            cards,
            (card) => {
                Game.setPlayerMoney(Game.playerMoney + card.value);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();
                UI.showModal('기연!', `뜻밖의 인연으로 +${card.value.toLocaleString()}냥 획득!`, () => { hasRolled = false; });
            }
        );
        return;
    }

    // ── 누각: 오목 (1명 수집 완료) / 패 3장 뒤집기 ──────────────────
    if (tile.type === 'nugang') {
        if (getCompletedCollectionCount() >= 1) {
            UI.showModal('누각 — 오목', `달밤의 누각에서 오목 고수가 도전해옵니다!\n5목을 완성하면 +${scaleMoney(50000).toLocaleString()}냥, 패배하면 -${scaleMoney(5000).toLocaleString()}냥`,
                () => showGomoku(() => applyMgResult(true, 'gomoku'), () => applyMgResult(false, 'gomoku'))
            );
            return;
        }
        const rewards = shuffle([15000, 25000, 40000].map(scaleMoney));
        const icons = ['🌟', '⭐', '🌙'];
        const cards = rewards.map((r, i) => ({
            frontIcon: icons[i],
            frontLabel: `+${r.toLocaleString()}냥`,
            value: r,
        }));
        showCardFlipChoice(
            '누각',
            '달밤 누각에서 어떤 경치를 감상하시겠습니까?',
            cards,
            (card) => {
                Game.setPlayerMoney(Game.playerMoney + card.value);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();
                UI.showModal('누각', `경치에서 영감을 얻었습니다. +${card.value.toLocaleString()}냥`, () => { hasRolled = false; });
            }
        );
        return;
    }

    // ── 보부상: 지뢰찾기 (6명 수집 완료) / 물건 3개 뒤집기 ──────────
    if (tile.type === 'bobusang') {
        if (getCompletedCollectionCount() >= 6) {
            UI.showModal('보부상 — 지뢰찾기', `보부상이 위험한 내기를 겁니다!\n8개의 지뢰를 피해 모두 열면 +${scaleMoney(35000).toLocaleString()}냥, 지뢰를 밟으면 -${scaleMoney(5000).toLocaleString()}냥`,
                () => showMinesweeper(() => applyMgResult(true, 'minesweeper'), () => applyMgResult(false, 'minesweeper'))
            );
            return;
        }
        const items = shuffle([
            { icon: '⚗️', name: '비약',   value: scaleMoney(25000) },
            { icon: '📜', name: '비법서', value: scaleMoney(12000) },
            { icon: '🎁', name: '보따리', value: scaleMoney(6000)  },
        ]);
        const cards = items.map(item => ({
            frontIcon: item.icon,
            frontLabel: `${item.name}\n+${item.value.toLocaleString()}냥`,
            value: item.value,
            name: item.name,
        }));
        showCardFlipChoice(
            '보부상',
            '보부상이 세 가지 물건을 내놓았습니다. 하나를 선택하세요.',
            cards,
            (card) => {
                Game.setPlayerMoney(Game.playerMoney + card.value);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();
                UI.showModal('보부상', `${card.name}을(를) 얻었습니다. +${card.value.toLocaleString()}냥!`, () => { hasRolled = false; });
            }
        );
        return;
    }

    // ── 방랑객: 화살피하기 (7명 수집 완료) / 보따리 2개 선택 ─────────
    if (tile.type === 'bangnanggaek') {
        if (getCompletedCollectionCount() >= 7) {
            UI.showModal('방랑객 — 화살피하기', `방랑객이 위험한 내기를 겁니다!\n30초 동안 화살을 피하면 +${scaleMoney(40000).toLocaleString()}냥, 모두 맞으면 -${scaleMoney(8000).toLocaleString()}냥`,
                () => showArrowDodge(() => applyMgResult(true, 'arrowdodge'), () => applyMgResult(false, 'arrowdodge'))
            );
            return;
        }
        const bgAmt = scaleMoney(20000);
        const cards = shuffle([
            { frontIcon: '🎁', frontLabel: `+${bgAmt.toLocaleString()}냥`, value:  bgAmt },
            { frontIcon: '😈', frontLabel: `-${bgAmt.toLocaleString()}냥`, value: -bgAmt },
        ]);
        showCardFlipChoice(
            '방랑객',
            '방랑객이 보따리 두 개를 내밉니다. 하나를 선택하세요.',
            cards,
            (card) => {
                Game.setPlayerMoney(Math.max(0, Game.playerMoney + card.value));
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();
                UI.showModal(
                    card.value > 0 ? '방랑객의 선물!' : '방랑객의 사기!',
                    card.value > 0
                        ? `기이한 비약을 얻었습니다. +${bgAmt.toLocaleString()}냥`
                        : `방랑객인 줄 알았더니 사기꾼! -${bgAmt.toLocaleString()}냥`,
                    () => { hasRolled = false; }
                );
            }
        );
        return;
    }

    // ── 산적: 도주 / 싸움 / 몸값 ────────────────────────────────────
    if (tile.type === 'sanjeok') {
        const [sEscOk, sEscFail, sFightWin, sFightLose, sRansom] =
            [5000, 30000, 15000, 35000, 20000].map(scaleMoney);
        showChoiceModal(
            '산적 출몰!',
            '험악한 산적 무리가 앞을 가로막았습니다!',
            [
                {
                    label: '🏃 도주하기',
                    subtext: `성공(70%): -${sEscOk.toLocaleString()}냥 | 실패(30%): -${sEscFail.toLocaleString()}냥`,
                    callback: () => {
                        const success = Math.random() < 0.7;
                        const delta = success ? -sEscOk : -sEscFail;
                        Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal(
                            success ? '도주 성공!' : '도주 실패!',
                            success ? `간신히 도망쳤습니다. -${sEscOk.toLocaleString()}냥` : `붙잡혀 크게 당했습니다! -${sEscFail.toLocaleString()}냥`,
                            () => { hasRolled = false; }
                        );
                    },
                },
                {
                    label: '⚔️ 결투하기',
                    subtext: `강타 / 속공 / 방어 — 먼저 2승 | 승: +${sFightWin.toLocaleString()}냥 | 패: -${sFightLose.toLocaleString()}냥`,
                    danger: true,
                    callback: () => {
                        showBanditFight(
                            () => {
                                Game.setPlayerMoney(Game.playerMoney + sFightWin);
                                UI.updateTotalMoneyDisplay(Game.playerMoney);
                                Game.saveGameData();
                                updateBoardInfo();
                                UI.showModal('결투 승리!', `산적을 물리쳤습니다! +${sFightWin.toLocaleString()}냥`, () => { hasRolled = false; });
                            },
                            () => {
                                Game.setPlayerMoney(Math.max(0, Game.playerMoney - sFightLose));
                                UI.updateTotalMoneyDisplay(Game.playerMoney);
                                Game.saveGameData();
                                updateBoardInfo();
                                UI.showModal('결투 패배', `산적에게 크게 당했습니다. -${sFightLose.toLocaleString()}냥`, () => { hasRolled = false; });
                            }
                        );
                    },
                },
                {
                    label: '💰 몸값 제공',
                    subtext: `-${sRansom.toLocaleString()}냥 확정 (안전)`,
                    highlight: true,
                    callback: () => {
                        Game.setPlayerMoney(Math.max(0, Game.playerMoney - sRansom));
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal('몸값 제공', `산적에게 돈을 건네고 무사히 지났습니다. -${sRansom.toLocaleString()}냥`, () => { hasRolled = false; });
                    },
                },
            ],
            { icon: '🗡' }
        );
        return;
    }

    // ── 형옥: 테트리스 탈출 ──────────────────────────────────────────
    if (tile.type === 'hyeongok') {
        UI.showModal(
            '⛓ 형옥에 갇혔습니다!',
            `관아에 잡혀 형옥에 투옥됐습니다.\n테트리스로 6줄을 제거해 탈출하면 +${scaleMoney(40000).toLocaleString()}냥\n실패하면 -${scaleMoney(8000).toLocaleString()}냥`,
            () => showTetris(() => applyMgResult(true, 'tetris'), () => applyMgResult(false, 'tetris'))
        );
        return;
    }

    // ── 관아: 수도쿠 (5명 수집 완료) / 납세·뇌물 ───────────────────
    if (tile.type === 'gwana') {
        if (getCompletedCollectionCount() >= 5) {
            UI.showModal('관아 — 수도쿠', `관아에서 두뇌 시험을 냅니다!\n9×9 수도쿠를 완성하면 +${scaleMoney(30000).toLocaleString()}냥, 포기하면 -${scaleMoney(5000).toLocaleString()}냥`,
                () => showSudoku(() => applyMgResult(true, 'sudoku'), () => applyMgResult(false, 'sudoku'))
            );
            return;
        }
        showChoiceModal(
            '관아',
            '관리가 세금을 걷으러 왔습니다. 어떻게 하시겠습니까?',
            [
                {
                    label: '💸 순순히 납부',
                    subtext: `-${scaleMoney(12000).toLocaleString()}냥 확정`,
                    highlight: true,
                    callback: () => {
                        const tax = scaleMoney(12000);
                        Game.setPlayerMoney(Math.max(0, Game.playerMoney - tax));
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal('납세 완료', `깔끔하게 납세했습니다. -${tax.toLocaleString()}냥`, () => { hasRolled = false; });
                    },
                },
                {
                    label: '🤫 뇌물 시도',
                    subtext: `성공(50%): 세금 면제 | 발각(50%): -${scaleMoney(25000).toLocaleString()}냥`,
                    danger: true,
                    callback: () => {
                        const fine = scaleMoney(25000);
                        const success = Math.random() < 0.5;
                        if (success) {
                            UI.showModal('뇌물 성공!', '관리가 눈을 감아줬습니다. 세금 면제!', () => { hasRolled = false; });
                        } else {
                            Game.setPlayerMoney(Math.max(0, Game.playerMoney - fine));
                            UI.updateTotalMoneyDisplay(Game.playerMoney);
                            Game.saveGameData();
                            updateBoardInfo();
                            UI.showModal('뇌물 발각!', `뇌물이 들통났습니다! 벌금까지 -${fine.toLocaleString()}냥`, () => { hasRolled = false; });
                        }
                    },
                },
            ],
            { icon: '🏛' }
        );
        return;
    }

    // ── 주막: 숫자야구 (3명 수집 완료) / 쉬어가기·내기 ──────────────
    if (tile.type === 'jujak') {
        if (getCompletedCollectionCount() >= 3) {
            UI.showModal('주막 — 숫자야구', `주막 주인이 세 자리 숫자 내기를 제안합니다!\n7번 안에 맞추면 +${scaleMoney(30000).toLocaleString()}냥, 실패하면 -${scaleMoney(5000).toLocaleString()}냥`,
                () => showNumberBaseball(() => applyMgResult(true, 'baseball'), () => applyMgResult(false, 'baseball'))
            );
            return;
        }
        showChoiceModal(
            '주막',
            '정겨운 주막이 반겨줍니다.',
            [
                {
                    label: '🍚 밥 한 끼',
                    subtext: `+${scaleMoney(8000).toLocaleString()}냥 확정`,
                    highlight: true,
                    callback: () => {
                        const meal = scaleMoney(8000);
                        Game.setPlayerMoney(Game.playerMoney + meal);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal('주막', `따뜻한 밥 한 끼. 기운이 돌아옵니다. +${meal.toLocaleString()}냥`, () => { hasRolled = false; });
                    },
                },
                {
                    label: '🍶 막걸리 내기',
                    subtext: `승리(60%): +${scaleMoney(20000).toLocaleString()}냥 | 패배(40%): -${scaleMoney(10000).toLocaleString()}냥`,
                    danger: true,
                    callback: () => {
                        const jWin = scaleMoney(20000), jLose = scaleMoney(10000);
                        const win = Math.random() < 0.6;
                        const delta = win ? jWin : -jLose;
                        Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal(
                            win ? '내기 승리!' : '내기 패배!',
                            win ? `막걸리 내기에서 이겼습니다! +${jWin.toLocaleString()}냥` : `내기에서 졌습니다. -${jLose.toLocaleString()}냥`,
                            () => { hasRolled = false; }
                        );
                    },
                },
            ],
            { icon: '🍶' }
        );
        return;
    }

    // ── 객주: 예치금 저축 + 이자율 도박 ──────────────────────────────
    if (tile.type === 'gaekju') {
        if (gaekjuDeposit) {
            // 재방문 — 즉시 정산
            const { amount, grade } = gaekjuDeposit;
            gaekjuDeposit = null;
            let multiplier, won = true;
            if (grade === 'safe') {
                multiplier = 1.3;
            } else if (grade === 'normal') {
                won = Math.random() < 0.7;
                multiplier = won ? 1.6 : 0.8;
            } else {
                won = Math.random() < 0.5;
                multiplier = won ? 2.0 : 0.5;
            }
            const payout = Math.floor(amount * multiplier);
            const delta = payout - amount;
            Game.setPlayerMoney(Math.max(0, Game.playerMoney + payout));
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            updateBoardInfo();
            const sign = delta >= 0 ? '+' : '';
            UI.showModal(
                won ? '💰 객주 — 정산 완료!' : '💸 객주 — 손실 발생',
                `예치금 ${amount.toLocaleString()}냥 → ${payout.toLocaleString()}냥 회수\n(${sign}${delta.toLocaleString()}냥)`,
                () => { hasRolled = false; }
            );
            return;
        }

        // 예치 없음 — 등급 + 금액 선택
        showChoiceModal(
            '객주',
            '냥을 맡기고 다시 방문하면 이자를 붙여 정산합니다.\n등급을 선택하세요.',
            [
                {
                    label: '🟢 안전 예치',
                    subtext: '확정 +30% 이자 | 10,000 / 20,000 / 30,000냥',
                    highlight: true,
                    callback: () => openDepositAmountModal('safe'),
                },
                {
                    label: '🟡 보통 예치',
                    subtext: '70% → ×1.6 | 30% → ×0.8',
                    callback: () => openDepositAmountModal('normal'),
                },
                {
                    label: '🔴 고위험 예치',
                    subtext: '50% → ×2.0 | 50% → ×0.5',
                    danger: true,
                    callback: () => openDepositAmountModal('high'),
                },
            ],
            { icon: '💰' }
        );
        return;
    }

    // ── 온천: 벽돌깨기 (4명 수집 완료) / 탕 3종 선택 ────────────────
    if (tile.type === 'oncheon') {
        if (getCompletedCollectionCount() >= 4) {
            UI.showModal('온천 — 벽돌깨기', `온천 연회에서 벽돌깨기 대결!\n모든 벽돌을 깨면 +${scaleMoney(40000).toLocaleString()}냥, 실패하면 -${scaleMoney(8000).toLocaleString()}냥`,
                () => showBreakout(() => applyMgResult(true, 'breakout'), () => applyMgResult(false, 'breakout'))
            );
            return;
        }
        showChoiceModal(
            '온천 발견!',
            '세 가지 탕이 마련되어 있습니다. 어느 탕을 선택하시겠습니까?',
            [
                {
                    label: '💧 기본탕',
                    subtext: `+${scaleMoney(15000).toLocaleString()}냥 확정`,
                    highlight: true,
                    callback: () => {
                        const r = scaleMoney(15000);
                        Game.setPlayerMoney(Game.playerMoney + r);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal('기본탕', `기본탕에서 피로를 풀었습니다. +${r.toLocaleString()}냥`, () => { hasRolled = false; });
                    },
                },
                {
                    label: '🌡️ 열탕',
                    subtext: `효험(70%): +${scaleMoney(30000).toLocaleString()}냥 | 과열(30%): +${scaleMoney(5000).toLocaleString()}냥`,
                    callback: () => {
                        const big = Math.random() < 0.7;
                        const reward = big ? scaleMoney(30000) : scaleMoney(5000);
                        Game.setPlayerMoney(Game.playerMoney + reward);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal(
                            big ? '열탕 대성공!' : '열탕이 너무 뜨거워!',
                            big ? `충분히 몸을 녹였습니다. +${reward.toLocaleString()}냥` : `너무 뜨거워 금방 나왔습니다. +${reward.toLocaleString()}냥`,
                            () => { hasRolled = false; }
                        );
                    },
                },
                {
                    label: '✨ 약탕',
                    subtext: `신효(50%): +${scaleMoney(40000).toLocaleString()}냥 | 효과 미미(50%): +${scaleMoney(10000).toLocaleString()}냥`,
                    danger: true,
                    callback: () => {
                        const miracle = Math.random() < 0.5;
                        const reward = miracle ? scaleMoney(40000) : scaleMoney(10000);
                        Game.setPlayerMoney(Game.playerMoney + reward);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                        updateBoardInfo();
                        UI.showModal(
                            miracle ? '약탕 신효!' : '약탕 효과 미미',
                            miracle ? `비밀 약재의 효험이 대단합니다! +${reward.toLocaleString()}냥` : `약효가 약했네요. +${reward.toLocaleString()}냥`,
                            () => { hasRolled = false; }
                        );
                    },
                },
            ],
            { icon: '♨' }
        );
        return;
    }

    // fallback (알 수 없는 타일 타입)
    hasRolled = false;
}

// ══════════════════════════════════════════════════════════════════════
// 인터랙티브 모달 헬퍼
// ══════════════════════════════════════════════════════════════════════

/**
 * 다중 선택지 모달
 * choices: [{ label, subtext?, callback, danger?, highlight? }]
 * opts: { icon? }
 */
function openDepositAmountModal(grade) {
    const gradeDesc = grade === 'safe'
        ? '안전 등급 — 확정 ×1.3'
        : grade === 'normal'
            ? '보통 등급 — 70%: ×1.6 / 30%: ×0.8'
            : '고위험 등급 — 50%: ×2.0 / 50%: ×0.5';

    const amounts = [10000, 20000, 30000].map(scaleMoney);
    const choices = amounts
        .filter(a => Game.playerMoney >= a)
        .map(a => ({
            label: `${a.toLocaleString()}냥 예치`,
            subtext: grade === 'safe'
                ? `+${Math.floor(a * 0.3).toLocaleString()}냥 확정 이자`
                : grade === 'normal'
                    ? `기대 수익: +${Math.floor(a * 0.6 * 0.7 - a * 0.2 * 0.3).toLocaleString()}냥`
                    : `성공 시 +${a.toLocaleString()}냥 / 실패 시 -${Math.floor(a * 0.5).toLocaleString()}냥`,
            highlight: true,
            callback: () => {
                Game.setPlayerMoney(Game.playerMoney - a);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData();
                updateBoardInfo();
                gaekjuDeposit = { amount: a, grade };
                UI.showModal('객주 예치 완료', `${a.toLocaleString()}냥을 맡겼습니다.\n다시 방문하면 정산됩니다.`, () => { hasRolled = false; });
            },
        }));

    if (choices.length === 0) {
        UI.showModal('객주', `예치할 냥이 부족합니다. (최소 ${amounts[0].toLocaleString()}냥)`, () => { hasRolled = false; });
        return;
    }

    showChoiceModal('객주 — 예치 금액 선택', gradeDesc, choices, { icon: '💰' });
}

// ── 목업 광고 모달 ────────────────────────────────────────────────────────────
function showAdModal(onComplete) {
    const AD_DURATION = 5; // 초

    const overlay = document.createElement('div');
    overlay.className = 'bm-overlay';

    const box = document.createElement('div');
    box.className = 'bm-box';
    box.style.cssText = 'max-width:340px; text-align:center;';
    box.innerHTML = `
        <div style="font-size:0.75em; color:rgba(255,255,255,0.45); margin-bottom:6px; text-align:right;">광고</div>
        <div id="ad-mock-content" style="
            background: linear-gradient(135deg, #1a1a4e, #3a0a5e);
            border-radius: 10px;
            padding: 28px 20px;
            margin-bottom: 14px;
            border: 1px solid rgba(180,100,255,0.4);
        ">
            <div style="font-size:2.6em; margin-bottom:10px;">🃏</div>
            <div style="font-size:1.2em; font-weight:bold; color:#fff; margin-bottom:6px;">천하화투 온라인</div>
            <div style="font-size:0.85em; color:rgba(255,220,180,0.85); margin-bottom:12px;">지금 바로 다운로드하고<br>신규 유저 보너스 받기!</div>
            <div style="
                display:inline-block;
                background:#ff6b35;
                color:#fff;
                padding:6px 18px;
                border-radius:20px;
                font-size:0.85em;
                font-weight:bold;
            ">무료 다운로드 ▶</div>
        </div>
        <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
            <div id="ad-timer-bar" style="
                flex:1; height:6px;
                background:rgba(255,255,255,0.15);
                border-radius:3px; overflow:hidden;
            "><div id="ad-timer-fill" style="
                height:100%; width:0%;
                background: linear-gradient(90deg,#f7c948,#ff8c00);
                transition: width 0.1s linear;
            "></div></div>
            <button id="ad-skip-btn" style="
                padding:6px 14px; border-radius:6px;
                background:rgba(255,255,255,0.15);
                border:1px solid rgba(255,255,255,0.3);
                color:rgba(255,255,255,0.4);
                font-size:0.82em; cursor:default;
                pointer-events:none;
            ">닫기 (<span id="ad-countdown">${AD_DURATION}</span>)</button>
        </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('bm-visible'));

    const fill    = box.querySelector('#ad-timer-fill');
    const countEl = box.querySelector('#ad-countdown');
    const skipBtn = box.querySelector('#ad-skip-btn');

    let elapsed = 0;
    const iv = setInterval(() => {
        elapsed += 0.1;
        fill.style.width = `${Math.min(100, elapsed / AD_DURATION * 100)}%`;
        const remaining = Math.ceil(AD_DURATION - elapsed);
        countEl.textContent = remaining > 0 ? remaining : 0;

        if (elapsed >= AD_DURATION) {
            clearInterval(iv);
            skipBtn.textContent = '✕ 닫기';
            skipBtn.style.color = '#fff';
            skipBtn.style.background = 'rgba(80,200,100,0.35)';
            skipBtn.style.borderColor = 'rgba(80,200,100,0.6)';
            skipBtn.style.cursor = 'pointer';
            skipBtn.style.pointerEvents = 'auto';
            skipBtn.onclick = () => {
                overlay.classList.remove('bm-visible');
                setTimeout(() => { overlay.remove(); onComplete(); }, 220);
            };
        }
    }, 100);
}

function showChoiceModal(title, desc, choices, opts = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'bm-overlay';

    const box = document.createElement('div');
    box.className = 'bm-box';

    if (opts.icon) {
        const iconEl = document.createElement('div');
        iconEl.className = 'bm-event-icon';
        iconEl.textContent = opts.icon;
        box.appendChild(iconEl);
    }

    const h = document.createElement('h3');
    h.className = 'bm-title';
    h.textContent = title;
    box.appendChild(h);

    const p = document.createElement('p');
    p.className = 'bm-desc';
    p.textContent = desc;
    box.appendChild(p);

    const btnRow = document.createElement('div');
    btnRow.className = 'bm-btns';
    choices.forEach(c => {
        const btn = document.createElement('button');
        let cls = 'bm-btn';
        if (c.danger)     cls += ' bm-btn-danger';
        if (c.highlight)  cls += ' bm-btn-highlight';
        btn.className = cls;
        btn.innerHTML = `<span class="bm-btn-main">${c.label}</span>${c.subtext ? `<span class="bm-btn-sub">${c.subtext}</span>` : ''}`;
        btn.addEventListener('click', () => {
            overlay.remove();
            c.callback();
        });
        btnRow.appendChild(btn);
    });
    box.appendChild(btnRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('bm-visible'));
}

/**
 * 카드 뒤집기 선택 모달
 * cards: [{ frontIcon, frontLabel, value, ...extra }]
 * onPick: (card) => void
 */
function showCardFlipChoice(title, desc, cards, onPick) {
    const overlay = document.createElement('div');
    overlay.className = 'bm-overlay';

    const box = document.createElement('div');
    box.className = 'bm-box bm-card-box';

    const h = document.createElement('h3');
    h.className = 'bm-title';
    h.textContent = title;
    box.appendChild(h);

    const p = document.createElement('p');
    p.className = 'bm-desc';
    p.textContent = desc;
    box.appendChild(p);

    const cardRow = document.createElement('div');
    cardRow.className = 'bm-card-row';

    let picked = false;
    const cardEls = [];

    cards.forEach((card, i) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'bm-card';

        const inner = document.createElement('div');
        inner.className = 'bm-card-inner';

        const back = document.createElement('div');
        back.className = 'bm-card-back';
        back.innerHTML = '<span class="bm-back-glyph">花</span>';

        const front = document.createElement('div');
        front.className = 'bm-card-front';
        front.innerHTML = `<span class="bm-card-icon">${card.frontIcon}</span><span class="bm-card-label">${card.frontLabel.replace(/\n/g, '<br>')}</span>`;

        inner.appendChild(back);
        inner.appendChild(front);
        cardEl.appendChild(inner);
        cardEls.push(cardEl);

        cardEl.addEventListener('click', () => {
            if (picked) return;
            picked = true;

            // 선택된 카드 뒤집기
            cardEl.classList.add('bm-card-flipped');

            setTimeout(() => {
                // 나머지 카드도 뒤집어 공개 (흐리게)
                cardEls.forEach((el, j) => {
                    if (j !== i) el.classList.add('bm-card-flipped', 'bm-card-unchosen');
                });
                // 잠시 후 닫고 콜백
                setTimeout(() => {
                    overlay.remove();
                    onPick(card);
                }, 1000);
            }, 550);
        });

        cardRow.appendChild(cardEl);
    });

    box.appendChild(cardRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('bm-visible'));
}

// ── 산적 결투 미니게임 ─────────────────────────────────────────────────
/**
 * 강타 > 방어 > 속공 > 강타 (가위바위보)
 * 먼저 2승 — onWin / onLose 콜백
 */
function showBanditFight(onWin, onLose) {
    const MOVES = [
        { id: 'strong', label: '강타', icon: '⚔️', beats: 'defend'  },
        { id: 'quick',  label: '속공', icon: '🥷', beats: 'strong' },
        { id: 'defend', label: '방어', icon: '🛡️', beats: 'quick'  },
    ];
    const WIN_NEEDED = 2;

    let playerWins = 0;
    let banditWins = 0;
    let attempt = 1;

    const overlay = document.createElement('div');
    overlay.className = 'bm-overlay';
    overlay.innerHTML = `
        <div class="bm-box bm-fight-box">
            <div class="bm-fight-header">
                <div class="bm-fight-banner">⚔️ 산적과의 결투!</div>
                <div class="bm-fight-rule">강타 &gt; 방어 &gt; 속공 &gt; 강타 &nbsp;|&nbsp; 먼저 2승 승리</div>
            </div>
            <div class="bm-fight-score-row">
                <div class="fight-side">
                    <div class="fight-side-name">나</div>
                    <div class="fight-pips" id="fight-player-pips"></div>
                </div>
                <div class="fight-round-badge" id="fight-round-label">라운드 1</div>
                <div class="fight-side">
                    <div class="fight-side-name">산적</div>
                    <div class="fight-pips" id="fight-bandit-pips"></div>
                </div>
            </div>
            <div class="bm-fight-arena">
                <div class="fight-slot" id="fight-player-slot">
                    <div class="fight-slot-label">나의 기술</div>
                    <div class="fight-slot-content" id="fight-player-content">
                        <span class="fight-slot-q">?</span>
                    </div>
                </div>
                <div class="fight-arena-vs">VS</div>
                <div class="fight-slot" id="fight-bandit-slot">
                    <div class="fight-slot-label">산적 기술</div>
                    <div class="fight-slot-content" id="fight-bandit-content">
                        <span class="fight-slot-q">?</span>
                    </div>
                </div>
            </div>
            <div class="bm-fight-result" id="fight-result">기술을 선택하세요!</div>
            <div class="bm-fight-btns" id="fight-btns">
                <button class="fight-move-btn" data-move="strong">
                    <span class="fmb-icon">⚔️</span>
                    <span class="fmb-name">강타</span>
                    <span class="fmb-hint">방어에 강함</span>
                </button>
                <button class="fight-move-btn" data-move="quick">
                    <span class="fmb-icon">🥷</span>
                    <span class="fmb-name">속공</span>
                    <span class="fmb-hint">강타에 강함</span>
                </button>
                <button class="fight-move-btn" data-move="defend">
                    <span class="fmb-icon">🛡️</span>
                    <span class="fmb-name">방어</span>
                    <span class="fmb-hint">속공을 막음</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('bm-visible'));

    const playerPipsEl  = overlay.querySelector('#fight-player-pips');
    const banditPipsEl  = overlay.querySelector('#fight-bandit-pips');
    const roundLabelEl  = overlay.querySelector('#fight-round-label');
    const playerSlotEl  = overlay.querySelector('#fight-player-slot');
    const banditSlotEl  = overlay.querySelector('#fight-bandit-slot');
    const playerContent = overlay.querySelector('#fight-player-content');
    const banditContent = overlay.querySelector('#fight-bandit-content');
    const resultEl      = overlay.querySelector('#fight-result');
    const btnsEl        = overlay.querySelector('#fight-btns');

    function renderPips() {
        [playerPipsEl, banditPipsEl].forEach((el, i) => {
            const wins = i === 0 ? playerWins : banditWins;
            el.innerHTML = '';
            for (let j = 0; j < WIN_NEEDED; j++) {
                const pip = document.createElement('span');
                pip.className = 'fight-pip' + (j < wins ? ' won' : '');
                el.appendChild(pip);
            }
        });
    }

    function setMoveContent(contentEl, move) {
        contentEl.innerHTML = `<span class="fight-slot-icon">${move.icon}</span><span class="fight-slot-move-name">${move.label}</span>`;
        contentEl.classList.remove('reveal-anim');
        // reflow
        void contentEl.offsetWidth;
        contentEl.classList.add('reveal-anim');
    }

    function resetArena() {
        playerContent.innerHTML = '<span class="fight-slot-q">?</span>';
        banditContent.innerHTML = '<span class="fight-slot-q">?</span>';
        playerContent.classList.remove('reveal-anim');
        banditContent.classList.remove('reveal-anim');
        playerSlotEl.classList.remove('slot-win', 'slot-lose', 'slot-tie');
        banditSlotEl.classList.remove('slot-win', 'slot-lose', 'slot-tie');
    }

    function setButtonsDisabled(v) {
        btnsEl.querySelectorAll('.fight-move-btn').forEach(b => { b.disabled = v; });
    }

    renderPips();

    function pickMove(playerMoveId) {
        setButtonsDisabled(true);

        const playerMove = MOVES.find(m => m.id === playerMoveId);
        const banditMove = MOVES[Math.floor(Math.random() * MOVES.length)];

        setMoveContent(playerContent, playerMove);

        // 산적 기술 공개 — 약간의 지연으로 긴장감
        setTimeout(() => {
            setMoveContent(banditContent, banditMove);

            setTimeout(() => {
                let outcome;
                if (playerMove.id === banditMove.id) {
                    outcome = 'tie';
                } else if (playerMove.beats === banditMove.id) {
                    outcome = 'win';
                } else {
                    outcome = 'lose';
                }

                if (outcome === 'tie') {
                    playerSlotEl.classList.add('slot-tie');
                    banditSlotEl.classList.add('slot-tie');
                    resultEl.textContent = '🔄 무승부! 다시 승부합니다...';
                } else if (outcome === 'win') {
                    playerWins++;
                    playerSlotEl.classList.add('slot-win');
                    banditSlotEl.classList.add('slot-lose');
                    resultEl.textContent = `✨ ${playerMove.label}이(가) 산적의 ${banditMove.label}을(를) 꺾었습니다!`;
                } else {
                    banditWins++;
                    playerSlotEl.classList.add('slot-lose');
                    banditSlotEl.classList.add('slot-win');
                    resultEl.textContent = `💀 산적의 ${banditMove.label}에 당했습니다!`;
                }

                renderPips();

                const gameOver = playerWins >= WIN_NEEDED || banditWins >= WIN_NEEDED;

                if (gameOver) {
                    const won = playerWins >= WIN_NEEDED;
                    setTimeout(() => {
                        resultEl.innerHTML = won
                            ? '<span class="fight-result-win">🎊 결투 승리! 산적을 물리쳤습니다!</span>'
                            : '<span class="fight-result-lose">💀 결투 패배... 산적에게 당했습니다.</span>';
                        btnsEl.style.opacity = '0.25';
                        btnsEl.style.pointerEvents = 'none';
                        setTimeout(() => {
                            overlay.remove();
                            if (won) onWin(); else onLose();
                        }, 1600);
                    }, 600);
                } else {
                    attempt++;
                    roundLabelEl.textContent = `라운드 ${attempt}`;
                    setTimeout(() => {
                        resetArena();
                        resultEl.textContent = '기술을 선택하세요!';
                        setButtonsDisabled(false);
                    }, 1100);
                }
            }, 180); // 결과 색상 적용 전 짧은 멈춤
        }, 420); // 산적 기술 공개 지연 (긴장감)
    }

    btnsEl.querySelectorAll('.fight-move-btn').forEach(btn => {
        btn.addEventListener('click', () => pickMove(btn.dataset.move));
    });
}

// ── 레벨 표시 업데이트 ────────────────────────────────────────────────
function updateLevelDisplay() {
    const cur = MONEY_PER_POINT_LEVELS.find(l => l.level === Game.moneyPerPointLevel);
    const el = document.getElementById('board-level-display');
    if (el && cur) el.textContent = `⚡ ${cur.value.toLocaleString()}냥/점 (${cur.label} Lv.${cur.level})`;
}

// ── 레벨업 모달 ──────────────────────────────────────────────────────
function openLevelUpModal() {
    const cur = MONEY_PER_POINT_LEVELS.find(l => l.level === Game.moneyPerPointLevel);
    const next = MONEY_PER_POINT_LEVELS.find(l => l.level === Game.moneyPerPointLevel + 1);

    if (!next) {
        UI.showModal('최고 레벨 달성!', `이미 최고 등급 "${cur.label}"입니다.\n점당 ${cur.value.toLocaleString()}냥`, () => {});
        return;
    }

    UI.showModal(
        '점당 금액 레벨업',
        `현재: ${cur.label} (${cur.value.toLocaleString()}냥/점)\n다음: ${next.label} (${next.value.toLocaleString()}냥/점)\n\n업그레이드 비용: ${next.cost.toLocaleString()}냥\n현재 소지금: ${Game.playerMoney.toLocaleString()}냥`,
        () => {
            if (Game.playerMoney < next.cost) {
                UI.showModal('자금 부족', `업그레이드 비용 ${next.cost.toLocaleString()}냥이 부족합니다.`, () => {});
                return;
            }
            Game.setPlayerMoney(Game.playerMoney - next.cost);
            Game.setMoneyPerPointLevel(next.level);
            Game.saveGameData();
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            updateBoardInfo();
            updateLevelDisplay();
            UI.showModal('레벨업!', `${next.label} (Lv.${next.level}) 달성!\n이제 점당 ${next.value.toLocaleString()}냥을 획득합니다.`, () => {});
        }
    );
}

// ── 보드 정보 표시 ────────────────────────────────────────────────────
function updateBoardInfo() {
    const tile = BOARD_TILES[playerPosition];
    document.getElementById('board-money-display').textContent =
        `💰 ${Game.playerMoney.toLocaleString()}냥`;
    document.getElementById('board-pos-display').textContent =
        `📍 ${tile.name.replace('\n', ' ')}`;
}

// ── 최종 엔딩 ────────────────────────────────────────────────────────
function showFinalEnding() {
    stopBoardTimer();
    audioManager.playBgm(BGM.SHOWTIME);

    // 색종이 조각
    const COLORS = ['#ffd700','#ff69b4','#00cfff','#ff6b6b','#90ee90','#da70d6','#ffa07a','#87ceeb'];
    const confetti = Array.from({length: 60}, (_, i) => {
        const c = COLORS[i % COLORS.length];
        const left  = (Math.random() * 100).toFixed(1);
        const dur   = (2.8 + Math.random() * 3.2).toFixed(2);
        const delay = (Math.random() * 5).toFixed(2);
        const size  = 5 + Math.floor(Math.random() * 7);
        const round = Math.random() < 0.5 ? '50%' : `${Math.floor(Math.random()*3)}px`;
        return `<div class="ending-confetti" style="left:${left}%;width:${size}px;height:${size}px;background:${c};border-radius:${round};animation-duration:${dur}s;animation-delay:${delay}s;"></div>`;
    }).join('');

    // 캐릭터 초상화
    const chars = STAGES.map((s, i) => `
        <div class="ending-char" style="animation-delay:${0.3 + i * 0.1}s">
            <img src="${s.image}" class="ending-char-img" alt="${s.characterName}">
            <div class="ending-char-name">${s.characterName}</div>
        </div>
    `).join('');

    const ov = document.createElement('div');
    ov.className = 'bm-overlay ending-overlay';
    ov.innerHTML = `
        ${confetti}
        <div class="ending-box">
            <div class="ending-crown">👑 &nbsp; 👑 &nbsp; 👑</div>
            <h2 class="ending-main-title">천하화투왕 등극!</h2>
            <div class="ending-sub">— 봉황화패를 손에 넣다 —</div>
            <p class="ending-story">
                팔도의 모든 화투 고수를 하나하나 평정하고<br>
                마침내 전설의 <strong>봉황화패</strong>가 그대의 손에 안겼노라.<br><br>
                이제 그대의 이름이 천하에 울려 퍼지니,<br>
                진정한 <strong>천하화투왕</strong>의 자리에 오르거라!
            </p>
            <div class="ending-chars">${chars}</div>
            <div class="ending-money-line">
                💰 최종 소지금 &nbsp;<strong>${Game.playerMoney.toLocaleString()}냥</strong>
            </div>
            <button id="ending-close-btn" class="bm-btn bm-btn-highlight" style="margin-top:8px;">
                ✨ 계속하기
            </button>
        </div>
    `;

    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('bm-visible'));

    ov.querySelector('#ending-close-btn').addEventListener('click', () => {
        ov.classList.remove('bm-visible');
        audioManager.playBgm(BGM.LOBBY);
        setTimeout(() => { ov.remove(); hasRolled = false; }, 260);
    });
}
