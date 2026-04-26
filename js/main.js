
import { CARDS, BG_AUCTION_PRICES } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';
import * as Stage from './stage.js';
import * as Board from './board.js';
import * as Roulette from './roulette.js';
import * as Showtime from './showtime.js';
import * as HighLow from './highlow.js';
import { checkChongtong } from './game_logic.js';
import { playerPlay } from './turn_manager.js';
import { initializeEventListeners } from './event_handlers.js';
import { audioManager, BGM, SFX, initAudioUI } from './audio.js';

const startScreen = document.getElementById('start-screen');
const titleImage = document.getElementById('title-image');
const boardContainer = document.getElementById('board-container');
const gameContainer = document.getElementById('game-container');
const openingCrawl = document.getElementById('opening-crawl');
const skipButton = document.getElementById('skip-button');

let hasUsedExtraFlipThisTurn = false; // 현재 턴에 추가 뒤집기를 사용했는지 여부

// --- 게임 시작 ---
function startGame(stage) {
    boardContainer.style.display = 'none';
    gameContainer.style.display = 'block';

    audioManager.playBgm(BGM.GAME);
    if (Game.boardEncounterMode) {
        // 보드 단판 모드: moneyPerPoint는 bet 선택에서 이미 설정됨, computerMoney는 더미값
        Game.setComputerMoney(999999999);
    } else {
        Game.setInitialMoney(stage.initialMoney, stage.moneyPerPoint);
    }

    UI.setOpponentNameDisplay(Game.opponentName);
    UI.updateMoneyDisplay(Game.playerMoney, Game.moneyPerPoint);

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
        computerMoney: Game.computerMoney,
        moneyPerPoint: Game.moneyPerPoint
    };
    UI.updateBoard(gameState, playerPlay);
}

// --- 쇼타임 진입 공통 로직 ---
function enterShowtime(stage) {
    const stageKey = stage.id.toString();
    if (!Game.unlockedBackgrounds[stageKey]) Game.unlockedBackgrounds[stageKey] = [];

    const unlockedBgIds = Game.unlockedBackgrounds[stageKey];
    let nextBgId = null;
    for (let i = 1; i <= 12; i++) {
        if (!unlockedBgIds.includes(i)) { nextBgId = i; break; }
    }

    audioManager.playBgm(BGM.SHOWTIME);

    const buildImagePath = (bgId) =>
        `images/stages/stage${stage.id}/showtime_bg_stage${stage.id}_${String(bgId).padStart(2, '0')}.jpg`;

    const goToShowtime = (unlock, imagePathOverride) => {
        const imagePath = imagePathOverride || buildImagePath(nextBgId || 1);
        let collectionBonus = 0;
        if (unlock && nextBgId && !unlockedBgIds.includes(nextBgId)) {
            const prevCount = unlockedBgIds.length;
            unlockedBgIds.push(nextBgId);
            if (prevCount === 11) {
                collectionBonus = stage.collectionBonus || 0;
                Game.setPlayerMoney(Game.playerMoney + collectionBonus);
                UI.updateTotalMoneyDisplay(Game.playerMoney);
            }
            Game.saveGameData();
        }

        Showtime.showShowtime(() => {
            Showtime.hideShowtime();
            audioManager.playBgm(BGM.LOBBY);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            const returnToBoard = () => {
                boardContainer.style.display = 'block';
                Board.startNewTurn();
            };
            if (collectionBonus > 0) {
                UI.showModal(
                    '컬렉션 완성!',
                    `${stage.name}의 모든 배경을 수집했습니다!\n보너스 지급: +${collectionBonus.toLocaleString()}원`,
                    returnToBoard
                );
            } else {
                returnToBoard();
            }
        }, stage, imagePath, null, null, true);
    };

    const offerAuction = () => {
        if (!nextBgId) { goToShowtime(false); return; }
        // 소지금의 50%~100% (배경 번호에 비례), 최소 1,000원
        const pct = 0.50 + (nextBgId - 1) / 11 * 0.50;
        const price = Math.max(1000, Math.round(Game.playerMoney * pct / 1000) * 1000);
        UI.showModal(
            '도전 실패',
            `배경 No.${nextBgId}을(를) 획득하지 못했습니다.\n소지금의 ${Math.round(pct * 100)}%(${price.toLocaleString()}원)에 구매하시겠습니까?`,
            () => {
                if (Game.deductPlayerMoney(price)) {
                    Game.saveGameData();
                    UI.updateTotalMoneyDisplay(Game.playerMoney);
                    goToShowtime(true);
                } else {
                    UI.showModal('알림', '돈이 부족합니다.', () => goToShowtime(false));
                }
            },
            () => goToShowtime(false)
        );
    };

    if (!nextBgId) {
        // 전체 수집 완료: 갤러리에서 감상할 배경 직접 선택
        UI.showBackgroundGallery(
            stage.id,
            stage.characterName,
            (selectedPath) => {
                document.getElementById('gallery-modal').style.display = 'none';
                goToShowtime(false, selectedPath);
            },
            0,
            true  // selectMode: "선택" 버튼 + 확인 없이 바로 진행
        );
    } else {
        HighLow.showHighLow(nextBgId, (won) => {
            if (won) goToShowtime(true);
            else offerAuction();
        });
    }
}

// --- 게임 종료 처리 ---
export function handleGameEnd() {
    // ── 보드 게임 단판 승부 모드 ────────────────────────────────────
    if (Game.boardEncounterMode) {
        Game.setBoardEncounterMode(false);
        // 고액 승부 등으로 moneyPerPoint가 변경된 경우 레벨 기준값으로 복원
        Game.setMoneyPerPointLevel(Game.moneyPerPointLevel);
        const stage = Stage.getSelectedStage();

        // 파산 체크 (보드 모드에서도 파산은 게임 오버)
        if (Game.playerMoney <= 0) {
            gameContainer.style.display = 'none';
            audioManager.playBgm(BGM.LOBBY);
            UI.showModal('게임 오버', '파산했습니다... 게임 오버!', () => {
                startScreen.style.display = 'block';
                location.reload();
            });
            return;
        }

        if (Game.lastRoundWinner === 'player') {
            // 승리 → 쇼타임 (배경 해금 도전)
            gameContainer.style.display = 'none';
            enterShowtime(stage);
        } else if (Game.lastRoundWinner === 'computer') {
            // 패배 → 보드 복귀
            gameContainer.style.display = 'none';
            audioManager.playBgm(BGM.LOBBY);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            UI.showModal(
                '패배',
                `${stage.characterName}에게 졌습니다.\n다음 기회를 노리세요.`,
                () => { boardContainer.style.display = 'block'; Board.startNewTurn(); }
            );
        } else {
            // 무승부 → 보드 복귀 (돈 변동 없음)
            gameContainer.style.display = 'none';
            audioManager.playBgm(BGM.LOBBY);
            UI.updateTotalMoneyDisplay(Game.playerMoney);
            boardContainer.style.display = 'block';
            Board.startNewTurn();
        }
        return;
    }

    // ── 기존 모드 (컴퓨터 판돈 소진 = 쇼타임) ──────────────────────
    if (Game.computerMoney <= 0) {
        // 기존 방식 (비보드 모드): 컴퓨터 파산 → 쇼타임
        gameContainer.style.display = 'none';
        enterShowtime(Stage.getSelectedStage());

    } else if (Game.playerMoney <= 0) {
        // 플레이어 파산 처리
        gameContainer.style.display = 'none';
        audioManager.playBgm(BGM.LOBBY);
        UI.showModal("게임 오버", "파산했습니다... 게임 오버!", () => {
            startScreen.style.display = 'block';
            location.reload();
        });
    } else {
        // 판돈이 남아있으면 다음 라운드 시작
        initGame();
    }
}

// 보드로 복귀 (고스톱이 끝나고 컴퓨터 판돈이 아직 남아있을 때 사용 안 되지만 예비용)
function returnToBoard() {
    gameContainer.style.display = 'none';
    audioManager.playBgm(BGM.LOBBY);
    boardContainer.style.display = 'block';
    Board.startNewTurn();
}

// --- 애플리케이션 시작 ---
function initializeApp() {
    Game.loadGameData();
    UI.updateTotalMoneyDisplay(Game.playerMoney); // 소지금 표시

    const dontShowAgainCheckbox = document.getElementById('dont-show-again-checkbox');

    const showBoard = () => {
        openingCrawl.style.display = 'none';
        boardContainer.style.display = 'block';
        Board.initBoard(startGame);
    };

    const handleIntroEnd = () => {
        if (dontShowAgainCheckbox.checked) {
            Game.setSkipIntro(true);
        }
        showBoard();
    };

    if (Game.skipIntro) {
        startScreen.style.display = 'none';
        showBoard();
    } else {
        titleImage.addEventListener('click', () => {
            audioManager.playBgm(BGM.LOBBY);
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

    initAudioUI();
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

    // 치트키: Shift + C 키를 누르면 컬렉션 초기화
    if (event.shiftKey && (event.key === 'C' || event.key === 'c')) {
        console.log('치트키 발동: 컬렉션 초기화');
        for (const key in Game.unlockedBackgrounds) {
            Game.unlockedBackgrounds[key] = [];
        }
        Game.saveGameData();
        alert('치트키: 컬렉션 초기화 완료!');
    }
});
