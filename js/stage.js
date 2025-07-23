import { STAGES } from './config.js';
import * as Game from './game.js';
import * as UI from './ui.js';

let selectedStage = null;

export function initStageSelection(onStageSelect) {
    const stageContainer = document.getElementById('stage-container');
    stageContainer.innerHTML = ''; // 이전 내용 초기화

    STAGES.forEach(stage => {
        const stageElement = document.createElement('div');
        stageElement.classList.add('stage-character');

        const isUnlocked = Game.unlockedStages.includes(stage.id);

        if (isUnlocked) {
            stageElement.innerHTML = `
                <img src="${stage.image}" alt="${stage.name}" class="stage-image">
                <h3>${stage.name}</h3>
                <p>판돈: ${stage.initialMoney.toLocaleString()}원</p>
                <button class="gallery-button">배경 컬렉션</button>
            `;
            // 스테이지 선택 (이미지 클릭)
            stageElement.querySelector('.stage-image').addEventListener('click', (e) => {
                e.stopPropagation(); // 버튼 클릭으로 이벤트 전파 방지
                selectedStage = stage;
                onStageSelect(stage);
            });
            // 갤러리 버튼 클릭
            stageElement.querySelector('.gallery-button').addEventListener('click', (e) => {
                e.stopPropagation(); // 스테이지 선택 이벤트 방지
                UI.showBackgroundGallery(stage.id, stage.name);
            });
        } else {
            stageElement.classList.add('locked');
            stageElement.innerHTML = `
                <img src="${stage.image}" alt="${stage.name}" style="filter: grayscale(100%);">
                <h3>${stage.name}</h3>
                <p>해제 비용: ${stage.cost.toLocaleString()}원</p>
                <div class="lock-icon">&#128274;</div>
            `;
            stageElement.addEventListener('click', () => {
                if (Game.playerMoney >= stage.cost) {
                    if (confirm(`${stage.name} 스테이지를 해제하시겠습니까?\n비용: ${stage.cost.toLocaleString()}원`)) {
                        Game.setPlayerMoney(Game.playerMoney - stage.cost);
                        UI.updateTotalMoneyDisplay(Game.playerMoney);
                        Game.unlockedStages.push(stage.id);
                        Game.saveGameData();
                        initStageSelection(onStageSelect); // UI 갱신
                    }
                } else {
                    alert("돈이 부족합니다.");
                }
            });
        }
        stageContainer.appendChild(stageElement);
    });
}

export function getSelectedStage() {
    return selectedStage;
}