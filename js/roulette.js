import { ROULETTE_ITEMS } from './config.js';

const rouletteCanvas = document.getElementById('roulette-canvas');
const spinButton = document.getElementById('spin-button');
const rouletteContainer = document.getElementById('roulette-container');
const ctx = rouletteCanvas.getContext('2d');

const centerX = rouletteCanvas.width / 2;
const centerY = rouletteCanvas.height / 2;
const radius = Math.min(centerX, centerY) - 10;

let currentRotation = 0;
let isSpinning = false;
let onSpinCompleteCallback = null;

// 룰렛 그리기
function drawRoulette() {
    ctx.clearRect(0, 0, rouletteCanvas.width, rouletteCanvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    const arc = Math.PI * 2 / ROULETTE_ITEMS.length;

    ROULETTE_ITEMS.forEach((item, index) => {
        const startAngle = index * arc;
        const endAngle = (index + 1) * arc;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();

        // 색상 설정 (임시)
        ctx.fillStyle = `hsl(${index * (360 / ROULETTE_ITEMS.length)}, 70%, 60%)`;
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.rotate(startAngle + arc / 2);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(item.name, radius - 5, 5);
        ctx.restore();
    });

    // 당첨 지시자 그리기
    drawIndicator();
}

// 당첨 지시자를 그리는 함수
function drawIndicator() {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 2); // 캔버스 상단 중앙을 가리키도록 회전

    ctx.beginPath();
    ctx.moveTo(0, -radius - 20); // 룰렛 원 바깥쪽 상단
    ctx.lineTo(-10, -radius - 5); // 왼쪽 아래
    ctx.lineTo(10, -radius - 5);  // 오른쪽 아래
    ctx.closePath();
    ctx.fillStyle = 'red'; // 지시자 색상
    ctx.fill();
    ctx.restore();
}

function spinRoulette() {
    if (isSpinning) return;
    isSpinning = true;
    spinButton.disabled = true;

    const totalRotation = 360 * 5 + Math.random() * 360; // 최소 5바퀴 + 랜덤 각도
    const duration = 5000; // 5초
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out 큐빅

        currentRotation = (totalRotation * easedProgress * Math.PI / 180) % (Math.PI * 2);
        drawRoulette();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            spinButton.disabled = false;
            determineWinner();
        }
    }
    requestAnimationFrame(animate);
}

// 당첨 아이템 결정
function determineWinner() {
    const normalizedRotation = (currentRotation + Math.PI * 2) % (Math.PI * 2); // 0 ~ 2PI
    const anglePerItem = Math.PI * 2 / ROULETTE_ITEMS.length;
    
    // 화살표가 가리키는 각도 보정 (화살표가 룰렛의 오른쪽에 있으므로)
    const pointerAngle = (Math.PI * 2 - normalizedRotation + Math.PI / 2) % (Math.PI * 2);

    let winningIndex = 0;
    for (let i = 0; i < ROULETTE_ITEMS.length; i++) {
        if (pointerAngle >= (i * anglePerItem) && pointerAngle < ((i + 1) * anglePerItem)) {
            winningIndex = i;
            break;
        }
    }
    const winningItem = ROULETTE_ITEMS[winningIndex];
    alert(`축하합니다! ${winningItem.name}에 당첨되셨습니다!`);
    if (onSpinCompleteCallback) {
        onSpinCompleteCallback(winningItem);
    }
}

// 룰렛 초기화 및 표시
export function showRoulette(callback) {
    onSpinCompleteCallback = callback;
    rouletteContainer.style.display = 'flex';
    currentRotation = 0; // 초기화
    drawRoulette();
}

// 룰렛 숨기기
export function hideRoulette() {
    rouletteContainer.style.display = 'none';
}

spinButton.addEventListener('click', spinRoulette);

// 초기 그리기
drawRoulette();
