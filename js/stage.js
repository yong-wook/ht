import { STAGES, SHOWTIME_REPLAY_COST } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';
import * as Showtime from './showtime.js';

let selectedStage = null;
let _onStageSelect = null;

// ── 장면 초기화 ────────────────────────────────────────────────────────────────
export function initStageSelection(onStageSelect) {
    _onStageSelect = onStageSelect;
    const charsEl = document.getElementById('stage-chars');
    charsEl.innerHTML = '';

    STAGES.forEach(stage => {
        const isUnlocked = Game.unlockedStages.includes(stage.id);
        const collected = (Game.unlockedBackgrounds[stage.id.toString()] || []).length;

        const el = document.createElement('div');
        el.className = 'scene-char' + (isUnlocked ? '' : ' scene-char--locked');

        if (isUnlocked) {
            el.innerHTML = `
                <div class="scene-char-frame">
                    <img src="${stage.image}" class="scene-char-img" alt="${stage.characterName}">
                </div>
                <div class="scene-char-name">${stage.characterName}</div>
                <div class="scene-char-hearts">${buildHeartsHtml(collected)}</div>
            `;
        } else {
            el.innerHTML = `
                <div class="scene-char-frame">
                    <img src="${stage.image}" class="scene-char-img scene-char-img--locked" alt="???">
                    <div class="scene-lock-overlay">🔒</div>
                </div>
                <div class="scene-char-name scene-char-name--locked">???</div>
                <div class="scene-char-cost">${stage.cost.toLocaleString()}원</div>
            `;
        }

        el.addEventListener('click', () => {
            if (isUnlocked) openCharPanel(stage);
            else openLockedPanel(stage);
        });

        charsEl.appendChild(el);
    });

    // 패널 닫기
    document.getElementById('char-panel-overlay').onclick = closeCharPanel;
    document.getElementById('char-panel-close').onclick = closeCharPanel;
}

// ── 하트 HTML ──────────────────────────────────────────────────────────────────
function buildHeartsHtml(count) {
    return Array.from({ length: 12 }, (_, i) =>
        `<span class="${i < count ? 'heart-full' : 'heart-empty'}">${i < count ? '♥' : '♡'}</span>`
    ).join('');
}

// ── 대사 선택 ──────────────────────────────────────────────────────────────────
function getDialogue(stage, collected) {
    const d = stage.dialogues;
    if (collected >= 12) return d[4];
    if (collected >= 8)  return d[3];
    if (collected >= 4)  return d[2];
    if (collected >= 1)  return d[1];
    return d[0];
}

// ── 해금 캐릭터 패널 ───────────────────────────────────────────────────────────
// onGameStartOverride: board.js에서 직접 콜백을 주입할 때 사용
// onFavorOverride: 호의 선택 후 board.js로 복귀할 때 사용
export function openCharPanel(stage, onGameStartOverride, onFavorOverride) {
    const onGameStart = onGameStartOverride || (s => { selectedStage = s; _onStageSelect && _onStageSelect(s); });
    const collected = (Game.unlockedBackgrounds[stage.id.toString()] || []).length;
    const isFullyCollected = collected >= 12;
    const replayCost = isFullyCollected ? 0 : SHOWTIME_REPLAY_COST;

    document.getElementById('char-panel-img').src = stage.image;
    document.getElementById('char-panel-stage-label').textContent = stage.name;
    document.getElementById('char-panel-name').textContent = stage.characterName;
    document.getElementById('char-panel-hearts').innerHTML = buildHeartsHtml(collected);
    document.getElementById('char-panel-collection-text').textContent = `수집: ${collected} / 12`;
    document.getElementById('char-panel-dialogue').textContent = `"${getDialogue(stage, collected)}"`;

    const btns = document.getElementById('char-panel-btns');

    if (isFullyCollected && onGameStartOverride) {
        // ── 보드 모드 + 전체 수집: A안 이벤트 선택 ──────────────────────
        const favorBonus = Math.floor((stage.collectionBonus || 50000) * 0.15);
        const baseMPP = Game.moneyPerPoint;

        btns.innerHTML = `
            <div class="full-collect-badge">✨ 컬렉션 완성</div>
            <button id="char-normal-btn">⚔ 일반 승부</button>
            <button id="char-highstakes-btn">💰 고액 승부 <span class="hs-tag">×3</span></button>
            <button id="char-favor-btn">🎁 호의 <span class="favor-bonus">+${favorBonus.toLocaleString()}냥</span></button>
        `;

        btns.querySelector('#char-normal-btn').addEventListener('click', () => {
            closeCharPanel();
            selectedStage = stage;
            onGameStart(stage);
        });

        btns.querySelector('#char-highstakes-btn').addEventListener('click', () => {
            closeCharPanel();
            selectedStage = stage;
            Game.setMoneyPerPoint(baseMPP * 3);
            onGameStart(stage);
        });

        btns.querySelector('#char-favor-btn').addEventListener('click', () => {
            closeCharPanel();
            Game.setPlayerMoney(Game.playerMoney + favorBonus);
            Game.saveGameData();
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            UI.showToast(`${stage.characterName}의 호의! +${favorBonus.toLocaleString()}냥`);
            if (onFavorOverride) onFavorOverride();
        });

    } else {
        // ── 기존 버튼 (미완성 수집 or 스테이지 선택 화면) ────────────────
        btns.innerHTML = `
            <button id="char-start-btn">⚔ 게임 시작</button>
            <button id="char-gallery-btn">🖼 배경 컬렉션</button>
        `;

        btns.querySelector('#char-start-btn').addEventListener('click', () => {
            closeCharPanel();
            selectedStage = stage;
            onGameStart(stage);
        });

        btns.querySelector('#char-gallery-btn').addEventListener('click', () => {
            const onReplay = (imagePath) => {
                if (replayCost > 0 && Game.playerMoney < replayCost) {
                    UI.showModal('알림', `돈이 부족합니다!\n(필요: ${replayCost.toLocaleString()}원)`);
                    return;
                }
                const confirmMsg = replayCost > 0
                    ? `이 배경의 쇼타임을 재관람하시겠습니까?\n비용: ${replayCost.toLocaleString()}원`
                    : `이 배경의 쇼타임을 재관람하시겠습니까?\n(컬렉션 완성 — 무료!)`;
                UI.showModal('쇼타임 재관람', confirmMsg, () => {
                    if (replayCost > 0) {
                        Game.setPlayerMoney(Game.playerMoney - replayCost);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.saveGameData();
                    }
                    document.getElementById('gallery-modal').style.display = 'none';
                    closeCharPanel();
                    document.getElementById('board-container').style.display = 'none';
                    Showtime.showShowtime(
                        () => { Showtime.hideShowtime(); document.getElementById('board-container').style.display = 'block'; },
                        null,
                        imagePath,
                        null,
                        null,
                        false,
                        'puzzle'
                    );
                });
            };
            UI.showBackgroundGallery(stage.id, stage.name, onReplay, replayCost);
        });
    }

    document.getElementById('char-panel').style.display = 'flex';
}

// ── 잠긴 캐릭터 패널 ───────────────────────────────────────────────────────────
function openLockedPanel(stage) {
    document.getElementById('char-panel-img').src = stage.image;
    document.getElementById('char-panel-stage-label').textContent = stage.name;
    document.getElementById('char-panel-name').textContent = '???';
    document.getElementById('char-panel-hearts').innerHTML = buildHeartsHtml(0);
    document.getElementById('char-panel-collection-text').textContent = '';
    document.getElementById('char-panel-dialogue').textContent = '"아직 만날 수 없는 상대입니다."';

    const btns = document.getElementById('char-panel-btns');
    const canAfford = Game.playerMoney >= stage.cost;
    btns.innerHTML = `
        <div id="char-unlock-cost">해제 비용: ${stage.cost.toLocaleString()}원</div>
        <button id="char-unlock-btn" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '🔓 스테이지 해제' : '💸 돈이 부족합니다'}
        </button>
    `;

    if (canAfford) {
        btns.querySelector('#char-unlock-btn').addEventListener('click', () => {
            UI.showModal(
                '스테이지 해제',
                `${stage.name}을(를) 해제하시겠습니까?\n비용: ${stage.cost.toLocaleString()}원`,
                () => {
                    Game.setPlayerMoney(Game.playerMoney - stage.cost);
                    UI.updateTotalMoneyDisplay(Game.playerMoney);
                    Game.unlockedStages.push(stage.id);
                    Game.saveGameData();
                    closeCharPanel();
                    initStageSelection(_onStageSelect);
                }
            );
        });
    }

    document.getElementById('char-panel').style.display = 'flex';
}

// ── 패널 닫기 ──────────────────────────────────────────────────────────────────
function closeCharPanel() {
    document.getElementById('char-panel').style.display = 'none';
}

export function getSelectedStage() {
    return selectedStage;
}
