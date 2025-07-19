import { STAGES } from './config.js';

let selectedStage = null;

export function initStageSelection(onStageSelect) {
    const stageContainer = document.getElementById('stage-container');
    stageContainer.innerHTML = ''; // 이전 내용 초기화

    STAGES.forEach(stage => {
        const stageElement = document.createElement('div');
        stageElement.classList.add('stage-character');
        stageElement.innerHTML = `
            <img src="${stage.image}" alt="${stage.name}">
            <h3>${stage.name}</h3>
            <p>판돈: ${stage.initialMoney.toLocaleString()}원</p>
        `;
        stageElement.addEventListener('click', () => {
            selectedStage = stage;
            onStageSelect(stage);
        });
        stageContainer.appendChild(stageElement);
    });
}

export function getSelectedStage() {
    return selectedStage;
}
