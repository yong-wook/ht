import { CARDS } from './config.js';
import { particleSystem } from './effects.js';

const cardSelectContainer = document.getElementById('showtime-card-select-container');
const cardGrid = document.getElementById('card-grid');

let onCardSelectCallback = null;
let weightedItems = [];

// 가중치에 따라 아이템(월)을 선택하는 함수
function getWeightedRandomItem() {
    const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedItems) {
        random -= item.weight;
        if (random < 0) {
            return item.value;
        }
    }
    return weightedItems[weightedItems.length - 1].value; // 혹시 모를 오류 방지
}

// 카드 선택 화면 초기화 및 표시
export function showCardSelection(items, callback) {
    onCardSelectCallback = callback;
    weightedItems = items.map((item, index) => ({
        value: item, // item은 {name: '1월', ...} 형태
        weight: (items.length - index) + 3 // 12월이 더 자주 나오도록 가중치 조정
    }));

    // 1. 결과 미리 결정
    const winningItem = getWeightedRandomItem();

    cardGrid.innerHTML = ''; // 그리드 초기화

    // 2. 12개의 카드 생성
    for (let i = 0; i < 12; i++) {
        const scene = document.createElement('div');
        scene.classList.add('card-scene');

        const flipper = document.createElement('div');
        flipper.classList.add('card-flipper');

        const front = document.createElement('div');
        front.classList.add('card-face', 'card-front');

        const back = document.createElement('div');
        back.classList.add('card-face', 'card-back');

        flipper.appendChild(front);
        flipper.appendChild(back);
        scene.appendChild(flipper);
        cardGrid.appendChild(scene);

        // 3. 클릭 이벤트 핸들러
        scene.addEventListener('click', () => {
            // 이미 뒤집힌 카드는 무시
            if (document.querySelector('.card-scene.flipped')) return;

            // 어떤 카드를 클릭하든 결정된 결과로 뒤집힘
            const month = parseInt(winningItem.name.replace('배경 ', ''));
            const representativeCard = CARDS.find(c => c.month === month && (c.type === 'gwang' || c.type === 'ggot'));
            front.style.backgroundImage = `url('${representativeCard.img}')`;

            scene.classList.add('flipped');

            // 4. 시각적 효과 및 콜백 실행
            // 다른 카드들 어둡게 처리
            document.querySelectorAll('.card-scene').forEach(c => {
                if (c !== scene) c.classList.add('dimmed');
            });

            // 폭죽 효과
            const rect = scene.getBoundingClientRect();
            particleSystem.createConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

            setTimeout(() => {
                hideCardSelection();
                if (onCardSelectCallback) {
                    onCardSelectCallback(winningItem);
                }
            }, 2500); // 시간 약간 연장
        });
    }

    cardSelectContainer.style.display = 'flex';
}

// 카드 선택 화면 숨기기
export function hideCardSelection() {
    cardSelectContainer.style.display = 'none';
}
