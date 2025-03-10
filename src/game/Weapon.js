import * as THREE from 'three';

class Weapon {
  constructor(type, name, damage, fireRate, ammo) {
    this.type = type;
    this.name = name;
    this.damage = damage;
    this.fireRate = fireRate; // Shots per second
    this.ammo = ammo;
    
    // Create weapon model
    this.createModel();
  }
  
  createModel() {
    // Create a simple weapon model based on type
    this.model = new THREE.Group();
    
    let mainGeometry, mainMaterial;
    
    switch (this.type) {
      case 'pistol':
        // Simple pistol shape
        mainGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
        mainMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        break;
        
      case 'rifle':
        // Longer rifle shape
        mainGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.8);
        mainMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        break;
        
      case 'shotgun':
        // Thick shotgun shape
        mainGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.6);
        mainMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        break;
        
      default:
        // Default weapon
        mainGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.4);
        mainMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    }
    
    const mainPart = new THREE.Mesh(mainGeometry, mainMaterial);
    this.model.add(mainPart);
    
    // Add a handle
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.15, 0);
    this.model.add(handle);
    
    // Add a barrel highlight
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff, 
      emissive: 0x00ffff,
      emissiveIntensity: 0.5
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    
    // Position barrel at the front of the weapon
    switch (this.type) {
      case 'pistol':
        barrel.position.set(0, 0, 0.2);
        break;
      case 'rifle':
        barrel.position.set(0, 0, 0.45);
        break;
      case 'shotgun':
        barrel.position.set(0, 0, 0.35);
        break;
      default:
        barrel.position.set(0, 0, 0.25);
    }
    
    this.model.add(barrel);
  }
  
  // Factory method to create weapons of different types
  static createWeapon(type) {
    switch (type) {
      case 'pistol':
        return new Weapon('pistol', 'Neon Pistol', 10, 2, 12);
        
      case 'rifle':
        return new Weapon('rifle', 'Pulse Rifle', 15, 5, 30);
        
      case 'shotgun':
        return new Weapon('shotgun', 'Scatter Blaster', 25, 1, 8);
        
      default:
        return new Weapon('pistol', 'Neon Pistol', 10, 2, 12);
    }
  }
}

export { Weapon }; 