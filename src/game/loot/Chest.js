import * as THREE from 'three';
import { WEAPON_PRESETS } from '../weapons/Weapon.js';

class Chest {
  constructor(position) {
    this.position = position;
    this.isOpen = false;
    this.mesh = null;
    this.loot = this.generateLoot();
    this.interactionDistance = 3; // Distance in units that player can interact with chest
    
    this.createMesh();
  }
  
  generateLoot() {
    // Randomly select a weapon from presets
    const weapons = Object.values(WEAPON_PRESETS);
    const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
    return { weapon: randomWeapon };
  }
  
  createMesh() {
    // Create a simple chest mesh
    const geometry = new THREE.BoxGeometry(1, 0.8, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      metalness: 0.7,
      roughness: 0.3
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    
    // Add glow effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.3
    });
    const glowMesh = new THREE.Mesh(geometry.clone().scale(1.1, 1.1, 1.1), glowMaterial);
    this.mesh.add(glowMesh);
    
    // Store reference to chest instance
    this.mesh.userData.chest = this;
  }
  
  open(player) {
    if (this.isOpen) return null;
    
    this.isOpen = true;
    // Change appearance to show it's open
    this.mesh.material.color.setHex(0x4A4A4A);
    this.mesh.children[0].visible = false; // Hide glow effect
    
    const loot = this.loot;
    this.loot = null; // Empty the chest
    
    return loot;
  }
  
  canInteract(playerPosition) {
    return this.position.distanceTo(playerPosition) <= this.interactionDistance;
  }
}

export { Chest }; 