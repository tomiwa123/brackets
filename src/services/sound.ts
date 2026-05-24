class SoundEngine {
    private ctx: AudioContext | null = null;

    private initContext() {
        if (typeof window === 'undefined') return;
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
    }

    private async resumeContext(): Promise<boolean> {
        this.initContext();
        if (!this.ctx) return false;
        
        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (e) {
                console.warn('Failed to resume AudioContext:', e);
                return false;
            }
        }
        return true;
    }

    /**
     * Plays a retro upward arcade chirp on voting.
     */
    async playVoteSound() {
        const active = await this.resumeContext();
        if (!active || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle'; // Retro, soft warm synth sound
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        
        // Dynamic pitch sweep (retro arcade coin/laser)
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.12);

        // Amplitude envelope (fast attack, fast decay to prevent clicks)
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    /**
     * Plays a triumphant C-major retro arpeggio when a tournament winner is determined.
     */
    async playVictorySound() {
        const active = await this.resumeContext();
        if (!active || !this.ctx) return;

        const now = this.ctx.currentTime;
        // Major chord frequencies: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
        const notes = [523.25, 659.25, 784.00, 1046.50];
        
        notes.forEach((freq, index) => {
            if (!this.ctx) return;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square'; // Classic retro chiptune wave
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const noteStart = now + index * 0.12;
            const noteDuration = 0.35;

            osc.frequency.setValueAtTime(freq, noteStart);
            
            // Envelope for note
            gain.gain.setValueAtTime(0.01, noteStart);
            gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration - 0.01);

            osc.start(noteStart);
            osc.stop(noteStart + noteDuration);
        });
    }
}

export const soundEngine = new SoundEngine();
