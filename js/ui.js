import * as Game from './game.js';

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
export const totalMoneySpan = document.getElementById('player-total-money'); // 전체 소지금 표시

// 카드 표시
export function displayCards(cards, container, isPlayer, playerPlayCallback) {
    container.innerHTML = "";
    cards.forEach((card) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        if (container === computerHandDiv) {
            cardDiv.style.backgroundColor = 'red'; // 컴퓨터 패는 빨간색
        } else {
            cardDiv.style.backgroundImage = `url(images/cards/${card.img.split('/').pop()})`;
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
        cardDiv.style.backgroundImage = `url(images/cards/${card.img.split('/').pop()})`;
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
                cardDiv.style.backgroundImage = `url(images/cards/${card.img.split('/').pop()})`;
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
        // tiedCards가 2차원 배열이라고 가정하고 각 묶음을 별도의 컨테이너에 표시
        tiedCards.forEach(tiedGroup => {
            const tiedCardsDiv = document.createElement('div');
            tiedCardsDiv.classList.add('tied-cards-container');
            tiedGroup.forEach(card => {
                const cardDiv = document.createElement("div");
                cardDiv.classList.add("card");
                cardDiv.style.backgroundImage = `url(images/cards/${card.img.split('/').pop()})`;
                cardDiv.dataset.id = card.id;
                tiedCardsDiv.appendChild(cardDiv);
            });
            fieldDiv.appendChild(tiedCardsDiv);
        });
    }

    // 월별로 카드 그룹화하여 표시
    const groupedFieldCards = fieldCards.reduce((acc, card) => {
        (acc[card.month] = acc[card.month] || []).push(card);
        return acc;
    }, {});

    Object.values(groupedFieldCards).forEach(group => {
        const groupContainer = document.createElement('div');
        groupContainer.classList.add('field-card-group');
        group.forEach(card => {
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("card");
            cardDiv.style.backgroundImage = `url(images/cards/${card.img.split('/').pop()})`;
            cardDiv.dataset.id = card.id;
            groupContainer.appendChild(cardDiv);
        });
        fieldDiv.appendChild(groupContainer);
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

// 판돈 표시 업데이트 (게임 보드 내)
export function updateMoneyDisplay(playerMoney, computerMoney) {
    playerMoneySpan.textContent = playerMoney.toLocaleString();
    computerMoneySpan.textContent = computerMoney.toLocaleString();
}

// 전체 소지금 표시 업데이트 (화면 상단)
export function updateTotalMoneyDisplay(playerMoney) {
    totalMoneySpan.textContent = playerMoney.toLocaleString();
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

export function showResultModal(winner, finalScore, moneyWon, breakdown) {
    const modal = document.createElement('div');
    modal.id = 'result-modal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        padding: 20px;
        border: 1px solid black;
        z-index: 1000;
        text-align: center;
    `;

    let titleHtml;
    if (winner === 'player') {
        titleHtml = '<h2 style="color: black;">승리!</h2>';
    } else if (winner === 'computer') {
        titleHtml = '<h2>패배!</h2>';
    } else {
        titleHtml = '<h2>무승부</h2>';
    }

    const breakdownHtml = breakdown.join('<br>');

    modal.innerHTML = `
        ${titleHtml}
        <p>최종 점수: ${finalScore}점</p>
        <p>${winner === 'player' ? '획득' : (winner === 'computer' ? '잃은' : '변동')} 금액: ${moneyWon.toLocaleString()}원</p>
        <hr>
        <p><b>점수 계산 내역</b></p>
        <div style="text-align: left; display: inline-block;">${breakdownHtml}</div>
        <br><br>
        <button id="close-result-modal">확인</button>
    `;

    document.body.appendChild(modal);

    document.getElementById('close-result-modal').addEventListener('click', () => {
        modal.remove();
    });
}

export function promptCardSelection(cardsToSelect, callback) {
    updateStatusMessage("가져올 카드를 선택하세요.");

    cardsToSelect.forEach(card => {
        const cardDiv = fieldDiv.querySelector(`[data-id='${card.id}']`);
        if (cardDiv) {
            cardDiv.classList.add('selectable');
            cardDiv.onclick = () => {
                // 모든 선택 가능한 카드에서 'selectable' 클래스와 클릭 이벤트 제거
                fieldDiv.querySelectorAll('.selectable').forEach(div => {
                    div.classList.remove('selectable');
                    div.onclick = null;
                });
                // 콜백 함수 실행
                callback(card);
            };
        }
    });
}

// 배경 컬렉션 갤러리 표시
export function showBackgroundGallery(stageId, stageName) {
    const modal = document.getElementById('gallery-modal');
    const title = document.getElementById('gallery-title');
    const grid = document.getElementById('gallery-grid');
    const closeButton = modal.querySelector('.close-button');

    title.textContent = `${stageName} 배경 컬렉션`;
    grid.innerHTML = ''; // 그리드 초기화

    const unlockedBgs = Game.unlockedBackgrounds[stageId] || [];

    for (let i = 1; i <= 12; i++) {
        const item = document.createElement('div');
        item.classList.add('gallery-item');

        if (unlockedBgs.includes(i)) {
            const img = document.createElement('img');
            img.src = `images/stages/stage${stageId}/showtime_bg_stage${stageId}_${String(i).padStart(2, '0')}.jpg`;
            img.alt = `배경 ${i}`;
            item.appendChild(img);
        } else {
            item.classList.add('locked');
            item.innerHTML = '?';
        }
        grid.appendChild(item);
    }

    modal.style.display = 'flex';

    // 닫기 버튼 이벤트
    closeButton.onclick = () => {
        modal.style.display = 'none';
    }

    // 모달 외부 클릭 시 닫기
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}