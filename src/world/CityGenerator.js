import * as THREE from 'three';
import { loadingManager } from '../game/LoadingManager.js';
import { Billboard } from './Billboard.js';

class CityGenerator {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    
    // City parameters
    this.gridSize = 10; // 10x10 city blocks
    this.blockSize = 20; // Size of each city block
    this.roadWidth = 10; // Width of roads
    this.sidewalkWidth = 2; // Width of sidewalks
    this.sidewalkHeight = 0.2; // Height of sidewalks
    
    // Building parameters
    this.minBuildingHeight = 10;
    this.maxBuildingHeight = 80;
    this.minBuildingWidth = 8;
    this.maxBuildingWidth = 15;
    
    // Collections
    this.buildings = [];
    this.roads = [];
    this.props = [];
    this.collidableObjects = [];
    this.roadNetwork = [];
    this.neonLights = []; // Track all neon lights separately
    
    // LOD groups - simplified to just two groups for better visibility
    this.lodGroups = {
      near: new THREE.Group(),
      far: new THREE.Group()
    };
    
    // Add LOD groups to scene
    this.scene.add(this.lodGroups.near);
    this.scene.add(this.lodGroups.far);
    
    // Instancing for common objects
    this.setupInstancedMeshes();
  }
  
  setupInstancedMeshes() {
    // Streetlight geometry
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const lightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    
    // Create instanced mesh for streetlights
    this.streetlightInstances = new THREE.InstancedMesh(
      poleGeometry,
      this.materials.buildingMaterial,
      this.gridSize * this.gridSize * 4 // Maximum number of streetlights
    );
    
    this.streetlightLampInstances = new THREE.InstancedMesh(
      lightGeometry,
      this.materials.getRandomNeonMaterial(),
      this.gridSize * this.gridSize * 4
    );
    
    this.streetlightInstances.count = 0;
    this.streetlightLampInstances.count = 0;
    
    this.lodGroups.near.add(this.streetlightInstances);
    this.lodGroups.near.add(this.streetlightLampInstances);
  }
  
  async generate() {
    // Create a ground plane first
    this.createGroundPlane();
    
    // Create sky with stars and moon
    this.createSky();
    
    // Generate city layout
    this.generateCityGrid();
    
    // Generate buildings
    this.generateBuildings();
    
    // Generate roads
    this.generateRoads();
    
    // Generate props (streetlights, billboards, etc.)
    this.generateProps();
    
    // Add world boundaries
    this.createWorldBoundaries();
    
    // Ensure all materials are properly initialized
    this.initializeMaterials();
    
    // Return a promise that resolves when the city is generated
    return Promise.resolve();
  }
  
  createGroundPlane() {
    // Create a large ground plane that covers the entire city
    const groundSize = (this.gridSize + 4) * (this.blockSize + this.roadWidth); // Increased size
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1,
      // Ensure ground is rendered properly
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 3,
      polygonOffsetUnits: 3
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.1; // Position ground lower to avoid z-fighting
    ground.receiveShadow = true;
    ground.renderOrder = -10; // Ensure ground renders first with a much lower render order
    ground.userData.isGround = true; // Mark as ground for collision detection
    
    this.scene.add(ground);
    this.collidableObjects.push(ground);
  }
  
  createSky() {
    // Create a large sphere for the sky
    const skyRadius = 500;
    const skyGeometry = new THREE.SphereGeometry(skyRadius, 32, 32);
    
    // Create a canvas for the sky texture
    const canvas = document.createElement('canvas');
    const size = 2048;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    
    // Fill with dark blue/black gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#000022');
    gradient.addColorStop(1, '#000011');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Store star data for animation
    this.stars = [];
    
    // Add stars
    const starCount = 2000;
    const starSizes = [1, 1, 1, 1, 2, 2, 3]; // More small stars than large ones
    
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const starSize = starSizes[Math.floor(Math.random() * starSizes.length)];
      
      // Random star brightness
      const brightness = 0.5 + Math.random() * 0.5;
      const alpha = brightness * 0.9;
      
      // Random star color (mostly white, but some colored stars)
      let color;
      const colorRoll = Math.random();
      if (colorRoll > 0.9) {
        // Blue-ish star
        color = `rgba(150, 170, 255, ${alpha})`;
      } else if (colorRoll > 0.8) {
        // Red-ish star
        color = `rgba(255, 170, 150, ${alpha})`;
      } else if (colorRoll > 0.7) {
        // Yellow-ish star
        color = `rgba(255, 255, 200, ${alpha})`;
      } else {
        // White star
        color = `rgba(255, 255, 255, ${alpha})`;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, starSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow to some stars
      if (Math.random() > 0.95) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, starSize * 4);
        glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.5})`);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, starSize * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Store star data for twinkling animation
      if (Math.random() > 0.7) { // Only some stars twinkle
        this.stars.push({
          x,
          y,
          size: starSize,
          color: colorRoll > 0.7 ? colorRoll : 0, // Store color type
          alpha,
          twinkleSpeed: 0.5 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2 // Random starting phase
        });
      }
    }
    
    // Create texture from canvas
    const skyTexture = new THREE.CanvasTexture(canvas);
    this.skyTexture = skyTexture;
    this.skyCanvas = canvas;
    this.skyContext = ctx;
    
    // Create material with the texture on the inside of the sphere
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide // Render on the inside of the sphere
    });
    
    // Create sky mesh
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.sky = sky;
    this.scene.add(sky);
    
    // Add moon
    this.createMoon();
  }
  
  createMoon() {
    // Create moon geometry
    const moonRadius = 15;
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 32, 32);
    
    // Create moon material with emissive properties
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xccccff,
      emissiveIntensity: 1.5,
      roughness: 0.5,
      metalness: 0
    });
    
    // Create moon mesh
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // Position moon in the sky
    moon.position.set(150, 200, -200);
    this.scene.add(moon);
    
    // Add moon light (directional light) - significantly increased intensity
    const moonLight = new THREE.DirectionalLight(0xccccff, 3.5);
    moonLight.position.copy(moon.position);
    moonLight.castShadow = true;
    
    // Configure shadow properties for better performance and quality
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 500;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    
    // Adjust shadow bias to reduce shadow acne
    moonLight.shadow.bias = -0.001;
    
    // Reduce shadow darkness to make shadows more subtle
    moonLight.shadow.normalBias = 0.02;
    
    this.scene.add(moonLight);
    
    // Add subtle moon glow - increased intensity and range
    const moonGlow = new THREE.PointLight(0xccccff, 4, 600);
    moonGlow.position.copy(moon.position);
    this.scene.add(moonGlow);
    
    // Add a hemisphere light to simulate sky reflection - increased intensity
    const hemiLight = new THREE.HemisphereLight(0x8080ff, 0x202040, 1.0);
    this.scene.add(hemiLight);
    
    // Add a secondary moon light to fill shadows
    const secondaryMoonLight = new THREE.DirectionalLight(0xaaaaff, 1.0);
    // Position it at a different angle to fill shadows
    secondaryMoonLight.position.set(-moon.position.x * 0.5, moon.position.y * 0.7, -moon.position.z * 0.5);
    secondaryMoonLight.castShadow = false; // No shadows from this light for performance
    this.scene.add(secondaryMoonLight);
  }
  
  generateCityGrid() {
    // Create a grid of city blocks
    this.cityGrid = [];
    
    for (let x = 0; x < this.gridSize; x++) {
      this.cityGrid[x] = [];
      for (let z = 0; z < this.gridSize; z++) {
        // Each cell contains information about what's in this block
        this.cityGrid[x][z] = {
          type: Math.random() < 0.8 ? 'building' : 'plaza',
          x: x,
          z: z,
          worldX: (x - this.gridSize / 2) * (this.blockSize + this.roadWidth),
          worldZ: (z - this.gridSize / 2) * (this.blockSize + this.roadWidth)
        };
      }
    }
  }
  
  generateBuildings() {
    // Create buildings based on the city grid
    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const cell = this.cityGrid[x][z];
        
        if (cell.type === 'building') {
          this.generateBuildingBlock(cell);
        } else if (cell.type === 'plaza') {
          this.generatePlaza(cell);
        }
      }
    }
  }
  
  generateBuildingBlock(cell) {
    // Generate a block of buildings
    const blockX = cell.worldX;
    const blockZ = cell.worldZ;
    
    // Determine how many buildings to place in this block
    const buildingCount = 1 + Math.floor(Math.random() * 3);
    
    // Available space in the block
    const availableWidth = this.blockSize - this.sidewalkWidth * 2;
    const availableDepth = this.blockSize - this.sidewalkWidth * 2;
    
    // Generate buildings
    for (let i = 0; i < buildingCount; i++) {
      // Determine building size
      const width = this.minBuildingWidth + Math.random() * (this.maxBuildingWidth - this.minBuildingWidth);
      const depth = this.minBuildingWidth + Math.random() * (this.maxBuildingWidth - this.minBuildingWidth);
      const height = this.minBuildingHeight + Math.random() * (this.maxBuildingHeight - this.minBuildingHeight);
      
      // Determine building position within the block
      let x, z;
      
      if (buildingCount === 1) {
        // Center the building in the block
        x = blockX;
        z = blockZ;
      } else {
        // Randomly position the building within the block
        x = blockX + (Math.random() - 0.5) * (availableWidth - width);
        z = blockZ + (Math.random() - 0.5) * (availableDepth - depth);
      }
      
      // Create the building
      this.createBuilding(x, z, width, depth, height);
    }
    
    // Create sidewalks around the block
    this.createSidewalk(blockX, blockZ);
  }
  
  createBuilding(x, z, width, depth, height) {
    // Create building geometry
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Create building mesh
    const building = new THREE.Mesh(geometry, this.materials.buildingMaterial);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    
    // Mark as building for mini-map
    building.userData.isBuilding = true;
    
    // Add to scene
    this.lodGroups.near.add(building);
    
    // Add to buildings array
    this.buildings.push(building);
    
    // Add to collidable objects
    this.collidableObjects.push(building);
    
    // Add windows and neon details
    this.addBuildingDetails(building, width, height, depth);
    
    return building;
  }
  
  addBuildingDetails(building, width, height, depth) {
    // Add windows
    const windowSize = 0.8;
    const windowSpacing = 2;
    const windowRows = Math.floor(height / windowSpacing);
    const windowColsWidth = Math.floor(width / windowSpacing);
    const windowColsDepth = Math.floor(depth / windowSpacing);
    
    // Window geometry
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    
    // Create window groups for each side of the building
    const sides = [
      { direction: new THREE.Vector3(1, 0, 0), rotation: [0, Math.PI / 2, 0], dimensions: [depth, height] },
      { direction: new THREE.Vector3(-1, 0, 0), rotation: [0, -Math.PI / 2, 0], dimensions: [depth, height] },
      { direction: new THREE.Vector3(0, 0, 1), rotation: [0, 0, 0], dimensions: [width, height] },
      { direction: new THREE.Vector3(0, 0, -1), rotation: [0, Math.PI, 0], dimensions: [width, height] }
    ];
    
    // For each side of the building
    sides.forEach(side => {
      const windowCols = Math.floor(side.dimensions[0] / windowSpacing);
      
      // Create windows
      for (let row = 1; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          // Skip some windows randomly
          if (Math.random() < 0.3) continue;
          
          // Calculate window position
          const x = (col - windowCols / 2 + 0.5) * windowSpacing;
          const y = (row - windowRows / 2 + 0.5) * windowSpacing;
          
          // Create window
          const window = new THREE.Mesh(windowGeometry, this.materials.windowMaterial);
          window.position.set(0, y, 0);
          window.rotation.set(...side.rotation);
          
          // Position window on the correct side of the building
          if (side.direction.x !== 0) {
            window.position.x = side.direction.x * (width / 2 + 0.01);
            window.position.z = x;
          } else {
            window.position.z = side.direction.z * (depth / 2 + 0.01);
            window.position.x = x;
          }
          
          // Add window to building
          building.add(window);
        }
      }
    });
    
    // Add neon sign to some buildings
    if (Math.random() < 0.4 && height > 20) {
      const signWidth = width * 0.6;
      const signHeight = 3;
      const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, 0.5);
      const signMaterial = this.materials.getRandomNeonMaterial();
      
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      sign.position.set(0, height / 2 + signHeight / 2 + 1, 0);
      
      // Randomly position on front or side
      if (Math.random() < 0.5) {
        sign.position.z = depth / 2 + 0.3;
      } else {
        sign.rotation.y = Math.PI / 2;
        sign.position.x = width / 2 + 0.3;
      }
      
      building.add(sign);
      
      // Create a separate copy of the sign for the far LOD group to ensure visibility at distance
      const farSign = new THREE.Mesh(signGeometry, signMaterial.clone());
      farSign.position.copy(sign.position.clone().add(building.position));
      farSign.rotation.copy(sign.rotation);
      if (sign.rotation.y === Math.PI / 2) {
        farSign.rotation.y = Math.PI / 2;
      }
      this.lodGroups.far.add(farSign);
      this.neonLights.push(farSign);
    }
    
    // Add neon strips to some buildings
    if (Math.random() < 0.6) {
      const stripWidth = 0.3;
      const stripGeometry = new THREE.BoxGeometry(stripWidth, height * 0.8, stripWidth);
      const stripMaterial = this.materials.getRandomNeonMaterial();
      
      // Number of strips
      const stripCount = 1 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < stripCount; i++) {
        const strip = new THREE.Mesh(stripGeometry, stripMaterial);
        
        // Position strip on a corner or edge
        const xPos = (Math.random() < 0.5 ? -1 : 1) * (width / 2 - stripWidth / 2);
        const zPos = (Math.random() < 0.5 ? -1 : 1) * (depth / 2 - stripWidth / 2);
        
        strip.position.set(xPos, 0, zPos);
        building.add(strip);
        
        // Create a separate copy of the strip for the far LOD group
        const farStrip = new THREE.Mesh(stripGeometry, stripMaterial.clone());
        farStrip.position.copy(strip.position.clone().add(building.position));
        this.lodGroups.far.add(farStrip);
        this.neonLights.push(farStrip);
      }
    }
  }
  
  createSidewalk(blockX, blockZ) {
    // Create sidewalk around the block
    const sidewalkGeometry = new THREE.BoxGeometry(
      this.blockSize + this.sidewalkWidth * 2,
      this.sidewalkHeight,
      this.blockSize + this.sidewalkWidth * 2
    );
    
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2,
      // Ensure sidewalk is rendered properly
      depthWrite: true
    });
    
    const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
    
    // Position sidewalk clearly above road level
    sidewalk.position.set(blockX, this.sidewalkHeight / 2 + 0.06, blockZ); 
    sidewalk.receiveShadow = true;
    sidewalk.userData.isSidewalk = true; // Mark as sidewalk for collision detection
    
    this.lodGroups.near.add(sidewalk);
    this.collidableObjects.push(sidewalk);
  }
  
  generatePlaza(cell) {
    // Generate a plaza (open area)
    const plazaX = cell.worldX;
    const plazaZ = cell.worldZ;
    
    // Create plaza floor
    const plazaGeometry = new THREE.BoxGeometry(this.blockSize, 0.1, this.blockSize);
    const plaza = new THREE.Mesh(plazaGeometry, this.materials.sidewalkMaterial);
    plaza.position.set(plazaX, 0.05, plazaZ);
    plaza.receiveShadow = true;
    
    this.lodGroups.near.add(plaza);
    this.collidableObjects.push(plaza);
    
    // Add some decorative elements to the plaza
    this.addPlazaDecorations(plazaX, plazaZ);
  }
  
  addPlazaDecorations(x, z) {
    // Add a central feature
    if (Math.random() < 0.7) {
      // Create a central holographic display
      const hologramRadius = 2 + Math.random() * 3;
      const hologramHeight = 5 + Math.random() * 10;
      
      const baseGeometry = new THREE.CylinderGeometry(hologramRadius * 0.8, hologramRadius, 0.5, 16);
      const base = new THREE.Mesh(baseGeometry, this.materials.buildingMaterial);
      base.position.set(x, 0.25, z);
      this.lodGroups.near.add(base);
      this.collidableObjects.push(base);
      
      const hologramGeometry = new THREE.CylinderGeometry(hologramRadius * 0.5, hologramRadius * 0.5, hologramHeight, 16, 1, true);
      const hologram = new THREE.Mesh(hologramGeometry, this.materials.hologramMaterial);
      hologram.position.set(x, hologramHeight / 2 + 0.5, z);
      this.lodGroups.near.add(hologram);
      
      // Add animation data to the hologram
      hologram.userData = {
        rotationSpeed: 0.2 + Math.random() * 0.5,
        pulseSpeed: 0.5 + Math.random() * 1.0,
        time: 0
      };
      
      // Add update method
      hologram.update = function(deltaTime) {
        this.userData.time += deltaTime;
        this.rotation.y += this.userData.rotationSpeed * deltaTime;
        
        // Pulse effect
        const scale = 0.9 + 0.2 * Math.sin(this.userData.time * this.userData.pulseSpeed);
        this.scale.set(scale, 1, scale);
        
        // Update material opacity
        if (this.material) {
          this.material.opacity = 0.5 + 0.3 * Math.sin(this.userData.time * this.userData.pulseSpeed * 0.5);
        }
      };
      
      this.props.push(hologram);
    }
    
    // Add some benches or small structures
    const decorationCount = 2 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < decorationCount; i++) {
      const offsetX = (Math.random() - 0.5) * (this.blockSize * 0.7);
      const offsetZ = (Math.random() - 0.5) * (this.blockSize * 0.7);
      
      // Create a bench or small structure
      if (Math.random() < 0.5) {
        // Bench
        const benchGeometry = new THREE.BoxGeometry(2, 0.4, 0.8);
        const bench = new THREE.Mesh(benchGeometry, this.materials.buildingMaterial);
        bench.position.set(x + offsetX, 0.2, z + offsetZ);
        this.lodGroups.near.add(bench);
        this.collidableObjects.push(bench);
      } else {
        // Small kiosk or structure
        const kioskWidth = 1.5 + Math.random();
        const kioskDepth = 1.5 + Math.random();
        const kioskHeight = 2 + Math.random() * 1.5;
        
        const kioskGeometry = new THREE.BoxGeometry(kioskWidth, kioskHeight, kioskDepth);
        const kiosk = new THREE.Mesh(kioskGeometry, this.materials.buildingMaterial);
        kiosk.position.set(x + offsetX, kioskHeight / 2, z + offsetZ);
        this.lodGroups.near.add(kiosk);
        this.collidableObjects.push(kiosk);
        
        // Add neon sign to kiosk
        const signGeometry = new THREE.PlaneGeometry(kioskWidth * 0.8, 0.6);
        const signMaterial = this.materials.getRandomNeonMaterial();
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, kioskHeight / 2 - 0.5, kioskDepth / 2 + 0.01);
        kiosk.add(sign);
      }
    }
    
    // Add a billboard
    if (Math.random() < 0.5) {
      const billboard = new Billboard(this.materials);
      billboard.position.set(x + (Math.random() - 0.5) * (this.blockSize * 0.6), 0, z + (Math.random() - 0.5) * (this.blockSize * 0.6));
      this.lodGroups.near.add(billboard);
      this.props.push(billboard);
      this.collidableObjects.push(billboard);
    }
  }
  
  generateRoads() {
    // Generate roads between city blocks
    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const cell = this.cityGrid[x][z];
        
        // Create horizontal road (along X axis)
        if (z < this.gridSize - 1) {
          this.createRoad(
            cell.worldX,
            cell.worldZ + this.blockSize / 2 + this.roadWidth / 2,
            this.blockSize,
            this.roadWidth,
            true
          );
        }
        
        // Create vertical road (along Z axis)
        if (x < this.gridSize - 1) {
          this.createRoad(
            cell.worldX + this.blockSize / 2 + this.roadWidth / 2,
            cell.worldZ,
            this.roadWidth,
            this.blockSize,
            false
          );
        }
      }
    }
  }
  
  createRoad(x, z, width, depth, isHorizontal) {
    // Create road geometry
    const roadGeometry = new THREE.PlaneGeometry(width, depth, 1, 1);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1,
      // Ensure road is rendered properly
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    
    // Position road clearly above ground to prevent z-fighting
    road.position.set(x, 0, z);
    road.position.y = 0.05; // Increased height above ground
    
    road.receiveShadow = true;
    road.renderOrder = -5; // Set render order between ground and other objects
    
    // Add a flag to identify this as a road
    road.userData.isRoad = true;
    
    this.lodGroups.near.add(road);
    this.roads.push(road);
    
    // Add road to road network for vehicle pathfinding
    this.roadNetwork.push({
      start: new THREE.Vector3(
        isHorizontal ? x - width / 2 : x,
        0,
        isHorizontal ? z : z - depth / 2
      ),
      end: new THREE.Vector3(
        isHorizontal ? x + width / 2 : x,
        0,
        isHorizontal ? z : z + depth / 2
      ),
      isHorizontal: isHorizontal
    });
    
    // Add road markings
    this.addRoadMarkings(x, z, width, depth, isHorizontal);
  }
  
  addRoadMarkings(x, z, width, depth, isHorizontal) {
    // Instead of creating separate geometry for road markings,
    // we'll create a texture-based marking that's part of the road
    
    // Create a canvas texture for the road marking
    const canvas = document.createElement('canvas');
    const size = 512; // Texture size
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    
    // Fill with road color (dark gray)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, size, size);
    
    // Draw road marking (center line)
    ctx.fillStyle = '#00ffff'; // Cyan color for neon effect
    
    if (isHorizontal) {
      // Horizontal road - draw vertical line in the middle
      const lineWidth = size * 0.02; // 2% of texture width
      const x = (size - lineWidth) / 2;
      ctx.fillRect(x, 0, lineWidth, size);
    } else {
      // Vertical road - draw horizontal line in the middle
      const lineWidth = size * 0.02; // 2% of texture height
      const y = (size - lineWidth) / 2;
      ctx.fillRect(0, y, size, lineWidth);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Find the road we just created and update its material
    const lastRoad = this.roads[this.roads.length - 1];
    
    // Create a new material with the texture
    const roadMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Apply the new material
    lastRoad.material = roadMaterial;
  }
  
  generateProps() {
    // Add streetlights
    this.addStreetlights();
    
    // Add neon signs to buildings
    this.addNeonSigns();
    
    // Add billboards to buildings instead of floating ones
    this.addBuildingBillboards();
    
    // Add additional side billboards to more buildings
    this.addSideBillboards();
    
    // Remove any billboards that are still too close to the ground
    this.cleanupBillboards();
    
    // Add misc props
    this.addMiscProps();
  }
  
  addStreetlights() {
    // Add streetlights at intersections and along roads
    const matrix = new THREE.Matrix4();
    let instanceCount = 0;
    
    // For each city block
    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const cell = this.cityGrid[x][z];
        
        // Add streetlights at the corners of each block
        const corners = [
          { x: -this.blockSize / 2 - this.roadWidth / 2, z: -this.blockSize / 2 - this.roadWidth / 2 },
          { x: this.blockSize / 2 + this.roadWidth / 2, z: -this.blockSize / 2 - this.roadWidth / 2 },
          { x: -this.blockSize / 2 - this.roadWidth / 2, z: this.blockSize / 2 + this.roadWidth / 2 },
          { x: this.blockSize / 2 + this.roadWidth / 2, z: this.blockSize / 2 + this.roadWidth / 2 }
        ];
        
        for (const corner of corners) {
          // Skip some corners randomly
          if (Math.random() < 0.3) continue;
          
          // Position for the streetlight
          const streetlightX = cell.worldX + corner.x;
          const streetlightZ = cell.worldZ + corner.z;
          
          // Set matrix for instanced mesh
          matrix.setPosition(streetlightX, 2.5, streetlightZ);
          this.streetlightInstances.setMatrixAt(instanceCount, matrix);
          
          // Set matrix for lamp
          matrix.setPosition(streetlightX, 5, streetlightZ);
          this.streetlightLampInstances.setMatrixAt(instanceCount, matrix);
          
          instanceCount++;
        }
      }
    }
    
    // Update instance counts
    this.streetlightInstances.count = instanceCount;
    this.streetlightLampInstances.count = instanceCount;
    
    // Update instance matrices
    this.streetlightInstances.instanceMatrix.needsUpdate = true;
    this.streetlightLampInstances.instanceMatrix.needsUpdate = true;
  }
  
  addNeonSigns() {
    // Select a percentage of buildings to add neon signs to
    const buildingsWithNeonSigns = Math.floor(this.buildings.length * 0.3); // 30% of buildings get neon signs
    
    // Shuffle the buildings array to randomize which buildings get neon signs
    const shuffledBuildings = [...this.buildings].sort(() => Math.random() - 0.5);
    
    // Add neon signs to the selected buildings
    for (let i = 0; i < buildingsWithNeonSigns; i++) {
      const building = shuffledBuildings[i];
      
      // Get building dimensions
      const width = building.geometry.parameters.width;
      const height = building.geometry.parameters.height;
      const depth = building.geometry.parameters.depth;
      
      // Create a neon sign for better visibility
      const signWidth = width * 0.6;
      const signHeight = 3;
      const signGeometry = new THREE.BoxGeometry(signWidth, signHeight, 0.5);
      const signMaterial = this.materials.getRandomNeonMaterial();
      
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      
      // Position the sign on top of the building or on the side
      if (Math.random() < 0.6) {
        // Place on top of the building
        sign.position.set(0, height / 2 + 0.5, 0);
        
        // Random rotation on top
        sign.rotation.y = Math.random() * Math.PI * 2;
      } else {
        // Place on the side of the building
        const side = Math.floor(Math.random() * 4);
        
        switch (side) {
          case 0: // Front
            sign.position.set(0, height * 0.7, depth / 2 + 0.5);
            sign.rotation.y = 0;
            break;
          case 1: // Back
            sign.position.set(0, height * 0.7, -depth / 2 - 0.5);
            sign.rotation.y = Math.PI;
            break;
          case 2: // Left
            sign.position.set(-width / 2 - 0.5, height * 0.7, 0);
            sign.rotation.y = -Math.PI / 2;
            break;
          case 3: // Right
            sign.position.set(width / 2 + 0.5, height * 0.7, 0);
            sign.rotation.y = Math.PI / 2;
            break;
        }
      }
      
      // Add the sign to the building
      building.add(sign);
      
      // Add to props array for updates
      this.props.push(sign);
    }
  }
  
  addBuildingBillboards() {
    // Select a percentage of buildings to add billboards to
    const buildingsWithBillboards = Math.floor(this.buildings.length * 0.3); // 30% of buildings get billboards
    
    // Shuffle the buildings array to randomize which buildings get billboards
    const shuffledBuildings = [...this.buildings].sort(() => Math.random() - 0.5);
    
    // Add billboards to the selected buildings
    for (let i = 0; i < buildingsWithBillboards; i++) {
      const building = shuffledBuildings[i];
      
      // Skip very small buildings to avoid ground placement issues
      if (building.geometry.parameters.height < 15) continue;
      
      // Get building dimensions
      const width = building.geometry.parameters.width;
      const height = building.geometry.parameters.height;
      const depth = building.geometry.parameters.depth;
      
      // Create a larger billboard for better visibility
      const billboard = new Billboard(this.materials);
      
      // Scale up the billboard to be more visible, but ensure it's not too large for the building
      const maxScale = Math.min(1.5, width / 8, height / 8);
      const scale = Math.max(0.8, maxScale);
      billboard.scale.set(scale, scale, scale);
      
      // Calculate the actual size of the billboard after scaling
      const billboardWidth = (5 + Math.random() * 5) * scale; // Based on Billboard.js dimensions
      const billboardHeight = (3 + Math.random() * 3) * scale;
      
      // Position the billboard on top of the building or on the side
      // Reduce probability of top placement to just 10% - prefer sides for better visibility
      if (Math.random() < 0.1 && height > 20) {
        // Place on top of the building - ensure it's properly positioned
        billboard.position.set(0, height / 2 + 1.0, 0); // Increased offset to prevent intersection
        
        // Random rotation on top
        billboard.rotation.y = Math.random() * Math.PI * 2;
      } else {
        // Place on the side of the building
        // For taller buildings, place billboards at different heights, but prioritize lower positions
        let heightPosition;
        
        if (height > 30) {
          // For tall buildings, place at various heights with emphasis on lower positions
          // Prioritize lower positions for better visibility from street level
          const heightOptions = [
            height * 0.15,  // Very low (just above ground level)
            height * 0.25,  // Low
            height * 0.35,  // Lower-middle
            height * 0.5,   // Middle (less common)
          ];
          
          // Weight the options to favor lower positions
          const randomValue = Math.random();
          if (randomValue < 0.4) {
            heightPosition = heightOptions[0]; // 40% chance for very low
          } else if (randomValue < 0.7) {
            heightPosition = heightOptions[1]; // 30% chance for low
          } else if (randomValue < 0.9) {
            heightPosition = heightOptions[2]; // 20% chance for lower-middle
          } else {
            heightPosition = heightOptions[3]; // 10% chance for middle
          }
        } else {
          // For shorter buildings, place in the lower half
          heightPosition = height * (0.2 + Math.random() * 0.3); // 20-50% of height
        }
        
        // Ensure minimum height from ground to avoid ground placement
        // Increased minimum height to prevent any chance of ground intersection
        const minHeight = Math.max(billboardHeight / 2 + 2, 7); // At least 7 units or half billboard height + 2
        heightPosition = Math.max(heightPosition, minHeight);
        
        // Ensure the billboard doesn't extend beyond the building's height
        heightPosition = Math.min(heightPosition, height - billboardHeight/2);
        
        const side = Math.floor(Math.random() * 4);
        
        // Offset from building to prevent intersection
        const offset = 1.0; // Increased from 0.5 to ensure no intersection
        
        switch (side) {
          case 0: // Front
            billboard.position.set(0, heightPosition, depth / 2 + offset);
            billboard.rotation.y = 0;
            break;
          case 1: // Back
            billboard.position.set(0, heightPosition, -depth / 2 - offset);
            billboard.rotation.y = Math.PI;
            break;
          case 2: // Left
            billboard.position.set(-width / 2 - offset, heightPosition, 0);
            billboard.rotation.y = -Math.PI / 2;
            break;
          case 3: // Right
            billboard.position.set(width / 2 + offset, heightPosition, 0);
            billboard.rotation.y = Math.PI / 2;
            break;
        }
        
        // For very tall buildings (skyscrapers), add multiple billboards on the same side
        // Only if there's enough space to avoid overlapping
        if (height > 50 && Math.random() < 0.4) {
          // Calculate a safe distance for the second billboard
          // Place the second billboard higher up
          const secondHeightPosition = Math.min(height * 0.6, height - billboardHeight/2);
          
          // Ensure minimum height from ground
          // Only add second billboard if there's enough vertical separation
          if (Math.abs(secondHeightPosition - heightPosition) > billboardHeight * 1.5) {
            const secondBillboard = new Billboard(this.materials);
            secondBillboard.scale.set(scale, scale, scale);
            
            switch (side) {
              case 0: // Front
                secondBillboard.position.set(0, secondHeightPosition, depth / 2 + offset);
                secondBillboard.rotation.y = 0;
                break;
              case 1: // Back
                secondBillboard.position.set(0, secondHeightPosition, -depth / 2 - offset);
                secondBillboard.rotation.y = Math.PI;
                break;
              case 2: // Left
                secondBillboard.position.set(-width / 2 - offset, secondHeightPosition, 0);
                secondBillboard.rotation.y = -Math.PI / 2;
                break;
              case 3: // Right
                secondBillboard.position.set(width / 2 + offset, secondHeightPosition, 0);
                secondBillboard.rotation.y = Math.PI / 2;
                break;
            }
            
            building.add(secondBillboard);
            this.props.push(secondBillboard);
          }
        }
      }
      
      // Add the billboard to the building
      building.add(billboard);
      
      // Add to props array for updates
      this.props.push(billboard);
    }
  }
  
  addSideBillboards() {
    // Select additional buildings for side billboards (different from the ones in addBuildingBillboards)
    // This will ensure more buildings have billboards on their sides
    const additionalBuildingsCount = Math.floor(this.buildings.length * 0.2); // 20% more buildings get side billboards
    
    // Shuffle the buildings array to randomize which buildings get billboards
    const shuffledBuildings = [...this.buildings].sort(() => Math.random() - 0.5);
    
    // Add side billboards to the selected buildings
    for (let i = 0; i < additionalBuildingsCount; i++) {
      const building = shuffledBuildings[i];
      
      // Skip very small buildings
      if (building.geometry.parameters.height < 15) continue;
      
      // Get building dimensions
      const width = building.geometry.parameters.width;
      const height = building.geometry.parameters.height;
      const depth = building.geometry.parameters.depth;
      
      // Create a billboard for the side
      const billboard = new Billboard(this.materials);
      
      // Scale the billboard based on building size, but ensure it's not too large
      const maxScale = Math.min(1.3, width / 8, height / 8);
      const scale = Math.max(0.8, maxScale);
      billboard.scale.set(scale, scale, scale);
      
      // Calculate the actual size of the billboard after scaling
      const billboardWidth = (5 + Math.random() * 5) * scale; // Based on Billboard.js dimensions
      const billboardHeight = (3 + Math.random() * 3) * scale;
      
      // Determine height position - prioritize lower positions for better visibility from street level
      let heightPosition;
      
      if (height > 40) {
        // For very tall buildings, use more varied positions but prioritize lower ones
        const positions = [
          height * 0.15,  // Very low (just above ground level)
          height * 0.25,  // Low
          height * 0.35,  // Lower-middle
          height * 0.5,   // Middle (less common)
        ];
        
        // Weight the options to favor lower positions
        const randomValue = Math.random();
        if (randomValue < 0.4) {
          heightPosition = positions[0]; // 40% chance for very low
        } else if (randomValue < 0.7) {
          heightPosition = positions[1]; // 30% chance for low
        } else if (randomValue < 0.9) {
          heightPosition = positions[2]; // 20% chance for lower-middle
        } else {
          heightPosition = positions[3]; // 10% chance for middle
        }
      } else {
        // For medium buildings, use lower positions
        heightPosition = height * (0.2 + Math.random() * 0.3); // 20-50% of height
      }
      
      // Ensure minimum height from ground to avoid ground placement
      // Increased minimum height to prevent any chance of ground intersection
      const minHeight = Math.max(billboardHeight / 2 + 2, 7); // At least 7 units or half billboard height + 2
      heightPosition = Math.max(heightPosition, minHeight);
      
      // Ensure the billboard doesn't extend beyond the building's height
      heightPosition = Math.min(heightPosition, height - billboardHeight/2);
      
      // Always place on the side (never on top)
      // Choose which side to place the billboard on
      const side = Math.floor(Math.random() * 4);
      
      // Offset from building to prevent intersection
      const offset = 1.0; // Increased from 0.5 to ensure no intersection
      
      switch (side) {
        case 0: // Front
          billboard.position.set(0, heightPosition, depth / 2 + offset);
          billboard.rotation.y = 0;
          break;
        case 1: // Back
          billboard.position.set(0, heightPosition, -depth / 2 - offset);
          billboard.rotation.y = Math.PI;
          break;
        case 2: // Left
          billboard.position.set(-width / 2 - offset, heightPosition, 0);
          billboard.rotation.y = -Math.PI / 2;
          break;
        case 3: // Right
          billboard.position.set(width / 2 + offset, heightPosition, 0);
          billboard.rotation.y = Math.PI / 2;
          break;
      }
      
      // Add the billboard to the building
      building.add(billboard);
      
      // Add to props array for updates
      this.props.push(billboard);
      
      // For wider buildings, add a second billboard on the same side but at a different position
      // Only if there's enough space to avoid overlapping
      if ((width > 12 || depth > 12) && Math.random() < 0.5) {
        // Calculate a safe horizontal offset
        let offsetX = 0;
        let offsetZ = 0;
        
        if (side === 0 || side === 1) {
          // Front or back - offset along X axis
          // Ensure the offset is large enough to prevent overlap
          const maxOffset = (width - billboardWidth) / 2 * 0.8; // 80% of available space
          if (maxOffset < billboardWidth) continue; // Skip if not enough space
          
          offsetX = (Math.random() - 0.5) * maxOffset;
        } else {
          // Left or right - offset along Z axis
          // Ensure the offset is large enough to prevent overlap
          const maxOffset = (depth - billboardWidth) / 2 * 0.8; // 80% of available space
          if (maxOffset < billboardWidth) continue; // Skip if not enough space
          
          offsetZ = (Math.random() - 0.5) * maxOffset;
        }
        
        // For the second billboard, place it at a similar height but with horizontal offset
        // This creates a row of billboards at similar heights for better visibility
        const secondHeightPosition = heightPosition + (Math.random() - 0.5) * 3; // Small vertical variation
        
        // Ensure minimum height from ground
        const secondMinHeight = Math.max(billboardHeight / 2 + 2, 7);
        const adjustedSecondHeight = Math.max(secondHeightPosition, secondMinHeight);
        
        // Ensure it doesn't extend beyond building height
        const finalSecondHeight = Math.min(adjustedSecondHeight, height - billboardHeight/2);
        
        // Only add second billboard if there's enough horizontal separation
        const secondBillboard = new Billboard(this.materials);
        secondBillboard.scale.set(scale, scale, scale);
        
        switch (side) {
          case 0: // Front
            secondBillboard.position.set(offsetX, finalSecondHeight, depth / 2 + offset);
            secondBillboard.rotation.y = 0;
            break;
          case 1: // Back
            secondBillboard.position.set(offsetX, finalSecondHeight, -depth / 2 - offset);
            secondBillboard.rotation.y = Math.PI;
            break;
          case 2: // Left
            secondBillboard.position.set(-width / 2 - offset, finalSecondHeight, offsetZ);
            secondBillboard.rotation.y = -Math.PI / 2;
            break;
          case 3: // Right
            secondBillboard.position.set(width / 2 + offset, finalSecondHeight, offsetZ);
            secondBillboard.rotation.y = Math.PI / 2;
            break;
        }
        
        building.add(secondBillboard);
        this.props.push(secondBillboard);
      }
    }
  }
  
  addMiscProps() {
    // This method is being removed - misc props are now handled in the addBuildingBillboards method
  }
  
  createWorldBoundaries() {
    // Calculate the city size
    const citySize = this.gridSize * (this.blockSize + this.roadWidth) / 2;
    const boundaryHeight = 50; // Height of the invisible walls
    const boundaryThickness = 5;
    
    // Create invisible walls around the city
    const wallGeometry = new THREE.BoxGeometry(boundaryThickness, boundaryHeight, citySize * 2 + boundaryThickness);
    const wallMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: 0.0 // Invisible
    });
    
    // North wall
    const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
    northWall.position.set(0, boundaryHeight / 2, -citySize - boundaryThickness / 2);
    this.scene.add(northWall);
    this.collidableObjects.push(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
    southWall.position.set(0, boundaryHeight / 2, citySize + boundaryThickness / 2);
    this.scene.add(southWall);
    this.collidableObjects.push(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(citySize * 2, boundaryHeight, boundaryThickness);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(citySize + boundaryThickness / 2, boundaryHeight / 2, 0);
    this.scene.add(eastWall);
    this.collidableObjects.push(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    westWall.position.set(-citySize - boundaryThickness / 2, boundaryHeight / 2, 0);
    this.scene.add(westWall);
    this.collidableObjects.push(westWall);
  }
  
  getCollidableObjects() {
    return this.collidableObjects;
  }
  
  getRoadNetwork() {
    return this.roadNetwork;
  }
  
  getRandomSpawnPoint() {
    // Try multiple times to find a valid spawn point
    const maxAttempts = 20;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Find a random road to spawn on
      const road = this.roadNetwork[Math.floor(Math.random() * this.roadNetwork.length)];
      
      // Get a random point along the road
      const t = Math.random();
      const spawnPoint = new THREE.Vector3();
      spawnPoint.lerpVectors(road.start, road.end, t);
      
      // Ensure the spawn point is within the city boundaries
      const citySize = this.gridSize * (this.blockSize + this.roadWidth) / 2;
      spawnPoint.x = Math.max(-citySize, Math.min(citySize, spawnPoint.x));
      spawnPoint.z = Math.max(-citySize, Math.min(citySize, spawnPoint.z));
      
      // Set the Y position to be exactly on the ground
      spawnPoint.y = 0.1; // Slightly above the ground
      
      // Calculate distance from center (0,0,0) to ensure it's within the safe zone
      const distanceFromCenter = Math.sqrt(spawnPoint.x * spawnPoint.x + spawnPoint.z * spawnPoint.z);
      
      // Check if the point is within the initial safe zone radius (using 140 to be safe)
      // and is a valid spawn point (not inside a building)
      if (distanceFromCenter < 140 && this.checkSpawnPointValid(spawnPoint)) {
        return spawnPoint;
      }
    }
    
    // If we couldn't find a valid point on roads within the safe zone, try the center of roads
    for (const roadSegment of this.roadNetwork) {
      const centerPoint = new THREE.Vector3();
      centerPoint.lerpVectors(roadSegment.start, roadSegment.end, 0.5);
      centerPoint.y = 0.1;
      
      // Calculate distance from center
      const distanceFromCenter = Math.sqrt(centerPoint.x * centerPoint.x + centerPoint.z * centerPoint.z);
      
      if (distanceFromCenter < 140 && this.checkSpawnPointValid(centerPoint)) {
        return centerPoint;
      }
    }
    
    // Fallback to a safe position near the center
    return new THREE.Vector3(
      (Math.random() * 40) - 20, // Random position within 20 units of center
      0.1,
      (Math.random() * 40) - 20
    );
  }
  
  checkSpawnPointValid(position) {
    // Check if the position is not inside any building
    const testPosition = position.clone();
    testPosition.y += 1; // Check at player height
    
    // Create a small sphere for testing
    const radius = 0.5;
    
    // Check against all buildings
    for (const building of this.buildings) {
      if (!building.geometry || !building.geometry.boundingBox) continue;
      
      const boundingBox = building.geometry.boundingBox.clone();
      boundingBox.applyMatrix4(building.matrixWorld);
      
      // Simple sphere-box collision check
      const closestPoint = new THREE.Vector3();
      closestPoint.x = Math.max(boundingBox.min.x, Math.min(testPosition.x, boundingBox.max.x));
      closestPoint.y = Math.max(boundingBox.min.y, Math.min(testPosition.y, boundingBox.max.y));
      closestPoint.z = Math.max(boundingBox.min.z, Math.min(testPosition.z, boundingBox.max.z));
      
      const distance = testPosition.distanceTo(closestPoint);
      
      if (distance < radius) {
        return false; // Collision detected, not a valid spawn point
      }
    }
    
    return true; // No collision, valid spawn point
  }
  
  // Method to update the sky (called from the animation loop)
  updateSky(deltaTime) {
    if (!this.stars || !this.skyContext || !this.skyCanvas || !this.skyTexture) return;
    
    // Only update every few frames to save performance
    this._skyUpdateCounter = (this._skyUpdateCounter || 0) + 1;
    if (this._skyUpdateCounter % 30 !== 0) return; // Update every 30 frames
    
    const ctx = this.skyContext;
    const canvas = this.skyCanvas;
    const size = canvas.width;
    
    // Get current time for animation
    const time = performance.now() / 1000;
    
    // Clear the canvas with the gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#000022');
    gradient.addColorStop(1, '#000011');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Redraw all stars
    for (const star of this.stars) {
      // Calculate twinkling effect
      const twinkle = 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.phase);
      const currentAlpha = star.alpha * twinkle;
      
      // Determine color based on stored color type
      let color;
      if (star.color > 0.9) {
        // Blue-ish star
        color = `rgba(150, 170, 255, ${currentAlpha})`;
      } else if (star.color > 0.8) {
        // Red-ish star
        color = `rgba(255, 170, 150, ${currentAlpha})`;
      } else if (star.color > 0.7) {
        // Yellow-ish star
        color = `rgba(255, 255, 200, ${currentAlpha})`;
      } else {
        // White star
        color = `rgba(255, 255, 255, ${currentAlpha})`;
      }
      
      // Draw the star
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow
      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
      glow.addColorStop(0, color.replace(currentAlpha, currentAlpha * 0.5));
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Update the texture
    this.skyTexture.needsUpdate = true;
  }
  
  // Method to update neon lights to ensure they're always visible
  updateNeonLights(camera) {
    // Only update neon lights every 10 frames
    if (!this._neonUpdateCounter) this._neonUpdateCounter = 0;
    this._neonUpdateCounter++;
    
    if (this._neonUpdateCounter % 10 !== 0) return;
    
    // Skip if no neon materials
    if (!this.neonMaterials || !this.neonMaterials.length) return;
    
    // Optimization: Only update neon lights within a certain distance
    const MAX_NEON_UPDATE_DISTANCE = 150;
    const cameraPosition = camera.position;
    
    // Update neon materials
    for (const material of this.neonMaterials) {
      if (!material.userData || !material.userData.position) continue;
      
      const distance = material.userData.position.distanceTo(cameraPosition);
      
      // Skip distant neon lights
      if (distance > MAX_NEON_UPDATE_DISTANCE) {
        if (material.emissiveIntensity > 0.1) {
          material.emissiveIntensity = 0.1;
        }
        continue;
      }
      
      // Calculate intensity based on distance
      const intensity = Math.max(0.5, 2.0 - (distance / MAX_NEON_UPDATE_DISTANCE));
      material.emissiveIntensity = intensity;
    }
  }
  
  // Initialize all materials to ensure proper rendering
  initializeMaterials() {
    // Initialize materials if not already provided
    if (!this.materials) {
      this.materials = {
        // Define default materials here
        building: new THREE.MeshStandardMaterial({
          color: 0x333333,
          roughness: 0.7,
          metalness: 0.2
        }),
        ground: new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.9,
          metalness: 0.1
        }),
        road: new THREE.MeshStandardMaterial({
          color: 0x222222,
          roughness: 0.9,
          metalness: 0.1
        })
      };
    }
    
    // Create a collection to track all neon materials for optimization
    this.neonMaterials = [];
    
    // Force material updates
    this.scene.traverse((object) => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
            material.needsUpdate = true;
          });
        } else {
          object.material.needsUpdate = true;
        }
      }
      
      // Ensure geometries are properly initialized
      if (object.geometry) {
        object.geometry.computeBoundingSphere();
        object.geometry.computeBoundingBox();
      }
      
      // Ensure matrix updates
      object.updateMatrix();
      object.updateMatrixWorld(true);
    });
    
    // Force an update of instanced meshes
    if (this.streetlightInstances) {
      this.streetlightInstances.instanceMatrix.needsUpdate = true;
    }
    
    if (this.streetlightLampInstances) {
      this.streetlightLampInstances.instanceMatrix.needsUpdate = true;
    }
  }
  
  getCityBounds() {
    // Calculate city bounds based on grid size
    const halfSize = (this.gridSize * this.blockSize) / 2;
    return {
      min: new THREE.Vector3(-halfSize, 0, -halfSize),
      max: new THREE.Vector3(halfSize, 0, halfSize)
    };
  }
  
  getBuildings() {
    // Return all building meshes
    return this.buildings || [];
  }
  
  // Add a helper method to create and track neon materials
  createNeonMaterial(color, position) {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.7
    });
    
    // Store position for distance calculations
    material.userData = { position: position.clone() };
    
    // Add to tracked neon materials
    this.neonMaterials.push(material);
    
    return material;
  }
  
  // Enhanced method to clean up all problematic billboards
  cleanupBillboards() {
    // Minimum acceptable height from ground level
    const MIN_SAFE_HEIGHT = 8; // Increased from 7 to be extra safe
    
    // Keep track of billboards to remove
    const billboardsToRemove = [];
    
    // Check all props for billboards
    for (let i = 0; i < this.props.length; i++) {
      const prop = this.props[i];
      
      // Check if this is a Billboard
      if (prop instanceof Billboard) {
        // Get the world position of the billboard
        const worldPosition = new THREE.Vector3();
        prop.getWorldPosition(worldPosition);
        
        // Check if the billboard is too close to the ground
        if (worldPosition.y < MIN_SAFE_HEIGHT) {
          // Mark for removal
          billboardsToRemove.push(i);
          
          // Remove from parent (building)
          if (prop.parent) {
            prop.parent.remove(prop);
          }
          continue; // Skip further checks for this billboard
        }
        
        // Check if the billboard is intersecting with its parent building
        if (prop.parent && this.isBillboardIntersectingBuilding(prop)) {
          // Mark for removal
          billboardsToRemove.push(i);
          
          // Remove from parent (building)
          prop.parent.remove(prop);
        }
      }
    }
    
    // Remove billboards from props array (in reverse order to avoid index issues)
    for (let i = billboardsToRemove.length - 1; i >= 0; i--) {
      this.props.splice(billboardsToRemove[i], 1);
    }
    
    console.log(`Removed ${billboardsToRemove.length} problematic billboards (ground level or building intersection).`);
    
    // Also check for any other objects that might look like billboards but aren't Billboard instances
    // These could be from other prop generation methods
    const otherObjectsToRemove = [];
    
    // Traverse all objects in the scene
    this.scene.traverse((object) => {
      // Skip if it's not a mesh or is a Billboard instance (already handled)
      if (!(object instanceof THREE.Mesh) || object instanceof Billboard) return;
      
      // Check if this object has a parent and is not part of the ground or roads
      if (object.parent && !object.userData.isGround && !object.userData.isRoad) {
        // Get world position
        const worldPosition = new THREE.Vector3();
        object.getWorldPosition(worldPosition);
        
        // Check if it's too close to the ground and has a box-like geometry (potential billboard)
        if (worldPosition.y < MIN_SAFE_HEIGHT && 
            object.geometry instanceof THREE.BoxGeometry &&
            object.geometry.parameters.width > 2 && 
            object.geometry.parameters.height > 1) {
          
          // Mark for removal
          otherObjectsToRemove.push(object);
        }
      }
    });
    
    // Remove these objects
    for (const object of otherObjectsToRemove) {
      if (object.parent) {
        object.parent.remove(object);
      }
    }
    
    console.log(`Removed ${otherObjectsToRemove.length} additional objects that were too close to the ground.`);
  }
  
  // Helper method to check if a billboard is intersecting with its parent building
  isBillboardIntersectingBuilding(billboard) {
    // Only check billboards that are attached to buildings
    if (!billboard.parent || !(billboard.parent instanceof THREE.Mesh)) {
      return false;
    }
    
    const building = billboard.parent;
    
    // Get building dimensions
    const buildingWidth = building.geometry.parameters.width;
    const buildingHeight = building.geometry.parameters.height;
    const buildingDepth = building.geometry.parameters.depth;
    
    // Get billboard's local position relative to the building
    const billboardPosition = billboard.position.clone();
    
    // Get billboard dimensions (approximate based on scale and base dimensions)
    // Base dimensions from Billboard.js are approximately 5-10 width, 3-6 height
    const billboardScale = billboard.scale.x; // Assuming uniform scaling
    const billboardWidth = 7.5 * billboardScale; // Average of 5-10
    const billboardHeight = 4.5 * billboardScale; // Average of 3-6
    const billboardDepth = 0.3 * billboardScale; // From Billboard.js
    
    // Calculate the minimum distance the billboard should be from the building center
    // to avoid intersection (half building dimension + half billboard dimension + offset)
    const minDistanceX = buildingWidth / 2 + billboardWidth / 2 + 0.5;
    const minDistanceY = buildingHeight / 2 + billboardHeight / 2 + 0.5;
    const minDistanceZ = buildingDepth / 2 + billboardDepth / 2 + 0.5;
    
    // Check if the billboard is too close to the building center in any dimension
    // We need to account for the billboard's orientation (rotation.y)
    const rotation = billboard.rotation.y;
    
    // For billboards on the sides (X axis), check Z distance
    if (Math.abs(rotation) === Math.PI / 2) {
      // Billboard is on left or right side
      if (Math.abs(billboardPosition.x) < minDistanceX - 0.5) {
        return true; // Billboard is intersecting with building
      }
    } 
    // For billboards on front/back (Z axis), check X distance
    else if (rotation === 0 || Math.abs(rotation) === Math.PI) {
      // Billboard is on front or back
      if (Math.abs(billboardPosition.z) < minDistanceZ - 0.5) {
        return true; // Billboard is intersecting with building
      }
    }
    
    // Check if billboard is too close to top or bottom of building
    const distanceFromTop = buildingHeight / 2 - billboardPosition.y;
    if (distanceFromTop < billboardHeight / 2 - 0.5) {
      return true; // Billboard is intersecting with top of building
    }
    
    // Additional check for billboards that are partially inside the building
    // This is a more aggressive check that will remove any billboard that might
    // appear to be partially inside the building from certain angles
    
    // Calculate the percentage of the billboard that should be outside the building
    const minOutsidePercentage = 0.8; // At least 80% of the billboard should be outside
    
    // Calculate how far the billboard extends from its position
    const billboardExtentX = billboardWidth / 2;
    const billboardExtentZ = billboardDepth / 2;
    
    // Calculate how far the billboard is from the building edge
    let distanceFromEdge;
    
    if (Math.abs(rotation) === Math.PI / 2) {
      // Billboard on left/right side
      distanceFromEdge = Math.abs(billboardPosition.x) - buildingWidth / 2;
    } else {
      // Billboard on front/back
      distanceFromEdge = Math.abs(billboardPosition.z) - buildingDepth / 2;
    }
    
    // Calculate what percentage of the billboard is outside the building
    let outsidePercentage;
    
    if (Math.abs(rotation) === Math.PI / 2) {
      // For side billboards, use width as the extent
      outsidePercentage = distanceFromEdge / billboardExtentX;
    } else {
      // For front/back billboards, use depth as the extent
      outsidePercentage = distanceFromEdge / billboardExtentZ;
    }
    
    // If less than the minimum percentage is outside, consider it intersecting
    if (outsidePercentage < minOutsidePercentage) {
      return true;
    }
    
    return false; // Billboard is not intersecting with building
  }
}

export { CityGenerator }; 