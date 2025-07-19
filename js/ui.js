// DOM 요소
export const playerHandDiv = document.querySelector("#player-hand .card-container");
export const computerHandDiv = document.querySelector("#computer-hand .card-container");
export const fieldDiv = document.querySelector("#field .card-container");
export const playerAcquiredDiv = document.querySelector("#player-hand .acquired-cards .card-container");
export const computerAcquiredDiv = document.querySelector("#computer-hand .acquired-cards .card-container");
export const goButton = document.getElementById("go-button");
export const stopButton = document.getElementById("stop-button");
export const statusMessage = document.getElementById("status-message");
export const playerScoreSpan = document.getElementById("player-score");
export const computerScoreSpan = document.getElementById("computer-score");
export const playerMoneySpan = document.getElementById("player-money");
export const computerMoneySpan = document.getElementById("computer-money");
export const deckDiv = document.getElementById("deck");
export const flippedCardContainerDiv = document.getElementById("flipped-card-container");

// 카드 표시
export function displayCards(cards, container, isPlayer, playerPlayCallback) {
    container.innerHTML = "";
    cards.forEach((card) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        if (container === computerHandDiv) {
            cardDiv.style.backgroundColor = 'red'; // 컴퓨터 패는 빨간색
        } else {
            cardDiv.style.backgroundImage = `url(${card.img})`;
        }
        cardDiv.dataset.id = card.id;
        if (isPlayer) {
            cardDiv.addEventListener("click", () => playerPlayCallback(card));
        }
        container.appendChild(cardDiv);
    });
}

// 뒤집은 카드 표시
export function displayFlippedCard(card) {
    flippedCardContainerDiv.innerHTML = "";
    if (card) {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        cardDiv.style.backgroundImage = `url(${card.img})`;
        cardDiv.dataset.id = card.id;
        flippedCardContainerDiv.appendChild(cardDiv);
    }
}

// 획득한 카드 그룹별로 표시
export function displayAcquiredCardsGrouped(cards, container) {
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
            groupCardContainer.classList.add('card-container', 'acquired-group-cards');

            typeInfo.cards.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.classList.add('card');
                // 보너스 카드인 경우 특별한 클래스 추가
                if (card.id === 999 || card.id === 998) { // 임시 ID로 보너스 카드 구분
                    cardDiv.classList.add('bonus-card');
                }
                cardDiv.style.backgroundImage = `url(${card.img})`;
                cardDiv.dataset.id = card.id;
                groupCardContainer.appendChild(cardDiv);
            });
            groupDiv.appendChild(groupCardContainer);
            container.appendChild(groupDiv);
        }
    }
}

// 보드 전체 업데이트
export function updateBoard(gameState, playerPlayCallback) {
    const { playerHand, computerHand, fieldCards, tiedCards, deck, playerAcquired, computerAcquired, playerScore, computerScore, playerMoney, computerMoney } = gameState;

    playerHand.sort((a, b) => a.month - b.month);

    displayCards(playerHand, playerHandDiv, true, playerPlayCallback);
    displayCards(computerHand, computerHandDiv, false);

    fieldDiv.innerHTML = '';
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

    playerScoreSpan.textContent = playerScore;
    computerScoreSpan.textContent = computerScore;
    updateMoneyDisplay(playerMoney, computerMoney);
}

// 판돈 표시 업데이트
export function updateMoneyDisplay(playerMoney, computerMoney) {
    playerMoneySpan.textContent = playerMoney.toLocaleString();
    computerMoneySpan.textContent = computerMoney.toLocaleString();
}

// 상태 메시지 업데이트
export function updateStatusMessage(message) {
    statusMessage.textContent = message;
}

// 고/스톱 버튼 표시/숨김
export function showGoStopButtons(show) {
    goButton.style.display = show ? 'inline-block' : 'none';
    stopButton.style.display = show ? 'inline-block' : 'none';
}
