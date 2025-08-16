
import * as Game from './game.js';
import * as UI from './ui.js';
import { handleGo, handleStop, handleExtraFlip } from './turn_manager.js';

export function handleDeckClick() {
    // 추가 뒤집기 기회 확인 및 실행은 handleExtraFlip 내부에서 처리
    handleExtraFlip('player');
}

export function initializeEventListeners() {
    UI.goButton.addEventListener('click', handleGo);
    UI.stopButton.addEventListener('click', handleStop);
}
