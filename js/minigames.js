// js/minigames.js
// 보드 타일 컬렉션 해금 미니게임 8종
import * as Game from './game.js';
import { audioManager, SFX } from './audio.js';

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

// ─── 1. 오목 (Gomoku) — 13×13 명경지수 정규 오목 ───────────────────────────────
export function showGomoku(onWin, onLose) {
    const SIZE = 13;      // 13×13 실전 오목 (169칸)
    const CELL = 28;      // 칸 간격 (28px)
    const PAD  = 20;      // 외곽 여백
    const W    = PAD * 2 + CELL * (SIZE - 1); // 376px
    const H    = PAD * 2 + CELL * (SIZE - 1); // 376px
    const WIN_LEN = 5;

    // 13x13 기준 화점(Star points) 좌표
    const STAR_POINTS = [
        [3, 3], [3, 9],
        [6, 6], // 천원(중앙)
        [9, 3], [9, 9]
    ];

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.style.maxWidth = `${W + 40}px`;
    box.innerHTML = `
        <h3 class="bm-title" style="margin-bottom:4px;">♟ 군신 오목 (13×13)</h3>
        <p class="bm-desc" style="margin-bottom:6px; font-size:0.85em;">5목을 먼저 만들면 승리! &nbsp; 흑(플레이어) vs 백(AI)</p>
        <div id="mg-gm-status" class="mg-status-line" style="font-weight:bold; color:#ffd700; margin-bottom:8px;">당신의 차례입니다.</div>
        <canvas id="mg-gomoku-canvas" width="${W}" height="${H}"
            style="cursor:crosshair; border-radius:8px; display:block; margin:0 auto; box-shadow:0 6px 20px rgba(0,0,0,0.6); touch-action:none;"></canvas>
        <p class="mg-hint" style="margin-top:8px; font-size:0.8em;">원하는 교차점을 클릭하거나 터치하여 돌을 놓으세요.</p>
    `;
    ov.appendChild(box);

    const canvas = box.querySelector('#mg-gomoku-canvas');
    const ctx    = canvas.getContext('2d');
    const status = box.querySelector('#mg-gm-status');

    const board = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    let gameOver = false;
    let hoverPos = null; // [r, c] 마우스 호버 가이드
    let lastMove = null; // [r, c, p] 최근 착수 위치
    let winningLine = null; // [[r1,c1], [r2,c2]] 5목 연결선

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // 1. 고풍스러운 명품 원목 바둑판 텍스처
        const woodGrad = ctx.createLinearGradient(0, 0, W, H);
        woodGrad.addColorStop(0, '#dcb35c');
        woodGrad.addColorStop(0.5, '#c89d47');
        woodGrad.addColorStop(1, '#b68735');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(0, 0, W, H);

        // 미세 나무결 라인
        ctx.strokeStyle = 'rgba(100, 60, 10, 0.08)';
        ctx.lineWidth = 1;
        for (let y = 4; y < H; y += 7) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // 바둑판 외곽 음영 테두리
        ctx.strokeStyle = '#5a3d12';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(PAD - 2, PAD - 2, CELL * (SIZE - 1) + 4, CELL * (SIZE - 1) + 4);

        // 2. 격자선 그리기
        ctx.strokeStyle = '#4a3210';
        ctx.lineWidth = 1;
        for (let i = 0; i < SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(PAD + i * CELL, PAD);
            ctx.lineTo(PAD + i * CELL, PAD + (SIZE - 1) * CELL);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(PAD, PAD + i * CELL);
            ctx.lineTo(PAD + (SIZE - 1) * CELL, PAD + i * CELL);
            ctx.stroke();
        }

        // 3. 화점(Star points)
        ctx.fillStyle = '#4a3210';
        for (const [sr, sc] of STAR_POINTS) {
            ctx.beginPath();
            ctx.arc(PAD + sc * CELL, PAD + sr * CELL, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. 호버 미리보기 가이드 (내 턴일 때 빈 칸)
        if (hoverPos && !gameOver && board[hoverPos[0]][hoverPos[1]] === 0) {
            const hx = PAD + hoverPos[1] * CELL;
            const hy = PAD + hoverPos[0] * CELL;
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.arc(hx, hy, CELL / 2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = '#222';
            ctx.fill();
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // 5. 착수된 바둑돌 그리기 (입체 구형 쉐이딩)
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (!board[r][c]) continue;
                const x = PAD + c * CELL, y = PAD + r * CELL;
                const radius = CELL / 2 - 2;

                // 바닥 그림자
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.beginPath();
                ctx.ellipse(x + 2, y + 3, radius, radius * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();

                // 돌 본체 쉐이딩
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);

                if (board[r][c] === 1) { // 흑돌 (플레이어 - 먹빛 흑단목)
                    const g = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 1, x, y, radius);
                    g.addColorStop(0, '#555');
                    g.addColorStop(0.3, '#222');
                    g.addColorStop(1, '#050505');
                    ctx.fillStyle = g;
                } else { // 백돌 (AI - 백옥 조개빛)
                    const g = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 1, x, y, radius);
                    g.addColorStop(0, '#ffffff');
                    g.addColorStop(0.6, '#eaeaea');
                    g.addColorStop(1, '#b5b5b5');
                    ctx.fillStyle = g;
                }
                ctx.fill();
            }
        }

        // 6. 마지막 착수 수 강조 링
        if (lastMove) {
            const lx = PAD + lastMove[1] * CELL;
            const ly = PAD + lastMove[0] * CELL;
            ctx.strokeStyle = lastMove[2] === 1 ? '#00e5ff' : '#ff1744';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 7. 5목 완성 연결선
        if (winningLine) {
            const [[r1, c1], [r2, c2]] = winningLine;
            ctx.save();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.shadowColor = '#ffea00';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(PAD + c1 * CELL, PAD + r1 * CELL);
            ctx.lineTo(PAD + c2 * CELL, PAD + r2 * CELL);
            ctx.stroke();
            ctx.restore();
        }
    }

    function checkWin(b, p) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (b[r][c] !== p) continue;
                for (const [dr, dc] of dirs) {
                    let cnt = 1;
                    for (let k = 1; k < WIN_LEN; k++) {
                        const nr = r + dr*k, nc = c + dc*k;
                        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || b[nr][nc] !== p) break;
                        cnt++;
                    }
                    if (cnt >= WIN_LEN) {
                        return {
                            won: true,
                            line: [[r, c], [r + dr * (WIN_LEN - 1), c + dc * (WIN_LEN - 1)]]
                        };
                    }
                }
            }
        }
        return { won: false, line: null };
    }

    // 한 방향(±)으로 연속 돌 수와 열린 끝 수를 정밀 계산
    function evalLine(b, r, c, dr, dc, p) {
        let count = 1, openEnds = 0;
        for (let k = 1; k < SIZE; k++) {
            const nr = r + dr*k, nc = c + dc*k;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
            if (b[nr][nc] === p) count++;
            else { if (b[nr][nc] === 0) openEnds++; break; }
        }
        for (let k = 1; k < SIZE; k++) {
            const nr = r - dr*k, nc = c - dc*k;
            if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
            if (b[nr][nc] === p) count++;
            else { if (b[nr][nc] === 0) openEnds++; break; }
        }
        return { count, openEnds };
    }

    function lineScore(count, openEnds) {
        if (count >= 5) return 20000000;
        if (openEnds === 0) return 0;
        if (count === 4) return openEnds === 2 ? 500000 : 80000;
        if (count === 3) return openEnds === 2 ?  20000 :  3000;
        if (count === 2) return openEnds === 2 ?   1000 :   150;
        return 15;
    }

    // 위치별 휴리스틱 평가 (AI 공격력 + 플레이어 차단 가중치)
    function evalPos(b, r, c) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        let aiScore = 0, plScore = 0;

        b[r][c] = 2; // AI 가상 착수
        for (const [dr, dc] of dirs) {
            const { count, openEnds } = evalLine(b, r, c, dr, dc, 2);
            aiScore += lineScore(count, openEnds);
        }
        b[r][c] = 1; // 플레이어 가상 착수 (방어 평가)
        for (const [dr, dc] of dirs) {
            const { count, openEnds } = evalLine(b, r, c, dr, dc, 1);
            plScore += lineScore(count, openEnds);
        }
        b[r][c] = 0;

        // 중앙 지향 보너스
        const centerDist = Math.abs(r - Math.floor(SIZE / 2)) + Math.abs(c - Math.floor(SIZE / 2));
        const centerBonus = Math.max(0, 20 - centerDist * 2);

        // 플레이어의 열린 3, 4목 방어에 높은 가중치(1.35)
        return aiScore * 1.1 + plScore * 1.35 + centerBonus;
    }

    function aiMove() {
        // 1. AI 즉시 승리 가능한 수 탐색
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) continue;
                board[r][c] = 2;
                if (checkWin(board, 2).won) { board[r][c] = 0; return [r, c]; }
                board[r][c] = 0;
            }
        }
        // 2. 플레이어의 5목 완성 차단 (필수 방어)
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) continue;
                board[r][c] = 1;
                if (checkWin(board, 1).won) { board[r][c] = 0; return [r, c]; }
                board[r][c] = 0;
            }
        }
        // 3. 15% 확률로 인접 수 중 랜덤 선택 (인간적인 미스 허용)
        if (Math.random() < 0.15) {
            const cands = [];
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (board[r][c]) continue;
                    const adj = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
                    if (adj.some(([dr,dc]) => {
                        const nr = r+dr, nc = c+dc;
                        return nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc];
                    })) cands.push([r, c]);
                }
            }
            if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
        }
        // 4. 최선의 착수 위치 산출
        let best = -1, br = -1, bc = -1;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) continue;
                const s = evalPos(board, r, c);
                if (s > best) { best = s; br = r; bc = c; }
            }
        }
        if (br >= 0) return [br, bc];
        const mid = Math.floor(SIZE / 2);
        if (!board[mid][mid]) return [mid, mid];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!board[r][c]) return [r, c];
        return null;
    }

    function getGridPos(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const c = Math.round(((clientX - rect.left) * (W / rect.width)  - PAD) / CELL);
        const r = Math.round(((clientY - rect.top)  * (H / rect.height) - PAD) / CELL);
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;
        return [r, c];
    }

    // 마우스 호버 리스너
    canvas.addEventListener('mousemove', e => {
        if (gameOver) return;
        const pos = getGridPos(e.clientX, e.clientY);
        if (pos && (!hoverPos || hoverPos[0] !== pos[0] || hoverPos[1] !== pos[1])) {
            hoverPos = pos;
            draw();
        }
    });
    canvas.addEventListener('mouseleave', () => {
        hoverPos = null;
        draw();
    });

    // 클릭 / 터치 착수 리스너
    function handleClick(e) {
        if (gameOver) return;
        const t = e.touches && e.touches.length ? e.touches[0] : e;
        const pos = getGridPos(t.clientX, t.clientY);
        if (!pos) return;
        const [r, c] = pos;
        if (board[r][c]) return;

        // 플레이어 착수
        board[r][c] = 1;
        lastMove = [r, c, 1];
        hoverPos = null;
        try { audioManager.playSfx(SFX.CARD_PLAY); } catch (e) {}

        const winResult = checkWin(board, 1);
        if (winResult.won) {
            gameOver = true;
            winningLine = winResult.line;
            draw();
            status.textContent = '🎉 5목 완성! 플레이어의 완승!';
            status.style.color = '#4cff4c';
            try { audioManager.playSfx(SFX.WIN); } catch (e) {}
            setTimeout(() => closeOverlay(ov, onWin), 1300);
            return;
        }

        if (board.every(row => row.every(v => v))) {
            gameOver = true;
            draw();
            status.textContent = '무승부입니다...';
            setTimeout(() => closeOverlay(ov, onLose), 1000);
            return;
        }

        draw();
        status.textContent = 'AI 생각 중...';
        status.style.color = '#aaa';

        setTimeout(() => {
            if (gameOver) return;
            const aiPos = aiMove();
            if (aiPos) {
                board[aiPos[0]][aiPos[1]] = 2;
                lastMove = [aiPos[0], aiPos[1], 2];
                try { audioManager.playSfx(SFX.CARD_PLAY); } catch (e) {}
            }

            const aiWinResult = checkWin(board, 2);
            if (aiWinResult.won) {
                gameOver = true;
                winningLine = aiWinResult.line;
                draw();
                status.textContent = '😢 AI가 5목을 완성했습니다. 패배!';
                status.style.color = '#ff6666';
                try { audioManager.playSfx(SFX.BOMB); } catch (e) {}
                setTimeout(() => closeOverlay(ov, onLose), 1400);
                return;
            }

            if (board.every(row => row.every(v => v))) {
                gameOver = true;
                draw();
                status.textContent = '무승부입니다...';
                setTimeout(() => closeOverlay(ov, onLose), 1000);
                return;
            }

            status.textContent = '당신의 차례입니다.';
            status.style.color = '#ffd700';
            draw();
        }, 300);
    }

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        handleClick(e.changedTouches[0]);
    }, { passive: false });

    draw();
}

// ─── 2. 갈래길 러너 (Lane Runner) — 3차선 아케이드 조선 질주 러너 ───────────────────
export function showLaneRunner(onWin, onLose) {
    const W = 360, H = 480;
    const TIME_LIMIT = 30;
    const TARGET_SCORE = 220;
    // 3차선 좌표 (좌: 72, 중: 180, 우: 288)
    const LANES = [W * 0.20, W * 0.50, W * 0.80];
    const PLAYER_Y = H - 90;
    const SPAWN_INTERVAL = 520;

    const ITEMS_DEF = {
        coin:   { type: 'coin',   score: 15, emoji: '💰', color: '#ffcc00', glow: '#ffe57f' },
        gem:    { type: 'gem',    score: 35, emoji: '🐟', color: '#00e5ff', glow: '#80d8ff' },
        magnet: { type: 'magnet', score: 10, emoji: '🧲', color: '#ff5252', glow: '#ff8a80' },
        bomb:   { type: 'bomb',   score: -15, emoji: '💣', color: '#ff3d00', glow: '#ff6e40' },
        fire:   { type: 'fire',   score: -25, emoji: '🔥', color: '#d50000', glow: '#ff1744' },
    };

    function pickRandomItem() {
        const r = Math.random();
        if (r < 0.28) return null; // 빈 차선
        if (r < 0.65) return ITEMS_DEF.coin;
        if (r < 0.77) return ITEMS_DEF.gem;
        if (r < 0.83) return ITEMS_DEF.magnet;
        if (r < 0.93) return ITEMS_DEF.bomb;
        return ITEMS_DEF.fire;
    }

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.style.maxWidth = '390px';
    box.innerHTML = `
        <h3 class="bm-title" style="margin-bottom:6px;">🏃 조선 팔도 질주 러너</h3>
        <div class="mg-info-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span id="lr-score" style="font-weight:bold; color:#ffd700;">⭐ 0 / ${TARGET_SCORE}</span>
            <span id="lr-combo" style="color:#ff9100; font-weight:bold; font-size:0.95em;">0 COMBO</span>
            <span id="lr-timer" style="font-weight:bold;">⏱ ${TIME_LIMIT}s</span>
        </div>
        <canvas id="mg-lr-canvas" width="${W}" height="${H}"
            style="cursor:pointer; border-radius:10px; display:block; margin:0 auto; touch-action:none; box-shadow:0 6px 20px rgba(0,0,0,0.6);"></canvas>
        <p class="mg-hint" style="margin-top:8px; line-height:1.4;">
            좌/중/우 3분할 탭 또는 ← → 키로 이동!<br>
            연속 수집 시 <strong>🔥피버 모드(자석+무적)</strong> 발동!
        </p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-lr-canvas');
    const ctx     = canvas.getContext('2d');
    const scoreEl = box.querySelector('#lr-score');
    const timerEl = box.querySelector('#lr-timer');
    const comboEl = box.querySelector('#lr-combo');

    let score = 0;
    let timeLeft = TIME_LIMIT;
    let gameOver = false;
    let animId;
    let lane = 1; // 기본 중앙 시작 (0: 좌, 1: 중, 2: 우)
    let playerX = LANES[1];
    const items = [];
    let lastSpawn = performance.now();
    let scrollSpeed = 3.6;
    let bgOffset = 0;
    let stepBounce = 0;

    // 콤보 & 피버 시스템
    let combo = 0;
    let feverTimer = 0; // 피버 남은 프레임 수
    let magnetTimer = 0; // 자석 지속 프레임 수

    // 이펙트 및 파티클
    let shakeTimer = 0;
    let shakePower = 0;
    let flashTimer = 0;
    let flashColor = '';
    let fbText = '', fbColor = '#fff', fbAlpha = 0;

    const dustParticles = [];
    const coinParticles = [];
    const speedLines = Array.from({ length: 8 }, () => ({
        x: Math.random() < 0.5 ? Math.random() * 25 : W - Math.random() * 25,
        y: Math.random() * H,
        len: 20 + Math.random() * 40,
        speed: 8 + Math.random() * 6
    }));

    function setLane(idx) {
        if (!gameOver) lane = Math.max(0, Math.min(2, idx));
    }

    function onTap(e) {
        if (gameOver) return;
        if (e.preventDefault) e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const t = e.touches && e.touches.length ? e.touches[0] : e;
        const clickX = (t.clientX - r.left) * (W / r.width);
        if (clickX < W * 0.33) setLane(0);
        else if (clickX < W * 0.67) setLane(1);
        else setLane(2);
    }

    function onKey(e) {
        if (gameOver) return;
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            e.preventDefault();
            setLane(lane - 1);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            e.preventDefault();
            setLane(lane + 1);
        }
    }

    canvas.addEventListener('mousedown', onTap);
    canvas.addEventListener('touchstart', onTap, { passive: false });
    document.addEventListener('keydown', onKey);

    function spawnRow() {
        // 최소 1칸은 안전하거나 비어 있도록 제어
        const pick0 = pickRandomItem();
        const pick1 = pickRandomItem();
        const pick2 = pickRandomItem();

        // 3칸 모두 장애물이면 가운데를 코인으로 교체
        const isBad = (it) => it && (it.type === 'bomb' || it.type === 'fire');
        let final0 = pick0, final1 = pick1, final2 = pick2;
        if (isBad(final0) && isBad(final1) && isBad(final2)) {
            final1 = ITEMS_DEF.coin;
        }

        if (final0) items.push({ x: LANES[0], y: -30, item: final0, angle: 0 });
        if (final1) items.push({ x: LANES[1], y: -30, item: final1, angle: 0 });
        if (final2) items.push({ x: LANES[2], y: -30, item: final2, angle: 0 });
    }

    function triggerShake(power, frames) {
        shakePower = power;
        shakeTimer = frames;
    }

    function addCoinExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            coinParticles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                life: 1,
                decay: 0.04 + Math.random() * 0.03,
                size: 3 + Math.random() * 3
            });
        }
    }

    function loop(now) {
        if (gameOver) return;

        const isFever = feverTimer > 0;
        const isMagnet = isFever || (magnetTimer > 0);

        // 기본 가속 + 피버 시 슈퍼 질주
        const baseSpeed = 3.8 + (TIME_LIMIT - timeLeft) * 0.07;
        scrollSpeed = isFever ? baseSpeed * 1.4 : baseSpeed;

        const targetX = LANES[lane];
        playerX += (targetX - playerX) * 0.25;
        bgOffset = (bgOffset + scrollSpeed) % 40;
        stepBounce += scrollSpeed * 0.18;

        // 흙먼지 파티클 생성
        if (Math.random() < 0.6) {
            dustParticles.push({
                x: playerX + (Math.random() - 0.5) * 16,
                y: PLAYER_Y + 16,
                vx: (Math.random() - 0.5) * 1.5,
                vy: scrollSpeed * 0.4 + Math.random() * 1.2,
                alpha: 0.6,
                size: 4 + Math.random() * 4
            });
        }

        // 아이템 업데이트 및 충돌 검사
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.y += scrollSpeed;
            it.angle = (it.angle || 0) + 0.05;

            // 자석 효과: 코인/보석이 플레이어에게 빨려옴
            if (isMagnet && (it.item.type === 'coin' || it.item.type === 'gem')) {
                const dx = playerX - it.x;
                const dy = PLAYER_Y - it.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 180) {
                    it.x += (dx / dist) * 7.5;
                    it.y += (dy / dist) * 7.5;
                }
            }

            // 플레이어 충돌 판정
            if (Math.abs(it.y - PLAYER_Y) < 28 && Math.abs(it.x - playerX) < 32) {
                const item = it.item;

                if (item.type === 'bomb' || item.type === 'fire') {
                    if (isFever) {
                        // 피버 중엔 장애물을 파괴하고 황금 보너스!
                        score += 20;
                        fbText = '💥 파괴! +20';
                        fbColor = '#ffe57f';
                        addCoinExplosion(it.x, it.y, '#ffd700');
                        try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}
                    } else {
                        // 피격
                        score = Math.max(0, score + item.score);
                        combo = 0;
                        comboEl.textContent = '0 COMBO';
                        comboEl.style.color = '#ff9100';
                        triggerShake(7, 14);
                        flashColor = 'rgba(255,40,40,0.35)';
                        flashTimer = 8;
                        fbText = `${item.score}`;
                        fbColor = '#ff5252';
                        fbAlpha = 1;
                        try { audioManager.playSfx(SFX.BOMB); } catch (e) {}
                    }
                } else if (item.type === 'magnet') {
                    magnetTimer = 300; // 5초간 자석
                    score += item.score;
                    fbText = '🧲 자석 발동!';
                    fbColor = '#ff8a80';
                    fbAlpha = 1;
                    addCoinExplosion(it.x, it.y, '#ff8a80');
                    try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}
                } else {
                    // 엽전 또는 보석 획득
                    combo++;
                    const comboBonus = Math.min(combo * 3, 30);
                    const gain = item.score + comboBonus;
                    score = Math.max(0, score + gain);

                    // 콤보 5달성 시 피버 모드 돌입!
                    if (combo >= 5 && feverTimer <= 0) {
                        feverTimer = 280; // 약 4.7초 피버
                        triggerShake(4, 10);
                        fbText = '🔥 FEVER 질주!';
                        fbColor = '#ffd700';
                    } else {
                        fbText = `+${gain}${combo > 1 ? ` (${combo}연속!)` : ''}`;
                        fbColor = item.type === 'gem' ? '#00e5ff' : '#7ef7a0';
                    }

                    comboEl.textContent = feverTimer > 0 ? '🔥 FEVER MAX!' : `${combo} COMBO`;
                    comboEl.style.color = feverTimer > 0 ? '#ff1744' : (combo >= 3 ? '#ffea00' : '#ff9100');

                    fbAlpha = 1;
                    flashColor = item.type === 'gem' ? 'rgba(0,229,255,0.2)' : 'rgba(255,215,0,0.2)';
                    flashTimer = 5;
                    addCoinExplosion(it.x, it.y, item.color);
                    try { audioManager.playSfx(SFX.COIN); } catch (e) {}
                }

                scoreEl.textContent = `⭐ ${score} / ${TARGET_SCORE}`;
                items.splice(i, 1);

                if (score >= TARGET_SCORE) {
                    setTimeout(() => end(true), 400);
                    return;
                }
                continue;
            }

            if (it.y > H + 40) items.splice(i, 1);
        }

        // 아이템 스폰
        const spawnGap = isFever ? SPAWN_INTERVAL * 0.75 : SPAWN_INTERVAL;
        if (now - lastSpawn >= spawnGap) {
            spawnRow();
            lastSpawn = now;
        }

        // 타이머 차감
        if (feverTimer > 0) {
            feverTimer--;
            if (feverTimer === 0) {
                combo = 0;
                comboEl.textContent = '0 COMBO';
                comboEl.style.color = '#ff9100';
            }
        }
        if (magnetTimer > 0) magnetTimer--;

        if (fbAlpha > 0) fbAlpha = Math.max(0, fbAlpha - 0.016);
        if (flashTimer > 0) flashTimer--;

        draw(now);
        animId = requestAnimationFrame(loop);
    }

    function draw() {
        ctx.save();

        // 스크린 셰이크 적용
        if (shakeTimer > 0) {
            const rx = (Math.random() - 0.5) * shakePower;
            const ry = (Math.random() - 0.5) * shakePower;
            ctx.translate(rx, ry);
            shakeTimer--;
        }

        // 1. 고풍스러운 조선 테마 바닥 배경
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (feverTimer > 0) {
            bgGrad.addColorStop(0, '#2d1200');
            bgGrad.addColorStop(1, '#1a0500');
        } else {
            bgGrad.addColorStop(0, '#1c2833');
            bgGrad.addColorStop(1, '#111922');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. 도로 및 3차선 트랙 그리기
        const roadL = W * 0.06, roadW = W * 0.88;
        ctx.fillStyle = feverTimer > 0 ? 'rgba(80,30,10,0.6)' : 'rgba(30,40,50,0.7)';
        ctx.fillRect(roadL, 0, roadW, H);

        // 외곽 담장 / 연석
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(roadL - 6, 0, 6, H);
        ctx.fillRect(roadL + roadW, 0, 6, H);
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(roadL - 2, 0, 2, H);
        ctx.fillRect(roadL + roadW, 0, 2, H);

        // 3차선 점선 디바이더
        ctx.strokeStyle = feverTimer > 0 ? 'rgba(255,215,0,0.45)' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([16, 14]);
        ctx.lineDashOffset = -bgOffset;

        const divider1 = W * 0.35;
        const divider2 = W * 0.65;
        ctx.beginPath();
        ctx.moveTo(divider1, 0); ctx.lineTo(divider1, H);
        ctx.moveTo(divider2, 0); ctx.lineTo(divider2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // 속도선 (Speed lines)
        ctx.strokeStyle = feverTimer > 0 ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        for (const sl of speedLines) {
            sl.y = (sl.y + sl.speed + scrollSpeed * 0.8) % H;
            ctx.beginPath();
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x, sl.y + sl.len);
            ctx.stroke();
        }

        // 3. 흙먼지 파티클
        for (let i = dustParticles.length - 1; i >= 0; i--) {
            const p = dustParticles[i];
            p.y += p.vy;
            p.x += p.vx;
            p.alpha -= 0.02;
            if (p.alpha <= 0) { dustParticles.splice(i, 1); continue; }
            ctx.fillStyle = `rgba(180, 150, 120, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. 아이템 렌더링 (그림자 + 발광 오라)
        for (const it of items) {
            ctx.save();
            ctx.translate(it.x, it.y);

            // 바닥 그림자
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 16, 16, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 펄스 발광 링
            ctx.fillStyle = it.item.glow;
            ctx.globalAlpha = 0.35 + Math.sin(it.angle * 2) * 0.15;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // 아이템 이모지 및 원형 테두리
            ctx.fillStyle = it.item.color;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = '22px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(it.item.emoji, 0, 0);

            // 점수 레이블
            const label = (it.item.score > 0 ? '+' : '') + it.item.score;
            ctx.font = 'bold 12px sans-serif';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.fillStyle = it.item.score > 0 ? '#7ef7a0' : '#ff8a8a';
            ctx.strokeText(label, 0, 28);
            ctx.fillText(label, 0, 28);

            ctx.restore();
        }

        // 5. 플레이어 (조선 암행어사/질주 도령 연출)
        const bounce = Math.sin(stepBounce) * 4;
        const tilt = (targetX - playerX) * 0.05; // 좌우 이동 시 몸 기울임

        ctx.save();
        ctx.translate(playerX, PLAYER_Y);
        ctx.rotate(tilt);

        // 발밑 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 20, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 피버 모드 오라
        if (feverTimer > 0) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ffea00';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0 + bounce, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 캐릭터 (달리는 무사/도령 실루엣)
        ctx.font = '44px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(feverTimer > 0 ? '🏇' : '🏃', 0, -6 + bounce);

        // 갓(Gat) 장식 연출
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(0, -32 + bounce, 18, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-6, -42 + bounce, 12, 10);

        ctx.restore();

        // 6. 코인 폭발 파티클
        for (let i = coinParticles.length - 1; i >= 0; i--) {
            const cp = coinParticles[i];
            cp.x += cp.vx;
            cp.y += cp.vy;
            cp.life -= cp.decay;
            if (cp.life <= 0) { coinParticles.splice(i, 1); continue; }
            ctx.fillStyle = cp.color;
            ctx.globalAlpha = cp.life;
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, cp.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // 7. 전체화면 플래시 (피격 / 피버)
        if (flashTimer > 0) {
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, W, H);
        }

        // 8. 피버 게이지 테두리 효과
        if (feverTimer > 0) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 6;
            ctx.strokeRect(3, 3, W - 6, H - 6);
        }

        // 9. 목표 점수 진행도 바
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(12, 10, W - 24, 8);
        const progress = Math.min(1, score / TARGET_SCORE);
        const barGrad = ctx.createLinearGradient(12, 0, W - 12, 0);
        if (feverTimer > 0) {
            barGrad.addColorStop(0, '#ff1744');
            barGrad.addColorStop(0.5, '#ffd700');
            barGrad.addColorStop(1, '#ff9100');
        } else {
            barGrad.addColorStop(0, '#00e676');
            barGrad.addColorStop(1, '#00b0ff');
        }
        ctx.fillStyle = barGrad;
        ctx.fillRect(12, 10, (W - 24) * progress, 8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 10, W - 24, 8);

        // 10. 피드백 플로팅 텍스트
        if (fbAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = fbAlpha;
            ctx.font = 'bold 26px sans-serif';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.fillStyle = fbColor;
            ctx.textAlign = 'center';
            const fbY = PLAYER_Y - 60;
            ctx.strokeText(fbText, playerX, fbY);
            ctx.fillText(fbText, playerX, fbY);
            ctx.restore();
        }

        ctx.restore();
    }

    const timerIv = setInterval(() => {
        if (gameOver) return;
        timeLeft--;
        timerEl.textContent = `⏱ ${timeLeft}s`;
        if (timeLeft <= 0) end(score >= TARGET_SCORE);
    }, 1000);

    function end(won) {
        gameOver = true;
        cancelAnimationFrame(animId);
        clearInterval(timerIv);
        document.removeEventListener('keydown', onKey);
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 700);
    }

    animId = requestAnimationFrame(loop);
}


// ─── 3. 숫자야구 (Number Baseball) ────────────────────────────────────────────
export function showNumberBaseball(onWin, onLose) {
    const MAX_TRIES = 7;
    const digits = [];
    while (digits.length < 3) {
        const d = digits.length === 0 ? Math.floor(Math.random()*9)+1 : Math.floor(Math.random()*10);
        if (!digits.includes(d)) digits.push(d);
    }
    const secret = digits;
    let triesLeft = MAX_TRIES, gameOver = false;

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">⚾ 숫자야구</h3>
        <p class="bm-desc">서로 다른 세 자릿수를 ${MAX_TRIES}번 안에 맞추세요!</p>
        <div class="bb-display">
            <span class="bb-digit" id="bb-d0">?</span>
            <span class="bb-digit" id="bb-d1">?</span>
            <span class="bb-digit" id="bb-d2">?</span>
        </div>
        <div class="bb-numpad">
            ${[1,2,3,4,5,6,7,8,9,0].map(n=>`<button class="bb-num-btn" data-n="${n}">${n}</button>`).join('')}
            <button class="bb-num-btn bb-del-btn" id="bb-del">⌫</button>
            <button class="bb-num-btn bb-ok-btn" id="bb-ok" disabled>확인</button>
        </div>
        <div class="bb-history" id="bb-history"></div>
        <div id="bb-tries" class="mg-status-line">남은 기회: ${MAX_TRIES}</div>
    `;
    ov.appendChild(box);

    let cur = [];
    const dEls    = [box.querySelector('#bb-d0'), box.querySelector('#bb-d1'), box.querySelector('#bb-d2')];
    const histEl  = box.querySelector('#bb-history');
    const triesEl = box.querySelector('#bb-tries');
    const okBtn   = box.querySelector('#bb-ok');

    function refresh() {
        dEls.forEach((d,i) => { d.textContent = cur[i]??'?'; d.classList.toggle('bb-digit-filled', cur[i]!==undefined); });
        okBtn.disabled = cur.length < 3;
    }

    box.querySelectorAll('.bb-num-btn[data-n]').forEach(b => b.addEventListener('click', () => {
        if (gameOver || cur.length >= 3) return;
        const n = parseInt(b.dataset.n);
        if (!cur.includes(n)) { cur.push(n); refresh(); }
    }));
    box.querySelector('#bb-del').addEventListener('click', () => { if (cur.length) { cur.pop(); refresh(); } });
    okBtn.addEventListener('click', () => {
        if (cur.length < 3 || gameOver) return;
        let s = 0, b2 = 0;
        cur.forEach((d,i) => { if (d===secret[i]) s++; else if (secret.includes(d)) b2++; });
        triesLeft--;
        const row = document.createElement('div');
        row.className = 'bb-history-row';
        row.innerHTML = `<span class="bb-hist-num">${cur.join('')}</span><span class="bb-hist-result">${s}S ${b2}B</span>`;
        histEl.appendChild(row); histEl.scrollTop = histEl.scrollHeight;
        triesEl.textContent = `남은 기회: ${triesLeft}`;
        cur = []; refresh();
        if (s === 3) {
            row.classList.add('bb-history-win'); gameOver = true;
            triesEl.textContent = '🎉 정답!'; triesEl.style.color = '#4cff4c';
            setTimeout(() => closeOverlay(ov, onWin), 900);
        } else if (triesLeft <= 0) {
            gameOver = true;
            const ans = document.createElement('div');
            ans.className = 'bb-history-row'; ans.style.color = '#ff8080';
            ans.textContent = `정답: ${secret.join('')}`;
            histEl.appendChild(ans); histEl.scrollTop = histEl.scrollHeight;
            setTimeout(() => closeOverlay(ov, onLose), 1200);
        }
    });
    refresh();
}

// ─── 4. 벽돌깨기 (Breakout) ───────────────────────────────────────────────────
export function showBreakout(onWin, onLose) {
    // 수집된 배경 중 랜덤 선택
    const allBgs = [];
    for (const [stageId, bgIds] of Object.entries(Game.unlockedBackgrounds || {})) {
        for (const bgId of bgIds) {
            allBgs.push(`images/stages/stage${stageId}/showtime_bg_stage${stageId}_${String(bgId).padStart(2,'0')}.jpg`);
        }
    }

    if (allBgs.length > 0) {
        const src = allBgs[Math.floor(Math.random() * allBgs.length)];
        const img = new Image();
        img.onload  = () => _startBreakout(onWin, onLose, img);
        img.onerror = () => _startBreakout(onWin, onLose, null);
        img.src = src;
    } else {
        _startBreakout(onWin, onLose, null);
    }
}

function _startBreakout(onWin, onLose, bgImg) {
    const W = Math.min(400, Math.floor(window.innerWidth * 0.88));
    const maxH = Math.floor(window.innerHeight * 0.65);
    const H = bgImg
        ? Math.min(maxH, Math.round(W * bgImg.naturalHeight / bgImg.naturalWidth))
        : Math.min(maxH, 360);

    let basePadW = Math.max(60, Math.floor(W * 0.18));
    let padW = basePadW;
    const PAD_H = 11, PAD_Y = H - 28, BALL_R = 7;
    const BRICK_COLS = 8, INIT_ROWS = 3;
    const BRICK_W = Math.floor((W - 20) / BRICK_COLS), BRICK_H = 18, BRICK_TOP = 28;
    const ROW_GAP = 4, BRICK_LINE_H = BRICK_H + ROW_GAP;

    const HP_COLOR = { 1: '#00e676', 2: '#ffd600', 3: '#ff9100', 4: '#d500f9' };
    const INIT_HP_BY_ROW = [2, 1, 1];
    const INIT_LIVES = 3;
    const ITEM_R = 10, ITEM_SPEED = 2.4, ITEM_CHANCE = 0.28;
    const TARGET_KILLS = 45; // 쾌적하고 박진감 넘치는 45개 목표
    const DANGER_Y = PAD_Y - 25;
    const SLIDE_PX_PER_SEC = BRICK_LINE_H / 0.3;

    function getSpawnInterval(c) { return Math.max(2.2, 7.5 - c * 0.35); }
    function getBallColors(c) {
        if (c <= 0)  return ['#ffffff', '#00e5ff'];
        if (c <= 3)  return ['#ffffff', '#ffd600'];
        if (c <= 6)  return ['#ffee88', '#ff9100'];
        if (c <= 10) return ['#ff9966', '#ff1744'];
        return ['#ffffff', '#d500f9'];
    }

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.style.maxWidth = `${W + 30}px`;
    box.innerHTML = `
        <h3 class="bm-title" style="margin-bottom:6px;">🧱 아케이드 벽돌깨기</h3>
        <div class="mg-info-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span id="brk-lives" style="font-weight:bold;">❤️ × ${INIT_LIVES}</span>
            <span id="brk-combo" style="color:#ffd700; font-weight:bold;">0 COMBO</span>
            <span id="brk-left" style="color:#00e5ff; font-weight:bold;">🧱 0 / ${TARGET_KILLS}</span>
        </div>
        <canvas id="mg-brk-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.6);"></canvas>
        <p class="mg-hint" style="margin-top:8px; font-size:0.8em;">
            마우스/터치로 패들 조종 | 💚 파워업 &nbsp; ⚡ 멀티볼 &nbsp; 🛡️ 패들 확장
        </p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-brk-canvas');
    const ctx     = canvas.getContext('2d');
    const livesEl = box.querySelector('#brk-lives');
    const comboEl = box.querySelector('#brk-combo');
    const leftEl  = box.querySelector('#brk-left');

    let lives = INIT_LIVES, gameOver = false, animId, padX = W / 2 - padW / 2;
    let balls = [{ x: padX + padW / 2, y: PAD_Y - BALL_R - 1, vx: 3.2, vy: -4.0, charge: 1, history: [] }];
    let cumItems = 0;
    let items = [];
    let destroyedCount = 0;
    let spawnTimer = 0;
    let lastFrameTime = performance.now();
    let comboCount = 0;
    let expandTimer = 0;

    // 파티클 및 스크린 셰이크
    const debrisParticles = [];
    const floatingTexts = [];
    let shakeTimer = 0, shakePower = 0;

    function triggerShake(power, frames) {
        shakePower = power;
        shakeTimer = frames;
    }

    function addDebris(x, y, w, h, color) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 4.5;
            debrisParticles.push({
                x: x + Math.random() * w,
                y: y + Math.random() * h,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 1,
                color,
                life: 1,
                decay: 0.04 + Math.random() * 0.03,
                size: 3 + Math.random() * 4
            });
        }
    }

    const bricks = [];
    for (let r = 0; r < INIT_ROWS; r++) {
        const hp = INIT_HP_BY_ROW[r];
        for (let c = 0; c < BRICK_COLS; c++) {
            const y = BRICK_TOP + r * BRICK_LINE_H;
            bricks.push({ x: 10 + c * BRICK_W, y, targetY: y, alive: true, color: HP_COLOR[hp], hp, maxHp: hp });
        }
    }

    function addBrickRow() {
        for (const b of bricks) {
            if (b.alive) b.targetY = (b.targetY ?? b.y) + BRICK_LINE_H;
        }
        const k = destroyedCount;
        const hpMax = k < 15 ? 1 : k < 30 ? 2 : 3;
        for (let c = 0; c < BRICK_COLS; c++) {
            const hp = 1 + Math.floor(Math.random() * hpMax);
            bricks.push({
                x: 10 + c * BRICK_W,
                y: BRICK_TOP - BRICK_LINE_H,
                targetY: BRICK_TOP,
                alive: true,
                color: HP_COLOR[hp] || HP_COLOR[3],
                hp, maxHp: hp
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
        const rect = canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W - padW, (e.clientX - rect.left) * (W / rect.width) - padW / 2));
    });
    box.style.touchAction = 'none';
    box.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W - padW, (e.touches[0].clientX - rect.left) * (W / rect.width) - padW / 2));
    }, { passive: false });

    function damageBrick(b, ball) {
        if (!b.alive) return false;
        if (ball.charge <= 0) return 'blocked';
        if (ball.charge < b.hp) {
            b.hp -= ball.charge;
            ball.charge = 0;
            return 'damaged';
        }
        ball.charge -= b.hp;
        b.alive = false;
        destroyedCount++;
        leftEl.textContent = `🧱 ${destroyedCount} / ${TARGET_KILLS}`;

        // 콤보 증가 및 피드백
        comboCount++;
        comboEl.textContent = `${comboCount} COMBO!`;
        comboEl.style.color = comboCount >= 4 ? '#ff1744' : (comboCount >= 2 ? '#ffea00' : '#ffd700');

        triggerShake(3, 5);
        addDebris(b.x, b.y, BRICK_W, BRICK_H, b.color);
        try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}

        if (comboCount >= 3) {
            floatingTexts.push({
                text: `${comboCount} COMBO!`,
                x: b.x + BRICK_W / 2,
                y: b.y,
                color: '#ffd700',
                life: 1
            });
        }

        // 아이템 드롭 (파워업, 멀티볼, 패들확장)
        if (Math.random() < ITEM_CHANCE) {
            const r = Math.random();
            let itType = 'up';
            if (r < 0.45) itType = 'up';
            else if (r < 0.75) itType = 'multi';
            else itType = 'expand';
            items.push({ x: b.x + BRICK_W / 2, y: b.y + BRICK_H / 2, vy: ITEM_SPEED, type: itType });
        }
        return 'destroyed';
    }

    function updateBall(ball) {
        const r = BALL_R + Math.min(cumItems, 12) * 0.4;
        const oldVy = ball.vy;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // 벽 반사
        if (ball.x - r < 0) { ball.x = r; ball.vx = Math.abs(ball.vx); try { audioManager.playSfx(SFX.CARD_FLIP); } catch (e) {} }
        if (ball.x + r > W) { ball.x = W - r; ball.vx = -Math.abs(ball.vx); try { audioManager.playSfx(SFX.CARD_FLIP); } catch (e) {} }
        if (ball.y - r < 0) { ball.y = r; ball.vy = Math.abs(ball.vy); try { audioManager.playSfx(SFX.CARD_FLIP); } catch (e) {} }

        // 패들 반사 (입사각에 따른 탄도 계산)
        if (ball.y + r >= PAD_Y && ball.y + r <= PAD_Y + PAD_H + 6 &&
            ball.x >= padX - 4 && ball.x <= padX + padW + 4 && ball.vy > 0) {
            const hitRatio = (ball.x - (padX + padW / 2)) / (padW / 2);
            ball.vx = hitRatio * 5.2;
            ball.vy = -Math.max(3.2, Math.sqrt(Math.max(12, 28 - ball.vx * ball.vx)));
            ball.y = PAD_Y - r;
            ball.charge = Math.max(1, cumItems);
            comboCount = 0; // 패들에 닿으면 콤보 리셋
            comboEl.textContent = '0 COMBO';
            comboEl.style.color = '#ffd700';
            triggerShake(2, 4);
            try { audioManager.playSfx(SFX.CARD_PLAY); } catch (e) {}
        }

        // 벽돌 충돌
        let bounced = false;
        for (const b of bricks) {
            if (!b.alive) continue;
            if (ball.x + r > b.x && ball.x - r < b.x + BRICK_W &&
                ball.y + r > b.y && ball.y - r < b.y + BRICK_H) {
                const res = damageBrick(b, ball);
                if (res === false) continue;
                if (destroyedCount >= TARGET_KILLS) return 'win';

                const needsBounce = res === 'damaged' || res === 'blocked' || ball.charge <= 0;
                if (needsBounce && !bounced) {
                    const ox = Math.min(ball.x + r - b.x, b.x + BRICK_W - (ball.x - r));
                    const oy = Math.min(ball.y + r - b.y, b.y + BRICK_H - (ball.y - r));
                    if (ox < oy) {
                        ball.vx = -ball.vx;
                        ball.x = (ball.x < b.x + BRICK_W / 2) ? b.x - r - 0.5 : b.x + BRICK_W + r + 0.5;
                    } else {
                        ball.vy = -ball.vy;
                        ball.y = (ball.y < b.y + BRICK_H / 2) ? b.y - r - 0.5 : b.y + BRICK_H + r + 0.5;
                    }
                    bounced = true;
                    break;
                }
            }
        }

        if (oldVy > 0 && ball.vy < 0) ball.charge = Math.max(1, cumItems);
        return ball.y - r > H;
    }

    function draw() {
        ctx.save();
        if (shakeTimer > 0) {
            const rx = (Math.random() - 0.5) * shakePower;
            const ry = (Math.random() - 0.5) * shakePower;
            ctx.translate(rx, ry);
            shakeTimer--;
        }

        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, W, H);
            ctx.fillStyle = 'rgba(10, 15, 25, 0.65)';
            ctx.fillRect(0, 0, W, H);
        } else {
            ctx.fillStyle = '#101622';
            ctx.fillRect(0, 0, W, H);
        }

        // 벽돌 렌더링 (입체 베벨)
        bricks.forEach(b => {
            if (!b.alive) return;
            const hpRatio = b.hp / b.maxHp;
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x + 1, b.y + 1, BRICK_W - 2, BRICK_H - 2);

            // 상단 하이라이트
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 3);
            // 하단 그림자
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(b.x + 2, b.y + BRICK_H - 3, BRICK_W - 4, 2);

            if (b.hp < b.maxHp) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(b.x + BRICK_W * 0.3, b.y + 2); ctx.lineTo(b.x + BRICK_W * 0.45, b.y + BRICK_H - 2);
                ctx.moveTo(b.x + BRICK_W * 0.65, b.y + 3); ctx.lineTo(b.x + BRICK_W * 0.5, b.y + BRICK_H - 3);
                ctx.stroke();
            }
            if (b.maxHp > 1) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${BRICK_H - 5}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(b.hp, b.x + BRICK_W / 2, b.y + BRICK_H / 2);
            }
        });

        // 파괴 파편 파티클
        for (let i = debrisParticles.length - 1; i >= 0; i--) {
            const p = debrisParticles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.15;
            p.life -= p.decay;
            if (p.life <= 0) { debrisParticles.splice(i, 1); continue; }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1.0;
        }

        // 낙하 아이템
        items.forEach(it => {
            ctx.save();
            ctx.beginPath(); ctx.arc(it.x, it.y, ITEM_R, 0, Math.PI * 2);
            if (it.type === 'up') {
                ctx.fillStyle = '#00e676'; ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('UP', it.x, it.y);
            } else if (it.type === 'multi') {
                ctx.fillStyle = '#ffd600'; ctx.fill();
                ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('⚡', it.x, it.y);
            } else {
                ctx.fillStyle = '#00e5ff'; ctx.fill();
                ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🛡️', it.x, it.y);
            }
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        });

        // 패들 (네온 글로우)
        const pg = ctx.createLinearGradient(padX, PAD_Y, padX, PAD_Y + PAD_H);
        pg.addColorStop(0, expandTimer > 0 ? '#00e5ff' : '#88ccff');
        pg.addColorStop(1, expandTimer > 0 ? '#0091ea' : '#3377aa');
        ctx.fillStyle = pg;
        ctx.fillRect(padX, PAD_Y, padW, PAD_H);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(padX + 2, PAD_Y + 1, padW - 4, 3);

        // 공들 렌더링 (잔상 포함)
        const [pc0, pc1] = getBallColors(cumItems);
        balls.forEach(ball => {
            const r = BALL_R + Math.min(cumItems, 12) * 0.4;
            // 잔상
            for (let i = Math.min(ball.history.length - 1, 8); i >= 1; i--) {
                const pos = ball.history[i];
                const alpha = (1 - i / 9) * 0.45;
                ctx.fillStyle = pc1;
                ctx.globalAlpha = alpha;
                ctx.beginPath(); ctx.arc(pos.x, pos.y, r * (1 - i * 0.05), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;

            // 본체
            const bg = ctx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, 1, ball.x, ball.y, r);
            bg.addColorStop(0, pc0); bg.addColorStop(1, pc1);
            ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        });

        // 플로팅 텍스트
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
            ft.y -= 0.7; ft.life -= 0.025;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }

        ctx.restore();
    }

    function update() {
        if (destroyedCount >= TARGET_KILLS) { end(true); return; }

        const now = performance.now();
        const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
        lastFrameTime = now;

        if (expandTimer > 0) {
            expandTimer -= dt;
            if (expandTimer <= 0) padW = basePadW;
        }

        spawnTimer += dt;
        if (spawnTimer >= getSpawnInterval(cumItems)) {
            spawnTimer = 0;
            addBrickRow();
        }
        slideBricks(dt);
        if (isDangerReached()) { end(false); return; }

        // 모든 활성 공 업데이트
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            const dead = updateBall(ball);
            if (dead) {
                balls.splice(i, 1);
            } else {
                ball.history.unshift({ x: ball.x, y: ball.y });
                if (ball.history.length > 10) ball.history.length = 10;
            }
        }

        // 공이 모두 떨어졌을 때 라이프 차감
        if (balls.length === 0) {
            lives--;
            livesEl.textContent = `❤️ × ${lives}`;
            comboCount = 0;
            comboEl.textContent = '0 COMBO';
            try { audioManager.playSfx(SFX.SHAKE); } catch (e) {}
            if (lives <= 0) { end(false); return; }
            balls = [{ x: padX + padW / 2, y: PAD_Y - BALL_R - 1, vx: 3.2, vy: -4.0, charge: Math.max(1, cumItems), history: [] }];
            items = [];
            spawnTimer = 0;
        }

        // 아이템 획득 처리
        const kept = [];
        for (const it of items) {
            it.y += it.vy;
            if (it.y + ITEM_R >= PAD_Y && it.y - ITEM_R <= PAD_Y + PAD_H &&
                it.x >= padX - 4 && it.x <= padX + padW + 4) {
                try { audioManager.playSfx(SFX.COIN); } catch (e) {}
                if (it.type === 'up') {
                    cumItems++;
                    balls.forEach(b => { if (b.vy < 0) b.charge = Math.max(b.charge, cumItems); });
                } else if (it.type === 'multi') {
                    // 멀티볼: 공 추가 복제!
                    if (balls.length > 0 && balls.length < 5) {
                        const prime = balls[0];
                        balls.push({ x: prime.x, y: prime.y, vx: -prime.vx, vy: prime.vy, charge: prime.charge, history: [] });
                        balls.push({ x: prime.x, y: prime.y, vx: prime.vx * 0.7, vy: prime.vy * 1.1, charge: prime.charge, history: [] });
                    }
                } else if (it.type === 'expand') {
                    padW = Math.floor(basePadW * 1.35);
                    expandTimer = 8; // 8초간 패들 확장
                }
            } else if (it.y + ITEM_R < H) {
                kept.push(it);
            }
        }
        items = kept;
    }

    function end(won) {
        gameOver = true;
        cancelAnimationFrame(animId);
        draw();
        try { audioManager.playSfx(won ? SFX.WIN : SFX.BOMB); } catch (e) {}
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 800);
    }

    function loop() {
        if (gameOver) return;
        update();
        draw();
        animId = requestAnimationFrame(loop);
    }
    loop();
}

// ─── 5. 테트리스 (Tetris) — 아케이드 조작감 및 타격감 전면 고도화 ───────────────────────
export function showTetris(onWin, onLose) {
    const allBgs = [];
    for (const [stageId, bgIds] of Object.entries(Game.unlockedBackgrounds || {}))
        for (const bgId of bgIds)
            allBgs.push(`images/stages/stage${stageId}/showtime_bg_stage${stageId}_${String(bgId).padStart(2,'0')}.jpg`);

    if (allBgs.length > 0) {
        const src = allBgs[Math.floor(Math.random() * allBgs.length)];
        const img = new Image();
        img.onload  = () => _startTetris(onWin, onLose, img);
        img.onerror = () => _startTetris(onWin, onLose, null);
        img.src = src;
    } else {
        _startTetris(onWin, onLose, null);
    }
}

function _startTetris(onWin, onLose, bgImg) {
    // 쾌적한 10열 x 16행 (셀 28px)
    const COLS = 10, ROWS = 16, CELL = 28;
    const CW = COLS * CELL, CH = ROWS * CELL;
    const WIN_LINES = 8; // 클리어 목표 줄 수

    // 7종 테트로미노 정의 (선명한 네온 컬러)
    const PIECES = [
        { type: 'I', shape: [[1,1,1,1]],       color: '#00e5ff', glow: 'rgba(0,229,255,0.45)' },
        { type: 'O', shape: [[1,1],[1,1]],     color: '#ffd600', glow: 'rgba(255,214,0,0.45)' },
        { type: 'T', shape: [[0,1,0],[1,1,1]], color: '#d500f9', glow: 'rgba(213,0,249,0.45)' },
        { type: 'S', shape: [[0,1,1],[1,1,0]], color: '#00e676', glow: 'rgba(0,230,118,0.45)' },
        { type: 'Z', shape: [[1,1,0],[0,1,1]], color: '#ff1744', glow: 'rgba(255,23,68,0.45)' },
        { type: 'J', shape: [[1,0,0],[1,1,1]], color: '#2979ff', glow: 'rgba(41,121,255,0.45)' },
        { type: 'L', shape: [[0,0,1],[1,1,1]], color: '#ff9100', glow: 'rgba(255,145,0,0.45)' },
    ];

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.style.maxWidth = '420px';
    box.innerHTML = `
        <h3 class="bm-title" style="margin-bottom:6px;">⛓ 형옥 탈출 테트리스</h3>
        <div class="mg-info-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span id="tet-lines" style="color:#00e5ff; font-weight:bold;">줄 제거: 0 / ${WIN_LINES}</span>
            <span id="tet-combo" style="color:#ffd700; font-weight:bold;">0 COMBO</span>
            <span id="tet-level" style="color:#aaa; font-size:0.9em;">NEXT / HOLD</span>
        </div>
        <div style="display:flex; gap:10px; justify-content:center; align-items:flex-start;">
            <!-- 좌측 HOLD 패널 -->
            <div style="text-align:center;">
                <div style="font-size:0.75em; color:#888; font-weight:bold; margin-bottom:2px;">HOLD [C]</div>
                <canvas id="mg-tet-hold" width="60" height="60"
                    style="border-radius:6px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.15);"></canvas>
            </div>
            <!-- 메인 보드 -->
            <canvas id="mg-tet-canvas" width="${CW}" height="${CH}"
                style="display:block; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.7);"></canvas>
            <!-- 우측 NEXT 패널 -->
            <div style="text-align:center;">
                <div style="font-size:0.75em; color:#888; font-weight:bold; margin-bottom:2px;">NEXT</div>
                <canvas id="mg-tet-next" width="60" height="60"
                    style="border-radius:6px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.15);"></canvas>
            </div>
        </div>

        <!-- 모바일 & 터치 컨트롤 버튼 패드 -->
        <div class="tet-ctrl-pad" style="display:flex; justify-content:center; gap:6px; margin-top:10px; flex-wrap:wrap;">
            <button class="tet-btn" id="tet-btn-left" style="width:48px; height:38px; font-size:16px; border-radius:6px; background:rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.2);">◀</button>
            <button class="tet-btn" id="tet-btn-rot" style="width:48px; height:38px; font-size:16px; border-radius:6px; background:rgba(0,229,255,0.25); color:#00e5ff; border:1px solid #00e5ff;">⟳</button>
            <button class="tet-btn" id="tet-btn-right" style="width:48px; height:38px; font-size:16px; border-radius:6px; background:rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.2);">▶</button>
            <button class="tet-btn" id="tet-btn-down" style="width:48px; height:38px; font-size:16px; border-radius:6px; background:rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.2);">▼</button>
            <button class="tet-btn" id="tet-btn-drop" style="width:58px; height:38px; font-size:14px; font-weight:bold; border-radius:6px; background:rgba(255,23,68,0.25); color:#ff5252; border:1px solid #ff1744;">⏬낙하</button>
            <button class="tet-btn" id="tet-btn-hold" style="width:52px; height:38px; font-size:14px; font-weight:bold; border-radius:6px; background:rgba(255,214,0,0.25); color:#ffd700; border:1px solid #ffd600;">보관</button>
        </div>
        <p class="mg-hint" style="margin-top:6px; font-size:0.8em; line-height:1.3;">
            ← → 이동 | ↑ 회전 | Space 즉시낙하 | C/Shift 홀드(보관) | ↓ 가속
        </p>
    `;
    ov.appendChild(box);

    const canvas   = box.querySelector('#mg-tet-canvas');
    const ctx      = canvas.getContext('2d');
    const nextCvs  = box.querySelector('#mg-tet-next');
    const nextCtx  = nextCvs.getContext('2d');
    const holdCvs  = box.querySelector('#mg-tet-hold');
    const holdCtx  = holdCvs.getContext('2d');
    const linesEl  = box.querySelector('#tet-lines');
    const comboEl  = box.querySelector('#tet-combo');

    const board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    let linesCleared = 0, gameOver = false, animId = null;
    let combo = 0;

    // 7-Bag 시스템
    let bag = [];
    function refillBag() {
        bag = PIECES.map(p => ({
            type: p.type,
            shape: p.shape.map(r => [...r]),
            color: p.color,
            glow: p.glow
        })).sort(() => Math.random() - 0.5);
    }
    function getNextPiece() {
        if (bag.length === 0) refillBag();
        const p = bag.pop();
        return {
            type: p.type,
            shape: p.shape.map(r => [...r]),
            color: p.color,
            glow: p.glow,
            x: Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2),
            y: 0,
        };
    }

    let cur = getNextPiece(), nxt = getNextPiece();
    let holdPiece = null;
    let canHold = true;

    // 타이밍 및 락 딜레이(Lock Delay) 시스템
    let lastDropTime = performance.now();
    const DROP_INTERVAL = 600; // 자동 낙하 주기 (ms)
    let lockTimer = null; // 바닥 접촉 시 락 타이머
    const LOCK_DELAY = 480; // 바닥에 닿고 0.48초 동안 조작 여유
    let lockResets = 0; // 과도한 락 무한 초기화 방지 (최대 10회)

    // 파티클 & 스크린 셰이크
    const blockParticles = [];
    let shakeTimer = 0, shakePower = 0;
    let flashLines = []; // 사라지는 줄 번호 & 애니메이션 수명
    let floatingTexts = [];

    function triggerShake(power, frames) {
        shakePower = power;
        shakeTimer = frames;
    }

    function addBlockParticles(r, color) {
        for (let c = 0; c < COLS; c++) {
            const cx = c * CELL + CELL / 2;
            const cy = r * CELL + CELL / 2;
            for (let i = 0; i < 4; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 2 + Math.random() * 4.5;
                blockParticles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - 1.5,
                    color: color || '#ffffff',
                    life: 1,
                    decay: 0.035 + Math.random() * 0.03,
                    size: 3 + Math.random() * 3
                });
            }
        }
    }

    function rotate(shape) {
        const R = shape.length, C = shape[0].length;
        return Array.from({length: C}, (_, c) =>
            Array.from({length: R}, (_, r) => shape[R - 1 - r][c])
        );
    }

    function valid(shape, x, y) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = x + c, ny = y + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                if (ny >= 0 && board[ny][nx]) return false;
            }
        }
        return true;
    }

    // 벽 차기 (Wall Kick): 회전 시 벽이나 다른 블록에 끼이면 인접 위치로 슬라이드
    function tryRotate() {
        const rotated = rotate(cur.shape);
        const kickOffsets = [
            [0, 0],   // 제자리
            [-1, 0],  // 좌로 1칸
            [1, 0],   // 우로 1칸
            [0, -1],  // 위로 1칸
            [-2, 0],  // 좌로 2칸 (I블록용)
            [2, 0],   // 우로 2칸
        ];
        for (const [ox, oy] of kickOffsets) {
            if (valid(rotated, cur.x + ox, cur.y + oy)) {
                cur.shape = rotated;
                cur.x += ox;
                cur.y += oy;
                onPieceMoved();
                try { audioManager.playSfx(SFX.CARD_FLIP); } catch (e) {}
                return true;
            }
        }
        return false;
    }

    function onPieceMoved() {
        // 이동/회전 시 락 딜레이 리셋
        if (isGrounded()) {
            if (lockResets < 10) {
                lockResets++;
                clearTimeout(lockTimer);
                lockTimer = setTimeout(lockAndPlace, LOCK_DELAY);
            }
        } else {
            clearTimeout(lockTimer);
            lockTimer = null;
        }
    }

    function isGrounded() {
        return !valid(cur.shape, cur.x, cur.y + 1);
    }

    function lockAndPlace() {
        clearTimeout(lockTimer);
        lockTimer = null;
        lockResets = 0;

        // 보드에 블록 안착
        for (let r = 0; r < cur.shape.length; r++) {
            for (let c = 0; c < cur.shape[r].length; c++) {
                if (!cur.shape[r][c]) continue;
                if (cur.y + r < 0) { end(false); return; }
                board[cur.y + r][cur.x + c] = { color: cur.color, glow: cur.glow };
            }
        }

        try { audioManager.playSfx(SFX.CARD_PLAY); } catch (e) {}
        sweepLines();

        cur = nxt;
        nxt = getNextPiece();
        canHold = true;

        if (!valid(cur.shape, cur.x, cur.y)) {
            end(false);
            return;
        }
        renderSubCanvases();
    }

    function sweepLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(v => v !== 0)) {
                const sampleColor = board[r][0]?.color || '#ffd700';
                addBlockParticles(r, sampleColor);
                flashLines.push({ r, life: 1 });

                board.splice(r, 1);
                board.unshift(Array(COLS).fill(0));
                cleared++;
                r++;
            }
        }

        if (cleared === 0) {
            combo = 0;
            comboEl.textContent = '0 COMBO';
            comboEl.style.color = '#ffd700';
            return;
        }

        combo++;
        linesCleared += cleared;
        linesEl.textContent = `줄 제거: ${linesCleared} / ${WIN_LINES}`;

        if (cleared === 4) {
            triggerShake(10, 14);
            try { audioManager.playSfx(SFX.BOMB); } catch (e) {}
            floatingTexts.push({ text: '🔥 TETRIS! (4줄)', x: CW / 2, y: CH / 2, color: '#ff1744', life: 1 });
            comboEl.textContent = `🔥 ${combo} COMBO (MAX)`;
            comboEl.style.color = '#ff1744';
        } else {
            triggerShake(5, 8);
            try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}
            const labels = ['', 'SINGLE!', 'DOUBLE!', 'TRIPLE!'];
            floatingTexts.push({ text: `${labels[cleared]} +${cleared}`, x: CW / 2, y: CH / 2, color: '#00e5ff', life: 1 });
            comboEl.textContent = `${combo} COMBO!`;
            comboEl.style.color = combo > 1 ? '#ffea00' : '#ffd700';
        }

        if (linesCleared >= WIN_LINES) {
            setTimeout(() => end(true), 400);
        }
    }

    function doHold() {
        if (!canHold || gameOver) return;
        canHold = false;
        clearTimeout(lockTimer);
        lockTimer = null;
        lockResets = 0;

        const currentType = cur.type;
        const pieceDef = PIECES.find(p => p.type === currentType);

        if (!holdPiece) {
            holdPiece = pieceDef;
            cur = nxt;
            nxt = getNextPiece();
        } else {
            const temp = holdPiece;
            holdPiece = pieceDef;
            cur = {
                type: temp.type,
                shape: temp.shape.map(r => [...r]),
                color: temp.color,
                glow: temp.glow,
                x: Math.floor(COLS / 2) - Math.floor(temp.shape[0].length / 2),
                y: 0
            };
        }
        try { audioManager.playSfx(SFX.CARD_FLIP); } catch (e) {}
        renderSubCanvases();
    }

    function moveLeft() {
        if (gameOver) return;
        if (valid(cur.shape, cur.x - 1, cur.y)) {
            cur.x--;
            onPieceMoved();
        }
    }

    function moveRight() {
        if (gameOver) return;
        if (valid(cur.shape, cur.x + 1, cur.y)) {
            cur.x++;
            onPieceMoved();
        }
    }

    function softDrop() {
        if (gameOver) return;
        if (valid(cur.shape, cur.x, cur.y + 1)) {
            cur.y++;
            lastDropTime = performance.now();
            onPieceMoved();
        } else if (!lockTimer) {
            lockTimer = setTimeout(lockAndPlace, LOCK_DELAY);
        }
    }

    function hardDrop() {
        if (gameOver) return;
        let droppedDist = 0;
        while (valid(cur.shape, cur.x, cur.y + 1)) {
            cur.y++;
            droppedDist++;
        }
        triggerShake(4, 6);
        lockAndPlace();
    }

    function ghostY() {
        let gy = cur.y;
        while (valid(cur.shape, cur.x, gy + 1)) gy++;
        return gy;
    }

    // 입체 보석 질감 블록 렌더링
    function draw3DCell(c2d, x, y, color, cs) {
        const px = x * cs, py = y * cs;
        c2d.save();

        // 본체 색상
        c2d.fillStyle = color;
        c2d.fillRect(px + 1, py + 1, cs - 2, cs - 2);

        // 상단 / 좌측 하이라이트 (Bevel)
        c2d.fillStyle = 'rgba(255, 255, 255, 0.4)';
        c2d.beginPath();
        c2d.moveTo(px + 1, py + 1);
        c2d.lineTo(px + cs - 1, py + 1);
        c2d.lineTo(px + cs - 4, py + 4);
        c2d.lineTo(px + 4, py + 4);
        c2d.lineTo(px + 4, py + cs - 4);
        c2d.lineTo(px + 1, py + cs - 1);
        c2d.fill();

        // 하단 / 우측 섀도우 (Bevel)
        c2d.fillStyle = 'rgba(0, 0, 0, 0.35)';
        c2d.beginPath();
        c2d.moveTo(px + cs - 1, py + 1);
        c2d.lineTo(px + cs - 1, py + cs - 1);
        c2d.lineTo(px + 1, py + cs - 1);
        c2d.lineTo(px + 4, py + cs - 4);
        c2d.lineTo(px + cs - 4, py + cs - 4);
        c2d.lineTo(px + cs - 4, py + 4);
        c2d.fill();

        // 중심 보석 광택 사각
        c2d.fillStyle = 'rgba(255, 255, 255, 0.15)';
        c2d.fillRect(px + 5, py + 5, cs - 10, cs - 10);

        c2d.restore();
    }

    // 고스트 블록 (네온 윤곽선)
    function drawGhostCell(c2d, x, y, color, cs) {
        const px = x * cs, py = y * cs;
        c2d.save();
        c2d.fillStyle = 'rgba(255, 255, 255, 0.08)';
        c2d.fillRect(px + 1, py + 1, cs - 2, cs - 2);
        c2d.strokeStyle = color;
        c2d.lineWidth = 1.5;
        c2d.strokeRect(px + 2, py + 2, cs - 4, cs - 4);
        c2d.restore();
    }

    function renderSubCanvases() {
        // NEXT 렌더링
        nextCtx.clearRect(0, 0, 60, 60);
        const ns = nxt.shape, cs2 = 12;
        const nox = Math.floor((4 - ns[0].length) / 2) * cs2 + 6;
        const noy = Math.floor((4 - ns.length) / 2) * cs2 + 6;
        for (let r = 0; r < ns.length; r++) {
            for (let c = 0; c < ns[r].length; c++) {
                if (ns[r][c]) draw3DCell(nextCtx, c, r, nxt.color, cs2, nox, noy);
            }
        }
        // HOLD 렌더링
        holdCtx.clearRect(0, 0, 60, 60);
        if (holdPiece) {
            const hs = holdPiece.shape;
            const hox = Math.floor((4 - hs[0].length) / 2) * cs2 + 6;
            const hoy = Math.floor((4 - hs.length) / 2) * cs2 + 6;
            for (let r = 0; r < hs.length; r++) {
                for (let c = 0; c < hs[r].length; c++) {
                    if (hs[r][c]) draw3DCell(holdCtx, c, r, canHold ? holdPiece.color : '#666', cs2, hox, hoy);
                }
            }
        }
    }

    function draw() {
        ctx.save();

        // 스크린 셰이크 적용
        if (shakeTimer > 0) {
            const rx = (Math.random() - 0.5) * shakePower;
            const ry = (Math.random() - 0.5) * shakePower;
            ctx.translate(rx, ry);
            shakeTimer--;
        }

        // 보드 배경
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, CW, CH);
            ctx.fillStyle = 'rgba(10, 15, 25, 0.72)';
            ctx.fillRect(0, 0, CW, CH);
        } else {
            ctx.fillStyle = '#0f141d';
            ctx.fillRect(0, 0, CW, CH);
        }

        // 격자선 렌더링
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(CW, r * CELL); ctx.stroke();
        }
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CH); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.strokeRect(0.5, 0.5, CW - 1, CH - 1);

        // 안착된 블록들
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) draw3DCell(ctx, c, r, board[r][c].color, CELL);
            }
        }

        // 고스트 피스 렌더링
        const gy = ghostY();
        if (gy !== cur.y) {
            for (let r = 0; r < cur.shape.length; r++) {
                for (let c = 0; c < cur.shape[r].length; c++) {
                    if (cur.shape[r][c]) drawGhostCell(ctx, cur.x + c, gy + r, cur.color, CELL);
                }
            }
        }

        // 현재 조작 중인 피스
        for (let r = 0; r < cur.shape.length; r++) {
            for (let c = 0; c < cur.shape[r].length; c++) {
                if (cur.shape[r][c]) draw3DCell(ctx, cur.x + c, cur.y + r, cur.color, CELL);
            }
        }

        // 지워지는 줄 플래시 효과
        for (let i = flashLines.length - 1; i >= 0; i--) {
            const fl = flashLines[i];
            ctx.fillStyle = `rgba(255, 255, 255, ${fl.life * 0.75})`;
            ctx.fillRect(0, fl.r * CELL, CW, CELL);
            fl.life -= 0.08;
            if (fl.life <= 0) flashLines.splice(i, 1);
        }

        // 파괴 파티클
        for (let i = blockParticles.length - 1; i >= 0; i--) {
            const bp = blockParticles[i];
            bp.x += bp.vx;
            bp.y += bp.vy;
            bp.vy += 0.15; // 중력
            bp.life -= bp.decay;
            if (bp.life <= 0) { blockParticles.splice(i, 1); continue; }
            ctx.fillStyle = bp.color;
            ctx.globalAlpha = bp.life;
            ctx.fillRect(bp.x - bp.size / 2, bp.y - bp.size / 2, bp.size, bp.size);
            ctx.globalAlpha = 1.0;
        }

        // 플로팅 텍스트 (TETRIS!, COMBO)
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
            ft.y -= 0.8;
            ft.life -= 0.02;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }

        ctx.restore();
    }

    function loop(now) {
        if (gameOver) return;

        // 자동 낙하
        if (now - lastDropTime >= DROP_INTERVAL) {
            if (valid(cur.shape, cur.x, cur.y + 1)) {
                cur.y++;
                onPieceMoved();
            } else if (!lockTimer) {
                // 바닥 도달 시 락 딜레이 타이머 작동
                lockTimer = setTimeout(lockAndPlace, LOCK_DELAY);
            }
            lastDropTime = now;
        }

        draw();
        animId = requestAnimationFrame(loop);
    }

    // 키보드 이벤트
    function onKey(e) {
        if (gameOver) return;
        switch (e.key) {
            case 'ArrowLeft':  e.preventDefault(); moveLeft(); break;
            case 'ArrowRight': e.preventDefault(); moveRight(); break;
            case 'ArrowDown':  e.preventDefault(); softDrop(); break;
            case 'ArrowUp':
            case 'x':
            case 'X':
                e.preventDefault(); tryRotate(); break;
            case ' ':
                e.preventDefault(); hardDrop(); break;
            case 'c':
            case 'C':
            case 'Shift':
                e.preventDefault(); doHold(); break;
        }
    }
    document.addEventListener('keydown', onKey);

    // 모바일 터치 패드 바인딩
    box.querySelector('#tet-btn-left').addEventListener('click', moveLeft);
    box.querySelector('#tet-btn-right').addEventListener('click', moveRight);
    box.querySelector('#tet-btn-rot').addEventListener('click', tryRotate);
    box.querySelector('#tet-btn-down').addEventListener('click', softDrop);
    box.querySelector('#tet-btn-drop').addEventListener('click', hardDrop);
    box.querySelector('#tet-btn-hold').addEventListener('click', doHold);

    // 캔버스 자체 스와이프/탭 바인딩
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', e => {
        if (gameOver) return;
        e.preventDefault();
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (absDx < 8 && absDy < 8) {
            tryRotate();
        } else if (absDx > absDy) {
            if (dx > 0) moveRight(); else moveLeft();
        } else {
            if (dy > 0) hardDrop(); else tryRotate();
        }
    }, { passive: false });

    function end(won) {
        gameOver = true;
        cancelAnimationFrame(animId);
        clearTimeout(lockTimer);
        document.removeEventListener('keydown', onKey);
        draw();
        try { audioManager.playSfx(won ? SFX.WIN : SFX.BOMB); } catch (e) {}
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 700);
    }

    renderSubCanvases();
    animId = requestAnimationFrame(loop);
}

// ─── 6. 수도쿠 (Sudoku) ──────────────────────────────────────────────────────
export function showSudoku(onWin, onLose) {
    // ── 퍼즐 생성 ─────────────────────────────────────────────────────
    function valid(g, r, c, n) {
        for (let i = 0; i < 9; i++) {
            if (g[r][i] === n || g[i][c] === n) return false;
            const br = 3*Math.floor(r/3)+Math.floor(i/3), bc = 3*Math.floor(c/3)+i%3;
            if (g[br][bc] === n) return false;
        }
        return true;
    }
    function fillGrid(g) {
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
            if (g[r][c]) continue;
            for (const n of [1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5)) {
                if (valid(g, r, c, n)) {
                    g[r][c] = n;
                    if (fillGrid(g)) return true;
                    g[r][c] = 0;
                }
            }
            return false;
        }
        return true;
    }

    const solution = Array.from({length:9}, ()=>Array(9).fill(0));
    fillGrid(solution);

    // 쉬운 난이도: 38칸 제거 → 43개 힌트
    const puzzle = solution.map(row=>[...row]);
    Array.from({length:81},(_,i)=>i).sort(()=>Math.random()-0.5)
        .slice(0,38).forEach(i=>{ puzzle[Math.floor(i/9)][i%9]=0; });

    const grid  = puzzle.map(row=>[...row]);
    const given = puzzle.map(row=>row.map(v=>v!==0));
    let selected = null; // [r, c]
    const history = []; // {r, c, prev}

    // ── UI ────────────────────────────────────────────────────────────
    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">🔢 수도쿠</h3>
        <p class="bm-desc">가로·세로·3×3 박스에 1~9를 하나씩 채우세요.</p>
        <div class="mg-info-row">
            <span id="sdk-info" style="color:#aaa; font-size:0.85em;">칸을 선택 후 숫자를 누르세요</span>
            <button id="sdk-undo" class="mg-mode-btn" disabled>↩ 되돌리기</button>
        </div>
        <div class="sdk-board"><div class="sdk-grid" id="sdk-grid"></div></div>
        <div class="sdk-numpad" id="sdk-numpad">
            ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="sdk-num-btn" data-n="${n}">${n}</button>`).join('')}
            <button class="sdk-num-btn sdk-clear-btn" data-n="0">✕</button>
        </div>
        <div style="text-align:center; margin-top:6px;">
            <button id="sdk-forfeit" class="mg-mode-btn" style="color:#f88;">포기 (패배)</button>
        </div>
    `;
    ov.appendChild(box);

    const gridEl   = box.querySelector('#sdk-grid');
    const infoEl   = box.querySelector('#sdk-info');
    const undoBtn  = box.querySelector('#sdk-undo');
    const forfeit  = box.querySelector('#sdk-forfeit');

    // ── 충돌 감지 ─────────────────────────────────────────────────────
    function conflicts() {
        const set = new Set();
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
            const v = grid[r][c]; if (!v) continue;
            for (let i = 0; i < 9; i++) {
                if (i!==c && grid[r][i]===v) { set.add(r*9+c); set.add(r*9+i); }
                if (i!==r && grid[i][c]===v) { set.add(r*9+c); set.add(i*9+c); }
            }
            const br=3*Math.floor(r/3), bc=3*Math.floor(c/3);
            for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) {
                const nr=br+dr, nc=bc+dc;
                if ((nr!==r||nc!==c) && grid[nr][nc]===v) { set.add(r*9+c); set.add(nr*9+nc); }
            }
        }
        return set;
    }

    // ── 렌더링 ────────────────────────────────────────────────────────
    function render() {
        gridEl.innerHTML = '';
        const cf = conflicts();
        const [sr, sc] = selected || [-1, -1];
        const selVal = (sr>=0) ? grid[sr][sc] : 0;

        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
            const idx = r*9+c;
            const el = document.createElement('div');
            let cls = 'sdk-cell';
            if (given[r][c]) cls += ' sdk-given';
            if (r===sr && c===sc) cls += ' sdk-selected';
            else if (sr>=0 && (r===sr || c===sc ||
                (Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3))))
                cls += ' sdk-related';
            if (cf.has(idx)) cls += ' sdk-conflict';
            if (selVal && grid[r][c]===selVal && !(r===sr&&c===sc)) cls += ' sdk-same-num';
            // 박스 경계 굵은 선
            if (c===3||c===6) cls += ' sdk-box-left';
            if (r===3||r===6) cls += ' sdk-box-top';
            el.className = cls;
            if (grid[r][c]) el.textContent = grid[r][c];
            if (!given[r][c]) {
                el.addEventListener('click', ()=>{
                    selected = [r,c];
                    infoEl.textContent = `${r+1}행 ${c+1}열 선택됨`;
                    render();
                });
            }
            gridEl.appendChild(el);
        }
    }

    // ── 숫자 입력 ─────────────────────────────────────────────────────
    box.querySelectorAll('.sdk-num-btn').forEach(btn => {
        btn.addEventListener('click', ()=>{
            if (!selected) return;
            const [r,c] = selected;
            if (given[r][c]) return;
            const n = parseInt(btn.dataset.n); // 0 = 지우기
            history.push({r, c, prev: grid[r][c]});
            undoBtn.disabled = false;
            grid[r][c] = n;
            render();
            // 완성 체크
            if (grid.every((row,ri)=>row.every((v,ci)=>v===solution[ri][ci]))) {
                infoEl.textContent = '🎉 완성!';
                infoEl.style.color = '#4cff4c';
                setTimeout(()=>closeOverlay(ov, onWin), 700);
            }
        });
    });

    // ── 되돌리기 ──────────────────────────────────────────────────────
    undoBtn.addEventListener('click', ()=>{
        if (!history.length) return;
        const {r,c,prev} = history.pop();
        grid[r][c] = prev;
        selected = [r,c];
        undoBtn.disabled = history.length===0;
        render();
    });

    // ── 포기 ──────────────────────────────────────────────────────────
    forfeit.addEventListener('click', ()=>closeOverlay(ov, onLose));

    render();
}

// ─── 6. 지뢰찾기 (Minesweeper) ────────────────────────────────────────────────
export function showMinesweeper(onWin, onLose) {
    const ROWS=7, COLS=7, MINE_COUNT=8;
    const SAFE_TOTAL=ROWS*COLS-MINE_COUNT;
    let board, revealed, flagged, firstClick, flagMode, safeOpen, gameOver;

    function init() {
        board    = Array.from({length:ROWS},()=>Array(COLS).fill(0));
        revealed = Array.from({length:ROWS},()=>Array(COLS).fill(false));
        flagged  = Array.from({length:ROWS},()=>Array(COLS).fill(false));
        firstClick=true; flagMode=false; safeOpen=0; gameOver=false;
    }

    function placeMines(sr, sc) {
        let placed=0;
        while (placed<MINE_COUNT) {
            const r=Math.floor(Math.random()*ROWS), c=Math.floor(Math.random()*COLS);
            if (board[r][c]===-1) continue;
            if (Math.abs(r-sr)<=1&&Math.abs(c-sc)<=1) continue;
            board[r][c]=-1; placed++;
        }
        for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
            if (board[r][c]===-1) continue;
            let n=0;
            for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
                const nr=r+dr, nc=c+dc;
                if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===-1) n++;
            }
            board[r][c]=n;
        }
    }

    function flood(r, c) {
        if (r<0||r>=ROWS||c<0||c>=COLS||revealed[r][c]||flagged[r][c]) return;
        revealed[r][c]=true;
        if (board[r][c]===0) for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) if (dr||dc) flood(r+dr,c+dc);
    }

    const NUM_COL=['','#4af','#4f4','#f44','#44f','#f84','#4ff','#fff','#888'];

    const ov=buildOverlay();
    const box=document.createElement('div');
    box.className='bm-box mg-box';
    box.innerHTML=`
        <h3 class="bm-title">💣 지뢰찾기</h3>
        <p class="bm-desc">${MINE_COUNT}개 지뢰를 피해 모든 칸을 열어라!</p>
        <div class="mg-info-row">
            <span id="ms-count">안전: 0 / ${SAFE_TOTAL}</span>
            <button id="ms-mode-btn" class="mg-mode-btn">🔍 열기 모드</button>
        </div>
        <div class="ms-grid" id="ms-grid"></div>
    `;
    ov.appendChild(box);

    const gridEl=box.querySelector('#ms-grid');
    const countEl=box.querySelector('#ms-count');
    const modeBtn=box.querySelector('#ms-mode-btn');

    function render() {
        gridEl.innerHTML='';
        for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
            const el=document.createElement('div');
            el.className='ms-cell';
            if (revealed[r][c]) {
                el.classList.add('ms-revealed');
                if (board[r][c]===-1) { el.textContent='💣'; el.classList.add('ms-mine'); }
                else if (board[r][c]>0) { el.textContent=board[r][c]; el.style.color=NUM_COL[board[r][c]]; }
            } else if (flagged[r][c]) {
                el.textContent='🚩'; el.classList.add('ms-flagged');
            }
            el.addEventListener('click',()=>click(r,c));
            gridEl.appendChild(el);
        }
    }

    function click(r, c) {
        if (gameOver||revealed[r][c]) return;
        if (flagMode) { if (!revealed[r][c]) { flagged[r][c]=!flagged[r][c]; render(); } return; }
        if (flagged[r][c]) return;
        if (firstClick) { firstClick=false; placeMines(r,c); }
        if (board[r][c]===-1) {
            revealed[r][c]=true; gameOver=true;
            for (let rr=0;rr<ROWS;rr++) for (let cc=0;cc<COLS;cc++) if (board[rr][cc]===-1) revealed[rr][cc]=true;
            render(); setTimeout(()=>closeOverlay(ov,onLose),1000); return;
        }
        flood(r,c);
        safeOpen=0;
        for (let rr=0;rr<ROWS;rr++) for (let cc=0;cc<COLS;cc++) if (revealed[rr][cc]&&board[rr][cc]!==-1) safeOpen++;
        countEl.textContent=`안전: ${safeOpen} / ${SAFE_TOTAL}`;
        render();
        if (safeOpen>=SAFE_TOTAL) { gameOver=true; countEl.style.color='#4cff4c'; setTimeout(()=>closeOverlay(ov,onWin),800); }
    }

    modeBtn.addEventListener('click',()=>{
        flagMode=!flagMode;
        modeBtn.textContent=flagMode?'🚩 깃발 모드':'🔍 열기 모드';
        modeBtn.classList.toggle('mg-mode-flag',flagMode);
    });

    init(); render();
}

// ─── 7. 사천성 (Sichuan / Shisen-Sho) ─────────────────────────────────────────
export function showSichuan(onWin, onLose) {
    const ROWS = 6, COLS = 8;
    const TILE_W = 36, TILE_H = 52;
    const TIME_LIMIT = 120;
    const TOTAL_TILES = ROWS * COLS;
    const NUM_TYPES = 12;
    const PER_TYPE = TOTAL_TILES / NUM_TYPES;

    // 12개월 대표 화투 이미지
    const MONTH_IMAGES = [
        'images/cards/01_gwang.jpg',
        'images/cards/02_ggot.jpg',
        'images/cards/03_gwang.jpg',
        'images/cards/04_ggot.jpg',
        'images/cards/05_ggot.jpg',
        'images/cards/06_ggot.jpg',
        'images/cards/07_ggot.jpg',
        'images/cards/08_gwang.jpg',
        'images/cards/09_ggot.jpg',
        'images/cards/10_ggot.jpg',
        'images/cards/11_gwang.jpg',
        'images/cards/12_gwang.jpg',
    ];

    const BOARD_W = COLS * TILE_W;
    const BOARD_H = ROWS * TILE_H;

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box mg-sc-wrap';
    box.style.maxWidth = `${BOARD_W + 40}px`;
    box.innerHTML = `
        <h3 class="bm-title" style="margin-bottom:6px;">🀄 화투 사천성</h3>
        <div class="mg-info-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span id="sc-timer" style="font-weight:bold;">⏱ ${TIME_LIMIT}s</span>
            <span id="sc-left" style="color:#00e5ff; font-weight:bold;">남은 패: ${TOTAL_TILES}</span>
            <div style="display:flex; gap:4px;">
                <button id="sc-hint" class="mg-mode-btn" style="color:#ffd700;">💡 힌트(3)</button>
                <button id="sc-shuffle" class="mg-mode-btn">🔀 섞기</button>
            </div>
        </div>
        <div class="mg-sc-board" style="width:${BOARD_W}px; height:${BOARD_H}px; position:relative; margin:0 auto; box-shadow:0 6px 20px rgba(0,0,0,0.6); border-radius:6px; overflow:hidden;">
            <div class="mg-sc-grid" id="sc-grid"
                style="grid-template-columns:repeat(${COLS},${TILE_W}px);
                       grid-template-rows:repeat(${ROWS},${TILE_H}px);"></div>
            <canvas class="mg-sc-canvas" id="sc-canvas"
                width="${BOARD_W}" height="${BOARD_H}" style="position:absolute; top:0; left:0; pointer-events:none;"></canvas>
        </div>
        <p class="mg-hint" style="margin-top:8px; font-size:0.8em;">
            같은 그림 2장을 골라 짝맞추세요. 경로는 최대 2번 꺾임.
        </p>
    `;
    ov.appendChild(box);

    const gridEl    = box.querySelector('#sc-grid');
    const canvas    = box.querySelector('#sc-canvas');
    const ctx       = canvas.getContext('2d');
    const timerEl   = box.querySelector('#sc-timer');
    const leftEl    = box.querySelector('#sc-left');
    const shuffleBtn= box.querySelector('#sc-shuffle');
    const hintBtn   = box.querySelector('#sc-hint');

    // 보드 상태: 0 = 비어있음, 1..NUM_TYPES = 타일 종류
    const board = Array.from({length: ROWS}, () => new Array(COLS).fill(0));
    let remaining = TOTAL_TILES;
    let timeLeft  = TIME_LIMIT;
    let gameOver  = false;
    let selected  = null; // {r, c}
    let hintsLeft = 3;
    let lastMatchTime = 0;
    let comboCount = 0;
    let timerIv;

    // 파티클
    const particles = [];

    function addSparkles(cx, cy) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3.5;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1, decay: 0.05,
                color: '#ffd700', size: 2.5 + Math.random() * 3
            });
        }
    }

    // ── 경로 탐색 (외곽 한 칸 패딩 포함) ─────────────────────────
    function cellEmpty(r, c) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return board[r][c] === 0;
        return r >= -1 && r <= ROWS && c >= -1 && c <= COLS;
    }
    function rowClear(r, c1, c2) {
        const lo = Math.min(c1, c2), hi = Math.max(c1, c2);
        for (let c = lo + 1; c < hi; c++) if (!cellEmpty(r, c)) return false;
        return true;
    }
    function colClear(c, r1, r2) {
        const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
        for (let r = lo + 1; r < hi; r++) if (!cellEmpty(r, c)) return false;
        return true;
    }
    function uniquePath(pts) {
        const out = [];
        for (const p of pts) {
            const last = out[out.length - 1];
            if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
        }
        return out;
    }
    function findPath(a, b) {
        const sa = board[a.r][a.c], sb = board[b.r][b.c];
        board[a.r][a.c] = 0; board[b.r][b.c] = 0;

        let result = null;
        for (let r = -1; r <= ROWS; r++) {
            if (!cellEmpty(r, a.c) || !cellEmpty(r, b.c)) continue;
            if (!colClear(a.c, a.r, r)) continue;
            if (!colClear(b.c, b.r, r)) continue;
            if (!rowClear(r, a.c, b.c)) continue;
            result = uniquePath([[a.r, a.c], [r, a.c], [r, b.c], [b.r, b.c]]);
            break;
        }
        if (!result) {
            for (let c = -1; c <= COLS; c++) {
                if (!cellEmpty(a.r, c) || !cellEmpty(b.r, c)) continue;
                if (!rowClear(a.r, a.c, c)) continue;
                if (!rowClear(b.r, b.c, c)) continue;
                if (!colClear(c, a.r, b.r)) continue;
                result = uniquePath([[a.r, a.c], [a.r, c], [b.r, c], [b.r, b.c]]);
                break;
            }
        }

        board[a.r][a.c] = sa; board[b.r][b.c] = sb;
        return result;
    }

    function getOneMatch() {
        const cells = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (board[r][c] !== 0) cells.push({r, c, t: board[r][c]});
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                if (cells[i].t !== cells[j].t) continue;
                if (findPath(cells[i], cells[j])) return [cells[i], cells[j]];
            }
        }
        return null;
    }

    function hasAnyMatch() {
        return !!getOneMatch();
    }

    function shuffleBoard() {
        const tiles = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (board[r][c] !== 0) tiles.push(board[r][c]);
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        let k = 0;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (board[r][c] !== 0) board[r][c] = tiles[k++];
    }
    function ensureSolvable() {
        while (remaining > 0 && !hasAnyMatch()) shuffleBoard();
    }

    (function initBoard() {
        const tiles = [];
        for (let t = 1; t <= NUM_TYPES; t++)
            for (let k = 0; k < PER_TYPE; k++) tiles.push(t);
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                board[r][c] = tiles[r * COLS + c];
        ensureSolvable();
    })();

    const cellEls = Array.from({length: ROWS}, () => new Array(COLS));
    function buildCells() {
        gridEl.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const el = document.createElement('div');
                el.className = 'mg-sc-cell';
                el.dataset.r = r; el.dataset.c = c;
                el.addEventListener('click', () => onCellClick(r, c));
                gridEl.appendChild(el);
                cellEls[r][c] = el;
            }
        }
        refreshCells();
    }
    function refreshCells() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const el = cellEls[r][c];
                const v = board[r][c];
                if (v === 0) {
                    el.classList.add('mg-sc-empty');
                    el.style.backgroundImage = '';
                } else {
                    el.classList.remove('mg-sc-empty');
                    el.style.backgroundImage = `url('${MONTH_IMAGES[v - 1]}')`;
                }
                el.classList.toggle('mg-sc-selected',
                    !!selected && selected.r === r && selected.c === c);
            }
        }
    }

    function drawPath(path) {
        ctx.clearRect(0, 0, BOARD_W, BOARD_H);
        if (!path || path.length < 2) return;
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const [r, c] = path[i];
            const cx = Math.max(0, Math.min(BOARD_W, c * TILE_W + TILE_W / 2));
            const cy = Math.max(0, Math.min(BOARD_H, r * TILE_H + TILE_H / 2));
            if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.restore();
    }

    function onCellClick(r, c) {
        if (gameOver) return;
        if (board[r][c] === 0) return;
        if (selected && selected.r === r && selected.c === c) {
            selected = null; refreshCells(); return;
        }
        if (!selected) {
            selected = {r, c}; refreshCells(); return;
        }
        if (board[selected.r][selected.c] !== board[r][c]) {
            selected = {r, c}; refreshCells(); return;
        }
        const path = findPath(selected, {r, c});
        if (!path) {
            selected = {r, c}; refreshCells(); return;
        }

        // 매칭 성공!
        drawPath(path);
        const a = selected;
        selected = null;

        const now = Date.now();
        if (now - lastMatchTime < 2800) {
            comboCount++;
            timeLeft = Math.min(TIME_LIMIT, timeLeft + 3);
            timerEl.textContent = `⏱ ${timeLeft}s (+3초!)`;
            timerEl.style.color = '#7ef7a0';
            setTimeout(() => { timerEl.style.color = ''; }, 700);
        } else {
            comboCount = 1;
        }
        lastMatchTime = now;

        addSparkles(a.c * TILE_W + TILE_W / 2, a.r * TILE_H + TILE_H / 2);
        addSparkles(c * TILE_W + TILE_W / 2, r * TILE_H + TILE_H / 2);
        try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}

        setTimeout(() => {
            board[a.r][a.c] = 0;
            board[r][c]     = 0;
            remaining -= 2;
            leftEl.textContent = `남은 패: ${remaining}`;
            refreshCells();
            ctx.clearRect(0, 0, BOARD_W, BOARD_H);

            if (remaining === 0) {
                gameOver = true;
                clearInterval(timerIv);
                timerEl.textContent = '⏱ 완벽 클리어!';
                timerEl.style.color = '#4cff4c';
                try { audioManager.playSfx(SFX.WIN); } catch (e) {}
                setTimeout(() => closeOverlay(ov, onWin), 800);
                return;
            }
            if (!hasAnyMatch()) {
                shuffleBoard();
                ensureSolvable();
                refreshCells();
            }
        }, 320);
    }

    // 힌트 버튼 클릭
    hintBtn.addEventListener('click', () => {
        if (gameOver || hintsLeft <= 0) return;
        const pair = getOneMatch();
        if (!pair) return;
        hintsLeft--;
        hintBtn.textContent = `💡 힌트(${hintsLeft})`;
        if (hintsLeft <= 0) hintBtn.disabled = true;

        const [p1, p2] = pair;
        const el1 = cellEls[p1.r][p1.c];
        const el2 = cellEls[p2.r][p2.c];
        el1.style.outline = '3px solid #ffd700';
        el2.style.outline = '3px solid #ffd700';
        try { audioManager.playSfx(SFX.CARD_FLIP); } catch (e) {}
        setTimeout(() => {
            el1.style.outline = '';
            el2.style.outline = '';
        }, 1800);
    });

    shuffleBtn.addEventListener('click', () => {
        if (gameOver) return;
        selected = null;
        shuffleBoard();
        ensureSolvable();
        refreshCells();
        ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    });

    timerIv = setInterval(() => {
        if (gameOver) return;
        timeLeft--;
        timerEl.textContent = `⏱ ${timeLeft}s`;
        if (timeLeft <= 0) {
            gameOver = true;
            clearInterval(timerIv);
            timerEl.textContent = '⏱ 시간 종료';
            timerEl.style.color = '#ff7070';
            setTimeout(() => closeOverlay(ov, onLose), 700);
        }
    }, 1000);

    buildCells();
}

// ─── 8. 소매치기 포위 작전 (Surround the Thief) ──────────────────────────────
export function showPickpocket(onWin, onLose) {
    const GRID = 7;
    const MAX_TURNS = 20;
    const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">👮 소매치기 포위 작전</h3>
        <p class="bm-desc">🚧 바리케이드로 도둑(🦹)을 포위하세요!<br>초록 테두리 칸으로 탈출하면 실패!</p>
        <div class="mg-info-row">
            <span id="pp-turns">⏳ 남은 턴: ${MAX_TURNS}</span>
            <span id="pp-msg">빈 칸 클릭 → 바리케이드 설치</span>
        </div>
        <div class="pp-hunt-grid" id="pp-hunt-grid"></div>
    `;
    ov.appendChild(box);

    const gridEl  = box.querySelector('#pp-hunt-grid');
    const turnsEl = box.querySelector('#pp-turns');
    const msgEl   = box.querySelector('#pp-msg');

    let thiefR = Math.floor(GRID / 2), thiefC = Math.floor(GRID / 2);
    let turnsLeft = MAX_TURNS;
    let gameOver = false;
    let thiefJustMoved = false;
    const blocked = Array.from({length: GRID}, () => new Array(GRID).fill(false));

    const isBorder = (r, c) => r === 0 || r === GRID-1 || c === 0 || c === GRID-1;

    // BFS: 도둑 위치에서 가장자리(탈출구)까지의 첫 이동 칸 반환. null이면 포위됨.
    function findEscapeStep(fromR, fromC) {
        const queue = [[fromR, fromC, null]];
        const visited = Array.from({length: GRID}, () => new Array(GRID).fill(false));
        visited[fromR][fromC] = true;
        while (queue.length) {
            const [r, c, first] = queue.shift();
            if (isBorder(r, c) && !(r === fromR && c === fromC)) return first;
            for (const [dr, dc] of DIRS) {
                const nr = r+dr, nc = c+dc;
                if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID
                    && !visited[nr][nc] && !blocked[nr][nc]) {
                    visited[nr][nc] = true;
                    queue.push([nr, nc, first ?? [nr, nc]]);
                }
            }
        }
        return null;
    }

    // 초기 랜덤 바리케이드 8개 배치 (도둑 탈출경로 보장)
    const interior = [];
    for (let r = 1; r < GRID-1; r++)
        for (let c = 1; c < GRID-1; c++)
            if (!(r === thiefR && c === thiefC)) interior.push([r, c]);
    interior.sort(() => Math.random() - 0.5);
    let placed = 0;
    for (const [r, c] of interior) {
        if (placed >= 5) break;
        blocked[r][c] = true;
        if (!findEscapeStep(thiefR, thiefC)) { blocked[r][c] = false; continue; }
        placed++;
    }

    function render() {
        gridEl.innerHTML = '';
        for (let r = 0; r < GRID; r++) {
            for (let c = 0; c < GRID; c++) {
                const el = document.createElement('div');
                el.className = 'pp-hunt-cell';
                const isThief = (r === thiefR && c === thiefC);
                if (isThief) {
                    el.classList.add('pp-hunt-thief');
                    if (thiefJustMoved) el.classList.add('pp-hunt-moved');
                    el.textContent = '🦹';
                } else if (blocked[r][c]) {
                    el.classList.add('pp-hunt-block');
                    el.textContent = '🚧';
                } else if (isBorder(r, c)) {
                    el.classList.add('pp-hunt-exit');
                } else {
                    el.classList.add('pp-hunt-empty');
                    el.addEventListener('click', () => playerMove(r, c));
                }
                gridEl.appendChild(el);
            }
        }
        thiefJustMoved = false;
    }

    function playerMove(r, c) {
        if (gameOver) return;
        if (r === thiefR && c === thiefC) return;
        if (blocked[r][c]) return;
        if (isBorder(r, c)) return;

        blocked[r][c] = true;
        turnsLeft--;
        turnsEl.textContent = `⏳ 남은 턴: ${turnsLeft}`;
        audioManager.playSfx(SFX.CARD_PLAY);

        // 바리케이드 설치 후 즉시 포위 체크
        if (!findEscapeStep(thiefR, thiefC)) { render(); end(true); return; }

        // 도둑 이동 (65% 최적경로, 35% 랜덤 인접 칸)
        const optStep = findEscapeStep(thiefR, thiefC);
        let nextPos;
        if (Math.random() < 0.35) {
            const adj = DIRS.map(([dr,dc])=>[thiefR+dr,thiefC+dc])
                .filter(([nr,nc])=>nr>=0&&nr<GRID&&nc>=0&&nc<GRID&&!blocked[nr][nc]&&!isBorder(nr,nc));
            nextPos = adj.length ? adj[Math.floor(Math.random()*adj.length)] : optStep;
        } else {
            nextPos = optStep;
        }
        [thiefR, thiefC] = nextPos;
        thiefJustMoved = true;
        audioManager.playSfx(SFX.CARD_FLIP);

        if (isBorder(thiefR, thiefC)) { render(); end(false); return; }

        // 이동 후 포위 체크
        if (!findEscapeStep(thiefR, thiefC)) { render(); end(true); return; }

        if (turnsLeft <= 0) { render(); end(false); return; }
        render();
    }

    function end(won) {
        gameOver = true;
        msgEl.textContent = won ? '🎉 포위 성공! 도둑을 잡았습니다!' : '💨 도둑이 탈출했습니다!';
        turnsEl.textContent = `⏳ 남은 턴: ${turnsLeft}`;
        audioManager.playSfx(won ? SFX.WIN : SFX.BOMB);
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 1400);
    }

    render();
}

// ─── 과거 시험 (조선 상식 퀴즈) ──────────────────────────────────────────────
const GWAGEO_QUESTIONS = [
    { q: '조선을 건국한 왕은?',                        choices: ['태종 이방원','태조 이성계','세종대왕','광해군'],      answer: 1 },
    { q: '훈민정음을 창제한 왕은?',                    choices: ['태종','태조','세종','성종'],                          answer: 2 },
    { q: '조선의 수도는?',                             choices: ['개성','평양','경주','한양'],                          answer: 3 },
    { q: '임진왜란이 일어난 해는?',                    choices: ['1392년','1492년','1592년','1692년'],                 answer: 2 },
    { q: '거북선을 이끌어 왜군을 물리친 장군은?',      choices: ['곽재우','권율','신립','이순신'],                     answer: 3 },
    { q: '조선의 최고 행정기관은?',                    choices: ['사헌부','홍문관','의정부','승정원'],                 answer: 2 },
    { q: '조선시대 최고 국립 교육기관은?',             choices: ['서원','향교','서당','성균관'],                       answer: 3 },
    { q: '조선의 기본 법전은?',                        choices: ['속대전','경국대전','대명률','경제육전'],              answer: 1 },
    { q: '훈민정음이 반포된 해는?',                    choices: ['1392년','1443년','1446년','1504년'],                 answer: 2 },
    { q: '조선시대 지방 관립 교육기관은?',             choices: ['성균관','서원','서당','향교'],                       answer: 3 },
    { q: '병자호란이 일어난 해는?',                    choices: ['1592년','1597년','1627년','1636년'],                 answer: 3 },
    { q: '조선을 건국한 해는?',                        choices: ['1388년','1392년','1400년','1418년'],                 answer: 1 },
    { q: '조선시대 왕명을 출납하던 기관은?',           choices: ['사헌부','사간원','홍문관','승정원'],                 answer: 3 },
    { q: '행주대첩을 이끈 장군은?',                    choices: ['이순신','곽재우','권율','신립'],                     answer: 2 },
    { q: '조선시대 관리의 비리를 감찰하던 기관은?',    choices: ['의정부','승정원','사헌부','홍문관'],                 answer: 2 },
    { q: '조선 후기 실학을 집대성한 학자는?',          choices: ['이황','이이','정약용','송시열'],                     answer: 2 },
    { q: '조선시대 지방 도(道)의 최고 책임자는?',      choices: ['목사','판관','관찰사','현감'],                       answer: 2 },
    { q: '조선의 건국 이념(통치 사상)은?',             choices: ['불교','도교','유교','무속'],                         answer: 2 },
    { q: '조선왕조 이전의 나라는?',                    choices: ['신라','백제','발해','고려'],                         answer: 3 },
    { q: '사헌부·사간원·홍문관을 통틀어 부르는 말은?', choices: ['삼사','삼정승','삼군부','삼의사'],                   answer: 0 },
];

export function showGwageo(onDone) {
    const NUMS = ['①','②','③','④'];
    const picked = [...GWAGEO_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.style.maxWidth = '380px';
    ov.appendChild(box);

    let qIdx = 0, correct = 0;

    function showQ() {
        const q = picked[qIdx];
        box.innerHTML = `
            <h3 class="bm-title">📜 과거 시험</h3>
            <div class="mg-info-row">
                <span>문제 ${qIdx + 1} / 5</span>
                <span>정답 <b>${correct}</b>개</span>
            </div>
            <p class="gwageo-question">${q.q}</p>
            <div class="gwageo-choices">
                ${q.choices.map((c, i) => `
                    <button class="gwageo-btn" data-i="${i}">
                        <span class="gwageo-num">${NUMS[i]}</span>${c}
                    </button>
                `).join('')}
            </div>
        `;
        box.querySelectorAll('.gwageo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const chosen = parseInt(btn.dataset.i);
                if (chosen === q.answer) correct++;
                box.querySelectorAll('.gwageo-btn').forEach((b, i) => {
                    b.disabled = true;
                    if (i === q.answer) b.classList.add('gwageo-correct');
                    else if (i === chosen) b.classList.add('gwageo-wrong');
                });
                setTimeout(() => {
                    qIdx++;
                    if (qIdx < 5) showQ();
                    else closeOverlay(ov, () => onDone(correct));
                }, 1000);
            });
        });
    }

    showQ();
}
