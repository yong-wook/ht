// js/minigames.js
// 보드 타일 컬렉션 해금 미니게임 8종

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
        return aiScore * 2 + plScore + center * 10;
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
        // 3. 위협 점수 기반 최선의 수
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

// ─── 2. 낚시 (Fishing) ────────────────────────────────────────────────────────
export function showFishing(onWin, onLose) {
    const W = 400, H = 220, TARGET = 6, TIME_LIMIT = 90;
    const FISH_TYPES = [
        { emoji: '🐟', r: 18 }, { emoji: '🐠', r: 20 }, { emoji: '🐡', r: 16 },
    ];

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
        <p class="mg-hint">물고기를 클릭해 잡으세요!</p>
    `;
    ov.appendChild(box);

    const canvas   = box.querySelector('#mg-fishing-canvas');
    const ctx      = canvas.getContext('2d');
    const countEl  = box.querySelector('#mg-fish-count');
    const timerEl  = box.querySelector('#mg-fish-timer');

    let caught = 0, timeLeft = TIME_LIMIT, gameOver = false, animId;

    function makeFish() {
        const t = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
        const goRight = Math.random() < 0.5;
        return {
            ...t, alive: true,
            x: goRight ? -t.r : W + t.r,
            y: 30 + Math.random() * (H - 60),
            vx: (goRight ? 1 : -1) * (1.2 + Math.random() * 2),
            vy: (Math.random() - 0.5) * 0.7,
        };
    }

    const fishes = Array.from({length: 8}, () => { const f = makeFish(); f.x = Math.random()*W; return f; });
    const ripples = [];

    function loop() {
        if (gameOver) return;
        fishes.forEach(f => {
            if (!f.alive) return;
            f.x += f.vx; f.y += f.vy;
            if (f.y < f.r) { f.y = f.r; f.vy *= -1; }
            if (f.y > H - f.r) { f.y = H - f.r; f.vy *= -1; }
            if (f.x < -f.r-30 || f.x > W+f.r+30) Object.assign(f, makeFish(), {alive:true});
        });
        for (let i = ripples.length-1; i >= 0; i--) { ripples[i].age++; if (ripples[i].age > 22) ripples.splice(i,1); }

        ctx.fillStyle = '#1a6fa0'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(100,200,255,0.10)';
        for (let i = 0; i < 5; i++) ctx.fillRect(0, i*44, W, 18);

        fishes.forEach(f => {
            if (!f.alive) return;
            ctx.save(); ctx.translate(f.x, f.y);
            if (f.vx < 0) ctx.scale(-1, 1);
            ctx.font = `${f.r*2}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(f.emoji, 0, 0); ctx.restore();
        });
        ripples.forEach(rp => {
            const a = 1 - rp.age/22;
            ctx.strokeStyle = `rgba(255,255,255,${a*0.7})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.age*2.2, 0, Math.PI*2); ctx.stroke();
        });
        animId = requestAnimationFrame(loop);
    }

    const timerIv = setInterval(() => {
        if (gameOver) return;
        timerEl.textContent = `⏱ ${--timeLeft}`;
        if (timeLeft <= 0) end(false);
    }, 1000);

    function end(won) {
        gameOver = true; cancelAnimationFrame(animId); clearInterval(timerIv);
        setTimeout(() => closeOverlay(ov, won ? onWin : onLose), 700);
    }

    canvas.addEventListener('click', e => {
        if (gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W/rect.width);
        const my = (e.clientY - rect.top)  * (H/rect.height);
        for (const f of fishes) {
            if (!f.alive) continue;
            const dx = f.x-mx, dy = f.y-my;
            if (dx*dx + dy*dy < (f.r+10)*(f.r+10)) {
                f.alive = false; ripples.push({x:f.x, y:f.y, age:0});
                countEl.textContent = `🐟 ${++caught} / ${TARGET}`;
                setTimeout(() => { Object.assign(f, makeFish()); f.alive = true; }, 1800);
                if (caught >= TARGET) end(true);
                break;
            }
        }
    });

    loop();
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
    const W=400, H=280, PAD_W=64, PAD_H=10, PAD_Y=H-26, BALL_R=7;
    const BRICK_COLS=8, BRICK_ROWS=4;
    const BRICK_W=Math.floor((W-20)/BRICK_COLS), BRICK_H=18, BRICK_TOP=28;
    const ROW_COLORS=['#ff6666','#ffaa44','#ffee44','#44cc88'];
    const INIT_LIVES=3;

    const ov = buildOverlay();
    const box = document.createElement('div');
    box.className = 'bm-box mg-box';
    box.innerHTML = `
        <h3 class="bm-title">🧱 벽돌깨기</h3>
        <div class="mg-info-row">
            <span id="brk-lives">❤️ × ${INIT_LIVES}</span>
            <span id="brk-left">벽돌: ${BRICK_ROWS*BRICK_COLS}</span>
        </div>
        <canvas id="mg-brk-canvas" width="${W}" height="${H}"
            style="display:block; margin:0 auto; border-radius:6px;"></canvas>
        <p class="mg-hint">마우스로 패들을 조종하세요</p>
    `;
    ov.appendChild(box);

    const canvas   = box.querySelector('#mg-brk-canvas');
    const ctx      = canvas.getContext('2d');
    const livesEl  = box.querySelector('#brk-lives');
    const leftEl   = box.querySelector('#brk-left');

    let lives=INIT_LIVES, gameOver=false, animId, padX=W/2-PAD_W/2;
    let bx=W/2, by=H/2-40, vx=3, vy=-3.8;

    const bricks = [];
    for (let r=0;r<BRICK_ROWS;r++) for (let c=0;c<BRICK_COLS;c++)
        bricks.push({x:10+c*BRICK_W, y:BRICK_TOP+r*(BRICK_H+4), alive:true, color:ROW_COLORS[r]});
    let bricksLeft = bricks.length;

    canvas.addEventListener('mousemove', e => {
        const rect=canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W-PAD_W, (e.clientX-rect.left)*(W/rect.width)-PAD_W/2));
    });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect=canvas.getBoundingClientRect();
        padX = Math.max(0, Math.min(W-PAD_W, (e.touches[0].clientX-rect.left)*(W/rect.width)-PAD_W/2));
    }, {passive:false});

    function draw() {
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,W,H);
        bricks.forEach(b => {
            if (!b.alive) return;
            ctx.fillStyle=b.color; ctx.fillRect(b.x+1,b.y+1,BRICK_W-3,BRICK_H-3);
            ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.fillRect(b.x+2,b.y+2,BRICK_W-4,5);
        });
        const pg=ctx.createLinearGradient(padX,PAD_Y,padX,PAD_Y+PAD_H);
        pg.addColorStop(0,'#88ccff'); pg.addColorStop(1,'#4488bb');
        ctx.fillStyle=pg; ctx.fillRect(padX,PAD_Y,PAD_W,PAD_H);
        const bg=ctx.createRadialGradient(bx-2,by-2,1,bx,by,BALL_R);
        bg.addColorStop(0,'#fff'); bg.addColorStop(1,'#aae');
        ctx.beginPath(); ctx.arc(bx,by,BALL_R,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
    }

    function update() {
        bx+=vx; by+=vy;
        if (bx-BALL_R<0){bx=BALL_R;vx=Math.abs(vx);}
        if (bx+BALL_R>W){bx=W-BALL_R;vx=-Math.abs(vx);}
        if (by-BALL_R<0){by=BALL_R;vy=Math.abs(vy);}
        if (by+BALL_R>=PAD_Y && by+BALL_R<=PAD_Y+PAD_H+5 && bx>=padX-4 && bx<=padX+PAD_W+4 && vy>0) {
            vx=((bx-(padX+PAD_W/2))/(PAD_W/2))*5;
            vy=-Math.abs(vy); by=PAD_Y-BALL_R;
        }
        for (const b of bricks) {
            if (!b.alive) continue;
            if (bx+BALL_R>b.x && bx-BALL_R<b.x+BRICK_W && by+BALL_R>b.y && by-BALL_R<b.y+BRICK_H) {
                b.alive=false; bricksLeft--;
                leftEl.textContent=`벽돌: ${bricksLeft}`;
                const ox=Math.min(bx+BALL_R-b.x,b.x+BRICK_W-(bx-BALL_R));
                const oy=Math.min(by+BALL_R-b.y,b.y+BRICK_H-(by-BALL_R));
                if (ox<oy) vx=-vx; else vy=-vy;
                if (bricksLeft===0) { gameOver=true; cancelAnimationFrame(animId); draw(); setTimeout(()=>closeOverlay(ov,onWin),800); return; }
                break;
            }
        }
        if (by-BALL_R>H) {
            lives--; livesEl.textContent=`❤️ × ${lives}`;
            if (lives<=0) { gameOver=true; cancelAnimationFrame(animId); draw(); setTimeout(()=>closeOverlay(ov,onLose),800); return; }
            bx=W/2; by=H/2-40; vx=3; vy=-3.8;
        }
    }

    function loop() { if (gameOver) return; update(); draw(); animId=requestAnimationFrame(loop); }
    loop();
}

// ─── 5. 수도쿠 (Sudoku) ──────────────────────────────────────────────────────
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

// ─── 8. 소매치기잡기 (Pickpocket) ─────────────────────────────────────────────
export function showPickpocket(onWin, onLose) {
    const ROWS=3, COLS=4, TARGET=10, TIME_LIMIT=50;

    const ov=buildOverlay();
    const box=document.createElement('div');
    box.className='bm-box mg-box';
    box.innerHTML=`
        <h3 class="bm-title">👮 소매치기잡기</h3>
        <p class="bm-desc">소매치기(🦹)를 잡으세요! 시민(🧑)을 잡으면 -1점</p>
        <div class="mg-info-row">
            <span id="pp-score">잡기: 0 / ${TARGET}</span>
            <span id="pp-timer">⏱ ${TIME_LIMIT}</span>
        </div>
        <div class="pp-grid" id="pp-grid"></div>
    `;
    ov.appendChild(box);

    const gridEl  = box.querySelector('#pp-grid');
    const scoreEl = box.querySelector('#pp-score');
    const timerEl = box.querySelector('#pp-timer');

    let catches=0, timeLeft=TIME_LIMIT, gameOver=false;
    const cells=Array.from({length:ROWS*COLS},()=>({active:false,type:null,tid:null}));

    function render() {
        gridEl.innerHTML='';
        cells.forEach((cell,i)=>{
            const el=document.createElement('div');
            el.className='pp-cell';
            if (cell.active) {
                el.classList.add(cell.type==='thief'?'pp-thief':'pp-citizen');
                el.textContent=cell.type==='thief'?'🦹':'🧑';
                el.addEventListener('click',()=>{
                    if (gameOver||!cell.active) return;
                    if (cell.type==='thief') {
                        clearTimeout(cell.tid); cell.active=false;
                        scoreEl.textContent=`잡기: ${++catches} / ${TARGET}`;
                        render(); if (catches>=TARGET) end(true);
                    } else {
                        catches=Math.max(0,catches-1);
                        scoreEl.textContent=`잡기: ${catches} / ${TARGET}`;
                        el.style.background='#ff4444';
                        setTimeout(()=>render(),300);
                    }
                });
            }
            gridEl.appendChild(el);
        });
    }

    function spawnOne() {
        if (gameOver) return;
        const empty=cells.map((c,i)=>c.active?null:i).filter(i=>i!==null);
        if (!empty.length) return;
        const i=empty[Math.floor(Math.random()*empty.length)];
        const isThief=Math.random()<0.4;
        cells[i]={active:true, type:isThief?'thief':'citizen',
            tid:setTimeout(()=>{ cells[i].active=false; cells[i].tid=null; render(); }, isThief?1200:1800)
        };
        render();
    }

    function end(won) {
        gameOver=true; clearInterval(timerIv); clearInterval(spawnIv);
        cells.forEach(c=>{ if(c.tid) clearTimeout(c.tid); });
        setTimeout(()=>closeOverlay(ov,won?onWin:onLose),700);
    }

    const timerIv=setInterval(()=>{
        if (gameOver) return;
        timerEl.textContent=`⏱ ${--timeLeft}`;
        if (timeLeft<=0) end(catches>=TARGET);
    },1000);

    const spawnIv=setInterval(()=>{ if(!gameOver) spawnOne(); },650);
    render();
}
