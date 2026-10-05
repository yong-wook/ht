
import * as Game from './game.js';
import * as UI from './ui.js';
import { findBestCardToPlay, getCardValue } from './game_logic.js';
import { handleDeckClick } from './event_handlers.js';
import { updateFullBoard, handleGameEnd } from './main.js';
import * as Roulette from './roulette.js';
import { audioManager, SFX } from './audio.js';


// --- 통합된 뒤집은 카드 처리 로직 ---
function handleFlippedCard(turn, playedCard) {
    const flippedCard = Game.deck.pop();
    UI.displayFlippedCard(flippedCard);
    if (flippedCard) audioManager.playSfx(SFX.CARD_FLIP);

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
        audioManager.playSfx(SFX.CARD_MATCH);
        const isSelfPpeok = (ppeokGroup.owner === turn);
        UI.updateStatusMessage(`${flippedCard.month}월 ${isSelfPpeok ? '자뻑' : '뻑'} 패를 가져갑니다!`);
        let piTakenCount = 0;
        if (Game.takePiFromOpponent(turn)) piTakenCount++;
        if (isSelfPpeok && Game.takePiFromOpponent(turn)) piTakenCount++;
        if (piTakenCount > 0) {
            UI.updateStatusMessage(UI.statusMessage.textContent + ` 상대 피 ${piTakenCount}장 가져옴!`);
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
        audioManager.playSfx(SFX.CARD_MATCH);
        if (Game.takePiFromOpponent(turn)) {
            UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
        }
        endTurn(turn);
        return; // 로직 종료
    }

    // playedCard가 바닥에 있는지 확인 (냈는데 못 먹어서 바닥에 간 경우)
    const isPlayedCardOnField = playedCard && Game.fieldCards.some(c => c.id === playedCard.id);

    // 3. 쪽 & 뻑 로직
    if (playedCard && playedCard.month === flippedCard.month) {
        if (isPlayedCardOnField) {
            // [쪽] 낸 카드가 바닥에 있고, 뒤집은 카드가 그것과 같음
            UI.updateStatusMessage("쪽!");
            audioManager.playSfx(SFX.JJOK);
            Game.acquireCards(turn, playedCard, flippedCard);
            if (Game.takePiFromOpponent(turn)) {
                UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
            }
            endTurn(turn);
            return;
        } else {
            // [뻑] 낸 카드로 먹었는데, 뒤집은 카드가 또 같음 (설사)
            UI.updateStatusMessage("뻑!");
            audioManager.playSfx(SFX.PPEOK);

            // 이번 턴에 획득한 카드만 뱉음 (lastAcquiredBatch 사용)
            // acquiredList 전체를 월로 필터하면 이전 턴 카드까지 뱉는 버그 발생
            const cardsToVomit = Game.lastAcquiredBatch.filter(c => c.month === flippedCard.month);
            const vomitIds = new Set(cardsToVomit.map(c => c.id));

            // 획득한 카드 목록에서 이번 턴 카드만 제거
            if (turn === 'player') {
                Game.setPlayerAcquired(Game.playerAcquired.filter(c => !vomitIds.has(c.id)));
            } else {
                Game.setComputerAcquired(Game.computerAcquired.filter(c => !vomitIds.has(c.id)));
            }

            // 뻑 패 그룹 생성 (뒤집은 카드 + 뱉어낸 카드들)
            const ppeokGroup = [flippedCard, ...cardsToVomit];
            ppeokGroup.owner = turn;
            Game.tiedCards.push(ppeokGroup);

            endTurn(turn);
            return;
        }
    }

    // 4. 따닥 로직 (플레이어가 먹고 남은 한 장과 뒤집은 패가 맞을 때)
    // 이 로직은 playerPlay/computerTurn 내에서 처리하거나, 여기서 좀 더 복잡한 상태 체크가 필요함.
    // 현재 구조에서는 playerPlay에서 따닥을 처리하고 있음.
    // 여기서는 일반적인 매칭만 처리.

    // 5. 일반 매칭 로직
    if (matchingFieldCards.length > 0) {
        let cardToTake = matchingFieldCards[0];
        if (matchingFieldCards.length > 1) {
            if (turn === 'player') {
                UI.promptCardSelection(matchingFieldCards, (chosenCard) => {
                    Game.acquireCards(turn, flippedCard, chosenCard);
                    audioManager.playSfx(SFX.CARD_MATCH);
                    endTurn(turn);
                });
                return;
            } else {
                matchingFieldCards.sort((a, b) => getCardValue(b) - getCardValue(a));
                cardToTake = matchingFieldCards[0];
            }
        }
        Game.acquireCards(turn, flippedCard, cardToTake);
        audioManager.playSfx(SFX.CARD_MATCH);
    } else {
        // 6. 아무것도 해당 안되면 그냥 바닥에 내려놓기
        Game.fieldCards.push(flippedCard);
    }

    endTurn(turn);
}


// --- 플레이어 턴 로직 ---
export function playerPlay(selectedCard, selectedCardDiv) {
    // 빈 뒤집기 카드 클릭 — 카드를 내지 않고 덱만 뒤집음
    if (selectedCard.type === 'bomb_flip') {
        Game.setPlayerHand(Game.playerHand.filter(c => c.id !== selectedCard.id));
        handleFlippedCard('player', null);
        return;
    }

    audioManager.playSfx(SFX.CARD_PLAY);
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
        const isSelfPpeok = (ppeokGroup.owner === 'player');
        UI.updateStatusMessage(`${selectedCard.month}월 ${isSelfPpeok ? '자뻑' : '뻑'} 패를 가져갑니다!`);
        let piTakenCount = 0;
        if (Game.takePiFromOpponent('player')) piTakenCount++;
        if (isSelfPpeok && Game.takePiFromOpponent('player')) piTakenCount++;
        if (piTakenCount > 0) {
            UI.updateStatusMessage(UI.statusMessage.textContent + ` 상대에게서 피 ${piTakenCount}장을 가져옵니다!`);
        }
        handleFlippedCard('player', null);
        return;
    }

    const matchingCardsInField = Game.fieldCards.filter(card => card.month === selectedCard.month);

    // 2. 폭탄 & 흔들기
    const cardsInHandSameMonth = Game.playerHand.filter(c => c.month === selectedCard.month);
    if (cardsInHandSameMonth.length === 3) {
        if (matchingCardsInField.length === 1) {
            // 폭탄
            UI.showModal(
                "폭탄",
                `${selectedCard.month}월 패 3장으로 폭탄하시겠습니까?`,
                () => { // onConfirm
                    handlePlayerBomb(cardsInHandSameMonth, matchingCardsInField[0]);
                },
                () => { // onCancel
                    proceedWithNormalPlay();
                }
            );
            return;
        } else if (matchingCardsInField.length === 0) {
            // 흔들기
            UI.showModal(
                "흔들기",
                `${selectedCard.month}월 패 3장으로 흔드시겠습니까?`,
                () => { // onConfirm
                    Game.incrementPlayerShake();
                    audioManager.playSfx(SFX.SHAKE);
                    UI.updateStatusMessage(`${selectedCard.month}월 흔들기! 점수 2배!`);
                    proceedWithNormalPlay();
                },
                () => { // onCancel
                    proceedWithNormalPlay();
                }
            );
            return;
        }
    }

    proceedWithNormalPlay();

    function proceedWithNormalPlay() {
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
                    if (Game.takePiFromOpponent('player')) {
                        UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
                    }
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
                    audioManager.playSfx(SFX.CARD_MATCH);
                    Game.acquireCards('player', flippedCard, remainingFieldCard);
                    if (Game.takePiFromOpponent('player')) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
                    endTurn('player');
                } else if (flippedCard) {
                    // 따닥 미완성: 이미 뽑은 카드를 덱 끝에 되돌려
                    // handleFlippedCard가 동일한 카드를 다시 처리하게 함.
                    // playedCard를 null로 전달해야 false 뻑이 발생하지 않음
                    // (selectedCard는 이미 획득 처리됐으므로 바닥에 없음)
                    Game.deck.push(flippedCard);
                    handleFlippedCard('player', null);
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
}

// --- 컴퓨터 턴 로직 ---
export function computerTurn() {
    UI.updateStatusMessage(`${Game.opponentName}의 턴입니다...`);

    setTimeout(() => {
        // bomb_flip 카드가 손패에 있고 먹을 패가 마땅치 않을 때 또는 낼 일반 패가 없을 때
        const bombFlipCard = Game.computerHand.find(c => c.type === 'bomb_flip');

        const { cardToPlay, matchingCard, reason } = findBestCardToPlay(Game.computerHand, Game.fieldCards, Game.tiedCards);
        console.log("컴퓨터 AI 결정:", reason);

        // 만약 먹을 패가 없고 bomb_flip 카드가 있다면 bomb_flip을 우선 사용
        if (!matchingCard && !reason.includes('폭탄') && !reason.includes('흔들기') && !reason.includes('뻑') && bombFlipCard) {
            Game.setComputerHand(Game.computerHand.filter(c => c.id !== bombFlipCard.id));
            UI.updateStatusMessage(`${Game.opponentName} 패 대신 덱을 뒤집습니다.`);
            setTimeout(() => {
                handleFlippedCard('computer', null);
            }, 500);
            return;
        }

        if (cardToPlay) {
            // 폭탄 처리
            if (reason.includes('폭탄')) {
                const bombSet = Game.computerHand.filter(c => c.month === cardToPlay.month);
                UI.updateStatusMessage(`${Game.opponentName} ${cardToPlay.month}월 폭탄!`);
                Game.acquireCards('computer', ...bombSet, matchingCard);
                Game.setComputerHand(Game.computerHand.filter(c => c.month !== cardToPlay.month));
                Game.incrementComputerBomb();
                // 컴퓨터 손패에 뒤집기 전용 카드 2장 추가
                Game.computerHand.push({ id: -101 - Date.now(), month: 0, type: 'bomb_flip', value: 0, img: '' });
                Game.computerHand.push({ id: -102 - Date.now(), month: 0, type: 'bomb_flip', value: 0, img: '' });
                if (Game.takePiFromOpponent('computer')) {
                    UI.updateStatusMessage(UI.statusMessage.textContent + ` ${Game.opponentName}이(가) 상대 피 1장 가져감!`);
                }
                setTimeout(() => {
                    handleFlippedCard('computer', null);
                }, 500);
                return;
            }

            // 흔들기 처리
            if (reason.includes('흔들기')) {
                UI.updateStatusMessage(`${Game.opponentName} ${cardToPlay.month}월 흔들기!`);
                Game.incrementComputerShake();
            }

            Game.setComputerHand(Game.computerHand.filter(c => c.id !== cardToPlay.id));

            if (reason.includes('뻑')) {
                const ppeokGroup = Game.tiedCards.find(group => group[0].month === cardToPlay.month);
                if (ppeokGroup) {
                    Game.acquireCards('computer', cardToPlay, ...ppeokGroup);
                    Game.setTiedCards(Game.tiedCards.filter(group => group[0].month !== cardToPlay.month));
                    const isSelfPpeok = (ppeokGroup.owner === 'computer');
                    let piTakenCount = 0;
                    if (Game.takePiFromOpponent('computer')) piTakenCount++;
                    if (isSelfPpeok && Game.takePiFromOpponent('computer')) piTakenCount++;
                    if (piTakenCount > 0) {
                        UI.updateStatusMessage(UI.statusMessage.textContent + ` ${Game.opponentName}이(가) ${isSelfPpeok ? '자뻑으로 ' : ''}상대 피 ${piTakenCount}장 가져감!`);
                    }
                }
            } else if (matchingCard) { // 일반 매칭
                // 바닥에 같은 월의 카드가 3장 있는지 확인 (4장 동시 획득)
                const sameMonthFieldCards = Game.fieldCards.filter(c => c.month === cardToPlay.month);

                if (sameMonthFieldCards.length === 3) {
                    Game.acquireCards('computer', cardToPlay, ...sameMonthFieldCards);
                    if (Game.takePiFromOpponent('computer')) {
                        UI.updateStatusMessage(UI.statusMessage.textContent + ` ${Game.opponentName}이(가) 상대 피 1장 가져감!`);
                    }
                } else {
                    Game.acquireCards('computer', cardToPlay, matchingCard);
                }
            } else { // 먹을 패가 없는 경우
                Game.fieldCards.push(cardToPlay);
            }

            updateFullBoard();

            setTimeout(() => {
                // 바닥에 내려놓았든 매칭했든 cardToPlay를 전달해야 쪽 판정 및 뻑 판정이 정상 동작함
                handleFlippedCard('computer', cardToPlay);
            }, 500);

        } else if (bombFlipCard) {
            Game.setComputerHand(Game.computerHand.filter(c => c.id !== bombFlipCard.id));
            UI.updateStatusMessage(`${Game.opponentName} 패 대신 덱을 뒤집습니다.`);
            setTimeout(() => {
                handleFlippedCard('computer', null);
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
        UI.updateStatusMessage(`${turn === 'player' ? '플레이어' : Game.opponentName} 싹쓸이!`);
        audioManager.playSfx(SFX.SSAK);
        if (Game.takePiFromOpponent(turn)) UI.updateStatusMessage(UI.statusMessage.textContent + " 상대 피 1장 가져옴!");
    }

    if (turn === 'player') {
        Game.updatePlayerScore();
        updateFullBoard();

        const currentScore = Game.playerScore;
        const canDeclareGoStop = (currentScore >= 3) && (
            Game.playerGoCount === 0 ? true : currentScore > Game.lastPlayerGoScore
        );

        if (canDeclareGoStop) {
            UI.showGoStopButtons(true);
            UI.updateStatusMessage(`${currentScore}점 달성! '고' 또는 '스톱'을 선택하세요.`);
        } else {
            setTimeout(() => {
                UI.displayFlippedCard(null);
                if (checkGameOver()) return;
                computerTurn();
            }, 1000);
        }
    } else { // computer turn
        Game.updateComputerScore();
        updateFullBoard();

        const currentScore = Game.computerScore;
        const canComputerGoStop = (currentScore >= 3) && (
            Game.computerGoCount === 0 ? true : currentScore > Game.lastComputerGoScore
        );

        if (canComputerGoStop) {
            // 컴퓨터의 고/스톱 판단 알고리즘
            // 1. 이미 1고 이상이면 추가 고 지양(안전하게 스톱)
            // 2. 플레이어 점수가 1점 이상 있거나 역전 위험이 있으면 스톱
            // 3. 덱이 4장 이하로 얼마 안 남았으면 스톱
            // 4. 점수가 6점 이상이면 안전하게 스톱
            // 5. 그 외(초반 3~5점, 플레이어 0점, 덱 6장 이상)에만 1고 시도
            const shouldGo = (
                Game.computerGoCount < 1 &&
                currentScore <= 5 &&
                Game.playerScore === 0 &&
                Game.deck.length >= 6
            );

            if (shouldGo) {
                Game.incrementComputerGo();
                Game.setLastComputerGoScore(currentScore);
                audioManager.playSfx(SFX.GO);
                UI.updateStatusMessage(`${Game.opponentName} ${Game.computerGoCount}고 선언!`);
                setTimeout(() => {
                    UI.displayFlippedCard(null);
                    if (checkGameOver()) return;
                    UI.updateStatusMessage("플레이어 턴입니다.");
                }, 1200);
                return;
            } else {
                audioManager.playSfx(SFX.STOP);
                UI.updateStatusMessage(`${Game.opponentName} 스톱 선언!`);
                setTimeout(() => {
                    handleStop();
                }, 1200);
                return;
            }
        }

        setTimeout(() => {
            UI.displayFlippedCard(null);
            if (checkGameOver()) return;
            UI.updateStatusMessage("플레이어 턴입니다.");
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
    audioManager.playSfx(SFX.GO);
    Game.incrementPlayerGo();
    Game.setLastPlayerGoScore(Game.playerScore);
    UI.updateStatusMessage(`플레이어 ${Game.playerGoCount}고! ${Game.opponentName}의 턴입니다.`);
    UI.showGoStopButtons(false);
    setTimeout(computerTurn, 1000);
}

export function handleStop() {
    // 스톱 버튼 즉시 숨기고 효과음 재생 → 딜레이 후 결과 표시
    UI.showGoStopButtons(false);
    audioManager.playSfx(SFX.STOP);

    setTimeout(() => {
        let playerResult = Game.calculateScore(Game.playerAcquired);
        let computerResult = Game.calculateScore(Game.computerAcquired);

        let finalPlayerScore = playerResult.score;
        let finalComputerScore = computerResult.score;
        let moneyWon = 0;
        let winner = '';
        let breakdown = [];

        if (finalPlayerScore > finalComputerScore) {
            winner = 'player';
            breakdown = [...playerResult.breakdown];

            if (Game.playerGoCount > 0) {
                if (Game.playerGoCount === 1) { finalPlayerScore += 1; breakdown.push(`1고 (+1점)`); }
                else if (Game.playerGoCount === 2) { finalPlayerScore += 2; breakdown.push(`2고 (+2점)`); }
                else {
                    const goMultiplier = Math.pow(2, Game.playerGoCount - 2);
                    finalPlayerScore *= goMultiplier;
                    breakdown.push(`${Game.playerGoCount}고 (x${goMultiplier})`);
                }
            }
            // 피박: 이긴 자가 피로 1점 이상 났을 때만 상대 피 5장 미만 시 적용
            const hasPlayerPiScore = playerResult.piScore > 0 || playerResult.breakdown.some(b => b.startsWith('피'));
            const computerPiCount = Game.computerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
            if (hasPlayerPiScore && computerPiCount < 5) {
                finalPlayerScore *= 2;
                breakdown.push(`피박 (x2)`);
            }
            // 광박: 이긴 자가 광으로 점수를 냈을 때만 상대 광 0장 시 적용
            if (playerResult.breakdown.some(b => b.startsWith('광')) && Game.computerAcquired.filter(c => c.type === 'gwang').length === 0) {
                finalPlayerScore *= 2;
                breakdown.push(`광박 (x2)`);
            }
            // 고박: 상대방(컴퓨터)이 고를 불렀는데 플레이어가 승리한 경우
            if (Game.computerGoCount > 0) {
                finalPlayerScore *= 2;
                breakdown.push(`상대 고박 (x2)`);
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
            audioManager.playSfx(SFX.WIN);
            setTimeout(() => audioManager.playSfx(SFX.COIN), 300);
            UI.showResultModal('player', finalPlayerScore, moneyWon, breakdown);
            Game.setLastRoundWinner('player');

            // 보드 모드: 룰렛 건너뛰고 바로 결과 처리
            if (Game.boardEncounterMode) {
                handleGameEnd();
            } else if (Game.computerMoney > 0) {
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
            breakdown = [...computerResult.breakdown];

            // 컴퓨터 고 점수 계산
            if (Game.computerGoCount > 0) {
                if (Game.computerGoCount === 1) { finalComputerScore += 1; breakdown.push(`1고 (+1점)`); }
                else if (Game.computerGoCount === 2) { finalComputerScore += 2; breakdown.push(`2고 (+2점)`); }
                else {
                    const goMultiplier = Math.pow(2, Game.computerGoCount - 2);
                    finalComputerScore *= goMultiplier;
                    breakdown.push(`${Game.computerGoCount}고 (x${goMultiplier})`);
                }
            }
            // 피박: 컴퓨터가 피로 점수를 냈을 때만 플레이어 피 5장 미만 시 적용
            const hasComputerPiScore = computerResult.piScore > 0 || computerResult.breakdown.some(b => b.startsWith('피'));
            const playerPiCount = Game.playerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
            if (hasComputerPiScore && playerPiCount < 5) {
                finalComputerScore *= 2;
                breakdown.push(`피박 (x2)`);
            }
            // 광박: 컴퓨터가 광으로 점수를 냈을 때만 플레이어 광 0장 시 적용
            if (computerResult.breakdown.some(b => b.startsWith('광')) && Game.playerAcquired.filter(c => c.type === 'gwang').length === 0) {
                finalComputerScore *= 2;
                breakdown.push(`광박 (x2)`);
            }
            // 고박: 플레이어가 고를 불렀는데 컴퓨터가 역전승한 경우
            if (Game.playerGoCount > 0) {
                finalComputerScore *= 2;
                breakdown.push(`플레이어 고박 (x2)`);
            }
            const computerShakeAndBombMultiplier = Math.pow(2, Game.computerShakeCount + Game.computerBombCount);
            if (computerShakeAndBombMultiplier > 1) {
                finalComputerScore *= computerShakeAndBombMultiplier;
                if (Game.computerShakeCount > 0) breakdown.push(`흔들기 (x${Math.pow(2, Game.computerShakeCount)})`);
                if (Game.computerBombCount > 0) breakdown.push(`폭탄 (x${Math.pow(2, Game.computerBombCount)})`);
            }

            moneyWon = Game.calculateMoney('computer', finalComputerScore);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            audioManager.playSfx(SFX.LOSE);
            UI.showResultModal('computer', finalComputerScore, moneyWon, breakdown);
            Game.setLastRoundWinner('computer');
            handleGameEnd();

        } else {
            UI.showResultModal('draw', 0, 0, ['무승부 (나가리)']);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            Game.saveGameData();
            Game.setLastRoundWinner('draw');
            handleGameEnd();
        }

        updateFullBoard();
    }, 700);
}

export function checkGameOver() {
    if (Game.deck.length === 0 || Game.playerHand.length === 0 || Game.computerHand.length === 0) {
        UI.showModal("게임 종료", "더 이상 낼 패가 없습니다. 점수를 계산합니다.", () => {
            handleStop();
        });
        return true;
    }
    return false;
}

export function handlePlayerBomb(bombSet, fieldCard) {
    audioManager.playSfx(SFX.BOMB);
    UI.updateStatusMessage(`${bombSet[0].month}월 폭탄! 추가 뒤집기 2회`);
    Game.acquireCards('player', ...bombSet, fieldCard);
    Game.setPlayerHand(Game.playerHand.filter(c => c.month !== bombSet[0].month));
    Game.incrementPlayerBomb();
    // 추가 뒤집기 카드 2장을 패에 추가 (이후 턴에서 자유롭게 사용)
    Game.playerHand.push({ id: -1, month: 0, type: 'bomb_flip', value: 0, img: '' });
    Game.playerHand.push({ id: -2, month: 0, type: 'bomb_flip', value: 0, img: '' });
    if (Game.takePiFromOpponent('player')) {
        UI.updateStatusMessage(UI.statusMessage.textContent + " 상대에게서 피 1장을 가져옵니다!");
    }
    handleFlippedCard('player', null); // 1번째 자동 뒤집기
}
