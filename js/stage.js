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
                <img src="${stage.image}" alt="${stage.name}">
                <h3>${stage.name}</h3>
                <p>판돈: ${stage.initialMoney.toLocaleString()}원</p>
            `;
            stageElement.addEventListener('click', () => {
                selectedStage = stage;
                onStageSelect(stage);
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
                        UI.updateTotalMoneyDisplay(Game.playerMoney); // 소지금 UI 업데이트
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