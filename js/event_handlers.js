
import * as Game from './game.js';
import * as UI from './ui.js';
import { handleFlippedCard, handleGo, handleStop } from './game_logic.js';
import { endPlayerTurn } from './turn_manager.js';

export function handleDeckClick() {
    // 추가 뒤집기 기회가 있을 때만 작동
    if (Game.extraFlipOwner === 'player' && Game.getExtraFlipsRemaining() > 0) {
        // 1. 추가 뒤집기 실행
        const flippedCard = Game.deck.pop();
        UI.displayFlippedCard(flippedCard);
        if (flippedCard) {
            const flippedCardDiv = UI.flippedCardContainerDiv.querySelector(`[data-id='${flippedCard.id}']`);
            handleFlippedCard('player', flippedCard, () => {
                Game.decrementExtraFlips();
                UI.deckDiv.removeEventListener('click', handleDeckClick);
                endPlayerTurn(Game.fieldCards.length === 0);
            });
        } else {
            Game.decrementExtraFlips();
            UI.deckDiv.removeEventListener('click', handleDeckClick);
            endPlayerTurn(Game.fieldCards.length === 0);
        }
    }
}

export function initializeEventListeners() {
    UI.goButton.addEventListener('click', handleGo);
    UI.stopButton.addEventListener('click', handleStop);
}
