import { CARDS } from './config.js';
import { audioManager, SFX } from './audio.js';

const container     = document.getElementById('highlow-container');
const bgNumberEl    = document.getElementById('hl-bg-number');
const descEl        = document.getElementById('hl-desc');
const streakEl      = document.getElementById('hl-streak');
const currentCardEl = document.getElementById('hl-current-card');
const currentMonthEl= document.getElementById('hl-current-month');
const nextCardEl    = document.getElementById('hl-next-card');
const nextMonthEl   = document.getElementById('hl-next-month');
const arrowEl       = document.getElementById('hl-arrow');
const resultEl      = document.getElementById('hl-result');
const highBtn       = document.getElementById('hl-high-btn');
const lowBtn        = document.getElementById('hl-low-btn');

let deck        = [];
let currentCard = null;
let streak      = 0;
let required    = 0;
let bgId        = 0;
let onComplete  = null; // (won: boolean) => void

// 배경 번호별 필요 연속 정답 수
function getRequired(id) {
    if (id <= 3) return 2;
    if (id <= 6) return 3;
    if (id <= 9) return 4;
    return 5;
}

export function showHighLow(targetBgId, callback) {
    bgId       = targetBgId;
    onComplete = callback;
    required   = getRequired(bgId);
    streak     = 0;

    deck = [...CARDS].sort(() => Math.random() - 0.5);
    currentCard = deck.pop();

    bgNumberEl.textContent = `배경 No.${bgId} 도전!`;
    descEl.textContent     = `${required}번 연속으로 맞추면 획득!`;

    renderStreakDots();
    showCard(currentCardEl, currentMonthEl, currentCard);
    resetNextCard();
    resultEl.textContent = '';
    arrowEl.textContent  = '?';
    setButtons(true);

    container.style.display = 'flex';
}

export function hideHighLow() {
    container.style.display = 'none';
}

// ── 내부 렌더링 ──────────────────────────────────────────────────────────────

function showCard(cardEl, monthEl, card) {
    cardEl.style.backgroundImage = `url('${card.img}')`;
    cardEl.classList.remove('hl-card-back');
    monthEl.textContent = `${card.month}월`;
}

function resetNextCard() {
    nextCardEl.style.backgroundImage = '';
    nextCardEl.classList.add('hl-card-back');
    nextMonthEl.textContent = '';
}

function renderStreakDots() {
    streakEl.innerHTML = '';
    for (let i = 0; i < required; i++) {
        const dot = document.createElement('div');
        dot.className = 'hl-dot' + (i < streak ? ' hl-dot-filled' : '');
        streakEl.appendChild(dot);
    }
}

function setButtons(enabled) {
    highBtn.disabled = !enabled;
    lowBtn.disabled  = !enabled;
}

// ── 추측 로직 ─────────────────────────────────────────────────────────────────

highBtn.addEventListener('click', () => guess(true));
lowBtn.addEventListener('click', () => guess(false));

function guess(isHigh) {
    setButtons(false);
    const next = deck.pop();

    // 다음 카드 공개
    showCard(nextCardEl, nextMonthEl, next);
    audioManager.playSfx(SFX.CARD_FLIP);

    setTimeout(() => {
        const cv = currentCard.month;
        const nv = next.month;
        const correct = isHigh ? nv > cv : nv < cv;
        // 동점 = 실패

        if (correct) {
            streak++;
            arrowEl.textContent = isHigh ? '▲' : '▼';
            arrowEl.style.color = '#4cff72';
            showResult(streak >= required ? '획득!!' : `정답! (${streak}/${required})`, true);
            renderStreakDots();
            audioManager.playSfx(SFX.CARD_MATCH);

            if (streak >= required) {
                setTimeout(() => { hideHighLow(); onComplete(true); }, 900);
            } else {
                currentCard = next;
                setTimeout(() => {
                    showCard(currentCardEl, currentMonthEl, currentCard);
                    resetNextCard();
                    arrowEl.textContent = '?';
                    arrowEl.style.color = '';
                    resultEl.textContent = '';
                    setButtons(true);
                }, 900);
            }
        } else {
            arrowEl.textContent = nv === cv ? '=' : (nv > cv ? '▲' : '▼');
            arrowEl.style.color = '#ff4444';
            showResult(nv === cv ? '동점! 실패...' : '오답! 실패...', false);
            audioManager.playSfx(SFX.LOSE);
            setTimeout(() => { hideHighLow(); onComplete(false); }, 1200);
        }
    }, 500);
}

function showResult(text, success) {
    resultEl.textContent  = text;
    resultEl.style.color  = success ? '#4cff72' : '#ff4444';
}
