
import * as Game from './game.js';
import * as UI from './ui.js';
import { updateFullBoard, handleGameEnd } from './main.js';

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

// --- 컴퓨터 AI 로직 ---
export function findBestCardToPlay(computerHand, fieldCards, tiedCards) {
    let bestPlay = {
        cardToPlay: null,
        matchingCard: null,
        score: -1,
        reason: ''
    };

    // 1. 뻑을 먹을 수 있는 패가 있는지 확인 (가장 높은 우선순위)
    if (tiedCards && tiedCards.length > 0) {
        for (const card of computerHand) {
            const ppeokGroup = tiedCards.find(group => group[0].month === card.month);
            if (ppeokGroup) {
                // 뻑을 먹으면 얻는 점수 계산 (단순히 뻑 카드들 + 내는 카드 가치 합산)
                const ppeokValue = ppeokGroup.reduce((sum, c) => sum + getCardValue(c), 0);
                const currentScore = getCardValue(card) + ppeokValue;
                if (currentScore > bestPlay.score) {
                    bestPlay = {
                        cardToPlay: card,
                        matchingCard: ppeokGroup[0], // 매칭카드를 뻑 그룹의 첫 카드로 설정
                        score: currentScore,
                        reason: `${card.month}월 뻑 먹기`
                    };
                }
            }
        }
    }
    
    // 2. 일반적인 패 조합 찾기
    for (const myCard of computerHand) {
        const matchingFieldCards = fieldCards.filter(fieldCard => fieldCard.month === myCard.month);

        if (matchingFieldCards.length > 0) {
            // 먹을 수 있는 패가 여러 장일 경우, 가장 가치가 높은 조합을 선택
            matchingFieldCards.sort((a, b) => getCardValue(b) - getCardValue(a));
            const bestMatch = matchingFieldCards[0];
            const currentScore = getCardValue(myCard) + getCardValue(bestMatch);

            if (currentScore > bestPlay.score) {
                bestPlay = {
                    cardToPlay: myCard,
                    matchingCard: bestMatch,
                    score: currentScore,
                    reason: `${myCard.month}월 ${myCard.type} + ${bestMatch.type} 먹기`
                };
            }
        }
    }

    // 3. 먹을 패가 없을 경우, 어떤 패를 버릴지 결정
    if (!bestPlay.cardToPlay) {
        // 가장 가치가 낮은 패를 버림
        let cardToDiscard = computerHand.sort((a, b) => getCardValue(a) - getCardValue(b))[0];
        bestPlay = {
            cardToPlay: cardToDiscard,
            matchingCard: null,
            score: 0,
            reason: `버릴 패로 ${cardToDiscard.month}월 ${cardToDiscard.type} 선택`
        };
    }

    return bestPlay;
}


