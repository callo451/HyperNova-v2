import * as THREE from 'three';

class NeonMaterials {
  constructor() {
    // Base building material
    this.buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.8
    });
    
    // Road material
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Sidewalk material
    this.sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Neon colors
    this.neonColors = [
      0x00ffff, // Cyan
      0xff00ff, // Magenta
      0x00ff33, // Green
      0x3333ff, // Blue
      0xff3366  // Pink
    ];
    
    // Create neon materials with increased emissive intensity
    this.neonMaterials = this.neonColors.map(color => 
      new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.2, // Increased from 0.8 to 1.2
        roughness: 0.2,
        metalness: 0.8
      })
    );
    
    // Window material with increased emissive intensity
    this.windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x88ccff,
      emissiveIntensity: 0.5, // Increased from 0.2 to 0.5
      roughness: 0.3,
      metalness: 1.0,
      transparent: true,
      opacity: 0.9
    });
    
    // Billboard material
    this.billboardMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.2,
      metalness: 0.8
    });
    
    // Hologram material with increased emissive intensity
    this.hologramMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.5, // Increased from 1.0 to 1.5
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    // Road line material with increased emissive intensity
    this.roadLineMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.2, // Increased from 0.8 to 1.2
      roughness: 0.2,
      metalness: 0.8
    });
    
    // Vehicle materials
    this.vehicleMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.2,
        metalness: 0.9
      }),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.1,
        metalness: 1.0
      }),
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.05,
        metalness: 1.0
      })
    ];
    
    // Vehicle light material with increased emissive intensity
    this.vehicleLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff3333,
      emissiveIntensity: 1.5, // Increased from 1.0 to 1.5
      roughness: 0.2,
      metalness: 0.8
    });
  }
  
  // Get a random neon material
  getRandomNeonMaterial() {
    return this.neonMaterials[Math.floor(Math.random() * this.neonMaterials.length)];
  }
  
  // Create a custom neon material with a specific color
  createNeonMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
  }
  
  // Create a blinking neon material
  createBlinkingNeonMaterial(color, blinkSpeed = 0.5) {
    const material = this.createNeonMaterial(color);
    
    // Store the original emissive intensity
    material.userData = {
      originalIntensity: material.emissiveIntensity,
      blinkSpeed: blinkSpeed,
      time: 0
    };
    
    // Add an update method to the material
    material.update = function(deltaTime) {
      this.userData.time += deltaTime;
      this.emissiveIntensity = this.userData.originalIntensity * 
        (0.5 + 0.5 * Math.sin(this.userData.time * this.userData.blinkSpeed * Math.PI));
    };
    
    return material;
  }
}

export { NeonMaterials }; 