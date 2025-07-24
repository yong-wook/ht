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
            handleFlippedCard('player', flippedCard);
        }
        Game.decrementExtraFlips();

        // 2. 이벤트 리스너 즉시 제거 (한 턴에 한 번만 사용 가능)
        UI.deckDiv.removeEventListener('click', handleDeckClick);

        // 3. 턴 종료
        endPlayerTurn(Game.fieldCards.length === 0);
    }
}

// --- 플레이어 턴 로직 ---
function playerPlay(selectedCard) {
    if (UI.goButton.style.display === 'inline-block') {
        UI.updateStatusMessage("'고' 또는 '스톱'을 선택해야 합니다.");
        return;
    }
    if (UI.fieldDiv.querySelector('.selectable')) return;

    // 뻑 해제 로직
    const bbeokGroupToRelease = Game.tiedCards.find(group => group[0].month === selectedCard.month);
    if (bbeokGroupToRelease) {
        Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));
        Game.acquireCards('player', selectedCard, ...bbeokGroupToRelease);
        Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== selectedCard.month)); // 해당 뻑 그룹 제거
        UI.updateStatusMessage(`${selectedCard.month}월 뻑 패를 가져갑니다!`);
        if (Game.takePiFromOpponent('player')) {
            UI.updateStatusMessage(UI.statusMessage.textContent + " 상대에게서 피 1장을 가져옵니다!");
        }

        const flippedCard = Game.deck.pop();
        UI.displayFlippedCard(flippedCard);
        if (flippedCard) {
            handleFlippedCard('player', flippedCard);
        }
        endPlayerTurn(Game.fieldCards.length === 0);
        return;
    }

    const cardsInHandSameMonth = Game.playerHand.filter(c => c.month === selectedCard.month);
    const matchingCardsInField = Game.fieldCards.filter(card => card.month === selectedCard.month);

    // 폭탄
    if (cardsInHandSameMonth.length === 3 && matchingCardsInField.length === 1) { // 바닥에 1장만 있을 때 폭탄
        const wantsToBomb = confirm(`${selectedCard.month}월 패 3장으로 폭탄하시겠습니까?`);
        if (wantsToBomb) {
            handlePlayerBomb(cardsInHandSameMonth, matchingCardsInField[0]); // 바닥 패 1장만 전달
            return; // 폭탄 처리 후 함수를 즉시 종료하여 아래 로직이 실행되지 않도록 함
        }
    }

    Game.setPlayerHand(Game.playerHand.filter((c) => c.id !== selectedCard.id));

    let isPlayerChoiceNeeded = false;
    let choiceNeededAfterFlip = false;
    if (matchingCardsInField.length === 1) {
        const flippedCard = Game.deck.pop();
        UI.displayFlippedCard(flippedCard);
        if (flippedCard && selectedCard.month === flippedCard.month) {
            UI.updateStatusMessage(`${selectedCard.month}월 뻑! 패가 묶였습니다.`);
            Game.setTiedCards([...Game.tiedCards, [selectedCard, matchingCardsInField[0], flippedCard]]);
            Game.setFieldCards(Game.fieldCards.filter(c => c.id !== matchingCardsInField[0].id));
        } else {
            Game.acquireCards('player', selectedCard, matchingCardsInField[0]);
            if (flippedCard) {
                choiceNeededAfterFlip = handleFlippedCard('player', flippedCard);
            }
        }
    } else if (matchingCardsInField.length === 2) { // 따닥 선택
        isPlayerChoiceNeeded = true;
        UI.promptCardSelection(matchingCardsInField, (chosenFieldCard) => {
            const remainingFieldCard = matchingCardsInField.find(c => c.id !== chosenFieldCard.id);

            Game.acquireCards('player', selectedCard, chosenFieldCard);
            Game.setFieldCards(Game.fieldCards.filter(c => c.id !== chosenFieldCard.id));

            const flippedCard = Game.deck.pop();
            UI.displayFlippedCard(flippedCard);

            if (flippedCard) {
                if (remainingFieldCard && flippedCard.month === remainingFieldCard.month) {
                    UI.updateStatusMessage(`${selectedCard.month}월 따닥! (뒤집은 패 포함)`);
                    Game.acquireCards('player', remainingFieldCard, flippedCard);
                    Game.setFieldCards(Game.fieldCards.filter(c => c.id !== remainingFieldCard.id));
                    if(Game.takePiFromOpponent('player')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
                } else {
                    handleFlippedCard('player', flippedCard);
                }
            }
            endPlayerTurn(Game.fieldCards.length === 0);
        });
    } else if (matchingCardsInField.length === 3) { // 바닥에 3장 깔린 경우
        UI.updateStatusMessage(`${selectedCard.month}월 4장 한번에 획득!`);
        Game.acquireCards('player', selectedCard, ...matchingCardsInField);
        
        const flippedCard = Game.deck.pop();
        UI.displayFlippedCard(flippedCard);
        if (flippedCard) {
            choiceNeededAfterFlip = handleFlippedCard('player', flippedCard);
        }
    } else { // 낼 패가 없을 때
        Game.fieldCards.push(selectedCard);
        const flippedCard = Game.deck.pop();
        UI.displayFlippedCard(flippedCard);
        if (flippedCard) {
            const isJjok = selectedCard.month === flippedCard.month;
            choiceNeededAfterFlip = handleFlippedCard('player', flippedCard);
            if (isJjok) {
                UI.updateStatusMessage("쪽!");
                if (Game.takePiFromOpponent('player')) {
                    UI.updateStatusMessage("쪽! 상대방의 피를 1장 가져옵니다.");
                }
            }
        }
    }

    if (!isPlayerChoiceNeeded && !choiceNeededAfterFlip) {
        endPlayerTurn(Game.fieldCards.length === 0);
    }
}

// 뒤집은 카드 처리
function handleFlippedCard(turn, flippedCard) {
    const bbeokGroupToTake = Game.tiedCards.find(group => group[0].month === flippedCard.month);

    if (bbeokGroupToTake) {
        UI.updateStatusMessage(`${flippedCard.month}월 뻑 패를 가져갑니다!`);
        Game.acquireCards(turn, flippedCard, ...bbeokGroupToTake);
        Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== flippedCard.month));
        if (Game.takePiFromOpponent(turn)) {
            UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
        }
        return false; // 뻑 처리 후 함수 종료, 선택 필요 없음
    }

    const matchingField = Game.fieldCards.filter(c => c.month === flippedCard.month);
    if (matchingField.length > 0) {
        // 뒤집은 패로 바닥의 3장을 먹는 경우
        if (matchingField.length === 3) {
            UI.updateStatusMessage(`${flippedCard.month}월 4장 한번에 획득!`);
            Game.acquireCards(turn, flippedCard, ...matchingField);
        } else if (matchingField.length === 2) { // 뒤집은 패로 바닥의 2장 중 하나를 선택해야 하는 경우
            if (turn === 'player') {
                UI.promptCardSelection(matchingField, (chosenCard) => {
                    Game.acquireCards(turn, flippedCard, chosenCard);
                    endPlayerTurn(Game.fieldCards.length === 0);
                });
                return true; // 플레이어 선택이 필요함을 알림
            } else { // 컴퓨터 턴
                matchingField.sort((a, b) => getCardValue(b) - getCardValue(a));
                Game.acquireCards(turn, flippedCard, matchingField[0]);
            }
        } else { // 매칭되는 카드가 하나일 때
            Game.acquireCards(turn, flippedCard, ...matchingField);
        }
    } else {
        Game.fieldCards.push(flippedCard);
    }
    return false; // 그 외의 경우는 선택 필요 없음
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
    if (Game.computerHand.length === 0) {
        checkGameOver();
        return;
    }

    let isSsakSseuri = false;

    // 뻑 해제
    if (Game.tiedCards.length > 0) {
        const cardToReleaseBbeok = Game.computerHand.find(handCard => 
            Game.tiedCards.some(group => group[0].month === handCard.month)
        );

        if (cardToReleaseBbeok) {
            const bbeokGroupToRelease = Game.tiedCards.find(group => group[0].month === cardToReleaseBbeok.month);

            UI.updateStatusMessage(`${cardToReleaseBbeok.month}월 뻑 패를 가져갑니다!`);
            Game.acquireCards('computer', cardToReleaseBbeok, ...bbeokGroupToRelease);
            if(Game.takePiFromOpponent('computer')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");

            Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== cardToReleaseBbeok.month));
            Game.setComputerHand(Game.computerHand.filter(c => c.id !== cardToReleaseBbeok.id));

            const flippedCard = Game.deck.pop();
            UI.displayFlippedCard(flippedCard);
            if (flippedCard) {
                handleFlippedCard('computer', flippedCard);
            }

            if (Game.fieldCards.length === 0) isSsakSseuri = true;
            endComputerTurn(isSsakSseuri);
            return;
        }
    }

    let playedCard = null;
    let chosenFieldCard = null;
    let remainingFieldCard = null;

    // 0. 바닥 3장 먹기 (최우선)
    for (const cardInHand of Game.computerHand) {
        const matchingCardsInField = Game.fieldCards.filter(c => c.month === cardInHand.month);
        if (matchingCardsInField.length === 3) {
            playedCard = cardInHand;
            UI.updateStatusMessage(`컴퓨터 ${cardInHand.month}월 4장 한번에 획득!`);
            Game.acquireCards('computer', playedCard, ...matchingCardsInField);
            break;
        }
    }

    // 1. 따닥 찾기 (기존 로직)
    if (!playedCard) {
        for (const cardInHand of Game.computerHand) {
            const matchingCardsInField = Game.fieldCards.filter(c => c.month === cardInHand.month);
            if (matchingCardsInField.length === 2) {
                playedCard = cardInHand;
                // 컴퓨터는 자동으로 최적의 패를 선택
                // 광 > 끗/띠 > 쌍피 > 피 순으로 우선순위
                if (getCardValue(matchingCardsInField[0]) > getCardValue(matchingCardsInField[1])) {
                    chosenFieldCard = matchingCardsInField[0];
                    remainingFieldCard = matchingCardsInField[1];
                } else {
                    chosenFieldCard = matchingCardsInField[1];
                    remainingFieldCard = matchingCardsInField[0];
                }
                
                UI.updateStatusMessage(`컴퓨터 ${cardInHand.month}월 따닥!`);
                Game.acquireCards('computer', playedCard, chosenFieldCard);
                break; // 따닥을 찾았으면 더 이상 탐색하지 않음
            }
        }
    }

    // 2. 따닥이 아니면 점수 나는 패 찾기 (기존 로직 유지)
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
            Game.acquireCards('computer', playedCard, bestMove.fieldCard);
        }
    }

    // 3. 없으면 그냥 내기 (기존 로직 유지)
    let playedToField = false; // 쪽 확인을 위한 플래그
    if (!playedCard) {
        playedCard = Game.computerHand[Math.floor(Math.random() * Game.computerHand.length)];
        Game.fieldCards.push(playedCard);
        playedToField = true;
    }
    
    if (playedCard) {
        Game.setComputerHand(Game.computerHand.filter(c => c.id !== playedCard.id));
    }

    const flippedCard = Game.deck.pop();
    UI.displayFlippedCard(flippedCard);

    if (flippedCard) {
        const matchingFieldForFlipped = Game.fieldCards.filter(c => c.month === flippedCard.month);
        const bbeokGroupToTake = Game.tiedCards.find(group => group[0].month === flippedCard.month);

        // 컴퓨터가 낸 패와 뒤집은 패가 같은 월이라서 '쪽'이 되는 경우 (가장 먼저 확인)
        if (playedToField && playedCard.month === flippedCard.month) {
            UI.updateStatusMessage("컴퓨터 쪽!");
            Game.acquireCards('computer', playedCard, flippedCard); // 낸 패와 뒤집은 패 모두 획득
            Game.setFieldCards(Game.fieldCards.filter(c => c.id !== playedCard.id)); // 바닥에서 제거
            if (Game.takePiFromOpponent('computer')) {
                UI.updateStatusMessage("컴퓨터 쪽! 상대방의 피를 1장 가져옵니다.");
            }
        } 
        // 기존에 있던 뻑을 먹는 경우
        else if (bbeokGroupToTake) {
            Game.acquireCards('computer', flippedCard, ...bbeokGroupToTake);
            Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== flippedCard.month));
            UI.updateStatusMessage(`${flippedCard.month}월 뻑 패를 가져갑니다!`);
            if(Game.takePiFromOpponent('computer')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
        } else if (remainingFieldCard && flippedCard.month === remainingFieldCard.month) { // 따닥 후 뒤집기
            UI.updateStatusMessage(`${playedCard.month}월 따닥! (뒤집은 패 포함)`);
            Game.acquireCards('computer', remainingFieldCard, flippedCard);
            Game.setFieldCards(Game.fieldCards.filter(c => c.id !== remainingFieldCard.id));
            if(Game.takePiFromOpponent('computer')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
        } else {
            handleFlippedCard('computer', flippedCard);
            if (playedToField && playedCard.month === flippedCard.month) {
                UI.updateStatusMessage("컴퓨터 쪽!");
                if (Game.takePiFromOpponent('computer')) {
                    UI.updateStatusMessage("컴퓨Tㅓ 쪽! 상대방의 피를 1장 가져옵니다.");
                }
            }
        }
    }

    if (Game.fieldCards.length === 0) isSsakSseuri = true;
    endComputerTurn(isSsakSseuri);
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
                console.log(`스테이지 ${stageId}의 배경 ${bgId} 해금!`, Game.unlockedBackgrounds);
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
