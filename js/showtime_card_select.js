import { CARDS } from './config.js';
import { particleSystem } from './effects.js';
import { audioManager, SFX } from './audio.js';

const cardSelectContainer = document.getElementById('showtime-card-select-container');
const cardGrid = document.getElementById('card-grid');
const collectionStatus = document.getElementById('collection-status');
const drawButton = document.getElementById('card-draw-button');

let onCardSelectCallback = null;
let currentItems = [];
let currentUnlockedIds = [];

export function showCardSelection(items, callback, unlockedBgIds = []) {
    onCardSelectCallback = callback;
    currentItems = items;
    currentUnlockedIds = unlockedBgIds;

    cardGrid.innerHTML = '';
    drawButton.disabled = false;
    drawButton.textContent = '뽑기!';
    drawButton.style.display = 'block';

    // 수집 현황 표시
    const total = items.length;
    const collected = unlockedBgIds.length;
    const remaining = total - collected;
    collectionStatus.innerHTML =
        `<span class="cs-collected">${collected} / ${total} 수집</span>` +
        (remaining > 0
            ? `<span class="cs-remaining">미획득 ${remaining}장</span>`
            : `<span class="cs-complete">컬렉션 완성!</span>`);

    // 카드 12장 생성
    items.forEach((item) => {
        const isCollected = unlockedBgIds.includes(item.id);
        const month = item.id;
        const rep = CARDS.find(c => c.month === month && (c.type === 'gwang' || c.type === 'ggot'));

        const scene = document.createElement('div');
        scene.classList.add('card-scene');

        const flipper = document.createElement('div');
        flipper.classList.add('card-flipper');

        const front = document.createElement('div');
        front.classList.add('card-face', 'card-front');
        if (rep) front.style.backgroundImage = `url('${rep.img}')`;

        const back = document.createElement('div');
        back.classList.add('card-face', 'card-back');

        if (isCollected) {
            scene.classList.add('already-collected');
            const stamp = document.createElement('div');
            stamp.classList.add('collected-stamp');
            stamp.textContent = '획득';
            back.appendChild(stamp);
        }

        flipper.appendChild(front);
        flipper.appendChild(back);
        scene.appendChild(flipper);
        cardGrid.appendChild(scene);
    });

    cardSelectContainer.style.display = 'flex';
}

drawButton.addEventListener('click', () => {
    drawButton.disabled = true;
    startSlotAnimation();
});

function startSlotAnimation() {
    const cards = Array.from(cardGrid.querySelectorAll('.card-scene'));

    // 결과 미리 결정: 미획득 중 가장 낮은 번호 우선, 전부 수집 시 랜덤
    const unlockedSet = new Set(currentUnlockedIds);
    const firstUncollected = currentItems.findIndex(item => !unlockedSet.has(item.id));
    const winningIndex = firstUncollected >= 0
        ? firstUncollected
        : Math.floor(Math.random() * currentItems.length);
    const winningItem = currentItems[winningIndex];
    const isNew = !currentUnlockedIds.includes(winningItem.id);

    // 총 스텝: 3바퀴 + winningIndex 만큼 더 가면 정확히 winningIndex에 착지
    const totalSteps = cards.length * 3 + winningIndex; // 36 ~ 47

    // 선형 지연 스케줄: 합산이 5700ms → 정착 300ms → 총 6초
    const TARGET_MS = 5700;
    const avgDelay  = TARGET_MS / totalSteps;
    const minDelay  = Math.max(28, Math.round(avgDelay * 0.4));
    const maxDelay  = Math.round(avgDelay * 2 - minDelay); // (min+max)/2 = avg → 합 = TARGET_MS

    const delays = Array.from({ length: totalSteps }, (_, i) => {
        const t = i / Math.max(totalSteps - 1, 1);
        return Math.round(minDelay + (maxDelay - minDelay) * t);
    });

    // 룰렛 효과음 재생 (BGM 위에 추가)
    audioManager.playSfx(SFX.ROULETTE);

    let step = 0;
    function tick() {
        cards.forEach(c => c.classList.remove('slot-highlight'));
        cards[step % cards.length].classList.add('slot-highlight');

        step++;
        if (step >= totalSteps) {
            setTimeout(() => revealResult(cards, winningIndex, winningItem, isNew), 300);
            return;
        }
        setTimeout(tick, delays[step]);
    }
    setTimeout(tick, delays[0]);
}

function revealResult(cards, winningIndex, item, isNew) {
    cards.forEach(c => c.classList.remove('slot-highlight'));

    const chosen = cards[winningIndex];

    // 나머지 어둡게
    cards.forEach((c, i) => {
        if (i !== winningIndex) c.classList.add('dimmed');
    });

    // 카드 뒤집기
    chosen.classList.add('flipped');

    if (isNew) {
        chosen.classList.add('result-new');
        const badge = document.createElement('div');
        badge.className = 'result-badge new-badge';
        badge.textContent = 'NEW!!';
        chosen.appendChild(badge);

        const rect = chosen.getBoundingClientRect();
        particleSystem.createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        setTimeout(() => particleSystem.createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2), 400);

        setTimeout(finish, 2800);
    } else {
        chosen.classList.add('result-dud');
        const badge = document.createElement('div');
        badge.className = 'result-badge dud-badge';
        badge.textContent = '꽝...';
        chosen.appendChild(badge);

        cardSelectContainer.classList.add('shake-anim');
        setTimeout(() => cardSelectContainer.classList.remove('shake-anim'), 600);

        setTimeout(finish, 2200);
    }

    function finish() {
        hideCardSelection();
        if (onCardSelectCallback) onCardSelectCallback(item);
    }
}

export function hideCardSelection() {
    cardSelectContainer.style.display = 'none';
}
