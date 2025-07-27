
import * as Game from './game.js';
import * as UI from './ui.js';
import { handleFlippedCard, handlePlayerBomb, checkGameOver, getCardValue } from './game_logic.js';
import { updateFullBoard } from './main.js';

// --- 플레이어 턴 로직 ---
export function playerPlay(selectedCard, selectedCardDiv) {
    if (UI.goButton.style.display === 'inline-block' || document.querySelector('.card-clone')) {
        UI.updateStatusMessage("애니메이션 중이거나 '고' 또는 '스톱'을 선택해야 합니다.");
        return;
    }
    if (UI.fieldDiv.querySelector('.selectable')) return;

    // 뻑 해제 로직
    const bbeokGroupToRelease = Game.tiedCards.find(group => group[0].month === selectedCard.month);
    if (bbeokGroupToRelease) {
        const bbeokCardElements = bbeokGroupToRelease.map(c => UI.fieldDiv.querySelector(`[data-id='${c.id}']`));
        UI.animateCardMove(selectedCardDiv, bbeokCardElements[0], () => {
            Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
            Game.acquireCards('player', selectedCard, ...bbeokGroupToRelease);
            Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== selectedCard.month));
            UI.updateStatusMessage(`${selectedCard.month}월 뻑 패를 가져갑니다!`);
            if (Game.takePiFromOpponent('player')) {
                UI.updateStatusMessage(UI.statusMessage.textContent + " 상대에게서 피 1장을 가져옵니다!");
            }
            const flippedCard = Game.deck.pop();
            UI.displayFlippedCard(flippedCard);
            if (flippedCard) {
                handleFlippedCard('player', flippedCard, () => endPlayerTurn(Game.fieldCards.length === 0), selectedCard);
            }
        });
        return;
    }

    const cardsInHandSameMonth = Game.playerHand.filter(c => c.month === selectedCard.month);
    const matchingCardsInField = Game.fieldCards.filter(card => card.month === selectedCard.month);

    // 폭탄
    if (cardsInHandSameMonth.length === 3 && matchingCardsInField.length === 1) {
        const wantsToBomb = confirm(`${selectedCard.month}월 패 3장으로 폭탄하시겠습니까?`);
        if (wantsToBomb) {
            handlePlayerBomb(cardsInHandSameMonth, matchingCardsInField[0]);
            return;
        }
    }

    let isPlayerChoiceNeeded = false;

    const processAfterFlip = (isSsakSseuri) => {
        const flippedCard = Game.deck.pop();
        UI.displayFlippedCard(flippedCard);
        if (flippedCard) {
            handleFlippedCard('player', flippedCard, () => {
                endPlayerTurn(isSsakSseuri || Game.fieldCards.length === 0);
            }, selectedCard);
        } else {
            endPlayerTurn(isSsakSseuri || Game.fieldCards.length === 0);
        }
    };

    const processMove = (fieldCardToMatch) => {
        const fieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${fieldCardToMatch.id}']`);
        UI.animateCardMove(selectedCardDiv, fieldCardDiv, () => {
            Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
            Game.acquireCards('player', selectedCard, fieldCardToMatch);
            processAfterFlip(false);
        });
    };

    if (matchingCardsInField.length === 1) {
        const fieldCardToMatch = matchingCardsInField[0];
        const fieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${fieldCardToMatch.id}']`);

        // 카드를 내는 애니메이션
        UI.animateCardMove(selectedCardDiv, fieldCardDiv, () => {
            // 낸 카드를 손에서 제거
            Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
            
            // 덱에서 카드를 뒤집음
            const flippedCard = Game.deck.pop();
            UI.displayFlippedCard(flippedCard);

            // 뻑 발생 조건 체크: 낸 카드, 바닥 카드, 뒤집은 카드가 모두 같은 월
            if (flippedCard && flippedCard.month === selectedCard.month) {
                UI.updateStatusMessage("뻑!");

                // 1. 뻑이 된 3장의 카드를 묶음으로 만듦
                const bbeokGroup = [selectedCard, fieldCardToMatch, flippedCard];
                Game.setTiedCards([...Game.tiedCards, bbeokGroup]);
                
                // 2. 뻑이 된 카드들은 더 이상 일반 바닥 패가 아니므로, fieldCards에서 모두 제거
                Game.setFieldCards(Game.fieldCards.filter(c => c.id !== fieldCardToMatch.id));
                
                updateFullBoard();
                setTimeout(() => endPlayerTurn(false), 1000); // 턴 종료
            } else {
                // 뻑이 아님: 정상적으로 카드 획득
                Game.acquireCards('player', selectedCard, fieldCardToMatch);
                
                // 뒤집은 카드 처리
                if (flippedCard) {
                    handleFlippedCard('player', flippedCard, () => endPlayerTurn(Game.fieldCards.length === 0));
                } else {
                    endPlayerTurn(Game.fieldCards.length === 0);
                }
            }
        });
    }
    else if (matchingCardsInField.length === 2) {
        isPlayerChoiceNeeded = true;
        UI.promptCardSelection(matchingCardsInField, (chosenFieldCard) => {
            const remainingFieldCard = matchingCardsInField.find(c => c.id !== chosenFieldCard.id);
            const chosenFieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${chosenFieldCard.id}']`);
            
            UI.animateCardMove(selectedCardDiv, chosenFieldCardDiv, () => {
                Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
                Game.acquireCards('player', selectedCard, chosenFieldCard);
                Game.setFieldCards(Game.fieldCards.filter(c => c.id !== chosenFieldCard.id));

                const flippedCard = Game.deck.pop();
                UI.displayFlippedCard(flippedCard);

                if (flippedCard && remainingFieldCard && flippedCard.month === remainingFieldCard.month) {
                    UI.updateStatusMessage(`${selectedCard.month}월 따닥!`);
                    const remainingFieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${remainingFieldCard.id}']`);
                    const flippedCardDiv = UI.flippedCardContainerDiv.querySelector(`[data-id='${flippedCard.id}']`);
                    
                    UI.animateCardMove(flippedCardDiv, remainingFieldCardDiv, () => {
                         Game.acquireCards('player', flippedCard, remainingFieldCard);
                         if(Game.takePiFromOpponent('player')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
                         endPlayerTurn(Game.fieldCards.length === 0);
                    });
                } else if (flippedCard) {
                    handleFlippedCard('player', flippedCard, () => endPlayerTurn(Game.fieldCards.length === 0), selectedCard);
                } else {
                    endPlayerTurn(Game.fieldCards.length === 0);
                }
            });
        });
    } else if (matchingCardsInField.length === 3) {
        const firstFieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${matchingCardsInField[0].id}']`);
        UI.animateCardMove(selectedCardDiv, firstFieldCardDiv, () => {
            Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
            UI.updateStatusMessage(`${selectedCard.month}월 4장 한번에 획득!`);
            Game.acquireCards('player', selectedCard, ...matchingCardsInField);
            processAfterFlip(true);
        });
    } else { 
        Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
        Game.fieldCards.push(selectedCard);
        updateFullBoard();
        setTimeout(() => { // 낸 패가 판에 표시될 시간을 줌
            const flippedCard = Game.deck.pop();
            UI.displayFlippedCard(flippedCard);
            if (flippedCard) {
                const isJjok = selectedCard.month === flippedCard.month;
                if (isJjok) {
                    UI.updateStatusMessage("쪽!");
                    const playedCardDiv = UI.fieldDiv.querySelector(`[data-id='${selectedCard.id}']`);
                    const flippedCardDiv = UI.flippedCardContainerDiv.querySelector(`[data-id='${flippedCard.id}']`);
                    UI.animateCardMove(flippedCardDiv, playedCardDiv, () => {
                        Game.acquireCards('player', selectedCard, flippedCard);
                        if (Game.takePiFromOpponent('player')) {
                            UI.updateStatusMessage("쪽! 상대방의 피를 1장 가져옵니다.");
                        }
                        endPlayerTurn(Game.fieldCards.length === 0);
                    });
                } else {
                    handleFlippedCard('player', flippedCard, () => endPlayerTurn(Game.fieldCards.length === 0), selectedCard);
                }
            } else {
                endPlayerTurn(Game.fieldCards.length === 0);
            }
        }, 500); // 0.5초 대기
    }
}

// 플레이어 턴 종료
export function endPlayerTurn(isSsakSseuri = false) {
    if (isSsakSseuri) {
        UI.updateStatusMessage("싹쓸이!");
        if(Game.takePiFromOpponent('player')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
    }
    Game.updatePlayerScore();
    updateFullBoard();

    // 플레이어 점수가 3점 이상일 경우 '고'/'스톱' 버튼 표시
    if (Game.playerScore >= 3) {
        UI.showGoStopButtons(true);
        UI.updateStatusMessage("3점 이상! '고' 또는 '스톱'을 선택하세요.");
        return; // '고'/'스톱' 선택 대기
    }

    // 컴퓨터의 추가 뒤집기 기회 처리
    if (Game.extraFlipOwner === 'computer' && Game.getExtraFlipsRemaining() > 0) {
        const extraFlippedCard = Game.deck.pop();
        UI.displayFlippedCard(extraFlippedCard);
        if (extraFlippedCard) {
            handleFlippedCard('computer', extraFlippedCard);
        }
        Game.decrementExtraFlips();
        UI.updateStatusMessage(`컴퓨터 추가 뒤집기 사용! 남은 횟수: ${Game.getExtraFlipsRemaining()}`);
        updateFullBoard();
    }

    UI.updateStatusMessage("컴퓨터 턴입니다.");
    setTimeout(() => {
        UI.displayFlippedCard(null);
        computerTurn();
    }, 1000);
}

// --- 컴퓨터 턴 로직 ---
export function computerTurn() {
    console.log("--- Computer Turn Start ---");
    console.log("Computer Hand:", Game.computerHand.map(c => `${c.month}월 ${c.type}`), `(${Game.computerHand.length}장)`);
    console.log("Field Cards:", Game.fieldCards.map(c => `${c.month}월 ${c.type}`), `(${Game.fieldCards.length}장)`);
    console.log("Deck:", Game.deck.length, "cards remaining");

    if (Game.computerHand.length === 0) {
        checkGameOver();
        return;
    }

    let playedCard = null;
    let targetFieldCard = null;

    // 0. 바닥 3장 먹기 (최우선)
    for (const cardInHand of Game.computerHand) {
        const matchingCardsInField = Game.fieldCards.filter(c => c.month === cardInHand.month);
        if (matchingCardsInField.length === 3) {
            playedCard = cardInHand;
            targetFieldCard = matchingCardsInField[0]; // 애니메이션을 위해 첫 번째 카드 선택
            UI.updateStatusMessage(`컴퓨터 ${cardInHand.month}월 4장 한번에 획득!`);

            // Directly acquire all 4 cards here
            Game.acquireCards('computer', playedCard, ...matchingCardsInField);
            Game.setComputerHand(Game.computerHand.filter(c => c.id !== playedCard.id));
            Game.setFieldCards(Game.fieldCards.filter(c => c.month !== playedCard.month)); // Remove all cards of that month from field

            updateFullBoard(); // Update UI after acquisition

            // Now, proceed to flip a card, but this is a separate action
            setTimeout(() => {
                const flippedCard = Game.deck.pop();
                console.log("Computer flips (after 4-card acquisition):", flippedCard ? `${flippedCard.month}월 ${flippedCard.type}`: "(no card)");
                UI.displayFlippedCard(flippedCard);

                // Handle the flipped card independently
                if (flippedCard) {
                    // If the flipped card matches anything on the field, acquire it.
                    // Otherwise, add it to the field.
                    // No playedCard or targetFieldCard for this flipped card, as the main play is done.
                    handleFlippedCard('computer', flippedCard, () => endComputerTurn(Game.fieldCards.length === 0));
                } else {
                    endComputerTurn(Game.fieldCards.length === 0);
                }
            }, 500); // Delay for animation

            return; // Exit computerTurn after handling 4-card acquisition
        }
    }

    // 1. 따닥 찾기
    if (!playedCard) {
        for (const cardInHand of Game.computerHand) {
            const matchingCardsInField = Game.fieldCards.filter(c => c.month === cardInHand.month);
            if (matchingCardsInField.length === 2) {
                playedCard = cardInHand;
                // 컴퓨터는 자동으로 최적의 패를 선택
                matchingCardsInField.sort((a, b) => getCardValue(b) - getCardValue(a));
                targetFieldCard = matchingCardsInField[0];
                UI.updateStatusMessage(`컴퓨터 ${cardInHand.month}월 따닥!`);
                break;
            }
        }
    }

    // 2. 점수 나는 패 찾기
    if (!playedCard) {
        let bestMove = { card: null, fieldCard: null, score: -1 };
        for (const cardInHand of Game.computerHand) {
            const matchingCardsInField = Game.fieldCards.filter(c => c.month === cardInHand.month);
            if (matchingCardsInField.length > 0) {
                for (const fieldCard of matchingCardsInField) {
                    const tempAcquired = [...Game.computerAcquired, cardInHand, fieldCard];
                    const scoreInfo = Game.calculateScore(tempAcquired);
                    if (scoreInfo.score > bestMove.score) {
                        bestMove = { card: cardInHand, fieldCard: fieldCard, score: scoreInfo.score };
                    }
                }
            }
        }
        if (bestMove.card) {
            playedCard = bestMove.card;
            targetFieldCard = bestMove.fieldCard;
        }
    }

    // 3. 없으면 그냥 내기
    let playedToField = false;
    if (!playedCard) {
        playedCard = Game.computerHand[Math.floor(Math.random() * Game.computerHand.length)];
        playedToField = true;
    }

    // 컴퓨터 패는 보이지 않으므로, 애니메이션 시작점은 임의의 위치로 설정하거나 생략
    const computerHandCardDiv = UI.computerHandDiv.querySelector('.card');
    const startElement = computerHandCardDiv || document.createElement('div'); // 폴백 요소

    const performComputerTurnLogic = () => {
        Game.setComputerHand(Game.computerHand.filter(c => c.id !== playedCard.id));
        // 컴퓨터가 낸 카드를 바로 획득하지 않고, handleFlippedCard에서 처리하도록 변경
        updateFullBoard(); // UI 업데이트를 위해 호출 (필요시)

        setTimeout(() => {
            const flippedCard = Game.deck.pop();
            console.log("Computer flips:", flippedCard ? `${flippedCard.month}월 ${flippedCard.type}`: "(no card)");
            UI.displayFlippedCard(flippedCard);

            // 뒤집은 카드 처리 (쪽, 따닥, 뻑, 일반 획득 등 모든 로직을 handleFlippedCard에서 처리)
            // playedToField 인자를 추가하여 handleFlippedCard에서 낸 카드를 바닥에 놓을지 결정
            handleFlippedCard('computer', flippedCard, () => endComputerTurn(Game.fieldCards.length === 0), playedCard, targetFieldCard, playedToField);

        }, 500); // 뒤집는 카드 애니메이션을 위한 딜레이
    };

    // 애니메이션 실행
    if (targetFieldCard) {
        const targetElement = UI.fieldDiv.querySelector(`[data-id='${targetFieldCard.id}']`);
        UI.animateCardMove(startElement, targetElement, performComputerTurnLogic);
    } else if (playedToField) {
        // 낼 패가 없을 때 (그냥 판에 놓는 경우) 애니메이션 없이 바로 로직 실행
        performComputerTurnLogic();
    } else { // 3장 먹는 경우 (이미 위에서 처리되었을 수 있음)
        performComputerTurnLogic();
    }
}

// 컴퓨터 턴 종료
export function endComputerTurn(isSsakSseuri = false) {
    if (isSsakSseuri) {
        UI.updateStatusMessage("컴퓨터 싹쓸이!");
        if(Game.takePiFromOpponent('computer')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
    }
    Game.updateComputerScore();
    updateFullBoard();

    // 플레이어의 추가 뒤집기 기회 처리
    if (Game.extraFlipOwner === 'player' && Game.getExtraFlipsRemaining() > 0) {
        UI.updateStatusMessage(`추가 뒤집기 ${Game.getExtraFlipsRemaining()}회 남음. 패를 내거나 패 더미를 클릭하세요.`);
        UI.deckDiv.addEventListener('click', handleDeckClick); // 패 더미 클릭 이벤트 리스너 추가
    } else {
        UI.updateStatusMessage("플레이어 턴입니다.");
    }

    setTimeout(() => {
        UI.displayFlippedCard(null);
        checkGameOver();
    }, 1000);
}
