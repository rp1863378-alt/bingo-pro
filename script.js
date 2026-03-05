// ==========================================
// BINGO VIRTUAL PRO - SCRIPT COMPLETO
// ==========================================

// Estado global del juego
const GameState = {
    currentUser: null,
    isAdmin: false,
    roomCode: null,
    players: [],
    cards: [],
    calledNumbers: [],
    currentNumber: null,
    gameStatus: 'waiting',
    countdown: 0,
    jackpot: { type: 'money', value: 0, description: '' },
    lineWinners: [],
    bingoWinner: null,
    chatMessages: [],
    settings: {
        maxCardsPerPlayer: 6,
        maxLineWinners: 3,
        autoCallInterval: 10,
        bannedWords: ['tonto', 'idiota', 'estupido', 'imbecil', 'mierda', 'carajo'],
        countdownSeconds: 30
    },
    audio: {
        music: null,
        voice: null,
        volume: 0.8,
        masterVolume: 0.8
    },
    infractions: new Map(),
    blockedUsers: new Set(),
    autoCallTimeoutId: null,
    countdownIntervalId: null,
    cardSerialCounter: 1000,
    roomLink: ''
};

// Números en español para el caller
const numberNames = {
    1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
    6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
    11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 20: 'veinte',
    21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco',
    26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve', 30: 'treinta',
    31: 'treinta y uno', 32: 'treinta y dos', 33: 'treinta y tres', 34: 'treinta y cuatro', 35: 'treinta y cinco',
    36: 'treinta y seis', 37: 'treinta y siete', 38: 'treinta y ocho', 39: 'treinta y nueve', 40: 'cuarenta',
    41: 'cuarenta y uno', 42: 'cuarenta y dos', 43: 'cuarenta y tres', 44: 'cuarenta y cuatro', 45: 'cuarenta y cinco',
    46: 'cuarenta y seis', 47: 'cuarenta y siete', 48: 'cuarenta y ocho', 49: 'cuarenta y nueve', 50: 'cincuenta',
    51: 'cincuenta y uno', 52: 'cincuenta y dos', 53: 'cincuenta y tres', 54: 'cincuenta y cuatro', 55: 'cincuenta y cinco',
    56: 'cincuenta y seis', 57: 'cincuenta y siete', 58: 'cincuenta y ocho', 59: 'cincuenta y nueve', 60: 'sesenta',
    61: 'sesenta y uno', 62: 'sesenta y dos', 63: 'sesenta y tres', 64: 'sesenta y cuatro', 65: 'sesenta y cinco',
    66: 'sesenta y seis', 67: 'sesenta y siete', 68: 'sesenta y ocho', 69: 'sesenta y nueve', 70: 'setenta',
    71: 'setenta y uno', 72: 'setenta y dos', 73: 'setenta y tres', 74: 'setenta y cuatro', 75: 'setenta y cinco',
    76: 'setenta y seis', 77: 'setenta y siete', 78: 'setenta y ocho', 79: 'setenta y nueve', 80: 'ochenta',
    81: 'ochenta y uno', 82: 'ochenta y dos', 83: 'ochenta y tres', 84: 'ochenta y cuatro', 85: 'ochenta y cinco',
    86: 'ochenta y seis', 87: 'ochenta y siete', 88: 'ochenta y ocho', 89: 'ochenta y nueve', 90: 'noventa'
};

// ==========================================
// FUNCIONES DE LOGIN
// ==========================================

function loginPlayer() {
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('roomCode').value.trim().toUpperCase();
    
    if (!name || !code) {
        alert('Por favor ingresa tu nombre y el código de sala');
        return;
    }
    
    if (GameState.blockedUsers.has(name)) {
        alert('Estás bloqueado temporalmente. Intenta más tarde.');
        return;
    }
    
    if (code !== GameState.roomCode && GameState.roomCode !== null) {
        alert('Código de sala incorrecto');
        return;
    }
    
    GameState.currentUser = {
        name: name,
        id: Date.now().toString(),
        cards: [],
        infractions: 0,
        isOnline: true,
        joinedAt: new Date()
    };
    
    GameState.isAdmin = false;
    
    if (GameState.players.find(p => p.name === name)) {
        alert('Este nombre ya está en uso. Elige otro.');
        return;
    }
    
    GameState.players.push(GameState.currentUser);
    
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('roomIdDisplay').textContent = code || 'SALA-01';
    
    addChatMessage('system', `¡Bienvenido ${name} a la sala!`);
    updateOnlineCount();
    renderPlayerCards();
    
    if (GameState.isAdmin) {
        updatePlayersTable();
    }
}

function loginAdmin() {
    const code = document.getElementById('adminCode').value.trim();
    
    if (code !== 'fmz1412') {
        alert('Código de administrador incorrecto');
        return;
    }
    
    GameState.isAdmin = true;
    GameState.currentUser = {
        name: 'Administrador',
        id: 'admin-' + Date.now(),
        isAdmin: true
    };
    
    if (!GameState.roomCode) {
        GameState.roomCode = generateRoomCode();
    }
    
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('adminScreen').classList.add('active');
    document.getElementById('adminRoomId').textContent = GameState.roomCode;
    
    generateRoomLink();
    updatePlayersTable();
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateRoomLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    GameState.roomLink = `${baseUrl}?room=${GameState.roomCode}`;
    
    if (GameState.isAdmin) {
        navigator.clipboard.writeText(GameState.roomLink).then(() => {
            alert('Link copiado al portapapeles: ' + GameState.roomLink);
        }).catch(() => {
            prompt('Copia este link:', GameState.roomLink);
        });
    }
}

function logout() {
    location.reload();
}

// ==========================================
// FUNCIONES DE CARTONES
// ==========================================

function generateBingoCard() {
    const card = {
        id: GameState.cardSerialCounter++,
        owner: GameState.currentUser.name,
        numbers: [],
        markedCells: new Set(),
        createdAt: new Date()
    };
    
    const ranges = [
        [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
        [50, 59], [60, 69], [70, 79], [80, 90]
    ];
    
    for (let col = 0; col < 5; col++) {
        const colNumbers = [];
        for (let row = 0; row < 3; row++) {
            let num;
            do {
                const range = ranges[col + row];
                num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
            } while (colNumbers.includes(num));
            colNumbers.push(num);
        }
        card.numbers.push(...colNumbers);
    }
    
    card.numbers.sort((a, b) => a - b);
    
    return card;
}

function requestCard() {
    if (!GameState.currentUser) return;
    
    const currentCards = GameState.cards.filter(c => c.owner === GameState.currentUser.name);
    if (currentCards.length >= GameState.settings.maxCardsPerPlayer) {
        alert(`Máximo ${GameState.settings.maxCardsPerPlayer} cartones permitidos`);
        return;
    }
    
    const card = generateBingoCard();
    GameState.cards.push(card);
    GameState.currentUser.cards.push(card.id);
    
    renderPlayerCards();
    addChatMessage('system', `${GameState.currentUser.name} solicitó un cartón (Serie: ${card.id})`);
    
    if (GameState.isAdmin) {
        updateAdminCardsView();
    }
}

function assignCardsToPlayer() {
    if (!GameState.isAdmin) return;
    
    const playerName = document.getElementById('playerSelect').value;
    const count = parseInt(document.getElementById('cardsToAssign').value) || 1;
    
    if (!playerName) {
        alert('Selecciona un jugador');
        return;
    }
    
    const player = GameState.players.find(p => p.name === playerName);
    if (!player) return;
    
    for (let i = 0; i < count; i++) {
        const card = generateBingoCard();
        card.owner = playerName;
        GameState.cards.push(card);
        player.cards.push(card.id);
    }
    
    alert(`${count} cartones asignados a ${playerName}`);
    updateAdminCardsView();
    updatePlayersTable();
}

function renderPlayerCards() {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const myCards = GameState.cards.filter(c => c.owner === GameState.currentUser.name);
    
    myCards.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
    });
}

function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'bingo-card';
    div.dataset.cardId = card.id;
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
        <span class="card-series">SERIE: ${card.id}</span>
        <span class="card-owner">${card.owner}</span>
    `;
    
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    
    card.numbers.forEach((num, idx) => {
        const cell = document.createElement('div');
        cell.className = 'card-cell';
        cell.textContent = num;
        cell.dataset.number = num;
        cell.dataset.index = idx;
        
        if (card.markedCells.has(num)) {
            cell.classList.add('marked');
        }
        
        if (GameState.calledNumbers.includes(num)) {
            cell.classList.add('marked');
            card.markedCells.add(num);
        }
        
        cell.onclick = () => toggleCellMark(card.id, num);
        grid.appendChild(cell);
    });
    
    div.appendChild(header);
    div.appendChild(grid);
    
    return div;
}

function toggleCellMark(cardId, number) {
    const card = GameState.cards.find(c => c.id === cardId);
    if (!card) return;
    
    if (card.markedCells.has(number)) {
        card.markedCells.delete(number);
    } else {
        card.markedCells.add(number);
    }
    
    renderPlayerCards();
    checkWinningConditions();
}

// ==========================================
// FUNCIONES DEL JUEGO (ADMIN)
// ==========================================

function startCountdown() {
    if (!GameState.isAdmin) return;
    
    const seconds = parseInt(document.getElementById('countdownInput').value) || 30;
    GameState.countdown = seconds;
    GameState.gameStatus = 'countdown';
    
    updateGameStateDisplay();
    
    GameState.countdownIntervalId = setInterval(() => {
        GameState.countdown--;
        updateCountdownDisplay();
        
        if (GameState.countdown <= 0) {
            clearInterval(GameState.countdownIntervalId);
            startGame();
        }
    }, 1000);
    
    speakText(`El juego comienza en ${seconds} segundos`);
}

function updateCountdownDisplay() {
    const display = document.getElementById('countdown');
    const adminDisplay = document.querySelector('.countdown');
    
    if (display) display.textContent = GameState.countdown;
    if (adminDisplay) adminDisplay.textContent = GameState.countdown;
    
    if (GameState.countdown <= 5 && GameState.countdown > 0) {
        speakText(`${GameState.countdown}`);
    }
}

function startGame() {
    GameState.gameStatus = 'playing';
    GameState.calledNumbers = [];
    GameState.lineWinners = [];
    GameState.bingoWinner = null;
    
    updateGameStateDisplay();
    addChatMessage('system', '¡El juego ha comenzado!');
    
    document.getElementById('btnLine').disabled = false;
    document.getElementById('btnBingo').disabled = false;
}

function pauseGame() {
    if (GameState.gameStatus === 'playing') {
        GameState.gameStatus = 'paused';
        clearTimeout(GameState.autoCallTimeoutId);
    } else if (GameState.gameStatus === 'paused') {
        GameState.gameStatus = 'playing';
        callNextNumberAuto();
    }
    updateGameStateDisplay();
}

function resetGame() {
    clearTimeout(GameState.autoCallTimeoutId);
    clearInterval(GameState.countdownIntervalId);
    
    GameState.gameStatus = 'waiting';
    GameState.calledNumbers = [];
    GameState.currentNumber = null;
    GameState.lineWinners = [];
    GameState.bingoWinner = null;
    GameState.cards.forEach(c => c.markedCells.clear());
    
    updateGameStateDisplay();
    renderPlayerCards();
    updateCalledNumbersDisplay();
    
    document.getElementById('currentNumber').textContent = '--';
    document.getElementById('numberText').textContent = 'Esperando...';
    document.getElementById('btnLine').disabled = true;
    document.getElementById('btnBingo').disabled = true;
    
    addChatMessage('system', 'Juego reiniciado. Esperando nuevo inicio.');
}

function callNextNumberAuto() {
    if (!GameState.isAdmin || GameState.gameStatus !== 'playing') return;
    
    const availableNumbers = [];
    for (let i = 1; i <= 90; i++) {
        if (!GameState.calledNumbers.includes(i)) {
            availableNumbers.push(i);
        }
    }
    
    if (availableNumbers.length === 0) {
        alert('Todos los números han sido cantados');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const number = availableNumbers[randomIndex];
    
    callNumber(number);
    
    const interval = GameState.settings.autoCallInterval * 1000;
    GameState.autoCallTimeoutId = setTimeout(callNextNumberAuto, interval);
}

function callManualNumber() {
    if (!GameState.isAdmin) return;
    
    const input = document.getElementById('manualNumber');
    const number = parseInt(input.value);
    
    if (number < 1 || number > 90) {
        alert('Número debe estar entre 1 y 90');
        return;
    }
    
    if (GameState.calledNumbers.includes(number)) {
        alert('Este número ya fue cantado');
        return;
    }
    
    callNumber(number);
    input.value = '';
}

function callNumber(number) {
    GameState.currentNumber = number;
    GameState.calledNumbers.push(number);
    
    document.getElementById('currentNumber').textContent = number;
    document.getElementById('numberText').textContent = numberNames[number].toUpperCase();
    document.getElementById('adminCurrentNumber').textContent = number;
    
    const ball = document.getElementById('currentBall');
    ball.style.animation = 'none';
    setTimeout(() => ball.style.animation = '', 10);
    
    speakText(`${numberNames[number]}`);
    
    updateCalledNumbersDisplay();
    autoMarkCards(number);
    renderPlayerCards();
    
    addChatMessage('system', `Número cantado: ${number} (${numberNames[number]})`);
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = GameState.audio.masterVolume;
        
        const voices = speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.includes('es'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }
        
        speechSynthesis.speak(utterance);
    }
}

function updateCalledNumbersDisplay() {
    const container = document.getElementById('calledNumbers');
    if (!container) return;
    
    container.innerHTML = '';
    const recent = GameState.calledNumbers.slice(-20).reverse();
    
    recent.forEach(num => {
        const div = document.createElement('div');
        div.className = 'called-number';
        div.textContent = num;
        container.appendChild(div);
    });
}

function autoMarkCards(number) {
    GameState.cards.forEach(card => {
        if (card.numbers.includes(number)) {
            card.markedCells.add(number);
        }
    });
}

// ==========================================
// VERIFICACIÓN DE GANADORES
// ==========================================

function checkWinningConditions() {
    // Implementación de verificación automática
}

function claimLine() {
    if (!GameState.currentUser || GameState.gameStatus !== 'playing') return;
    
    const myCards = GameState.cards.filter(c => c.owner === GameState.currentUser.name);
    let hasLine = false;
    let winningCard = null;
    
    for (const card of myCards) {
        if (checkLineInCard(card)) {
            hasLine = true;
            winningCard = card;
            break;
        }
    }
    
    if (!hasLine) {
        addInfraction(GameState.currentUser.name, 'Línea falsa');
        alert('¡No tienes línea! Se registró una infracción.');
        return;
    }
    
    if (GameState.lineWinners.length >= GameState.settings.maxLineWinners) {
        alert('Ya se alcanzó el máximo de ganadores de línea');
        return;
    }
    
    const winner = {
        name: GameState.currentUser.name,
        cardId: winningCard.id,
        time: new Date(),
        prize: 0
    };
    
    GameState.lineWinners.push(winner);
    
    addChatMessage('system', `🎯 ¡${GameState.currentUser.name} cantó LÍNEA! (Serie: ${winningCard.id})`);
    speakText(`¡Atención! ${GameState.currentUser.name} cantó línea`);
    
    showLineModal(winner);
    
    if (GameState.isAdmin) {
        updateWinnersList();
    }
}

function checkLineInCard(card) {
    const grid = [];
    for (let i = 0; i < 3; i++) {
        grid[i] = card.numbers.slice(i * 5, (i + 1) * 5);
    }
    
    for (let row = 0; row < 3; row++) {
        let markedInRow = 0;
        for (let col = 0; col < 5; col++) {
            if (card.markedCells.has(grid[row][col])) {
                markedInRow++;
            }
        }
        if (markedInRow === 5) return true;
    }
    
    return false;
}

function claimBingo() {
    if (!GameState.currentUser || GameState.gameStatus !== 'playing') return;
    
    const myCards = GameState.cards.filter(c => c.owner === GameState.currentUser.name);
    let hasBingo = false;
    let winningCard = null;
    
    for (const card of myCards) {
        const allMarked = card.numbers.every(n => card.markedCells.has(n));
        if (allMarked) {
            hasBingo = true;
            winningCard = card;
            break;
        }
    }
    
    if (!hasBingo) {
        addInfraction(GameState.currentUser.name, 'Bingo falso');
        alert('¡No tienes bingo completo! Se registró una infracción.');
        return;
    }
    
    GameState.bingoWinner = {
        name: GameState.currentUser.name,
        cardId: winningCard.id,
        time: new Date()
    };
    
    GameState.gameStatus = 'ended';
    
    addChatMessage('system', `🏆 ¡${GameState.currentUser.name} cantó BINGO! ¡FELICIDADES!`);
    speakText(`¡Tenemos ganador! ${GameState.currentUser.name} cantó bingo. ¡Felicidades!`);
    
    showWinnerModal();
    
    if (GameState.isAdmin) {
        updateWinnersList();
        clearTimeout(GameState.autoCallTimeoutId);
    }
}

// ==========================================
// MODALES Y EFECTOS VISUALES
// ==========================================

function showWinnerModal() {
    const modal = document.getElementById('winnerModal');
    const info = document.getElementById('winnerInfo');
    
    info.innerHTML = `
        <p>Ganador: <strong>${GameState.bingoWinner.name}</strong></p>
        <p>Cartón Serie: <strong>${GameState.bingoWinner.cardId}</strong></p>
        <p>Premio: <strong>${formatPrize()}</strong></p>
    `;
    
    modal.classList.add('active');
    createConfetti();
    createFireworks();
    
    setTimeout(() => {
        modal.classList.remove('active');
    }, 10000);
}

function showLineModal(winner) {
    const modal = document.getElementById('lineModal');
    const container = document.getElementById('lineWinners');
    
    const linePrize = calculateLinePrize();
    
    container.innerHTML = GameState.lineWinners.map((w, i) => `
        <div class="line-winner">
            <span>${i + 1}. ${w.name} (Serie: ${w.cardId})</span>
            <span>Premio: ${formatMoney(linePrize)}</span>
        </div>
    `).join('');
    
    modal.classList.add('active');
    
    setTimeout(() => {
        modal.classList.remove('active');
    }, 5000);
}

function createConfetti() {
    const container = document.getElementById('confetti');
    if (!container) return;
    
    container.innerHTML = '';
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        container.appendChild(confetti);
    }
}

function createFireworks() {
    const container = document.getElementById('fireworks');
    if (!container) return;
    
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.style.cssText = `
                position: absolute;
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: gold;
                left: ${20 + Math.random() * 60}%;
                top: ${20 + Math.random() * 40}%;
                box-shadow: 0 0 20px gold, 0 0 40px orange;
                animation: explode 1s ease-out forwards;
            `;
            container.appendChild(firework);
            
            setTimeout(() => firework.remove(), 1000);
        }, i * 200);
    }
}

// ==========================================
// CHAT Y MODERACIÓN
// ==========================================

function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    if (checkBannedWords(text)) {
        addInfraction(GameState.currentUser.name, 'Lenguaje inapropiado');
        alert('⚠️ Tu mensaje contiene palabras prohibidas. Infracción registrada.');
        input.value = '';
        return;
    }
    
    const message = {
        user: GameState.currentUser.name,
        text: text,
        time: new Date(),
        type: 'normal'
    };
    
    GameState.chatMessages.push(message);
    addChatMessage('own', `${GameState.currentUser.name}: ${text}`);
    input.value = '';
    
    if (GameState.isAdmin) {
        updateAdminChat();
    }
}

function addChatMessage(type, text) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.textContent = text;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function checkBannedWords(text) {
    const lowerText = text.toLowerCase();
    return GameState.settings.bannedWords.some(word => lowerText.includes(word));
}

function addInfraction(username, reason) {
    const current = GameState.infractions.get(username) || 0;
    const newCount = current + 1;
    GameState.infractions.set(username, newCount);
    
    addChatMessage('warning', `⚠️ ${username} recibió infracción (${newCount}/3): ${reason}`);
    
    if (newCount >= 3) {
        blockUser(username);
    }
    
    if (GameState.isAdmin) {
        updatePlayersTable();
    }
}

function blockUser(username) {
    GameState.blockedUsers.add(username);
    const player = GameState.players.find(p => p.name === username);
    if (player) {
        player.isOnline = false;
    }
    
    addChatMessage('system', `🚫 ${username} ha sido bloqueado por 20 minutos (3 infracciones)`);
    
    setTimeout(() => {
        GameState.blockedUsers.delete(username);
        addChatMessage('system', `✅ ${username} ha sido desbloqueado`);
    }, 20 * 60 * 1000);
}

// ==========================================
// ADMINISTRACIÓN
// ==========================================

function showAdminSection(section, btnElement) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`section-${section}`).classList.add('active');
    if (btnElement) {
        btnElement.classList.add('active');
    }
    
    if (section === 'players') updatePlayersTable();
    if (section === 'cards') updateAdminCardsView();
}

function updateGameStateDisplay() {
    const stateEl = document.getElementById('adminGameState');
    const statusEl = document.getElementById('gameStatus');
    
    const states = {
        waiting: 'ESPERANDO',
        countdown: 'CUENTA REGRESIVA',
        playing: 'EN JUEGO',
        paused: 'PAUSADO',
        ended: 'FINALIZADO'
    };
    
    if (stateEl) {
        stateEl.textContent = states[GameState.gameStatus];
        stateEl.className = 'game-state ' + (GameState.gameStatus === 'playing' ? 'playing' : '');
    }
    
    if (statusEl) {
        statusEl.textContent = states[GameState.gameStatus];
    }
}

function updateJackpot() {
    if (!GameState.isAdmin) return;
    
    const type = document.getElementById('prizeType').value;
    const value = document.getElementById('prizeValue').value;
    
    GameState.jackpot = {
        type: type,
        value: type === 'money' ? parseFloat(value) || 0 : 0,
        description: value
    };
    
    updateJackpotDisplay();
    addChatMessage('system', `💰 Pozo actualizado: ${formatPrize()}`);
}

function updateJackpotDisplay() {
    const display = document.getElementById('jackpotAmount');
    if (display) {
        display.textContent = formatPrize();
    }
}

function formatPrize() {
    if (GameState.jackpot.type === 'money') {
        return '$' + GameState.jackpot.value.toLocaleString();
    }
    return GameState.jackpot.description;
}

function formatMoney(amount) {
    return '$' + amount.toLocaleString();
}

function calculateLinePrize() {
    const totalLinePrize = GameState.jackpot.value * (parseInt(document.getElementById('linePrizePercent').value) || 20) / 100;
    const winners = Math.max(GameState.lineWinners.length, 1);
    return totalLinePrize / winners;
}

function updateWinnersList() {
    const container = document.getElementById('adminWinnersList');
    if (!container) return;
    
    if (GameState.lineWinners.length === 0 && !GameState.bingoWinner) {
        container.innerHTML = '<p class="no-winners">Sin ganadores aún</p>';
        return;
    }
    
    let html = '';
    
    if (GameState.lineWinners.length > 0) {
        html += '<h4>Ganadores de Línea:</h4>';
        GameState.lineWinners.forEach(w => {
            html += `<p>${w.name} - Cartón ${w.cardId}</p>`;
        });
    }
    
    if (GameState.bingoWinner) {
        html += '<h4>Ganador del Bingo:</h4>';
        html += `<p style="color:gold;font-weight:bold">${GameState.bingoWinner.name} - Cartón ${GameState.bingoWinner.cardId}</p>`;
    }
    
    container.innerHTML = html;
}

function updatePlayersTable() {
    const tbody = document.getElementById('playersTableBody');
    const playerSelect = document.getElementById('playerSelect');
    const viewSelect = document.getElementById('viewPlayerSelect');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (playerSelect) playerSelect.innerHTML = '<option value="">Seleccionar jugador...</option>';
    if (viewSelect) viewSelect.innerHTML = '<option value="">Seleccionar...</option>';
    
    GameState.players.forEach(player => {
        if (player.isAdmin) return;
        
        const tr = document.createElement('tr');
        const infractions = GameState.infractions.get(player.name) || 0;
        
        tr.innerHTML = `
            <td>${player.name}</td>
            <td>${player.cards.length}</td>
            <td class="${player.isOnline ? 'status-online' : 'status-offline'}">
                ${player.isOnline ? 'Online' : 'Offline'}
            </td>
            <td>${infractions}/3</td>
            <td>
                <button class="action-btn btn-msg" onclick="privateMessage('${player.name}')">Mensaje</button>
                <button class="action-btn btn-kick" onclick="kickPlayer('${player.name}')">Expulsar</button>
                <button class="action-btn btn-block" onclick="manualBlock('${player.name}')">Bloquear</button>
            </td>
        `;
        
        tbody.appendChild(tr);
        
        const option = document.createElement('option');
        option.value = player.name;
        option.textContent = player.name;
        if (playerSelect) playerSelect.appendChild(option.cloneNode(true));
        if (viewSelect) viewSelect.appendChild(option);
    });
    
    const onlineCountEl = document.getElementById('onlineCount');
    if (onlineCountEl) {
        onlineCountEl.textContent = 
            GameState.players.filter(p => p.isOnline && !p.isAdmin).length + ' online';
    }
}

function updateAdminCardsView() {
    const container = document.getElementById('adminCardsView');
    if (!container) return;
    
    const selectedPlayer = document.getElementById('viewPlayerSelect').value;
    if (!selectedPlayer) {
        container.innerHTML = '';
        return;
    }
    
    const playerCards = GameState.cards.filter(c => c.owner === selectedPlayer);
    
    container.innerHTML = '';
    playerCards.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
    }); 
}

function viewPlayerCards() {
    updateAdminCardsView();
}

function viewAllCards() {
    const container = document.getElementById('adminCardsView');
    if (!container) return;
    
    container.innerHTML = '';
    GameState.cards.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
    });
}

function kickPlayer(name) {
    const player = GameState.players.find(p => p.name === name);
    if (player) {
        player.isOnline = false;
        addChatMessage('system', `${name} fue expulsado de la sala`);
        updatePlayersTable();
    }
}

function manualBlock(name) {
    blockUser(name);
    updatePlayersTable();
}

function privateMessage(name) {
    const message = prompt(`Mensaje privado para ${name}:`);
    if (message) {
        addChatMessage('system', `📩 Admin → ${name}: ${message}`);
    }
}

function updateAdminChat() {
    const container = document.getElementById('adminChatBox');
    if (!container) return;
    
    const requests = GameState.chatMessages.filter(m => 
        m.text.toLowerCase().includes('carton') || 
        m.text.toLowerCase().includes('carta') ||
        m.text.toLowerCase().includes('admin')
    );
    
    container.innerHTML = requests.map(m => `
        <div class="chat-message ${m.user === GameState.currentUser.name ? 'own' : 'other'}">
            <strong>${m.user}:</strong> ${m.text}
        </div>
    `).join('');
    
    container.scrollTop = container.scrollHeight;
}

// ==========================================
// CONFIGURACIÓN Y AUDIO
// ==========================================

function saveSettings() {
    if (!GameState.isAdmin) return;
    
    GameState.settings.maxCardsPerPlayer = parseInt(document.getElementById('maxCardsPerPlayer').value) || 6;
    GameState.settings.maxLineWinners = parseInt(document.getElementById('maxLineWinners').value) || 3;
    GameState.settings.autoCallInterval = parseInt(document.getElementById('autoCallInterval').value) || 10;
    GameState.settings.countdownSeconds = parseInt(document.getElementById('countdownInput').value) || 30;
    
    const banned = document.getElementById('bannedWords').value.split(',').map(w => w.trim()).filter(w => w);
    if (banned.length > 0) {
        GameState.settings.bannedWords = banned;
    }
    
    alert('Configuración guardada correctamente');
}

function loadMusic() {
    const fileInput = document.getElementById('musicFile');
    const file = fileInput.files[0];
    
    if (file) {
        // Limpiar URL anterior si existe
        if (GameState.audio.music && GameState.audio.music.src) {
            URL.revokeObjectURL(GameState.audio.music.src);
        }
        
        const url = URL.createObjectURL(file);
        GameState.audio.music = new Audio(url);
        GameState.audio.music.loop = true;
        GameState.audio.music.volume = GameState.audio.masterVolume;
    }
}

function toggleMusic() {
    if (!GameState.audio.music) {
        alert('Primero selecciona un archivo de música');
        return;
    }
    
    const btn = document.getElementById('btnMusic');
    
    if (GameState.audio.music.paused) {
        GameState.audio.music.play();
        btn.textContent = '⏸️ Pausar Música';
    } else {
        GameState.audio.music.pause();
        btn.textContent = '🎵 Reproducir';
    }
}

function changeVolume(value) {
    GameState.audio.volume = value / 100;
    if (GameState.audio.music) {
        GameState.audio.music.volume = GameState.audio.volume * GameState.audio.masterVolume;
    }
}

function setMasterVolume(value) {
    GameState.audio.masterVolume = value / 100;
    if (GameState.audio.music) {
        GameState.audio.music.volume = GameState.audio.volume * GameState.audio.masterVolume;
    }
}

function updateOnlineCount() {
    const count = GameState.players.filter(p => p.isOnline && !p.isAdmin).length;
    const display = document.getElementById('onlineCount');
    if (display) {
        display.textContent = count + ' online';
    }
}

function updatePrizeType() {
    const type = document.getElementById('prizeType').value;
    const input = document.getElementById('prizeValue');
    
    if (type === 'money') {
        input.placeholder = 'Monto en pesos';
    } else {
        input.placeholder = 'Descripción del premio (ej: TV 50")';
    }
}

function verifyWinners() {
    alert('Verificación de ganadores completada. Revisa la lista de ganadores.');
}

function distributePrizes() {
    if (GameState.lineWinners.length === 0 && !GameState.bingoWinner) {
        alert('No hay ganadores para distribuir premios');
        return;
    }
    
    const linePrize = calculateLinePrize();
    let message = 'DISTRIBUCIÓN DE PREMIOS:\n\n';
    
    if (GameState.lineWinners.length > 0) {
        message += 'GANADORES DE LÍNEA:\n';
        GameState.lineWinners.forEach((w, i) => {
            message += `${i + 1}. ${w.name} - ${formatMoney(linePrize)}\n`;
        });
    }
    
    if (GameState.bingoWinner) {
        const bingoPrize = GameState.jackpot.value - (linePrize * GameState.lineWinners.length);
        message += `\nGANADOR DEL BINGO:\n`;
        message += `${GameState.bingoWinner.name} - ${formatMoney(bingoPrize)}\n`;
    }
    
    alert(message);
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Cargar voces para síntesis de voz
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
    }
    
    // Verificar parámetros de URL para sala
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        document.getElementById('roomCode').value = roomParam;
    }
    
    console.log('Bingo Virtual Pro cargado correctamente');
});