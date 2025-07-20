const showtimeRouletteCanvas = document.getElementById('showtime-roulette-canvas');
const showtimeSpinButton = document.getElementById('showtime-spin-button');
const showtimeRouletteContainer = document.getElementById('showtime-roulette-container');
const ctx = showtimeRouletteCanvas.getContext('2d');

const centerX = showtimeRouletteCanvas.width / 2;
const centerY = showtimeRouletteCanvas.height / 2;
const radius = Math.min(centerX, centerY) - 10;

let currentRotation = 0;
let isSpinning = false;
let onSpinCompleteCallback = null;
let rouletteItems = []; // 동적으로 설정될 룰렛 아이템
let itemAngles = []; // 각 아이템의 시작 및 끝 각도 저장

// 룰렛 그리기
function drawRoulette() {
    ctx.clearRect(0, 0, showtimeRouletteCanvas.width, showtimeRouletteCanvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    let currentAngle = 0;
    rouletteItems.forEach((item, index) => {
        const startAngle = currentAngle;
        const endAngle = currentAngle + itemAngles[index];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();

        // 색상 설정
        ctx.fillStyle = `hsl(${index * (360 / rouletteItems.length)}, 70%, 60%)`;
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.rotate(startAngle + itemAngles[index] / 2);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = item.name.split(' ');
        const lineHeight = 20;
        const textX = radius / 2 + 15;

        lines.forEach((line, i) => {
            const textY = -(lineHeight * (lines.length -1) / 2) + (i * lineHeight);
            ctx.fillText(line, textX, textY);
        });

        ctx.restore();
        currentAngle = endAngle;
    });

    // 당첨 지시자 그리기
    drawIndicator();
    ctx.restore();
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
    showtimeSpinButton.disabled = true;

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
            showtimeSpinButton.disabled = false;
            determineWinner();
        }
    }
    requestAnimationFrame(animate);
}

// 당첨 아이템 결정
function determineWinner() {
    const totalAngle = Math.PI * 2; // 360도
    const stoppingAngle = (currentRotation + Math.PI * 2) % totalAngle; // 0 ~ 2PI

    let winningIndex = -1;
    let accumulatedAngle = 0;
    for (let i = 0; i < rouletteItems.length; i++) {
        accumulatedAngle += itemAngles[i];
        if (stoppingAngle < accumulatedAngle) {
            winningIndex = i;
            break;
        }
    }

    const winningItem = rouletteItems[winningIndex];
    alert(`쇼타임 배경: ${winningItem.name}에 당첨되셨습니다!`);
    if (onSpinCompleteCallback) {
        onSpinCompleteCallback(winningItem);
    }
}

// 룰렛 초기화 및 표시
export function showShowtimeRoulette(items, callback) {
    rouletteItems = items;
    onSpinCompleteCallback = callback;

    // 가중치 계산 및 각도 할당
    const totalWeight = rouletteItems.reduce((sum, item, index) => sum + (rouletteItems.length - index), 0);
    let currentTotalAngle = 0;
    itemAngles = rouletteItems.map((item, index) => {
        const weight = rouletteItems.length - index; // 1번이 가장 넓고 12번이 가장 좁게
        const angle = (weight / totalWeight) * (Math.PI * 2);
        return angle;
    });

    showtimeRouletteContainer.style.display = 'flex';
    currentRotation = 0; // 초기화
    drawRoulette();
}

// 룰렛 숨기기
export function hideShowtimeRoulette() {
    showtimeRouletteContainer.style.display = 'none';
}

showtimeSpinButton.addEventListener('click', spinRoulette);

// 초기 그리기
drawRoulette();