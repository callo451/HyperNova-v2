import * as THREE from 'three';

class Weapon {
  constructor(config) {
    this.name = config.name;
    this.damage = config.damage;
    this.range = config.range;
    this.fireRate = config.fireRate; // Shots per second
    this.ammo = config.ammo;
    this.maxAmmo = config.maxAmmo;
    this.model = null;
    this.lastFireTime = 0;
    
    // Weapon stats
    this.accuracy = config.accuracy || 0.9; // 0-1, higher is more accurate
    this.recoil = config.recoil || 0.1; // 0-1, higher means more recoil
    this.reloadTime = config.reloadTime || 2; // seconds
    this.isReloading = false;
    
    // Sound effects
    this.shootSound = config.shootSound;
    this.reloadSound = config.reloadSound;
    this.emptySound = config.emptySound;
  }
  
  async loadModel(modelPath) {
    // Load the weapon model (to be implemented)
    this.model = new THREE.Group(); // Placeholder
  }
  
  canFire() {
    if (this.isReloading) return false;
    if (this.ammo <= 0) return false;
    
    const now = performance.now();
    const timeSinceLastFire = (now - this.lastFireTime) / 1000;
    return timeSinceLastFire >= 1 / this.fireRate;
  }
  
  fire(camera, scene) {
    if (!this.canFire()) {
      if (this.ammo <= 0 && this.emptySound) {
        // Play empty sound
      }
      return false;
    }
    
    this.lastFireTime = performance.now();
    this.ammo--;
    
    if (this.shootSound) {
      // Play shoot sound
    }
    
    // Create bullet raycaster with accuracy deviation
    const raycaster = new THREE.Raycaster();
    const spread = (1 - this.accuracy) * 0.1; // Convert accuracy to spread
    
    // Add random spread to the shot direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.normalize();
    
    raycaster.set(camera.position, direction);
    
    // Apply recoil
    // TODO: Implement recoil effect
    
    return true;
  }
  
  reload() {
    if (this.isReloading || this.ammo === this.maxAmmo) return;
    
    this.isReloading = true;
    if (this.reloadSound) {
      // Play reload sound
    }
    
    setTimeout(() => {
      this.ammo = this.maxAmmo;
      this.isReloading = false;
    }, this.reloadTime * 1000);
  }
  
  update(delta) {
    // Update weapon state, animations, etc.
  }
}

// Define some weapon presets
export const WEAPON_PRESETS = {
  PISTOL: {
    name: 'Pistol',
    damage: 15,
    range: 50,
    fireRate: 2,
    ammo: 12,
    maxAmmo: 12,
    accuracy: 0.9,
    recoil: 0.1,
    reloadTime: 1.5
  },
  SHOTGUN: {
    name: 'Shotgun',
    damage: 80,
    range: 20,
    fireRate: 1,
    ammo: 6,
    maxAmmo: 6,
    accuracy: 0.7,
    recoil: 0.4,
    reloadTime: 2.5
  },
  RIFLE: {
    name: 'Assault Rifle',
    damage: 25,
    range: 100,
    fireRate: 8,
    ammo: 30,
    maxAmmo: 30,
    accuracy: 0.85,
    recoil: 0.2,
    reloadTime: 2
  }
};

export { Weapon }; 