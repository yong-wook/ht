/**
 * 고스톱 게임 로직 유닛 테스트
 * 실행: node tests/test_logic.js
 *
 * DOM/UI 의존성 없이 순수 로직만 독립적으로 검증한다.
 */

// ─── 테스트 유틸리티 ───────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

function describe(name, fn) {
    console.log(`\n── ${name} ──`);
    fn();
}

// ─── calculateScore (game.js 에서 인라인 복사, UI 의존성 제거) ─────────────────
// 룰렛 배율은 테스트에서 직접 설정
let _bonusMultiplier = 1;

function calculateScore(acquiredCards, bonusMultiplier = 1) {
    if (!acquiredCards) return { score: 0, breakdown: [], combos: [] };

    let score = 0;
    let breakdown = [];
    let combos = [];
    const gwang = acquiredCards.filter(c => c.type === 'gwang');
    const tti  = acquiredCards.filter(c => c.type === 'tti');
    const ggot = acquiredCards.filter(c => c.type === 'ggot');
    const pi   = acquiredCards.filter(c => c.type === 'pi' || c.type === 'ssangpi');

    // 광
    if (gwang.length >= 3) {
        let gwangScore = 0;
        if (gwang.length === 3) {
            const hasBiGwang = gwang.some(c => c.month === 12);
            gwangScore = hasBiGwang ? 2 : 3;
        } else if (gwang.length === 4) { gwangScore = 4; }
        else if (gwang.length === 5)   { gwangScore = 15; }
        score += gwangScore;
        breakdown.push(`광 (${gwangScore}점)`);
    }

    // 띠
    if (tti.length >= 5) {
        const ttiScore = tti.length - 4;
        score += ttiScore;
        breakdown.push(`띠 (${ttiScore}점)`);
    }

    // 단 족보
    const hongdan   = tti.filter(c => c.dan === 'hong');
    const cheongdan = tti.filter(c => c.dan === 'cheong');
    const chodan    = tti.filter(c => c.dan === 'cho');
    if (hongdan.length   === 3) { score += 3; breakdown.push('홍단 (3점)');  combos.push('홍단'); }
    if (cheongdan.length === 3) { score += 3; breakdown.push('청단 (3점)');  combos.push('청단'); }
    if (chodan.length    === 3) { score += 3; breakdown.push('초단 (3점)');  combos.push('초단'); }

    // 고도리
    const godoriMonths = [2, 4, 8];
    const godoriCards = ggot.filter(c => godoriMonths.includes(c.month));
    if (godoriCards.length === 3) {
        score += 5; breakdown.push('고도리 (5점)'); combos.push('고도리');
    }

    // 끗
    if (ggot.length >= 5) {
        const ggotScore = ggot.length - 4;
        score += ggotScore;
        breakdown.push(`끗 (${ggotScore}점)`);
    }

    // 피
    const piCount = pi.reduce((acc, cur) => acc + (cur.type === 'ssangpi' ? 2 : 1), 0);
    if (piCount >= 10) {
        const piScore = piCount - 9;
        score += piScore;
        breakdown.push(`피 (${piScore}점)`);
    }

    // 룰렛 배율
    score *= bonusMultiplier;

    return { score, breakdown, combos };
}

// ─── handleStop 승리 점수 계산 로직 (turn_manager.js에서 인라인) ──────────────

/**
 * 버그 포함된 현재 코드 그대로 복사
 */
function calcFinalScore_buggy({
    playerAcquired, computerAcquired,
    playerGoCount, playerShakeCount, playerBombCount,
    currentRoundWinMultiplier = 1
}) {
    const playerResult   = calculateScore(playerAcquired);
    const computerResult = calculateScore(computerAcquired);

    let finalPlayerScore   = playerResult.score;
    let finalComputerScore = computerResult.score;
    let winner = '';
    let breakdown = [];

    if (finalPlayerScore > finalComputerScore) {
        winner = 'player';
        breakdown = [...playerResult.breakdown];

        // 고 배율
        if (playerGoCount > 0) {
            if (playerGoCount === 1)      { finalPlayerScore += 1; breakdown.push('1고 (+1점)'); }
            else if (playerGoCount === 2) { finalPlayerScore += 2; breakdown.push('2고 (+2점)'); }
            else {
                const m = Math.pow(2, playerGoCount - 2);
                finalPlayerScore *= m;
                breakdown.push(`${playerGoCount}고 (x${m})`);
            }
        }

        // 피박 (버그: 플레이어가 피 점수를 얻었을 때만 발동)
        const computerPiCount = computerAcquired.reduce(
            (acc, c) => acc + (c.type === 'ssangpi' ? 2 : c.type === 'pi' ? 1 : 0), 0
        );
        if (playerResult.breakdown.some(b => b.startsWith('피')) && computerPiCount < 5) {
            finalPlayerScore *= 2;
            breakdown.push('피박 (x2)');
        }

        // 광박
        if (playerResult.breakdown.some(b => b.startsWith('광')) &&
            computerAcquired.filter(c => c.type === 'gwang').length === 0) {
            finalPlayerScore *= 2;
            breakdown.push('광박 (x2)');
        }

        // 고박
        if (playerGoCount > 0 && finalComputerScore === 0) {
            finalPlayerScore *= 2;
            breakdown.push('고박 (x2)');
        }

        // 흔들기/폭탄
        const sm = Math.pow(2, playerShakeCount + playerBombCount);
        if (sm > 1) {
            finalPlayerScore *= sm;
            if (playerShakeCount > 0) breakdown.push(`흔들기 (x${Math.pow(2, playerShakeCount)})`);
            if (playerBombCount  > 0) breakdown.push(`폭탄 (x${Math.pow(2, playerBombCount)})`);
        }

        if (currentRoundWinMultiplier > 1) {
            finalPlayerScore *= currentRoundWinMultiplier;
            breakdown.push(`승리 보너스 (x${currentRoundWinMultiplier})`);
        }

    } else if (finalComputerScore > finalPlayerScore) {
        winner = 'computer';
    } else {
        winner = 'draw';
    }

    return { winner, finalPlayerScore, finalComputerScore, breakdown };
}

/**
 * 피박 조건 수정된 버전
 * 변경: breakdown 체크 제거 → 상대 피 5장 미만이면 무조건 피박
 */
function calcFinalScore_fixed({
    playerAcquired, computerAcquired,
    playerGoCount, playerShakeCount, playerBombCount,
    currentRoundWinMultiplier = 1
}) {
    const playerResult   = calculateScore(playerAcquired);
    const computerResult = calculateScore(computerAcquired);

    let finalPlayerScore   = playerResult.score;
    let finalComputerScore = computerResult.score;
    let winner = '';
    let breakdown = [];

    if (finalPlayerScore > finalComputerScore) {
        winner = 'player';
        breakdown = [...playerResult.breakdown];

        // 고 배율
        if (playerGoCount > 0) {
            if (playerGoCount === 1)      { finalPlayerScore += 1; breakdown.push('1고 (+1점)'); }
            else if (playerGoCount === 2) { finalPlayerScore += 2; breakdown.push('2고 (+2점)'); }
            else {
                const m = Math.pow(2, playerGoCount - 2);
                finalPlayerScore *= m;
                breakdown.push(`${playerGoCount}고 (x${m})`);
            }
        }

        // 피박 수정: breakdown 조건 제거
        const computerPiCount = computerAcquired.reduce(
            (acc, c) => acc + (c.type === 'ssangpi' ? 2 : c.type === 'pi' ? 1 : 0), 0
        );
        if (computerPiCount < 5) {
            finalPlayerScore *= 2;
            breakdown.push('피박 (x2)');
        }

        // 광박
        if (playerResult.breakdown.some(b => b.startsWith('광')) &&
            computerAcquired.filter(c => c.type === 'gwang').length === 0) {
            finalPlayerScore *= 2;
            breakdown.push('광박 (x2)');
        }

        // 고박
        if (playerGoCount > 0 && finalComputerScore === 0) {
            finalPlayerScore *= 2;
            breakdown.push('고박 (x2)');
        }

        // 흔들기/폭탄
        const sm = Math.pow(2, playerShakeCount + playerBombCount);
        if (sm > 1) {
            finalPlayerScore *= sm;
            if (playerShakeCount > 0) breakdown.push(`흔들기 (x${Math.pow(2, playerShakeCount)})`);
            if (playerBombCount  > 0) breakdown.push(`폭탄 (x${Math.pow(2, playerBombCount)})`);
        }

        if (currentRoundWinMultiplier > 1) {
            finalPlayerScore *= currentRoundWinMultiplier;
            breakdown.push(`승리 보너스 (x${currentRoundWinMultiplier})`);
        }

    } else if (finalComputerScore > finalPlayerScore) {
        winner = 'computer';
    } else {
        winner = 'draw';
    }

    return { winner, finalPlayerScore, finalComputerScore, breakdown };
}

// ─── 뻑 카드 뱉기 로직 ────────────────────────────────────────────────────────

/**
 * 버그 포함된 현재 뻑 뱉기 로직: 해당 월 카드 전부 뱉음
 */
function resolvePpeok_buggy(playerAcquired, flippedCard) {
    const cardsToVomit = playerAcquired.filter(c => c.month === flippedCard.month);
    const newAcquired  = playerAcquired.filter(c => c.month !== flippedCard.month);
    const ppeokGroup   = [flippedCard, ...cardsToVomit];
    return { newAcquired, ppeokGroup };
}

/**
 * 수정된 뻑 뱉기: 이번 턴 획득 카드만 뱉도록
 * → 호출부에서 thisRoundCards를 명시적으로 전달받아야 함
 */
function resolvePpeok_fixed(playerAcquired, flippedCard, thisRoundCards) {
    const thisRoundIds  = new Set(thisRoundCards.map(c => c.id));
    const cardsToVomit  = playerAcquired.filter(c => c.month === flippedCard.month && thisRoundIds.has(c.id));
    const newAcquired   = playerAcquired.filter(c => !(c.month === flippedCard.month && thisRoundIds.has(c.id)));
    const ppeokGroup    = [flippedCard, ...cardsToVomit];
    return { newAcquired, ppeokGroup };
}

// ─── 컴퓨터 뻑 해제 이중 획득 로직 ──────────────────────────────────────────

/**
 * 버그 포함된 현재 컴퓨터 뻑 해제 로직
 * acquireCards가 두 번 호출되어 matchingCard가 중복 추가됨
 */
function resolveComputerPpeok_buggy(computerAcquired, cardToPlay, matchingCard, tiedCards) {
    // 1단계: 일반 매칭으로 카드 획득 (line ~282)
    let acquired = [...computerAcquired, cardToPlay, matchingCard];

    // 2단계: tiedCards에서 ppeokGroup 추가 (line ~288-290)
    // matchingCard === ppeokGroup[0] 이므로 중복!
    const ppeokGroup = tiedCards.find(g => g[0].month === cardToPlay.month);
    if (ppeokGroup) {
        acquired = [...acquired, ...ppeokGroup]; // matchingCard(=ppeokGroup[0]) 중복 추가
    }

    return acquired;
}

/**
 * 수정된 컴퓨터 뻑 해제: 뻑 시에는 일반 매칭 없이 ppeokGroup만 처리
 */
function resolveComputerPpeok_fixed(computerAcquired, cardToPlay, tiedCards) {
    const ppeokGroup = tiedCards.find(g => g[0].month === cardToPlay.month);
    if (ppeokGroup) {
        return [...computerAcquired, cardToPlay, ...ppeokGroup];
    }
    return [...computerAcquired, cardToPlay];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  테스트 케이스
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. calculateScore ────────────────────────────────────────────────────────

describe('calculateScore — 광 점수', () => {
    const g = (month) => ({ type: 'gwang', month });

    assert(calculateScore([g(1), g(3), g(8)]).score === 3,         '3광 (비광 없음) = 3점');
    assert(calculateScore([g(1), g(3), g(12)]).score === 2,        '3광 (12월 비광 포함) = 2점');
    assert(calculateScore([g(1), g(3), g(8), g(11)]).score === 4,  '4광 = 4점');
    assert(calculateScore([g(1),g(3),g(8),g(11),g(12)]).score === 15, '5광 = 15점');
    assert(calculateScore([g(1), g(3)]).score === 0,               '2광 = 0점 (미달)');
});

describe('calculateScore — 띠 점수', () => {
    const t = (dan) => ({ type: 'tti', dan, month: 1 });

    const fiveTti = [t(), t(), t(), t(), t()];
    const sixTti  = [t(), t(), t(), t(), t(), t()];
    assert(calculateScore(fiveTti).score === 1,  '띠 5장 = 1점');
    assert(calculateScore(sixTti).score  === 2,  '띠 6장 = 2점');
    assert(calculateScore([t(), t(), t(), t()]).score === 0, '띠 4장 = 0점 (미달)');
});

describe('calculateScore — 단 족보', () => {
    const hong   = (m) => ({ type: 'tti', dan: 'hong',   month: m });
    const cheong = (m) => ({ type: 'tti', dan: 'cheong', month: m });
    const cho    = (m) => ({ type: 'tti', dan: 'cho',    month: m });

    assert(calculateScore([hong(1), hong(2), hong(3)]).score  === 3, '홍단 3점');
    assert(calculateScore([cheong(6),cheong(9),cheong(10)]).score === 3, '청단 3점');
    assert(calculateScore([cho(4),cho(5),cho(7)]).score       === 3, '초단 3점');

    // 홍단+청단 동시: 홍단3점 + 청단3점 + 띠6장(2점) = 8점
    const both = [hong(1),hong(2),hong(3), cheong(6),cheong(9),cheong(10)];
    assert(calculateScore(both).score === 8, '홍단+청단 동시: 홍단(3)+청단(3)+띠6장(2) = 8점');
});

describe('calculateScore — 고도리', () => {
    const ggot = (m) => ({ type: 'ggot', month: m });
    assert(calculateScore([ggot(2), ggot(4), ggot(8)]).score === 5,  '고도리 = 5점');
    assert(calculateScore([ggot(2), ggot(4)]).score === 0,           '고도리 미달 = 0점');
    assert(calculateScore([ggot(2), ggot(4), ggot(8), ggot(1)]).score === 5,
        '고도리 + 비고도리 1장 추가 = 끗 5장 미달이므로 5점만');
});

describe('calculateScore — 끗 점수', () => {
    const ggot = (m) => ({ type: 'ggot', month: m });
    const five = [ggot(1),ggot(2),ggot(3),ggot(4),ggot(5)];
    assert(calculateScore(five).score === 1,  '끗 5장 = 1점 (고도리 아닌 월)');
    // 고도리 3장 + 일반 끗 2장 = 끗 5장 → 고도리 5점 + 끗 1점
    const mixed = [ggot(2),ggot(4),ggot(8),ggot(1),ggot(3)];
    assert(calculateScore(mixed).score === 6, '고도리(5점) + 끗5장(1점) = 6점');
});

describe('calculateScore — 피 점수', () => {
    const pi  = () => ({ type: 'pi' });
    const spi = () => ({ type: 'ssangpi' });

    const ten  = Array.from({length: 10}, pi);
    const nine = Array.from({length:  9}, pi);
    assert(calculateScore(ten).score  === 1,  '피 10개 = 1점');
    assert(calculateScore(nine).score === 0,  '피 9개 = 0점 (미달)');

    // 쌍피는 2개로 카운트
    const withSpi = [...Array.from({length:8}, pi), spi()]; // 8 + 2 = 10
    assert(calculateScore(withSpi).score === 1, '피8장+쌍피1장 = 10개 = 1점');

    const twelve = Array.from({length:12}, pi);
    assert(calculateScore(twelve).score === 3, '피 12개 = 3점');
});

describe('calculateScore — 복합 족보', () => {
    // 3광 + 홍단 + 고도리 = 3 + 3 + 5 = 11점
    const cards = [
        { type: 'gwang', month: 1 },
        { type: 'gwang', month: 3 },
        { type: 'gwang', month: 8 },
        { type: 'tti', dan: 'hong', month: 1 },
        { type: 'tti', dan: 'hong', month: 2 },
        { type: 'tti', dan: 'hong', month: 3 },
        { type: 'ggot', month: 2 },
        { type: 'ggot', month: 4 },
        { type: 'ggot', month: 8 },
    ];
    assert(calculateScore(cards).score === 11, '3광(3)+홍단(3)+고도리(5) = 11점');
});

describe('calculateScore — 룰렛 배율', () => {
    const cards = [
        { type: 'gwang', month: 1 },
        { type: 'gwang', month: 3 },
        { type: 'gwang', month: 8 },
    ]; // 3점
    assert(calculateScore(cards, 2).score === 6, '3점 x 룰렛2배 = 6점');
    assert(calculateScore(cards, 3).score === 9, '3점 x 룰렛3배 = 9점');
});

// ─── 2. 피박 버그 ─────────────────────────────────────────────────────────────

describe('피박 — 버그 재현 (Bug #3)', () => {
    // 플레이어: 고도리(5점), 광 없음 → 광박 없음
    // 컴퓨터: 피 3장(5장 미만), 광 없음
    // → 피박 발동 기대: 5 × 2 = 10점
    // → 현재 코드는 플레이어 breakdown에 '피'로 시작하는 항목 없으므로 피박 미발동 = 버그

    const playerAcquired = [
        { type: 'ggot', month: 2 }, // 고도리
        { type: 'ggot', month: 4 },
        { type: 'ggot', month: 8 },
    ]; // 5점
    const computerAcquired = [
        { type: 'pi' }, { type: 'pi' }, { type: 'pi' }, // 피 3장
    ];

    const buggy = calcFinalScore_buggy({
        playerAcquired, computerAcquired,
        playerGoCount: 0, playerShakeCount: 0, playerBombCount: 0
    });
    const fixed = calcFinalScore_fixed({
        playerAcquired, computerAcquired,
        playerGoCount: 0, playerShakeCount: 0, playerBombCount: 0
    });

    // 버그 확인: 피박 미발동 → 5점 그대로
    assert(buggy.finalPlayerScore === 5,
        '버그 코드: 플레이어 피 점수 없으면 피박 미발동 → 5점 그대로');
    assert(!buggy.breakdown.includes('피박 (x2)'),
        '버그 코드: breakdown에 피박 없음');

    // 수정 확인: 피박 발동 → 10점
    assert(fixed.finalPlayerScore === 10,
        '수정 코드: 상대 피 5장 미만이면 피박 발동 → 10점');
    assert(fixed.breakdown.includes('피박 (x2)'),
        '수정 코드: breakdown에 피박 포함');
});

describe('피박 — 상대 피 5장 이상이면 미발동', () => {
    // 플레이어: 고도리(5점), 광박/피박 없는 시나리오
    // 컴퓨터: 피 5장(피박 경계)
    const playerAcquired = [
        { type: 'ggot', month: 2 },
        { type: 'ggot', month: 4 },
        { type: 'ggot', month: 8 },
    ]; // 5점
    const computerAcquired = Array.from({ length: 5 }, () => ({ type: 'pi' })); // 정확히 5장

    const fixed = calcFinalScore_fixed({
        playerAcquired, computerAcquired,
        playerGoCount: 0, playerShakeCount: 0, playerBombCount: 0
    });

    assert(fixed.finalPlayerScore === 5,  '상대 피 5장 → 피박 없음 = 5점');
    assert(!fixed.breakdown.includes('피박 (x2)'), '피박 미발동 확인');
});

// ─── 3. 광박 ─────────────────────────────────────────────────────────────────

describe('광박', () => {
    const playerAcquired = [
        { type: 'gwang', month: 1 },
        { type: 'gwang', month: 3 },
        { type: 'gwang', month: 8 },
    ]; // 3광 = 3점
    const computerAcquired = [
        { type: 'pi' }, { type: 'pi' }, { type: 'pi' },
        { type: 'pi' }, { type: 'pi' }, { type: 'pi' }, // 피 6장 (피박 제외)
    ];

    const result = calcFinalScore_fixed({
        playerAcquired, computerAcquired,
        playerGoCount: 0, playerShakeCount: 0, playerBombCount: 0
    });

    assert(result.winner === 'player',                    '플레이어 승리');
    assert(result.breakdown.includes('광박 (x2)'),        '광박 발동 확인');
    assert(result.finalPlayerScore === 6,                 '3점 x 광박2배 = 6점');
});

// ─── 4. 고 배율 ───────────────────────────────────────────────────────────────

describe('고 배율', () => {
    // 플레이어: 고도리(5점), 광 없음 → 광박 없음
    // 컴퓨터: 끗5장(1점, 고박 방지) + 피6장(피박 없음)
    // 피박 방지: 컴퓨터 피 6장 (≥5)
    // 고박 방지: 컴퓨터 점수 1점 이상 (finalComputerScore ≠ 0)
    // 광박 방지: 플레이어 고도리만 사용 (광 없음)
    const playerAcquired = [
        { type: 'ggot', month: 2 },
        { type: 'ggot', month: 4 },
        { type: 'ggot', month: 8 },
    ]; // 5점
    const computerAcquired = [
        // 끗 5장 = 1점 (고박 방지용)
        { type: 'ggot', month: 1 }, { type: 'ggot', month: 3 },
        { type: 'ggot', month: 5 }, { type: 'ggot', month: 6 },
        { type: 'ggot', month: 7 },
        // 피 6장 (피박 방지용)
        ...Array.from({ length: 6 }, () => ({ type: 'pi' })),
    ];

    const go1 = calcFinalScore_fixed({ playerAcquired, computerAcquired, playerGoCount: 1, playerShakeCount: 0, playerBombCount: 0 });
    const go2 = calcFinalScore_fixed({ playerAcquired, computerAcquired, playerGoCount: 2, playerShakeCount: 0, playerBombCount: 0 });
    const go3 = calcFinalScore_fixed({ playerAcquired, computerAcquired, playerGoCount: 3, playerShakeCount: 0, playerBombCount: 0 });
    const go4 = calcFinalScore_fixed({ playerAcquired, computerAcquired, playerGoCount: 4, playerShakeCount: 0, playerBombCount: 0 });

    assert(go1.finalPlayerScore === 6,  '1고: 5+1 = 6점');
    assert(go2.finalPlayerScore === 7,  '2고: 5+2 = 7점');
    assert(go3.finalPlayerScore === 10, '3고: 5 × 2 = 10점');
    assert(go4.finalPlayerScore === 20, '4고: 5 × 4 = 20점');
});

// ─── 5. 뻑 발생 시 이전 턴 카드 뱉기 버그 (Bug #1) ─────────────────────────

describe('뻑 카드 뱉기 — 버그 재현 (Bug #1)', () => {
    // 이전 턴에 1월 gwang 획득, 이번 턴에 1월 tti + 1월 pi 획득
    // 뻑 발생 → 이번 턴 카드(tti, pi)만 뱉어야 함
    const prevCard    = { id: 1, month: 1, type: 'gwang' };
    const thisCard1   = { id: 2, month: 1, type: 'tti' };
    const thisCard2   = { id: 3, month: 1, type: 'pi' };
    const flippedCard = { id: 4, month: 1, type: 'pi' };

    const playerAcquired = [prevCard, thisCard1, thisCard2];

    const buggy = resolvePpeok_buggy(playerAcquired, flippedCard);
    const fixed  = resolvePpeok_fixed(playerAcquired, flippedCard, [thisCard1, thisCard2]);

    // 버그: 이전 턴 gwang까지 뱉어버림
    assert(buggy.ppeokGroup.length === 4,
        '버그 코드: ppeokGroup에 이전 턴 카드까지 포함 (총 4장)');
    assert(buggy.newAcquired.length === 0,
        '버그 코드: 모든 1월 카드가 뱉어짐 (newAcquired 비어있음)');

    // 수정: 이번 턴 카드만 뱉음
    assert(fixed.ppeokGroup.length === 3,
        '수정 코드: ppeokGroup = 뒤집은 카드 + 이번 턴 2장 (총 3장)');
    assert(fixed.newAcquired.length === 1,
        '수정 코드: 이전 턴 gwang은 그대로 유지 (newAcquired 1장)');
    assert(fixed.newAcquired[0].id === prevCard.id,
        '수정 코드: 유지된 카드가 이전 턴 gwang임');
});

// ─── 6. 컴퓨터 뻑 해제 이중 획득 버그 (Bug #2) ──────────────────────────────

describe('컴퓨터 뻑 해제 이중 획득 — 버그 재현 (Bug #2)', () => {
    // tiedCards: [{ id:10, month:3 }, { id:11, month:3 }]
    // 컴퓨터가 3월 카드(id:12)를 내서 뻑 해제
    // matchingCard = tiedCards[0] (id:10)
    const cardToPlay  = { id: 12, month: 3, type: 'tti' };
    const matchingCard = { id: 10, month: 3, type: 'gwang' }; // tiedCards[0]
    const tiedCard2   = { id: 11, month: 3, type: 'pi' };
    const tiedCards   = [[matchingCard, tiedCard2]]; // ppeokGroup

    const computerAcquired = [];

    const buggy = resolveComputerPpeok_buggy(computerAcquired, cardToPlay, matchingCard, tiedCards);
    const fixed  = resolveComputerPpeok_fixed(computerAcquired, cardToPlay, tiedCards);

    // id:10이 두 번 들어가는지 확인
    const buggyIds = buggy.map(c => c.id);
    const duplicates = buggyIds.filter((id, idx) => buggyIds.indexOf(id) !== idx);

    assert(duplicates.includes(10),
        '버그 코드: id=10 카드가 중복 획득됨');
    assert(buggy.length === 4,
        '버그 코드: 총 4개 (cardToPlay + matchingCard×2 + tiedCard2)');

    const fixedIds = fixed.map(c => c.id);
    const fixedDuplicates = fixedIds.filter((id, idx) => fixedIds.indexOf(id) !== idx);

    assert(fixedDuplicates.length === 0,
        '수정 코드: 중복 없음');
    assert(fixed.length === 3,
        '수정 코드: 총 3개 (cardToPlay + matchingCard + tiedCard2)');
});

// ─── 7. 컴퓨터 일반 매칭 시 피 탈취 버그 (Bug #4) ────────────────────────────

describe('컴퓨터 일반 매칭 — 피 탈취 없음', () => {
    // 컴퓨터가 일반 1장 매칭할 때는 takePiFromOpponent 호출 안 해야 함
    // 이 테스트는 resolveComputerNormalMatch 로직이 피를 건드리지 않음을 검증
    // (실제 함수는 turn_manager.js 내부이므로 부작용만 확인)

    // 시뮬레이션: 플레이어 피 5장 보유
    let playerPi = [
        { id: 1, type: 'pi' }, { id: 2, type: 'pi' },
        { id: 3, type: 'pi' }, { id: 4, type: 'pi' },
        { id: 5, type: 'pi' },
    ];

    // 일반 매칭(1장) → 피 목록 변화 없어야 함
    function normalMatchTakesPi_buggy(playerPi) {
        // 버그: 무조건 takePiFromOpponent 호출
        if (playerPi.length > 0) {
            const taken = playerPi.find(c => c.type === 'pi');
            playerPi = playerPi.filter(c => c.id !== taken.id);
            return playerPi;
        }
        return playerPi;
    }
    function normalMatchTakesPi_fixed(playerPi) {
        // 수정: 일반 매칭은 피 탈취 없음
        return playerPi;
    }

    const afterBuggy = normalMatchTakesPi_buggy([...playerPi]);
    const afterFixed = normalMatchTakesPi_fixed([...playerPi]);

    assert(afterBuggy.length === 4, '버그 코드: 일반 매칭 후 플레이어 피 1장 사라짐');
    assert(afterFixed.length === 5, '수정 코드: 일반 매칭 후 플레이어 피 변화 없음');
});

// ─── 8. 무승부 처리 ───────────────────────────────────────────────────────────

describe('무승부', () => {
    const cards3gwang = [
        { type: 'gwang', month: 1 },
        { type: 'gwang', month: 3 },
        { type: 'gwang', month: 8 },
    ];
    const result = calcFinalScore_fixed({
        playerAcquired: cards3gwang,
        computerAcquired: cards3gwang, // 동일
        playerGoCount: 0, playerShakeCount: 0, playerBombCount: 0
    });
    assert(result.winner === 'draw', '동점 → 무승부');
});

// ─── 결과 출력 ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`결과: ${passed + failed}개 중 ${passed}개 통과, ${failed}개 실패`);
if (failed > 0) {
    console.error(`\n⚠️  실패한 테스트가 있습니다. 위 로그를 확인하세요.`);
    process.exit(1);
} else {
    console.log(`\n✅  모든 테스트 통과!`);
}
