const showtimeContainer = document.getElementById('showtime-container');
const showtimeReturnButton = document.getElementById('showtime-return-button');
const showtimeImage = document.getElementById('showtime-image');
const showtimeImageWrapper = document.querySelector('.showtime-image-wrapper'); // 추가

let onShowtimeEndCallback = null;

export function showShowtime(callback, stage) {
    onShowtimeEndCallback = callback;
    if (stage && stage.showtimeImage) {
        showtimeImage.src = stage.showtimeImage;
        showtimeImageWrapper.style.display = 'flex'; // 이미지 래퍼 표시
    } else {
        showtimeImageWrapper.style.display = 'none'; // 이미지 래퍼 숨김
    }
    showtimeContainer.style.display = 'flex';
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
