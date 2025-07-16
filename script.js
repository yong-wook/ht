// prettier-ignore
const CARDS = [
    { id: 1, month: 1, type: "gwang", value: 20, img: "images/01_gwang.jpg" },
    { id: 2, month: 1, type: "tti", value: 5, dan: 'hong', img: "images/01_tti.jpg" },
    { id: 3, month: 1, type: "pi", value: 1, img: "images/01_pi.jpg" },
    { id: 4, month: 1, type: "pi", value: 1, img: "images/01_pi.jpg" },
    { id: 5, month: 2, type: "tti", value: 5, dan: 'hong', img: "images/02_tti.jpg" },
    { id: 6, month: 2, type: "pi", value: 1, img: "images/02_pi.jpg" },
    { id: 7, month: 2, type: "pi", value: 1, img: "images/02_pi.jpg" },
    { id: 8, month: 2, type: "ggot", value: 10, img: "images/02_ggot.jpg" },
    { id: 9, month: 3, type: "gwang", value: 20, img: "images/03_gwang.jpg" },
    { id: 10, month: 3, type: "tti", value: 5, dan: 'hong', img: "images/03_tti.jpg" },
    { id: 11, month: 3, type: "pi", value: 1, img: "images/03_pi.jpg" },
    { id: 12, month: 3, type: "pi", value: 1, img: "images/03_pi.jpg" },
    { id: 13, month: 4, type: "tti", value: 5, dan: 'cho', img: "images/04_tti.jpg" },
    { id: 14, month: 4, type: "pi", value: 1, img: "images/04_pi.jpg" },
    { id: 15, month: 4, type: "pi", value: 1, img: "images/04_pi.jpg" },
    { id: 16, month: 4, type: "ggot", value: 10, img: "images/04_ggot.jpg" },
    { id: 17, month: 5, type: "tti", value: 5, dan: 'cho', img: "images/05_tti.jpg" },
    { id: 18, month: 5, type: "pi", value: 1, img: "images/05_pi.jpg" },
    { id: 19, month: 5, type: "pi", value: 1, img: "images/05_pi.jpg" },
    { id: 20, month: 5, type: "ggot", value: 10, img: "images/05_ggot.jpg" },
    { id: 21, month: 6, type: "tti", value: 5, dan: 'cheong', img: "images/06_tti.jpg" },
    { id: 22, month: 6, type: "pi", value: 1, img: "images/06_pi.jpg" },
    { id: 23, month: 6, type: "pi", value: 1, img: "images/06_pi.jpg" },
    { id: 24, month: 6, type: "ggot", value: 10, img: "images/06_ggot.jpg" },
    { id: 25, month: 7, type: "tti", value: 5, dan: 'cho', img: "images/07_tti.jpg" },
    { id: 26, month: 7, type: "pi", value: 1, img: "images/07_pi.jpg" },
    { id: 27, month: 7, type: "pi", value: 1, img: "images/07_pi.jpg" },
    { id: 28, month: 7, type: "ggot", value: 10, img: "images/07_ggot.jpg" },
    { id: 29, month: 8, type: "gwang", value: 20, img: "images/08_gwang.jpg" },
    { id: 30, month: 8, type: "pi", value: 1, img: "images/08_pi.jpg" },
    { id: 31, month: 8, type: "pi", value: 1, img: "images/08_pi.jpg" },
    { id: 32, month: 8, type: "ggot", value: 10, img: "images/08_ggot.jpg" },
    { id: 33, month: 9, type: "tti", value: 5, dan: 'cheong', img: "images/09_tti.jpg" },
    { id: 34, month: 9, type: "pi", value: 1, img: "images/09_pi.jpg" },
    { id: 35, month: 9, type: "pi", value: 1, img: "images/09_pi.jpg" },
    { id: 36, month: 9, type: "ggot", value: 10, img: "images/09_ggot.jpg" },
    { id: 37, month: 10, type: "tti", value: 5, dan: 'cheong', img: "images/10_tti.jpg" },
    { id: 38, month: 10, type: "pi", value: 1, img: "images/10_pi.jpg" },
    { id: 39, month: 10, type: "pi", value: 1, img: "images/10_pi.jpg" },
    { id: 40, month: 10, type: "ggot", value: 10, img: "images/10_ggot.jpg" },
    { id: 41, month: 11, type: "gwang", value: 20, img: "images/11_gwang.jpg" },
    { id: 42, month: 11, type: "ssangpi", value: 2, img: "images/11_ssangpi.jpg" },
    { id: 43, month: 11, type: "pi", value: 1, img: "images/11_pi.jpg" },
    { id: 44, month: 11, type: "pi", value: 1, img: "images/11_pi.jpg" },
    { id: 45, month: 12, type: "gwang", value: 20, img: "images/12_gwang.jpg" },
    { id: 46, month: 12, type: "tti", value: 5, img: "images/12_tti.jpg" },
    { id: 47, month: 12, type: "ggot", value: 10, img: "images/12_ggot.jpg" },
    { id: 48, month: 12, type: "ssangpi", value: 2, img: "images/12_ssangpi.jpg" },
];

// 게임 상태
let playerHand = [];
let computerHand = [];
let fieldCards = [];
let deck = [];
let playerAcquired = [];
let computerAcquired = [];
let playerGoCount = 0; // 플레이어 고 횟수
let computerGoCount = 0; // 컴퓨터 고 횟수
let playerBombCount = 0; // 플레이어 폭탄 횟수
let playerShakeCount = 0; // 플레이어 흔들기 횟수
let tiedCards = []; // 뻑으로 묶인 카드

// 점수
let playerScore = 0;
let computerScore = 0;

// DOM 요소
const playerHandDiv = document.querySelector("#player-hand .card-container");
const computerHandDiv = document.querySelector("#computer-hand .card-container");
const fieldDiv = document.querySelector("#field .card-container");
const playerAcquiredDiv = document.querySelector("#player-hand .acquired-cards .card-container");
const computerAcquiredDiv = document.querySelector("#computer-hand .acquired-cards .card-container");
const goButton = document.getElementById("go-button");
const stopButton = document.getElementById("stop-button");
const statusMessage = document.getElementById("status-message");
const playerScoreSpan = document.getElementById("player-score");
const computerScoreSpan = document.getElementById("computer-score");
const deckDiv = document.getElementById("deck");
const flippedCardContainerDiv = document.getElementById("flipped-card-container");

// 게임 초기화
function initGame() {
	// 카드 덱 생성
	createDeck();
	// 카드 섞기
	shuffleDeck();
	// 카드 분배
	dealCards();
	
    // 흔들기 확인
    const shakeMonth = playerHand.find(card => playerHand.filter(c => c.month === card.month).
      length >= 3);
    if (shakeMonth) {
       const wantsToShake = confirm(`${shakeMonth.month}월 패 3장으로 흔드시겠습니까?`);
       if (wantsToShake) {
           playerShakeCount++;
           statusMessage.textContent = `${shakeMonth.month}월 흔들기! 점수 2배!`;
       }
    }
        
    // 화면 업데이트
	updateBoard();
    statusMessage.textContent = "플레이어 턴입니다.";
}

// 덱 생성
function createDeck() {
	deck = [...CARDS];
}

// 덱 섞기
function shuffleDeck() {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
}

// 카드 분배
function dealCards() {
    playerHand = [];
    computerHand = [];
    fieldCards = [];
    playerAcquired = [];
    computerAcquired = [];
    playerGoCount = 0; // Reset go count
    playerBombCount = 0; // Reset bomb count
    playerShakeCount = 0; // Reset shake count
    deck = [...CARDS];
    shuffleDeck();

	for (let i = 0; i < 10; i++) {
		playerHand.push(deck.pop());
		computerHand.push(deck.pop());
	}
	for (let i = 0; i < 8; i++) {
		fieldCards.push(deck.pop());
	}
}

// 카드 표시
function displayCards(cards, container, isPlayer) {
    container.innerHTML = "";
    cards.forEach((card) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        if (container === computerHandDiv) {
            cardDiv.style.backgroundColor = 'red'; // 컴퓨터 패는 빨간색
        } else {
            cardDiv.style.backgroundImage = `url(${card.img})`;
        }
        cardDiv.dataset.id = card.id; // 데이터 속성에 id 추가
        if (isPlayer) {
            cardDiv.addEventListener("click", () => playerPlay(card));
        }
        container.appendChild(cardDiv);
    });
}

// 뒤집은 카드 표시
function displayFlippedCard(card) {
    flippedCardContainerDiv.innerHTML = "";
    if (card) {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        cardDiv.style.backgroundImage = `url(${card.img})`;
        cardDiv.dataset.id = card.id;
        flippedCardContainerDiv.appendChild(cardDiv);
    }
}

// 플레이어 턴
function playerPlay(selectedCard) {
    if (goButton.style.display === 'inline-block') {
        statusMessage.textContent = "'고' 또는 '스톱'을 선택해야 합니다.";
        return;
    }

    if (fieldDiv.querySelector('.selectable')) {
        return;
    }

    const cardsInHandSameMonth = playerHand.filter(c => c.month === selectedCard.month);
    const matchingCardsInField = fieldCards.filter(
        (card) => card.month === selectedCard.month
    );

    if (cardsInHandSameMonth.length === 3 && matchingCardsInField.length > 0) {
        const wantsToBomb = confirm(`${selectedCard.month}월 패 3장으로 폭탄하시겠습니까?`);
        if (wantsToBomb) {
            handlePlayerBomb(cardsInHandSameMonth, matchingCardsInField);
            return;
        }
    }

    playerHand = playerHand.filter((c) => c.id !== selectedCard.id);

    // 1. 낸 카드를 먼저 처리
    let isPlayerChoiceNeeded = false;
    if (matchingCardsInField.length === 1) {
        const flippedCard = deck.pop();
        displayFlippedCard(flippedCard);
        if (flippedCard && selectedCard.month === flippedCard.month) {
            statusMessage.textContent = `${selectedCard.month}월 뻑! 패가 묶였습니다.`;
            tiedCards.push(selectedCard, matchingCardsInField[0], flippedCard);
            fieldCards = fieldCards.filter(c => c.id !== matchingCardsInField[0].id);
        } else {
            acquireCards('player', selectedCard, matchingCardsInField[0]);
            if (flippedCard) handleFlippedCard('player', flippedCard);
        }
    } else if (matchingCardsInField.length > 1) {
        isPlayerChoiceNeeded = true;
        statusMessage.textContent = "바닥에 깔린 카드 중 하나를 선택하세요.";
        matchingCardsInField.forEach(card => {
            const cardDiv = fieldDiv.querySelector(`[data-id='${card.id}']`);
            if (cardDiv) {
                cardDiv.classList.add('selectable');
                cardDiv.onclick = () => {
                    acquireCards('player', selectedCard, card);
                    fieldDiv.querySelectorAll('.selectable').forEach(div => {
                        div.classList.remove('selectable');
                        const newDiv = div.cloneNode(true);
                        div.parentNode.replaceChild(newDiv, div);
                    });
                    const flippedCard = deck.pop();
                    displayFlippedCard(flippedCard);
                    if (flippedCard) handleFlippedCard('player', flippedCard);
                    endPlayerTurn();
                };
            }
        });
    } else {
        fieldCards.push(selectedCard);
        const flippedCard = deck.pop();
        displayFlippedCard(flippedCard);
        if (flippedCard) handleFlippedCard('player', flippedCard);
    }

    if (!isPlayerChoiceNeeded) {
        endPlayerTurn();
    }
}

function handleFlippedCard(turn, flippedCard) {
    const matchingField = fieldCards.filter(c => c.month === flippedCard.month);
    if (matchingField.length > 0) {
        acquireCards(turn, flippedCard, ...matchingField);
    } else {
        fieldCards.push(flippedCard);
    }
}

function endPlayerTurn() {
    updateBoard();
    const playerScoreInfo = calculateScore(playerAcquired);
    playerScore = playerScoreInfo.score;

    if (playerScore >= 3) {
        statusMessage.textContent = `현재 ${playerScore}점. 고 또는 스톱을 선택하세요.`;
        goButton.style.display = 'inline-block';
        stopButton.style.display = 'inline-block';
    } else {
        statusMessage.textContent = "컴퓨터 턴입니다.";
        setTimeout(() => {
            displayFlippedCard(null);
            computerTurn();
        }, 1000);
    }
}

function handlePlayerBomb(bombSet, matchingFieldCards) {
    statusMessage.textContent = `${bombSet[0].month}월 폭탄! 바닥에 깔린 카드 중 하나를 선택하세요.`;

    matchingFieldCards.forEach(card => {
        const cardDiv = fieldDiv.querySelector(`[data-id='${card.id}']`);
        if (cardDiv) {
            cardDiv.classList.add('selectable');
            cardDiv.onclick = () => {
                acquireCards('player', ...bombSet, card); // 3장의 손패 + 1장의 바닥패 획득
                playerHand = playerHand.filter(c => c.month !== bombSet[0].month); // 손패에서 3장 제거
                playerBombCount++;

                // 선택 후 UI 정리
                fieldDiv.querySelectorAll('.selectable').forEach(div => {
                    div.classList.remove('selectable');
                    const newDiv = div.cloneNode(true);
                    div.parentNode.replaceChild(newDiv, div);
                });

                // 뒤집는 로직
                const flippedCard = deck.pop();
                displayFlippedCard(flippedCard);
                if (flippedCard) {
                    const matchingFlipped = fieldCards.filter(
                        (c) => c.month === flippedCard.month
                    );
                    if (matchingFlipped.length > 0) {
                        acquireCards('player', flippedCard, ...matchingFlipped);
                    } else {
                        fieldCards.push(flippedCard);
                    }
                }
                endPlayerTurn();
            };
        }
    });
}

// 컴퓨터 턴
function computerTurn() {
    if (computerHand.length === 0) {
        checkGameOver();
        return;
    }

    // 뻑 해제 기회 확인 (손패)
    if (tiedCards.length > 0) {
        const cardToReleaseBbeok = computerHand.find(c => c.month === tiedCards[0].month);
        if (cardToReleaseBbeok) {
            acquireCards('computer', cardToReleaseBbeok, ...tiedCards);
            tiedCards = []; // 묶인 패 해제
            computerHand = computerHand.filter(c => c.id !== cardToReleaseBbeok.id);
            statusMessage.textContent = `${cardToReleaseBbeok.month}월 뻑 패를 가져갑니다!`;
            updateBoard();
            statusMessage.textContent = "플레이어 턴입니다.";
            checkGameOver();
            return;
        }
    }

    let bestMove = { card: null, fieldCard: null, score: -1 };

    for (const cardInHand of computerHand) {
        const matchingCardsInField = fieldCards.filter(c => c.month === cardInHand.month);

        if (matchingCardsInField.length > 0) {
            for (const fieldCard of matchingCardsInField) {
                const tempAcquired = [...computerAcquired, cardInHand, fieldCard];
                const scoreInfo = calculateScore(tempAcquired);

                if (scoreInfo.score > bestMove.score) {
                    bestMove = { card: cardInHand, fieldCard: fieldCard, score: scoreInfo.score };
                }
            }
        }
    }

    const flippedCard = deck.pop();
    displayFlippedCard(flippedCard);

    if (bestMove.card) {
        // 뻑(설사) 확인 (컴퓨터) - 낸 패, 바닥의 1장, 뒤집을 패가 모두 같은 월일 때
        const matchingCardsForBestMove = fieldCards.filter(c => c.month === bestMove.card.month);

        if (matchingCardsForBestMove.length === 1 && flippedCard &&
            bestMove.card.month === matchingCardsForBestMove[0].month &&
            bestMove.card.month === flippedCard.month) {

            statusMessage.textContent = `${bestMove.card.month}월 뻑! 패가 묶였습니다.`;
            tiedCards.push(bestMove.card, matchingCardsForBestMove[0], flippedCard);
            fieldCards = fieldCards.filter(c => c.id !== matchingCardsForBestMove[0].id);
            computerHand = computerHand.filter(c => c.id !== bestMove.card.id);
            updateBoard();
            statusMessage.textContent = "플레이어 턴입니다.";
            checkGameOver();
            return; // 뻑 발생 시 턴 종료
        }

        // 따닥 확인
        if (matchingCardsForBestMove.length === 3) {
            acquireCards('computer', bestMove.card, ...matchingCardsForBestMove);
        } else {
            acquireCards('computer', bestMove.card, bestMove.fieldCard);
        }
        computerHand = computerHand.filter(c => c.id !== bestMove.card.id);
    } else {
        const randomCard = computerHand[Math.floor(Math.random() * computerHand.length)];
        fieldCards.push(randomCard);
        computerHand = computerHand.filter(c => c.id !== randomCard.id);
    }

    if (flippedCard) {
        // 뻑 해제 확인 (뒤집은 패가 뻑 패를 가져가는 경우)
        if (tiedCards.length > 0 && tiedCards[0].month === flippedCard.month) {
            acquireCards('computer', flippedCard, ...tiedCards);
            tiedCards = []; // 묶인 패 해제
            statusMessage.textContent = `${flippedCard.month}월 뻑 패를 가져갑니다!`;
        }
        else {
            const matchingFlipped = fieldCards.filter(
                (card) => card.month === flippedCard.month
            );
            if (matchingFlipped.length > 0) {
                acquireCards('computer', flippedCard, ...matchingFlipped);
            } else {
                fieldCards.push(flippedCard);
            }
        }
    }

    updateBoard();
    statusMessage.textContent = "플레이어 턴입니다.";
    setTimeout(() => {
        displayFlippedCard(null);
        checkGameOver();
    }, 1000);
}

// 점수 계산
function calculateScore(acquiredCards, turn) {
    if (!acquiredCards) return { score: 0, breakdown: [] };

    let score = 0;
    let breakdown = [];
    const gwang = acquiredCards.filter(c => c.type === 'gwang');
    const tti = acquiredCards.filter(c => c.type === 'tti');
    const ggot = acquiredCards.filter(c => c.type === 'ggot');
    const pi = acquiredCards.filter(c => c.type === 'pi' || c.type === 'ssangpi');

    // 광 점수
    if (gwang.length >= 3) {
        const gwangScore = gwang.length === 3 ? 3 : gwang.length === 4 ? 4 : 20;
        score += gwangScore;
        breakdown.push(`광 (${gwangScore}점)`);
    }

    // 띠 점수
    if (tti.length >= 5) {
        const ttiScore = tti.length - 4;
        score += ttiScore;
        breakdown.push(`띠 (${ttiScore}점)`);
    }

    // 단(Dan) 족보 점수
    const hongdan = tti.filter(c => c.dan === 'hong');
    const cheongdan = tti.filter(c => c.dan === 'cheong');
    const chodan = tti.filter(c => c.dan === 'cho');

    if (hongdan.length === 3) {
        score += 3;
        breakdown.push("홍단 (3점)");
    }
    if (cheongdan.length === 3) {
        score += 3;
        breakdown.push("청단 (3점)");
    }
    if (chodan.length === 3) {
        score += 3;
        breakdown.push("초단 (3점)");
    }

    // 끗(동물) 점수
    const godoriMonths = [2, 4, 8];
    const godoriCards = ggot.filter(c => godoriMonths.includes(c.month));
    if (godoriCards.length === 3) {
        score += 5;
        breakdown.push("고도리 (5점)");
    }
    if (ggot.length >= 5) {
        score += ggot.length;
        breakdown.push(`끗 (${ggot.length}점)`);
    }

    // 피 점수
    const piCount = pi.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : 1), 0);
    if (piCount >= 10) {
        const piScore = piCount - 9;
        score += piScore;
        breakdown.push(`피 (${piScore}점)`);
    }

    return { score, breakdown };
}

// "고" 버튼 클릭
goButton.addEventListener('click', () => {
    playerGoCount++;
    statusMessage.textContent = `플레이어 ${playerGoCount}고! 컴퓨터 턴입니다.`;
    goButton.style.display = 'none';
    stopButton.style.display = 'none';
    setTimeout(computerTurn, 1000);
});

// "스톱" 버튼 클릭
stopButton.addEventListener('click', () => {
    let playerResult = calculateScore(playerAcquired, 'player');
    let computerResult = calculateScore(computerAcquired, 'computer');

    let finalPlayerScore = playerResult.score;
    let finalComputerScore = computerResult.score;

    // 승패 판정
    if (finalPlayerScore > finalComputerScore) {
        // 피박 확인
        const computerPiCount = computerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
        if (computerPiCount < 5) {
            finalPlayerScore *= 2;
            playerResult.breakdown.push("피박 (점수 2배)");
        }

        // 고박 확인
        if (playerGoCount > 0 && finalComputerScore === 0) {
            finalPlayerScore *= 2;
            playerResult.breakdown.push("고박 (점수 2배)");
        }
        // 흔들기/폭탄 배율 적용
        const multiplier = Math.pow(2, playerShakeCount + playerBombCount);
        if (multiplier > 1) {
             finalPlayerScore *= multiplier;
             if(playerShakeCount > 0) playerResult.breakdown.push(`흔들기 (${playerShakeCount}회, 점수 ${Math.pow(2, playerShakeCount)}배)`);
             if(playerBombCount > 0) playerResult.breakdown.push(`폭탄 (${playerBombCount}회, 점수 ${Math.pow(2, playerBombCount)}배)`);
        }

        alert(`플레이어 승리!\n\n최종 점수: ${finalPlayerScore}점\n\n점수 내역:\n- ${playerResult.breakdown.join('\n- ')}\n\n---\n\n컴퓨터 점수: ${finalComputerScore}점\n- ${computerResult.breakdown.join('\n- ') || '점수 없음'}`);

    } else if (finalComputerScore > finalPlayerScore) {
        // 컴퓨터 승리 로직 (유사하게 적용 가능)
        alert(`컴퓨터 승리! 최종 점수: ${finalComputerScore}점`);
    } else {
        alert("무승부!");
    }

    endRound();
});

function endRound() {
    document.getElementById('go-button').style.display = 'none';
    document.getElementById('stop-button').style.display = 'none';

    const restartButton = document.createElement('button');
    restartButton.textContent = "다음 라운드";
    restartButton.onclick = () => {
        document.getElementById('go-button').style.display = 'inline-block';
        document.getElementById('stop-button').style.display = 'inline-block';
        restartButton.remove();
        initGame();
    };
    document.querySelector('.controls').appendChild(restartButton);
}


// 카드 획득 처리
function acquireCards(turn, ...cardsToAcquire) {
    const allCards = cardsToAcquire.filter(c => c); // null/undefined 카드 제거

    if (turn === 'computer') {
        allCards.forEach(card => computerAcquired.push(card));
    } else {
        allCards.forEach(card => playerAcquired.push(card));
    }

    fieldCards = fieldCards.filter(fieldCard => !allCards.some(ac => ac.id === fieldCard.id));
}


function displayAcquiredCardsGrouped(cards, container) {
    container.innerHTML = '';

    const cardTypes = {
        gwang: { name: '광', cards: [] },
        ggot: { name: '끗', cards: [] },
        tti: { name: '띠', cards: [] },
        pi: { name: '피', cards: [] }
    };

    cards.forEach(card => {
        if (card.type === 'gwang') cardTypes.gwang.cards.push(card);
        else if (card.type === 'ggot') cardTypes.ggot.cards.push(card);
        else if (card.type === 'tti') cardTypes.tti.cards.push(card);
        else if (card.type === 'ssangpi' || card.type === 'pi') cardTypes.pi.cards.push(card);
    });

    for (const typeKey in cardTypes) {
        const typeInfo = cardTypes[typeKey];
        if (typeInfo.cards.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('acquired-group');

            const groupTitle = document.createElement('h4');
            let displayCount = typeInfo.cards.length;
            if (typeKey === 'pi') {
                displayCount = typeInfo.cards.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : 1), 0);
            }
            groupTitle.textContent = `${typeInfo.name} (${displayCount}장)`;
            groupDiv.appendChild(groupTitle);

            const groupCardContainer = document.createElement('div');
            groupCardContainer.classList.add('card-container');
            groupCardContainer.classList.add('acquired-group-cards');

            typeInfo.cards.forEach(card => {
                const createCardDiv = () => {
                    const cardDiv = document.createElement('div');
                    cardDiv.classList.add('card');
                    cardDiv.style.backgroundImage = `url(${card.img})`;
                    cardDiv.dataset.id = card.id;
                    return cardDiv;
                };

                groupCardContainer.appendChild(createCardDiv());
            });
            groupDiv.appendChild(groupCardContainer);
            container.appendChild(groupDiv);
        }
    }
}

// 보드 업데이트
function updateBoard() {
    // 플레이어 손패 월별 정렬
    playerHand.sort((a, b) => a.month - b.month);

    displayCards(playerHand, playerHandDiv, true);
    displayCards(computerHand, computerHandDiv, false);
    displayCards(fieldCards, fieldDiv, false);
    displayAcquiredCardsGrouped(playerAcquired, playerAcquiredDiv);
    displayAcquiredCardsGrouped(computerAcquired, computerAcquiredDiv);

    const deckCard = deckDiv.querySelector('.card');
    if (deck.length > 0) {
        if(deckCard) deckCard.style.display = 'block';
    } else {
        if(deckCard) deckCard.style.display = 'none';
    }

    const playerScoreInfo = calculateScore(playerAcquired, 'player');
    const computerScoreInfo = calculateScore(computerAcquired, 'computer');
    playerScore = playerScoreInfo.score;
    computerScore = computerScoreInfo.score;
    playerScoreSpan.textContent = playerScore;
    computerScoreSpan.textContent = computerScore;
}

function checkGameOver() {
    if (deck.length === 0 || playerHand.length === 0 || computerHand.length === 0) {
        endRound();
    }
}

// 게임 시작
initGame();