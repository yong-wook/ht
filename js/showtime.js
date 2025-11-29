import { SHOWTIME_RESPIN_COST } from './config.js';
import * as UI from './ui.js'; // UI 모듈 임포트
import { particleSystem } from './effects.js';

const showtimeContainer = document.getElementById('showtime-container');
const showtimeReturnButton = document.getElementById('showtime-return-button');
const showtimeRespinButton = document.getElementById('showtime-respin-button');
const showtimeImage = document.getElementById('showtime-image');
const showtimeImageWrapper = document.querySelector('.showtime-image-wrapper');
const showtimeRespinCostDisplay = document.getElementById('showtime-respin-cost');

let onShowtimeEndCallback = null;
let onRespinCallback = null;

// 이미지 클릭 시 전체 화면 보기
showtimeImage.addEventListener('click', () => {
    if (showtimeImage.src) {
        UI.showFullscreenImage(showtimeImage.src);
    }
});

export function showShowtime(callback, stage, selectedImagePath, respinCallback) {
    onShowtimeEndCallback = callback;
    onRespinCallback = respinCallback;
    if (selectedImagePath) {
        showtimeImage.src = selectedImagePath;
        showtimeImageWrapper.style.display = 'flex';
    } else if (stage && stage.showtimeImage) {
        showtimeImage.src = stage.showtimeImage;
        showtimeImageWrapper.style.display = 'flex';
    } else {
        showtimeImageWrapper.style.display = 'none';
    }
    showtimeContainer.style.display = 'flex';

    // 재시도 비용 표시
    showtimeRespinCostDisplay.textContent = `룰렛 재시도 비용: ${SHOWTIME_RESPIN_COST.toLocaleString()}원`;

    // 폭죽 효과 (이미지가 있을 때만)
    if (showtimeImage.src) {
        setTimeout(() => {
            particleSystem.createConfetti(window.innerWidth / 2, window.innerHeight / 2);
        }, 500); // 이미지 등장 애니메이션과 타이밍 맞춤
    }

    // 이미지 위치 초기화
    resetImagePosition();
}

// --- 이미지 드래그 탐색 로직 ---
let isDragging = false;
let startX, startY;
let currentTranslateX = -50; // % 단위
let currentTranslateY = -50; // % 단위
let currentPixelX = 0; // px 단위 (누적 이동량)
let currentPixelY = 0; // px 단위 (누적 이동량)

function resetImagePosition() {
    currentPixelX = 0;
    currentPixelY = 0;
    updateImageTransform();
}

function updateImageTransform() {
    // 초기 중앙 정렬(-50%, -50%)에 누적 이동량(px)을 더함
    showtimeImage.style.transform = `translate(calc(-50% + ${currentPixelX}px), calc(-50% + ${currentPixelY}px))`;
}

function startDrag(e) {
    if (e.target !== showtimeImage && e.target !== showtimeImageWrapper) return;
    isDragging = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    showtimeImageWrapper.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault(); // 스크롤 방지

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    // 현재 위치 업데이트 (임시)
    showtimeImage.style.transform = `translate(calc(-50% + ${currentPixelX + deltaX}px), calc(-50% + ${currentPixelY + deltaY}px))`;
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    showtimeImageWrapper.style.cursor = 'grab';

    const clientX = e.type.includes('mouse') ? e.clientX : e.changedTouches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.changedTouches[0].clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    currentPixelX += deltaX;
    currentPixelY += deltaY;

    updateImageTransform();
}

// 이벤트 리스너 등록
showtimeImageWrapper.addEventListener('mousedown', startDrag);
showtimeImageWrapper.addEventListener('touchstart', startDrag, { passive: false });

window.addEventListener('mousemove', drag);
window.addEventListener('touchmove', drag, { passive: false });

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);


export function hideShowtime() {
    showtimeContainer.style.display = 'none';
}

showtimeReturnButton.addEventListener('click', () => {
    hideShowtime();
    if (onShowtimeEndCallback) {
        onShowtimeEndCallback();
    }
});

showtimeRespinButton.addEventListener('click', () => {
    if (onRespinCallback) {
        onRespinCallback();
    }
});
