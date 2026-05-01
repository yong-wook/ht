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

// ─── 2. 낚시 (Fishing) — 찌 타이밍 방식 ────────────────────────────────────
export function showFishing(onWin, onLose) {
    const W = 400, H = 280;
    const TARGET = 5, TIME_LIMIT = 60;
    const WATER_Y = H * 0.44;
    const ROD_X = W * 0.28, ROD_Y = 28;
    const BOB_X  = W * 0.62;

    // 상태
    const S = { IDLE: 0, NIBBLE: 1, BITE: 2, CAUGHT: 3, MISS: 4 };

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">🎣 낚시</h3>
        <div class="mg-info-row">
            <span id="mg-fish-count">🐟 0 / ${TARGET}</span>
            <span id="mg-fish-timer">⏱ ${TIME_LIMIT}</span>
        </div>
        <canvas id="mg-fishing-canvas" width="${W}" height="${H}"
            style="cursor:pointer; border-radius:8px; display:block; margin:0 auto;"></canvas>
        <p class="mg-hint">찌가 쑥 잠기는 순간 클릭! (Space 가능)</p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-fishing-canvas');
    const ctx     = canvas.getContext('2d');
    const countEl = box.querySelector('#mg-fish-count');
    const timerEl = box.querySelector('#mg-fish-timer');

    let caught = 0, timeLeft = TIME_LIMIT, gameOver = false, animId;
    let state = S.IDLE, stateEnd = 0;
    let bobDip = 0;
    let fbText = '', fbColor = '#fff', fbAlpha = 0;

    const FISH_EMOJIS = ['🐟','🐠','🐡','🐟','🐠'];
    const fishes = Array.from({length: 5}, () => spawnFish());
    let hookFish = null;

    function spawnFish() {
        return {
            emoji: FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)],
            x: Math.random() * W,
            y: WATER_Y + 25 + Math.random() * (H - WATER_Y - 50),
            vx: (Math.random() - 0.5) * 1.8,
            vy: (Math.random() - 0.5) * 0.5,
            size: 20,
        };
    }

    function go(newState) {
        state = newState;
        const now = performance.now();
        if (newState === S.IDLE) {
            stateEnd = now + 1800 + Math.random() * 2800;
            hookFish = null;
        } else if (newState === S.NIBBLE) {
            stateEnd = now + 600 + Math.random() * 700;
            hookFish = fishes.reduce((a, b) =>
                Math.hypot(a.x - BOB_X, a.y - (WATER_Y + 50)) <
                Math.hypot(b.x - BOB_X, b.y - (WATER_Y + 50)) ? a : b
            );
        } else if (newState === S.BITE) {
            stateEnd = now + 650 + Math.random() * 400;
        } else if (newState === S.CAUGHT) {
            stateEnd = now + 950;
            fbText = '낚았다! 🎉'; fbColor = '#7ef7a0'; fbAlpha = 1;
            caught++;
            countEl.textContent = `🐟 ${caught} / ${TARGET}`;
            if (caught >= TARGET) { setTimeout(() => end(true), 750); return; }
        } else if (newState === S.MISS) {
            stateEnd = now + 850;
            fbText = '놓쳤다...'; fbColor = '#f99'; fbAlpha = 1;
        }
    }

    function onInput() {
        if (gameOver || state === S.CAUGHT || state === S.MISS) return;
        if (state === S.BITE) go(S.CAUGHT);
        else go(S.MISS);
    }

    canvas.addEventListener('click', onInput);
    function onKey(e) { if (e.code === 'Space') { e.preventDefault(); onInput(); } }
    document.addEventListener('keydown', onKey);

    let lastT = performance.now();

    function loop(now) {
        if (gameOver) return;
        lastT = now;

        // 상태 전환
        if (now >= stateEnd) {
            if (state === S.IDLE)   go(S.NIBBLE);
            else if (state === S.NIBBLE) go(S.BITE);
            else if (state === S.BITE)   go(S.MISS);
            else if (state === S.CAUGHT || state === S.MISS) go(S.IDLE);
        }

        // 찌 침강
        const dipTarget = (state === S.BITE || state === S.CAUGHT) ? 30 : 0;
        bobDip += (dipTarget - bobDip) * 0.2;

        // 물고기 이동
        fishes.forEach(f => {
            if (f === hookFish && (state === S.NIBBLE || state === S.BITE)) {
                f.x += (BOB_X - f.x) * 0.06;
                f.y += (WATER_Y + 55 - f.y) * 0.06;
            } else {
                f.x += f.vx; f.y += f.vy;
                if (f.x < -30) f.x = W + 30;
                if (f.x > W + 30) f.x = -30;
                if (f.y < WATER_Y + 12 || f.y > H - 12) f.vy *= -1;
            }
        });

        if (fbAlpha > 0) fbAlpha = Math.max(0, fbAlpha - 0.018);

        draw(now);
        animId = requestAnimationFrame(loop);
    }

    function draw(now) {
        // 하늘
        const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y);
        sky.addColorStop(0, '#87ceeb'); sky.addColorStop(1, '#c8eaf8');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, WATER_Y);

        // 물
        const sea = ctx.createLinearGradient(0, WATER_Y, 0, H);
        sea.addColorStop(0, '#1a6fa0'); sea.addColorStop(1, '#0a3a5c');
        ctx.fillStyle = sea; ctx.fillRect(0, WATER_Y, W, H - WATER_Y);

        // 수면 반짝임
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        [20, 90, 160, 240, 320].forEach((x, i) =>
            ctx.fillRect(x, WATER_Y + 5 + (i % 2) * 14, 50, 4)
        );

        // 낚싯대
        ctx.strokeStyle = '#7a3b0a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ROD_X - 55, H * 0.04); ctx.lineTo(ROD_X, ROD_Y); ctx.stroke();

        // 낚싯줄
        const bobY = WATER_Y + bobDip + Math.sin(now * 0.002) * (state === S.IDLE ? 2 : 0);
        ctx.strokeStyle = 'rgba(220,220,220,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ROD_X, ROD_Y); ctx.lineTo(BOB_X, bobY); ctx.stroke();

        // 찌 흔들림
        const nib = state === S.NIBBLE ? Math.sin(now * 0.025) * 4 : 0;

        // 찌 막대
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(BOB_X - 1.5, bobY - 14 + nib, 3, 14);

        // 찌 몸통
        const bobColor = state === S.BITE    ? '#ff3333'
                       : state === S.NIBBLE  ? '#ffaa00'
                       : state === S.CAUGHT  ? '#44dd66'
                       :                       '#ff7766';
        ctx.beginPath();
        ctx.ellipse(BOB_X, bobY + 5 + nib, 7, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = bobColor; ctx.fill();
        ctx.beginPath();
        ctx.ellipse(BOB_X, bobY + 9 + nib, 7, 5, 0, 0, Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();

        // 물고기
        fishes.forEach(f => {
            ctx.save(); ctx.translate(f.x, f.y);
            const goLeft = f.vx < 0 || (f === hookFish && BOB_X < f.x);
            if (goLeft) ctx.scale(-1, 1);
            ctx.font = `${f.size}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(f.emoji, 0, 0);
            ctx.restore();
        });

        // 상태 힌트
        const hint = state === S.IDLE    ? '대기 중...'
                   : state === S.NIBBLE  ? '찌가 흔들립니다...'
                   : state === S.BITE    ? '지금!'
                   : '';
        const hintColor = state === S.BITE   ? `rgba(255,${80 + Math.floor(Math.sin(now*0.025)*80)},50,1)`
                        : state === S.NIBBLE ? '#ffcc44'
                        :                      'rgba(255,255,255,0.45)';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center'; ctx.fillStyle = hintColor;
        ctx.fillText(hint, W / 2, H - 14);

        // 피드백
        if (fbAlpha > 0) {
            ctx.globalAlpha = fbAlpha;
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = fbColor; ctx.textAlign = 'center';
            ctx.fillText(fbText, W / 2, WATER_Y - 16);
            ctx.globalAlpha = 1;
        }
    }

    const timerIv = setInterval(() => {
        if (gameOver) return;
        timerEl.textContent = `⏱ ${--timeLeft}`;
        if (timeLeft <= 0) end(false);
    }, 1000);

    function end(won) {
        gameOver = true;
        cancelAnimationFrame(animId);
        clearInterval(timerIv);
        document.removeEventListener('keydown', onKey);
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 700);
    }

    go(S.IDLE);
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
        : Math.min(maxH, 280);

    const PAD_W=Math.max(56, Math.floor(W*0.16)), PAD_H=10, PAD_Y=H-26, BALL_R=7;
    const BRICK_COLS=8, BRICK_ROWS=4;
    const BRICK_W=Math.floor((W-20)/BRICK_COLS), BRICK_H=18, BRICK_TOP=28;
    const ROW_COLORS=['#ff6666','#ffaa44','#ffee44','#44cc88'];
    const INIT_LIVES=3;
    const ITEM_R=9, ITEM_SPEED=2.2, ITEM_CHANCE=0.28;

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">🧱 벽돌깨기</h3>
        <div class="mg-info-row">
            <span id="brk-lives">❤️ × ${INIT_LIVES}</span>
            <span id="brk-balls">🔵 × 1</span>
            <span id="brk-left">벽돌: ${BRICK_ROWS*BRICK_COLS}</span>
        </div>
        <canvas id="mg-brk-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; border-radius:6px;"></canvas>
        <p class="mg-hint">마우스/터치로 패들 조종 &nbsp;|&nbsp; 💚 아이템 = 공 추가</p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-brk-canvas');
    const ctx     = canvas.getContext('2d');
    const livesEl = box.querySelector('#brk-lives');
    const ballsEl = box.querySelector('#brk-balls');
    const leftEl  = box.querySelector('#brk-left');

    let lives=INIT_LIVES, gameOver=false, animId, padX=W/2-PAD_W/2;
    let balls = [{ x:W/2, y:H/2-40, vx:3, vy:-3.8 }];
    let items = [];

    const bricks = [];
    for (let r=0;r<BRICK_ROWS;r++) for (let c=0;c<BRICK_COLS;c++)
        bricks.push({x:10+c*BRICK_W, y:BRICK_TOP+r*(BRICK_H+4), alive:true, color:ROW_COLORS[r]});
    let bricksLeft = bricks.length;

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
            ctx.fillStyle=b.color; ctx.fillRect(b.x+1,b.y+1,BRICK_W-3,BRICK_H-3);
            ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.fillRect(b.x+2,b.y+2,BRICK_W-4,5);
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
            ctx.fillText('+1', it.x, it.y);
        });
        // 패들
        const pg=ctx.createLinearGradient(padX,PAD_Y,padX,PAD_Y+PAD_H);
        pg.addColorStop(0,'#88ccff'); pg.addColorStop(1,'#4488bb');
        ctx.fillStyle=pg; ctx.fillRect(padX,PAD_Y,PAD_W,PAD_H);
        // 공
        balls.forEach(ball => {
            const bg=ctx.createRadialGradient(ball.x-2,ball.y-2,1,ball.x,ball.y,BALL_R);
            bg.addColorStop(0,'#fff'); bg.addColorStop(1,'#aae');
            ctx.beginPath(); ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2);
            ctx.fillStyle=bg; ctx.fill();
        });
    }

    // 공 하나 업데이트. 반환값: true=아웃(제거), 'win'=전체 벽돌 제거
    function updateBall(ball) {
        ball.x+=ball.vx; ball.y+=ball.vy;
        if (ball.x-BALL_R<0){ball.x=BALL_R;ball.vx=Math.abs(ball.vx);audioManager.playSfx(SFX.CARD_FLIP);}
        if (ball.x+BALL_R>W){ball.x=W-BALL_R;ball.vx=-Math.abs(ball.vx);audioManager.playSfx(SFX.CARD_FLIP);}
        if (ball.y-BALL_R<0){ball.y=BALL_R;ball.vy=Math.abs(ball.vy);audioManager.playSfx(SFX.CARD_FLIP);}
        if (ball.y+BALL_R>=PAD_Y && ball.y+BALL_R<=PAD_Y+PAD_H+5 &&
            ball.x>=padX-4 && ball.x<=padX+PAD_W+4 && ball.vy>0) {
            ball.vx=((ball.x-(padX+PAD_W/2))/(PAD_W/2))*5;
            ball.vy=-Math.abs(ball.vy); ball.y=PAD_Y-BALL_R;
            audioManager.playSfx(SFX.CARD_PLAY);
        }
        for (const b of bricks) {
            if (!b.alive) continue;
            if (ball.x+BALL_R>b.x && ball.x-BALL_R<b.x+BRICK_W &&
                ball.y+BALL_R>b.y && ball.y-BALL_R<b.y+BRICK_H) {
                b.alive=false; bricksLeft--;
                leftEl.textContent=`벽돌: ${bricksLeft}`;
                audioManager.playSfx(SFX.CARD_MATCH);
                if (Math.random() < ITEM_CHANCE)
                    items.push({ x:b.x+BRICK_W/2, y:b.y+BRICK_H/2, vy:ITEM_SPEED });
                const ox=Math.min(ball.x+BALL_R-b.x,b.x+BRICK_W-(ball.x-BALL_R));
                const oy=Math.min(ball.y+BALL_R-b.y,b.y+BRICK_H-(ball.y-BALL_R));
                if (ox<oy) ball.vx=-ball.vx; else ball.vy=-ball.vy;
                if (bricksLeft===0) return 'win';
                break;
            }
        }
        return ball.y-BALL_R>H;
    }

    function update() {
        const lost=[];
        for (let i=0; i<balls.length; i++) {
            const r=updateBall(balls[i]);
            if (r==='win') { end(true); return; }
            if (r===true) lost.push(i);
        }
        for (let i=lost.length-1; i>=0; i--) balls.splice(lost[i],1);
        if (balls.length===0) {
            lives--; livesEl.textContent=`❤️ × ${lives}`;
            audioManager.playSfx(SFX.SHAKE);
            if (lives<=0) { end(false); return; }
            balls=[{x:W/2, y:H/2-40, vx:3, vy:-3.8}];
            items=[];
        }
        ballsEl.textContent=`🔵 × ${balls.length}`;

        // 낙하 아이템 업데이트
        const kept=[];
        for (const it of items) {
            it.y+=it.vy;
            if (it.y+ITEM_R>=PAD_Y && it.y-ITEM_R<=PAD_Y+PAD_H &&
                it.x>=padX-4 && it.x<=padX+PAD_W+4) {
                // 패들이 아이템 캐치 → 새 공 추가
                audioManager.playSfx(SFX.COIN);
                const angle=(Math.random()*0.8-0.4)-Math.PI/2;
                const spd=3.8;
                balls.push({x:padX+PAD_W/2, y:PAD_Y-BALL_R-1,
                            vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd});
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

// ─── 7. 화살피하기 (Arrow Dodge) ──────────────────────────────────────────────
export function showArrowDodge(onWin, onLose) {
    const W=400, H=260, TIME_LIMIT=30, LIVES=3, PR=14, INVULN=60;

    const ov=buildOverlay();
    const box=document.createElement('div');
    box.className='bm-box mg-box';
    box.innerHTML=`
        <h3 class="bm-title">🏹 화살피하기</h3>
        <div class="mg-info-row">
            <span id="ad-lives">❤️ × ${LIVES}</span>
            <span id="ad-timer">⏱ ${TIME_LIMIT}</span>
        </div>
        <canvas id="mg-arrow-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; cursor:none; border-radius:6px;"></canvas>
        <p class="mg-hint">마우스로 피하세요! ${TIME_LIMIT}초 생존하면 승리!</p>
    `;
    ov.appendChild(box);

    const canvas  = box.querySelector('#mg-arrow-canvas');
    const ctx     = canvas.getContext('2d');
    const livesEl = box.querySelector('#ad-lives');
    const timerEl = box.querySelector('#ad-timer');

    let lives=LIVES, timeLeft=TIME_LIMIT, gameOver=false, animId, invuln=0, frame=0;
    let mx=W/2, my=H/2;
    const arrows=[];

    canvas.addEventListener('mousemove', e => {
        const r=canvas.getBoundingClientRect();
        mx=(e.clientX-r.left)*(W/r.width); my=(e.clientY-r.top)*(H/r.height);
    });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const r=canvas.getBoundingClientRect();
        mx=(e.touches[0].clientX-r.left)*(W/r.width); my=(e.touches[0].clientY-r.top)*(H/r.height);
    }, {passive:false});

    function spawn() {
        const side=Math.floor(Math.random()*4);
        let x,y,angle;
        if (side===0){x=Math.random()*W;y=-20;angle=Math.PI/2+(Math.random()-.5)*0.9;}
        else if(side===1){x=W+20;y=Math.random()*H;angle=Math.PI+(Math.random()-.5)*0.9;}
        else if(side===2){x=Math.random()*W;y=H+20;angle=-Math.PI/2+(Math.random()-.5)*0.9;}
        else{x=-20;y=Math.random()*H;angle=(Math.random()-.5)*0.9;}
        const spd=3+Math.random()*2+(TIME_LIMIT-timeLeft)*0.13;
        arrows.push({x,y,angle,spd});
    }

    const timerIv=setInterval(()=>{
        if (gameOver) return;
        timerEl.textContent=`⏱ ${--timeLeft}`;
        if (timeLeft<=0){
            gameOver=true; cancelAnimationFrame(animId); clearInterval(timerIv);
            timerEl.textContent='⏱ 생존!'; timerEl.style.color='#4cff4c';
            setTimeout(()=>closeOverlay(ov,onWin),800);
        }
    },1000);

    function loop() {
        if (gameOver) return; frame++;
        if (invuln > 0) invuln--;
        const rate=Math.max(15,42-Math.floor((TIME_LIMIT-timeLeft)/2));
        if (frame%rate===0) spawn();

        for (let i=arrows.length-1;i>=0;i--) {
            const a=arrows[i];
            a.x+=Math.cos(a.angle)*a.spd; a.y+=Math.sin(a.angle)*a.spd;
            if (a.x<-80||a.x>W+80||a.y<-80||a.y>H+80){arrows.splice(i,1);continue;}
            if (invuln>0){continue;}
            const dx=a.x-mx, dy=a.y-my;
            if (dx*dx+dy*dy<(PR+5)*(PR+5)) {
                arrows.splice(i,1); lives--; invuln=INVULN;
                livesEl.textContent=`❤️ × ${lives}`;
                if (lives<=0){gameOver=true;cancelAnimationFrame(animId);clearInterval(timerIv);setTimeout(()=>closeOverlay(ov,onLose),600);return;}
            }
        }

        ctx.fillStyle='#1a2a3a'; ctx.fillRect(0,0,W,H);
        ctx.strokeStyle='rgba(100,150,200,0.08)'; ctx.lineWidth=1;
        for (let i=0;i<W;i+=44){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke();}
        for (let j=0;j<H;j+=44){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(W,j);ctx.stroke();}

        arrows.forEach(a=>{
            ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.angle);
            ctx.strokeStyle='#ff8844'; ctx.fillStyle='#ff8844'; ctx.lineWidth=3;
            ctx.beginPath(); ctx.moveTo(-20,0); ctx.lineTo(20,0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(12,-5); ctx.lineTo(12,5); ctx.closePath(); ctx.fill();
            ctx.restore();
        });

        // Player (blink when invulnerable)
        if (!(invuln>0 && Math.floor(invuln/6)%2===0)) {
            ctx.font=`${PR*2}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText('🧍',mx,my);
        }

        animId=requestAnimationFrame(loop);
    }
    loop();
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
