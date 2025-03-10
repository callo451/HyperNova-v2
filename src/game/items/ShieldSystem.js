import * as THREE from 'three';
import { Shield } from './Shield.js';

class ShieldSystem {
  constructor(scene, cityGenerator) {
    this.scene = scene;
    this.cityGenerator = cityGenerator;
    this.shields = [];
    this.spawnPoints = [];
    
    // Configuration
    this.numShields = 10; // Number of shields to spawn
    this.minDistanceBetweenShields = 30; // Minimum distance between shields
    this.respawnTime = 60; // Seconds until a shield respawns
  }
  
  generateSpawnPoints() {
    const cityBounds = this.cityGenerator.getCityBounds();
    const buildings = this.cityGenerator.getBuildings() || [];
    
    // Create a grid of potential spawn points
    const gridSize = 10;
    for (let x = cityBounds.min.x; x <= cityBounds.max.x; x += gridSize) {
      for (let z = cityBounds.min.z; z <= cityBounds.max.z; z += gridSize) {
        const point = new THREE.Vector3(x, 0, z);
        
        // Check if point is far enough from buildings
        let isSafe = true;
        for (const building of buildings) {
          if (!building || !building.position) continue;
          const distance = point.distanceTo(building.position);
          if (distance < 8) { // Keep shields away from buildings
            isSafe = false;
            break;
          }
        }
        
        if (isSafe) {
          // Raycast down to find ground level
          const raycaster = new THREE.Raycaster();
          raycaster.set(
            new THREE.Vector3(x, 100, z),
            new THREE.Vector3(0, -1, 0)
          );
          
          const intersects = raycaster.intersectObjects(this.scene.children, true);
          if (intersects.length > 0) {
            point.y = intersects[0].point.y + 1; // Position slightly above ground
            this.spawnPoints.push(point);
          }
        }
      }
    }
    
    // If no spawn points were found, create some default ones
    if (this.spawnPoints.length === 0) {
      console.warn('No valid shield spawn points found, creating default points');
      const defaultPoints = [
        new THREE.Vector3(10, 1, 10),
        new THREE.Vector3(-10, 1, -10),
        new THREE.Vector3(30, 1, 30),
        new THREE.Vector3(-30, 1, -30),
        new THREE.Vector3(50, 1, 50)
      ];
      
      this.spawnPoints = defaultPoints;
    }
  }
  
  spawnShields() {
    if (this.spawnPoints.length === 0) {
      this.generateSpawnPoints();
    }
    
    // Randomly select spawn points
    const shuffled = this.spawnPoints.sort(() => Math.random() - 0.5);
    const selectedPoints = shuffled.slice(0, this.numShields);
    
    // Spawn shields at selected points
    for (const point of selectedPoints) {
      const shield = new Shield(point);
      this.shields.push(shield);
      this.scene.add(shield.mesh);
    }
  }
  
  findNearestShield(playerPosition) {
    let nearest = null;
    let nearestDistance = Infinity;
    
    for (const shield of this.shields) {
      if (shield.isCollected) continue;
      
      const distance = playerPosition.distanceTo(shield.position);
      if (distance < nearestDistance && shield.canInteract(playerPosition)) {
        nearest = shield;
        nearestDistance = distance;
      }
    }
    
    return nearest;
  }
  
  update(deltaTime) {
    // Update shield animations
    for (const shield of this.shields) {
      shield.update(deltaTime);
    }
    
    // Check for respawns
    const now = performance.now() / 1000;
    for (const shield of this.shields) {
      if (shield.isCollected && shield.collectedTime && now - shield.collectedTime > this.respawnTime) {
        shield.isCollected = false;
        shield.mesh.visible = true;
      }
    }
  }
  
  collectShield(shield) {
    if (!shield || shield.isCollected) return 0;
    
    const shieldAmount = shield.collect();
    shield.collectedTime = performance.now() / 1000;
    
    return shieldAmount;
  }
}

export { ShieldSystem }; 