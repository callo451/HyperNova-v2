import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Inventory } from './inventory/Inventory.js';
import { WEAPON_PRESETS } from './weapons/Weapon.js';

class FPSControls {
  constructor(camera, domElement, collisionSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.collisionSystem = collisionSystem;
    
    // Create pointer lock controls with constrained angles
    this.pointerControls = new PointerLockControls(camera, domElement);
    this.pointerControls.minPolarAngle = Math.PI / 4; // 45 degrees up
    this.pointerControls.maxPolarAngle = (3 * Math.PI) / 4; // 135 degrees down
    
    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = true;
    
    // Physics
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.playerHeight = 1.8;
    this.gravity = 30;
    this.jumpVelocity = 10;
    this.movementSpeed = 10;
    
    // Parachute properties
    this.isParachuting = false;
    this.parachuteModel = null;
    this.parachuteDeployHeight = 15; // Height at which parachute automatically deploys
    this.parachuteGravity = 5; // Reduced gravity when parachuting
    this.parachuteTerminalVelocity = -3; // Maximum falling speed with parachute
    
    // Collision detection
    this.playerRadius = 0.5;
    
    // Inventory system
    this.inventory = new Inventory();
    
    // Player stats
    this.health = 100;
    this.maxHealth = 100;
    this.shield = 0;
    this.maxShield = 100;
    
    // Create health and shield UI
    this.createHealthUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Enabled flag
    this.enabled = false;
    
    // Give player starting weapon
    this.inventory.addWeapon(WEAPON_PRESETS.PISTOL);
  }
  
  createHealthUI() {
    // Create container
    const container = document.createElement('div');
    container.id = 'health-shield-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 250px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 100;
      background: rgba(20, 20, 40, 0.7);
      border: 1px solid rgba(0, 200, 255, 0.5);
      border-radius: 5px;
      padding: 10px;
      box-shadow: 0 0 15px rgba(0, 200, 255, 0.3);
    `;
    
    // Create shield bar
    const shieldLabel = document.createElement('div');
    shieldLabel.textContent = 'SHIELD';
    shieldLabel.style.cssText = `
      color: #00AAFF;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 5px #00AAFF;
      margin-bottom: 2px;
      letter-spacing: 1px;
    `;
    
    const shieldBarContainer = document.createElement('div');
    shieldBarContainer.style.cssText = `
      width: 100%;
      height: 18px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #00AAFF;
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    `;
    
    this.shieldBar = document.createElement('div');
    this.shieldBar.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(to right, #0088FF, #00CCFF);
      transition: width 0.3s ease;
      position: relative;
    `;
    
    // Add shield value text
    this.shieldValue = document.createElement('div');
    this.shieldValue.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      text-shadow: 0 0 3px black;
      z-index: 2;
    `;
    this.shieldValue.textContent = '0';
    
    // Add shield pattern overlay
    const shieldPattern = document.createElement('div');
    shieldPattern.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 5px,
        rgba(0, 200, 255, 0.1) 5px,
        rgba(0, 200, 255, 0.1) 10px
      );
      z-index: 1;
    `;
    
    // Create health bar
    const healthLabel = document.createElement('div');
    healthLabel.textContent = 'HEALTH';
    healthLabel.style.cssText = `
      color: #FF3333;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 5px #FF3333;
      margin-bottom: 2px;
      margin-top: 5px;
      letter-spacing: 1px;
    `;
    
    const healthBarContainer = document.createElement('div');
    healthBarContainer.style.cssText = `
      width: 100%;
      height: 18px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #FF3333;
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    `;
    
    this.healthBar = document.createElement('div');
    this.healthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(to right, #FF0000, #FF5555);
      transition: width 0.3s ease;
    `;
    
    // Add health value text
    this.healthValue = document.createElement('div');
    this.healthValue.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      text-shadow: 0 0 3px black;
    `;
    this.healthValue.textContent = '100';
    
    // Add scan line effect
    const scanLines = document.createElement('div');
    scanLines.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: linear-gradient(
        transparent 0%, 
        rgba(0, 0, 0, 0.1) 50%, 
        transparent 51%, 
        rgba(0, 0, 0, 0.1) 100%
      );
      background-size: 100% 4px;
      pointer-events: none;
      z-index: 2;
      opacity: 0.3;
    `;
    
    // Assemble the UI
    shieldBarContainer.appendChild(this.shieldBar);
    shieldBarContainer.appendChild(shieldPattern);
    shieldBarContainer.appendChild(this.shieldValue);
    
    healthBarContainer.appendChild(this.healthBar);
    healthBarContainer.appendChild(this.healthValue);
    
    container.appendChild(shieldLabel);
    container.appendChild(shieldBarContainer);
    container.appendChild(healthLabel);
    container.appendChild(healthBarContainer);
    container.appendChild(scanLines);
    
    // Add to document
    document.body.appendChild(container);
    
    // Update UI
    this.updateHealthUI();
  }
  
  updateHealthUI() {
    if (!this.healthBar || !this.shieldBar) return;
    
    // Update health bar
    const healthPercent = (this.health / this.maxHealth) * 100;
    this.healthBar.style.width = `${healthPercent}%`;
    this.healthValue.textContent = Math.round(this.health);
    
    // Update shield bar
    const shieldPercent = (this.shield / this.maxShield) * 100;
    this.shieldBar.style.width = `${shieldPercent}%`;
    this.shieldValue.textContent = Math.round(this.shield);
    
    // Add pulse effect to low health
    if (healthPercent < 30) {
      this.healthBar.style.animation = 'pulse 1.5s infinite';
      if (!this.healthBar.style.animationName) {
        // Add the animation if it doesn't exist
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.healthBar.style.animation = 'none';
    }
  }
  
  takeDamage(amount) {
    // First absorb damage with shield
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }
    
    // Apply remaining damage to health
    if (amount > 0) {
      this.health = Math.max(0, this.health - amount);
    }
    
    // Update UI
    this.updateHealthUI();
    
    // Check if player is dead
    if (this.health <= 0) {
      // Handle player death
      console.log('Player died!');
    }
  }
  
  // New method for storm damage that bypasses shields
  takeStormDamage(amount) {
    // Apply damage directly to health, bypassing shields
    this.health = Math.max(0, this.health - amount);
    
    // Update UI
    this.updateHealthUI();
    
    // Check if player is dead
    if (this.health <= 0) {
      // Handle player death
      console.log('Player died from the storm!');
    }
  }
  
  addShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    this.updateHealthUI();
    
    // Show shield pickup message
    this.showMessage(`Shield +${amount}`);
  }
  
  showMessage(text) {
    // Create or update message element
    if (!this.messageElement) {
      this.messageElement = document.createElement('div');
      this.messageElement.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #0af;
        font-family: monospace;
        font-size: 24px;
        text-shadow: 0 0 5px #0af;
        z-index: 100;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(this.messageElement);
    }
    
    // Show message
    this.messageElement.textContent = text;
    this.messageElement.style.opacity = '1';
    
    // Hide after delay
    clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.messageElement.style.opacity = '0';
    }, 2000);
  }
  
  setupEventListeners() {
    // Keyboard controls
    const onKeyDown = (event) => {
      if (!this.enabled) return;
      
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveBackward = false;
          this.moveForward = true;
          break;
          
        case 'ArrowLeft':
        case 'KeyA':
          this.moveRight = false;
          this.moveLeft = true;
          break;
          
        case 'ArrowDown':
        case 'KeyS':
          this.moveForward = false;
          this.moveBackward = true;
          break;
          
        case 'ArrowRight':
        case 'KeyD':
          this.moveLeft = false;
          this.moveRight = true;
          break;
          
        case 'Space':
          if (this.canJump) {
            this.velocity.y = this.jumpVelocity;
            this.canJump = false;
          }
          break;
          
        case 'KeyE':
          // Interact with chest
          if (this.nearestChest) {
            const loot = this.nearestChest.open();
            if (loot && loot.weapon) {
              this.inventory.addWeapon(loot.weapon);
            }
          }
          break;
          
        case 'KeyR':
          // Reload current weapon
          const weapon = this.inventory.getCurrentWeapon();
          if (weapon) {
            weapon.reload();
          }
          break;
          
        case 'Digit1':
          this.inventory.switchWeapon(0);
          break;
          
        case 'Digit2':
          this.inventory.switchWeapon(1);
          break;
          
        case 'Digit3':
          this.inventory.switchWeapon(2);
          break;
      }
    };
    
    const onKeyUp = (event) => {
      if (!this.enabled) return;
      
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
          
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
          
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
          
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
      }
    };
    
    // Mouse controls
    const onMouseDown = (event) => {
      if (!this.enabled || !this.pointerControls.isLocked) return;
      
      if (event.button === 0) { // Left click
        const weapon = this.inventory.getCurrentWeapon();
        if (weapon) {
          weapon.fire(this.camera, this.scene);
          this.inventory.updateUI();
        }
      }
    };
    
    // Mouse wheel for weapon switching
    const onWheel = (event) => {
      if (!this.enabled) return;
      
      if (event.deltaY < 0) {
        this.inventory.previousWeapon();
      } else {
        this.inventory.nextWeapon();
      }
    };
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('wheel', onWheel);
    
    // Lock/unlock pointer
    this.pointerControls.addEventListener('lock', () => {
      console.log('Controls locked - mouse look enabled');
      if (document.getElementById('pointer-lock-message')) {
        document.getElementById('pointer-lock-message').style.display = 'none';
      }
    });
    
    this.pointerControls.addEventListener('unlock', () => {
      console.log('Controls unlocked - mouse look disabled');
      if (this.enabled && document.getElementById('pointer-lock-message')) {
        document.getElementById('pointer-lock-message').style.display = 'block';
      }
    });
    
    // Add click event to canvas to request pointer lock
    this.domElement.addEventListener('click', () => {
      if (this.enabled && !this.pointerControls.isLocked) {
        this.pointerControls.lock();
      }
    });
  }
  
  lock() {
    console.log('Attempting to lock pointer');
    if (this.enabled) {
      this.pointerControls.lock();
    }
  }
  
  unlock() {
    this.pointerControls.unlock();
  }
  
  update(delta) {
    if (!this.enabled) return;
    
    // Update current weapon
    const weapon = this.inventory.getCurrentWeapon();
    if (weapon) {
      weapon.update(delta);
    }
    
    // Calculate frame delta time
    const frameDelta = Math.min(0.1, performance.now() / 1000 - (this._prevTime || 0));
    this._prevTime = performance.now() / 1000;
    
    // Store original position for reference
    const originalPosition = this.camera.position.clone();
    
    // Gravity is now applied in handleVerticalMovement
    
    // Calculate movement direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();
    
    // Apply movement based on camera direction
    if (this.moveForward || this.moveBackward) {
      this.velocity.z = this.direction.z * this.movementSpeed;
    } else {
      this.velocity.z = 0;
    }
    
    if (this.moveLeft || this.moveRight) {
      this.velocity.x = this.direction.x * this.movementSpeed;
    } else {
      this.velocity.x = 0;
    }
    
    // Calculate movement deltas
    const deltaX = this.velocity.x * frameDelta;
    const deltaZ = this.velocity.z * frameDelta;
    
    // Handle horizontal movement (X and Z)
    if (deltaX !== 0 || deltaZ !== 0) {
      // Try to move in both directions
      const nextPosition = originalPosition.clone();
      nextPosition.x += deltaX;
      nextPosition.z += deltaZ;
      
      // Check for collisions
      if (!this.collisionSystem.checkCollision(nextPosition, this.playerRadius)) {
        // No collision, move freely
        this.pointerControls.moveRight(deltaX);
        this.pointerControls.moveForward(deltaZ);
      } else {
        // Try to slide along walls by checking X and Z separately
        if (deltaX !== 0) {
          const nextPositionX = originalPosition.clone();
          nextPositionX.x += deltaX;
          
          if (!this.collisionSystem.checkCollision(nextPositionX, this.playerRadius)) {
            this.pointerControls.moveRight(deltaX);
          }
        }
        
        if (deltaZ !== 0) {
          const nextPositionZ = originalPosition.clone();
          nextPositionZ.z += deltaZ;
          
          if (!this.collisionSystem.checkCollision(nextPositionZ, this.playerRadius)) {
            this.pointerControls.moveForward(deltaZ);
          }
        }
      }
    }
    
    // Handle vertical movement (Y) and ground detection
    this.handleVerticalMovement(frameDelta);
  }

  // New method to handle vertical movement and ground detection
  handleVerticalMovement(delta) {
    // Calculate vertical delta
    let deltaY = this.velocity.y * delta;
    
    // Cast a ray downward to find the ground
    const groundInfo = this.findGround();
    
    // Handle parachuting
    if (this.isParachuting) {
      // Create parachute model if it doesn't exist
      if (!this.parachuteModel) {
        this.createParachuteModel();
      }
      
      // Update parachute position
      this.updateParachutePosition();
      
      // Apply reduced gravity for parachuting
      this.velocity.y -= this.parachuteGravity * delta;
      
      // Limit falling speed (terminal velocity with parachute)
      if (this.velocity.y < this.parachuteTerminalVelocity) {
        this.velocity.y = this.parachuteTerminalVelocity;
      }
      
      // Recalculate deltaY with new velocity
      deltaY = this.velocity.y * delta;
    } else {
      // Normal gravity when not parachuting
      this.velocity.y -= this.gravity * delta;
    }
    
    if (groundInfo.found) {
      // We found ground below us
      const distanceToGround = groundInfo.distance;
      
      if (distanceToGround <= this.playerHeight && this.velocity.y <= 0) {
        // We're on or very close to the ground and moving downward
        
        // Stop falling
        this.velocity.y = 0;
        this.canJump = true;
        
        // Remove parachute if we've landed
        if (this.isParachuting) {
          this.removeParachute();
          this.isParachuting = false;
        }
        
        // Set exact height above ground
        const targetY = groundInfo.point.y + this.playerHeight;
        
        // Use very smooth interpolation for consistent experience
        this.camera.position.y = this.camera.position.y + (targetY - this.camera.position.y) * 0.2;
      } else {
        // We're above the ground, continue falling
        this.camera.position.y += deltaY;
        
        // Auto-deploy parachute at a certain height if we're falling
        if (!this.isParachuting && this.velocity.y < 0 && distanceToGround > this.parachuteDeployHeight) {
          this.isParachuting = true;
        }
      }
    } else {
      // No ground found, apply vertical movement with collision check
      const nextPositionY = this.camera.position.clone();
      nextPositionY.y += deltaY;
      
      if (!this.collisionSystem.checkCollision(nextPositionY, this.playerRadius)) {
        // No collision, move freely
        this.camera.position.y += deltaY;
      } else if (this.velocity.y > 0) {
        // We hit the ceiling
        this.velocity.y = 0;
      }
      
      // Safety check: if we're below the minimum height, reset position
      if (this.camera.position.y < 0.1) {
        this.camera.position.y = 1.8; // Reset to player height
        this.velocity.y = 0;
        
        // Remove parachute if we've landed
        if (this.isParachuting) {
          this.removeParachute();
          this.isParachuting = false;
        }
      }
    }
  }

  // Find the ground beneath the player
  findGround() {
    const raycaster = new THREE.Raycaster();
    const position = this.camera.position.clone();
    const direction = new THREE.Vector3(0, -1, 0);
    
    // Set maximum ray distance
    const maxDistance = 20;
    
    raycaster.set(position, direction);
    
    // Get all collidable objects
    const collidableObjects = this.collisionSystem.collidableObjects;
    
    // Perform the raycast
    const intersects = raycaster.intersectObjects(collidableObjects, true);
    
    // Filter out any non-ground objects (like road markings)
    const groundIntersects = intersects.filter(intersect => {
      const obj = intersect.object;
      return !(obj.userData && obj.userData.isRoadMarking);
    });
    
    if (groundIntersects.length > 0) {
      const closest = groundIntersects[0];
      return {
        found: true,
        point: closest.point,
        distance: closest.distance,
        object: closest.object
      };
    }
    
    return { found: false };
  }

  // Create a parachute model
  createParachuteModel() {
    // Get the scene from the camera
    const scene = this.camera.parent;
    if (!scene) return;
    
    // Create parachute group
    this.parachuteModel = new THREE.Group();
    
    // Create parachute canopy
    const canopyGeometry = new THREE.SphereGeometry(2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyMaterial = new THREE.MeshBasicMaterial({
      color: 0x00AAFF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.y = 2;
    this.parachuteModel.add(canopy);
    
    // Create strings
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
    const stringCount = 8;
    
    for (let i = 0; i < stringCount; i++) {
      const angle = (i / stringCount) * Math.PI * 2;
      const x = Math.cos(angle) * 1.8;
      const z = Math.sin(angle) * 1.8;
      
      const stringGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 2, z), // Top point (at canopy edge)
        new THREE.Vector3(0, 0, 0)  // Bottom point (at player)
      ]);
      
      const string = new THREE.Line(stringGeometry, stringMaterial);
      this.parachuteModel.add(string);
    }
    
    // Position the parachute above the player
    this.updateParachutePosition();
    
    // Add to scene
    scene.add(this.parachuteModel);
  }
  
  // Update parachute position to follow the player
  updateParachutePosition() {
    if (!this.parachuteModel) return;
    
    // Position parachute above player
    const position = this.camera.position.clone();
    position.y += 2; // Position above player's head
    
    this.parachuteModel.position.copy(position);
    
    // Add slight swaying motion
    const time = performance.now() / 1000;
    const swayAmount = 0.1;
    this.parachuteModel.rotation.x = Math.sin(time * 0.5) * swayAmount;
    this.parachuteModel.rotation.z = Math.sin(time * 0.7) * swayAmount;
  }
  
  // Remove the parachute model
  removeParachute() {
    if (this.parachuteModel) {
      // Get the scene from the camera
      const scene = this.camera.parent;
      if (scene) {
        scene.remove(this.parachuteModel);
      }
      this.parachuteModel = null;
    }
  }

  setNearestChest(chest) {
    this.nearestChest = chest;
  }

  setNearestShield(shield) {
    this.nearestShield = shield;
  }
}

export { FPSControls }; 