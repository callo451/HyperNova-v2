import { Weapon } from '../weapons/Weapon.js';

class Inventory {
  constructor() {
    this.weapons = [];
    this.currentWeaponIndex = -1;
    this.maxWeapons = 3;
    
    // Create UI elements
    this.createUI();
  }
  
  createUI() {
    // Create inventory UI container
    const container = document.createElement('div');
    container.id = 'inventory';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: row;
      gap: 10px;
      color: #0ff;
      text-shadow: 0 0 5px #0ff;
      font-family: monospace;
      z-index: 100;
    `;
    
    // Create weapon slots
    this.weaponSlots = [];
    for (let i = 0; i < this.maxWeapons; i++) {
      const slot = document.createElement('div');
      slot.className = 'weapon-slot';
      slot.style.cssText = `
        padding: 5px 10px;
        padding-top: 15px;
        border: 1px solid #0ff;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        min-width: 120px;
        text-align: center;
        position: relative;
      `;
      slot.textContent = 'Empty';
      
      // Add key number indicator
      const keyIndicator = document.createElement('div');
      keyIndicator.style.cssText = `
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: #0ff;
        color: #000;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      `;
      keyIndicator.textContent = (i + 1).toString();
      slot.appendChild(keyIndicator);
      
      this.weaponSlots.push(slot);
      container.appendChild(slot);
    }
    
    // Create ammo display
    this.ammoDisplay = document.createElement('div');
    this.ammoDisplay.id = 'ammo-display';
    this.ammoDisplay.style.cssText = `
      position: absolute;
      bottom: -20px;
      left: 0;
      width: 100%;
      text-align: center;
      font-size: 1.2em;
    `;
    container.appendChild(this.ammoDisplay);
    
    document.body.appendChild(container);
  }
  
  addWeapon(weaponConfig) {
    if (this.weapons.length >= this.maxWeapons) {
      return false;
    }
    
    const weapon = new Weapon(weaponConfig);
    this.weapons.push(weapon);
    
    // If this is our first weapon, equip it
    if (this.currentWeaponIndex === -1) {
      this.currentWeaponIndex = 0;
    }
    
    this.updateUI();
    return true;
  }
  
  getCurrentWeapon() {
    if (this.currentWeaponIndex === -1) return null;
    return this.weapons[this.currentWeaponIndex];
  }
  
  switchWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return;
    this.currentWeaponIndex = index;
    this.updateUI();
  }
  
  nextWeapon() {
    if (this.weapons.length === 0) return;
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
    this.updateUI();
  }
  
  previousWeapon() {
    if (this.weapons.length === 0) return;
    this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
    this.updateUI();
  }
  
  updateUI() {
    // Update weapon slots
    for (let i = 0; i < this.maxWeapons; i++) {
      const slot = this.weaponSlots[i];
      const weapon = this.weapons[i];
      
      if (weapon) {
        slot.textContent = weapon.name;
        if (i === this.currentWeaponIndex) {
          slot.style.border = '2px solid #0ff';
          slot.style.boxShadow = '0 0 10px #0ff';
          slot.style.backgroundColor = 'rgba(0, 150, 255, 0.3)';
        } else {
          slot.style.border = '1px solid #0ff';
          slot.style.boxShadow = 'none';
          slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        }
      } else {
        slot.textContent = 'Empty';
        slot.style.border = '1px solid #0ff';
        slot.style.boxShadow = 'none';
        slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      }
    }
    
    // Update ammo display
    const currentWeapon = this.getCurrentWeapon();
    if (currentWeapon) {
      this.ammoDisplay.textContent = `${currentWeapon.ammo}/${currentWeapon.maxAmmo}`;
    } else {
      this.ammoDisplay.textContent = '';
    }
  }
}

export { Inventory }; 