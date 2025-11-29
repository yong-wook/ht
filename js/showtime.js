import { SHOWTIME_RESPIN_COST } from './config.js';
import * as UI from './ui.js'; // UI 모듈 임포트

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
