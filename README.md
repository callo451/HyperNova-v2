# Cyberpunk Battle Royale - 3D City Foundation

A lightweight, optimized cyberpunk-style 3D city built with Three.js, designed as the foundation for a browser-based sci-fi battle royale game.

## Features

- **Procedurally Generated Cyberpunk City**: Buildings, roads, and plazas are generated on the fly with a consistent cyberpunk aesthetic.
- **Neon-Lit Environment**: Emissive materials create a vibrant, glowing cityscape with blue, purple, pink, and teal highlights.
- **Optimized Performance**: Low-poly models, instancing for repeated elements, and basic LOD (Level of Detail) system.
- **Interactive Elements**: Floating billboards, animated holograms, and moving hovercars.
- **Player Movement**: Basic FPS controls with collision detection, jumping, and gravity.
- **Dual Control Modes**: Switch between orbit camera (for exploration) and FPS camera (for gameplay).
- **Multiplayer Support**: Up to 20 players per game session with AI bots filling empty slots.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- Firebase account (for multiplayer functionality)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd cyberpunk-battle-royale
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn
   ```

3. Start the development server:
   ```
   ./start-dev.sh
   ```
   This will start both the multiplayer server and the Vite development server.

4. Open your browser and navigate to `http://localhost:5173`

### Multiplayer Testing

To test the multiplayer functionality without running the full game:

1. Start the multiplayer server:
   ```
   node server.js
   ```

2. Open the multiplayer test page in your browser:
   ```
   open multiplayer-test.html
   ```
   or simply open the file in your browser.

3. Click "Join Game" to create or join a multiplayer session.

## Controls

- **W, A, S, D / Arrow Keys**: Move forward, left, backward, right
- **Space**: Jump
- **C**: Toggle between orbit camera and FPS camera
- **Mouse**: Look around (in FPS mode)
- **Mouse Drag**: Rotate camera (in orbit mode)
- **Mouse Wheel**: Zoom in/out (in orbit mode)
- **Left Click**: Attack (in multiplayer mode)

## Technical Details

### Project Structure

- `/src/`: Main game code
  - `/game/`: Core game logic (movement, physics, interactions)
  - `/world/`: City generation (buildings, roads, props)
  - `/shaders/`: Simple neon glow effects
- `/server.js`: Multiplayer server
- `/client.js`: Firebase client integration
- `/game-integration.js`: Connects the game to the multiplayer system
- `/game-multiplayer-connector.js`: Handles game-specific multiplayer logic

### Multiplayer Architecture

- **Backend**: Node.js server with Express and Firebase Realtime Database
- **Frontend**: Web-based client using Firebase SDK
- **Deployment**: DigitalOcean for server hosting (planned)

### Performance Optimizations

- **Instanced Rendering**: Used for streetlights and other repeated elements
- **LOD System**: Objects are grouped into near, medium, and far distance groups
- **Low-Poly Models**: Simple geometric shapes for all objects
- **Efficient Lighting**: Limited number of lights with optimized shadows
- **Network Optimization**: Position updates are throttled to reduce bandwidth

## Deployment to DigitalOcean

### Using DigitalOcean App Platform

1. Create a DigitalOcean account if you don't have one
2. Install the DigitalOcean CLI (doctl)
3. Authenticate with your DigitalOcean account:
   ```
   doctl auth init
   ```
4. Create a new app:
   ```
   doctl apps create --spec app-spec.yaml
   ```

### Using DigitalOcean Droplet

1. Create a new Droplet with Node.js pre-installed
2. Connect to your Droplet via SSH
3. Clone your repository to the Droplet
4. Install dependencies:
   ```
   npm install --production
   ```
5. Set up a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start server.js
   ```
6. Configure Nginx as a reverse proxy (optional but recommended)

## Future Enhancements

This project serves as a foundation for a full battle royale game. Planned future enhancements include:

- Advanced weapons and combat system
- Player health and damage improvements
- More detailed environments and interiors
- Advanced visual effects
- Leaderboards and statistics
- Voice chat integration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for the powerful 3D rendering capabilities
- Vite for the fast development environment
- Firebase for the real-time database functionality 