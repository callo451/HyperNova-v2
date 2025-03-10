// Import Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, onChildAdded, onChildChanged } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Import game integration for state updates
import { handleGameStateUpdate } from './game-integration.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCP9W9NfwFgKvuLNfyKrOPzux46oochrsw",
  authDomain: "hypernova-8fd2c.firebaseapp.com",
  databaseURL: "https://hypernova-8fd2c-default-rtdb.firebaseio.com",
  projectId: "hypernova-8fd2c",
  storageBucket: "hypernova-8fd2c.firebasestorage.app",
  messagingSenderId: "565281740320",
  appId: "1:565281740320:web:29482ef95d3076c916ce45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Game state
let currentGameId = null;
let currentPlayerId = null;
let gameStateListeners = [];

// API URL
const API_URL = 'http://localhost:3002/api';

// Initialize player
async function initializePlayer() {
  try {
    // Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    currentPlayerId = userCredential.user.uid;
    
    console.log('Player initialized with ID:', currentPlayerId);
    return currentPlayerId;
  } catch (error) {
    console.error('Error initializing player:', error);
    return null;
  }
}

// Join or create a game
async function joinGame(playerName = null) {
  if (!currentPlayerId) {
    await initializePlayer();
  }
  
  const name = playerName || 'Player_' + Math.floor(Math.random() * 1000);
  
  try {
    // Try to find an available game first
    const response = await fetch(`${API_URL}/games/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerId: currentPlayerId,
        playerName: name
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Successfully joined a game
      currentGameId = data.gameId;
      setupGameListeners(currentGameId);
      return data;
    } else if (data.error === 'Game not found') {
      // Create a new game
      const createResponse = await fetch(`${API_URL}/games/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerId: currentPlayerId,
          playerName: name
        })
      });
      
      const createData = await createResponse.json();
      
      if (createResponse.ok) {
        currentGameId = createData.gameId;
        setupGameListeners(currentGameId);
        return { success: true, gameId: createData.gameId };
      } else {
        throw new Error(createData.error || 'Failed to create game');
      }
    } else {
      throw new Error(data.error || 'Failed to join game');
    }
  } catch (error) {
    console.error('Error joining game:', error);
    return null;
  }
}

// Send player moves to server
async function sendMove(moveData) {
  if (!currentGameId || !currentPlayerId) {
    console.error('Cannot send move: No active game or player');
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/games/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: currentGameId,
        playerId: currentPlayerId,
        moveData: moveData
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send move');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending move:', error);
    return false;
  }
}

// Set up Firebase listeners for game updates
function setupGameListeners(gameId) {
  // Clear any existing listeners
  gameStateListeners.forEach(listener => listener());
  gameStateListeners = [];
  
  // Listen for player changes
  const playersRef = ref(db, `games/${gameId}/players`);
  const playersListener = onChildAdded(playersRef, (snapshot) => {
    const playerData = snapshot.val();
    console.log('Player joined:', playerData);
    updatePlayerList();
  });
  
  gameStateListeners.push(() => playersListener());
  
  // Listen for game state changes
  const gameRef = ref(db, `games/${gameId}`);
  const gameListener = onValue(gameRef, (snapshot) => {
    const gameData = snapshot.val();
    
    if (!gameData) return;
    
    console.log('Game state updated:', gameData);
    
    // Check if game started
    if (gameData.status === 'playing' && gameData.gameState) {
      initializeGameWithState(gameData.gameState);
    }
    
    // Check for new moves
    if (gameData.lastMove) {
      handleMove(gameData.lastMove);
    }
    
    // Update game state in the game integration
    handleGameStateUpdate(gameData);
  });
  
  gameStateListeners.push(() => gameListener());
}

// Handle a move from any player
function handleMove(moveData) {
  // Log move for debugging
  console.log('Move received:', moveData);
}

// UI update functions
function updatePlayerList() {
  if (!currentGameId) return;
  
  const playersRef = ref(db, `games/${currentGameId}/players`);
  onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    
    // Update player list in UI
    const playersList = document.getElementById('players-list');
    if (playersList) {
      playersList.innerHTML = '';
      
      Object.values(players).forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
          <span class="player-name">${player.name}</span>
          <span class="player-status">${player.isBot ? 'Bot' : 'Human'}</span>
        `;
        playersList.appendChild(playerItem);
      });
    }
    
    console.log('Players updated:', players);
  });
}

function initializeGameWithState(gameState) {
  // Log for debugging
  console.log('Initializing game with state:', gameState);
  
  // Update UI to show game has started
  const gameStatus = document.getElementById('game-status');
  if (gameStatus) {
    gameStatus.textContent = 'Game in progress';
    gameStatus.className = 'status-playing';
  }
}

function updateGameState(gameData) {
  // Log for debugging
  console.log('Updating game state:', gameData);
  
  // Update round number in UI
  if (gameData.gameState && gameData.gameState.round) {
    const roundDisplay = document.getElementById('round-display');
    if (roundDisplay) {
      roundDisplay.textContent = `Round ${gameData.gameState.round}`;
    }
  }
}

// Get current player ID
function getCurrentPlayerId() {
  return currentPlayerId;
}

// Get current game ID
function getCurrentGameId() {
  return currentGameId;
}

// Export functions for use in other modules
export {
  initializePlayer,
  joinGame,
  sendMove,
  setupGameListeners,
  updatePlayerList,
  initializeGameWithState,
  updateGameState,
  getCurrentPlayerId,
  getCurrentGameId
}; 