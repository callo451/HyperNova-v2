// This is an example of how to integrate the multiplayer system with your game

// Import the multiplayer UI
import { updatePlayersList, updateGameStatus } from './multiplayer-ui.js';

// Import game integration functions
import { 
  updatePlayerPosition, 
  sendPlayerAction, 
  isInMultiplayerMode 
} from './game-integration.js';

// Example game class (replace with your actual game implementation)
class Game {
  constructor() {
    this.players = {};
    this.localPlayer = null;
    this.isMultiplayer = false;
    this.gameStatus = 'idle';
    this.currentRound = 0;
    
    // Initialize game components
    this.initializeGame();
  }
  
  // Initialize the game
  initializeGame() {
    console.log('Game initialized');
    
    // Note: Multiplayer UI is now initialized in the main menu
    // and doesn't need to be initialized here
    
    // Set up game loop
    this.gameLoop();
  }
  
  // Game loop
  gameLoop() {
    // Update game state
    this.update();
    
    // Render game
    this.render();
    
    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }
  
  // Update game state
  update() {
    // Handle player input
    this.handleInput();
    
    // Update game physics, AI, etc.
    // ...
  }
  
  // Render game
  render() {
    // Render game world, players, etc.
    // ...
  }
  
  // Handle player input
  handleInput() {
    // Example: detect keyboard input for player movement
    const keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false
    };
    
    // Check if keys are pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'w') keys.w = true;
      if (e.key === 'a') keys.a = true;
      if (e.key === 's') keys.s = true;
      if (e.key === 'd') keys.d = true;
      if (e.key === ' ') keys.space = true;
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'w') keys.w = false;
      if (e.key === 'a') keys.a = false;
      if (e.key === 's') keys.s = false;
      if (e.key === 'd') keys.d = false;
      if (e.key === ' ') keys.space = false;
    });
    
    // Process movement
    if (this.localPlayer) {
      let moved = false;
      
      if (keys.w) {
        this.localPlayer.position.z -= this.localPlayer.speed;
        moved = true;
      }
      if (keys.s) {
        this.localPlayer.position.z += this.localPlayer.speed;
        moved = true;
      }
      if (keys.a) {
        this.localPlayer.position.x -= this.localPlayer.speed;
        moved = true;
      }
      if (keys.d) {
        this.localPlayer.position.x += this.localPlayer.speed;
        moved = true;
      }
      
      // If in multiplayer mode and player moved, send position update
      if (isInMultiplayerMode() && moved) {
        updatePlayerPosition(this.localPlayer.position);
      }
      
      // Process actions (e.g., attack)
      if (keys.space) {
        this.playerAttack();
      }
    }
  }
  
  // Player attack
  playerAttack() {
    // Find closest player to attack
    const target = this.findClosestPlayer();
    
    if (target) {
      // Local game logic for attack
      console.log(`Attacking player: ${target.id}`);
      
      // If in multiplayer mode, send attack action
      if (isInMultiplayerMode()) {
        sendPlayerAction('attack', { targetId: target.id });
      }
    }
  }
  
  // Find closest player to attack
  findClosestPlayer() {
    if (!this.localPlayer) return null;
    
    let closestPlayer = null;
    let closestDistance = Infinity;
    
    Object.values(this.players).forEach(player => {
      // Skip self
      if (player.id === this.localPlayer.id) return;
      
      // Skip defeated players
      if (player.status === 'defeated') return;
      
      const distance = this.calculateDistance(
        this.localPlayer.position,
        player.position
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = player;
      }
    });
    
    // Only return if within attack range
    return closestDistance <= 15 ? closestPlayer : null;
  }
  
  // Calculate distance between positions
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = (pos1.y || 0) - (pos2.y || 0);
    const dz = pos1.z - pos2.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  // Methods called by the multiplayer system
  
  // Update player position in the game
  updatePlayerPosition(playerId, position) {
    if (this.players[playerId]) {
      this.players[playerId].position = position;
    }
  }
  
  // Set game status
  setGameStatus(status) {
    this.gameStatus = status;
    
    // Update UI
    updateGameStatus(status, this.currentRound);
  }
  
  // Update round number
  updateRound(round) {
    this.currentRound = round;
    
    // Update UI
    updateGameStatus(this.gameStatus, round);
  }
  
  // Process action from another player
  processAction(playerId, actionType, actionData) {
    if (actionType === 'attack' && this.players[playerId] && this.players[actionData.targetId]) {
      // Visual effect for attack
      console.log(`Player ${playerId} attacked ${actionData.targetId}`);
      
      // Play attack animation or sound
      // ...
    }
  }
}

// Create and export game instance
const game = new Game();
export default game; 