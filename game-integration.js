// Import client functions
import { initializePlayer, joinGame, sendMove, setupGameListeners } from './client.js';

// Game state
let isMultiplayer = false;
let localPlayer = null;
let gameInstance = null;
let currentGameId = null;
let gameStateUpdateHandler = null;

// Initialize the multiplayer system
export async function initializeMultiplayer(gameRef) {
  // Store reference to the game instance
  gameInstance = gameRef;
  
  // Initialize player in Firebase
  await initializePlayer();
  
  console.log('Multiplayer system initialized');
  return true;
}

// Set the game state update handler
export function setGameStateUpdateHandler(handler) {
  gameStateUpdateHandler = handler;
}

// Join a multiplayer game
export async function joinMultiplayerGame(playerName) {
  try {
    // Join or create a game session
    const result = await joinGame(playerName);
    
    if (result && result.gameId) {
      isMultiplayer = true;
      currentGameId = result.gameId;
      console.log('Joined multiplayer game:', result.gameId);
      
      // Setup listeners for game updates
      setupGameListeners(result.gameId);
      
      // Return success
      return {
        success: true,
        gameId: result.gameId
      };
    } else {
      console.error('Failed to join multiplayer game');
      return {
        success: false,
        error: 'Failed to join game'
      };
    }
  } catch (error) {
    console.error('Error joining multiplayer game:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send player position update
export function updatePlayerPosition(position) {
  if (!isMultiplayer) return;
  
  sendMove({
    type: 'position',
    position: {
      x: position.x,
      y: position.y,
      z: position.z,
      rotation: position.rotation
    }
  });
}

// Send player action (attack, use item, etc.)
export function sendPlayerAction(actionType, actionData) {
  if (!isMultiplayer) return;
  
  sendMove({
    type: 'action',
    actionType: actionType,
    actionData: actionData
  });
}

// Handle incoming game state updates
export function handleGameStateUpdate(gameData) {
  if (!gameInstance) return;
  
  // Forward the game state update to the connector if handler is set
  if (gameStateUpdateHandler) {
    gameStateUpdateHandler(gameData);
  }
}

// Check if we're in multiplayer mode
export function isInMultiplayerMode() {
  return isMultiplayer;
}

// Get the current game ID
export function getCurrentGameId() {
  return currentGameId;
}

// Disconnect from multiplayer
export function disconnectFromMultiplayer() {
  isMultiplayer = false;
  currentGameId = null;
  // Additional cleanup if needed
} 