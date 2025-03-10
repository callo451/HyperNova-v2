import * as THREE from 'three';
import { Weapon } from './Weapon.js';

class Pickup {
  constructor(type, position, scene) {
    this.type = type; // 'weapon', 'ammo', 'health', 'shield'
    this.position = position;
    this.scene = scene;
    this.isCollected = false;
    
    // Additional properties based on type
    switch (type) {
      case 'weapon_pistol':
        this.weaponType = 'pistol';
        this.value = Weapon.createWeapon('pistol');
        break;
        
      case 'weapon_rifle':
        this.weaponType = 'rifle';
        this.value = Weapon.createWeapon('rifle');
        break;
        
      case 'weapon_shotgun':
        this.weaponType = 'shotgun';
        this.value = Weapon.createWeapon('shotgun');
        break;
        
      case 'ammo_pistol':
        this.ammoType = 'pistol';
        this.value = 12; // Ammo amount
        break;
        
      case 'ammo_rifle':
        this.ammoType = 'rifle';
        this.value = 30; // Ammo amount
        break;
        
      case 'ammo_shotgun':
        this.ammoType = 'shotgun';
        this.value = 8; // Ammo amount
        break;
        
      case 'health':
        this.value = 25; // Health amount
        break;
        
      case 'shield':
        this.value = 50; // Shield amount
        break;
        
      default:
        this.value = null;
    }
    
    // Create pickup model
    this.createModel();
    
    // Add to scene
    this.scene.add(this.model);
  }
  
  createModel() {
    // Create a model based on pickup type
    if (this.type.startsWith('weapon_')) {
      // Create weapon model
      this.createWeaponModel();
    } else if (this.type.startsWith('ammo_')) {
      // Create ammo model
      this.createAmmoModel();
    } else if (this.type === 'health') {
      // Create health pack
      this.createHealthModel();
    } else if (this.type === 'shield') {
      // Create shield pickup
      this.createShieldModel();
    }
  }
  
  createWeaponModel() {
    this.model = new THREE.Group();
    
    // Base geometry for all pickups
    const baseGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.model.add(base);
    
    // Add specific model based on type
    let itemGeometry, itemMaterial;
    
    if (this.value && this.value.model) {
      const weaponModel = this.value.model.clone();
      weaponModel.scale.set(0.7, 0.7, 0.7);
      weaponModel.position.set(0, 0.2, 0);
      weaponModel.rotation.y = Math.PI / 4;
      this.model.add(weaponModel);
    }
    
    // Position the model
    this.model.position.copy(this.position);
    
    // Add floating animation
    this.model.userData = {
      originalY: this.position.y,
      floatSpeed: 1 + Math.random() * 0.5,
      rotationSpeed: 0.5 + Math.random() * 0.5,
      time: Math.random() * Math.PI * 2 // Random start time
    };
  }
  
  createAmmoModel() {
    this.model = new THREE.Group();
    
    // Base geometry for all pickups
    const baseGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.model.add(base);
    
    // Add specific model based on type
    let itemGeometry, itemMaterial;
    
    // Create ammo box
    itemGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    
    // Color based on ammo type
    let color;
    switch (this.ammoType) {
      case 'pistol':
        color = 0x00ffff; // Cyan
        break;
      case 'rifle':
        color = 0xff00ff; // Magenta
        break;
      case 'shotgun':
        color = 0xffff00; // Yellow
        break;
      default:
        color = 0xffffff; // White
    }
    
    itemMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const item = new THREE.Mesh(itemGeometry, itemMaterial);
    item.position.y = 0.15;
    this.model.add(item);
    
    // Position the model
    this.model.position.copy(this.position);
    
    // Add floating animation
    this.model.userData = {
      originalY: this.position.y,
      floatSpeed: 1 + Math.random() * 0.5,
      rotationSpeed: 0.5 + Math.random() * 0.5,
      time: Math.random() * Math.PI * 2 // Random start time
    };
  }
  
  createHealthModel() {
    this.model = new THREE.Group();
    
    // Base geometry for all pickups
    const baseGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    this.model.add(base);
    
    // Add specific model based on type
    let itemGeometry, itemMaterial;
    
    // Create health pack
    itemGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.4);
    itemMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, // Red
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.3
    });
    
    const item = new THREE.Mesh(itemGeometry, itemMaterial);
    item.position.y = 0.15;
    this.model.add(item);
    
    // Add a cross symbol
    const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crossVertical = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.05, 0.25),
      crossMaterial
    );
    crossVertical.position.y = 0.26;
    
    const crossHorizontal = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.05, 0.08),
      crossMaterial
    );
    crossHorizontal.position.y = 0.26;
    
    this.model.add(crossVertical);
    this.model.add(crossHorizontal);
    
    // Position the model
    this.model.position.copy(this.position);
    
    // Add floating animation
    this.model.userData = {
      originalY: this.position.y,
      floatSpeed: 1 + Math.random() * 0.5,
      rotationSpeed: 0.5 + Math.random() * 0.5,
      time: Math.random() * Math.PI * 2 // Random start time
    };
  }
  
  createShieldModel() {
    // Create a shield pickup model
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00AAFF,
      emissive: 0x0066AA,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    
    this.model = new THREE.Mesh(geometry, material);
    this.model.position.copy(this.position);
    this.model.rotation.x = Math.PI / 2; // Lay flat
    
    // Add glow effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00AAFF,
      transparent: true,
      opacity: 0.4
    });
    const glowMesh = new THREE.Mesh(geometry.clone().scale(1.3, 1, 1.3), glowMaterial);
    this.model.add(glowMesh);
    
    // Add floating animation
    this.floatHeight = 0.5;
    this.floatSpeed = 1.5;
    this.initialY = this.position.y;
    
    // Add rotation animation
    this.rotationSpeed = 1.0;
    
    // Add to scene
    this.scene.add(this.model);
  }
  
  update(deltaTime) {
    if (this.isCollected || !this.model) return;
    
    if (this.type === 'shield') {
      // Shield-specific animation
      const time = performance.now() / 1000;
      this.model.position.y = this.initialY + Math.sin(time * this.floatSpeed) * this.floatHeight;
      this.model.rotation.z += this.rotationSpeed * deltaTime;
    } else {
      // Standard pickup animation
      const userData = this.model.userData;
      if (userData) {
        userData.time += deltaTime;
        
        // Floating animation
        this.model.position.y = userData.originalY + Math.sin(userData.time * userData.floatSpeed) * 0.2;
        
        // Rotation animation
        this.model.rotation.y += userData.rotationSpeed * deltaTime;
      }
    }
  }
  
  checkCollision(playerPosition, radius = 1.5) {
    if (this.isCollected) return false;
    
    // Simple distance check
    const distance = playerPosition.distanceTo(this.position);
    return distance < radius;
  }
  
  collect() {
    if (this.isCollected) return null;
    
    this.isCollected = true;
    
    // Hide the model
    this.model.visible = false;
    
    // Return the pickup value
    return {
      type: this.type,
      value: this.value
    };
  }
  
  remove() {
    // Remove from scene
    this.scene.remove(this.model);
    
    // Dispose geometries and materials
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material.dispose) {
          child.material.dispose();
        }
      }
    });
  }
  
  // Static method to generate random pickups
  static generateRandomPickups(count, scene, minPosition, maxPosition, minDistance = 5) {
    const pickups = [];
    const positions = [];
    
    // Pickup types with weights
    const pickupTypes = [
      { type: 'weapon_pistol', weight: 5 },
      { type: 'weapon_rifle', weight: 3 },
      { type: 'weapon_shotgun', weight: 2 },
      { type: 'ammo_pistol', weight: 10 },
      { type: 'ammo_rifle', weight: 8 },
      { type: 'ammo_shotgun', weight: 6 },
      { type: 'health', weight: 15 },
      { type: 'shield', weight: 10 }
    ];
    
    // Calculate total weight
    const totalWeight = pickupTypes.reduce((sum, item) => sum + item.weight, 0);
    
    // Generate pickups
    for (let i = 0; i < count; i++) {
      // Find a valid position
      let position;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        // Generate random position
        position = new THREE.Vector3(
          minPosition.x + Math.random() * (maxPosition.x - minPosition.x),
          minPosition.y + Math.random() * (maxPosition.y - minPosition.y),
          minPosition.z + Math.random() * (maxPosition.z - minPosition.z)
        );
        
        // Check if position is too close to existing pickups
        const tooClose = positions.some(pos => pos.distanceTo(position) < minDistance);
        
        if (!tooClose) break;
        
        attempts++;
      } while (attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        console.warn('Could not find valid position for pickup after', maxAttempts, 'attempts');
        continue;
      }
      
      // Add position to list
      positions.push(position.clone());
      
      // Select random pickup type based on weights
      const randomValue = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      let selectedType;
      
      for (const pickupType of pickupTypes) {
        cumulativeWeight += pickupType.weight;
        if (randomValue <= cumulativeWeight) {
          selectedType = pickupType.type;
          break;
        }
      }
      
      // Create pickup
      const pickup = new Pickup(selectedType, position, scene);
      pickups.push(pickup);
    }
    
    return pickups;
  }
}

export { Pickup }; 