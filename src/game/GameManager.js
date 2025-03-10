import * as THREE from 'three';
import { Player } from './Player.js';
import { Pickup } from './Pickup.js';
import { SafeZone } from './SafeZone.js';
import { Weapon } from './Weapon.js';

class GameManager {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    
    // Game state
    this.isGameRunning = false;
    this.players = [];
    this.pickups = [];
    this.localPlayer = null;
    this.safeZone = null;
    
    // Game settings
    this.maxPlayers = 1; // For now, just the local player
    this.pickupCount = 50;
    this.safeZoneSettings = {
      initialRadius: 150,
      finalRadius: 20,
      shrinkDuration: 360, // 6 minutes (increased from 3 minutes)
      shrinkDelay: 180 // 3 minutes before shrinking starts (increased from 1 minute)
    };
    
    // Bind methods
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    
    // Create UI
    this.createUI();
  }
  
  createUI() {
    // Create UI container
    const gameUI = document.createElement('div');
    gameUI.id = 'game-ui';
    gameUI.style.position = 'absolute';
    gameUI.style.top = '0';
    gameUI.style.left = '0';
    gameUI.style.width = '100%';
    gameUI.style.height = '100%';
    gameUI.style.pointerEvents = 'none';
    gameUI.style.fontFamily = 'monospace';
    
    // FPS counter
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps';
    fpsCounter.style.position = 'absolute';
    fpsCounter.style.top = '10px';
    fpsCounter.style.right = '10px';
    fpsCounter.style.color = '#00ffff';
    fpsCounter.style.fontSize = '14px';
    fpsCounter.style.textShadow = '0 0 5px #00ffff';
    fpsCounter.textContent = 'FPS: 0';
    
    // Position display
    const positionDisplay = document.createElement('div');
    positionDisplay.id = 'position';
    positionDisplay.style.position = 'absolute';
    positionDisplay.style.top = '30px';
    positionDisplay.style.right = '10px';
    positionDisplay.style.color = '#00ffff';
    positionDisplay.style.fontSize = '14px';
    positionDisplay.style.textShadow = '0 0 5px #00ffff';
    positionDisplay.textContent = 'POS: 0, 0, 0';
    
    // Add elements to UI
    gameUI.appendChild(fpsCounter);
    gameUI.appendChild(positionDisplay);
    
    // Add minimap
    this.initMiniMap(gameUI);
    
    // Add UI to document
    document.body.appendChild(gameUI);
    
    // Add pointer lock message
    const pointerLockMessage = document.createElement('div');
    pointerLockMessage.id = 'pointer-lock-message';
    pointerLockMessage.style.position = 'absolute';
    pointerLockMessage.style.top = '50%';
    pointerLockMessage.style.left = '50%';
    pointerLockMessage.style.transform = 'translate(-50%, -50%)';
    pointerLockMessage.style.color = '#00ffff';
    pointerLockMessage.style.fontSize = '18px';
    pointerLockMessage.style.textShadow = '0 0 5px #00ffff';
    pointerLockMessage.style.textAlign = 'center';
    pointerLockMessage.style.display = 'none';
    pointerLockMessage.innerHTML = 'Click to enable mouse look<br>(Press ESC to exit)';
    document.body.appendChild(pointerLockMessage);
  }
  
  // Initialize mini-map
  initMiniMap(gameUI) {
    this.miniMapCanvas = document.createElement('canvas');
    this.miniMapCanvas.id = 'mini-map';
    this.miniMapCanvas.width = 200;
    this.miniMapCanvas.height = 200;
    this.miniMapCanvas.style.width = '100%';
    this.miniMapCanvas.style.height = '100%';
    
    const miniMapContainer = document.createElement('div');
    miniMapContainer.id = 'mini-map-container';
    miniMapContainer.style.position = 'absolute';
    miniMapContainer.style.top = '20px';
    miniMapContainer.style.right = '20px';
    miniMapContainer.style.width = '200px';
    miniMapContainer.style.height = '200px';
    miniMapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    miniMapContainer.style.border = '2px solid #00ffff';
    miniMapContainer.style.borderRadius = '5px';
    miniMapContainer.style.overflow = 'hidden';
    miniMapContainer.style.pointerEvents = 'none';
    
    miniMapContainer.appendChild(this.miniMapCanvas);
    
    // Crosshair
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '10px';
    crosshair.style.height = '10px';
    crosshair.style.border = '2px solid #00ffff';
    crosshair.style.borderRadius = '50%';
    crosshair.style.boxShadow = '0 0 5px #00ffff';
    
    // Add all elements to the UI
    gameUI.appendChild(miniMapContainer);
    gameUI.appendChild(crosshair);
    
    // Initialize mini-map
    this.miniMapContext = this.miniMapCanvas.getContext('2d');
    this.miniMapScale = 0.5;
  }
  
  // Update mini-map
  updateMiniMap() {
    if (!this.miniMapContext || !this.localPlayer || !this.safeZone) return;
    
    const ctx = this.miniMapContext;
    const canvas = this.miniMapCanvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000022';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate center of mini-map (player position)
    const playerPos = this.localPlayer.camera.position;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw grid lines
    ctx.strokeStyle = '#333366';
    ctx.lineWidth = 0.5;
    
    // Draw grid
    const gridSize = 20;
    const gridOffset = {
      x: (playerPos.x % gridSize) * this.miniMapScale,
      z: (playerPos.z % gridSize) * this.miniMapScale
    };
    
    // Vertical grid lines
    for (let x = -centerX; x <= centerX; x += gridSize * this.miniMapScale) {
      ctx.beginPath();
      ctx.moveTo(centerX + x - gridOffset.x, 0);
      ctx.lineTo(centerX + x - gridOffset.x, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = -centerY; y <= centerY; y += gridSize * this.miniMapScale) {
      ctx.beginPath();
      ctx.moveTo(0, centerY + y - gridOffset.z);
      ctx.lineTo(width, centerY + y - gridOffset.z);
      ctx.stroke();
    }
    
    // Draw buildings
    if (this.scene) {
      ctx.fillStyle = '#555555';
      
      // Find all buildings in the scene
      this.scene.traverse((object) => {
        if (object.userData && object.userData.isBuilding) {
          // Calculate building position relative to player
          const relX = (object.position.x - playerPos.x) * this.miniMapScale + centerX;
          const relZ = (object.position.z - playerPos.z) * this.miniMapScale + centerY;
          
          // Get building dimensions
          const width = object.geometry.parameters.width * this.miniMapScale;
          const depth = object.geometry.parameters.depth * this.miniMapScale;
          
          // Draw building
          ctx.fillRect(relX - width / 2, relZ - depth / 2, width, depth);
        }
      });
    }
    
    // Draw safe zone (current)
    if (this.safeZone) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const safeZoneX = (this.safeZone.centerPoint.x - playerPos.x) * this.miniMapScale + centerX;
      const safeZoneZ = (this.safeZone.centerPoint.z - playerPos.z) * this.miniMapScale + centerY;
      const safeZoneRadius = this.safeZone.currentRadius * this.miniMapScale;
      ctx.arc(safeZoneX, safeZoneZ, safeZoneRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw final safe zone (if shrinking)
      if (this.safeZone.isShrinking) {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const finalRadius = this.safeZone.finalRadius * this.miniMapScale;
        ctx.arc(safeZoneX, safeZoneZ, finalRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Draw player (center)
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction
    const dirLength = 8;
    const dirX = centerX + Math.sin(this.localPlayer.model.rotation.y) * dirLength;
    const dirY = centerY + Math.cos(this.localPlayer.model.rotation.y) * dirLength;
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(dirX, dirY);
    ctx.stroke();
    
    // Draw pickups
    ctx.fillStyle = '#ffff00';
    for (const pickup of this.pickups) {
      if (!pickup.isCollected) {
        const pickupX = (pickup.position.x - playerPos.x) * this.miniMapScale + centerX;
        const pickupZ = (pickup.position.z - playerPos.z) * this.miniMapScale + centerY;
        
        // Only draw if within mini-map bounds
        if (pickupX >= 0 && pickupX <= width && pickupZ >= 0 && pickupZ <= height) {
          ctx.beginPath();
          ctx.arc(pickupX, pickupZ, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  startGame() {
    if (this.isGameRunning) return;
    
    this.isGameRunning = true;
    
    // Create local player if not already created
    if (!this.localPlayer) {
      this.localPlayer = new Player(this.scene, this.camera, this.controls);
      this.players.push(this.localPlayer);
    }
    
    // Create safe zone
    if (!this.safeZone) {
      this.safeZone = new SafeZone(
        this.scene,
        this.safeZoneSettings.initialRadius,
        this.safeZoneSettings.finalRadius,
        this.safeZoneSettings.shrinkDuration,
        this.safeZoneSettings.shrinkDelay
      );
    }
    
    // Generate pickups
    this.generatePickups();
    
    // Add event listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('mousedown', this.onMouseDown);
    
    console.log('Game started');
  }
  
  generatePickups() {
    // Define the boundaries for pickup spawning
    const minPosition = new THREE.Vector3(-150, 0.5, -150);
    const maxPosition = new THREE.Vector3(150, 0.5, 150);
    
    // Generate random pickups
    this.pickups = Pickup.generateRandomPickups(
      this.pickupCount,
      this.scene,
      minPosition,
      maxPosition
    );
  }
  
  update(deltaTime) {
    // Skip if game is not running
    if (!this.isGameRunning) return;
    
    // Update safe zone
    if (this.safeZone) {
      this.safeZone.update(deltaTime);
      
      // Check if local player is outside safe zone
      if (this.localPlayer) {
        const distance = this.safeZone.getDistanceFromCenter(this.localPlayer.position);
        
        if (distance > this.safeZone.radius) {
          // Apply damage to player outside safe zone
          this.localPlayer.takeDamage(deltaTime * 5); // 5 damage per second
        }
      }
    }
    
    // Update players
    this.players.forEach(player => {
      player.update(deltaTime);
    });
    
    // Check pickup collisions
    this.checkPickupCollisions();
    
    // Update UI
    this.updateUI();
  }
  
  checkPickupCollisions() {
    if (!this.localPlayer) return;
    
    const playerPosition = this.localPlayer.camera.position.clone();
    playerPosition.y -= 1.6; // Adjust to player's feet position
    
    for (const pickup of this.pickups) {
      if (pickup.checkCollision(playerPosition)) {
        const pickupData = pickup.collect();
        
        if (pickupData) {
          this.handlePickup(pickupData);
        }
      }
    }
  }
  
  handlePickup(pickupData) {
    if (!this.localPlayer) return;
    
    const { type, value } = pickupData;
    
    if (type.startsWith('weapon_')) {
      // Weapon pickup
      this.localPlayer.pickupWeapon(value);
    } else if (type.startsWith('ammo_')) {
      // Ammo pickup
      const ammoType = type.split('_')[1];
      this.localPlayer.addAmmo(ammoType, value);
    } else if (type === 'health') {
      // Health pickup
      this.localPlayer.heal(value);
    } else if (type === 'shield') {
      // Shield pickup
      this.localPlayer.addShield(value);
    }
  }
  
  onKeyDown(event) {
    if (!this.isGameRunning || !this.localPlayer) return;
    
    // Weapon switching
    if (event.key === '1' || event.key === '2' || event.key === '3') {
      const weaponIndex = parseInt(event.key) - 1;
      if (this.localPlayer.weapons[weaponIndex]) {
        this.localPlayer.currentWeaponIndex = weaponIndex;
        this.localPlayer.updateWeaponUI();
        this.localPlayer.updateAmmoUI();
      }
    }
    
    // Weapon cycling
    if (event.key === 'q') {
      this.localPlayer.switchWeapon(-1);
    } else if (event.key === 'e') {
      this.localPlayer.switchWeapon(1);
    }
  }
  
  onMouseDown(event) {
    if (!this.isGameRunning || !this.localPlayer) return;
    
    // Only handle left mouse button
    if (event.button === 0) {
      this.localPlayer.shoot();
    }
  }
  
  endGame() {
    this.isGameRunning = false;
    
    // Remove event listeners
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('mousedown', this.onMouseDown);
    
    // Show game over screen if player died
    if (this.localPlayer && !this.localPlayer.alive) {
      // Already handled by Player class
    } else {
      // Show victory screen
      this.showVictoryScreen();
    }
  }
  
  showVictoryScreen() {
    // Create a simple victory screen
    const victoryDiv = document.createElement('div');
    victoryDiv.id = 'victory';
    victoryDiv.style.position = 'fixed';
    victoryDiv.style.top = '0';
    victoryDiv.style.left = '0';
    victoryDiv.style.width = '100%';
    victoryDiv.style.height = '100%';
    victoryDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    victoryDiv.style.color = '#00ffff';
    victoryDiv.style.display = 'flex';
    victoryDiv.style.flexDirection = 'column';
    victoryDiv.style.justifyContent = 'center';
    victoryDiv.style.alignItems = 'center';
    victoryDiv.style.zIndex = '1000';
    victoryDiv.style.fontFamily = 'monospace';
    
    const victoryTitle = document.createElement('h1');
    victoryTitle.textContent = 'VICTORY ROYALE';
    victoryTitle.style.fontSize = '4rem';
    victoryTitle.style.marginBottom = '2rem';
    victoryTitle.style.textShadow = '0 0 10px #00ffff';
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'PLAY AGAIN';
    restartButton.style.padding = '1rem 2rem';
    restartButton.style.fontSize = '1.5rem';
    restartButton.style.backgroundColor = '#00ffff';
    restartButton.style.color = '#000000';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.fontFamily = 'monospace';
    
    restartButton.addEventListener('click', () => {
      // Reload the page to restart the game
      window.location.reload();
    });
    
    victoryDiv.appendChild(victoryTitle);
    victoryDiv.appendChild(restartButton);
    
    document.body.appendChild(victoryDiv);
  }
  
  // Create a remote player (for multiplayer)
  createRemotePlayer(id, name, position, isBot = false) {
    // Create a new player instance
    const player = new Player(this.scene, null, null, id);
    
    // Set player properties
    player.name = name || `Player_${id.substring(0, 5)}`;
    player.isBot = isBot;
    player.isRemote = true;
    
    // Set player position
    if (position) {
      player.position.set(position.x, position.y, position.z);
    }
    
    // Add player to the list
    this.players.push(player);
    
    console.log(`Remote player created: ${player.name} (${id})`);
    return player;
  }
  
  // Remove a player from the game
  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex !== -1) {
      const player = this.players[playerIndex];
      
      // Remove player from scene
      player.remove();
      
      // Remove from players array
      this.players.splice(playerIndex, 1);
      
      console.log(`Player removed: ${player.name} (${playerId})`);
    }
  }
  
  // Update the safe zone based on server data
  updateSafeZone(safeZoneData) {
    if (!this.safeZone) return;
    
    if (safeZoneData.radius) {
      this.safeZone.setRadius(safeZoneData.radius);
    }
    
    if (safeZoneData.center) {
      this.safeZone.setCenter(
        new THREE.Vector3(
          safeZoneData.center.x,
          safeZoneData.center.y,
          safeZoneData.center.z
        )
      );
    }
    
    if (safeZoneData.shrinking !== undefined) {
      this.safeZone.setShrinking(safeZoneData.shrinking);
    }
  }
  
  // Update items/pickups based on server data
  updateItems(itemsData) {
    if (!itemsData || !Array.isArray(itemsData)) return;
    
    // Remove existing pickups that aren't in the new data
    const newItemIds = itemsData.map(item => item.id);
    this.pickups = this.pickups.filter(pickup => {
      if (!newItemIds.includes(pickup.id)) {
        pickup.remove();
        return false;
      }
      return true;
    });
    
    // Add or update pickups
    itemsData.forEach(itemData => {
      // Check if pickup already exists
      let pickup = this.pickups.find(p => p.id === itemData.id);
      
      if (pickup) {
        // Update existing pickup
        if (itemData.position) {
          pickup.position.set(
            itemData.position.x,
            itemData.position.y,
            itemData.position.z
          );
        }
      } else {
        // Create new pickup
        pickup = new Pickup(
          this.scene,
          itemData.type || 'health',
          new THREE.Vector3(
            itemData.position.x,
            itemData.position.y,
            itemData.position.z
          ),
          itemData.id
        );
        
        this.pickups.push(pickup);
      }
    });
  }
  
  // Handle remote player attack
  handleRemoteAttack(playerId, attackData) {
    const player = this.players.find(p => p.id === playerId);
    
    if (!player) return;
    
    // Play attack animation
    player.attack();
    
    // Check if local player was hit
    if (attackData.targetId === this.localPlayer?.id) {
      this.localPlayer.takeDamage(attackData.damage || 10);
    }
  }
  
  // Handle remote player item use
  handleRemoteItemUse(playerId, itemData) {
    const player = this.players.find(p => p.id === playerId);
    
    if (!player) return;
    
    // Handle different item types
    if (itemData.type === 'health') {
      player.heal(itemData.amount || 25);
    } else if (itemData.type === 'shield') {
      player.addShield(itemData.amount || 25);
    } else if (itemData.type === 'weapon') {
      player.equipWeapon(itemData.weaponType || 'pistol');
    }
  }
  
  updateUI() {
    // Implementation of updateUI method
  }
}

export { GameManager }; 