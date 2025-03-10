// Import multiplayer integration functions
import { 
  initializeMultiplayer, 
  joinMultiplayerGame, 
  updatePlayerPosition, 
  sendPlayerAction, 
  isInMultiplayerMode,
  disconnectFromMultiplayer,
  setGameStateUpdateHandler
} from './game-integration.js';

// Import UI components
import { 
  initializeMultiplayerUI, 
  updatePlayersList, 
  updateGameStatus 
} from './multiplayer-ui.js';

// Game reference
let gameInstance = null;
let gameManager = null;
let localPlayer = null;
let multiplayerUIInitialized = false;

// Initialize the multiplayer connector
export function initializeMultiplayerConnector(game, manager) {
  gameInstance = game;
  gameManager = manager;
  
  // Initialize the multiplayer system
  initializeMultiplayer(gameInstance);
  
  // Set the game state update handler
  setGameStateUpdateHandler(handleGameStateUpdate);
  
  // We don't need to initialize the UI here anymore
  // It's now handled in the main menu
  
  console.log('Multiplayer connector initialized');
  
  // Return the connector API
  return {
    joinGame: joinGame,
    leaveGame: leaveGame,
    updatePosition: updatePosition,
    sendAction: sendAction,
    isMultiplayerActive: isInMultiplayerMode
  };
}

// Join a multiplayer game
async function joinGame(playerName) {
  try {
    // Get the local player reference
    localPlayer = gameManager.localPlayer;
    
    if (!localPlayer) {
      console.error('Cannot join multiplayer game: Local player not initialized');
      return { success: false, error: 'Local player not initialized' };
    }
    
    // Join the multiplayer game
    const result = await joinMultiplayerGame(playerName || localPlayer.name);
    
    if (result && result.success) {
      console.log('Joined multiplayer game:', result.gameId);
      
      // Update game settings for multiplayer
      gameManager.maxPlayers = 20; // Allow up to 20 players in multiplayer
      
      return { success: true, gameId: result.gameId };
    } else {
      console.error('Failed to join multiplayer game');
      return { success: false, error: result?.error || 'Failed to join game' };
    }
  } catch (error) {
    console.error('Error joining multiplayer game:', error);
    return { success: false, error: error.message };
  }
}

// Leave the multiplayer game
function leaveGame() {
  disconnectFromMultiplayer();
  
  // Reset game settings
  gameManager.maxPlayers = 1;
  
  // Remove remote players
  const remotePlayers = gameManager.players.filter(player => player !== gameManager.localPlayer);
  remotePlayers.forEach(player => {
    gameManager.removePlayer(player.id);
  });
  
  console.log('Left multiplayer game');
}

// Update player position
function updatePosition() {
  if (!isInMultiplayerMode() || !localPlayer) return;
  
  // Send position update to server
  updatePlayerPosition({
    x: localPlayer.position.x,
    y: localPlayer.position.y,
    z: localPlayer.position.z,
    rotation: localPlayer.rotation.y
  });
}

// Send player action
function sendAction(actionType, actionData) {
  if (!isInMultiplayerMode() || !localPlayer) return;
  
  // Send action to server
  sendPlayerAction(actionType, actionData);
}

// Handle incoming game state updates
export function handleGameStateUpdate(gameData) {
  if (!gameInstance || !gameManager) return;
  
  // Update player list in UI
  if (gameData.gameState && gameData.gameState.players) {
    updatePlayersList(gameData.gameState.players);
    
    // Update or create players in the game
    Object.values(gameData.gameState.players).forEach(playerData => {
      // Skip local player
      if (localPlayer && playerData.id === localPlayer.id) return;
      
      // Check if player already exists
      let player = gameManager.players.find(p => p.id === playerData.id);
      
      if (player) {
        // Update existing player
        if (playerData.position) {
          player.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
          );
          
          if (playerData.rotation !== undefined) {
            player.rotation.y = playerData.rotation;
          }
        }
        
        // Update player status
        if (playerData.status === 'defeated' && player.isAlive) {
          player.defeat();
        }
      } else {
        // Create new player
        gameManager.createRemotePlayer(
          playerData.id,
          playerData.name,
          playerData.position || { x: 0, y: 5, z: 0 },
          playerData.isBot
        );
      }
    });
  }
  
  // Update game status
  if (gameData.status) {
    updateGameStatus(gameData.status, gameData.gameState?.round || 0);
    
    // Handle game state changes
    if (gameData.status === 'playing' && !gameManager.isGameRunning) {
      gameManager.startGame();
    } else if (gameData.status === 'ended' && gameManager.isGameRunning) {
      gameManager.endGame();
    }
  }
  
  // Update safe zone
  if (gameData.gameState && gameData.gameState.safeZone) {
    gameManager.updateSafeZone(gameData.gameState.safeZone);
  }
  
  // Update items/pickups
  if (gameData.gameState && gameData.gameState.items) {
    gameManager.updateItems(gameData.gameState.items);
  }
  
  // Process any pending actions
  if (gameData.lastMove && gameData.lastMove.type === 'action') {
    const { playerId, actionType, actionData } = gameData.lastMove;
    
    if (actionType === 'attack') {
      gameManager.handleRemoteAttack(playerId, actionData);
    } else if (actionType === 'useItem') {
      gameManager.handleRemoteItemUse(playerId, actionData);
    }
  }
} 