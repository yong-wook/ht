
import { CARDS, SHOWTIME_RESPIN_COST } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';
import * as Stage from './stage.js';
import * as Roulette from './roulette.js';
import * as Showtime from './showtime.js';
import * as ShowtimeCardSelect from './showtime_card_select.js';
import { checkChongtong } from './game_logic.js';
import { playerPlay } from './turn_manager.js';
import { initializeEventListeners } from './event_handlers.js';

const startScreen = document.getElementById('start-screen');
const titleImage = document.getElementById('title-image'); // titleImage 참조 추가
const stageSelectionContainer = document.getElementById('stage-selection');
const gameContainer = document.getElementById('game-container');
const openingCrawl = document.getElementById('opening-crawl');
const skipButton = document.getElementById('skip-button');

let hasUsedExtraFlipThisTurn = false; // 현재 턴에 추가 뒤집기를 사용했는지 여부

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
    if (Game.currentRouletteReward) {
        applyRouletteReward(Game.currentRouletteReward);
        Game.setCurrentRouletteReward(null); // 보상 적용 후 초기화
    }

    // 총통 확인
    if (checkChongtong()) {
        return; // 총통으로 게임 즉시 종료
    }

    // 흔들기 확인 로직 제거 (turn_manager.js의 playerPlay에서 처리)

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
export function updateFullBoard() {
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

// --- 게임 종료 처리 (쇼타임 또는 다음 라운드) ---
export function handleGameEnd() {
    // 컴퓨터 판돈이 0 이하가 되면 쇼타임
    if (Game.computerMoney <= 0) {
        gameContainer.style.display = 'none';
        // 쇼타임 룰렛 아이템 준비
        const stage = Stage.getSelectedStage();
        const showtimeImages = [];
        for (let i = 1; i <= 12; i++) {
            showtimeImages.push({
                name: `배경 ${i}`,
                id: i,
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
                UI.showModal("알림", `재화가 부족합니다! (필요: ${SHOWTIME_RESPIN_COST.toLocaleString()}원)`);
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
        UI.showModal("게임 오버", "파산했습니다... 게임 오버!", () => {
            startScreen.style.display = 'block';
            location.reload();
        });
    } else {
        // 판돈이 남아있으면 다음 라운드 시작
        initGame();
    }
}

// --- 애플리케이션 시작 ---
function initializeApp() {
    Game.loadGameData();
    UI.updateTotalMoneyDisplay(Game.playerMoney); // 소지금 표시

    const dontShowAgainCheckbox = document.getElementById('dont-show-again-checkbox');

    const showStageSelect = () => {
        openingCrawl.style.display = 'none';
        stageSelectionContainer.style.display = 'block';
        Stage.initStageSelection(startGame);
    };

    const handleIntroEnd = () => {
        if (dontShowAgainCheckbox.checked) {
            Game.setSkipIntro(true);
        }
        showStageSelect();
    };

    if (Game.skipIntro) {
        startScreen.style.display = 'none';
        showStageSelect();
    } else {
        titleImage.addEventListener('click', () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => console.log(err));
            }

            startScreen.style.display = 'none';
            openingCrawl.style.display = 'flex';

            const crawlText = openingCrawl.querySelector('.crawl-text');
            crawlText.addEventListener('animationend', handleIntroEnd, { once: true });
            skipButton.addEventListener('click', () => {
                crawlText.style.animationPlayState = 'paused';
                handleIntroEnd();
            }, { once: true });
        });
    }

    initializeEventListeners();
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

    // 치트키: Shift + M 키를 누르면 돈 10만냥 추가
    if (event.shiftKey && (event.key === 'M' || event.key === 'm')) {
        console.log('치트키 발동: 돈 증가');
        Game.setPlayerMoney(Game.playerMoney + 100000);
        UI.updateTotalMoneyDisplay(Game.playerMoney);
        Game.saveGameData();
        alert('치트키: 100,000냥 획득!');
    }
});
