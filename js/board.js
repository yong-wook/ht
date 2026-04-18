import { STAGES, MONEY_PER_POINT_LEVELS } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';
import * as Stage from './stage.js';
import * as HighLow from './highlow.js';
import * as Roulette from './roulette.js';
import * as Showtime from './showtime.js';
import * as SlidePuzzle from './slidepuzzle.js';

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
    { id: 13, type: 'gwana',     name: '관아',        icon: '🏛' },
    { id: 14, type: 'character', name: '채아',        stageId: 5 },
    { id: 15, type: 'gibang',    name: '기방',        icon: '🌺' },
    { id: 16, type: 'character', name: '서린',        stageId: 6 },
    { id: 17, type: 'jujak',     name: '주막',        icon: '🍶' },
    // 좌하단 코너 (18)
    { id: 18, type: 'dobakjang', name: '도박장',      icon: '🎰', corner: true },
    // 좌측 하→상 (19~23)
    { id: 19, type: 'bangnanggaek', name: '방랑객',   icon: '🧳' },
    { id: 20, type: 'character', name: '혜화',        stageId: 7 },
    { id: 21, type: 'giyeon',    name: '기연',        icon: '🌸' },
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

// 이벤트 효과
const TILE_EVENTS = {
    start:   { money:  10000, title: '출발점 통과!',   msg: '한양을 지나갑니다. +10,000냥' },
    giyeon:  { money:  15000, title: '기연!',          msg: '뜻밖의 인연으로 +15,000냥 획득.' },
    jujak:   { money:   8000, title: '주막',           msg: '따뜻한 밥 한 끼. 기운이 돌아옵니다. +8,000냥.' },
    gwana:   { money: -12000, title: '관아',           msg: '관리가 세금을 거둬갑니다. -12,000냥.' },
    nugang:  { money:  25000, title: '누각',           msg: '경치를 즐기며 영감을 얻다. +25,000냥.' },
    sanjeok: { money: -25000, title: '산적 출몰!',     msg: '산적 떼에게 습격당했습니다. -25,000냥.' },
    oncheon: { money:  20000, title: '온천 발견!',     msg: '따뜻한 온천에서 피로를 풀었습니다. +20,000냥.' },
    bobusang:{ money:  15000, title: '보부상',         msg: '보부상에게서 좋은 물건을 얻었습니다. +15,000냥.' },
};

const TOTAL_TILES = BOARD_TILES.length;
const DIE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// ── 비용·수입 설정 ─────────────────────────────────────────────────────────
const ROLL_COST          = 10000; // 주사위 굴리기 비용
const INCOME_INTERVAL_SEC = 3600; // 수입 주기 (초) — 1시간
const INCOME_AMOUNT      = 15000; // 수입 금액

let playerPosition = 0;
let isMoving = false;
let hasRolled = false;
let _onGameStart = null;

let countdownTimer = null;
let incomeSecondsLeft = INCOME_INTERVAL_SEC;

// ── 수입 타이머 ────────────────────────────────────────────────────────
function startIncomeTimer() {
    if (countdownTimer) return;
    countdownTimer = setInterval(() => {
        incomeSecondsLeft--;
        if (incomeSecondsLeft <= 0) {
            Game.setPlayerMoney(Game.playerMoney + INCOME_AMOUNT);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            updateBoardInfo();
            UI.showToast(`💴 세금 수입 +${INCOME_AMOUNT.toLocaleString()}냥`);
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

        grid.appendChild(el);
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
        UI.showModal(
            '자금 부족',
            `주사위를 굴리려면 ${ROLL_COST.toLocaleString()}냥이 필요합니다.\n수입(${INCOME_INTERVAL_SEC}초마다 +${INCOME_AMOUNT.toLocaleString()}냥)을 기다리세요.`,
            () => {}
        );
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
        playerPosition = (playerPosition + 1) % TOTAL_TILES;

        // 출발점 통과 보너스
        if (playerPosition === 0) {
            const bonus = TILE_EVENTS.start.money;
            Game.setPlayerMoney(Game.playerMoney + bonus);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            UI.showToast('출발점 통과! +10,000냥');
        }

        updateToken();
        updateBoardInfo();
        remaining--;
        setTimeout(stepOnce, 280);
    }

    stepOnce();
}

// ── 타일 착지 ─────────────────────────────────────────────────────────
function landOnTile(pos) {
    const tile = BOARD_TILES[pos];

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

    if (tile.type === 'jangter') {
        // 장터: 하이로우 미니게임 (2번 연속 정답 → +25,000냥, 실패 → -15,000냥)
        UI.showModal('장터', '장터에서 화투 하이로우 내기를 제안받았습니다.\n2번 연속으로 맞추면 25,000냥!\n승부를 받아들이겠습니까?',
            () => {
                HighLow.showHighLow(1, (won) => {
                    HighLow.hideHighLow();
                    const delta = won ? 25000 : -15000;
                    Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
                    UI.updateTotalMoneyDisplay(Game.playerMoney);
                    Game.saveGameData();
                    updateBoardInfo();
                    UI.showModal(
                        won ? '승리!' : '패배!',
                        won ? '두 번 연속 적중! +25,000냥' : '하이로우에서 졌습니다. -15,000냥',
                        () => { hasRolled = false; }
                    );
                }, {
                    title: '장터 화투 내기!',
                    desc: '2번 연속으로 맞추면 25,000냥 획득!',
                    required: 2,
                });
            },
            () => { hasRolled = false; }
        );
        return;
    }

    if (tile.type === 'dobakjang') {
        // 도박장: 룰렛 스핀
        UI.showModal('도박장', '도박장의 룰렛이 돌아가고 있습니다.\n운을 시험해보시겠습니까?',
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
                        // 고스톱 게임 보너스 → 다음 게임에 적용
                        Game.setCurrentRouletteReward(item);
                        Game.saveGameData();
                        UI.showModal('도박장 결과!', `✨ ${item.name} 획득!\n다음 고스톱 승부에서 적용됩니다.`, () => { hasRolled = false; });
                    }
                });
            },
            () => { hasRolled = false; }
        );
        return;
    }

    if (tile.type === 'seodang') {
        // 서당: 슬라이드 퍼즐 미니게임
        const WIN_REWARD  = 30000;
        const CONSOLATION =  5000;

        // 수집된 배경 목록
        const allUnlocked = [];
        STAGES.forEach(s => {
            (Game.unlockedBackgrounds[s.id.toString()] || []).forEach(bgId => {
                allUnlocked.push({ stageId: s.id, bgId });
            });
        });

        if (allUnlocked.length === 0) {
            // 배경 없음 → 단순 이벤트
            Game.setPlayerMoney(Game.playerMoney + 10000);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            updateBoardInfo();
            UI.showModal('서당', '서당에서 학문을 쌓았습니다. +10,000냥\n(배경을 수집하면 그림 맞추기에 도전할 수 있습니다!)', () => { hasRolled = false; });
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
            },
            () => { hasRolled = false; }
        );
        return;
    }

    if (tile.type === 'gibang') {
        // 기방: 입장료 내고 랜덤 쇼타임 감상
        const cost = 25000;
        // 해금된 모든 배경 수집
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
            },
            () => { hasRolled = false; }
        );
        return;
    }

    if (tile.type === 'bangnanggaek') {
        // 방랑객: 랜덤 ±20,000냥
        const lucky = Math.random() < 0.5;
        const delta = lucky ? 20000 : -20000;
        Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        updateBoardInfo();
        UI.showModal(
            lucky ? '방랑객의 선물!' : '방랑객의 사기',
            lucky
                ? '기이한 방랑객이 비법 비약을 건넵니다. 행운이 깃들었습니다! +20,000냥'
                : '방랑객인 줄 알았더니 사기꾼이었습니다. -20,000냥',
            () => { hasRolled = false; }
        );
        return;
    }

    if (tile.type === 'start') {
        // 출발점에 정확히 착지 → 추가 보너스
        const extra = 5000;
        Game.setPlayerMoney(Game.playerMoney + extra);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        UI.showModal('출발점 도착!', `한양에 도착했습니다! 추가 보너스 +${extra.toLocaleString()}냥`, () => { hasRolled = false; });
        return;
    }

    // 일반 이벤트
    const ev = TILE_EVENTS[tile.type];
    if (!ev) { hasRolled = false; return; }

    const delta = ev.money;
    if (delta !== 0) {
        Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
    }
    updateBoardInfo();
    UI.showModal(ev.title, ev.msg, () => { hasRolled = false; });
}

// ── 화투 베팅 (장터 / 도박장 공용) ──────────────────────────────────
function jangterBet(bet = 20000, winChance = 0.5) {
    const win = Math.random() < winChance;
    const delta = win ? bet : -bet;
    Game.setPlayerMoney(Math.max(0, Game.playerMoney + delta));
    UI.updateTotalMoneyDisplay(Game.playerMoney);
    Game.saveGameData();
    updateBoardInfo();
    UI.showModal(
        win ? '승리!' : '패배!',
        win ? `화투에서 이겼습니다! +${bet.toLocaleString()}냥` : `화투에서 졌습니다. -${bet.toLocaleString()}냥`,
        () => { hasRolled = false; }
    );
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
