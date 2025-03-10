// Import game integration
import { 
  initializeMultiplayer, 
  joinMultiplayerGame, 
  isInMultiplayerMode,
  disconnectFromMultiplayer
} from './game-integration.js';

// UI elements
let multiplayerContainer;
let playersList;
let gameStatus;
let roundDisplay;
let joinButton;
let leaveButton;

// Initialize the multiplayer UI
export function initializeMultiplayerUI(gameInstance, containerId = 'multiplayer-container') {
  // Initialize the multiplayer system if gameInstance is provided
  if (gameInstance) {
    initializeMultiplayer(gameInstance);
  }
  
  // Get container
  multiplayerContainer = document.getElementById(containerId);
  
  // If container exists, create UI elements
  if (multiplayerContainer) {
    console.log('Initializing multiplayer UI in container:', containerId);
    
    // Create UI elements
    createUIElements();
    
    // Add event listeners
    addEventListeners();
    
    return multiplayerContainer;
  } else {
    console.warn(`Multiplayer container with ID '${containerId}' not found. UI not initialized.`);
    return null;
  }
}

// Create UI elements
function createUIElements() {
  multiplayerContainer.innerHTML = `
    <div class="multiplayer-panel">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2>Multiplayer</h2>
        <button id="back-to-menu-button" style="background: transparent; border: 1px solid #f0f; color: #f0f; padding: 5px 10px; cursor: pointer; font-family: 'Courier New', monospace;">Back to Menu</button>
      </div>
      <div class="multiplayer-controls">
        <input type="text" id="player-name-input" placeholder="Your Name" value="Player_${Math.floor(Math.random() * 1000)}">
        <button id="join-game-button">Join Game</button>
        <button id="leave-game-button" disabled>Leave Game</button>
      </div>
      <div class="game-info">
        <div id="game-status">Waiting to join...</div>
        <div id="round-display"></div>
      </div>
      <div class="players-section">
        <h3>Players</h3>
        <div id="players-list" class="players-list"></div>
      </div>
    </div>
  `;
  
  // Get references to UI elements
  playersList = document.getElementById('players-list');
  gameStatus = document.getElementById('game-status');
  roundDisplay = document.getElementById('round-display');
  joinButton = document.getElementById('join-game-button');
  leaveButton = document.getElementById('leave-game-button');
  
  // Add styles if not in main menu
  if (!document.getElementById('main-menu')) {
    addStyles();
  }
}

// Add event listeners
function addEventListeners() {
  // Back to menu button
  const backButton = document.getElementById('back-to-menu-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Check if we're in the main menu
      const mainMenu = document.getElementById('main-menu');
      if (mainMenu) {
        // Use the toggleMultiplayerPanel function if it exists in the window object
        if (typeof window.toggleMultiplayerPanel === 'function') {
          window.toggleMultiplayerPanel();
        } else {
          // Fallback: hide the multiplayer container
          const multiplayerContainer = document.getElementById('multiplayer-container');
          if (multiplayerContainer) {
            multiplayerContainer.style.display = 'none';
          }
        }
      }
    });
  }

  // Join game button
  joinButton.addEventListener('click', async () => {
    const playerNameInput = document.getElementById('player-name-input');
    const playerName = playerNameInput.value.trim() || `Player_${Math.floor(Math.random() * 1000)}`;
    
    // Disable button during join process
    joinButton.disabled = true;
    joinButton.textContent = 'Joining...';
    
    // Join game
    const result = await joinMultiplayerGame(playerName);
    
    if (result && result.success) {
      // Update UI for joined state
      joinButton.style.display = 'none';
      leaveButton.disabled = false;
      gameStatus.textContent = 'Waiting for players...';
      playerNameInput.disabled = true;
      
      // If we're in the main menu, start the game in multiplayer mode
      const mainMenu = document.getElementById('main-menu');
      if (mainMenu && typeof window.startGame === 'function') {
        window.startGame(true); // Start game in multiplayer mode
      }
    } else {
      // Show error
      joinButton.disabled = false;
      joinButton.textContent = 'Join Game';
      gameStatus.textContent = `Failed to join: ${result?.error || 'Unknown error'}`;
      gameStatus.classList.add('error');
    }
  });
  
  // Leave game button
  leaveButton.addEventListener('click', () => {
    disconnectFromMultiplayer();
    
    // Reset UI
    joinButton.style.display = '';
    joinButton.disabled = false;
    joinButton.textContent = 'Join Game';
    leaveButton.disabled = true;
    gameStatus.textContent = 'Waiting to join...';
    gameStatus.classList.remove('error', 'status-playing');
    roundDisplay.textContent = '';
    playersList.innerHTML = '';
    document.getElementById('player-name-input').disabled = false;
  });
}

// Add styles to the UI
function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .multiplayer-panel {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 250px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 15px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      z-index: 1000;
    }
    
    .multiplayer-panel h2, .multiplayer-panel h3 {
      margin-top: 0;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .multiplayer-controls {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 15px;
    }
    
    .multiplayer-controls input {
      padding: 8px;
      border-radius: 3px;
      border: none;
    }
    
    .multiplayer-controls button {
      padding: 8px;
      border-radius: 3px;
      border: none;
      background-color: #4CAF50;
      color: white;
      cursor: pointer;
    }
    
    .multiplayer-controls button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .game-info {
      margin-bottom: 15px;
      text-align: center;
    }
    
    #game-status {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    #game-status.error {
      color: #ff6b6b;
    }
    
    #game-status.status-playing {
      color: #4CAF50;
    }
    
    .players-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #555;
      border-radius: 3px;
      padding: 5px;
    }
    
    .player-item {
      display: flex;
      justify-content: space-between;
      padding: 5px;
      border-bottom: 1px solid #555;
    }
    
    .player-item:last-child {
      border-bottom: none;
    }
    
    .player-name {
      font-weight: bold;
    }
    
    .player-status {
      font-style: italic;
      color: #aaa;
    }
  `;
  document.head.appendChild(style);
}

// Update the players list
export function updatePlayersList(players) {
  if (!playersList) return;
  
  playersList.innerHTML = '';
  
  if (!players || Object.keys(players).length === 0) {
    playersList.innerHTML = '<div class="no-players">No players yet</div>';
    return;
  }
  
  Object.values(players).forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    
    // Add status indicator (alive, defeated)
    let statusText = player.isBot ? 'Bot' : 'Human';
    if (player.status === 'defeated') {
      statusText += ' (Defeated)';
    }
    
    playerItem.innerHTML = `
      <span class="player-name">${player.name}</span>
      <span class="player-status">${statusText}</span>
    `;
    
    playersList.appendChild(playerItem);
  });
}

// Update game status
export function updateGameStatus(status, round) {
  if (!gameStatus || !roundDisplay) return;
  
  // Update status
  if (status === 'playing') {
    gameStatus.textContent = 'Game in progress';
    gameStatus.className = 'status-playing';
  } else if (status === 'waiting') {
    gameStatus.textContent = 'Waiting for players...';
    gameStatus.className = '';
  } else if (status === 'ended') {
    gameStatus.textContent = 'Game ended';
    gameStatus.className = '';
  }
  
  // Update round
  if (round) {
    roundDisplay.textContent = `Round ${round}`;
  } else {
    roundDisplay.textContent = '';
  }
} 