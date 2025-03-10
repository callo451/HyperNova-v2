import * as THREE from 'three';

class Player {
  constructor(id, camera, controls, scene) {
    this.id = id;
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;
    
    // Player state
    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
    this.isInSafeZone = true;
    
    // Weapon state
    this.weapons = [];
    this.currentWeaponIndex = -1; // No weapon initially
    this.ammo = {};
    
    // Parachute state
    this.isParachuting = false;
    this.parachuteModel = null;
    
    // Create player model (visible to other players)
    this.createPlayerModel();
    
    // Raycaster for shooting and interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Interaction state
    this.canInteract = true;
    this.interactionCooldown = 500; // ms
    this.lastInteractionTime = 0;
    
    // Shooting state
    this.isShooting = false;
    this.canShoot = true;
    this.shootCooldown = 500; // ms
    this.lastShootTime = 0;
  }
  
  createPlayerModel() {
    // Create a simple player model (cylinder for body, sphere for head)
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 8);
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 });
    
    this.body = new THREE.Mesh(bodyGeometry, material);
    this.head = new THREE.Mesh(headGeometry, material);
    
    // Position head on top of body
    this.head.position.y = 1.0;
    this.body.add(this.head);
    
    // Create player model group
    this.model = new THREE.Group();
    this.model.add(this.body);
    
    // Add to scene
    this.scene.add(this.model);
    
    // Hide own model from self (first-person view)
    this.model.visible = false;
  }
  
  update(deltaTime) {
    if (!this.alive) return;
    
    // Update player model position to match camera
    this.updateModelPosition();
    
    // Update parachute if needed
    if (this.controls && this.controls.isParachuting) {
      this.isParachuting = true;
      
      // Create parachute model if it doesn't exist
      if (!this.parachuteModel) {
        this.createParachuteModel();
      }
      
      // Update parachute position
      this.updateParachutePosition();
    } else if (this.isParachuting) {
      // Remove parachute if we're no longer parachuting
      this.removeParachute();
      this.isParachuting = false;
    }
    
    // Handle shooting cooldown
    if (!this.canShoot && performance.now() - this.lastShootTime > this.shootCooldown) {
      this.canShoot = true;
    }
    
    // Handle interaction cooldown
    if (!this.canInteract && performance.now() - this.lastInteractionTime > this.interactionCooldown) {
      this.canInteract = true;
    }
    
    // Apply damage if outside safe zone
    if (!this.isInSafeZone) {
      // Use storm damage that bypasses shields
      if (this.controls && typeof this.controls.takeStormDamage === 'function') {
        this.controls.takeStormDamage(2 * deltaTime); // 2 damage per second
        this.health = this.controls.health; // Sync health
      } else {
        // Fallback to direct health damage
        this.health = Math.max(0, this.health - (2 * deltaTime));
        if (this.health <= 0) {
          this.die();
        }
      }
    }
  }
  
  updateModelPosition() {
    // Position the player model at the camera position
    const cameraPosition = this.camera.position.clone();
    // Adjust Y position to account for player height
    cameraPosition.y -= 1.6; // Assuming camera is at eye level
    
    this.model.position.copy(cameraPosition);
    
    // Rotate model to match camera direction
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(this.camera.quaternion);
    cameraDirection.y = 0; // Keep rotation only in the horizontal plane
    cameraDirection.normalize();
    
    if (cameraDirection.length() > 0.1) {
      const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
      this.model.rotation.y = angle;
    }
  }
  
  shoot() {
    if (!this.alive || !this.canShoot || this.currentWeaponIndex === -1) return;
    
    const weapon = this.weapons[this.currentWeaponIndex];
    if (!weapon) return;
    
    // Check if we have ammo
    if (this.ammo[weapon.type] <= 0) {
      // Play empty sound
      console.log("Click - out of ammo");
      return;
    }
    
    // Set shooting cooldown
    this.canShoot = false;
    this.lastShootTime = performance.now();
    
    // Decrease ammo
    this.ammo[weapon.type]--;
    
    // Update UI
    this.updateAmmoUI();
    
    // Get shooting direction from camera
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    // Perform raycast to detect hits
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    
    // Check for player hits
    for (const hit of hits) {
      // Check if we hit a player
      const hitPlayer = this.findPlayerFromObject(hit.object);
      if (hitPlayer && hitPlayer !== this) {
        // Deal damage to the hit player
        hitPlayer.takeDamage(weapon.damage);
        
        // Create hit effect
        this.createHitEffect(hit.point);
        
        // We only hit the first player in the ray
        break;
      }
    }
    
    // Create muzzle flash effect
    this.createMuzzleFlash();
  }
  
  findPlayerFromObject(object) {
    // This would be implemented when we have multiple players
    // For now, return null
    return null;
  }
  
  createMuzzleFlash() {
    // Create a simple muzzle flash effect
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00, 
      transparent: true, 
      opacity: 1.0 
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    
    // Position the flash in front of the camera
    const flashPosition = new THREE.Vector3(0, 0, -1);
    flashPosition.applyQuaternion(this.camera.quaternion);
    flash.position.copy(this.camera.position).add(flashPosition);
    
    this.scene.add(flash);
    
    // Remove the flash after a short time
    setTimeout(() => {
      this.scene.remove(flash);
      flash.geometry.dispose();
      flash.material.dispose();
    }, 100);
  }
  
  createHitEffect(position) {
    // Create a simple hit effect
    const hitGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const hitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 1.0 
    });
    
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.position.copy(position);
    
    this.scene.add(hit);
    
    // Remove the hit effect after a short time
    setTimeout(() => {
      this.scene.remove(hit);
      hit.geometry.dispose();
      hit.material.dispose();
    }, 300);
  }
  
  takeDamage(amount) {
    if (!this.alive) return;
    
    // If we have FPSControls, use its shield system
    if (this.controls && typeof this.controls.takeDamage === 'function') {
      // Let FPSControls handle the damage with shield absorption
      this.controls.takeDamage(amount);
      
      // Sync our health with FPSControls
      this.health = this.controls.health;
    } else {
      // Fallback to direct health damage
      this.health -= amount;
      
      // Update health UI
      this.updateHealthUI();
    }
    
    // Check if player is dead
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }
  
  die() {
    this.alive = false;
    
    // Hide player model
    this.model.visible = false;
    
    // Disable controls
    this.controls.enabled = false;
    
    // Show game over screen
    this.showGameOverScreen();
  }
  
  showGameOverScreen() {
    // Create a simple game over screen
    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'game-over';
    gameOverDiv.style.position = 'fixed';
    gameOverDiv.style.top = '0';
    gameOverDiv.style.left = '0';
    gameOverDiv.style.width = '100%';
    gameOverDiv.style.height = '100%';
    gameOverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    gameOverDiv.style.color = '#ff0000';
    gameOverDiv.style.display = 'flex';
    gameOverDiv.style.flexDirection = 'column';
    gameOverDiv.style.justifyContent = 'center';
    gameOverDiv.style.alignItems = 'center';
    gameOverDiv.style.zIndex = '1000';
    gameOverDiv.style.fontFamily = 'monospace';
    
    const gameOverTitle = document.createElement('h1');
    gameOverTitle.textContent = 'GAME OVER';
    gameOverTitle.style.fontSize = '4rem';
    gameOverTitle.style.marginBottom = '2rem';
    gameOverTitle.style.textShadow = '0 0 10px #ff0000';
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'RESTART';
    restartButton.style.padding = '1rem 2rem';
    restartButton.style.fontSize = '1.5rem';
    restartButton.style.backgroundColor = '#ff0000';
    restartButton.style.color = '#ffffff';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.fontFamily = 'monospace';
    
    restartButton.addEventListener('click', () => {
      // Reload the page to restart the game
      window.location.reload();
    });
    
    gameOverDiv.appendChild(gameOverTitle);
    gameOverDiv.appendChild(restartButton);
    
    document.body.appendChild(gameOverDiv);
  }
  
  heal(amount) {
    if (!this.alive) return;
    
    this.health = Math.min(this.health + amount, this.maxHealth);
    
    // Update health UI
    this.updateHealthUI();
  }
  
  pickupWeapon(weapon) {
    // Check if we already have this weapon type
    const existingIndex = this.weapons.findIndex(w => w.type === weapon.type);
    
    if (existingIndex !== -1) {
      // Already have this weapon, just add ammo
      this.addAmmo(weapon.type, weapon.ammo);
    } else {
      // Add new weapon
      this.weapons.push(weapon);
      
      // Initialize ammo for this weapon type if needed
      if (!this.ammo[weapon.type]) {
        this.ammo[weapon.type] = 0;
      }
      
      // Add ammo
      this.addAmmo(weapon.type, weapon.ammo);
      
      // Switch to this weapon if we don't have one equipped
      if (this.currentWeaponIndex === -1) {
        this.currentWeaponIndex = this.weapons.length - 1;
        this.updateWeaponUI();
      }
    }
  }
  
  addAmmo(type, amount) {
    if (!this.ammo[type]) {
      this.ammo[type] = 0;
    }
    
    this.ammo[type] += amount;
    
    // Update UI
    this.updateAmmoUI();
  }
  
  switchWeapon(delta) {
    if (this.weapons.length === 0) return;
    
    this.currentWeaponIndex = (this.currentWeaponIndex + delta + this.weapons.length) % this.weapons.length;
    
    // Update UI
    this.updateWeaponUI();
  }
  
  updateHealthUI() {
    // Update health display in FPSControls
    if (this.controls && this.controls.updateHealthUI) {
      // Transfer health value to FPSControls
      this.controls.health = this.health;
      
      // Call FPSControls updateHealthUI method
      this.controls.updateHealthUI();
    }
  }
  
  updateAmmoUI() {
    // Update ammo display
    const ammoElement = document.getElementById('ammo-value');
    if (ammoElement && this.currentWeaponIndex !== -1) {
      const weapon = this.weapons[this.currentWeaponIndex];
      ammoElement.textContent = this.ammo[weapon.type] || 0;
    }
  }
  
  updateWeaponUI() {
    // Update weapon display
    const weaponElement = document.getElementById('weapon-name');
    if (weaponElement && this.currentWeaponIndex !== -1) {
      const weapon = this.weapons[this.currentWeaponIndex];
      weaponElement.textContent = weapon.name;
    }
  }
  
  setInSafeZone(inSafeZone) {
    this.isInSafeZone = inSafeZone;
    
    // If we're outside the safe zone, show a visual indicator
    if (!inSafeZone && this.controls) {
      // Create or update danger indicator
      if (!this.dangerIndicator) {
        this.dangerIndicator = document.createElement('div');
        this.dangerIndicator.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ff0000;
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          text-shadow: 0 0 10px #ff0000;
          pointer-events: none;
          z-index: 1000;
          animation: pulse 1s infinite;
        `;
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.dangerIndicator);
      }
      
      this.dangerIndicator.textContent = 'DANGER - STORM DAMAGE TO HEALTH';
      this.dangerIndicator.style.display = 'block';
      
      // Add health damage visual effect
      if (!this.stormDamageEffect) {
        this.stormDamageEffect = document.createElement('div');
        this.stormDamageEffect.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 999;
          border: 4px solid #ff0000;
          box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.5);
          animation: pulseBorder 1s infinite;
        `;
        
        // Add pulse animation for border
        const borderStyle = document.createElement('style');
        borderStyle.textContent = `
          @keyframes pulseBorder {
            0% { opacity: 0.3; }
            50% { opacity: 0.6; }
            100% { opacity: 0.3; }
          }
        `;
        document.head.appendChild(borderStyle);
        
        document.body.appendChild(this.stormDamageEffect);
      }
      
      this.stormDamageEffect.style.display = 'block';
    } else {
      // Hide indicators when in safe zone
      if (this.dangerIndicator) {
        this.dangerIndicator.style.display = 'none';
      }
      
      if (this.stormDamageEffect) {
        this.stormDamageEffect.style.display = 'none';
      }
    }
  }
  
  addShield(amount) {
    // If we have FPSControls, use its shield system
    if (this.controls && typeof this.controls.addShield === 'function') {
      this.controls.addShield(amount);
    }
  }
  
  // Create a parachute model for the player model
  createParachuteModel() {
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
    
    // Position the parachute above the player model
    this.parachuteModel.position.y = 3;
    
    // Add to player model
    this.model.add(this.parachuteModel);
  }
  
  // Update parachute position
  updateParachutePosition() {
    if (!this.parachuteModel) return;
    
    // Add slight swaying motion
    const time = performance.now() / 1000;
    const swayAmount = 0.1;
    this.parachuteModel.rotation.x = Math.sin(time * 0.5) * swayAmount;
    this.parachuteModel.rotation.z = Math.sin(time * 0.7) * swayAmount;
  }
  
  // Remove the parachute model
  removeParachute() {
    if (this.parachuteModel) {
      this.model.remove(this.parachuteModel);
      this.parachuteModel = null;
    }
  }
}

export { Player }; 