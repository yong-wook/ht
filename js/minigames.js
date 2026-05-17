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

// ─── 1. 오목 (Gomoku) ─────────────────────────────────────────────────────────
export function showGomoku(onWin, onLose) {
    const SIZE = 9;
    const CELL = 44;
    const PAD  = 24;
    const W    = PAD * 2 + CELL * (SIZE - 1);
    const H    = PAD * 2 + CELL * (SIZE - 1);
    const WIN_LEN = 5;

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">♟ 오목</h3>
        <p class="bm-desc">5목을 먼저 만들면 승리! &nbsp; 흑(나) vs 백(AI)</p>
        <div id="mg-gm-status" class="mg-status-line">당신의 차례</div>
        <canvas id="mg-gomoku-canvas" width="${W}" height="${H}"
            style="cursor:crosshair; border-radius:4px; display:block; margin:0 auto;"></canvas>
    `;
    ov.appendChild(box);

    const canvas = box.querySelector('#mg-gomoku-canvas');
    const ctx    = canvas.getContext('2d');
    const status = box.querySelector('#mg-gm-status');

    const board = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    let gameOver = false;

    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#c8a05a';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#7a5c2a';
        ctx.lineWidth = 1;
        for (let i = 0; i < SIZE; i++) {
            ctx.beginPath(); ctx.moveTo(PAD + i*CELL, PAD); ctx.lineTo(PAD + i*CELL, PAD + (SIZE-1)*CELL); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(PAD, PAD + i*CELL); ctx.lineTo(PAD + (SIZE-1)*CELL, PAD + i*CELL); ctx.stroke();
        }
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (!board[r][c]) continue;
                const x = PAD + c * CELL, y = PAD + r * CELL;
                const g = ctx.createRadialGradient(x-3, y-3, 2, x, y, CELL/2 - 4);
                if (board[r][c] === 1) { g.addColorStop(0, '#888'); g.addColorStop(1, '#111'); }
                else                   { g.addColorStop(0, '#fff'); g.addColorStop(1, '#bbb'); }
                ctx.beginPath(); ctx.arc(x, y, CELL/2 - 4, 0, Math.PI*2);
                ctx.fillStyle = g; ctx.fill();
            }
        }
    }

    function checkWin(b, p) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (b[r][c] !== p) continue;
            for (const [dr, dc] of dirs) {
                let cnt = 1;
                for (let k = 1; k < WIN_LEN; k++) {
                    const nr = r + dr*k, nc = c + dc*k;
                    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || b[nr][nc] !== p) break;
                    cnt++;
                }
                if (cnt >= WIN_LEN) return true;
            }
        }
        return false;
    }

    // 한 방향(±)으로 연속 돌 수와 열린 끝 수를 셈
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

    // 연속 길이 + 열린 끝에 따른 위협 점수
    function lineScore(count, openEnds) {
        if (count >= 5) return 10000000;
        if (openEnds === 0) return 0;
        if (count === 4) return openEnds === 2 ? 100000 : 10000;
        if (count === 3) return openEnds === 2 ?   5000 :   500;
        if (count === 2) return openEnds === 2 ?    200 :    50;
        return 10;
    }

    // (r,c)에 놓았을 때 AI 위협 × 2 + 플레이어 차단 + 중앙 보너스
    function evalPos(b, r, c) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        let aiScore = 0, plScore = 0;
        b[r][c] = 2;
        for (const [dr, dc] of dirs) {
            const { count, openEnds } = evalLine(b, r, c, dr, dc, 2);
            aiScore += lineScore(count, openEnds);
        }
        b[r][c] = 1;
        for (const [dr, dc] of dirs) {
            const { count, openEnds } = evalLine(b, r, c, dr, dc, 1);
            plScore += lineScore(count, openEnds);
        }
        b[r][c] = 0;
        const center = SIZE - Math.abs(r - (SIZE >> 1)) - Math.abs(c - (SIZE >> 1));
        return aiScore * 1.2 + plScore + center * 10;
    }

    function aiMove() {
        // 1. 즉시 승리
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (board[r][c]) continue;
            board[r][c] = 2; if (checkWin(board, 2)) return [r, c]; board[r][c] = 0;
        }
        // 2. 플레이어 승리 차단
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (board[r][c]) continue;
            board[r][c] = 1; if (checkWin(board, 1)) { board[r][c] = 0; return [r, c]; } board[r][c] = 0;
        }
        // 3. 25% 확률로 인접 랜덤 수 (AI 실수)
        if (Math.random() < 0.25) {
            const cands = [];
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                if (board[r][c]) continue;
                const adj = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
                if (adj.some(([dr,dc]) => { const nr=r+dr,nc=c+dc; return nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]; }))
                    cands.push([r, c]);
            }
            if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
        }
        // 4. 위협 점수 기반 최선의 수
        let best = -1, br = -1, bc = -1;
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (board[r][c]) continue;
            const s = evalPos(board, r, c);
            if (s > best) { best = s; br = r; bc = c; }
        }
        if (br >= 0) return [br, bc];
        const mid = SIZE >> 1;
        if (!board[mid][mid]) return [mid, mid];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!board[r][c]) return [r, c];
        return null;
    }

    draw();

    canvas.addEventListener('click', e => {
        if (gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const c = Math.round(((e.clientX - rect.left) * W/rect.width  - PAD) / CELL);
        const r = Math.round(((e.clientY - rect.top)  * H/rect.height - PAD) / CELL);
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || board[r][c]) return;

        board[r][c] = 1; draw();
        if (checkWin(board, 1)) {
            gameOver = true; status.textContent = '🎉 5목 완성! 승리!'; status.style.color = '#4cff4c';
            setTimeout(() => closeOverlay(ov, onWin), 1200); return;
        }
        if (board.every(row => row.every(v => v))) {
            gameOver = true; status.textContent = '무승부...';
            setTimeout(() => closeOverlay(ov, onLose), 1000); return;
        }
        status.textContent = 'AI 생각 중...';
        setTimeout(() => {
            const pos = aiMove();
            if (pos) { board[pos[0]][pos[1]] = 2; draw(); }
            if (checkWin(board, 2)) {
                gameOver = true; status.textContent = '😢 AI가 5목 완성. 패배!'; status.style.color = '#ff6666';
                setTimeout(() => closeOverlay(ov, onLose), 1400); return;
            }
            if (board.every(row => row.every(v => v))) {
                gameOver = true; status.textContent = '무승부...';
                setTimeout(() => closeOverlay(ov, onLose), 1000); return;
            }
            status.textContent = '당신의 차례';
        }, 320);
    });
}

// ─── 2. 갈래길 러너 (Lane Runner) — 좌/우 차선 선택형 러너 ───────────────────
export function showLaneRunner(onWin, onLose) {
    const W = 360, H = 480;
    const TIME_LIMIT = 30;
    const TARGET_SCORE = 200;
    const LANE_LEFT = 90, LANE_RIGHT = 270;
    const PLAYER_Y = H - 90;
    const SPAWN_INTERVAL = 580;

    const ITEMS_GOOD = [
        { score:  15, emoji: '💰', color: '#ffd966' },
        { score:  30, emoji: '💎', color: '#7adcff' },
    ];
    const ITEMS_BAD = [
        { score: -10, emoji: '💥', color: '#ff7a7a' },
        { score: -25, emoji: '🔥', color: '#ff4040' },
    ];

    function pickSide() {
        const r = Math.random();
        if (r < 0.30) return null;                          // 30% 빈 칸
        if (r < 0.65) return ITEMS_GOOD[Math.random() < 0.75 ? 0 : 1];  // 35% 좋음
        return ITEMS_BAD[Math.random() < 0.70 ? 0 : 1];      // 35% 나쁨
    }

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">🏃 갈래길 러너</h3>
        <div class="mg-info-row">
            <span id="lr-score">⭐ 0 / ${TARGET_SCORE}</span>
            <span id="lr-timer">⏱ ${TIME_LIMIT}</span>
        </div>
        <canvas id="mg-lr-canvas" width="${W}" height="${H}"
            style="cursor:pointer; border-radius:8px; display:block; margin:0 auto; touch-action:none;"></canvas>
        <p class="mg-hint">화면 좌/우 또는 ← →로 차선 이동. ${TIME_LIMIT}초 안에 ${TARGET_SCORE}점 모으세요!</p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-lr-canvas');
    const ctx     = canvas.getContext('2d');
    const scoreEl = box.querySelector('#lr-score');
    const timerEl = box.querySelector('#lr-timer');

    let score = 0;
    let timeLeft = TIME_LIMIT;
    let gameOver = false;
    let animId;
    let lane = 0;
    let playerX = LANE_LEFT;
    const items = [];
    let lastSpawn = performance.now();
    let scrollSpeed = 3.4;
    let bgOffset = 0;
    let stepBounce = 0;
    let fbText = '', fbColor = '#fff', fbAlpha = 0;
    let flashTimer = 0;
    let flashColor = '';

    function setLane(side) { if (!gameOver) lane = side; }
    function onTap(e) {
        if (gameOver) return;
        if (e.preventDefault) e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const t = e.touches && e.touches.length ? e.touches[0] : e;
        const x = (t.clientX - r.left) * (W / r.width);
        setLane(x < W / 2 ? 0 : 1);
    }
    function onKey(e) {
        if (gameOver) return;
        if (e.code === 'ArrowLeft'  || e.code === 'KeyA') { e.preventDefault(); setLane(0); }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); setLane(1); }
    }
    canvas.addEventListener('mousedown', onTap);
    canvas.addEventListener('touchstart', onTap, { passive: false });
    document.addEventListener('keydown', onKey);

    function spawnLine() {
        const l = pickSide();
        const r = pickSide();
        if (l) items.push({ x: LANE_LEFT,  y: -30, item: l });
        if (r) items.push({ x: LANE_RIGHT, y: -30, item: r });
    }

    function loop(now) {
        if (gameOver) return;

        scrollSpeed = 3.4 + (TIME_LIMIT - timeLeft) * 0.06; // 후반 가속
        const targetX = lane === 0 ? LANE_LEFT : LANE_RIGHT;
        playerX += (targetX - playerX) * 0.22;
        bgOffset = (bgOffset + scrollSpeed) % 32;
        stepBounce += scrollSpeed * 0.15;

        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.y += scrollSpeed;
            if (Math.abs(it.y - PLAYER_Y) < 24 && Math.abs(it.x - playerX) < 34) {
                score = Math.max(0, score + it.item.score);
                scoreEl.textContent = `⭐ ${score} / ${TARGET_SCORE}`;
                fbText = (it.item.score > 0 ? '+' : '') + it.item.score;
                fbColor = it.item.score > 0 ? '#7ef7a0' : '#ff8a8a';
                flashColor = it.item.score > 0 ? 'rgba(127,247,160,0.22)' : 'rgba(255,80,80,0.3)';
                flashTimer = 8; fbAlpha = 1;
                try { audioManager.playSfx(it.item.score > 0 ? SFX.COIN : SFX.BOMB); } catch (e) {}
                items.splice(i, 1);
                if (score >= TARGET_SCORE) { setTimeout(() => end(true), 450); return; }
                continue;
            }
            if (it.y > H + 40) items.splice(i, 1);
        }

        if (now - lastSpawn >= SPAWN_INTERVAL) {
            spawnLine();
            lastSpawn = now;
        }

        if (fbAlpha > 0) fbAlpha = Math.max(0, fbAlpha - 0.013);
        if (flashTimer > 0) flashTimer--;

        draw(now);
        animId = requestAnimationFrame(loop);
    }

    function draw() {
        // 배경
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1a2540');
        bg.addColorStop(1, '#0d1428');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        // 차선 영역
        ctx.fillStyle = 'rgba(40,70,110,0.25)';
        ctx.fillRect(W * 0.04, 0, W * 0.46, H);
        ctx.fillStyle = 'rgba(60,55,110,0.25)';
        ctx.fillRect(W * 0.50, 0, W * 0.46, H);

        // 스크롤 줄무늬
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        for (let y = -32 + bgOffset; y < H; y += 32) {
            ctx.fillRect(W * 0.04, y, W * 0.92, 14);
        }

        // 중앙 점선
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 12]);
        ctx.lineDashOffset = -bgOffset;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.setLineDash([]);

        // 외곽
        ctx.strokeStyle = 'rgba(150,180,220,0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W * 0.04, 0); ctx.lineTo(W * 0.04, H);
        ctx.moveTo(W * 0.96, 0); ctx.lineTo(W * 0.96, H);
        ctx.stroke();

        // 아이템
        for (const it of items) {
            ctx.fillStyle = it.item.color;
            ctx.beginPath();
            ctx.arc(it.x, it.y, 22, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();

            ctx.font = '24px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(it.item.emoji, it.x, it.y);

            ctx.font = 'bold 13px sans-serif';
            const label = (it.item.score > 0 ? '+' : '') + it.item.score;
            ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
            ctx.fillStyle = '#fff';
            ctx.strokeText(label, it.x, it.y + 30);
            ctx.fillText(label, it.x, it.y + 30);
        }

        // 플레이어
        const bounce = Math.sin(stepBounce) * 3;
        ctx.save();
        ctx.translate(playerX, PLAYER_Y);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 22, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.font = '40px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏃', 0, -8 + bounce);
        ctx.restore();

        // 플래시
        if (flashTimer > 0) {
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, W, H);
        }

        // 점수 게이지
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(10, 8, W - 20, 6);
        const pct = Math.min(1, score / TARGET_SCORE);
        const grd = ctx.createLinearGradient(10, 0, W - 10, 0);
        grd.addColorStop(0, '#7ef7a0'); grd.addColorStop(1, '#4ade80');
        ctx.fillStyle = grd;
        ctx.fillRect(10, 8, (W - 20) * pct, 6);

        // 피드백 텍스트
        if (fbAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = fbAlpha;
            ctx.font = 'bold 28px sans-serif';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
            ctx.fillStyle = fbColor; ctx.textAlign = 'center';
            const fbY = PLAYER_Y - 55;
            ctx.strokeText(fbText, playerX, fbY);
            ctx.fillText(fbText, playerX, fbY);
            ctx.restore();
        }
    }

    const timerIv = setInterval(() => {
        if (gameOver) return;
        timeLeft--;
        timerEl.textContent = `⏱ ${timeLeft}`;
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
    // 세로모드 핏: 박스 패딩(24px*2) 제외한 뷰포트 너비에 맞춤
    const W = Math.min(400, Math.floor(window.innerWidth * 0.88));
    const maxH = Math.floor(window.innerHeight * 0.65);
    const H = bgImg
        ? Math.min(maxH, Math.round(W * bgImg.naturalHeight / bgImg.naturalWidth))
        : Math.min(maxH, 340);

    const PAD_W=Math.max(56, Math.floor(W*0.16)), PAD_H=10, PAD_Y=H-26, BALL_R=7;
    const BRICK_COLS=8, INIT_ROWS=3;
    const BRICK_W=Math.floor((W-20)/BRICK_COLS), BRICK_H=18, BRICK_TOP=28;
    const ROW_GAP=4, BRICK_LINE_H=BRICK_H+ROW_GAP;
    // HP별 색상: 약함→강함 = 녹→황→주→보
    const HP_COLOR={1:'#44cc88', 2:'#ffee44', 3:'#ff8833', 4:'#cc44ff'};
    const INIT_HP_BY_ROW=[2,1,1];
    const INIT_LIVES=3;
    const ITEM_R=9, ITEM_SPEED=2.2, ITEM_CHANCE=0.22;
    const TRAIL_LEN_BASE=6;
    // 보충 시스템
    const TARGET_KILLS=100;
    const DANGER_Y=PAD_Y-30;                  // 이 라인 아래로 벽돌 도달 시 게임오버
    const SLIDE_PX_PER_SEC=BRICK_LINE_H/0.3;  // 0.3초 슬라이드
    // 누적 아이템 수에 따른 보충 간격(초). 최소 2.5초.
    function getSpawnInterval(c) { return Math.max(2.5, 8 - c * 0.3); }
    // 누적 아이템 수에 따른 공 색상 [중심색, 외곽색]
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
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">🧱 벽돌깨기</h3>
        <div class="mg-info-row">
            <span id="brk-lives">❤️ × ${INIT_LIVES}</span>
            <span id="brk-balls">⚡ 1/0</span>
            <span id="brk-left">🧱 0/${TARGET_KILLS}</span>
        </div>
        <canvas id="mg-brk-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; border-radius:6px;"></canvas>
        <p class="mg-hint">마우스/터치로 패들 조종 &nbsp;|&nbsp; 💚 아이템 = 파워업</p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-brk-canvas');
    const ctx     = canvas.getContext('2d');
    const livesEl = box.querySelector('#brk-lives');
    const ballsEl = box.querySelector('#brk-balls');
    const leftEl  = box.querySelector('#brk-left');

    let lives=INIT_LIVES, gameOver=false, animId, padX=W/2-PAD_W/2;
    let mainBall = { x:padX+PAD_W/2, y:PAD_Y-BALL_R-1, vx:3, vy:-3.8, charge:1 };
    let cumItems = 0;       // 누적 UP 획득 수 (무한 증가)
    let ballHistory = [];   // 잔상용 위치 이력
    let items = [];
    let destroyedCount = 0; // 누적 파괴 수 (클리어 카운터)
    let spawnTimer = 0;     // 다음 줄 추가까지 누적 시간(초)
    let lastFrameTime = performance.now();

    // 누적 아이템 수에 비례한 공 반지름 (캡)
    function ballR() { return BALL_R + Math.min(cumItems, 16) * 0.5; }
    function trailLen() { return Math.min(20, TRAIL_LEN_BASE + Math.floor(cumItems * 0.5)); }

    const bricks = [];
    for (let r=0; r<INIT_ROWS; r++) {
        const hp = INIT_HP_BY_ROW[r];
        for (let c=0; c<BRICK_COLS; c++) {
            const y = BRICK_TOP + r*BRICK_LINE_H;
            bricks.push({x:10+c*BRICK_W, y, targetY:y, alive:true, color:HP_COLOR[hp], hp, maxHp:hp});
        }
    }
    let bricksLeft = bricks.length;

    // 위에서 새 줄 1개 추가, 살아있는 기존 벽돌은 한 칸 아래로 슬라이드 다운
    function addBrickRow() {
        for (const b of bricks) {
            if (b.alive) b.targetY = (b.targetY ?? b.y) + BRICK_LINE_H;
        }
        const k = destroyedCount;
        const hpMax = k < 30 ? 1 : k < 60 ? 2 : k < 80 ? 3 : 4;
        for (let c=0; c<BRICK_COLS; c++) {
            const hp = 1 + Math.floor(Math.random() * hpMax);
            bricks.push({
                x: 10 + c*BRICK_W,
                y: BRICK_TOP - BRICK_LINE_H,   // 화면 위에서 시작
                targetY: BRICK_TOP,
                alive: true,
                color: HP_COLOR[hp] || HP_COLOR[4],
                hp, maxHp: hp,
            });
        }
        bricksLeft += BRICK_COLS;
    }

    // 슬라이드 보간: 살아있는 벽돌이 targetY로 부드럽게 내려옴
    function slideBricks(dt) {
        const step = SLIDE_PX_PER_SEC * dt;
        for (const b of bricks) {
            if (!b.alive) continue;
            if (b.y < b.targetY) b.y = Math.min(b.targetY, b.y + step);
        }
    }

    // 가장 아래 벽돌이 위험 라인 도달했는지
    function isDangerReached() {
        for (const b of bricks) {
            if (!b.alive) continue;
            if (b.y + BRICK_H >= DANGER_Y) return true;
        }
        return false;
    }

    canvas.addEventListener('mousemove', e => {
        const rect=canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W-PAD_W, (e.clientX-rect.left)*(W/rect.width)-PAD_W/2));
    });
    // box 전체를 터치 영역으로 사용 - 캔버스 밖으로 손가락이 나가도 패들 추적
    box.style.touchAction = 'none';
    box.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect=canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W-PAD_W, (e.touches[0].clientX-rect.left)*(W/rect.width)-PAD_W/2));
    }, {passive:false});

    function draw() {
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, W, H);
            ctx.fillStyle='rgba(0,0,0,0.5)';
            ctx.fillRect(0,0,W,H);
        } else {
            ctx.fillStyle='#1a1a2e';
            ctx.fillRect(0,0,W,H);
        }
        bricks.forEach(b => {
            if (!b.alive) return;
            const hpRatio = b.hp / b.maxHp;
            ctx.globalAlpha = 0.55 + hpRatio * 0.45;
            ctx.fillStyle=b.color; ctx.fillRect(b.x+1,b.y+1,BRICK_W-3,BRICK_H-3);
            // 균열 표시 (HP 손상 시)
            if (b.hp < b.maxHp) {
                ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=1;
                ctx.beginPath();
                ctx.moveTo(b.x+BRICK_W*0.3, b.y+2); ctx.lineTo(b.x+BRICK_W*0.45, b.y+BRICK_H-2);
                ctx.moveTo(b.x+BRICK_W*0.6, b.y+3); ctx.lineTo(b.x+BRICK_W*0.5, b.y+BRICK_H-3);
                ctx.stroke();
            }
            ctx.globalAlpha = hpRatio * 0.28;
            ctx.fillStyle='rgba(255,255,255,1)'; ctx.fillRect(b.x+2,b.y+2,BRICK_W-4,5);
            ctx.globalAlpha = 1;
            // HP 숫자 (내구도 2 이상인 벽돌만)
            if (b.maxHp > 1) {
                ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font=`bold ${BRICK_H-5}px sans-serif`;
                ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(b.hp, b.x+BRICK_W/2, b.y+BRICK_H/2);
            }
        });
        // 낙하 아이템
        items.forEach(it => {
            const ig = ctx.createRadialGradient(it.x-2, it.y-2, 1, it.x, it.y, ITEM_R);
            ig.addColorStop(0,'#aaffcc'); ig.addColorStop(1,'#00aa44');
            ctx.beginPath(); ctx.arc(it.x, it.y, ITEM_R, 0, Math.PI*2);
            ctx.fillStyle=ig; ctx.fill();
            ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
            ctx.fillStyle='#fff'; ctx.font='bold 8px sans-serif';
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText('UP', it.x, it.y);
        });
        // 패들
        const pg=ctx.createLinearGradient(padX,PAD_Y,padX,PAD_Y+PAD_H);
        pg.addColorStop(0,'#88ccff'); pg.addColorStop(1,'#4488bb');
        ctx.fillStyle=pg; ctx.fillRect(padX,PAD_Y,PAD_W,PAD_H);
        // 잔상 (뒤→앞 순서로 그려 겹침 처리)
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
            ctx.fillStyle=tg; ctx.fill();
        }
        ctx.globalAlpha = 1;
        // 메인 공 (잔탄 비율로 채도 보정 — 잔탄 적으면 흐려짐)
        const r = ballR();
        const chargeRatio = cumItems > 0 ? Math.max(0.4, mainBall.charge / Math.max(1, cumItems)) : 1;
        ctx.globalAlpha = chargeRatio;
        const bg=ctx.createRadialGradient(mainBall.x-r*0.3, mainBall.y-r*0.3, r*0.1, mainBall.x, mainBall.y, r);
        bg.addColorStop(0, pc0); bg.addColorStop(1, pc1);
        ctx.beginPath(); ctx.arc(mainBall.x, mainBall.y, r, 0, Math.PI*2);
        ctx.fillStyle=bg; ctx.fill();
        // cumItems 3 이상: 공 외곽 글로우 (강도는 cumItems 비례)
        if (cumItems >= 3) {
            ctx.shadowColor = pc1;
            ctx.shadowBlur = Math.min(40, 6 + cumItems * 2);
            ctx.beginPath(); ctx.arc(mainBall.x, mainBall.y, r, 0, Math.PI*2);
            ctx.strokeStyle = pc1; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        // 위험 경고: 가장 아래 벽돌이 위험 라인 60px 이내면 빨강 페이드
        let nearest = 0;
        for (const b of bricks) if (b.alive && b.y+BRICK_H > nearest) nearest = b.y+BRICK_H;
        const proximity = Math.max(0, Math.min(1, (nearest - (DANGER_Y-60)) / 60));
        if (proximity > 0) {
            const pulse = 0.5 + 0.5*Math.sin(performance.now()*0.012);
            ctx.fillStyle = `rgba(255,40,40,${(0.10 + 0.18*pulse) * proximity})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // 벽돌 데미지 처리. 반환값: 'destroyed'|'damaged'|'blocked'|false
    // charge = 0:    데미지 못 줌, 'blocked' (반사만 발생)
    // charge ≥ HP:   한 방 부숨, charge -= HP, 'destroyed'
    // charge < HP:   부분 데미지(b.hp -= charge), charge = 0, 'damaged' (반사)
    function damageBrick(b) {
        if (!b.alive) return false;
        if (mainBall.charge <= 0) return 'blocked';
        if (mainBall.charge < b.hp) {
            b.hp -= mainBall.charge;
            mainBall.charge = 0;
            return 'damaged';
        }
        mainBall.charge -= b.hp;
        b.alive=false; bricksLeft--; destroyedCount++;
        leftEl.textContent=`🧱 ${destroyedCount}/${TARGET_KILLS}`;
        if (Math.random() < ITEM_CHANCE)
            items.push({ x:b.x+BRICK_W/2, y:b.y+BRICK_H/2, vy:ITEM_SPEED });
        return 'destroyed';
    }

    // 공 물리 업데이트. 반환값: true=아웃, 'win'=클리어
    function updateBall(ball) {
        const r = ballR();
        const oldVy = ball.vy;  // 충전 트리거 감지용
        ball.x+=ball.vx; ball.y+=ball.vy;
        if (ball.x-r<0){ball.x=r;ball.vx=Math.abs(ball.vx);audioManager.playSfx(SFX.CARD_FLIP);}
        if (ball.x+r>W){ball.x=W-r;ball.vx=-Math.abs(ball.vx);audioManager.playSfx(SFX.CARD_FLIP);}
        if (ball.y-r<0){ball.y=r;ball.vy=Math.abs(ball.vy);audioManager.playSfx(SFX.CARD_FLIP);}
        if (ball.y+r>=PAD_Y && ball.y+r<=PAD_Y+PAD_H+5 &&
            ball.x>=padX-4 && ball.x<=padX+PAD_W+4 && ball.vy>0) {
            ball.vx=((ball.x-(padX+PAD_W/2))/(PAD_W/2))*5;
            ball.vy=-Math.abs(ball.vy); ball.y=PAD_Y-r;
            audioManager.playSfx(SFX.CARD_PLAY);
        }

        let bounced = false;
        for (const b of bricks) {
            if (!b.alive) continue;
            if (ball.x+r>b.x && ball.x-r<b.x+BRICK_W &&
                ball.y+r>b.y && ball.y-r<b.y+BRICK_H) {
                audioManager.playSfx(SFX.CARD_MATCH);
                const result = damageBrick(b);
                if (result === false) continue;  // 이미 죽은 벽돌
                if (destroyedCount >= TARGET_KILLS) return 'win';

                // 반사 필요한 케이스: 잔탄 부족(damaged), 잔탄 없음(blocked), 잔탄 소진(destroyed → charge 0)
                const needsBounce = result === 'damaged' || result === 'blocked' || ball.charge <= 0;
                if (needsBounce) {
                    if (!bounced) {
                        const ox=Math.min(ball.x+r-b.x, b.x+BRICK_W-(ball.x-r));
                        const oy=Math.min(ball.y+r-b.y, b.y+BRICK_H-(ball.y-r));
                        if (ox<oy) {
                            ball.vx=-ball.vx;
                            // 공이 벽돌 안에 박히지 않도록 x 방향으로 밀어내기
                            ball.x = (ball.x < b.x + BRICK_W/2) ? b.x - r - 0.5 : b.x + BRICK_W + r + 0.5;
                        } else {
                            ball.vy=-ball.vy;
                            ball.y = (ball.y < b.y + BRICK_H/2) ? b.y - r - 0.5 : b.y + BRICK_H + r + 0.5;
                        }
                        bounced=true;
                    }
                    break;
                }
                // 잔탄 남음 → 계속 관통
            }
        }
        // vy 부호 전환(아래→위) 감지: 패들 또는 벽돌 아래면에서 튕긴 순간 → 풀충전
        if (oldVy > 0 && ball.vy < 0) {
            ball.charge = Math.max(1, cumItems);
        }
        return ball.y-r>H;
    }

    function update() {
        if (destroyedCount >= TARGET_KILLS) { end(true); return; }

        const now = performance.now();
        const dt = Math.min(0.05, (now - lastFrameTime) / 1000);  // 50ms 안전 클램프
        lastFrameTime = now;

        // 보충 타이머 (누적 아이템 수에 따라 간격 단축)
        spawnTimer += dt;
        const interval = getSpawnInterval(cumItems);
        if (spawnTimer >= interval) {
            spawnTimer -= interval;
            addBrickRow();
        }
        // 슬라이드 보간
        slideBricks(dt);
        // 위험 라인 도달 시 즉시 게임오버
        if (isDangerReached()) { end(false); return; }

        const result = updateBall(mainBall);
        if (result === 'win') { end(true); return; }
        if (result === true) {
            lives--; livesEl.textContent=`❤️ × ${lives}`;
            audioManager.playSfx(SFX.SHAKE);
            if (lives<=0) { end(false); return; }
            mainBall = {x:padX+PAD_W/2, y:PAD_Y-ballR()-1, vx:3, vy:-3.8, charge:Math.max(1, cumItems)};
            ballHistory = [];
            items = [];
            spawnTimer = 0;  // 라이프 차감 시 다음 줄까지 시간 유예
        } else {
            ballHistory.unshift({ x:mainBall.x, y:mainBall.y });
            const trailCap = trailLen() + 2;
            if (ballHistory.length > trailCap) ballHistory.length = trailCap;
        }
        ballsEl.textContent=`⚡ ${mainBall.charge}/${cumItems}`;

        // 낙하 아이템 업데이트
        const kept=[];
        for (const it of items) {
            it.y+=it.vy;
            if (it.y+ITEM_R>=PAD_Y && it.y-ITEM_R<=PAD_Y+PAD_H &&
                it.x>=padX-4 && it.x<=padX+PAD_W+4) {
                audioManager.playSfx(SFX.COIN);
                cumItems++;
                // 같은 프레임에 패들 반사가 있었으면 새 cumItems로 즉시 보강
                if (mainBall.vy < 0) mainBall.charge = Math.max(mainBall.charge, cumItems);
            } else if (it.y+ITEM_R<H) {
                kept.push(it);
            }
        }
        items=kept;
    }

    function end(won) {
        gameOver=true;
        cancelAnimationFrame(animId);
        draw();
        audioManager.playSfx(won ? SFX.WIN : SFX.BOMB);
        setTimeout(()=>closeOverlay(ov, won?onWin:onLose), 800);
    }

    function loop() { if (gameOver) return; update(); draw(); animId=requestAnimationFrame(loop); }
    loop();
}

// ─── 5. 테트리스 (Tetris) ─────────────────────────────────────────────────────
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
    const COLS = 10, ROWS = 14, CELL = 44;
    const CW = COLS * CELL, CH = ROWS * CELL;
    const WIN_LINES = 6;

    const PIECES = [
        { shape: [[1,1,1,1]],              color: '#00f0f0' }, // I
        { shape: [[1,1],[1,1]],            color: '#f0f000' }, // O
        { shape: [[0,1,0],[1,1,1]],        color: '#a000f0' }, // T
        { shape: [[0,1,1],[1,1,0]],        color: '#00c000' }, // S
        { shape: [[1,1,0],[0,1,1]],        color: '#f00000' }, // Z
        { shape: [[1,0,0],[1,1,1]],        color: '#0000f0' }, // J
        { shape: [[0,0,1],[1,1,1]],        color: '#f0a000' }, // L
    ];

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.style.maxWidth = `${CW + 100}px`;
    box.innerHTML = `
        <h3 class="bm-title">⛓ 형옥 탈출 테트리스</h3>
        <div class="mg-info-row">
            <span id="tet-lines">줄 제거: 0 / ${WIN_LINES}</span>
            <span id="tet-score" style="color:#aaa; font-size:0.85em;">NEXT</span>
        </div>
        <div style="display:flex; gap:8px; justify-content:center; align-items:flex-start;">
            <canvas id="mg-tet-canvas" width="${CW}" height="${CH}"
                style="display:block; border-radius:4px;"></canvas>
            <canvas id="mg-tet-next" width="80" height="80"
                style="border-radius:4px; background:#111; flex-shrink:0;"></canvas>
        </div>
        <p class="mg-hint">← → 이동 &nbsp;|&nbsp; ↑ 회전 &nbsp;|&nbsp; Space 즉시 낙하 &nbsp;|&nbsp; 터치: 탭=회전, 좌우스와이프=이동, 아래스와이프=즉시낙하</p>
    `;
    ov.appendChild(box);

    const canvas   = box.querySelector('#mg-tet-canvas');
    const ctx      = canvas.getContext('2d');
    const nextCvs  = box.querySelector('#mg-tet-next');
    const nextCtx  = nextCvs.getContext('2d');
    const linesEl  = box.querySelector('#tet-lines');

    const board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    let linesCleared = 0, gameOver = false, dropTimer = null;

    function randPiece() {
        const t = PIECES[Math.floor(Math.random() * PIECES.length)];
        return {
            shape: t.shape.map(r => [...r]),
            color: t.color,
            x: Math.floor(COLS / 2) - Math.floor(t.shape[0].length / 2),
            y: 0,
        };
    }

    let cur = randPiece(), nxt = randPiece();

    function rotate(shape) {
        const R = shape.length, C = shape[0].length;
        return Array.from({length: C}, (_, c) =>
            Array.from({length: R}, (_, r) => shape[R - 1 - r][c])
        );
    }

    function valid(shape, x, y) {
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = x + c, ny = y + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
                if (ny >= 0 && board[ny][nx]) return false;
            }
        return true;
    }

    function place() {
        for (let r = 0; r < cur.shape.length; r++)
            for (let c = 0; c < cur.shape[r].length; c++) {
                if (!cur.shape[r][c]) continue;
                if (cur.y + r < 0) { end(false); return; }
                board[cur.y + r][cur.x + c] = cur.color;
            }
        sweepLines();
        cur = nxt;
        nxt = randPiece();
        if (!valid(cur.shape, cur.x, cur.y)) end(false);
    }

    function sweepLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(v => v !== 0)) {
                board.splice(r, 1);
                board.unshift(Array(COLS).fill(0));
                cleared++; r++;
            }
        }
        if (cleared === 0) return;
        linesCleared += cleared;
        linesEl.textContent = `줄 제거: ${linesCleared} / ${WIN_LINES}`;
        if (linesCleared >= WIN_LINES) end(true);
    }

    function end(won) {
        gameOver = true;
        clearInterval(dropTimer);
        document.removeEventListener('keydown', onKey);
        draw();
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 700);
    }

    function drop() {
        if (gameOver) return;
        if (valid(cur.shape, cur.x, cur.y + 1)) cur.y++;
        else place();
        draw();
    }

    function hardDrop() {
        while (valid(cur.shape, cur.x, cur.y + 1)) cur.y++;
        place();
        draw();
    }

    function ghostY() {
        let gy = cur.y;
        while (valid(cur.shape, cur.x, gy + 1)) gy++;
        return gy;
    }

    function drawCell(c2d, x, y, color, cs) {
        c2d.fillStyle = color;
        c2d.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
        c2d.fillStyle = 'rgba(255,255,255,0.22)';
        c2d.fillRect(x * cs + 2, y * cs + 2, cs - 4, 3);
    }

    function draw() {
        // 보드 배경
        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, CW, CH);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, CW, CH);
        } else {
            ctx.fillStyle = '#111'; ctx.fillRect(0, 0, CW, CH);
        }
        // 내부 격자선 (외곽 제외)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r*CELL); ctx.lineTo(CW, r*CELL); ctx.stroke(); }
        for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL, 0); ctx.lineTo(c*CELL, CH); ctx.stroke(); }
        // 외곽 테두리
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(0.5, 0.5, CW - 1, CH - 1);

        // 고정된 블록
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (board[r][c]) drawCell(ctx, c, r, board[r][c], CELL);

        // 고스트
        const gy = ghostY();
        if (gy !== cur.y) {
            for (let r = 0; r < cur.shape.length; r++)
                for (let c = 0; c < cur.shape[r].length; c++)
                    if (cur.shape[r][c]) {
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.fillRect((cur.x+c)*CELL+1, (gy+r)*CELL+1, CELL-2, CELL-2);
                    }
        }

        // 현재 피스
        for (let r = 0; r < cur.shape.length; r++)
            for (let c = 0; c < cur.shape[r].length; c++)
                if (cur.shape[r][c]) drawCell(ctx, cur.x+c, cur.y+r, cur.color, CELL);

        // 다음 피스 미리보기
        nextCtx.fillStyle = '#111'; nextCtx.fillRect(0, 0, 80, 80);
        const ns = nxt.shape, cs2 = 16;
        const ox = Math.floor((4 - ns[0].length) / 2) * cs2 + 4;
        const oy = Math.floor((4 - ns.length) / 2) * cs2 + 4;
        for (let r = 0; r < ns.length; r++)
            for (let c = 0; c < ns[r].length; c++)
                if (ns[r][c]) {
                    nextCtx.fillStyle = nxt.color;
                    nextCtx.fillRect(ox + c*cs2 + 1, oy + r*cs2 + 1, cs2 - 2, cs2 - 2);
                    nextCtx.fillStyle = 'rgba(255,255,255,0.22)';
                    nextCtx.fillRect(ox + c*cs2 + 2, oy + r*cs2 + 2, cs2 - 3, 3);
                }
    }

    function onKey(e) {
        if (gameOver) return;
        switch (e.key) {
            case 'ArrowLeft':
                if (valid(cur.shape, cur.x - 1, cur.y)) { cur.x--; draw(); }
                break;
            case 'ArrowRight':
                if (valid(cur.shape, cur.x + 1, cur.y)) { cur.x++; draw(); }
                break;
            case 'ArrowDown':
                drop(); break;
            case 'ArrowUp': {
                const rot = rotate(cur.shape);
                if (valid(rot, cur.x, cur.y)) { cur.shape = rot; draw(); }
                break;
            }
            case ' ':
                e.preventDefault();
                hardDrop();
                break;
        }
    }

    document.addEventListener('keydown', onKey);

    // 터치 스와이프 컨트롤 (모바일)
    let touchStartX = 0, touchStartY = 0;
    const canvas2 = box.querySelector('#mg-tet-canvas');
    canvas2.addEventListener('touchstart', e => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });
    canvas2.addEventListener('touchmove', e => {
        e.preventDefault(); // 스와이프 중 박스/페이지 스크롤 방지
    }, { passive: false });
    canvas2.addEventListener('touchend', e => {
        if (gameOver) return;
        e.preventDefault();
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        if (absDx < 8 && absDy < 8) {
            // 탭 → 회전
            const rot = rotate(cur.shape);
            if (valid(rot, cur.x, cur.y)) { cur.shape = rot; draw(); }
        } else if (absDx > absDy) {
            if (dx > 0) { if (valid(cur.shape, cur.x+1, cur.y)) { cur.x++; draw(); } }
            else        { if (valid(cur.shape, cur.x-1, cur.y)) { cur.x--; draw(); } }
        } else {
            if (dy > 0) hardDrop();
            else { const rot = rotate(cur.shape); if (valid(rot, cur.x, cur.y)) { cur.shape = rot; draw(); } }
        }
    }, { passive: false });

    dropTimer = setInterval(drop, 600);
    draw();
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

    // 12개월 대표 화투 이미지 (각 월에서 가장 대표적인 카드 한 장씩)
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
    box.innerHTML = `
        <h3 class="bm-title">🀄 사천성</h3>
        <div class="mg-info-row">
            <span id="sc-timer">⏱ ${TIME_LIMIT}</span>
            <span id="sc-left">남은 패: ${TOTAL_TILES}</span>
            <button id="sc-shuffle" class="mg-mode-btn">🔀 섞기</button>
        </div>
        <div class="mg-sc-board" style="width:${BOARD_W}px; height:${BOARD_H}px;">
            <div class="mg-sc-grid" id="sc-grid"
                style="grid-template-columns:repeat(${COLS},${TILE_W}px);
                       grid-template-rows:repeat(${ROWS},${TILE_H}px);"></div>
            <canvas class="mg-sc-canvas" id="sc-canvas"
                width="${BOARD_W}" height="${BOARD_H}"></canvas>
        </div>
        <p class="mg-hint">같은 그림 두 장을 골라 짝맞추세요. 경로는 직선 + 최대 2번 꺾임.</p>
    `;
    ov.appendChild(box);

    const gridEl    = box.querySelector('#sc-grid');
    const canvas    = box.querySelector('#sc-canvas');
    const ctx       = canvas.getContext('2d');
    const timerEl   = box.querySelector('#sc-timer');
    const leftEl    = box.querySelector('#sc-left');
    const shuffleBtn= box.querySelector('#sc-shuffle');

    // 보드 상태: 0 = 비어있음, 1..NUM_TYPES = 타일 종류
    const board = Array.from({length: ROWS}, () => new Array(COLS).fill(0));
    let remaining = TOTAL_TILES;
    let timeLeft  = TIME_LIMIT;
    let gameOver  = false;
    let selected  = null; // {r, c}
    let timerIv;

    // ── 경로 탐색 (외곽 한 칸 패딩 포함) ─────────────────────────
    function cellEmpty(r, c) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return board[r][c] === 0;
        // 외곽 한 칸은 통로
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
        // a, b를 경로 검사 동안 임시로 비움 (양 끝점)
        const sa = board[a.r][a.c], sb = board[b.r][b.c];
        board[a.r][a.c] = 0; board[b.r][b.c] = 0;

        let result = null;
        // 중간 행 r 경유: a → (r, a.c) → (r, b.c) → b
        for (let r = -1; r <= ROWS; r++) {
            if (!cellEmpty(r, a.c) || !cellEmpty(r, b.c)) continue;
            if (!colClear(a.c, a.r, r)) continue;
            if (!colClear(b.c, b.r, r)) continue;
            if (!rowClear(r, a.c, b.c)) continue;
            result = uniquePath([[a.r, a.c], [r, a.c], [r, b.c], [b.r, b.c]]);
            break;
        }
        // 중간 열 c 경유: a → (a.r, c) → (b.r, c) → b
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

    // 남은 패 중 연결 가능한 쌍이 존재하는지
    function hasAnyMatch() {
        const cells = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (board[r][c] !== 0) cells.push({r, c, t: board[r][c]});
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                if (cells[i].t !== cells[j].t) continue;
                if (findPath(cells[i], cells[j])) return true;
            }
        }
        return false;
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
        // 12종 × 4장 = 48장 환경에서는 풀이 가능 배치가 압도적으로 흔하므로
        // 캡 없이 매치 가능한 분배가 나올 때까지 반복 (실제로는 1~2회 내 종료).
        while (remaining > 0 && !hasAnyMatch()) shuffleBoard();
    }

    // 초기 분배
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

    // ── 렌더링 ────────────────────────────────────────────────
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
        ctx.strokeStyle = '#ffe14a';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255,225,74,0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const [r, c] = path[i];
            // -1/ROWS/COLS 외곽 경유 시 경계로 클리핑
            const cx = Math.max(0, Math.min(BOARD_W, c * TILE_W + TILE_W / 2));
            const cy = Math.max(0, Math.min(BOARD_H, r * TILE_H + TILE_H / 2));
            if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    function clearPath() { ctx.clearRect(0, 0, BOARD_W, BOARD_H); }

    // ── 입력 처리 ─────────────────────────────────────────────
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
            // 매치 불가
            selected = {r, c}; refreshCells(); return;
        }
        // 매치 성공
        drawPath(path);
        try { audioManager.playSfx(SFX.CARD_MATCH); } catch (e) {}
        const a = selected;
        selected = null;
        setTimeout(() => {
            board[a.r][a.c] = 0;
            board[r][c]     = 0;
            remaining -= 2;
            leftEl.textContent = `남은 패: ${remaining}`;
            refreshCells();
            clearPath();
            if (remaining === 0) {
                gameOver = true;
                clearInterval(timerIv);
                timerEl.textContent = '⏱ 클리어!';
                timerEl.style.color = '#4cff4c';
                setTimeout(() => closeOverlay(ov, onWin), 700);
                return;
            }
            // 데드락 자동 셔플
            if (!hasAnyMatch()) {
                shuffleBoard();
                ensureSolvable();
                refreshCells();
            }
        }, 280);
    }

    shuffleBtn.addEventListener('click', () => {
        if (gameOver) return;
        selected = null;
        shuffleBoard();
        ensureSolvable();
        refreshCells();
        clearPath();
    });

    timerIv = setInterval(() => {
        if (gameOver) return;
        timeLeft--;
        timerEl.textContent = `⏱ ${timeLeft}`;
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
