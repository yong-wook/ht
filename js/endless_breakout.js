// js/endless_breakout.js
// 무한 벽돌깨기 — 보드 중앙 버튼에서 진입하는 독립 게임.
// 깬 벽돌 수에 따라 배경이 순환 전환. 라이프 3개. 최고 기록은 localStorage.
import { audioManager, SFX } from './audio.js';

const BEST_KEY = 'endlessBreakoutBest';
const BRICKS_PER_BG = 25;   // 이 개수마다 배경 1장 교체
const BG_POOL = (() => {
    const arr = [];
    for (let s = 1; s <= 5; s++) {
        for (let i = 1; i <= 12; i++) {
            arr.push(`images/stages/stage${s}/showtime_bg_stage${s}_${String(i).padStart(2,'0')}.jpg`);
        }
    }
    return arr;
})();

function loadBest() {
    const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    return isNaN(v) ? 0 : v;
}
function saveBest(v) { localStorage.setItem(BEST_KEY, String(v)); }

function buildOverlay() {
    const ov = document.createElement('div');
    ov.className = 'bm-overlay';
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('bm-visible'));
    return ov;
}
function closeOverlay(ov, cb) {
    ov.classList.remove('bm-visible');
    setTimeout(() => { ov.remove(); cb(); }, 250);
}

// 이미지를 비동기 로딩하고 캐시. 같은 src 재요청 시 캐시 hit.
const imgCache = new Map();
function loadImg(src) {
    if (imgCache.has(src)) return Promise.resolve(imgCache.get(src));
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => { imgCache.set(src, img); resolve(img); };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// onClose(destroyedCount) — 게임 종료 시 깬 벽돌 수와 함께 호출됨.
// onClose 콜백 없이 호출하면 standalone — 종료 화면 + "다시 시작" 표시.
export function showEndlessBreakout(onClose) {
    const standalone = typeof onClose !== 'function';
    const W = Math.min(420, Math.floor(window.innerWidth * 0.92));
    const maxH = Math.floor(window.innerHeight * 0.72);
    const H = Math.min(maxH, Math.round(W * 4 / 3));

    let PAD_W = Math.max(56, Math.floor(W * 0.16));
    const PAD_H = 10, PAD_Y = H - 26, BALL_R = 7;
    const BRICK_COLS = 8, INIT_ROWS = 3;
    const BRICK_W = Math.floor((W - 20) / BRICK_COLS), BRICK_H = 18, BRICK_TOP = 32;
    const ROW_GAP = 4, BRICK_LINE_H = BRICK_H + ROW_GAP;
    const INIT_HP_BY_ROW = [2, 1, 1];
    const INIT_LIVES = 3;
    const ITEM_R = 9, ITEM_SPEED = 2.2, ITEM_CHANCE = 0.22;
    const TRAIL_LEN_BASE = 6;
    const DANGER_Y = PAD_Y - 30;
    const SLIDE_PX_PER_SEC = BRICK_LINE_H / 0.3;

    // 누적 아이템 수에 따른 보충 간격 (초). 여유 있게 — 후반에도 최소 2.5초.
    // spawnBonus는 보상으로 추가되는 여유 시간.
    function getSpawnInterval(c) { return Math.max(2.5, 8 - c * 0.2) + spawnBonus; }
    // 행 1줄당 최대 HP — 누적 깸(k)과 누적 파워(c)를 함께 반영.
    // 공 charge(=cumItems)와 보조를 맞춰 벽돌이 항상 도전적으로 보이도록.
    function getMaxHpForRow(k, c) {
        const tier = k < 30 ? 1 : k < 80 ? 2 : k < 160 ? 3 : k < 280 ? 4 : 5;
        return tier + Math.floor(c / 3);
    }
    function hpColor(hp) {
        const KEYS = [1, 2, 3, 4, 5];
        const PALETTE = { 1:'#44cc88', 2:'#ffee44', 3:'#ff8833', 4:'#cc44ff', 5:'#ff44aa' };
        return PALETTE[KEYS[Math.min(KEYS.length - 1, hp - 1)]] || PALETTE[5];
    }
    function getBallColors(c) {
        if (c <= 0)  return ['#ffffff','#aaaaee'];
        if (c <= 3)  return ['#ffffff','#ffcc44'];
        if (c <= 6)  return ['#ffee88','#ff7700'];
        if (c <= 10) return ['#ff9966','#ff2200'];
        if (c <= 15) return ['#ffaaff','#ff44cc'];
        if (c <= 20) return ['#ddaaff','#aa44ff'];
        return                  ['#ffffff','#ff44ff'];
    }

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box eb-box';
    let best = loadBest();
    box.innerHTML = `
        <h3 class="bm-title">🧱 무한 벽돌깨기</h3>
        <div class="mg-info-row eb-info">
            <span id="eb-lives">❤️ × ${INIT_LIVES}</span>
            <span id="eb-balls">⚡ 1/0</span>
            <span id="eb-score">🧱 0</span>
            <span id="eb-stage">🎮 1</span>
            <span id="eb-best">🏆 ${best}</span>
        </div>
        <canvas id="eb-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; border-radius:6px;"></canvas>
        <p class="mg-hint">마우스/터치로 패들 조종 · 죽을 때까지 깨기!</p>
        <button id="eb-quit" class="mg-mode-btn" style="margin: 6px auto 0; display:block;">${standalone ? '게임 종료' : '나가기'}</button>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#eb-canvas');
    const ctx     = canvas.getContext('2d');
    const livesEl = box.querySelector('#eb-lives');
    const ballsEl = box.querySelector('#eb-balls');
    const scoreEl = box.querySelector('#eb-score');
    const stageEl = box.querySelector('#eb-stage');
    const bestEl  = box.querySelector('#eb-best');
    const quitBtn = box.querySelector('#eb-quit');

    // 배경 상태 (페이드 전환)
    // 시작 스테이지는 5개 중 랜덤 — 그 스테이지의 1번 이미지부터 시작.
    let bgImg = null, prevBgImg = null, bgFade = 1, currentBgIdx = -1;
    const BG_PER_STAGE = 12;
    const startStage = Math.floor(Math.random() * (BG_POOL.length / BG_PER_STAGE));
    const bgStartOffset = startStage * BG_PER_STAGE;

    function setBgIndex(idx) {
        const wrapped = ((idx % BG_POOL.length) + BG_POOL.length) % BG_POOL.length;
        if (wrapped === currentBgIdx) return;
        currentBgIdx = wrapped;
        const src = BG_POOL[wrapped];
        loadImg(src).then(img => {
            if (gameOver) return;
            prevBgImg = bgImg;
            bgImg = img;
            bgFade = 0;
        });
    }
    setBgIndex(bgStartOffset); // 첫 배경: 랜덤 스테이지의 1번 이미지

    let lives = INIT_LIVES, gameOver = false, animId;
    let padX = W/2 - PAD_W/2;
    let mainBall = { x: padX + PAD_W/2, y: PAD_Y - BALL_R - 1, vx: 3, vy: -3.8, charge: 1 };
    let cumItems = 0;
    let ballHistory = [];
    let items = [];
    let destroyedCount = 0;
    let spawnTimer = 0;
    let lastFrameTime = performance.now();
    let stageNum = 1;
    let stageBannerText = '';
    let stageBannerAlpha = 0;   // 0..1, 게임 시간 기반 페이드
    const STAGE_SIZE = 25;       // 한 스테이지당 깨야 할 벽돌 수 (배경 전환 주기와 일치)
    let paused = false;          // 보상 모달 표시 중에는 true
    let pendingReward = false;   // 스테이지 진입 검출 → 다음 프레임에 모달 띄움
    let spawnBonus = 0;          // 보상으로 추가된 행 추가 간격 보너스

    function ballR()   { return BALL_R + Math.min(cumItems, 16) * 0.5; }
    function trailLen(){ return Math.min(20, TRAIL_LEN_BASE + Math.floor(cumItems * 0.5)); }

    const bricks = [];
    for (let r = 0; r < INIT_ROWS; r++) {
        const hp = INIT_HP_BY_ROW[r];
        for (let c = 0; c < BRICK_COLS; c++) {
            const y = BRICK_TOP + r * BRICK_LINE_H;
            bricks.push({ x: 10 + c*BRICK_W, y, targetY: y, alive: true,
                          color: hpColor(hp), hp, maxHp: hp });
        }
    }

    // 스테이지에 따라 한 번에 추가되는 행 수가 점진적으로 늘어남.
    // 평균값 1 → 3을 천천히 보간하고 정수 + 확률적 +1 로 자연스럽게 표현.
    function rowsPerSpawn() {
        if (stageNum < 7) return 1;
        const avg = 1 + (stageNum - 6) * 0.12;   // stage 7=1.12, 10=1.48, 15=2.08, 20=2.68
        const base = Math.floor(avg);
        const frac = avg - base;
        return base + (Math.random() < frac ? 1 : 0);
    }
    function addBrickRow(rows = 1) {
        // 기존 살아있는 벽돌은 rows × 라인높이 만큼 내려옴
        for (const b of bricks) {
            if (b.alive) b.targetY = (b.targetY ?? b.y) + BRICK_LINE_H * rows;
        }
        const hpMax = getMaxHpForRow(destroyedCount, cumItems);
        const hpMin = Math.max(1, Math.floor(cumItems / 5));
        // 가장 위 행이 마지막에 자리잡도록 extra=0..rows-1 순서로 추가.
        // 각 행의 시작 y는 화면 위쪽에서 차곡차곡, 목적지 y는 차례로 한 칸씩.
        for (let extra = 0; extra < rows; extra++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                const hp = hpMin + Math.floor(Math.random() * (hpMax - hpMin + 1));
                bricks.push({
                    x: 10 + c * BRICK_W,
                    y: BRICK_TOP - BRICK_LINE_H * (rows - extra),
                    targetY: BRICK_TOP + extra * BRICK_LINE_H,
                    alive: true,
                    color: hpColor(hp),
                    hp, maxHp: hp,
                });
            }
        }
    }

    function slideBricks(dt) {
        const step = SLIDE_PX_PER_SEC * dt;
        for (const b of bricks) {
            if (!b.alive) continue;
            if (b.y < b.targetY) b.y = Math.min(b.targetY, b.y + step);
        }
    }
    function isDangerReached() {
        for (const b of bricks) {
            if (!b.alive) continue;
            if (b.y + BRICK_H >= DANGER_Y) return true;
        }
        return false;
    }

    canvas.addEventListener('mousemove', e => {
        if (paused) return;
        const r = canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W - PAD_W,
            (e.clientX - r.left) * (W / r.width) - PAD_W/2));
    });
    box.style.touchAction = 'none';
    box.addEventListener('touchmove', e => {
        if (paused) return;
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W - PAD_W,
            (e.touches[0].clientX - r.left) * (W / r.width) - PAD_W/2));
    }, { passive: false });

    quitBtn.addEventListener('click', () => { if (!gameOver) end(); });

    function drawBg() {
        // 배경 페이드 인
        if (bgFade < 1) bgFade = Math.min(1, bgFade + 0.02);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);
        if (prevBgImg && bgFade < 1) {
            ctx.globalAlpha = 1 - bgFade;
            ctx.drawImage(prevBgImg, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }
        if (bgImg) {
            ctx.globalAlpha = bgFade;
            ctx.drawImage(bgImg, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }
        // 어둡게 오버레이 (벽돌/공 대비)
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
    }

    function draw() {
        drawBg();
        bricks.forEach(b => {
            if (!b.alive) return;
            const hpRatio = b.hp / b.maxHp;
            ctx.globalAlpha = 0.55 + hpRatio * 0.45;
            ctx.fillStyle = b.color; ctx.fillRect(b.x+1, b.y+1, BRICK_W-3, BRICK_H-3);
            if (b.hp < b.maxHp) {
                ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(b.x+BRICK_W*0.3, b.y+2); ctx.lineTo(b.x+BRICK_W*0.45, b.y+BRICK_H-2);
                ctx.moveTo(b.x+BRICK_W*0.6, b.y+3); ctx.lineTo(b.x+BRICK_W*0.5, b.y+BRICK_H-3);
                ctx.stroke();
            }
            ctx.globalAlpha = hpRatio * 0.28;
            ctx.fillStyle = '#fff'; ctx.fillRect(b.x+2, b.y+2, BRICK_W-4, 5);
            ctx.globalAlpha = 1;
            if (b.maxHp > 1) {
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.font = `bold ${BRICK_H-5}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(b.hp, b.x + BRICK_W/2, b.y + BRICK_H/2);
            }
        });
        items.forEach(it => {
            const ig = ctx.createRadialGradient(it.x-2, it.y-2, 1, it.x, it.y, ITEM_R);
            ig.addColorStop(0,'#aaffcc'); ig.addColorStop(1,'#00aa44');
            ctx.beginPath(); ctx.arc(it.x, it.y, ITEM_R, 0, Math.PI*2);
            ctx.fillStyle = ig; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('UP', it.x, it.y);
        });
        const pg = ctx.createLinearGradient(padX, PAD_Y, padX, PAD_Y + PAD_H);
        pg.addColorStop(0, '#88ccff'); pg.addColorStop(1, '#4488bb');
        ctx.fillStyle = pg; ctx.fillRect(padX, PAD_Y, PAD_W, PAD_H);

        const [pc0, pc1] = getBallColors(cumItems);
        const TLEN = trailLen();
        for (let i = Math.min(ballHistory.length-1, TLEN); i >= 1; i--) {
            const pos = ballHistory[i];
            const ratio = i / (TLEN + 1);
            ctx.globalAlpha = (1 - ratio) * 0.55;
            const tr = ballR() * (1 - ratio * 0.4);
            const tg = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, tr);
            tg.addColorStop(0, pc0); tg.addColorStop(1, pc1);
            ctx.beginPath(); ctx.arc(pos.x, pos.y, tr, 0, Math.PI*2);
            ctx.fillStyle = tg; ctx.fill();
        }
        ctx.globalAlpha = 1;
        const r = ballR();
        const chargeRatio = cumItems > 0 ? Math.max(0.4, mainBall.charge / Math.max(1, cumItems)) : 1;
        ctx.globalAlpha = chargeRatio;
        const bg = ctx.createRadialGradient(mainBall.x - r*0.3, mainBall.y - r*0.3, r*0.1,
                                            mainBall.x, mainBall.y, r);
        bg.addColorStop(0, pc0); bg.addColorStop(1, pc1);
        ctx.beginPath(); ctx.arc(mainBall.x, mainBall.y, r, 0, Math.PI*2);
        ctx.fillStyle = bg; ctx.fill();
        if (cumItems >= 3) {
            ctx.shadowColor = pc1;
            ctx.shadowBlur = Math.min(40, 6 + cumItems * 2);
            ctx.beginPath(); ctx.arc(mainBall.x, mainBall.y, r, 0, Math.PI*2);
            ctx.strokeStyle = pc1; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

        let nearest = 0;
        for (const b of bricks) if (b.alive && b.y + BRICK_H > nearest) nearest = b.y + BRICK_H;
        const proximity = Math.max(0, Math.min(1, (nearest - (DANGER_Y - 60)) / 60));
        if (proximity > 0) {
            const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
            ctx.fillStyle = `rgba(255,40,40,${(0.10 + 0.18 * pulse) * proximity})`;
            ctx.fillRect(0, 0, W, H);
        }

        // 미사일
        drawMissiles();

        // 스테이지 배너
        if (stageBannerAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = stageBannerAlpha;
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.fillStyle = '#ffe14a';
            const by = H * 0.35;
            ctx.strokeText(stageBannerText, W / 2, by);
            ctx.fillText(stageBannerText, W / 2, by);
            ctx.restore();
        }
    }

    // 벽돌이 파괴됐을 때 공통 후처리 (공/미사일 둘 다 사용).
    function onBrickDestroyed(b) {
        destroyedCount++;
        scoreEl.textContent = `🧱 ${destroyedCount}`;
        if (destroyedCount > best) {
            best = destroyedCount;
            bestEl.textContent = `🏆 ${best}`;
        }
        const newStage = Math.floor(destroyedCount / STAGE_SIZE) + 1;
        if (newStage > stageNum) {
            stageNum = newStage;
            stageEl.textContent = `🎮 ${stageNum}`;
            try { audioManager.playSfx(SFX.WIN); } catch (e) {}
            // 다음 프레임에 보상 모달 띄움 (이번 프레임 후처리 완료 후)
            pendingReward = true;
        }
        setBgIndex(bgStartOffset + Math.floor(destroyedCount / BRICKS_PER_BG));
        if (Math.random() < ITEM_CHANCE)
            items.push({ x: b.x + BRICK_W/2, y: b.y + BRICK_H/2, vy: ITEM_SPEED });
    }

    function damageBrick(b) {
        if (!b.alive) return false;
        if (mainBall.charge <= 0) return 'blocked';
        // 크리티컬: HP 무시하고 즉살. charge 1 소모.
        if (critChance > 0 && Math.random() < critChance) {
            mainBall.charge = Math.max(0, mainBall.charge - 1);
            b.alive = false;
            onBrickDestroyed(b);
            return 'destroyed';
        }
        if (mainBall.charge < b.hp) {
            b.hp -= mainBall.charge;
            mainBall.charge = 0;
            return 'damaged';
        }
        mainBall.charge -= b.hp;
        b.alive = false;
        onBrickDestroyed(b);
        return 'destroyed';
    }

    // ── 미사일 시스템 ─────────────────────────────────────────────
    // stageNum 만큼 동시 발사. 발사 시점에 가장 가까운 살아있는 벽돌을 잠근 뒤 직진.
    const missiles = [];
    let missileTimer = 0;
    let missileInterval = 3.0; // 초 (보상으로 단축 가능)
    let missileCount = 1;      // 동시 발사 수 (보상으로 +1)
    let missileExplodes = false; // 명중 시 인접 4방향 스플래시 데미지
    let missilePierce = 0;       // 추가 관통 횟수 (0 = 1회 충돌 후 사라짐, 1 = 2번 명중 가능, ...)
    let critChance = 0;          // 0..1, 공/미사일 명중 시 즉살 확률
    const MISSILE_SPEED = 6;

    function findNearestBrick(fromX, fromY, exclude) {
        let best = null, bestDist = Infinity;
        for (const b of bricks) {
            if (!b.alive || (exclude && exclude.has(b))) continue;
            const cx = b.x + BRICK_W/2, cy = b.y + BRICK_H/2;
            const d = Math.hypot(cx - fromX, cy - fromY);
            if (d < bestDist) { bestDist = d; best = b; }
        }
        return best;
    }
    function launchMissiles() {
        const claimed = new Set();
        const cx = padX + PAD_W/2;
        const cy = PAD_Y - 4;
        let launched = 0;
        for (let i = 0; i < missileCount; i++) {
            const target = findNearestBrick(cx, cy, claimed);
            if (!target) break;
            claimed.add(target);
            const tx = target.x + BRICK_W/2, ty = target.y + BRICK_H/2;
            // 발사 시작점을 약간 옆으로 퍼뜨려 동시 발사가 부채꼴로 보이게
            const sx = cx + (i - (missileCount - 1) / 2) * 7;
            const dx = tx - sx, dy = ty - cy;
            const dist = Math.hypot(dx, dy) || 1;
            missiles.push({
                x: sx, y: cy,
                vx: (dx / dist) * MISSILE_SPEED,
                vy: (dy / dist) * MISSILE_SPEED,
                hitsLeft: missilePierce + 1,
            });
            launched++;
        }
        // 미사일 발사음은 자주 울려서 생략 — 타격음(CARD_MATCH)만 유지
    }
    // 미사일이 한 벽돌에 데미지를 줄 때 호출. 크리티컬/폭발/관통 처리 포함.
    function applyMissileDamage(b) {
        if (!b.alive) return;
        const crit = critChance > 0 && Math.random() < critChance;
        if (crit) {
            b.hp = 0;
            b.alive = false;
            onBrickDestroyed(b);
        } else {
            b.hp -= 1;
            if (b.hp <= 0) { b.alive = false; onBrickDestroyed(b); }
        }
        // 폭발은 데미지가 들어간 시점에 무조건 발동 (kill 여부 무관)
        if (missileExplodes) splashAround(b);
    }
    // 인접 4방향(상/하/좌/우)에 데미지 1. 연쇄 폭발은 안 함.
    function splashAround(center) {
        const cx = center.x + BRICK_W / 2, cy = center.targetY + BRICK_H / 2;
        for (const b of bricks) {
            if (!b.alive || b === center) continue;
            const bx = b.x + BRICK_W / 2, by = b.targetY + BRICK_H / 2;
            const dx = Math.abs(bx - cx), dy = Math.abs(by - cy);
            const adjHoriz = dy < 2 && dx < BRICK_W + 2;
            const adjVert  = dx < 2 && dy < BRICK_LINE_H + 2;
            if (adjHoriz || adjVert) {
                b.hp -= 1;
                if (b.hp <= 0) { b.alive = false; onBrickDestroyed(b); }
            }
        }
    }

    function updateMissiles(dt) {
        missileTimer += dt;
        if (missileTimer >= missileInterval) {
            missileTimer = 0;
            launchMissiles();
        }
        for (let i = missiles.length - 1; i >= 0; i--) {
            const m = missiles[i];
            m.x += m.vx; m.y += m.vy;
            let consumed = false;
            for (const b of bricks) {
                if (!b.alive) continue;
                if (m.lastHit === b) continue;  // 같은 벽돌 재명중 방지
                if (m.x > b.x && m.x < b.x + BRICK_W &&
                    m.y > b.y && m.y < b.y + BRICK_H) {
                    applyMissileDamage(b);
                    m.lastHit = b;
                    try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}
                    m.hitsLeft--;
                    if (m.hitsLeft <= 0) consumed = true;
                    break;
                }
            }
            if (consumed || m.y < -20 || m.x < -20 || m.x > W + 20) {
                missiles.splice(i, 1);
            }
        }
    }
    function drawMissiles() {
        for (const m of missiles) {
            // 꼬리 (속도 방향 반대)
            ctx.strokeStyle = 'rgba(255,180,80,0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.x - m.vx * 1.8, m.y - m.vy * 1.8);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
            // 본체
            const mg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 5);
            mg.addColorStop(0, '#ffe0a0'); mg.addColorStop(1, '#ff3030');
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function updateBall(ball) {
        const r = ballR();
        const oldVy = ball.vy;
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x - r < 0)  { ball.x = r; ball.vx = Math.abs(ball.vx); audioManager.playSfx(SFX.CARD_FLIP); }
        if (ball.x + r > W)  { ball.x = W - r; ball.vx = -Math.abs(ball.vx); audioManager.playSfx(SFX.CARD_FLIP); }
        if (ball.y - r < 0)  { ball.y = r; ball.vy = Math.abs(ball.vy); audioManager.playSfx(SFX.CARD_FLIP); }
        if (ball.y + r >= PAD_Y && ball.y + r <= PAD_Y + PAD_H + 5 &&
            ball.x >= padX - 4 && ball.x <= padX + PAD_W + 4 && ball.vy > 0) {
            ball.vx = ((ball.x - (padX + PAD_W/2)) / (PAD_W/2)) * 5;
            ball.vy = -Math.abs(ball.vy); ball.y = PAD_Y - r;
            audioManager.playSfx(SFX.CARD_PLAY);
        }

        let bounced = false;
        for (const b of bricks) {
            if (!b.alive) continue;
            if (ball.x + r > b.x && ball.x - r < b.x + BRICK_W &&
                ball.y + r > b.y && ball.y - r < b.y + BRICK_H) {
                audioManager.playSfx(SFX.CARD_MATCH);
                const result = damageBrick(b);
                if (result === false) continue;
                const needsBounce = result === 'damaged' || result === 'blocked' || ball.charge <= 0;
                if (needsBounce) {
                    if (!bounced) {
                        const ox = Math.min(ball.x + r - b.x, b.x + BRICK_W - (ball.x - r));
                        const oy = Math.min(ball.y + r - b.y, b.y + BRICK_H - (ball.y - r));
                        if (ox < oy) {
                            ball.vx = -ball.vx;
                            ball.x = (ball.x < b.x + BRICK_W/2) ? b.x - r - 0.5 : b.x + BRICK_W + r + 0.5;
                        } else {
                            ball.vy = -ball.vy;
                            ball.y = (ball.y < b.y + BRICK_H/2) ? b.y - r - 0.5 : b.y + BRICK_H + r + 0.5;
                        }
                        bounced = true;
                    }
                    break;
                }
            }
        }
        if (oldVy > 0 && ball.vy < 0) {
            ball.charge = Math.max(1, cumItems);
        }
        return ball.y - r > H;
    }

    function update() {
        const now = performance.now();
        const dt  = Math.min(0.05, (now - lastFrameTime) / 1000);
        lastFrameTime = now;

        if (paused) return;
        if (pendingReward) {
            pendingReward = false;
            paused = true;
            showRewardModal();
            return;
        }

        spawnTimer += dt;
        const interval = getSpawnInterval(cumItems);
        if (spawnTimer >= interval) {
            spawnTimer -= interval;
            addBrickRow(rowsPerSpawn());
        }
        slideBricks(dt);
        if (isDangerReached()) { end(); return; }
        updateMissiles(dt);
        if (stageBannerAlpha > 0) stageBannerAlpha = Math.max(0, stageBannerAlpha - dt * 0.7);

        const result = updateBall(mainBall);
        if (result === true) {
            lives--; livesEl.textContent = `❤️ × ${lives}`;
            if (lives <= 0) { end(); return; }
            mainBall = { x: padX + PAD_W/2, y: PAD_Y - ballR() - 1, vx: 3, vy: -3.8,
                         charge: Math.max(1, cumItems) };
            ballHistory = [];
            items = [];
            spawnTimer = 0;
        } else {
            ballHistory.unshift({ x: mainBall.x, y: mainBall.y });
            const trailCap = trailLen() + 2;
            if (ballHistory.length > trailCap) ballHistory.length = trailCap;
        }
        ballsEl.textContent = `⚡ ${mainBall.charge}/${cumItems}`;

        const kept = [];
        for (const it of items) {
            it.y += it.vy;
            if (it.y + ITEM_R >= PAD_Y && it.y - ITEM_R <= PAD_Y + PAD_H &&
                it.x >= padX - 4 && it.x <= padX + PAD_W + 4) {
                audioManager.playSfx(SFX.COIN);
                cumItems++;
                if (mainBall.vy < 0) mainBall.charge = Math.max(mainBall.charge, cumItems);
            } else if (it.y + ITEM_R < H) {
                kept.push(it);
            }
        }
        items = kept;
    }

    // ── 보상 시스템 ───────────────────────────────────────────────
    function rewardPool() {
        // 각 항목: { id, label, desc, available: (state) => bool, apply: () => void }
        return [
            {
                id: 'missile',
                label: '🚀 미사일 +1',
                desc: '동시 발사 미사일 수 1발 추가',
                available: () => missileCount < 8,
                apply: () => { missileCount++; },
            },
            {
                id: 'rate',
                label: '⏱ 발사 가속',
                desc: '미사일 발사 주기 0.4초 단축',
                available: () => missileInterval > 1.0,
                apply: () => { missileInterval = Math.max(0.8, missileInterval - 0.4); },
            },
            {
                id: 'paddle',
                label: '🟦 패들 확장',
                desc: '패들 폭 +25%',
                available: () => PAD_W < W * 0.6,
                apply: () => {
                    const newW = Math.min(Math.floor(W * 0.6), Math.floor(PAD_W * 1.25));
                    padX = Math.max(0, Math.min(W - newW, padX + (PAD_W - newW) / 2));
                    PAD_W = newW;
                },
            },
            {
                id: 'life',
                label: '❤️ 라이프 +1',
                desc: '목숨 1개 추가',
                available: () => true,
                apply: () => { lives++; livesEl.textContent = `❤️ × ${lives}`; },
            },
            {
                id: 'sweep',
                label: '💥 일제 폭격',
                desc: '하단 2줄 즉시 제거',
                available: () => bricks.some(b => b.alive && b.y > DANGER_Y - BRICK_LINE_H * 4),
                apply: () => {
                    // 가장 아래쪽 두 행에 해당하는 살아있는 벽돌 제거
                    const alive = bricks.filter(b => b.alive);
                    alive.sort((a, b) => b.y - a.y);
                    const rowsToClear = new Set();
                    for (const b of alive) {
                        rowsToClear.add(Math.round(b.targetY));
                        if (rowsToClear.size >= 2) break;
                    }
                    for (const b of alive) {
                        if (rowsToClear.has(Math.round(b.targetY))) {
                            b.alive = false; onBrickDestroyed(b);
                        }
                    }
                },
            },
            {
                id: 'slowspawn',
                label: '🐢 보충 지연',
                desc: spawnBonus === 0
                    ? '새 벽돌 행 추가 간격 +0.8초'
                    : `행 추가 간격 +0.8초 (현재 +${spawnBonus.toFixed(1)}초)`,
                available: () => spawnBonus < 2.4,
                apply: () => {
                    spawnTimer = Math.max(0, spawnTimer - 0.8);
                    spawnBonus = Math.min(2.4, spawnBonus + 0.8);
                },
            },
            {
                id: 'explode',
                label: '🔥 폭발 미사일',
                desc: '미사일 명중 시 인접 4방향에도 데미지 1',
                available: () => !missileExplodes,
                apply: () => { missileExplodes = true; },
            },
            {
                id: 'pierce',
                label: '⚡ 관통 미사일',
                desc: missilePierce === 0
                    ? '미사일이 벽돌 하나 더 관통 (총 2회 명중)'
                    : `미사일 관통 +1 (총 ${missilePierce + 2}회 명중)`,
                available: () => missilePierce < 3,
                apply: () => { missilePierce++; },
            },
            {
                id: 'crit',
                label: '🌟 크리티컬 강타',
                desc: critChance === 0
                    ? '공·미사일 명중 시 3% 확률로 즉살'
                    : `즉살 확률 +3% (현재 ${(critChance * 100).toFixed(0)}%)`,
                available: () => critChance < 0.12,
                apply: () => { critChance = Math.min(0.12, critChance + 0.03); },
            },
        ];
    }

    function showRewardModal() {
        const pool = rewardPool().filter(o => o.available());
        // 3개 랜덤 선택
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const choices = pool.slice(0, 3);
        if (choices.length === 0) { paused = false; return; }

        const modal = document.createElement('div');
        modal.className = 'eb-reward';
        modal.innerHTML = `
            <div class="eb-reward-title">Stage ${stageNum} 클리어!</div>
            <div class="eb-reward-sub">보상 1개를 선택하세요</div>
            <div class="eb-reward-options"></div>
        `;
        const optWrap = modal.querySelector('.eb-reward-options');
        for (const c of choices) {
            const btn = document.createElement('button');
            btn.className = 'eb-reward-btn';
            btn.innerHTML = `<div class="eb-reward-label">${c.label}</div>
                             <div class="eb-reward-desc">${c.desc}</div>`;
            btn.addEventListener('click', () => {
                c.apply();
                modal.remove();
                paused = false;
                lastFrameTime = performance.now(); // dt 폭주 방지
            });
            optWrap.appendChild(btn);
        }
        box.appendChild(modal);
    }

    function end() {
        if (gameOver) return;
        gameOver = true;
        cancelAnimationFrame(animId);
        draw();
        audioManager.playSfx(SFX.BOMB);
        if (destroyedCount > best) saveBest(destroyedCount);
        else saveBest(best);
        if (standalone) {
            setTimeout(showResultPanel, 600);
        } else {
            setTimeout(() => closeOverlay(ov, () => onClose(destroyedCount)), 800);
        }
    }

    function showResultPanel() {
        const finalBest = Math.max(destroyedCount, best);
        const panel = document.createElement('div');
        panel.className = 'eb-result';
        panel.innerHTML = `
            <h3>게임 종료</h3>
            <div class="eb-result-row">🧱 격파한 벽돌: <b>${destroyedCount}</b></div>
            <div class="eb-result-row">🎮 도달 스테이지: <b>${stageNum}</b></div>
            <div class="eb-result-row">🏆 최고 기록: <b>${finalBest}</b></div>
            <button class="eb-restart">다시 도전</button>
        `;
        box.appendChild(panel);
        panel.querySelector('.eb-restart').addEventListener('click', () => {
            ov.remove();
            showEndlessBreakout(); // 재시작
        });
    }

    function loop() {
        if (gameOver) return;
        update(); draw();
        animId = requestAnimationFrame(loop);
    }
    loop();
}
