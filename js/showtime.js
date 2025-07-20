import { SHOWTIME_RESPIN_COST } from './config.js';

const showtimeContainer = document.getElementById('showtime-container');
const showtimeReturnButton = document.getElementById('showtime-return-button');
const showtimeRespinButton = document.getElementById('showtime-respin-button'); // 추가
const showtimeImage = document.getElementById('showtime-image');
const showtimeImageWrapper = document.querySelector('.showtime-image-wrapper'); // 추가
const showtimeRespinCostDisplay = document.getElementById('showtime-respin-cost'); // 추가

let onShowtimeEndCallback = null;
let onRespinCallback = null; // 추가

export function showShowtime(callback, stage, selectedImagePath, respinCallback) {
    onShowtimeEndCallback = callback;
    onRespinCallback = respinCallback; // 추가
    if (selectedImagePath) {
        showtimeImage.src = selectedImagePath;
        showtimeImageWrapper.style.display = 'flex'; // 이미지 래퍼 표시
    } else if (stage && stage.showtimeImage) {
        showtimeImage.src = stage.showtimeImage;
        showtimeImageWrapper.style.display = 'flex'; // 이미지 래퍼 표시
    } else {
        showtimeImageWrapper.style.display = 'none'; // 이미지 래퍼 숨김
    }
    showtimeContainer.style.display = 'flex';

    // 재시도 비용 표시
    showtimeRespinCostDisplay.textContent = `룰렛 재시도 비용: ${SHOWTIME_RESPIN_COST.toLocaleString()}원`;
}

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
