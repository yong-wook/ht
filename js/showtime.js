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

    // 이미지 탐색 초기화
    initExploration();
}

// --- 이미지 드래그 및 탐색 로직 ---
let isDragging = false;
let startX, startY;
let currentTranslateX = 0; // px 단위
let currentTranslateY = 0; // px 단위
let currentScale = 2.5; // 초기 확대 배율
let isExplored = false;

// 탐색 그리드 설정
const GRID_ROWS = 5;
const GRID_COLS = 5;
let visitedGrid = [];
let totalVisited = 0;

function initExploration() {
    isExplored = false;
    currentScale = 2.5;
    visitedGrid = Array(GRID_ROWS * GRID_COLS).fill(false);
    totalVisited = 0;

    showtimeImage.style.transition = 'none'; // 드래그 중에는 트랜지션 끔
    showtimeImageWrapper.style.cursor = 'grab';

    // 이미지 로딩 대기 후 초기화
    if (showtimeImage.complete) {
        setRandomInitialPosition();
    } else {
        showtimeImage.onload = setRandomInitialPosition;
    }
}

function setRandomInitialPosition() {
    const wrapperRect = showtimeImageWrapper.getBoundingClientRect();
    const imgWidth = showtimeImage.naturalWidth * currentScale;
    const imgHeight = showtimeImage.naturalHeight * currentScale;

    // 이동 가능한 범위 계산 (화면 중앙 기준)
    const maxX = (imgWidth - wrapperRect.width) / 2;
    const maxY = (imgHeight - wrapperRect.height) / 2;

    // 랜덤 위치 설정 (범위 내)
    currentTranslateX = (Math.random() - 0.5) * 2 * maxX;
    currentTranslateY = (Math.random() - 0.5) * 2 * maxY;

    updateImageTransform();
    checkVisibility(); // 초기 위치에서도 방문 체크
}

function updateImageTransform() {
    showtimeImage.style.transform = `translate(calc(-50% + ${currentTranslateX}px), calc(-50% + ${currentTranslateY}px)) scale(${currentScale})`;
}

function checkVisibility() {
    if (isExplored) return;

    const wrapperRect = showtimeImageWrapper.getBoundingClientRect();
    // 현재 이미지의 실제 위치와 크기 계산 (transform 적용됨)
    // getBoundingClientRect는 transform이 적용된 최종 렌더링 사각형을 반환함
    const imgRect = showtimeImage.getBoundingClientRect();

    // 이미지 내부에서의 뷰포트(wrapper) 상대 좌표 계산
    const relativeLeft = wrapperRect.left - imgRect.left;
    const relativeTop = wrapperRect.top - imgRect.top;

    const cellWidth = imgRect.width / GRID_COLS;
    const cellHeight = imgRect.height / GRID_ROWS;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const index = r * GRID_COLS + c;
            if (visitedGrid[index]) continue;

            // 그리드 셀의 영역
            const cellLeft = c * cellWidth;
            const cellRight = (c + 1) * cellWidth;
            const cellTop = r * cellHeight;
            const cellBottom = (r + 1) * cellHeight;

            // 뷰포트와 교차하는지 확인 (간단한 AABB 충돌)
            // 뷰포트 영역: (relativeLeft, relativeTop) ~ (relativeLeft + wrapperRect.width, relativeTop + wrapperRect.height)
            const overlap = !(
                cellRight < relativeLeft ||
                cellLeft > relativeLeft + wrapperRect.width ||
                cellBottom < relativeTop ||
                cellTop > relativeTop + wrapperRect.height
            );

            if (overlap) {
                visitedGrid[index] = true;
                totalVisited++;
            }
        }
    }

    // 진행률 체크
    const progress = totalVisited / (GRID_ROWS * GRID_COLS);
    // console.log(`Exploration Progress: ${Math.round(progress * 100)}%`);

    if (progress >= 0.9) {
        finishExploration();
    }
}

function finishExploration() {
    isExplored = true;
    currentScale = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;

    showtimeImage.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
    updateImageTransform();

    showtimeImageWrapper.style.cursor = 'default';

    // 축하 효과
    setTimeout(() => {
        particleSystem.createConfetti(window.innerWidth / 2, window.innerHeight / 2);
    }, 500);
}

function startDrag(e) {
    if (isExplored) return; // 탐색 완료 후 드래그 방지
    if (e.target !== showtimeImage && e.target !== showtimeImageWrapper) return;

    isDragging = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    showtimeImageWrapper.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging || isExplored) return;
    e.preventDefault();

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    // 이동 적용 (이전 위치 기준이 아니라 누적값에 더함)
    // 드래그 감도를 위해 1:1 이동
    currentTranslateX += deltaX;
    currentTranslateY += deltaY;

    // 경계 제한 (이미지가 화면 밖으로 너무 나가지 않도록)
    const wrapperRect = showtimeImageWrapper.getBoundingClientRect();
    const imgWidth = showtimeImage.getBoundingClientRect().width; // 현재 스케일 적용된 크기
    const imgHeight = showtimeImage.getBoundingClientRect().height;

    // 중심에서 벗어날 수 있는 최대 거리 (이미지 끝이 화면 중앙을 넘지 않도록)
    // 약간의 여유를 둠
    const maxOffsetX = (imgWidth) / 2;
    const maxOffsetY = (imgHeight) / 2;

    // currentTranslateX = Math.max(-maxOffsetX, Math.min(maxOffsetX, currentTranslateX));
    // currentTranslateY = Math.max(-maxOffsetY, Math.min(maxOffsetY, currentTranslateY));

    updateImageTransform();
    checkVisibility();

    startX = clientX;
    startY = clientY;
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    if (!isExplored) showtimeImageWrapper.style.cursor = 'grab';
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
