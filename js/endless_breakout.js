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
export function showEndlessBreakout(onClose) {
    const W = Math.min(420, Math.floor(window.innerWidth * 0.92));
    const maxH = Math.floor(window.innerHeight * 0.72);
    const H = Math.min(maxH, Math.round(W * 4 / 3));

    const PAD_W = Math.max(56, Math.floor(W * 0.16)), PAD_H = 10, PAD_Y = H - 26, BALL_R = 7;
    const BRICK_COLS = 8, INIT_ROWS = 3;
    const BRICK_W = Math.floor((W - 20) / BRICK_COLS), BRICK_H = 18, BRICK_TOP = 32;
    const ROW_GAP = 4, BRICK_LINE_H = BRICK_H + ROW_GAP;
    const HP_COLOR = { 1:'#44cc88', 2:'#ffee44', 3:'#ff8833', 4:'#cc44ff', 5:'#ff44aa' };
    const INIT_HP_BY_ROW = [2, 1, 1];
    const INIT_LIVES = 3;
    const ITEM_R = 9, ITEM_SPEED = 2.2, ITEM_CHANCE = 0.22;
    const TRAIL_LEN_BASE = 6;
    const DANGER_Y = PAD_Y - 30;
    const SLIDE_PX_PER_SEC = BRICK_LINE_H / 0.3;

    // 누적 아이템 수에 따른 보충 간격 (초). 더 빠르게 압박.
    function getSpawnInterval(c) { return Math.max(2.0, 7 - c * 0.25); }
    // 깬 수에 따른 행 1줄당 최대 HP (단계적 상승)
    function getMaxHpForRow(k) {
        if (k < 30)  return 1;
        if (k < 80)  return 2;
        if (k < 160) return 3;
        if (k < 280) return 4;
        return 5;
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
            <span id="eb-best">🏆 ${best}</span>
        </div>
        <canvas id="eb-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; border-radius:6px;"></canvas>
        <p class="mg-hint">마우스/터치로 패들 조종 · 죽을 때까지 깨기! 점수 × 50냥</p>
        <button id="eb-quit" class="mg-mode-btn" style="margin: 6px auto 0; display:block;">나가기</button>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#eb-canvas');
    const ctx     = canvas.getContext('2d');
    const livesEl = box.querySelector('#eb-lives');
    const ballsEl = box.querySelector('#eb-balls');
    const scoreEl = box.querySelector('#eb-score');
    const bestEl  = box.querySelector('#eb-best');
    const quitBtn = box.querySelector('#eb-quit');

    // 배경 상태 (페이드 전환)
    // 시작 스테이지는 5개 중 랜덤 — 그 스테이지의 1번 이미지부터 시작.
    let bgImg = null, prevBgImg = null, bgFade = 1, currentBgIdx = -1;
    const STAGE_SIZE = 12;
    const startStage = Math.floor(Math.random() * (BG_POOL.length / STAGE_SIZE));
    const bgStartOffset = startStage * STAGE_SIZE;

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

    function ballR()   { return BALL_R + Math.min(cumItems, 16) * 0.5; }
    function trailLen(){ return Math.min(20, TRAIL_LEN_BASE + Math.floor(cumItems * 0.5)); }

    const bricks = [];
    for (let r = 0; r < INIT_ROWS; r++) {
        const hp = INIT_HP_BY_ROW[r];
        for (let c = 0; c < BRICK_COLS; c++) {
            const y = BRICK_TOP + r * BRICK_LINE_H;
            bricks.push({ x: 10 + c*BRICK_W, y, targetY: y, alive: true,
                          color: HP_COLOR[hp], hp, maxHp: hp });
        }
    }

    function addBrickRow() {
        for (const b of bricks) {
            if (b.alive) b.targetY = (b.targetY ?? b.y) + BRICK_LINE_H;
        }
        const hpMax = getMaxHpForRow(destroyedCount);
        for (let c = 0; c < BRICK_COLS; c++) {
            const hp = 1 + Math.floor(Math.random() * hpMax);
            bricks.push({
                x: 10 + c*BRICK_W,
                y: BRICK_TOP - BRICK_LINE_H,
                targetY: BRICK_TOP,
                alive: true,
                color: HP_COLOR[hp] || HP_COLOR[5],
                hp, maxHp: hp,
            });
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
        const r = canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W - PAD_W,
            (e.clientX - r.left) * (W / r.width) - PAD_W/2));
    });
    box.style.touchAction = 'none';
    box.addEventListener('touchmove', e => {
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
    }

    function damageBrick(b) {
        if (!b.alive) return false;
        if (mainBall.charge <= 0) return 'blocked';
        if (mainBall.charge < b.hp) {
            b.hp -= mainBall.charge;
            mainBall.charge = 0;
            return 'damaged';
        }
        mainBall.charge -= b.hp;
        b.alive = false;
        destroyedCount++;
        scoreEl.textContent = `🧱 ${destroyedCount}`;
        if (destroyedCount > best) {
            best = destroyedCount;
            bestEl.textContent = `🏆 ${best}`;
        }
        // 배경 단계 갱신 (시작 오프셋 기준으로 순환 진행)
        setBgIndex(bgStartOffset + Math.floor(destroyedCount / BRICKS_PER_BG));
        if (Math.random() < ITEM_CHANCE)
            items.push({ x: b.x + BRICK_W/2, y: b.y + BRICK_H/2, vy: ITEM_SPEED });
        return 'destroyed';
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

        spawnTimer += dt;
        const interval = getSpawnInterval(cumItems);
        if (spawnTimer >= interval) {
            spawnTimer -= interval;
            addBrickRow();
        }
        slideBricks(dt);
        if (isDangerReached()) { end(); return; }

        const result = updateBall(mainBall);
        if (result === true) {
            lives--; livesEl.textContent = `❤️ × ${lives}`;
            audioManager.playSfx(SFX.SHAKE);
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

    function end() {
        if (gameOver) return;
        gameOver = true;
        cancelAnimationFrame(animId);
        draw();
        audioManager.playSfx(SFX.BOMB);
        if (destroyedCount > best) saveBest(destroyedCount);
        else saveBest(best);
        setTimeout(() => closeOverlay(ov, () => onClose(destroyedCount)), 800);
    }

    function loop() {
        if (gameOver) return;
        update(); draw();
        animId = requestAnimationFrame(loop);
    }
    loop();
}
