import * as THREE from 'three';

class CollisionSystem {
  constructor(collidableObjects = []) {
    this.collidableObjects = collidableObjects;
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    this.directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize()
    ];
  }
  
  addCollidableObject(object) {
    this.collidableObjects.push(object);
  }
  
  removeCollidableObject(object) {
    const index = this.collidableObjects.indexOf(object);
    if (index !== -1) {
      this.collidableObjects.splice(index, 1);
    }
  }
  
  checkCollision(position, radius) {
    // Check if the player at the given position would collide with any objects
    for (const object of this.collidableObjects) {
      if (!object.geometry) continue;
      
      // Skip road markings
      if (object.userData && object.userData.isRoadMarking) continue;
      
      // Skip objects that are too far away
      if (object.position && position.distanceTo(object.position) > 50) {
        continue;
      }
      
      // Get the object's world matrix
      this.tempMatrix.copy(object.matrixWorld);
      
      // Create a bounding box for the object
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox();
      }
      
      const boundingBox = object.geometry.boundingBox.clone();
      boundingBox.applyMatrix4(this.tempMatrix);
      
      // Simple sphere-box collision check
      const spherePos = position.clone();
      
      // Check if the sphere intersects with the box
      const closestPoint = new THREE.Vector3();
      closestPoint.x = Math.max(boundingBox.min.x, Math.min(spherePos.x, boundingBox.max.x));
      closestPoint.y = Math.max(boundingBox.min.y, Math.min(spherePos.y, boundingBox.max.y));
      closestPoint.z = Math.max(boundingBox.min.z, Math.min(spherePos.z, boundingBox.max.z));
      
      const distance = spherePos.distanceTo(closestPoint);
      
      if (distance < radius) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }
  
  // Cast rays in all directions to find nearby objects
  castRays(position, radius, maxDistance = 2) {
    const collisions = [];
    
    for (const direction of this.directions) {
      this.raycaster.set(position, direction);
      const intersects = this.raycaster.intersectObjects(this.collidableObjects, true);
      
      for (const intersect of intersects) {
        if (intersect.distance < radius + maxDistance) {
          collisions.push({
            object: intersect.object,
            point: intersect.point,
            distance: intersect.distance,
            direction: direction
          });
        }
      }
    }
    
    return collisions;
  }
}

export { CollisionSystem }; 