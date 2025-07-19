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
    // 고/스톱 버튼 숨기기 (라운드 시작 시 초기화)
    goButton.style.display = 'none';
    stopButton.style.display = 'none';

	// 카드 덱 생성
	createDeck();
	// 카드 섞기
	shuffleDeck();
	// 카드 분배
	dealCards();

    // 총통 확인
    if (checkChongtong()) {
        return; // 총통으로 게임이 즉시 종료됨
    }
	
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

function checkChongtong() {
    const checkHand = (hand, playerName, scoreTarget) => {
        const monthCounts = {};
        for (const card of hand) {
            monthCounts[card.month] = (monthCounts[card.month] || 0) + 1;
        }

        for (const month in monthCounts) {
            if (monthCounts[month] === 4) {
                updateBoard(); // 카드를 보여주고
                const score = 5; // 총통 점수
                if (scoreTarget === 'player') {
                    playerScore += score;
                } else {
                    computerScore += score;
                }
                alert(`${playerName} 총통! ${month}월 패 4장으로 승리! (+${score}점)`);
                updateBoard(); // 점수 업데이트 반영
                endRound();
                return true; // 총통 발견
            }
        }
        return false; // 총통 없음
    };

    if (checkHand(playerHand, "플레이어", 'player')) {
        return true;
    }
    if (checkHand(computerHand, "컴퓨터", 'computer')) {
        return true;
    }

    return false;
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

    // 뻑 해제 로직
    if (tiedCards.length > 0 && selectedCard.month === tiedCards[0].month) {
        playerHand = playerHand.filter((c) => c.id !== selectedCard.id);
        acquireCards('player', selectedCard, ...tiedCards);
        tiedCards = []; // 묶인 패 해제
        statusMessage.textContent = `${selectedCard.month}월 뻑 패를 가져갑니다!`;
        takePiFromOpponent('player'); // 상대 피 가져오기

        const flippedCard = deck.pop();
        displayFlippedCard(flippedCard);
        if (flippedCard) {
            handleFlippedCard('player', flippedCard);
        }
        endPlayerTurn(fieldCards.length === 0);
        return; // 턴 종료
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
    } else if (matchingCardsInField.length === 2) { // 바닥에 같은 월의 패가 2장 있을 때
        isPlayerChoiceNeeded = true;
        statusMessage.textContent = `${selectedCard.month}월 패와 바닥의 패 중 하나를 선택하세요.`;

        matchingCardsInField.forEach(card => {
            const cardDiv = fieldDiv.querySelector(`[data-id='${card.id}']`);
            if (cardDiv) {
                cardDiv.classList.add('selectable');
                cardDiv.onclick = () => {
                    const chosenFieldCard = card;
                    const remainingFieldCard = matchingCardsInField.find(c => c.id !== chosenFieldCard.id);

                    acquireCards('player', selectedCard, chosenFieldCard);
                    fieldCards = fieldCards.filter(c => c.id !== chosenFieldCard.id);

                    fieldDiv.querySelectorAll('.selectable').forEach(div => {
                        div.classList.remove('selectable');
                        const newDiv = div.cloneNode(true);
                        div.parentNode.replaceChild(newDiv, div);
                    });

                    const flippedCard = deck.pop();
                    displayFlippedCard(flippedCard);

                    if (flippedCard) {
                        if (remainingFieldCard && flippedCard.month === remainingFieldCard.month) {
                            statusMessage.textContent = `${selectedCard.month}월 따닥! (뒤집은 패 포함)`;
                            acquireCards('player', remainingFieldCard, flippedCard);
                            fieldCards = fieldCards.filter(c => c.id !== remainingFieldCard.id);
                            takePiFromOpponent('player');
                        } else {
                            handleFlippedCard('player', flippedCard);
                        }
                    }
                    endPlayerTurn(fieldCards.length === 0);
                };
            }
        });
    } else if (matchingCardsInField.length > 2) { // 선택 따닥
        isPlayerChoiceNeeded = true;
        statusMessage.textContent = "따닥할 카드 두 장을 선택하세요.";
        // TODO: 카드 선택 로직 구현
    } else {
        fieldCards.push(selectedCard);
        const flippedCard = deck.pop();
        displayFlippedCard(flippedCard);
        if (flippedCard) handleFlippedCard('player', flippedCard);
    }

    if (!isPlayerChoiceNeeded) {
        endPlayerTurn(fieldCards.length === 0);
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

function endPlayerTurn(isSsakSseuri = false) {
    if (isSsakSseuri) {
        statusMessage.textContent = "싹쓸이!";
        takePiFromOpponent('player');
    }
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

    let isSsakSseuri = false;

    // 뻑 해제 기회 확인 (손패)
    if (tiedCards.length > 0) {
        const cardToReleaseBbeok = computerHand.find(c => c.month === tiedCards[0].month);
        if (cardToReleaseBbeok) {
            acquireCards('computer', cardToReleaseBbeok, ...tiedCards);
            tiedCards = []; // 묶인 패 해제
            computerHand = computerHand.filter(c => c.id !== cardToReleaseBbeok.id);
            statusMessage.textContent = `${cardToReleaseBbeok.month}월 뻑 패를 가져갑니다!`;
            takePiFromOpponent('computer'); // 상대 피 가져오기

            const flippedCard = deck.pop();
            displayFlippedCard(flippedCard);
            if (flippedCard) handleFlippedCard('computer', flippedCard);
            if (fieldCards.length === 0) isSsakSseuri = true;
            endComputerTurn(isSsakSseuri);
            return;
        }
    }

    let playedCard = null;
    // 1. 따닥 먼저 찾기
    for (const cardInHand of computerHand) {
        const matchingCardsInField = fieldCards.filter(c => c.month === cardInHand.month);
        if (matchingCardsInField.length === 2) {
            playedCard = cardInHand;
            statusMessage.textContent = `컴퓨터 ${cardInHand.month}월 따닥!`;
            acquireCards('computer', playedCard, ...matchingCardsInField);
            takePiFromOpponent('computer');
            break;
        }
    }

    // 2. 따닥 없으면 점수 나는 패 찾기
    if (!playedCard) {
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
        if (bestMove.card) {
            playedCard = bestMove.card;
            acquireCards('computer', playedCard, bestMove.fieldCard);
        }
    }

    // 3. 없으면 그냥 내기
    if (!playedCard) {
        playedCard = computerHand[Math.floor(Math.random() * computerHand.length)];
        fieldCards.push(playedCard);
    }
    
    if (playedCard) {
        computerHand = computerHand.filter(c => c.id !== playedCard.id);
    }

    const flippedCard = deck.pop();
    displayFlippedCard(flippedCard);

    if (flippedCard) {
        if (tiedCards.length > 0 && tiedCards[0].month === flippedCard.month) {
            acquireCards('computer', flippedCard, ...tiedCards);
            tiedCards = [];
        } else {
            handleFlippedCard('computer', flippedCard);
        }
    }

    if (fieldCards.length === 0) {
        isSsakSseuri = true;
    }
    endComputerTurn(isSsakSseuri);
}

function endComputerTurn(isSsakSseuri = false) {
    if (isSsakSseuri) {
        statusMessage.textContent = "컴퓨터 싹쓸이!";
        takePiFromOpponent('computer');
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
        let gwangScore = 0;
        if (gwang.length === 3) {
            // 비광(12월) 포함 시 2점, 아니면 3점
            const hasBiGwang = gwang.some(c => c.month === 12);
            gwangScore = hasBiGwang ? 2 : 3;
        } else if (gwang.length === 4) {
            gwangScore = 4;
        } else if (gwang.length === 5) {
            gwangScore = 15; // 5광은 15점
        }
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
        const ggotScore = ggot.length - 4;
        score += ggotScore;
        breakdown.push(`끗 (${ggotScore}점)`);
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
        // 승리자: 플레이어

        // 1. 고 점수 계산
        if (playerGoCount > 0) {
            if (playerGoCount === 1) {
                finalPlayerScore += 1;
                playerResult.breakdown.push("1고 (+1점)");
            } else if (playerGoCount === 2) {
                finalPlayerScore += 2;
                playerResult.breakdown.push("2고 (+2점)");
            } else { // 3고 이상
                finalPlayerScore *= Math.pow(2, playerGoCount - 2);
                playerResult.breakdown.push(`${playerGoCount}고 (점수 ${Math.pow(2, playerGoCount - 2)}배)`);
            }
        }

        const hasPlayerScoredWithPi = playerResult.breakdown.some(b => b.startsWith('피'));
        const hasPlayerScoredWithGwang = playerResult.breakdown.some(b => b.startsWith('광'));
        
        const computerPiCount = computerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
        const computerGwangCount = computerAcquired.filter(c => c.type === 'gwang').length;

        // 피박 확인: 플레이어가 피로 점수를 냈고, 컴퓨터의 피가 5장 미만일 때
        if (hasPlayerScoredWithPi && computerPiCount < 5) {
            finalPlayerScore *= 2;
            playerResult.breakdown.push("피박 (점수 2배)");
        }

        // 광박 확인: 플레이어가 광으로 점수를 냈고, 컴퓨터가 광을 한 장도 못 먹었을 때
        if (hasPlayerScoredWithGwang && computerGwangCount === 0) {
            finalPlayerScore *= 2;
            playerResult.breakdown.push("광박 (점수 2배)");
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

        alert(`플레이어 승리!

최종 점수: ${finalPlayerScore}점

점수 내역:
- ${playerResult.breakdown.join('\n- ')}

---

컴퓨터 점수: ${finalComputerScore}점
- ${computerResult.breakdown.join('\n- ') || '점수 없음'}`);

    } else if (finalComputerScore > finalPlayerScore) {
        // 승리자: 컴퓨터
        const hasComputerScoredWithPi = computerResult.breakdown.some(b => b.startsWith('피'));
        const hasComputerScoredWithGwang = computerResult.breakdown.some(b => b.startsWith('광'));

        const playerPiCount = playerAcquired.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : (cur.type === 'pi' ? 1 : 0)), 0);
        const playerGwangCount = playerAcquired.filter(c => c.type === 'gwang').length;

        // 피박 확인
        if (hasComputerScoredWithPi && playerPiCount < 5) {
            finalComputerScore *= 2;
            computerResult.breakdown.push("피박 (점수 2배)");
        }

        // 광박 확인
        if (hasComputerScoredWithGwang && playerGwangCount === 0) {
            finalComputerScore *= 2;
            computerResult.breakdown.push("광박 (점수 2배)");
        }
        
        // 컴퓨터는 '고'를 하지 않으므로 고박은 없음.

        alert(`컴퓨터 승리!

최종 점수: ${finalComputerScore}점

점수 내역:
- ${computerResult.breakdown.join('\n- ')}

---

플레이어 점수: ${finalPlayerScore}점
- ${playerResult.breakdown.join('\n- ') || '점수 없음'}`);
    } else {
        alert("무승부!");
    }

    endRound();
});""

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

function takePiFromOpponent(taker) {
    const opponent = taker === 'player' ? 'computer' : 'player';
    const opponentAcquired = opponent === 'player' ? playerAcquired : computerAcquired;
    const opponentPi = opponentAcquired.filter(c => c.type === 'pi' || c.type === 'ssangpi');

    if (opponentPi.length > 0) {
        const piToTake = opponentPi[0]; // 쌍피든 일반 피든 하나 가져옴
        if (opponent === 'player') {
            playerAcquired = playerAcquired.filter(c => c.id !== piToTake.id);
            computerAcquired.push(piToTake);
        } else {
            computerAcquired = computerAcquired.filter(c => c.id !== piToTake.id);
            playerAcquired.push(piToTake);
        }
        statusMessage.textContent += ` 상대에게서 피 1장을 가져옵니다!`;
    }
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

    // Render field cards with special handling for tied cards
    fieldDiv.innerHTML = ''; // Clear the field first

    // Display tied cards (뻑)
    if (tiedCards.length > 0) {
        const tiedCardsDiv = document.createElement('div');
        tiedCardsDiv.classList.add('tied-cards-container');
        tiedCards.forEach(card => {
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("card");
            cardDiv.style.backgroundImage = `url(${card.img})`;
            cardDiv.dataset.id = card.id;
            tiedCardsDiv.appendChild(cardDiv);
        });
        fieldDiv.appendChild(tiedCardsDiv);
    }

    // Display normal field cards
    fieldCards.forEach((card) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        cardDiv.style.backgroundImage = `url(${card.img})`;
        cardDiv.dataset.id = card.id;
        fieldDiv.appendChild(cardDiv);
    });
    
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