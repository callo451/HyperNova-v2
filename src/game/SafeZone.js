import * as THREE from 'three';

class SafeZone {
  constructor(scene, initialRadius, finalRadius, shrinkDuration, centerPoint = new THREE.Vector3(0, 0, 0)) {
    this.scene = scene;
    this.initialRadius = initialRadius;
    this.finalRadius = finalRadius;
    this.shrinkDuration = shrinkDuration; // in seconds
    this.centerPoint = centerPoint;
    
    this.currentRadius = initialRadius;
    this.isActive = false;
    this.isShrinking = false;
    this.shrinkStartTime = 0;
    this.shrinkElapsedTime = 0;
    
    // Create safe zone visualization
    this.createSafeZoneVisual();
  }
  
  createSafeZoneVisual() {
    // Create a cylinder to represent the safe zone
    const geometry = new THREE.CylinderGeometry(this.initialRadius, this.initialRadius, 100, 64, 1, true);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x00ffff) }, // Cyan
        color2: { value: new THREE.Color(0xff00ff) }, // Magenta
        time: { value: 0 },
        radius: { value: this.initialRadius }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        uniform float radius;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Calculate distance from center in the xz plane
          float dist = sqrt(vPosition.x * vPosition.x + vPosition.z * vPosition.z);
          
          // Normalize distance
          float normDist = dist / radius;
          
          // Create animated gradient
          float gradient = sin(normDist * 10.0 - time * 2.0) * 0.5 + 0.5;
          
          // Mix colors based on gradient
          vec3 color = mix(color1, color2, gradient);
          
          // Add vertical lines
          float line = step(0.98, fract(vUv.x * 50.0 + time));
          color = mix(color, vec3(1.0), line * 0.3);
          
          // Add horizontal bands
          float band = step(0.95, fract(vUv.y * 10.0 + time * 0.5));
          color = mix(color, vec3(1.0), band * 0.2);
          
          // Add transparency based on distance from edge
          float alpha = smoothstep(0.0, 0.1, abs(normDist - 0.98));
          alpha = max(alpha, 0.1); // Ensure some visibility
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Prevent z-fighting
      blending: THREE.AdditiveBlending // Use additive blending for better visual effect
    });
    
    this.safeZoneVisual = new THREE.Mesh(geometry, material);
    this.safeZoneVisual.position.copy(this.centerPoint);
    this.safeZoneVisual.position.y = 0; // Center vertically
    this.safeZoneVisual.renderOrder = 1000; // Ensure it renders after other objects
    this.scene.add(this.safeZoneVisual);
    
    // Create a circle on the ground to show the safe zone boundary
    const circleGeometry = new THREE.CircleGeometry(this.initialRadius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false // Prevent z-fighting
    });
    
    this.safeZoneCircle = new THREE.Mesh(circleGeometry, circleMaterial);
    this.safeZoneCircle.rotation.x = -Math.PI / 2; // Lay flat on the ground
    this.safeZoneCircle.position.copy(this.centerPoint);
    this.safeZoneCircle.position.y = 0.1; // Slightly above ground
    this.safeZoneCircle.renderOrder = 999; // Ensure it renders after ground but before the cylinder
    this.scene.add(this.safeZoneCircle);
    
    // Initially hide the safe zone visuals until explicitly started
    this.safeZoneVisual.visible = false;
    this.safeZoneCircle.visible = false;
  }
  
  start() {
    this.isActive = true;
    this.safeZoneVisual.visible = true;
    this.safeZoneCircle.visible = true;
  }
  
  startShrinking() {
    if (!this.isActive) return;
    
    this.isShrinking = true;
    this.shrinkStartTime = performance.now() / 1000;
    this.shrinkElapsedTime = 0;
    
    // Update UI
    this.updateUI();
  }
  
  update(deltaTime) {
    if (!this.isActive) return;
    
    // Update shader time
    if (this.safeZoneVisual.material.uniforms) {
      this.safeZoneVisual.material.uniforms.time.value += deltaTime;
    }
    
    if (this.isShrinking) {
      // Update shrink elapsed time
      this.shrinkElapsedTime = (performance.now() / 1000) - this.shrinkStartTime;
      
      // Calculate progress (0 to 1)
      const progress = Math.min(this.shrinkElapsedTime / this.shrinkDuration, 1);
      
      // Update current radius
      this.currentRadius = this.initialRadius - (this.initialRadius - this.finalRadius) * progress;
      
      // Update visuals
      this.updateVisuals();
      
      // Update UI
      this.updateUI();
      
      // Check if shrinking is complete
      if (progress >= 1) {
        this.isShrinking = false;
      }
    }
  }
  
  updateVisuals() {
    // Update cylinder radius
    if (this.safeZoneVisual.geometry) {
      // Create new geometry with updated radius
      const newGeometry = new THREE.CylinderGeometry(this.currentRadius, this.currentRadius, 100, 64, 1, true);
      this.safeZoneVisual.geometry.dispose();
      this.safeZoneVisual.geometry = newGeometry;
      
      // Update shader uniform
      if (this.safeZoneVisual.material.uniforms) {
        this.safeZoneVisual.material.uniforms.radius.value = this.currentRadius;
      }
    }
    
    // Update circle radius
    if (this.safeZoneCircle.geometry) {
      const newCircleGeometry = new THREE.CircleGeometry(this.currentRadius, 64);
      this.safeZoneCircle.geometry.dispose();
      this.safeZoneCircle.geometry = newCircleGeometry;
    }
  }
  
  isPointInSafeZone(point) {
    // Calculate distance from center in the XZ plane (ignore Y)
    const dx = point.x - this.centerPoint.x;
    const dz = point.z - this.centerPoint.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Point is in safe zone if distance is less than current radius
    return distance < this.currentRadius;
  }
  
  updateUI() {
    // Update safe zone timer in UI
    const timerElement = document.getElementById('zone-timer');
    if (timerElement) {
      if (this.isShrinking) {
        const remainingTime = Math.max(0, this.shrinkDuration - this.shrinkElapsedTime);
        timerElement.textContent = Math.ceil(remainingTime);
      } else {
        timerElement.textContent = '0';
      }
    }
    
    // Update safe zone radius in UI
    const radiusElement = document.getElementById('zone-radius');
    if (radiusElement) {
      radiusElement.textContent = Math.round(this.currentRadius);
    }
  }
}

export { SafeZone }; 