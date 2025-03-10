const express = require('express');
const http = require('http');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin SDK
// You'll need to generate a service account key from Firebase console
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hypernova-8fd2c-default-rtdb.firebaseio.com" // Replace with your Firebase URL
});

const db = admin.database();
const gamesRef = db.ref('games');

const app = express();
app.use(cors());
app.use(express.json());

// API endpoints for game management
app.post('/api/games/create', async (req, res) => {
  try {
    const { playerId, playerName } = req.body;
    console.log('Create game request received:', { playerId, playerName });
    
    // Create a new game room
    const gameRef = gamesRef.push();
    const gameId = gameRef.key;
    console.log('Created new game with ID:', gameId);
    
    const gameData = {
      status: 'waiting',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      players: {
        [playerId]: {
          id: playerId,
          name: playerName,
          isBot: false,
          joinedAt: admin.database.ServerValue.TIMESTAMP
        }
      }
    };
    
    console.log('Setting game data:', gameId);
    await gameRef.set(gameData);
    
    // Start the bot checking process
    console.log('Starting bot checking process for game:', gameId);
    checkAndAddBots(gameId);
    
    console.log('Game successfully created:', gameId);
    res.status(201).json({ 
      success: true,
      gameId, 
      gameData 
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

app.post('/api/games/join', async (req, res) => {
  try {
    const { gameId, playerId, playerName } = req.body;
    console.log('Join request received:', { gameId, playerId, playerName });
    
    // If no gameId is provided, find an available game
    let targetGameId = gameId;
    if (!targetGameId) {
      console.log('No gameId provided, finding available room...');
      const availableGame = await findAvailableRoom();
      if (availableGame) {
        targetGameId = availableGame;
        console.log('Found available game:', targetGameId);
      } else {
        console.log('No available games found, returning 404');
        return res.status(404).json({ error: 'Game not found' });
      }
    }
    
    // Check if game exists
    console.log('Checking if game exists:', targetGameId);
    const gameSnapshot = await gamesRef.child(targetGameId).once('value');
    const gameData = gameSnapshot.val();
    
    if (!gameData) {
      console.log('Game not found:', targetGameId);
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (gameData.status === 'playing') {
      console.log('Game already in progress:', targetGameId);
      return res.status(400).json({ error: 'Game already in progress' });
    }
    
    // Add player to game
    console.log('Adding player to game:', { targetGameId, playerId, playerName });
    const playerData = {
      id: playerId,
      name: playerName,
      isBot: false,
      joinedAt: admin.database.ServerValue.TIMESTAMP
    };
    
    await gamesRef.child(`${targetGameId}/players/${playerId}`).set(playerData);
    
    // Check if game is now full (20 players)
    const updatedGameSnapshot = await gamesRef.child(targetGameId).once('value');
    const updatedGameData = updatedGameSnapshot.val();
    const playerCount = Object.keys(updatedGameData.players || {}).length;
    console.log(`Game ${targetGameId} now has ${playerCount} players`);
    
    if (playerCount >= 20) {
      console.log('Game is full, starting game:', targetGameId);
      await startGame(targetGameId);
    } else {
      // Check if we need to add bots
      console.log('Checking if bots need to be added to game:', targetGameId);
      checkAndAddBots(targetGameId);
    }
    
    console.log('Player successfully joined game:', { targetGameId, playerId });
    res.status(200).json({ 
      success: true,
      gameId: targetGameId, 
      playerData 
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

app.post('/api/games/move', async (req, res) => {
  try {
    const { gameId, playerId, moveData } = req.body;
    
    // Validate move and update game state
    const gameSnapshot = await gamesRef.child(gameId).once('value');
    const gameData = gameSnapshot.val();
    
    if (!gameData || gameData.status !== 'playing') {
      return res.status(400).json({ error: 'Invalid game state' });
    }
    
    if (!gameData.players[playerId] || gameData.players[playerId].isBot) {
      return res.status(403).json({ error: 'Invalid player' });
    }
    
    // Process different move types
    switch (moveData.type) {
      case 'position':
        // Update player position
        await gamesRef.child(`${gameId}/gameState/players/${playerId}/position`).set(moveData.position);
        
        // Check for item pickups
        await checkItemPickups(gameId, playerId, moveData.position);
        
        // Check for player interactions
        await checkPlayerInteractions(gameId, playerId, moveData.position);
        break;
        
      case 'action':
        // Process player action (attack, use item, etc.)
        await processPlayerAction(gameId, playerId, moveData.actionType, moveData.actionData);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid move type' });
    }
    
    // Update last move
    await gamesRef.child(`${gameId}/lastMove`).set({
      playerId,
      ...moveData,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing move:', error);
    res.status(500).json({ error: 'Failed to process move' });
  }
});

// Helper functions
async function findAvailableRoom() {
  try {
    console.log('Finding available room...');
    
    // Find games that are waiting and have less than 20 players
    const snapshot = await gamesRef
      .orderByChild('status')
      .equalTo('waiting')
      .once('value');
    
    const games = snapshot.val() || {};
    console.log('Found games:', Object.keys(games).length);
    
    for (const gameId in games) {
      const playerCount = Object.keys(games[gameId].players || {}).length;
      console.log(`Game ${gameId} has ${playerCount} players`);
      
      if (playerCount < 20) {
        console.log(`Returning available game: ${gameId}`);
        return gameId;
      }
    }
    
    console.log('No available games found');
    return null;
  } catch (error) {
    console.error('Error finding available room:', error);
    return null;
  }
}

async function checkAndAddBots(gameId) {
  try {
    const gameSnapshot = await gamesRef.child(gameId).once('value');
    const gameData = gameSnapshot.val();
    
    if (!gameData) return;
    
    const playerCount = Object.keys(gameData.players || {}).length;
    
    // If game is in playing state and we have less than 20 players, add bots
    if (gameData.status === 'playing' && playerCount < 20) {
      const botsNeeded = 20 - playerCount;
      
      for (let i = 0; i < botsNeeded; i++) {
        await addBot(gameId);
      }
    }
  } catch (error) {
    console.error('Error checking and adding bots:', error);
  }
}

async function addBot(gameId) {
  try {
    const botId = 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const botData = {
      id: botId,
      name: 'Bot ' + Math.floor(Math.random() * 100),
      isBot: true,
      joinedAt: admin.database.ServerValue.TIMESTAMP
    };
    
    await gamesRef.child(`${gameId}/players/${botId}`).set(botData);
    return botId;
  } catch (error) {
    console.error('Error adding bot:', error);
    return null;
  }
}

async function startGame(gameId) {
  try {
    // Update game status
    await gamesRef.child(`${gameId}/status`).set('playing');
    await gamesRef.child(`${gameId}/startedAt`).set(admin.database.ServerValue.TIMESTAMP);
    
    // Get all players
    const playersSnapshot = await gamesRef.child(`${gameId}/players`).once('value');
    const players = playersSnapshot.val() || {};
    
    // Initialize player positions and stats
    const initializedPlayers = {};
    Object.entries(players).forEach(([playerId, playerData]) => {
      // Generate random starting position
      const position = {
        x: Math.floor(Math.random() * 1000) - 500, // -500 to 500
        y: 0, // Ground level
        z: Math.floor(Math.random() * 1000) - 500 // -500 to 500
      };
      
      initializedPlayers[playerId] = {
        ...playerData,
        position: position,
        health: 100,
        score: 0,
        inventory: [],
        status: 'alive'
      };
    });
    
    // Initialize game state with game-specific data
    await gamesRef.child(`${gameId}/gameState`).set({
      players: initializedPlayers,
      round: 1,
      timeRemaining: 300, // 5 minutes in seconds
      safeZone: {
        center: { x: 0, y: 0, z: 0 },
        radius: 500
      },
      items: generateInitialItems(),
      events: []
    });
    
    // Start countdown timer
    startGameTimer(gameId);
    
    // Check if we need to add bots
    await checkAndAddBots(gameId);
    
    // Start bot AI loop
    startBotAI(gameId);
    
    return true;
  } catch (error) {
    console.error('Error starting game:', error);
    return false;
  }
}

// Generate initial items for the game world
function generateInitialItems() {
  const items = {};
  const itemTypes = ['health', 'weapon', 'shield', 'speed'];
  
  // Generate 50 random items
  for (let i = 0; i < 50; i++) {
    const itemId = 'item_' + Date.now() + '_' + i;
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    items[itemId] = {
      id: itemId,
      type: itemType,
      position: {
        x: Math.floor(Math.random() * 1000) - 500,
        y: 0,
        z: Math.floor(Math.random() * 1000) - 500
      },
      value: Math.floor(Math.random() * 50) + 10
    };
  }
  
  return items;
}

// Start game timer
function startGameTimer(gameId) {
  const timerInterval = setInterval(async () => {
    try {
      // Get current game state
      const gameSnapshot = await gamesRef.child(`${gameId}`).once('value');
      const gameData = gameSnapshot.val();
      
      if (!gameData || gameData.status !== 'playing') {
        clearInterval(timerInterval);
        return;
      }
      
      // Update time remaining
      const timeRemaining = gameData.gameState.timeRemaining - 1;
      
      if (timeRemaining <= 0) {
        // End current round or game
        if (gameData.gameState.round >= 3) {
          // Game over after 3 rounds
          await endGame(gameId);
        } else {
          // Start next round
          await startNextRound(gameId, gameData.gameState.round + 1);
        }
        clearInterval(timerInterval);
      } else {
        // Update time remaining
        await gamesRef.child(`${gameId}/gameState/timeRemaining`).set(timeRemaining);
        
        // Shrink safe zone every 60 seconds
        if (timeRemaining % 60 === 0 && timeRemaining < 240) {
          await shrinkSafeZone(gameId, gameData.gameState.safeZone);
        }
      }
    } catch (error) {
      console.error('Error in game timer:', error);
    }
  }, 1000);
}

// Start next round
async function startNextRound(gameId, roundNumber) {
  try {
    // Update round number
    await gamesRef.child(`${gameId}/gameState/round`).set(roundNumber);
    
    // Reset time remaining
    await gamesRef.child(`${gameId}/gameState/timeRemaining`).set(300);
    
    // Reset safe zone
    await gamesRef.child(`${gameId}/gameState/safeZone`).set({
      center: { x: 0, y: 0, z: 0 },
      radius: 500 - ((roundNumber - 1) * 100) // Smaller each round
    });
    
    // Add new items
    const items = generateInitialItems();
    await gamesRef.child(`${gameId}/gameState/items`).set(items);
    
    // Add round start event
    const event = {
      type: 'round_start',
      roundNumber: roundNumber,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };
    await gamesRef.child(`${gameId}/gameState/events`).push(event);
    
    // Start timer for new round
    startGameTimer(gameId);
  } catch (error) {
    console.error('Error starting next round:', error);
  }
}

// Shrink safe zone
async function shrinkSafeZone(gameId, currentZone) {
  try {
    const newRadius = Math.max(50, currentZone.radius * 0.8);
    
    await gamesRef.child(`${gameId}/gameState/safeZone/radius`).set(newRadius);
    
    // Add zone shrink event
    const event = {
      type: 'zone_shrink',
      newRadius: newRadius,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };
    await gamesRef.child(`${gameId}/gameState/events`).push(event);
  } catch (error) {
    console.error('Error shrinking safe zone:', error);
  }
}

// End game
async function endGame(gameId) {
  try {
    // Update game status
    await gamesRef.child(`${gameId}/status`).set('ended');
    
    // Calculate final scores and determine winner
    const gameSnapshot = await gamesRef.child(`${gameId}`).once('value');
    const gameData = gameSnapshot.val();
    
    if (!gameData) return;
    
    const players = gameData.gameState.players || {};
    let highestScore = -1;
    let winner = null;
    
    Object.entries(players).forEach(([playerId, playerData]) => {
      if (playerData.score > highestScore) {
        highestScore = playerData.score;
        winner = playerId;
      }
    });
    
    // Record winner
    await gamesRef.child(`${gameId}/winner`).set({
      playerId: winner,
      playerName: players[winner]?.name || 'Unknown',
      score: highestScore
    });
    
    // Add game end event
    const event = {
      type: 'game_end',
      winner: winner,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };
    await gamesRef.child(`${gameId}/gameState/events`).push(event);
    
    // Clear bot interval
    if (botIntervals[gameId]) {
      clearInterval(botIntervals[gameId]);
      delete botIntervals[gameId];
    }
  } catch (error) {
    console.error('Error ending game:', error);
  }
}

// Update bot AI to make more intelligent moves
function generateBotMove(gameData, botId) {
  const bot = gameData.gameState.players[botId];
  
  // If bot is not alive, do nothing
  if (!bot || bot.status !== 'alive') {
    return null;
  }
  
  // Get all players
  const players = gameData.gameState.players || {};
  
  // Get all items
  const items = gameData.gameState.items || {};
  
  // Get safe zone
  const safeZone = gameData.gameState.safeZone;
  
  // Bot decision making
  // 1. If health is low, look for health items
  if (bot.health < 30) {
    const healthItems = Object.values(items).filter(item => item.type === 'health');
    
    if (healthItems.length > 0) {
      // Find closest health item
      const closestItem = findClosestObject(bot.position, healthItems);
      
      if (closestItem) {
        return {
          type: 'position',
          position: moveToward(bot.position, closestItem.position, 5)
        };
      }
    }
  }
  
  // 2. If outside safe zone, move toward it
  const distanceToCenter = calculateDistance(bot.position, safeZone.center);
  
  if (distanceToCenter > safeZone.radius) {
    return {
      type: 'position',
      position: moveToward(bot.position, safeZone.center, 5)
    };
  }
  
  // 3. If enemies nearby, attack or flee based on health
  const otherPlayers = Object.entries(players)
    .filter(([id, player]) => id !== botId && player.status === 'alive')
    .map(([id, player]) => ({ id, ...player }));
  
  if (otherPlayers.length > 0) {
    const closestPlayer = findClosestObject(bot.position, otherPlayers);
    
    if (closestPlayer) {
      const distance = calculateDistance(bot.position, closestPlayer.position);
      
      // If close enough and health is good, attack
      if (distance < 15 && bot.health > 50) {
        return {
          type: 'action',
          actionType: 'attack',
          actionData: {
            targetId: closestPlayer.id
          }
        };
      }
      
      // If health is good, move toward closest player
      if (bot.health > 50) {
        return {
          type: 'position',
          position: moveToward(bot.position, closestPlayer.position, 5)
        };
      }
      
      // If health is low, flee from closest player
      return {
        type: 'position',
        position: moveAway(bot.position, closestPlayer.position, 5)
      };
    }
  }
  
  // 4. Otherwise, move toward a random item
  const allItems = Object.values(items);
  
  if (allItems.length > 0) {
    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
    
    return {
      type: 'position',
      position: moveToward(bot.position, randomItem.position, 5)
    };
  }
  
  // 5. If no items, move randomly within safe zone
  const randomAngle = Math.random() * Math.PI * 2;
  const randomDistance = Math.random() * safeZone.radius * 0.8;
  
  return {
    type: 'position',
    position: {
      x: safeZone.center.x + Math.cos(randomAngle) * randomDistance,
      y: 0,
      z: safeZone.center.z + Math.sin(randomAngle) * randomDistance
    }
  };
}

// Helper function to calculate distance between two positions
function calculateDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = (pos1.y || 0) - (pos2.y || 0);
  const dz = pos1.z - pos2.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Helper function to find closest object
function findClosestObject(position, objects) {
  let closestObject = null;
  let closestDistance = Infinity;
  
  objects.forEach(obj => {
    const distance = calculateDistance(position, obj.position);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestObject = obj;
    }
  });
  
  return closestObject;
}

// Helper function to move toward a position
function moveToward(currentPos, targetPos, speed) {
  const dx = targetPos.x - currentPos.x;
  const dz = targetPos.z - currentPos.z;
  
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  if (distance === 0) return currentPos;
  
  const moveX = (dx / distance) * speed;
  const moveZ = (dz / distance) * speed;
  
  return {
    x: currentPos.x + moveX,
    y: currentPos.y || 0,
    z: currentPos.z + moveZ
  };
}

// Helper function to move away from a position
function moveAway(currentPos, targetPos, speed) {
  const dx = currentPos.x - targetPos.x;
  const dz = currentPos.z - targetPos.z;
  
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  if (distance === 0) {
    // Move in a random direction if at same position
    const randomAngle = Math.random() * Math.PI * 2;
    return {
      x: currentPos.x + Math.cos(randomAngle) * speed,
      y: currentPos.y || 0,
      z: currentPos.z + Math.sin(randomAngle) * speed
    };
  }
  
  const moveX = (dx / distance) * speed;
  const moveZ = (dz / distance) * speed;
  
  return {
    x: currentPos.x + moveX,
    y: currentPos.y || 0,
    z: currentPos.z + moveZ
  };
}

// Check for item pickups
async function checkItemPickups(gameId, playerId, playerPosition) {
  try {
    // Get items
    const itemsSnapshot = await gamesRef.child(`${gameId}/gameState/items`).once('value');
    const items = itemsSnapshot.val() || {};
    
    // Check each item for proximity
    const pickupDistance = 5; // Units for item pickup
    const pickedItems = [];
    
    Object.entries(items).forEach(([itemId, item]) => {
      const distance = calculateDistance(playerPosition, item.position);
      
      if (distance <= pickupDistance) {
        pickedItems.push({ itemId, item });
      }
    });
    
    // Process picked up items
    for (const { itemId, item } of pickedItems) {
      // Remove item from game world
      await gamesRef.child(`${gameId}/gameState/items/${itemId}`).remove();
      
      // Add to player inventory
      await gamesRef.child(`${gameId}/gameState/players/${playerId}/inventory`).push(item);
      
      // Apply immediate effects
      if (item.type === 'health') {
        // Get current health
        const playerSnapshot = await gamesRef.child(`${gameId}/gameState/players/${playerId}`).once('value');
        const player = playerSnapshot.val();
        
        if (player) {
          const newHealth = Math.min(100, (player.health || 0) + item.value);
          await gamesRef.child(`${gameId}/gameState/players/${playerId}/health`).set(newHealth);
        }
      }
      
      // Add event
      const event = {
        type: 'item_pickup',
        playerId: playerId,
        itemType: item.type,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };
      await gamesRef.child(`${gameId}/gameState/events`).push(event);
    }
  } catch (error) {
    console.error('Error checking item pickups:', error);
  }
}

// Check for player interactions
async function checkPlayerInteractions(gameId, playerId, playerPosition) {
  try {
    // Get all players
    const playersSnapshot = await gamesRef.child(`${gameId}/gameState/players`).once('value');
    const players = playersSnapshot.val() || {};
    
    // Check for proximity to other players
    const interactionDistance = 10; // Units for player interaction
    
    Object.entries(players).forEach(([otherPlayerId, otherPlayer]) => {
      // Skip self
      if (otherPlayerId === playerId) return;
      
      // Skip players who aren't alive
      if (otherPlayer.status !== 'alive') return;
      
      const distance = calculateDistance(playerPosition, otherPlayer.position);
      
      if (distance <= interactionDistance) {
        // Players are close - could trigger events here
        // For now, just log the proximity
        console.log(`Players ${playerId} and ${otherPlayerId} are in proximity`);
      }
    });
  } catch (error) {
    console.error('Error checking player interactions:', error);
  }
}

// Process player action
async function processPlayerAction(gameId, playerId, actionType, actionData) {
  try {
    switch (actionType) {
      case 'attack':
        await processAttack(gameId, playerId, actionData);
        break;
        
      case 'use_item':
        await useItem(gameId, playerId, actionData);
        break;
        
      default:
        console.warn(`Unknown action type: ${actionType}`);
    }
  } catch (error) {
    console.error('Error processing player action:', error);
  }
}

// Process attack action
async function processAttack(gameId, playerId, attackData) {
  try {
    // Get attacker
    const attackerSnapshot = await gamesRef.child(`${gameId}/gameState/players/${playerId}`).once('value');
    const attacker = attackerSnapshot.val();
    
    if (!attacker || attacker.status !== 'alive') return;
    
    // Get target
    const targetId = attackData.targetId;
    const targetSnapshot = await gamesRef.child(`${gameId}/gameState/players/${targetId}`).once('value');
    const target = targetSnapshot.val();
    
    if (!target || target.status !== 'alive') return;
    
    // Calculate distance
    const distance = calculateDistance(attacker.position, target.position);
    const attackRange = 15; // Units for attack range
    
    if (distance <= attackRange) {
      // Calculate damage
      const baseDamage = 10;
      const damage = Math.floor(baseDamage * (1 + Math.random() * 0.5)); // 10-15 damage
      
      // Apply damage
      const newHealth = Math.max(0, target.health - damage);
      await gamesRef.child(`${gameId}/gameState/players/${targetId}/health`).set(newHealth);
      
      // Check if target is defeated
      if (newHealth === 0) {
        await gamesRef.child(`${gameId}/gameState/players/${targetId}/status`).set('defeated');
        
        // Award points to attacker
        const newScore = (attacker.score || 0) + 100;
        await gamesRef.child(`${gameId}/gameState/players/${playerId}/score`).set(newScore);
        
        // Add defeat event
        const event = {
          type: 'player_defeated',
          attackerId: playerId,
          targetId: targetId,
          timestamp: admin.database.ServerValue.TIMESTAMP
        };
        await gamesRef.child(`${gameId}/gameState/events`).push(event);
        
        // Check if game should end (only one player left)
        await checkGameEnd(gameId);
      } else {
        // Add attack event
        const event = {
          type: 'player_attacked',
          attackerId: playerId,
          targetId: targetId,
          damage: damage,
          timestamp: admin.database.ServerValue.TIMESTAMP
        };
        await gamesRef.child(`${gameId}/gameState/events`).push(event);
      }
    }
  } catch (error) {
    console.error('Error processing attack:', error);
  }
}

// Use item from inventory
async function useItem(gameId, playerId, itemData) {
  try {
    // Get player
    const playerSnapshot = await gamesRef.child(`${gameId}/gameState/players/${playerId}`).once('value');
    const player = playerSnapshot.val();
    
    if (!player || player.status !== 'alive') return;
    
    // Get inventory
    const inventory = player.inventory || [];
    const itemIndex = inventory.findIndex(item => item.id === itemData.itemId);
    
    if (itemIndex === -1) return; // Item not found
    
    const item = inventory[itemIndex];
    
    // Apply item effect
    switch (item.type) {
      case 'health':
        const newHealth = Math.min(100, player.health + item.value);
        await gamesRef.child(`${gameId}/gameState/players/${playerId}/health`).set(newHealth);
        break;
        
      case 'shield':
        // Add shield effect
        await gamesRef.child(`${gameId}/gameState/players/${playerId}/shield`).set(item.value);
        break;
        
      case 'speed':
        // Add speed boost effect
        await gamesRef.child(`${gameId}/gameState/players/${playerId}/speedBoost`).set({
          value: item.value,
          expiresAt: Date.now() + (30 * 1000) // 30 seconds
        });
        break;
    }
    
    // Remove item from inventory
    inventory.splice(itemIndex, 1);
    await gamesRef.child(`${gameId}/gameState/players/${playerId}/inventory`).set(inventory);
    
    // Add event
    const event = {
      type: 'item_used',
      playerId: playerId,
      itemType: item.type,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };
    await gamesRef.child(`${gameId}/gameState/events`).push(event);
  } catch (error) {
    console.error('Error using item:', error);
  }
}

// Check if game should end
async function checkGameEnd(gameId) {
  try {
    // Get all players
    const playersSnapshot = await gamesRef.child(`${gameId}/gameState/players`).once('value');
    const players = playersSnapshot.val() || {};
    
    // Count alive players
    let alivePlayers = 0;
    let lastAlivePlayerId = null;
    
    Object.entries(players).forEach(([playerId, player]) => {
      if (player.status === 'alive') {
        alivePlayers++;
        lastAlivePlayerId = playerId;
      }
    });
    
    // If only one player left, end the game
    if (alivePlayers <= 1) {
      await endGame(gameId);
    }
  } catch (error) {
    console.error('Error checking game end:', error);
  }
}

// Store bot intervals to clear them when games end
const botIntervals = {};

// Cleanup function to stop bot intervals when server shuts down
process.on('SIGINT', () => {
  Object.values(botIntervals).forEach(interval => clearInterval(interval));
  process.exit(0);
});

// Listen for game updates to manage bots
gamesRef.on('child_changed', async (snapshot) => {
  const gameData = snapshot.val();
  const gameId = snapshot.key;
  
  if (!gameData) return;
  
  // If a player left and the game is in progress, replace with a bot
  if (gameData.status === 'playing') {
    const playerCount = Object.keys(gameData.players || {}).length;
    if (playerCount < 20) {
      await checkAndAddBots(gameId);
    }
  }
  
  // If game ended, clear the bot interval
  if (gameData.status === 'ended' && botIntervals[gameId]) {
    clearInterval(botIntervals[gameId]);
    delete botIntervals[gameId];
  }
});

// Add the startBotAI function
function startBotAI(gameId) {
  // Set interval for bot moves
  const botInterval = setInterval(async () => {
    try {
      // Check if game still exists and is in playing state
      const gameSnapshot = await gamesRef.child(gameId).once('value');
      const gameData = gameSnapshot.val();
      
      if (!gameData || gameData.status !== 'playing') {
        clearInterval(botInterval);
        return;
      }
      
      // Make moves for each bot
      const players = gameData.players || {};
      
      for (const playerId in players) {
        const player = players[playerId];
        if (player.isBot) {
          const botMove = generateBotMove(gameData, playerId);
          
          if (botMove) {
            // Update game state with bot move
            await gamesRef.child(`${gameId}/lastMove`).set({
              playerId,
              ...botMove,
              timestamp: admin.database.ServerValue.TIMESTAMP
            });
            
            // Process the move based on its type
            if (botMove.type === 'position') {
              // Update bot position
              await gamesRef.child(`${gameId}/gameState/players/${playerId}/position`).set(botMove.position);
              
              // Check for item pickups
              await checkItemPickups(gameId, playerId, botMove.position);
              
              // Check for player interactions
              await checkPlayerInteractions(gameId, playerId, botMove.position);
            } else if (botMove.type === 'action') {
              // Process bot action
              await processPlayerAction(gameId, playerId, botMove.actionType, botMove.actionData);
            }
            
            // Add a small delay between bot moves to make it more natural
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
    } catch (error) {
      console.error('Error in bot AI loop:', error);
    }
  }, 3000); // Bot makes a move every 3 seconds
  
  // Store the interval ID in a map to clear it if needed
  botIntervals[gameId] = botInterval;
}

// Start the server
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 