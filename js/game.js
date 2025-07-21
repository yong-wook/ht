// 게임 상태 변수들
export let playerHand = [];
export let computerHand = [];
export let fieldCards = [];
export let deck = [];
export let playerAcquired = [];
export let computerAcquired = [];
export let playerGoCount = 0;
export let computerGoCount = 0;
export let playerBombCount = 0;
export let playerShakeCount = 0;
export let tiedCards = []; // 뻑으로 묶인 카드 그룹 (2차원 배열)
export let playerScore = 0;
export let computerScore = 0;

// 판돈 관련 변수
export let playerMoney = 100000; // 플레이어 초기 자금
export let computerMoney = 0; // 컴퓨터 초기 자금 (스테이지 선택 시 설정)
const MONEY_PER_POINT = 1000; // 점수당 금액

// 룰렛 보너스 효과 (다음 라운드 한 판만 적용)
export let currentRoundBonusMultiplier = 1; // 점수 배율
export let currentRoundAddSsangpi = 0; // 추가 쌍피 수
export let currentRoundAddGwang = 0; // 추가 광 수
export let currentRoundWinMultiplier = 1; // 승리 시 점수 배율

// 추가 뒤집기 횟수
export let extraFlipsRemaining = 0;
export let extraFlipOwner = null; // 추가 뒤집기 기회를 가진 플레이어 ('player', 'computer', or null)

// 추가 뒤집기 소유자 설정
export function setExtraFlipOwner(owner) {
    extraFlipOwner = owner;
}

// 컴퓨터 판돈 설정
export function setComputerMoney(amount) {
    computerMoney = amount;
}

// --- 함수들 ---

// 판돈 초기화
export function setInitialMoney(stageInitialMoney) {
    computerMoney = stageInitialMoney;
}

// 덱 생성
export function createDeck(CARDS) {
	deck = [...CARDS];
}

// 덱 섞기
export function shuffleDeck() {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
}

// 카드 분배
export function dealCards(CARDS) {
    playerHand = [];
    computerHand = [];
    fieldCards = [];
    playerAcquired = [];
    computerAcquired = [];
    playerGoCount = 0;
    playerBombCount = 0;
    playerShakeCount = 0;
    tiedCards = [];
    deck = [...CARDS];
    shuffleDeck();

    // 룰렛 보너스 초기화 (다음 라운드에만 적용되므로 매 라운드 시작 시 초기화)
    currentRoundBonusMultiplier = 1;
    currentRoundAddSsangpi = 0;
    currentRoundAddGwang = 0;
    currentRoundWinMultiplier = 1;
    extraFlipsRemaining = 0; // 추가 뒤집기 횟수 초기화

	for (let i = 0; i < 10; i++) {
		playerHand.push(deck.pop());
		computerHand.push(deck.pop());
	}
	for (let i = 0; i < 8; i++) {
		fieldCards.push(deck.pop());
	}
}

// 카드 획득 처리
export function acquireCards(turn, ...cardsToAcquire) {
    const allCards = cardsToAcquire.filter(c => c); // null/undefined 카드 제거

    if (turn === 'computer') {
        allCards.forEach(card => computerAcquired.push(card));
    } else {
        allCards.forEach(card => playerAcquired.push(card));
    }

    fieldCards = fieldCards.filter(fieldCard => !allCards.some(ac => ac.id === fieldCard.id));
}

// 상대방 피 가져오기
export function takePiFromOpponent(taker) {
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
        return true; // 피를 가져왔음을 알림
    }
    return false;
}

// 점수 계산
export function calculateScore(acquiredCards) {
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

    if (hongdan.length === 3) { score += 3; breakdown.push("홍단 (3점)"); }
    if (cheongdan.length === 3) { score += 3; breakdown.push("청단 (3점)"); }
    if (chodan.length === 3) { score += 3; breakdown.push("초단 (3점)"); }

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

    // 룰렛 보너스 적용 (점수 배율)
    score *= currentRoundBonusMultiplier;
    if (currentRoundBonusMultiplier > 1) {
        breakdown.push(`룰렛 보너스: 점수 ${currentRoundBonusMultiplier}배`);
    }

    return { score, breakdown };
}

// 라운드 종료 후 판돈 계산
export function calculateMoney(winner, finalScore) {
    const moneyToTransfer = finalScore * MONEY_PER_POINT;
    if (winner === 'player') {
        playerMoney += moneyToTransfer;
        computerMoney -= moneyToTransfer;
    } else {
        playerMoney -= moneyToTransfer;
        computerMoney += moneyToTransfer;
    }
    return moneyToTransfer;
}

// 턴 종료 후 플레이어 점수 업데이트
export function updatePlayerScore() {
    const scoreInfo = calculateScore(playerAcquired);
    playerScore = scoreInfo.score;
    return scoreInfo;
}

// 턴 종료 후 컴퓨터 점수 업데이트
export function updateComputerScore() {
    const scoreInfo = calculateScore(computerAcquired);
    computerScore = scoreInfo.score;
    return scoreInfo;
}

// 점수 직접 설정 함수
export function setPlayerScore(score) {
    playerScore = score;
}

export function setComputerScore(score) {
    computerScore = score;
}

// 상태 변수를 업데이트하는 함수들
export function setPlayerHand(newHand) { playerHand = newHand; }
export function setComputerHand(newHand) { computerHand = newHand; }
export function setFieldCards(newCards) { fieldCards = newCards; }
export function setTiedCards(newCards) { tiedCards = newCards; }
export function incrementPlayerGo() { playerGoCount++; }
export function incrementPlayerBomb() { playerBombCount++; }
export function incrementPlayerShake() { playerShakeCount++; }

// 룰렛 보너스 설정 함수
export function setRouletteBonus(type, value) {
    switch (type) {
        case "multiplier":
            currentRoundBonusMultiplier = value;
            break;
        case "addSsangpi":
            currentRoundAddSsangpi = value;
            break;
        case "addGwang":
            currentRoundAddGwang = value;
            break;
        case "nextRoundScoreX2":
            currentRoundWinMultiplier = value;
            break;
    }
}

// 추가 뒤집기 횟수 설정
export function setExtraFlips(count) {
    extraFlipsRemaining = count;
}

export function getExtraFlipsRemaining() {
    return extraFlipsRemaining;
}

export function decrementExtraFlips() {
    if (extraFlipsRemaining > 0) {
        extraFlipsRemaining--;
    }
}

export function deductPlayerMoney(amount) {
    if (playerMoney >= amount) {
        playerMoney -= amount;
        return true;
    }
    return false;
}

// --- 데이터 저장 및 불러오기 ---
export let unlockedStages = [1]; // 기본적으로 스테이지 1은 해제됨

export function saveGameData() {
    const data = {
        playerMoney: playerMoney,
        unlockedStages: unlockedStages
    };
    localStorage.setItem('goStopSaveData', JSON.stringify(data));
}

export function loadGameData() {
    const savedData = localStorage.getItem('goStopSaveData');
    if (savedData) {
        const data = JSON.parse(savedData);
        playerMoney = data.playerMoney;
        unlockedStages = data.unlockedStages;
    } else {
        // 기본값 설정
        playerMoney = 100000;
        unlockedStages = [1];
    }
}