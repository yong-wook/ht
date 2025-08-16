
import * as Game from './game.js';
import * as UI from './ui.js';
import { findBestCardToPlay, getCardValue } from './game_logic.js';
import { handleDeckClick } from './event_handlers.js';
import { updateFullBoard, handleGameEnd } from './main.js';
import * as Roulette from './roulette.js';


// --- 통합된 뒤집은 카드 처리 로직 ---
function handleFlippedCard(turn, playedCard) {
    const flippedCard = Game.deck.pop();
    UI.displayFlippedCard(flippedCard);

    if (!flippedCard) {
        endTurn(turn);
        return;
    }

    // 1. 뻑 해제 로직
    const ppeokGroupIndex = Game.tiedCards.findIndex(group => group[0].month === flippedCard.month);
    if (ppeokGroupIndex !== -1) {
        const ppeokGroup = Game.tiedCards.splice(ppeokGroupIndex, 1)[0];
        const cardsToAcquire = [flippedCard, ...ppeokGroup];
        Game.acquireCards(turn, ...cardsToAcquire);
        UI.updateStatusMessage(`${flippedCard.month}월 뻑 패를 가져갑니다!`);
        if (Game.takePiFromOpponent(turn)) {
            UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
        }
        endTurn(turn);
        return;
    }

    // 2. 바닥 카드와 매칭 확인
    const matchingFieldCards = Game.fieldCards.filter(c => c.month === flippedCard.month);

    // 4장 동시 획득 로직 추가
    if (matchingFieldCards.length === 3) {
        UI.updateStatusMessage(`${flippedCard.month}월 4장 한번에 획득!`);
        Game.acquireCards(turn, flippedCard, ...matchingFieldCards);
        endTurn(turn);
        return; // 로직 종료
    }

    // 3. 뻑 생성 로직 (플레이어가 낸 카드와 동일한 월의 카드가 바닥에 1장, 뒤집어서 1장)
    if (playedCard && matchingFieldCards.length === 1 && playedCard.month === flippedCard.month) {
        UI.updateStatusMessage("뻑!");
        const ppeokGroup = [playedCard, matchingFieldCards[0], flippedCard];
        Game.tiedCards.push(ppeokGroup);
        Game.setFieldCards(Game.fieldCards.filter(c => c.id !== matchingFieldCards[0].id && c.id !== playedCard.id));
        
        // 플레이어가 먹었던 카드를 다시 뱉어내야 함
        if (turn === 'player') {
           Game.playerAcquired = Game.playerAcquired.filter(c => c.id !== playedCard.id && c.id !== matchingFieldCards[0].id);
        } else {
           Game.computerAcquired = Game.computerAcquired.filter(c => c.id !== playedCard.id && c.id !== matchingFieldCards[0].id);
        }

        endTurn(turn);
        return;
    }
    
    // 4. 따닥 로직 (플레이어가 먹고 남은 한 장과 뒤집은 패가 맞을 때)
    if (playedCard && matchingFieldCards.length === 1 && playedCard.month === matchingFieldCards[0].month) {
        // 이 경우는 이미 playerPlay에서 처리되었어야 함.
        // 하지만 안전장치로 로직을 추가하거나, 혹은 playedCard와 다른 월의 카드를 뒤집었을 때를 고려해야함.
        // 지금은 일단 단순 매칭으로 처리
    }


    // 5. 일반 매칭 로직
    if (matchingFieldCards.length > 0) {
        let cardToTake = matchingFieldCards[0];
        if (matchingFieldCards.length > 1) {
            if (turn === 'player') {
                UI.promptCardSelection(matchingFieldCards, (chosenCard) => {
                    Game.acquireCards(turn, flippedCard, chosenCard);
                    endTurn(turn);
                });
                return;
            } else {
                matchingFieldCards.sort((a, b) => getCardValue(b) - getCardValue(a));
                cardToTake = matchingFieldCards[0];
            }
        }
        Game.acquireCards(turn, flippedCard, cardToTake);
    } else {
        // 6. 쪽 로직 (손에서 낸 카드와 뒤집은 카드가 같을 때)
        if (playedCard && playedCard.month === flippedCard.month) {
             UI.updateStatusMessage("쪽!");
             Game.acquireCards(turn, playedCard, flippedCard);
             if (Game.takePiFromOpponent(turn)) {
                 UI.updateStatusMessage("쪽! 상대방의 피를 1장 가져옵니다.");
             }
        } else {
            // 7. 아무것도 해당 안되면 그냥 바닥에 내려놓기
            Game.fieldCards.push(flippedCard);
        }
    }

    endTurn(turn);
}


// --- 플레이어 턴 로직 ---
export function playerPlay(selectedCard, selectedCardDiv) {
    if (UI.goButton.style.display === 'inline-block' || document.querySelector('.card-clone')) {
        UI.updateStatusMessage("애니메이션 중이거나 '고' 또는 '스톱'을 선택해야 합니다.");
        return;
    }
    if (UI.fieldDiv.querySelector('.selectable')) return;

    // 1. 뻑 해제
    const ppeokGroupIndex = Game.tiedCards.findIndex(group => group[0].month === selectedCard.month);
    if (ppeokGroupIndex !== -1) {
        const ppeokGroup = Game.tiedCards.splice(ppeokGroupIndex, 1)[0];
        Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
        Game.acquireCards('player', selectedCard, ...ppeokGroup);
        UI.updateStatusMessage(`${selectedCard.month}월 뻑 패를 가져갑니다!`);
        if (Game.takePiFromOpponent('player')) {
            UI.updateStatusMessage(UI.statusMessage.textContent + " 상대에게서 피 1장을 가져옵니다!");
        }
        handleFlippedCard('player', null);
        return;
    }

    const matchingCardsInField = Game.fieldCards.filter(card => card.month === selectedCard.month);

    // 2. 폭탄
    const cardsInHandSameMonth = Game.playerHand.filter(c => c.month === selectedCard.month);
    if (cardsInHandSameMonth.length === 3 && matchingCardsInField.length === 1) {
        if (confirm(`${selectedCard.month}월 패 3장으로 폭탄하시겠습니까?`)) {
            handlePlayerBomb(cardsInHandSameMonth, matchingCardsInField[0]);
            return;
        }
    }
    
    // 3. 일반 카드 제출
    let playedToField = false;
    let acquiredInTurn = [];

    const animateAndProceed = (fieldCardToMatch) => {
        const targetDiv = fieldCardToMatch ? UI.fieldDiv.querySelector(`[data-id='${fieldCardToMatch.id}']`) : UI.fieldDiv;
        UI.animateCardMove(selectedCardDiv, targetDiv, () => {
            Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));

            if (matchingCardsInField.length === 3) {
                // 4장 동시 획득
                Game.acquireCards('player', selectedCard, ...matchingCardsInField);
                acquiredInTurn.push(selectedCard, ...matchingCardsInField);
                playedToField = false;
            } else if (fieldCardToMatch) {
                // 1장 매칭
                Game.acquireCards('player', selectedCard, fieldCardToMatch);
                acquiredInTurn.push(selectedCard, fieldCardToMatch);
                playedToField = false;
            } else {
                // 매칭 카드 없음
                Game.fieldCards.push(selectedCard);
                playedToField = true;
            }

            handleFlippedCard('player', playedToField ? selectedCard : acquiredInTurn[0]);
        });
    };

    if (matchingCardsInField.length === 2) { // 따닥 상황
        UI.promptCardSelection(matchingCardsInField, (chosenFieldCard) => {
            const remainingFieldCard = matchingCardsInField.find(c => c.id !== chosenFieldCard.id);
            Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
            Game.acquireCards('player', selectedCard, chosenFieldCard);
            
            const flippedCard = Game.deck.pop();
            UI.displayFlippedCard(flippedCard);
            if (flippedCard && flippedCard.month === remainingFieldCard.month) {
                UI.updateStatusMessage(`${selectedCard.month}월 따닥!`);
                Game.acquireCards('player', flippedCard, remainingFieldCard);
                if(Game.takePiFromOpponent('player')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
                endTurn('player');
            } else if (flippedCard) {
                handleFlippedCard('player', selectedCard);
            } else {
                endTurn('player');
            }
        });
    } else if (matchingCardsInField.length === 1 || matchingCardsInField.length === 3) {
        animateAndProceed(matchingCardsInField[0]);
    } else { // 낼 패가 없을 때
        animateAndProceed(null);
    }
}

// --- 컴퓨터 턴 로직 ---
export function computerTurn() {
    UI.updateStatusMessage("컴퓨터의 턴입니다...");

    setTimeout(() => {
        const { cardToPlay, matchingCard, reason } = findBestCardToPlay(Game.computerHand, Game.fieldCards, Game.tiedCards);
        console.log("컴퓨터 AI 결정:", reason);

        if (cardToPlay) {
            Game.setComputerHand(Game.computerHand.filter(c => c.id !== cardToPlay.id));

            if (matchingCard) { // 먹을 패가 있는 경우
                Game.acquireCards('computer', cardToPlay, matchingCard);
                 // 뻑 해제였을 경우
                if (reason.includes('뻑')) {
                    const ppeokGroup = Game.tiedCards.find(group => group[0].month === cardToPlay.month);
                    if (ppeokGroup) {
                        Game.acquireCards('computer', ...ppeokGroup);
                        Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== cardToPlay.month));
                    }
                }
            } else { // 먹을 패가 없는 경우
                Game.fieldCards.push(cardToPlay);
            }
            
            updateFullBoard();

            setTimeout(() => {
                handleFlippedCard('computer', matchingCard ? cardToPlay : null);
            }, 500);

        } else {
            // 낼 카드가 없으면 그냥 뒤집음
            handleFlippedCard('computer', null);
        }
    }, 1000);
}


function endTurn(turn) {
    const isSsakSseuri = Game.fieldCards.length === 0;
    if (isSsakSseuri) {
        UI.updateStatusMessage(`${turn === 'player' ? '플레이어' : '컴퓨터'} 싹쓸이!`);
        if(Game.takePiFromOpponent(turn)) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
    }

    if (turn === 'player') {
        Game.updatePlayerScore();
        updateFullBoard();
        if (Game.playerScore >= 3) {
            UI.showGoStopButtons(true);
            UI.updateStatusMessage("3점 이상! '고' 또는 '스톱'을 선택하세요.");
        } else {
            setTimeout(() => {
                UI.displayFlippedCard(null);
                computerTurn();
            }, 1000);
        }
    } else { // computer turn
        Game.updateComputerScore();
        updateFullBoard();
        UI.updateStatusMessage("플레이어 턴입니다.");
        setTimeout(() => {
            UI.displayFlippedCard(null);
            checkGameOver();
        }, 1000);
    }
}


export function handleExtraFlip(turn) {
    if (Game.extraFlipOwner === turn && Game.getExtraFlipsRemaining() > 0) {
        Game.decrementExtraFlips();
        UI.deckDiv.removeEventListener('click', handleDeckClick);
        handleFlippedCard(turn, null);
    }
}

export function handleGo() {
    Game.incrementPlayerGo();
    UI.updateStatusMessage(`플레이어 ${Game.playerGoCount}고! 컴퓨터 턴입니다.`);
    UI.showGoStopButtons(false);
    setTimeout(computerTurn, 1000);
}

export function handleStop() {
    let playerResult = Game.calculateScore(Game.playerAcquired);
    let computerResult = Game.calculateScore(Game.computerAcquired);

    let finalPlayerScore = playerResult.score;
    let finalComputerScore = computerResult.score;
    let moneyWon = 0;
    let winner = '';
    let breakdown = [];

    if (finalPlayerScore > finalComputerScore) {
        winner = 'player';
        breakdown = playerResult.breakdown;

        if (Game.playerGoCount > 0) {
            if (Game.playerGoCount === 1) { finalPlayerScore += 1; breakdown.push(`1고 (+1점)`); }
            else if (Game.playerGoCount === 2) { finalPlayerScore += 2; breakdown.push(`2고 (+2점)`); }
            else {
                const goMultiplier = Math.pow(2, Game.playerGoCount - 2);
                finalPlayerScore *= goMultiplier;
                breakdown.push(`${Game.playerGoCount}고 (x${goMultiplier})`);
            }
        }
        const computerPiCount = Game.computerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
        if (playerResult.breakdown.some(b => b.startsWith('피')) && computerPiCount < 5) {
            finalPlayerScore *= 2;
            breakdown.push(`피박 (x2)`);
        }
        if (playerResult.breakdown.some(b => b.startsWith('광')) && Game.computerAcquired.filter(c => c.type === 'gwang').length === 0) {
            finalPlayerScore *= 2;
            breakdown.push(`광박 (x2)`);
        }
        if (Game.playerGoCount > 0 && finalComputerScore === 0) {
            finalPlayerScore *= 2;
            breakdown.push(`고박 (x2)`);
        }
        const shakeAndBombMultiplier = Math.pow(2, Game.playerShakeCount + Game.playerBombCount);
        if (shakeAndBombMultiplier > 1) {
            finalPlayerScore *= shakeAndBombMultiplier;
            if (Game.playerShakeCount > 0) breakdown.push(`흔들기 (x${Math.pow(2, Game.playerShakeCount)})`);
            if (Game.playerBombCount > 0) breakdown.push(`폭탄 (x${Math.pow(2, Game.playerBombCount)})`);
        }
        if (Game.currentRoundWinMultiplier > 1) {
            finalPlayerScore *= Game.currentRoundWinMultiplier;
            breakdown.push(`승리 보너스 (x${Game.currentRoundWinMultiplier})`);
        }

        moneyWon = Game.calculateMoney('player', finalPlayerScore);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        UI.showResultModal('player', finalPlayerScore, moneyWon, breakdown);

        if (Game.computerMoney > 0) {
            Roulette.showRoulette((reward) => {
                Game.setCurrentRouletteReward(reward);
                Roulette.hideRoulette();
                handleGameEnd();
            });
        } else {
            handleGameEnd();
        }

    } else if (finalComputerScore > finalPlayerScore) {
        winner = 'computer';
        breakdown = computerResult.breakdown;
        const playerPiCount = Game.playerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
        if (computerResult.breakdown.some(b => b.startsWith('피')) && playerPiCount < 5) {
            finalComputerScore *= 2;
            breakdown.push(`피박 (x2)`);
        }
        if (computerResult.breakdown.some(b => b.startsWith('광')) && Game.playerAcquired.filter(c => c.type === 'gwang').length === 0) {
            finalComputerScore *= 2;
            breakdown.push(`광박 (x2)`);
        }

        moneyWon = Game.calculateMoney('computer', finalComputerScore);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        UI.showResultModal('computer', finalComputerScore, moneyWon, breakdown);
        handleGameEnd();

    } else {
        UI.showResultModal('draw', 0, 0, ['무승부!']);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        handleGameEnd();
    }

    updateFullBoard();
}

export function checkGameOver() {
    if (Game.deck.length === 0 || Game.playerHand.length === 0 || Game.computerHand.length === 0) {
        alert("게임 종료! 더 이상 낼 패가 없습니다. 점수를 계산합니다.");
        handleStop();
    }
}

export function handlePlayerBomb(bombSet, fieldCard) {
    UI.updateStatusMessage(`${bombSet[0].month}월 폭탄!`);
    Game.acquireCards('player', ...bombSet, fieldCard);
    Game.setPlayerHand(Game.playerHand.filter(c => c.month !== bombSet[0].month));
    Game.incrementPlayerBomb();
    if (Game.takePiFromOpponent('player')) {
        UI.updateStatusMessage(UI.statusMessage.textContent + " 상대에게서 피 1장을 가져옵니다!");
    }
    handleFlippedCard('player', null);
}
