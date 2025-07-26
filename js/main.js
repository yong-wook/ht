import { CARDS, SHOWTIME_RESPIN_COST } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';
import * as Stage from './stage.js';
import * as Roulette from './roulette.js';
import * as Showtime from './showtime.js';
import * as ShowtimeCardSelect from './showtime_card_select.js';

const startScreen = document.getElementById('start-screen');
const titleImage = document.getElementById('title-image'); // titleImage 참조 추가
const stageSelectionContainer = document.getElementById('stage-selection');
const gameContainer = document.getElementById('game-container');
const openingCrawl = document.getElementById('opening-crawl');
const skipButton = document.getElementById('skip-button');

let currentRouletteReward = null; // 현재 룰렛 보상 효과
let hasUsedExtraFlipThisTurn = false; // 현재 턴에 추가 뒤집기를 사용했는지 여부

// --- 카드 가치 계산 헬퍼 함수 ---
function getCardValue(card) {
    if (!card) return 0;
    switch (card.type) {
        case 'gwang': return 100; // 광이 가장 높은 가치
        case 'ggot': return 10;
        case 'tti': return 5;
        case 'ssangpi': return 2;
        case 'pi': return 1;
        default: return 0;
    }
}

// --- 게임 시작 ---
function startGame(stage) {
    stageSelectionContainer.style.display = 'none';
    gameContainer.style.display = 'block';
    
    Game.setInitialMoney(stage.initialMoney);
    UI.updateMoneyDisplay(Game.playerMoney, Game.computerMoney);

    initGame();
}

// --- 게임 초기화 ---
function initGame() {
    UI.showGoStopButtons(false);
    Game.dealCards(CARDS);
    hasUsedExtraFlipThisTurn = false; // 매 라운드 시작 시 초기화

    // 룰렛 보상 적용 (이전 라운드에서 획득한 보상이 있다면)
    if (currentRouletteReward) {
        applyRouletteReward(currentRouletteReward);
        currentRouletteReward = null; // 보상 적용 후 초기화
    }

    // 총통 확인
    if (checkChongtong()) {
        return; // 총통으로 게임 즉시 종료
    }

    // 흔들기 확인
    const shakeMonth = Game.playerHand.find(card => 
        Game.playerHand.filter(c => c.month === card.month).length >= 3
    );
    if (shakeMonth) {
       const wantsToShake = confirm(`${shakeMonth.month}월 패 3장으로 흔드시겠습니까?`);
       if (wantsToShake) {
           Game.incrementPlayerShake();
           UI.updateStatusMessage(`${shakeMonth.month}월 흔들기! 점수 2배!`);
       }
    }

    updateFullBoard();
    
    // 추가 뒤집기 기회 확인 및 안내
    if (Game.extraFlipOwner === 'player' && Game.getExtraFlipsRemaining() > 0) {
        UI.updateStatusMessage(`추가 뒤집기 ${Game.getExtraFlipsRemaining()}회 남음. 패를 내거나 패 더미를 클릭하세요.`);
        UI.deckDiv.addEventListener('click', handleDeckClick);
    } else {
        UI.updateStatusMessage("플레이어 턴입니다.");
    }
}

// --- 룰렛 보상 적용 ---
function applyRouletteReward(reward) {
    switch (reward.effect.type) {
        case "multiplier":
            Game.setRouletteBonus("multiplier", reward.effect.value);
            UI.updateStatusMessage(`룰렛 보상: ${reward.name} (이번 라운드 점수 ${reward.effect.value}배)`);
            break;
        case "addSsangpi":
            // 쌍피 카드 추가 로직 (임시 카드 ID 사용)
            const ssangpiCard = { id: 999, month: 0, type: "ssangpi", value: 2, img: "images/11_ssangpi.jpg" };
            Game.playerAcquired.push(ssangpiCard);
            UI.updateStatusMessage(`룰렛 보상: ${reward.name} (쌍피 1장 획득)`);
            break;
        case "addGwang":
            // 광 카드 추가 로직 (임시 카드 ID 사용)
            const gwangCard = { id: 998, month: 0, type: "gwang", value: 20, img: "images/01_gwang.jpg" };
            Game.playerAcquired.push(gwangCard);
            UI.updateStatusMessage(`룰렛 보상: ${reward.name} (광 1장 획득)`);
            break;
        case "nextRoundScoreX2":
            Game.setRouletteBonus("nextRoundScoreX2", reward.effect.value);
            UI.updateStatusMessage(`룰렛 보상: ${reward.name} (이번 라운드 승리 시 점수 ${reward.effect.value}배)`);
            break;
        case "none":
            UI.updateStatusMessage(`룰렛 보상: ${reward.name} (아무 효과 없음)`);
            break;
    }
    updateFullBoard();
}

// --- 보드 전체 업데이트 ---
function updateFullBoard() {
    const gameState = {
        playerHand: Game.playerHand,
        computerHand: Game.computerHand,
        fieldCards: Game.fieldCards,
        tiedCards: Game.tiedCards,
        deck: Game.deck,
        playerAcquired: Game.playerAcquired,
        computerAcquired: Game.computerAcquired,
        playerScore: Game.playerScore,
        computerScore: Game.computerScore,
        playerMoney: Game.playerMoney,
        computerMoney: Game.computerMoney
    };
    UI.updateBoard(gameState, playerPlay);
}

// --- 총통 확인 ---
function checkChongtong() {
    const checkHand = (hand, playerName) => {
        const monthCounts = {};
        for (const card of hand) {
            monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
        }

        for (const month in monthCounts) {
            if (monthCounts[month] === 4) {
                updateFullBoard();
                const score = 5; // 총통 점수
                let winner = '';
                if (playerName === '플레이어') {
                    Game.setPlayerScore(Game.playerScore + score);
                    winner = 'player';
                } else {
                    Game.setComputerScore(Game.computerScore + score);
                    winner = 'computer';
                }
                const moneyWon = Game.calculateMoney(winner, score);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
                Game.saveGameData(); // 데이터 저장
                alert(`${playerName} 총통! ${month}월 패 4장으로 승리! (+${score}점, +${moneyWon.toLocaleString()}원)`);
                updateFullBoard();
                handleGameEnd(); // 총통 발생 시 게임 종료 처리
                return true;
            }
        }
        return false;
    };

    if (checkHand(Game.playerHand, "플레이어")) return true;
    if (checkHand(Game.computerHand, "컴퓨터")) return true;
    return false;
}


function handleDeckClick() {
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

// --- 플레이어 턴 로직 ---
function playerPlay(selectedCard, selectedCardDiv) {
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

// 뒤집은 카드 처리
function handleFlippedCard(turn, flippedCard, callback, playedCard, initialTargetFieldCard, playedToField) { // playedToField 인자 추가
    console.log(`--- Handling Flipped Card for ${turn} ---`);
    console.log("Flipped Card:", flippedCard ? `${flippedCard.month}월 ${flippedCard.type}` : "(none)");
    console.log("Field Before:", Game.fieldCards.map(c => `${c.month}월 ${c.type}`), `(${Game.fieldCards.length}장)`);
    console.log("Acquired Before:", turn === 'player' ? Game.playerAcquired.map(c => `${c.month}월 ${c.type}`) : Game.computerAcquired.map(c => `${c.month}월 ${c.type}`));

    const flippedCardDiv = UI.flippedCardContainerDiv.querySelector(`[data-id='${flippedCard.id}']`);
    let matchingField = Game.fieldCards.filter(c => c.month === flippedCard.month); // let으로 변경

    // 컴퓨터 턴일 경우, 낸 카드와 뒤집은 카드의 관계를 여기서 처리
    if (turn === 'computer') {
        // 뻑 (낸 카드, 바닥 카드, 뒤집은 카드가 모두 같은 월일 때) 
        if (playedCard && initialTargetFieldCard && flippedCard &&
            playedCard.month === flippedCard.month && flippedCard.month ===
            initialTargetFieldCard.month) {
            UI.updateStatusMessage("컴퓨터 뻑!");
            const bbeokGroup = [playedCard, initialTargetFieldCard, flippedCard];
            Game.setTiedCards([...Game.tiedCards, bbeokGroup]);
            // 컴퓨터가 이전에 획득했던 카드들을 획득 패에서 제거
            Game.setComputerAcquired(Game.computerAcquired.filter(c =>
                c.id !== playedCard.id && c.id !== initialTargetFieldCard.id
            ));
            // initialTargetFieldCard는 이미 fieldCards에서 제거되었어야 함 (acquireCards 호출 시)
            updateFullBoard();
            if (callback) callback();
            return; // 뻑 처리 후 함수 종료
        }

        // 컴퓨터가 낸 카드와 바닥 카드의 초기 매칭 획득 (뻑이 아닌 경우)
        // 'playedToField'가 false인 경우 (즉, 낸 카드가 바닥 카드와 매칭된 경우)에만 해당
        if (!playedToField && playedCard && initialTargetFieldCard && playedCard.month === initialTargetFieldCard.month) {
            Game.acquireCards('computer', playedCard, initialTargetFieldCard);
        }
                        
        // 쪽 (낸 카드와 뒤집은 카드가 같은 월일 때)
        if (playedCard && flippedCard && playedCard.month === flippedCard.month &&
            playedToField) { // playedToField가 true여야 쪽
            UI.updateStatusMessage("컴퓨터 쪽!");
            const playedCardDivOnField = UI.fieldDiv.querySelector(`[data-id='${playedCard.id}']`);
            UI.animateCardMove(flippedCardDiv, playedCardDivOnField, () => {
                Game.acquireCards('computer', playedCard, flippedCard);
                Game.setFieldCards(Game.fieldCards.filter(c => c.id !== playedCard.id)); // 바닥에서 낸 카드 제거
                if (Game.takePiFromOpponent('computer')) {
                    UI.updateStatusMessage(UI.statusMessage.textContent + " 상대방의 피를 1장 가져옵니다.");
                }
                if (callback) callback();
            });
            return;
        }
        // 따닥 (낸 카드와 바닥 카드 2장, 뒤집은 카드와 남은 바닥 카드 1장이 같은 월일 때)
        // 이 로직은 playerPlay에서 처리되므로, 여기서는 flippedCard가 바닥의 남은 카드와 짝이 맞는지 확인di 
        /*
        if (initialTargetFieldCard && flippedCard && flippedCard.month === initialTargetFieldCard.month) {
            UI.updateStatusMessage(`${playedCard.month}월 따닥! (뒤집은 패 포함)`);
            const targetFieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${initialTargetFieldCard.id}']`);
            UI.animateCardMove(flippedCardDiv, targetFieldCardDiv, () => {
                Game.acquireCards('computer', flippedCard); // 뒤집은 카드만 획득
                // initialTargetFieldCard는 이미 컴퓨터가 손패를 낼 때 획득했으므로 다시 획득하지 않음
                // fieldCards에서도 이미 제거되었어야 함
                if(Game.takePiFromOpponent('computer')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
                if (callback) callback();
            });
            return;
        }
        */
    }



    // 뻑 (플레이어가 낸 카드와 뒤집은 카드가 같은 월이고, 바닥에 이미 1장이 깔려있을 때)
    if (turn === 'player' && playedCard && playedCard.month === flippedCard.month && matchingField.length === 1) {
        UI.updateStatusMessage("뻑!");
        const bbeokGroup = [playedCard, flippedCard, matchingField[0]];
        Game.setTiedCards([...Game.tiedCards, bbeokGroup]); // 묶인 카드로 추가
        Game.setFieldCards(Game.fieldCards.filter(c => c.id !== matchingField[0].id)); // 바닥에서 제거
        // 플레이어가 먹었던 카드를 다시 뱉어내야 함
        Game.playerAcquired = Game.playerAcquired.filter(c => c.id !== playedCard.id && c.id !== matchingField[0].id);
        updateFullBoard();
        if (callback) callback();
        return;
    }

    // 컴퓨터 턴의 뻑 (낸 카드, 바닥 카드, 뒤집은 카드가 모두 같은 월일 때)
    if (turn === 'computer' && playedCard && initialTargetFieldCard && flippedCard &&
        playedCard.month === flippedCard.month && flippedCard.month === initialTargetFieldCard.month) {

        UI.updateStatusMessage("컴퓨터 뻑!");
        const bbeokGroup = [playedCard, initialTargetFieldCard, flippedCard];
        Game.setTiedCards([...Game.tiedCards, bbeokGroup]);

        // 컴퓨터가 이전에 획득했던 카드들을 획득 패에서 제거
        Game.computerAcquired = Game.computerAcquired.filter(c =>
            c.id !== playedCard.id && c.id !== initialTargetFieldCard.id
        );
        // initialTargetFieldCard는 이미 컴퓨터가 손패를 낼 때 획득했으므로 다시 획득하지 않음
        // fieldCards에서도 이미 제거되었어야 함

        updateFullBoard();
        if (callback) callback();
        return; // 뻑 처리 후 함수 종료
    }

    const processFlippedCard = (fieldCard) => {
        const fieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${fieldCard.id}']`);
        UI.animateCardMove(flippedCardDiv, fieldCardDiv, () => {
            Game.acquireCards(turn, flippedCard, fieldCard);
            if (callback) callback();
        });
    };

    // 뻑 해제 로직
    const bbeokGroupToTake = Game.tiedCards.find(group => group[0].month === flippedCard.month);
    if (bbeokGroupToTake) {
        const bbeokCardElements = bbeokGroupToTake.map(c => UI.fieldDiv.querySelector(`[data-id='${c.id}']`));
        UI.animateCardMove(flippedCardDiv, bbeokCardElements[0], () => {
            UI.updateStatusMessage(`${flippedCard.month}월 뻑 패를 가져갑니다!`);
            Game.acquireCards(turn, flippedCard, ...bbeokGroupToTake);
            Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== flippedCard.month));
            if (Game.takePiFromOpponent(turn)) {
                UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
            }
            if (callback) callback();
        });
        return false;
    }

    if (matchingField.length === 1) {
        processFlippedCard(matchingField[0]);
    } else if (matchingField.length === 2) {
        if (turn === 'player') {
            UI.promptCardSelection(matchingField, (chosenCard) => {
                processFlippedCard(chosenCard);
            });
            return true; // 플레이어 선택이 필요함을 알림
        } else {
            matchingField.sort((a, b) => getCardValue(b) - getCardValue(a));
            processFlippedCard(matchingField[0]);
        }
    } else if (matchingField.length === 3) {
        const fieldCardDiv = UI.fieldDiv.querySelector(`[data-id='${matchingField[0].id}']`);
        UI.animateCardMove(flippedCardDiv, fieldCardDiv, () => {
            UI.updateStatusMessage(`${flippedCard.month}월 4장 한번에 획득!`);
            Game.acquireCards(turn, flippedCard, ...matchingField);
            if (callback) callback();
        });
    } else { // 짝이 없을 때
        if (flippedCard) { // flippedCard가 null이 아닐 때만 바닥에 추가
            Game.fieldCards.push(flippedCard);
        }
        if (callback) callback();
    }
    return false;
}

// 플레이어 턴 종료
function endPlayerTurn(isSsakSseuri = false) {
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

// 플레이어 폭탄 처리
function handlePlayerBomb(bombSet, fieldCard) { // fieldCard는 이제 단일 카드
    UI.updateStatusMessage(`${bombSet[0].month}월 폭탄!`);

    // 1. 폭탄 카드들 획득
    Game.acquireCards('player', ...bombSet, fieldCard);
    Game.setPlayerHand(Game.playerHand.filter(c => c.month !== bombSet[0].month));

    // 2. 폭탄 보너스 적용
    Game.incrementPlayerBomb();
    Game.setExtraFlips(2); // 추가 뒤집기 2회 부여
    Game.setExtraFlipOwner('player');

    // 3. 상대 피 1장 가져오기 (의도된 기능)
    if (Game.takePiFromOpponent('player')) {
        UI.updateStatusMessage(UI.statusMessage.textContent + " 상대에게서 피 1장을 가져옵니다!");
    }

    // 4. 해당 턴의 기본 뒤집기 실행
    const flippedCard = Game.deck.pop();
    UI.displayFlippedCard(flippedCard);
    if (flippedCard) {
        handleFlippedCard('player', flippedCard);
    }

    // 5. 턴 종료
    endPlayerTurn(Game.fieldCards.length === 0);
}

// --- 컴퓨터 턴 로직 ---
function computerTurn() {
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
            break;
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
function endComputerTurn(isSsakSseuri = false) {
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

// --- 게임 종료 처리 (쇼타임 또는 다음 라운드) ---
function handleGameEnd() {
    // 컴퓨터 판돈이 0 이하가 되면 쇼타임
    if (Game.computerMoney <= 0) {
        gameContainer.style.display = 'none';
        // 쇼타임 룰렛 아이템 준비
        const stage = Stage.getSelectedStage();
        const showtimeImages = [];
        for (let i = 1; i <= 12; i++) {
            showtimeImages.push({
                name: `배경 ${i}`, // 룰렛에 표시될 이름
                id: i, // 배경 식별자
                imagePath: `images/stages/stage${stage.id}/showtime_bg_stage${stage.id}_${String(i).padStart(2, '0')}.jpg`
            });
        }

        // 해금 로직을 포함한 콜백
        const onShowtimeCardSelectComplete = (selectedImage) => {
            // 1. 배경 해금 정보 저장
            const stageId = stage.id.toString();
            const bgId = selectedImage.id;
            if (!Game.unlockedBackgrounds[stageId]) {
                Game.unlockedBackgrounds[stageId] = [];
            }
            if (!Game.unlockedBackgrounds[stageId].includes(bgId)) {
                Game.unlockedBackgrounds[stageId].push(bgId);
                Game.saveGameData(); // 변경된 데이터 저장
            }

            // 2. 쇼타임 화면 표시
            Showtime.showShowtime(() => {
                Showtime.hideShowtime();
                stageSelectionContainer.style.display = 'block';
            }, stage, selectedImage.imagePath, () => respinShowtime(stage, showtimeImages));
        };
        
        // 쇼타임 룰렛을 다시 돌리는 콜백 함수 정의
        const respinShowtime = (currentStage, currentShowtimeImages) => {
            if (!Game.deductPlayerMoney(SHOWTIME_RESPIN_COST)) {
                alert(`재화가 부족합니다! (필요: ${SHOWTIME_RESPIN_COST.toLocaleString()}원)`);
                return;
            }
            UI.updateMoneyDisplay(Game.playerMoney, Game.computerMoney);
            Showtime.hideShowtime();
            ShowtimeCardSelect.showCardSelection(currentShowtimeImages, onShowtimeCardSelectComplete);
        };

        ShowtimeCardSelect.showCardSelection(showtimeImages, onShowtimeCardSelectComplete);

    } else if (Game.playerMoney <= 0) {
        // 플레이어 파산 처리
        gameContainer.style.display = 'none';
        alert("파산했습니다... 게임 오버!");
        // 여기에 게임 오버 관련 특별 화면이나 로직 추가 가능
        startScreen.style.display = 'block'; // 예시: 시작 화면으로 돌아가기
        location.reload(); // 간단하게 새로고침으로 초기화
    } else {
        // 판돈이 남아있으면 다음 라운드 시작
        initGame();
    }
}

function handleGo() {
    Game.incrementPlayerGo();
    UI.updateStatusMessage(`플레이어 ${Game.playerGoCount}고! 컴퓨터 턴입니다.`);
    UI.showGoStopButtons(false);
    setTimeout(computerTurn, 1000);
}

function handleStop() {
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

        // 고 점수
        if (Game.playerGoCount > 0) {
            if (Game.playerGoCount === 1) {
                finalPlayerScore += 1;
                breakdown.push(`1고 (+1점)`);
            } else if (Game.playerGoCount === 2) {
                finalPlayerScore += 2;
                breakdown.push(`2고 (+2점)`);
            } else {
                const goMultiplier = Math.pow(2, Game.playerGoCount - 2);
                finalPlayerScore *= goMultiplier;
                breakdown.push(`${Game.playerGoCount}고 (x${goMultiplier})`);
            }
        }
        // 피박, 광박, 고박
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
        // 흔들기/폭탄
        const shakeAndBombMultiplier = Math.pow(2, Game.playerShakeCount + Game.playerBombCount);
        if (shakeAndBombMultiplier > 1) {
            finalPlayerScore *= shakeAndBombMultiplier;
            if (Game.playerShakeCount > 0) breakdown.push(`흔들기 (x${Math.pow(2, Game.playerShakeCount)})`);
            if (Game.playerBombCount > 0) breakdown.push(`폭탄 (x${Math.pow(2, Game.playerBombCount)})`);
        }

        // 룰렛 보너스: 승리 시 점수 배율 적용
        if (Game.currentRoundWinMultiplier > 1) {
            finalPlayerScore *= Game.currentRoundWinMultiplier;
            breakdown.push(`승리 보너스 (x${Game.currentRoundWinMultiplier})`);
        }

        moneyWon = Game.calculateMoney('player', finalPlayerScore);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData(); // 데이터 저장
        UI.showResultModal('player', finalPlayerScore, moneyWon, breakdown);

        // 컴퓨터 판돈이 0이 아니고, 플레이어가 이겼을 때 룰렛 표시
        if (Game.computerMoney > 0) {
            Roulette.showRoulette((reward) => {
                currentRouletteReward = reward;
                Roulette.hideRoulette();
                handleGameEnd(); // 룰렛 끝나면 게임 종료 처리 (판돈 확인)
            });
        } else {
            handleGameEnd(); // 컴퓨터 판돈 0이면 바로 쇼타임
        }

    } else if (finalComputerScore > finalPlayerScore) {
        winner = 'computer';
        breakdown = computerResult.breakdown;
        // 피박, 광박
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
        Game.saveGameData(); // 데이터 저장
        UI.showResultModal('computer', finalComputerScore, moneyWon, breakdown);
        handleGameEnd();

    } else {
        UI.showResultModal('draw', 0, 0, ['무승부!']);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData(); // 데이터 저장
        handleGameEnd();
    }

    updateFullBoard();
}

function checkGameOver() {
    if (Game.deck.length === 0 || Game.playerHand.length === 0 || Game.computerHand.length === 0) {
        alert("게임 종료! 더 이상 낼 패가 없습니다. 점수를 계산합니다.");
        handleStop(); // 스톱과 동일한 효과
    }
}

// --- 이벤트 리스너 ---
UI.goButton.addEventListener('click', handleGo);
UI.stopButton.addEventListener('click', handleStop);

// --- 애플리케이션 시작 ---
function initializeApp() {
    Game.loadGameData();
    UI.updateTotalMoneyDisplay(Game.playerMoney); // 소지금 표시
    titleImage.addEventListener('click', () => { // startGameButton 대신 titleImage 클릭 이벤트
        // 전체 화면 요청
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
            document.documentElement.msRequestFullscreen();
        }

        startScreen.style.display = 'none';
        openingCrawl.style.display = 'flex'; // 오프닝 크롤 표시

        const crawlText = openingCrawl.querySelector('.crawl-text');
        // 애니메이션이 끝나면 스테이지 선택 화면으로 전환
        crawlText.addEventListener('animationend', () => {
            openingCrawl.style.display = 'none';
            stageSelectionContainer.style.display = 'block';
            Stage.initStageSelection(startGame);
        });

        // 스킵 버튼 이벤트 리스너
        skipButton.addEventListener('click', () => {
            // 애니메이션 즉시 종료 및 스테이지 선택 화면으로 전환
            crawlText.style.animationPlayState = 'paused'; // 애니메이션 일시 정지
            openingCrawl.style.display = 'none';
            stageSelectionContainer.style.display = 'block';
            Stage.initStageSelection(startGame);
        });
    });
}

initializeApp();

// 치트키: 숫자패드 + 키를 누르면 쇼타임 발동
document.addEventListener('keydown', (event) => {
    console.log('Key pressed:', event.key);
    if (event.key === '+' || event.key === 'NumpadAdd') {
        console.log('치트키 발동: 쇼타임 강제 실행');
        Game.setComputerMoney(0); // 컴퓨터 판돈을 0으로 설정
        handleGameEnd(); // 게임 종료 처리 함수 호출
    }
});