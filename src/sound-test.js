// Sound Test Menu Handler (easter egg — only active during gameplay)
import { gameScreen } from './dom-elements.js';
import { selectSound } from './audio.js';

let keySequence = [];
const secretSequence = ['Enter', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'Enter'];
let soundTestVisible = false;
let selectedSoundIndex = 0;
let currentlyPlayingSound = null;

// Create sound test menu
function createSoundTestMenu() {
    const menu = document.createElement('div');
    menu.id = 'sound-test-menu';
    menu.className = 'retro-sound-test';
    menu.style.opacity = '0';
    
    // Create content container
    const content = document.createElement('div');
    content.classList.add('retro-sound-test-content');
    content.innerHTML = `
        <div class="retro-sound-test-title">SOUND TEST</div>
        <div class="retro-sound-player">
            <div class="retro-sound-player-title">NOW PLAYING</div>
            <div class="retro-sound-player-info">
                <div class="retro-sound-player-name">-</div>
                <div class="retro-sound-player-file">-</div>
            </div>
            <div class="retro-sound-player-controls">
                <button class="retro-sound-player-button" id="play-pause">▶</button>
                <button class="retro-sound-player-button" id="stop">■</button>
            </div>
        </div>
        <div id="sound-test-list" class="retro-sound-list"></div>
        <div class="retro-sound-test-footer">
            <span>↑↓: SELECT</span>
            <span>ENTER: PLAY</span>
            <span>ESC: EXIT</span>
        </div>
    `;
    
    menu.appendChild(content);
    document.body.appendChild(menu);

    // Get all sound files from the sounds directory
    const sounds = [
        { name: 'Cycle Up', file: 'CYCLE1.mp3' },
        { name: 'Cycle Down', file: 'CYCLE2.mp3' },
        { name: 'Select', file: 'YES.mp3' },
        { name: 'Death', file: 'CLAP1.mp3' },
        { name: 'Level Complete', file: 'CLICK1.mp3' },
        { name: 'Warf', file: 'WARF.mp3' },
        { name: 'Patter', file: 'PATTER.mp3' },
        { name: 'Pitter', file: 'PITTER.mp3' },
        { name: 'Dung', file: 'DUNG.mp3' },
        { name: 'Warp', file: 'WARPWARP.mp3' },
        { name: 'Jazz', file: 'JAZZSTUFF.mp3' }
    ];

    // Create sound test list
    const soundList = document.getElementById('sound-test-list');
    sounds.forEach((sound, index) => {
        const soundItem = document.createElement('div');
        soundItem.classList.add('retro-sound-item');
        soundItem.dataset.index = index;
        soundItem.innerHTML = `
            <span class="retro-sound-number">${String(index + 1).padStart(2, '0')}</span>
            <span class="retro-sound-name">${sound.name}</span>
            <span class="retro-sound-file">${sound.file}</span>
        `;

        soundItem.addEventListener('click', () => {
            selectedSoundIndex = index;
            updateSoundSelection();
            playSelectedSound();
        });

        soundList.appendChild(soundItem);
    });

    // Add keyboard navigation
    document.addEventListener('keydown', handleSoundTestNavigation);

    // Add player controls
    document.getElementById('play-pause').addEventListener('click', () => {
        if (currentlyPlayingSound && !currentlyPlayingSound.paused) {
            currentlyPlayingSound.pause();
        } else {
            playSelectedSound();
        }
    });

    document.getElementById('stop').addEventListener('click', () => {
        if (currentlyPlayingSound) {
            currentlyPlayingSound.pause();
            currentlyPlayingSound.currentTime = 0;
            updatePlayerInfo();
        }
    });

    // Initialize selection
    updateSoundSelection();

    // Trigger fade in
    requestAnimationFrame(() => {
        menu.style.opacity = '1';
    });
}

function handleSoundTestNavigation(event) {
    if (!soundTestVisible) return;

    switch(event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            event.preventDefault();
            selectedSoundIndex = (selectedSoundIndex - 1 + document.querySelectorAll('.retro-sound-item').length) % document.querySelectorAll('.retro-sound-item').length;
            updateSoundSelection();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            event.preventDefault();
            selectedSoundIndex = (selectedSoundIndex + 1) % document.querySelectorAll('.retro-sound-item').length;
            updateSoundSelection();
            break;
        case 'Enter':
            event.preventDefault();
            playSelectedSound();
            break;
        case 'Escape':
            event.preventDefault();
            closeSoundTest();
            break;
    }
}

function updateSoundSelection() {
    const items = document.querySelectorAll('.retro-sound-item');
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedSoundIndex);
    });
    updatePlayerInfo();
}

function playSelectedSound() {
    const sounds = [
        { name: 'Cycle Up', file: 'CYCLE1.mp3' },
        { name: 'Cycle Down', file: 'CYCLE2.mp3' },
        { name: 'Select', file: 'YES.mp3' },
        { name: 'Death', file: 'CLAP1.mp3' },
        { name: 'Level Complete', file: 'CLICK1.mp3' },
        { name: 'Warf', file: 'WARF.mp3' },
        { name: 'Patter', file: 'PATTER.mp3' },
        { name: 'Pitter', file: 'PITTER.mp3' },
        { name: 'Dung', file: 'DUNG.mp3' },
        { name: 'Warp', file: 'WARPWARP.mp3' },
        { name: 'Jazz', file: 'JAZZSTUFF.mp3' }
    ];

    if (currentlyPlayingSound) {
        currentlyPlayingSound.pause();
    }

    const sound = sounds[selectedSoundIndex];
    currentlyPlayingSound = new Audio(`sounds/${sound.file}`);
    currentlyPlayingSound.play();
    updatePlayerInfo();
}

function updatePlayerInfo() {
    const sounds = [
        { name: 'Cycle Up', file: 'CYCLE1.mp3' },
        { name: 'Cycle Down', file: 'CYCLE2.mp3' },
        { name: 'Select', file: 'YES.mp3' },
        { name: 'Death', file: 'CLAP1.mp3' },
        { name: 'Level Complete', file: 'CLICK1.mp3' },
        { name: 'Warf', file: 'WARF.mp3' },
        { name: 'Patter', file: 'PATTER.mp3' },
        { name: 'Pitter', file: 'PITTER.mp3' },
        { name: 'Dung', file: 'DUNG.mp3' },
        { name: 'Warp', file: 'WARPWARP.mp3' },
        { name: 'Jazz', file: 'JAZZSTUFF.mp3' }
    ];

    const sound = sounds[selectedSoundIndex];
    document.querySelector('.retro-sound-player-name').textContent = sound.name;
    document.querySelector('.retro-sound-player-file').textContent = sound.file;
}

function closeSoundTest() {
    const menu = document.getElementById('sound-test-menu');
    if (menu) {
        menu.style.opacity = '0';
        setTimeout(() => {
            menu.remove();
            soundTestVisible = false;
            document.removeEventListener('keydown', handleSoundTestNavigation);
            if (currentlyPlayingSound) {
                currentlyPlayingSound.pause();
                currentlyPlayingSound = null;
            }
        }, 500);
    }
}

// Handle key sequence
document.addEventListener('keydown', (event) => {
    if (!gameScreen || gameScreen.classList.contains('hidden')) return;

    keySequence.push(event.key);
            
            // Keep only the last 8 keys
            if (keySequence.length > 8) {
                keySequence.shift();
            }

            // Check if sequence matches
            if (keySequence.join(',') === secretSequence.join(',')) {
                if (!soundTestVisible) {
                    createSoundTestMenu();
                    soundTestVisible = true;
                    keySequence = []; // Reset sequence
                    selectSound.currentTime = 0;
                    selectSound.play().catch(() => {});
            }
        }
});

// Initialize sound test menu
document.addEventListener('DOMContentLoaded', () => {
    // Add styles for sound test menu
    const style = document.createElement('style');
    style.textContent = `
        .retro-sound-test {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            color: #0f0;
            transition: opacity 0.5s;
        }

        .retro-sound-test-content {
            background: #000;
            border: 2px solid #0f0;
            padding: 20px;
            width: 80%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .retro-sound-test-title {
            font-size: 24px;
            text-align: center;
            margin-bottom: 20px;
            text-shadow: 0 0 5px #0f0;
        }

        .retro-sound-player {
            background: #111;
            border: 1px solid #0f0;
            padding: 15px;
            margin-bottom: 20px;
        }

        .retro-sound-player-title {
            font-size: 14px;
            color: #0f0;
            margin-bottom: 10px;
        }

        .retro-sound-player-info {
            margin-bottom: 10px;
        }

        .retro-sound-player-name {
            font-size: 18px;
            margin-bottom: 5px;
        }

        .retro-sound-player-file {
            font-size: 12px;
            color: #0a0;
        }

        .retro-sound-player-controls {
            display: flex;
            gap: 10px;
        }

        .retro-sound-player-button {
            background: #111;
            border: 1px solid #0f0;
            color: #0f0;
            padding: 5px 15px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
        }

        .retro-sound-player-button:hover {
            background: #0f0;
            color: #000;
        }

        .retro-sound-list {
            margin-bottom: 20px;
        }

        .retro-sound-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border: 1px solid #0a0;
            margin-bottom: 5px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .retro-sound-item:hover {
            background: #0a0;
            color: #000;
        }

        .retro-sound-item.selected {
            background: #0f0;
            color: #000;
        }

        .retro-sound-number {
            width: 30px;
            color: #0a0;
        }

        .retro-sound-name {
            flex: 1;
            margin: 0 10px;
        }

        .retro-sound-file {
            color: #0a0;
            font-size: 12px;
        }

        .retro-sound-test-footer {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #0a0;
            margin-top: 20px;
        }

        /* Scrollbar styling */
        .retro-sound-test-content::-webkit-scrollbar {
            width: 10px;
        }

        .retro-sound-test-content::-webkit-scrollbar-track {
            background: #000;
        }

        .retro-sound-test-content::-webkit-scrollbar-thumb {
            background: #0a0;
            border: 1px solid #0f0;
        }
    `;
    document.head.appendChild(style);
}); 
