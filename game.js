// Platanus Hack 25: Guitar Platanus
// Press the correct buttons (P1A-P1D) when notes reach the hit zone!

// =============================================================================
// ARCADE BUTTON MAPPING - COMPLETE TEMPLATE
// =============================================================================
// Reference: See button-layout.webp at hack.platan.us/assets/images/arcade/
//
// Maps arcade button codes to keyboard keys for local testing.
// Each arcade code can map to multiple keyboard keys (array values).
// The arcade cabinet sends codes like 'P1U', 'P1A', etc. when buttons are pressed.
//
// To use in your game:
//   if (key === 'P1A') { ... }  // Works on both arcade and local (via keyboard)
//
// CURRENT GAME USAGE (Guitar Platanus):
//   - P1A (Button A - Red) → Lane 1 (Red)
//   - P1B (Button B - Green) → Lane 2 (Green) 
//   - P1C (Button C - Yellow) → Lane 3 (Yellow)
//   - P1D (Button D - Blue) → Lane 4 (Blue)
//   - START1 (Start Button) → Start/Restart Game
// =============================================================================

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a4d2e', // Tropical deep green
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
let lanes = [];
let notes = [];
let score = 0;
let combo = 0;
let maxCombo = 0;
let gameState = 'menu';
let hitZoneY = 480;
let noteSpeed = 2;
let lastNoteTime = 0;
let noteInterval = 800;
let particles = [];
let perfectHits = 0;
let goodHits = 0;
let missedNotes = 0;
let bgParticles = [];
let starfield = [];
let audioContext;
let musicSequence = 0;
let lastMusicTime = 0;

// Real arcade button mapping based on cabinet layout
const buttonMap = {
    'P1A': ['a', 'A'],  // Bottom left button - Red lane
    'P1B': ['s', 'S'],  // Bottom center-left - Green lane  
    'P1C': ['d', 'D'],  // Bottom center-right - Yellow lane
    'P1D': ['f', 'F'],  // Bottom right button - Blue lane
    'START1': ['Enter', ' ']  // Start button
};

// Tropical lane colors inspired by Caribbean fruits
const laneColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf']; // Coral, Turquoise, Yellow, Mint
const laneKeys = ['P1A', 'P1B', 'P1C', 'P1D'];

// 8-bit music patterns - Donkey Kong inspired
class Music8Bit {
    constructor(scene) {
        this.scene = scene;
        this.audioContext = scene.sound.context;
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.08;
        this.musicSpeed = 1.0;
        this.baseTempo = 200;
    }
    
    playNote(frequency, duration, type = 'square') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // Donkey Kong main theme pattern
    playDonkeyKongTheme() {
        const tempo = this.baseTempo / this.musicSpeed;
        
        // Main melody - simplified Donkey Kong theme
        const melody = [
            {note: 392.00, duration: 0.2}, // G4
            {note: 392.00, duration: 0.2}, // G4
            {note: 392.00, duration: 0.2}, // G4
            {note: 329.63, duration: 0.2}, // E4
            {note: 392.00, duration: 0.2}, // G4
            {note: 0,      duration: 0.2}, // Rest
            {note: 523.25, duration: 0.3}, // C5
            {note: 392.00, duration: 0.2}, // G4
            {note: 0,      duration: 0.2}, // Rest
            {note: 261.63, duration: 0.3}, // C4
            {note: 261.63, duration: 0.3}, // C4
            {note: 392.00, duration: 0.2}, // G4
            {note: 523.25, duration: 0.2}, // C5
            {note: 392.00, duration: 0.2}, // G4
            {note: 659.25, duration: 0.3}, // E5
            {note: 523.25, duration: 0.4}, // C5
        ];
        
        let currentTime = this.audioContext.currentTime;
        melody.forEach((note) => {
            if (note.note > 0) {
                this.playNoteAtTime(note.note, currentTime, note.duration);
            }
            currentTime += tempo / 1000;
        });
        
        // Bass line
        const bass = [
            {note: 130.81, duration: 0.4}, // C3
            {note: 0,      duration: 0.4}, // Rest
            {note: 130.81, duration: 0.4}, // C3
            {note: 0,      duration: 0.4}, // Rest
            {note: 146.83, duration: 0.4}, // D3
            {note: 0,      duration: 0.4}, // Rest
            {note: 98.00,  duration: 0.4}, // G2
            {note: 0,      duration: 0.4}, // Rest
        ];
        
        currentTime = this.audioContext.currentTime;
        bass.forEach((note) => {
            if (note.note > 0) {
                this.playNoteAtTime(note.note, currentTime, note.duration, 'triangle');
            }
            currentTime += tempo / 1000;
        });
    }
    
    playNoteAtTime(frequency, time, duration, type = 'square') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.15, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        oscillator.start(time);
        oscillator.stop(time + duration);
    }
    
    playHitNote(laneIndex) {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C5
        this.playNote(notes[laneIndex], 0.15, 'square');
    }
    
    playPerfectSound() {
        // Victory fanfare
        this.playNote(523.25, 0.1); // C5
        setTimeout(() => this.playNote(659.25, 0.1), 50); // E5
        setTimeout(() => this.playNote(783.99, 0.15), 100); // G5
        setTimeout(() => this.playNote(1046.50, 0.2), 150); // C6
    }
    
    playGoodSound() {
        this.playNote(392.00, 0.1); // G4
        setTimeout(() => this.playNote(523.25, 0.1), 50); // C5
    }
    
    playMissSound() {
        // Error sound - descending tone
        this.playNote(196.00, 0.15, 'sawtooth'); // G3
        setTimeout(() => this.playNote(130.81, 0.2, 'sawtooth'), 100); // C3
    }
    
    playMenuMusic() {
        // Donkey Kong intro theme
        const introMelody = [
            {note: 392.00, duration: 0.3}, // G4
            {note: 523.25, duration: 0.3}, // C5
            {note: 659.25, duration: 0.3}, // E5
            {note: 783.99, duration: 0.3}, // G5
            {note: 659.25, duration: 0.3}, // E5
            {note: 523.25, duration: 0.3}, // C5
            {note: 392.00, duration: 0.3}, // G4
            {note: 261.63, duration: 0.3}, // C4
        ];
        
        let currentTime = this.audioContext.currentTime;
        introMelody.forEach((note) => {
            this.playNoteAtTime(note.note, currentTime, note.duration);
            currentTime += 0.3;
        });
    }
    
    playGameOverSound() {
        // Donkey Kong death sound
        this.playNote(392.00, 0.2); // G4
        setTimeout(() => this.playNote(349.23, 0.2), 150); // F4
        setTimeout(() => this.playNote(293.66, 0.2), 300); // D4
        setTimeout(() => this.playNote(261.63, 0.2), 450); // C4
        setTimeout(() => this.playNote(196.00, 0.3), 600); // G3
        setTimeout(() => this.playNote(130.81, 0.4), 800); // C3
    }
    
    // Infinite loop that gets faster
    playBackgroundMusic(time) {
        if (time - lastMusicTime > this.baseTempo / this.musicSpeed) {
            lastMusicTime = time;
            
            // Play a snippet of Donkey Kong theme that loops
            const themeSnippets = [
                392.00, // G4
                392.00, // G4
                329.63, // E4
                392.00, // G4
                523.25, // C5
                392.00, // G4
                261.63, // C4
                329.63, // E4
            ];
            
            const note = themeSnippets[musicSequence % themeSnippets.length];
            this.playNote(note, 0.15, 'square');
            
            // Add bass every other note
            if (musicSequence % 2 === 0) {
                const bassNotes = [130.81, 146.83, 164.81, 174.61]; // C3, D3, E3, F3
                const bassNote = bassNotes[Math.floor(musicSequence / 2) % bassNotes.length];
                this.playNote(bassNote, 0.1, 'triangle');
            }
            
            musicSequence++;
        }
    }
    
    // Increase music speed as game progresses
    increaseSpeed() {
        this.musicSpeed = Math.min(3.0, this.musicSpeed + 0.05);
    }
    
    resetSpeed() {
        this.musicSpeed = 1.0;
        musicSequence = 0;
    }
}

function preload() {
    // Create procedural graphics
    this.add.graphics();
}

function create() {
    // Initialize music system
    this.music = new Music8Bit(this);
    
    // Create starfield background
    createStarfield.call(this);
    
    // Create lanes
    for (let i = 0; i < 4; i++) {
        const x = 200 + i * 120;
        lanes[i] = {
            x: x,
            key: laneKeys[i],
            color: laneColors[i],
            pressed: false
        };
    }

    // Draw enhanced lanes
    drawLanes.call(this);

    // Create UI
    createUI.call(this);

    // Input handling
    setupInput.call(this);

    // Start menu
    showMenu.call(this);
}

function createStarfield() {
    // Create tropical starfield with palm leaves effect
    for (let i = 0; i < 40; i++) {
        const star = this.add.circle(
            Math.random() * 800,
            Math.random() * 600,
            Math.random() * 3 + 1,
            Math.random() > 0.7 ? '#ffe66d' : (Math.random() > 0.5 ? '#4ecdc4' : '#a8e6cf') // Tropical colors
        );
        star.setAlpha(Math.random() * 0.6 + 0.2);
        
        this.tweens.add({
            targets: star,
            alpha: { from: star.alpha, to: star.alpha * 0.4 },
            duration: 1200 + Math.random() * 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        starfield.push(star);
    }
    
    // Add floating palm leaves
    for (let i = 0; i < 8; i++) {
        const leaf = this.add.ellipse(
            Math.random() * 800,
            Math.random() * 600,
            15 + Math.random() * 10,
            8 + Math.random() * 5,
            '#2d6a4f'
        );
        leaf.setAlpha(0.3);
        leaf.rotation = Math.random() * Math.PI;
        
        this.tweens.add({
            targets: leaf,
            y: leaf.y - 50 - Math.random() * 100,
            rotation: leaf.rotation + 0.5,
            alpha: { from: 0.3, to: 0.1 },
            duration: 8000 + Math.random() * 4000,
            repeat: -1,
            ease: 'Linear'
        });
        
        starfield.push(leaf);
    }
}

function drawLanes() {
    // Draw tropical lane backgrounds
    for (let i = 0; i < 4; i++) {
        const lane = lanes[i];
        
        // Tropical lane background with gradient effect
        const laneBg = this.add.rectangle(lane.x, 300, 80, 500, '#2d6a4f')
            .setStrokeStyle(3, lane.color);
        
        // Add tropical glow effect
        const glow = this.add.rectangle(lane.x, 300, 76, 496, lane.color, 0.2);
        
        // Hit zone with tropical pulsing effect
        const hitZone = this.add.rectangle(lane.x, hitZoneY, 80, 60, lane.color, 0.5)
            .setStrokeStyle(4, lane.color);
        
        // Tropical pulsing animation for hit zone
        this.tweens.add({
            targets: hitZone,
            scaleX: { from: 1, to: 1.15 },
            scaleY: { from: 1, to: 1.15 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Tropical button indicator with palm tree styling
        const buttonBg = this.add.circle(lane.x, hitZoneY - 25, 22, '#1b5e3f')
            .setStrokeStyle(3, lane.color);
        
        // Add small palm leaf decoration
        const palmLeaf = this.add.ellipse(lane.x + 15, hitZoneY - 25, 8, 4, '#2d6a4f');
        palmLeaf.rotation = Math.PI / 4;
        
        this.add.text(lane.x - 8, hitZoneY - 33, lane.key.slice(-1), {
            fontSize: '26px',
            color: lane.color,
            fontStyle: 'bold',
            fontFamily: 'Arial Black',
            stroke: '#ffffff',
            strokeThickness: 1
        });
    }

    // Tropical stage decoration
    const title = this.add.text(400, 40, '🌴 GUITAR PLATANUS 🌴', {
        fontSize: '44px',
        color: '#ffe66d',
        fontStyle: 'bold',
        fontFamily: 'Arial Black',
        stroke: '#ff6b6b',
        strokeThickness: 3
    }).setOrigin(0.5);
    
    // Tropical title glow effect
    this.tweens.add({
        targets: title,
        strokeThickness: { from: 3, to: 6 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Tropical instructions
    this.add.text(400, 85, '🎵 Press TROPICAL BUTTONS A-D when notes reach the paradise zone! 🌺', {
        fontSize: '16px',
        color: '#4ecdc4',
        fontStyle: 'bold',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Tropical arcade control hints
    this.add.text(400, 110, '🏝️ P1A=P1B=P1C=P1D Island Buttons | START1 to Begin Paradise 🏝️', {
        fontSize: '14px',
        color: '#a8e6cf',
        fontFamily: 'Arial'
    }).setOrigin(0.5);
}

function createUI() {
    // Tropical score display with island glow
    this.scoreText = this.add.text(20, 20, `Score: 0`, {
        fontSize: '28px',
        color: '#ffe66d',
        fontStyle: 'bold',
        fontFamily: 'Arial Black',
        stroke: '#4ecdc4',
        strokeThickness: 2
    });

    // Tropical combo display
    this.comboText = this.add.text(20, 55, `Combo: 0x`, {
        fontSize: '20px',
        color: '#ff6b6b',
        fontStyle: 'bold',
        fontFamily: 'Arial Black'
    });

    // Tropical stats display
    this.statsText = this.add.text(20, 85, `Perfect: 0 | Good: 0 | Miss: 0`, {
        fontSize: '14px',
        color: '#a8e6cf',
        fontFamily: 'Arial'
    });
    
    // Tropical music speed indicator
    this.musicSpeedText = this.add.text(20, 110, `Music: 1.0x`, {
        fontSize: '14px',
        color: '#4ecdc4',
        fontFamily: 'Arial',
        fontStyle: 'bold'
    });

    // Tropical menu text with paradise styling
    this.menuText = this.add.text(400, 300, '🌺 Press START1 to Begin Paradise! 🌺', {
        fontSize: '32px',
        color: '#4ecdc4',
        fontStyle: 'bold',
        fontFamily: 'Arial Black',
        stroke: '#ffe66d',
        strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);
    
    // Tropical pulsing animation for menu text
    this.tweens.add({
        targets: this.menuText,
        scale: { from: 1, to: 1.12 },
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Tropical game over text with island vibes
    this.gameOverText = this.add.text(400, 230, '🌺 PARADISE OVER 🌺', {
        fontSize: '48px',
        color: '#ff6b6b',
        fontStyle: 'bold',
        fontFamily: 'Arial Black',
        stroke: '#ffe66d',
        strokeThickness: 4
    }).setOrigin(0.5).setVisible(false);

    // Tropical final score with island formatting
    this.finalScoreText = this.add.text(400, 300, '', {
        fontSize: '24px',
        color: '#ffe66d',
        fontFamily: 'Arial Black',
        stroke: '#4ecdc4',
        strokeThickness: 2
    }).setOrigin(0.5).setVisible(false);

    // Tropical restart text with island styling
    this.restartText = this.add.text(400, 380, '🏝️ Press START1 for Tropical Paradise Again! 🏝️', {
        fontSize: '20px',
        color: '#a8e6cf',
        fontStyle: 'bold',
        fontFamily: 'Arial Black',
        stroke: '#4ecdc4',
        strokeThickness: 2
    }).setOrigin(0.5).setVisible(false);
}

function setupInput() {
    // Keyboard input
    this.input.keyboard.on('keydown', (event) => {
        const key = event.key;
        
        // Check for mapped keys
        for (const [arcadeCode, keys] of Object.entries(buttonMap)) {
            if (keys.includes(key)) {
                handleButtonPress.call(this, arcadeCode);
                break;
            }
        }
    });

    this.input.keyboard.on('keyup', (event) => {
        const key = event.key;
        
        for (const [arcadeCode, keys] of Object.entries(buttonMap)) {
            if (keys.includes(key)) {
                handleButtonRelease.call(this, arcadeCode);
                break;
            }
        }
    });
}

function handleButtonPress(buttonCode) {
    if (buttonCode === 'START1') {
        if (gameState === 'menu') {
            startGame.call(this);
        } else if (gameState === 'gameover') {
            startGame.call(this);
        }
        return;
    }

    if (gameState !== 'playing') return;

    // Check which lane
    const laneIndex = laneKeys.indexOf(buttonCode);
    if (laneIndex === -1) return;

    const lane = lanes[laneIndex];
    lane.pressed = true;
    
    // Visual feedback for button press
    const buttonFeedback = this.add.circle(lane.x, hitZoneY - 25, 25, lane.color, 0.5);
    this.tweens.add({
        targets: buttonFeedback,
        alpha: 0,
        scale: { from: 1, to: 2 },
        duration: 200,
        onComplete: () => buttonFeedback.destroy()
    });

    // Check for note hit
    let hit = false;
    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        if (note.laneIndex === laneIndex) {
            const distance = Math.abs(note.y - hitZoneY);
            
            if (distance < 25) { // Tighter perfect window
                // Perfect hit
                score += 150; // Increased points
                combo++;
                perfectHits++;
                this.music.playPerfectSound();
                createHitEffect.call(this, lane.x, hitZoneY, lane.color, 'PERFECT!');
                
                // Enhanced note destruction
                note.glow.destroy();
                note.destroy();
                notes.splice(i, 1);
                hit = true;
                
                // Speed up music every 3 perfect hits (more frequent)
                if (perfectHits % 3 === 0) {
                    this.music.increaseSpeed();
                    
                    // Visual feedback for speed increase
                    const speedText = this.add.text(400, 200, `SPEED UP! ${this.music.musicSpeed.toFixed(1)}x`, {
                        fontSize: '32px',
                        color: '#ffa502',
                        fontStyle: 'bold',
                        fontFamily: 'Arial Black',
                        stroke: '#ff3838',
                        strokeThickness: 3
                    }).setOrigin(0.5);
                    
                    this.tweens.add({
                        targets: speedText,
                        alpha: 0,
                        scale: { from: 1, to: 1.5 },
                        duration: 800,
                        onComplete: () => speedText.destroy()
                    });
                }
                break;
            } else if (distance < 45) { // Tighter good window
                // Good hit
                score += 75; // Increased points
                combo++;
                goodHits++;
                this.music.playGoodSound();
                createHitEffect.call(this, lane.x, hitZoneY, lane.color, 'GOOD!');
                
                note.glow.destroy();
                note.destroy();
                notes.splice(i, 1);
                hit = true;
                break;
            }
        }
    }

    if (!hit) {
        // Missed press
        combo = 0;
        this.music.playMissSound();
        
        // Visual feedback for miss
        const missText = this.add.text(lane.x, hitZoneY - 60, 'MISS', {
            fontSize: '20px',
            color: '#ff4757',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: missText,
            alpha: 0,
            y: lane.x - 90,
            duration: 400,
            onComplete: () => missText.destroy()
        });
    } else {
        // Play lane-specific note on hit
        this.music.playHitNote(laneIndex);
    }

    updateUI.call(this);
}

function handleButtonRelease(buttonCode) {
    const laneIndex = laneKeys.indexOf(buttonCode);
    if (laneIndex !== -1) {
        lanes[laneIndex].pressed = false;
    }
}

function createHitEffect(x, y, color, text) {
    // Enhanced particle explosion
    for (let i = 0; i < 12; i++) {
        const particle = this.add.circle(x, y, 3 + Math.random() * 3, color);
        const angle = (Math.PI * 2 * i) / 12;
        const speed = 4 + Math.random() * 3;
        
        particles.push({
            sprite: particle,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 40
        });
    }
    
    // Add sparkles
    for (let i = 0; i < 6; i++) {
        const sparkle = this.add.circle(
            x + (Math.random() - 0.5) * 40,
            y + (Math.random() - 0.5) * 40,
            2,
            '#ffffff'
        );
        sparkle.setAlpha(0.8);
        
        this.tweens.add({
            targets: sparkle,
            alpha: 0,
            scale: { from: 1, to: 2 },
            duration: 300,
            onComplete: () => sparkle.destroy()
        });
    }

    // Enhanced hit text with effects
    const hitText = this.add.text(x, y - 40, text, {
        fontSize: text === 'PERFECT!' ? '28px' : '24px',
        color: color,
        fontStyle: 'bold',
        fontFamily: 'Arial Black',
        stroke: '#ffffff',
        strokeThickness: 2
    }).setOrigin(0.5);
    
    // Bouncing animation for hit text
    this.tweens.add({
        targets: hitText,
        y: { from: y - 40, to: y - 90 },
        alpha: 0,
        scale: { from: 1, to: 1.5 },
        duration: 600,
        ease: 'Back.easeOut',
        onComplete: () => hitText.destroy()
    });
    
    // Screen shake effect for perfect hits
    if (text === 'PERFECT!') {
        this.cameras.main.shake(100, 0.005, 0.005);
    }
}

function showMenu() {
    gameState = 'menu';
    this.menuText.setVisible(true);
    this.gameOverText.setVisible(false);
    this.finalScoreText.setVisible(false);
    this.restartText.setVisible(false);
    
    // Play Donkey Kong menu music
    this.music.playMenuMusic();
}

function startGame() {
    gameState = 'playing';
    score = 0;
    combo = 0;
    perfectHits = 0;
    goodHits = 0;
    missedNotes = 0;
    noteSpeed = 2;
    
    // Reset music speed
    this.music.resetSpeed();
    
    // Clear existing notes
    notes.forEach(note => note.destroy());
    notes = [];
    
    // Clear particles
    particles.forEach(p => p.sprite.destroy());
    particles = [];
    
    this.menuText.setVisible(false);
    this.gameOverText.setVisible(false);
    this.finalScoreText.setVisible(false);
    this.restartText.setVisible(false);
    
    updateUI.call(this);
}

function gameOver() {
    gameState = 'gameover';
    maxCombo = Math.max(maxCombo, combo);
    
    // Play Donkey Kong death sound
    this.music.playGameOverSound();
    
    this.gameOverText.setVisible(true);
    this.finalScoreText.setText(`Final Score: ${score}\nMax Combo: ${maxCombo}x\nMusic Speed: ${this.music.musicSpeed.toFixed(1)}x`);
    this.finalScoreText.setVisible(true);
    this.restartText.setVisible(true);
}

function updateUI() {
    this.scoreText.setText(`Score: ${score}`);
    this.comboText.setText(`Combo: ${combo}x`);
    this.statsText.setText(`Perfect: ${perfectHits} | Good: ${goodHits} | Miss: ${missedNotes}`);
    
    // Enhanced combo display with color changes
    if (combo >= 20) {
        this.comboText.setColor('#ff3838'); // Red for fire combo
        this.comboText.setFontSize('24px');
        
        // Add fire effect for high combos
        if (combo % 5 === 0) {
            const fireText = this.add.text(400, 150, '🔥 ON FIRE! 🔥', {
                fontSize: '36px',
                color: '#ff3838',
                fontStyle: 'bold',
                fontFamily: 'Arial Black'
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: fireText,
                alpha: 0,
                scale: { from: 1, to: 1.8 },
                duration: 1000,
                onComplete: () => fireText.destroy()
            });
        }
    } else if (combo >= 10) {
        this.comboText.setColor('#ffa502'); // Orange for hot combo
        this.comboText.setFontSize('22px');
    } else if (combo >= 5) {
        this.comboText.setColor('#2ed573'); // Green for building combo
        this.comboText.setFontSize('20px');
    } else {
        this.comboText.setColor('#ffa502'); // Default yellow
        this.comboText.setFontSize('20px');
    }
}

function update(time) {
    if (gameState !== 'playing') return;

    // Play infinite Donkey Kong background music
    this.music.playBackgroundMusic(time);

    // Spawn notes with increased difficulty
    if (time - lastNoteTime > noteInterval) {
        spawnNote.call(this);
        lastNoteTime = time;
        
        // Gradually increase difficulty - more aggressive
        noteInterval = Math.max(150, noteInterval - 8); // Faster minimum, faster decrease
        noteSpeed = Math.min(8, noteSpeed + 0.03); // Higher maximum, faster increase
        
        // Speed up music with difficulty - more frequent
        if (Math.random() < 0.15) { // 15% chance each note
            this.music.increaseSpeed();
        }
        
        // Add visual difficulty indicator
        if (noteSpeed > 4) {
            const difficultyText = this.add.text(400, 250, '⚡ EXTREME MODE ⚡', {
                fontSize: '24px',
                color: '#ff3838',
                fontStyle: 'bold',
                fontFamily: 'Arial Black',
                stroke: '#ffa502',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: difficultyText,
                alpha: 0,
                duration: 800,
                onComplete: () => difficultyText.destroy()
            });
        }
    }

    // Update notes
    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        note.y += noteSpeed;
        
        // Update glow position
        if (note.glow) {
            note.glow.y = note.y;
        }
        
        if (note.y > hitZoneY + 50) {
            // Missed note
            missedNotes++;
            combo = 0;
            this.music.playMissSound();
            
            // Visual feedback for missed note
            const missEffect = this.add.circle(note.x, hitZoneY, 30, '#ff4757', 0.3);
            this.tweens.add({
                targets: missEffect,
                alpha: 0,
                scale: { from: 1, to: 2 },
                duration: 400,
                onComplete: () => missEffect.destroy()
            });
            
            note.glow.destroy();
            note.destroy();
            notes.splice(i, 1);
            updateUI.call(this);
            
            // Game over after too many misses
            if (missedNotes >= 10) {
                gameOver.call(this);
            }
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.sprite.x += particle.vx;
        particle.sprite.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            particle.sprite.destroy();
            particles.splice(i, 1);
        }
    }
}

function spawnNote() {
    const laneIndex = Math.floor(Math.random() * 4);
    const lane = lanes[laneIndex];
    
    // Enhanced note with glow effect
    const note = this.add.rectangle(lane.x, 100, 60, 20, lane.color)
        .setStrokeStyle(3, '#ffffff');
    
    // Add glow effect to note
    const noteGlow = this.add.rectangle(lane.x, 100, 64, 24, lane.color, 0.3);
    noteGlow.setScale(0.9);
    
    // Pulsing animation for note
    this.tweens.add({
        targets: [note, noteGlow],
        scaleX: { from: 0.8, to: 1.1 },
        scaleY: { from: 0.8, to: 1.1 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Store glow with note for cleanup
    note.glow = noteGlow;
    note.laneIndex = laneIndex;
    notes.push(note);
}
