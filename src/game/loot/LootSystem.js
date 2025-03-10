import { Chest } from './Chest.js';
import * as THREE from 'three';

class LootSystem {
  constructor(scene, cityGenerator) {
    this.scene = scene;
    this.cityGenerator = cityGenerator;
    this.chests = [];
    this.spawnPoints = [];
    
    // Configuration
    this.numChests = 20; // Number of chests to spawn
    this.minDistanceBetweenChests = 20; // Minimum distance between chests
    this.minDistanceFromBuildings = 5; // Minimum distance from buildings
    
    // Interaction message
    this.createInteractionUI();
  }
  
  createInteractionUI() {
    this.interactionMessage = document.createElement('div');
    this.interactionMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #0ff;
      text-shadow: 0 0 5px #0ff;
      font-family: monospace;
      font-size: 1.2em;
      display: none;
      z-index: 100;
    `;
    this.interactionMessage.textContent = 'Press E to open chest';
    document.body.appendChild(this.interactionMessage);
  }
  
  generateSpawnPoints() {
    const cityBounds = this.cityGenerator.getCityBounds();
    const buildings = this.cityGenerator.getBuildings() || [];
    
    // Create a grid of potential spawn points
    const gridSize = 5;
    for (let x = cityBounds.min.x; x <= cityBounds.max.x; x += gridSize) {
      for (let z = cityBounds.min.z; z <= cityBounds.max.z; z += gridSize) {
        const point = new THREE.Vector3(x, 0, z);
        
        // Check if point is far enough from buildings
        let isSafe = true;
        for (const building of buildings) {
          if (!building || !building.position) continue;
          const distance = point.distanceTo(building.position);
          if (distance < this.minDistanceFromBuildings) {
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
            point.y = intersects[0].point.y;
            this.spawnPoints.push(point);
          }
        }
      }
    }
    
    // If no spawn points were found, create some default ones
    if (this.spawnPoints.length === 0) {
      console.warn('No valid spawn points found, creating default points');
      const defaultPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(20, 0, 20),
        new THREE.Vector3(-20, 0, -20),
        new THREE.Vector3(20, 0, -20),
        new THREE.Vector3(-20, 0, 20)
      ];
      
      // Find ground level for each default point
      for (const point of defaultPoints) {
        const raycaster = new THREE.Raycaster();
        raycaster.set(
          new THREE.Vector3(point.x, 100, point.z),
          new THREE.Vector3(0, -1, 0)
        );
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        if (intersects.length > 0) {
          point.y = intersects[0].point.y;
          this.spawnPoints.push(point);
        }
      }
    }
  }
  
  spawnChests() {
    if (this.spawnPoints.length === 0) {
      this.generateSpawnPoints();
    }
    
    // Randomly select spawn points
    const shuffled = this.spawnPoints.sort(() => Math.random() - 0.5);
    const selectedPoints = shuffled.slice(0, this.numChests);
    
    // Spawn chests at selected points
    for (const point of selectedPoints) {
      const chest = new Chest(point);
      this.chests.push(chest);
      this.scene.add(chest.mesh);
    }
  }
  
  findNearestChest(playerPosition) {
    let nearest = null;
    let nearestDistance = Infinity;
    
    for (const chest of this.chests) {
      if (chest.isOpen) continue;
      
      const distance = playerPosition.distanceTo(chest.position);
      if (distance < nearestDistance && chest.canInteract(playerPosition)) {
        nearest = chest;
        nearestDistance = distance;
      }
    }
    
    return nearest;
  }
  
  showInteractionMessage(show) {
    this.interactionMessage.style.display = show ? 'block' : 'none';
  }
  
  update(playerPosition) {
    // Only check for nearest chest every 5 frames to reduce performance impact
    if (!this._frameCounter) this._frameCounter = 0;
    this._frameCounter++;
    
    if (this._frameCounter % 5 === 0) {
      this._nearestChest = this.findNearestChest(playerPosition);
      this.showInteractionMessage(this._nearestChest !== null);
    }
    
    return this._nearestChest;
  }
}

export { LootSystem }; 