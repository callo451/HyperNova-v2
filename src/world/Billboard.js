import * as THREE from 'three';

class Billboard extends THREE.Group {
  constructor(materials, isFloating = false) {
    super();
    
    this.materials = materials;
    // We're no longer using floating billboards
    this.isFloating = false;
    
    // Create the billboard
    this.createBillboard();
  }
  
  createBillboard() {
    // Billboard dimensions - make them larger for better visibility
    const width = 5 + Math.random() * 5; // Increased from 3 + random * 4
    const height = 3 + Math.random() * 3; // Increased from 2 + random * 2
    const depth = 0.3; // Slightly thicker
    
    // Create billboard frame
    const frameGeometry = new THREE.BoxGeometry(width, height, depth);
    const frame = new THREE.Mesh(frameGeometry, this.materials.buildingMaterial);
    this.add(frame);
    
    // Create billboard screen - for company logos
    const screenGeometry = new THREE.PlaneGeometry(width * 0.9, height * 0.9);
    const screenMaterial = this.createScreenMaterial();
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = depth / 2 + 0.01;
    frame.add(screen);
    
    // Add neon trim
    this.addNeonTrim(frame, width, height, depth);
    
    // Always add support structure since we're not floating anymore
    this.addSupportStructure(width, height);
  }
  
  createScreenMaterial() {
    // Create a material suitable for company logos
    const type = Math.floor(Math.random() * 4);
    
    let material;
    
    switch (type) {
      case 0: // Solid neon color - good for simple logos
        material = this.materials.getRandomNeonMaterial();
        // Increase emissive intensity for better visibility at distance
        material.emissiveIntensity = 1.5;
        return material;
        
      case 1: // Blinking neon - attention-grabbing
        material = this.materials.createBlinkingNeonMaterial(
          this.materials.neonColors[Math.floor(Math.random() * this.materials.neonColors.length)],
          0.5 + Math.random() * 1.5
        );
        // Increase emissive intensity for better visibility at distance
        material.emissiveIntensity = 1.5;
        return material;
        
      case 2: // Hologram-like - futuristic logos
        material = this.materials.hologramMaterial.clone();
        // Increase emissive intensity for better visibility at distance
        material.emissiveIntensity = 1.5;
        return material;
        
      case 3: // White background with colored trim - classic billboard look
        material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.1
        });
        return material;
        
      default:
        material = this.materials.getRandomNeonMaterial();
        // Increase emissive intensity for better visibility at distance
        material.emissiveIntensity = 1.5;
        return material;
    }
  }
  
  addNeonTrim(frame, width, height, depth) {
    // Add neon trim around the billboard - make it brighter
    const trimWidth = 0.15; // Slightly wider trim
    const trimMaterial = this.materials.getRandomNeonMaterial();
    // Make trim brighter
    trimMaterial.emissiveIntensity = 1.8;
    
    // Top trim
    const topTrimGeometry = new THREE.BoxGeometry(width + trimWidth * 2, trimWidth, depth + trimWidth * 2);
    const topTrim = new THREE.Mesh(topTrimGeometry, trimMaterial);
    topTrim.position.y = height / 2 + trimWidth / 2;
    frame.add(topTrim);
    
    // Bottom trim
    const bottomTrimGeometry = new THREE.BoxGeometry(width + trimWidth * 2, trimWidth, depth + trimWidth * 2);
    const bottomTrim = new THREE.Mesh(bottomTrimGeometry, trimMaterial);
    bottomTrim.position.y = -height / 2 - trimWidth / 2;
    frame.add(bottomTrim);
    
    // Left trim
    const leftTrimGeometry = new THREE.BoxGeometry(trimWidth, height, depth + trimWidth * 2);
    const leftTrim = new THREE.Mesh(leftTrimGeometry, trimMaterial);
    leftTrim.position.x = -width / 2 - trimWidth / 2;
    frame.add(leftTrim);
    
    // Right trim
    const rightTrimGeometry = new THREE.BoxGeometry(trimWidth, height, depth + trimWidth * 2);
    const rightTrim = new THREE.Mesh(rightTrimGeometry, trimMaterial);
    rightTrim.position.x = width / 2 + trimWidth / 2;
    frame.add(rightTrim);
  }
  
  addSupportStructure(width, height) {
    // Create stronger support structure for building-mounted billboards
    const poleHeight = 1.5; // Shorter pole since it's mounted on buildings
    const poleGeometry = new THREE.CylinderGeometry(0.3, 0.3, poleHeight, 8);
    const pole = new THREE.Mesh(poleGeometry, this.materials.buildingMaterial);
    pole.position.y = -height / 2 - poleHeight / 2;
    this.add(pole);
    
    // Create base
    const baseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 8);
    const base = new THREE.Mesh(baseGeometry, this.materials.buildingMaterial);
    base.position.y = -height / 2 - poleHeight;
    this.add(base);
    
    // Add support beams for larger billboards
    if (width > 7) {
      // Add diagonal support beams
      const beamGeometry = new THREE.CylinderGeometry(0.15, 0.15, Math.sqrt(poleHeight * poleHeight + (width/2) * (width/2)), 6);
      
      // Left support beam
      const leftBeam = new THREE.Mesh(beamGeometry, this.materials.buildingMaterial);
      leftBeam.position.set(-width/4, -height/2 - poleHeight/2, 0);
      // Calculate angle for the beam
      const angle = Math.atan2(poleHeight, width/2);
      leftBeam.rotation.z = Math.PI/2 - angle;
      this.add(leftBeam);
      
      // Right support beam
      const rightBeam = new THREE.Mesh(beamGeometry, this.materials.buildingMaterial);
      rightBeam.position.set(width/4, -height/2 - poleHeight/2, 0);
      rightBeam.rotation.z = -(Math.PI/2 - angle);
      this.add(rightBeam);
    }
  }
  
  update(deltaTime) {
    // We no longer need floating animation
    // But we'll keep the material update for blinking effects
    const screen = this.children[0].children[0];
    if (screen && screen.material && screen.material.update) {
      screen.material.update(deltaTime);
    }
  }
}

export { Billboard }; 