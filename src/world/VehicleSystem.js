import * as THREE from 'three';

class VehicleSystem {
  constructor(scene, roadNetwork) {
    this.scene = scene;
    this.roadNetwork = roadNetwork;
    this.vehicles = [];
    
    // Vehicle parameters
    this.vehicleSpeed = 5; // Base speed
    this.vehicleHeight = 1.5; // Height above the road
    
    // Create vehicle geometries
    this.createVehicleGeometries();
  }
  
  createVehicleGeometries() {
    // Create different vehicle types
    this.vehicleTypes = [
      {
        // Sporty hovercar
        bodyGeometry: new THREE.BoxGeometry(2.5, 0.5, 1.2),
        cockpitGeometry: new THREE.BoxGeometry(1.5, 0.4, 1),
        frontLightGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.3),
        rearLightGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.8),
        speed: 1.2 // Speed multiplier
      },
      {
        // Hover truck
        bodyGeometry: new THREE.BoxGeometry(3.5, 0.8, 1.5),
        cockpitGeometry: new THREE.BoxGeometry(1.2, 0.5, 1.4),
        frontLightGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.4),
        rearLightGeometry: new THREE.BoxGeometry(0.1, 0.1, 1.2),
        speed: 0.8 // Speed multiplier
      },
      {
        // Hover bike
        bodyGeometry: new THREE.BoxGeometry(1.8, 0.3, 0.6),
        cockpitGeometry: new THREE.BoxGeometry(0.8, 0.3, 0.5),
        frontLightGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.2),
        rearLightGeometry: new THREE.BoxGeometry(0.1, 0.1, 0.4),
        speed: 1.5 // Speed multiplier
      }
    ];
  }
  
  spawnVehicles(count) {
    // Spawn a number of vehicles on the road network
    for (let i = 0; i < count; i++) {
      this.spawnVehicle();
    }
  }
  
  spawnVehicle() {
    // Select a random road segment
    if (this.roadNetwork.length === 0) return;
    
    const roadSegment = this.roadNetwork[Math.floor(Math.random() * this.roadNetwork.length)];
    
    // Create a vehicle
    const vehicle = this.createVehicle();
    
    // Position the vehicle on the road
    const t = Math.random(); // Random position along the road
    const position = new THREE.Vector3();
    position.lerpVectors(roadSegment.start, roadSegment.end, t);
    position.y = this.vehicleHeight;
    vehicle.position.copy(position);
    
    // Set vehicle direction based on road orientation
    if (roadSegment.isHorizontal) {
      vehicle.rotation.y = Math.PI / 2;
    }
    
    // Add vehicle data
    const targetPosition = roadSegment.end.clone();
    targetPosition.y = this.vehicleHeight;
    
    vehicle.userData = {
      currentRoad: roadSegment,
      targetPosition: targetPosition,
      speed: this.vehicleSpeed * vehicle.userData.speedMultiplier,
      direction: new THREE.Vector3().subVectors(roadSegment.end, roadSegment.start).normalize()
    };
    
    // Add to scene and vehicles array
    this.scene.add(vehicle);
    this.vehicles.push(vehicle);
    
    return vehicle;
  }
  
  createVehicle() {
    // Create a vehicle mesh
    const vehicle = new THREE.Group();
    
    // Select a random vehicle type
    const vehicleType = this.vehicleTypes[Math.floor(Math.random() * this.vehicleTypes.length)];
    
    // Create materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5),
      roughness: 0.2,
      metalness: 0.8
    });
    
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7
    });
    
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff3333,
      emissiveIntensity: 1.0
    });
    
    // Create body
    const body = new THREE.Mesh(vehicleType.bodyGeometry, bodyMaterial);
    vehicle.add(body);
    
    // Create cockpit
    const cockpit = new THREE.Mesh(vehicleType.cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, vehicleType.bodyGeometry.parameters.height / 2 + vehicleType.cockpitGeometry.parameters.height / 2, 0);
    vehicle.add(cockpit);
    
    // Create front lights
    const frontLightLeft = new THREE.Mesh(vehicleType.frontLightGeometry, lightMaterial);
    frontLightLeft.position.set(
      vehicleType.bodyGeometry.parameters.width / 2 + vehicleType.frontLightGeometry.parameters.width / 2,
      0,
      vehicleType.bodyGeometry.parameters.depth / 2 - vehicleType.frontLightGeometry.parameters.depth / 2
    );
    vehicle.add(frontLightLeft);
    
    const frontLightRight = frontLightLeft.clone();
    frontLightRight.position.z = -frontLightLeft.position.z;
    vehicle.add(frontLightRight);
    
    // Create rear lights
    const rearLightLeft = new THREE.Mesh(vehicleType.rearLightGeometry, lightMaterial);
    rearLightLeft.position.set(
      -vehicleType.bodyGeometry.parameters.width / 2 - vehicleType.rearLightGeometry.parameters.width / 2,
      0,
      vehicleType.bodyGeometry.parameters.depth / 2 - vehicleType.rearLightGeometry.parameters.depth / 2
    );
    vehicle.add(rearLightLeft);
    
    const rearLightRight = rearLightLeft.clone();
    rearLightRight.position.z = -rearLightLeft.position.z;
    vehicle.add(rearLightRight);
    
    // Add hover effect
    const hoverGeometry = new THREE.CylinderGeometry(0.5, 0.2, 0.1, 16);
    const hoverMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7
    });
    
    // Add hover pads at each corner
    const hoverPositions = [
      { x: vehicleType.bodyGeometry.parameters.width / 3, z: vehicleType.bodyGeometry.parameters.depth / 3 },
      { x: -vehicleType.bodyGeometry.parameters.width / 3, z: vehicleType.bodyGeometry.parameters.depth / 3 },
      { x: vehicleType.bodyGeometry.parameters.width / 3, z: -vehicleType.bodyGeometry.parameters.depth / 3 },
      { x: -vehicleType.bodyGeometry.parameters.width / 3, z: -vehicleType.bodyGeometry.parameters.depth / 3 }
    ];
    
    for (const pos of hoverPositions) {
      const hoverPad = new THREE.Mesh(hoverGeometry, hoverMaterial);
      hoverPad.position.set(pos.x, -vehicleType.bodyGeometry.parameters.height / 2 - 0.05, pos.z);
      hoverPad.rotation.x = Math.PI;
      vehicle.add(hoverPad);
    }
    
    // Store vehicle type data
    vehicle.userData = {
      type: vehicleType,
      speedMultiplier: vehicleType.speed,
      hoverHeight: 0,
      hoverSpeed: 0.5 + Math.random() * 0.5,
      time: Math.random() * Math.PI * 2
    };
    
    return vehicle;
  }
  
  update() {
    // Update all vehicles
    const delta = 0.016; // Assume 60fps
    
    for (let i = 0; i < this.vehicles.length; i++) {
      const vehicle = this.vehicles[i];
      
      // Update hover animation
      vehicle.userData.time += delta;
      vehicle.userData.hoverHeight = Math.sin(vehicle.userData.time * vehicle.userData.hoverSpeed) * 0.1;
      vehicle.position.y = this.vehicleHeight + vehicle.userData.hoverHeight;
      
      // Move vehicle along its path
      const direction = vehicle.userData.direction;
      const speed = vehicle.userData.speed;
      
      vehicle.position.add(direction.clone().multiplyScalar(speed * delta));
      
      // Check if vehicle has reached its target
      const distanceToTarget = vehicle.position.distanceTo(vehicle.userData.targetPosition);
      
      if (distanceToTarget < 1) {
        // Find a new road segment to follow
        this.findNewRoadSegment(vehicle);
      }
    }
  }
  
  findNewRoadSegment(vehicle) {
    // Find a new road segment connected to the current one
    const currentRoad = vehicle.userData.currentRoad;
    const possibleRoads = [];
    
    // Find roads that connect to the end of the current road
    for (const road of this.roadNetwork) {
      // Skip the current road
      if (road === currentRoad) continue;
      
      // Check if this road connects to the current road's end
      const tolerance = 0.1;
      const endPoint = currentRoad.end;
      
      if (road.start.distanceTo(endPoint) < tolerance) {
        possibleRoads.push({
          road: road,
          start: road.start,
          end: road.end
        });
      } else if (road.end.distanceTo(endPoint) < tolerance) {
        possibleRoads.push({
          road: road,
          start: road.end,
          end: road.start
        });
      }
    }
    
    // If no connecting roads found, pick a random road
    if (possibleRoads.length === 0) {
      const newRoad = this.roadNetwork[Math.floor(Math.random() * this.roadNetwork.length)];
      
      // Position the vehicle at the start of the new road
      vehicle.position.copy(newRoad.start);
      vehicle.position.y = this.vehicleHeight;
      
      // Update vehicle data
      vehicle.userData.currentRoad = newRoad;
      vehicle.userData.targetPosition = newRoad.end.clone();
      vehicle.userData.targetPosition.y = this.vehicleHeight;
      vehicle.userData.direction = new THREE.Vector3().subVectors(newRoad.end, newRoad.start).normalize();
      
      // Set vehicle rotation based on road direction
      if (newRoad.isHorizontal) {
        vehicle.rotation.y = Math.PI / 2;
      } else {
        vehicle.rotation.y = 0;
      }
    } else {
      // Pick a random connecting road
      const nextRoadData = possibleRoads[Math.floor(Math.random() * possibleRoads.length)];
      
      // Update vehicle data
      vehicle.userData.currentRoad = nextRoadData.road;
      vehicle.userData.targetPosition = nextRoadData.end.clone();
      vehicle.userData.targetPosition.y = this.vehicleHeight;
      vehicle.userData.direction = new THREE.Vector3().subVectors(nextRoadData.end, nextRoadData.start).normalize();
      
      // Set vehicle rotation based on road direction
      if (nextRoadData.road.isHorizontal) {
        vehicle.rotation.y = Math.PI / 2;
      } else {
        vehicle.rotation.y = 0;
      }
    }
  }
}

export { VehicleSystem }; 