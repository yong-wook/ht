// 페이지 로드마다 새 타임스탬프 → 오디오 파일 교체 시 캐시 무력화
const _v = Date.now();
const _p = src => `${src}?v=${_v}`;

// ── 오디오 경로 상수 ────────────────────────────────────────────────────────────
export const BGM = {
    LOBBY:    _p('audio/bgm/bgm_lobby.mp3'),
    GAME:     _p('audio/bgm/bgm_game.mp3'),
    SHOWTIME: _p('audio/bgm/bgm_showtime.mp3'),
};

export const SFX = {
    CARD_PLAY:  _p('audio/sfx/card_play.mp3'),
    CARD_FLIP:  _p('audio/sfx/card_flip.mp3'),
    CARD_MATCH: _p('audio/sfx/card_match.mp3'),
    GO:         _p('audio/sfx/go.mp3'),
    STOP:       _p('audio/sfx/stop.mp3'),
    WIN:        _p('audio/sfx/win.mp3'),
    LOSE:       _p('audio/sfx/lose.mp3'),
    BOMB:       _p('audio/sfx/bomb.mp3'),
    SHAKE:      _p('audio/sfx/shake.mp3'),
    PPEOK:      _p('audio/sfx/ppeok.mp3'),
    JJOK:       _p('audio/sfx/jjok.mp3'),
    SSAK:       _p('audio/sfx/ssak.mp3'),
    MOLE_HIT:   _p('audio/sfx/mole_hit.mp3'),
    ROULETTE:   _p('audio/sfx/roulette_spin.mp3'),
    SHOWTIME:   _p('audio/sfx/showtime.mp3'),
    COIN:       _p('audio/sfx/coin.mp3'),
};

const BGM_VOL_DEFAULT = 0.4;
const SFX_VOL_DEFAULT = 0.7;

// ── AudioManager 클래스 ────────────────────────────────────────────────────────
class AudioManager {
    constructor() {
        this._bgm           = null;
        this._currentBgmSrc = '';
        this.bgmMuted       = false;
        this.sfxMuted       = false;
        this.bgmVolume      = BGM_VOL_DEFAULT;
        this.sfxVolume      = SFX_VOL_DEFAULT;
        this._loadSettings();
    }

    _loadSettings() {
        try {
            const s = JSON.parse(localStorage.getItem('goStopAudioSettings') || '{}');
            this.bgmMuted  = s.bgmMuted  ?? false;
            this.sfxMuted  = s.sfxMuted  ?? false;
            this.bgmVolume = s.bgmVolume ?? BGM_VOL_DEFAULT;
            this.sfxVolume = s.sfxVolume ?? SFX_VOL_DEFAULT;
        } catch { /* ignore */ }
    }

    _saveSettings() {
        localStorage.setItem('goStopAudioSettings', JSON.stringify({
            bgmMuted:  this.bgmMuted,
            sfxMuted:  this.sfxMuted,
            bgmVolume: this.bgmVolume,
            sfxVolume: this.sfxVolume,
        }));
    }

    // ── BGM ──────────────────────────────────────────────────────────────────
    playBgm(src) {
        if (this._currentBgmSrc === src && this._bgm && !this._bgm.paused) return;
        if (this._bgm) { this._bgm.pause(); this._bgm = null; }

        this._currentBgmSrc = src;
        this._bgm = new Audio(src);
        this._bgm.loop   = true;
        this._bgm.volume = this.bgmMuted ? 0 : this.bgmVolume;
        this._bgm.play().catch(() => {});
    }

    stopBgm() {
        if (this._bgm) { this._bgm.pause(); this._bgm = null; }
        this._currentBgmSrc = '';
    }

    setBgmMuted(muted) {
        this.bgmMuted = muted;
        if (this._bgm) this._bgm.volume = muted ? 0 : this.bgmVolume;
        this._saveSettings();
    }

    setBgmVolume(v) {
        this.bgmVolume = Math.max(0, Math.min(1, v));
        if (this._bgm && !this.bgmMuted) this._bgm.volume = this.bgmVolume;
        this._saveSettings();
    }

    // ── SFX ──────────────────────────────────────────────────────────────────
    playSfx(src) {
        if (this.sfxMuted) return;
        const a = new Audio(src);
        a.volume = this.sfxVolume;
        a.play().catch(() => {});
    }

    setSfxMuted(muted) {
        this.sfxMuted = muted;
        if (muted) this.stopVoice();
        this._saveSettings();
    }

    setSfxVolume(v) {
        this.sfxVolume = Math.max(0, Math.min(1, v));
        if (this._currentVoice) this._currentVoice.volume = this.sfxVolume;
        this._saveSettings();
    }

    // ── 캐릭터 보이스 (고음질 MP3 성우 음성 우선 + Web Speech API fallback) ─────────────────
    playVoice(characterName, text, stageId = null, dialogueIdx = null) {
        if (this.sfxMuted || this.sfxVolume <= 0) return;
        this.stopVoice();

        // 1. 사전 제작된 고음질 신경망 AI 성우 MP3 파일 재생
        if (stageId !== null && dialogueIdx !== null) {
            const voicePath = `audio/voices/stage${stageId}_${dialogueIdx}.mp3?v=${_v}`;
            this._currentVoice = new Audio(voicePath);
            this._currentVoice.volume = this.sfxVolume;
            this._currentVoice.play().catch(() => {
                // 오디오 재생 실패 시 fallback TTS 실행
                this._playFallbackTts(characterName, text);
            });
            return;
        }

        // 2. 지정된 MP3가 없을 경우 fallback TTS
        this._playFallbackTts(characterName, text);
    }

    _playFallbackTts(characterName, text) {
        if (!('speechSynthesis' in window)) return;
        const cleanText = text.replace(/["'♥♡✨⚔💰🎁]/g, '').trim();
        if (!cleanText) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ko-KR';
        utterance.volume = this.sfxVolume;

        const profiles = {
            '소이': { pitch: 1.35, rate: 1.05 },
            '아린': { pitch: 1.15, rate: 0.98 },
            '나연': { pitch: 1.25, rate: 1.10 },
            '하은': { pitch: 1.05, rate: 0.95 },
            '채아': { pitch: 1.30, rate: 1.00 },
            '서린': { pitch: 0.90, rate: 0.95 },
            '혜화': { pitch: 1.10, rate: 0.90 },
            '봉황': { pitch: 0.75, rate: 0.85 },
        };
        const prof = profiles[characterName] || { pitch: 1.0, rate: 1.0 };
        utterance.pitch = prof.pitch;
        utterance.rate  = prof.rate;

        const voices = window.speechSynthesis.getVoices();
        const koVoice = voices.find(v => v.lang && v.lang.startsWith('ko'));
        if (koVoice) utterance.voice = koVoice;

        window.speechSynthesis.speak(utterance);
    }

    stopVoice() {
        if (this._currentVoice) {
            this._currentVoice.pause();
            this._currentVoice = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
}

export const audioManager = new AudioManager();

// ── 오디오 패널 UI 초기화 (main.js에서 한 번 호출) ──────────────────────────────
export function initAudioUI() {
    const panelToggle = document.getElementById('audio-panel-toggle');
    const panel       = document.getElementById('audio-panel');
    const bgmBtn      = document.getElementById('bgm-toggle-btn');
    const sfxBtn      = document.getElementById('sfx-toggle-btn');
    const bgmSlider   = document.getElementById('bgm-volume-slider');
    const sfxSlider   = document.getElementById('sfx-volume-slider');

    // 저장된 설정으로 슬라이더 초기화
    bgmSlider.value = Math.round(audioManager.bgmVolume * 100);
    sfxSlider.value = Math.round(audioManager.sfxVolume * 100);

    function syncUI() {
        bgmBtn.textContent      = audioManager.bgmMuted ? '🔇' : '🎵';
        sfxBtn.textContent      = audioManager.sfxMuted ? '🔇' : '🔊';
        panelToggle.textContent = (audioManager.bgmMuted && audioManager.sfxMuted) ? '🔇' : '🔊';
        bgmSlider.disabled      = audioManager.bgmMuted;
        sfxSlider.disabled      = audioManager.sfxMuted;
    }
    syncUI();

    // 패널 토글
    panelToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    // 패널 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!document.getElementById('audio-controls').contains(e.target)) {
            panel.classList.remove('open');
        }
    });

    bgmBtn.addEventListener('click', () => {
        audioManager.setBgmMuted(!audioManager.bgmMuted);
        syncUI();
    });

    sfxBtn.addEventListener('click', () => {
        audioManager.setSfxMuted(!audioManager.sfxMuted);
        syncUI();
    });

    bgmSlider.addEventListener('input', (e) => {
        audioManager.setBgmVolume(Number(e.target.value) / 100);
    });

    sfxSlider.addEventListener('input', (e) => {
        audioManager.setSfxVolume(Number(e.target.value) / 100);
    });
}
