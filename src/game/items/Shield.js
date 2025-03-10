import * as THREE from 'three';

class Shield {
  constructor(position) {
    this.position = position;
    this.mesh = null;
    this.interactionDistance = 2; // Distance in units that player can interact with shield
    this.shieldAmount = 100; // Shield points provided
    this.isCollected = false;
    
    this.createMesh();
  }
  
  createMesh() {
    // Create a shield mesh
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00AAFF,
      emissive: 0x0066AA,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x = Math.PI / 2; // Lay flat
    
    // Add glow effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00AAFF,
      transparent: true,
      opacity: 0.4
    });
    const glowMesh = new THREE.Mesh(geometry.clone().scale(1.3, 1, 1.3), glowMaterial);
    this.mesh.add(glowMesh);
    
    // Add floating animation
    this.floatHeight = 0.5;
    this.floatSpeed = 1.5;
    this.initialY = this.position.y;
    
    // Add rotation animation
    this.rotationSpeed = 1.0;
    
    // Store reference to shield instance
    this.mesh.userData.shield = this;
  }
  
  update(deltaTime) {
    if (this.isCollected) return;
    
    // Floating animation
    const time = performance.now() / 1000;
    this.mesh.position.y = this.initialY + Math.sin(time * this.floatSpeed) * this.floatHeight;
    
    // Rotation animation
    this.mesh.rotation.z += this.rotationSpeed * deltaTime;
  }
  
  collect() {
    if (this.isCollected) return 0;
    
    this.isCollected = true;
    this.mesh.visible = false;
    
    return this.shieldAmount;
  }
  
  canInteract(playerPosition) {
    if (this.isCollected) return false;
    return this.position.distanceTo(playerPosition) <= this.interactionDistance;
  }
}

export { Shield }; 