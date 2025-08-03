
import * as Game from './game.js';
import * as UI from './ui.js';
import { endPlayerTurn, computerTurn } from './turn_manager.js';
import { updateFullBoard, handleGameEnd } from './main.js';
import * as Roulette from './roulette.js';

// --- 카드 가치 계산 헬퍼 함수 ---
export function getCardValue(card) {
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

// --- 총통 확인 ---
export function checkChongtong() {
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

// 뒤집은 카드 처리
export function handleFlippedCard(turn, flippedCard, callback, playedCard, targetFieldCard, playedToField) { // playedToField 인자 추가
    console.log(`--- Handling Flipped Card for ${turn} ---`);
    console.log("Flipped Card:", flippedCard ? `${flippedCard.month}월 ${flippedCard.type}` : "(none)");
    console.log("Field Before:", Game.fieldCards.map(c => `${c.month}월 ${c.type}`), `(${Game.fieldCards.length}장)`);
    console.log("Acquired Before:", turn === 'player' ? Game.playerAcquired.map(c => `${c.month}월 ${c.type}`) : Game.computerAcquired.map(c => `${c.month}월 ${c.type}`));

    const flippedCardDiv = UI.flippedCardContainerDiv.querySelector(`[data-id='${flippedCard.id}']`);
    let matchingField = Game.fieldCards.filter(c => c.month === flippedCard.month); // let으로 변경

    // 컴퓨터 턴일 경우, 낸 카드와 뒤집은 카드의 관계를 여기서 처리
    if (turn === 'computer') {
        // 뻑 (낸 카드, 바닥 카드, 뒤집은 카드가 모두 같은 월일 때) 
        if (playedCard && targetFieldCard && flippedCard &&
            playedCard.month === flippedCard.month && flippedCard.month ===
            targetFieldCard.month) {
            UI.updateStatusMessage("컴퓨터 뻑!");
            const bbeokGroup = [playedCard, targetFieldCard, flippedCard];
            // Game.acquireCards('computer', ...bbeokGroup); // 뻑일 때는 획득하지 않음
            Game.setTiedCards([...Game.tiedCards, bbeokGroup]); // 묶인 카드로 추가
            Game.setFieldCards(Game.fieldCards.filter(c => c.id !== targetFieldCard.id)); // 바닥에서 제거
            updateFullBoard();
            if (callback) callback();
            return; // 뻑 처리 후 함수 종료
        }

        // 컴퓨터가 낸 카드와 바닥 카드의 초기 매칭 획득 (뻑이 아닌 경우)
        // 'playedToField'가 false인 경우 (즉, 낸 카드가 바닥 카드와 매칭된 경우)에만 해당
        if (!playedToField && playedCard && targetFieldCard && playedCard.month === targetFieldCard.month) {
            Game.acquireCards('computer', playedCard, targetFieldCard);
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

// 플레이어 폭탄 처리
export function handlePlayerBomb(bombSet, fieldCard) { // fieldCard는 이제 단일 카드
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

    // 족보 달성 알림 (게임 중)
    if (playerResult.combos && playerResult.combos.length > 0) {
        playerResult.combos.forEach(combo => UI.showComboAchieved(combo));
    }

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
                Game.setCurrentRouletteReward(reward);
                Roulette.hideRoulette();
                handleGameEnd(); // 룰렛 끝나면 게임 종료 처리 (판돈 확인)
            });
        } else {
            handleGameEnd(); // 컴퓨터 판돈 0이면 바로 쇼타임
        }

    } else if (finalComputerScore > finalPlayerScore) {
        winner = 'computer';
        breakdown = computerResult.breakdown;

        // 족보 달성 알림 (게임 중)
        if (computerResult.combos && computerResult.combos.length > 0) {
            computerResult.combos.forEach(combo => UI.showComboAchieved(combo));
        }

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

export function checkGameOver() {
    if (Game.deck.length === 0 || Game.playerHand.length === 0 || Game.computerHand.length === 0) {
        alert("게임 종료! 더 이상 낼 패가 없습니다. 점수를 계산합니다.");
        handleStop(); // 스톱과 동일한 효과
    }
}
