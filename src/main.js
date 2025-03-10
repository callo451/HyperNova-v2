import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FPSControls } from './game/FPSControls.js';
import { CityGenerator } from './world/CityGenerator.js';
import { NeonMaterials } from './world/NeonMaterials.js';
import { VehicleSystem } from './world/VehicleSystem.js';
import { CollisionSystem } from './game/CollisionSystem.js';
import { loadingManager } from './game/LoadingManager.js';
import { GameManager } from './game/GameManager.js';
import { LootSystem } from './game/loot/LootSystem.js';
import { ShieldSystem } from './game/items/ShieldSystem.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Import multiplayer connector
import { initializeMultiplayerConnector } from '../game-multiplayer-connector.js';

// Game variables
let scene, camera, renderer;
let orbitControls;
let controlsMode = 'fps'; // 'fps' or 'orbit'
let cityGenerator;
let collisionSystem;
let fpsControls;
let vehicleSystem;
let gameManager;
let lootSystem;
let shieldSystem;
let multiplayerConnector; // Multiplayer connector

// Performance monitoring
let stats;

// Animation variables
let lastTime = null;
const fixedTimeStep = 1 / 60; // 60 updates per second
let accumulator = 0;

// Game state variables
let gameStarted = false;
let menuActive = true;

// Initialize the application
export function init() {
  // Create scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000022, 0.005);
  scene.background = new THREE.Color(0x000022);
  
  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('game-canvas'),
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Create orbit controls
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 1;
  orbitControls.maxDistance = 50;
  orbitControls.maxPolarAngle = Math.PI / 2;
  orbitControls.enabled = controlsMode === 'orbit';
  
  // Create main menu
  createMainMenu();
  
  // Add window resize handler
  window.addEventListener('resize', onWindowResize);
  
  // Add stats
  stats = new Stats();
  stats.dom.style.cssText = 'position:absolute;top:0;left:0;';
  document.body.appendChild(stats.dom);
  
  // Initialize game manager
  gameManager = new GameManager(scene, camera);
  
  // Start animation loop
  animate();
}

function createMainMenu() {
  const mainMenu = document.createElement('div');
  mainMenu.id = 'main-menu';
  mainMenu.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="none" stroke="rgba(0,200,255,0.1)" stroke-width="0.5" x="0" y="0" width="100" height="100"/></svg>'), 
                linear-gradient(135deg, rgba(5,10,20,0.95) 0%, rgba(20,30,70,0.9) 100%);
    background-size: 50px 50px, cover;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    overflow-y: auto;
    z-index: 1500;
    color: #fff;
    font-family: 'Courier New', monospace;
    opacity: 1;
    transition: opacity 0.3s ease, visibility 0.3s ease;
    pointer-events: auto;
    padding: 30px 0 50px 0;
  `;
  
  // Create animated background
  const bgAnimation = document.createElement('div');
  bgAnimation.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
  `;
  
  // Add hexagon grid background
  const hexGrid = document.createElement('div');
  hexGrid.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="100" viewBox="0 0 56 100"><path fill="none" stroke="rgba(0,200,255,0.1)" stroke-width="0.5" d="M28 0 L56 14 L56 42 L28 56 L0 42 L0 14 Z"/><path fill="none" stroke="rgba(0,200,255,0.1)" stroke-width="0.5" d="M28 56 L56 70 L56 98 L28 112 L0 98 L0 70 Z"/></svg>');
    background-size: 56px 100px;
    opacity: 0.3;
  `;
  
  // Add pulsing circle elements
  for (let i = 0; i < 5; i++) {
    const circle = document.createElement('div');
    const size = 100 + Math.random() * 300;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 5;
    
    circle.style.cssText = `
      position: absolute;
      top: ${y}%;
      left: ${x}%;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 1px solid rgba(0,255,255,0.2);
      transform: translate(-50%, -50%);
      animation: pulseCircle 8s infinite ease-in-out;
      animation-delay: ${delay}s;
    `;
    
    bgAnimation.appendChild(circle);
  }
  
  bgAnimation.appendChild(hexGrid);
  mainMenu.appendChild(bgAnimation);
  
  // Create content container
  const contentContainer = document.createElement('div');
  contentContainer.id = 'menu-content-container';
  contentContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 900px;
    width: 90%;
    padding: 25px 20px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(0,255,255,0.3);
    box-shadow: 0 0 30px rgba(0,255,255,0.2);
    position: relative;
    overflow: visible;
    margin: 20px 0 30px 0;
    transition: opacity 0.3s ease;
  `;
  
  // Add corner decorations to content container
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  corners.forEach(corner => {
    const cornerDecor = document.createElement('div');
    const [vertical, horizontal] = corner.split('-');
    cornerDecor.style.cssText = `
      position: absolute;
      ${vertical}: 0;
      ${horizontal}: 0;
      width: 30px;
      height: 30px;
      border-${vertical}: 2px solid #0ff;
      border-${horizontal}: 2px solid #0ff;
    `;
    contentContainer.appendChild(cornerDecor);
  });
  
  // Create title with enhanced styling
  const titleContainer = document.createElement('div');
  titleContainer.className = 'glitch-container';
  titleContainer.style.cssText = `
    position: relative;
    margin-bottom: 15px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100px;
  `;
  
  const title = document.createElement('h1');
  title.textContent = 'HYPERNOVA';
  title.style.cssText = `
    font-size: 4.5rem;
    font-weight: bold;
    color: #0ff;
    text-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff;
    letter-spacing: 6px;
    margin: 0;
    position: relative;
    text-align: center;
    text-transform: uppercase;
  `;
  
  // Create glitch layers
  const glitchBefore = document.createElement('div');
  glitchBefore.className = 'glitch-layer';
  glitchBefore.textContent = 'HYPERNOVA';
  glitchBefore.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    color: #f0f;
    text-shadow: 0 0 10px #f0f;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim 5s infinite linear alternate-reverse;
    font-size: 4.5rem;
    font-weight: bold;
    letter-spacing: 6px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    text-transform: uppercase;
  `;
  
  const glitchAfter = document.createElement('div');
  glitchAfter.className = 'glitch-layer';
  glitchAfter.textContent = 'HYPERNOVA';
  glitchAfter.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    color: #0f0;
    text-shadow: 0 0 10px #0f0;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim2 5s infinite linear alternate-reverse;
    animation-delay: 0.1s;
    font-size: 4.5rem;
    font-weight: bold;
    letter-spacing: 6px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    text-transform: uppercase;
  `;
  
  titleContainer.appendChild(glitchBefore);
  titleContainer.appendChild(title);
  titleContainer.appendChild(glitchAfter);
  
  // Add Battle Royale subtitle with enhanced styling
  const subtitleContainer = document.createElement('div');
  subtitleContainer.style.cssText = `
    position: relative;
    margin-bottom: 15px;
    text-align: center;
    width: 100%;
  `;
  
  const subtitleText = document.createElement('h2');
  subtitleText.textContent = 'NEON BATTLE ROYALE';
  subtitleText.style.cssText = `
    font-size: 1.8rem;
    font-weight: bold;
    color: #f0f;
    text-shadow: 0 0 10px #f0f, 0 0 15px #f0f;
    letter-spacing: 4px;
    margin: 0 0 10px 0;
    text-transform: uppercase;
  `;
  
  const subtitleDesc = document.createElement('p');
  subtitleDesc.innerHTML = 'Last one standing takes all in this cyberpunk battleground';
  subtitleDesc.style.cssText = `
    font-size: 1.2rem;
    line-height: 1.4;
    color: #ddd;
    text-shadow: 0 0 5px rgba(0,255,255,0.5);
    margin: 0;
    max-width: 800px;
    margin: 0 auto;
  `;
  
  subtitleContainer.appendChild(subtitleText);
  subtitleContainer.appendChild(subtitleDesc);
  
  // Create enhanced start button
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    position: relative;
    margin: 15px 0 25px 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  `;
  
  const startButton = document.createElement('button');
  startButton.textContent = 'DROP INTO COMBAT';
  startButton.style.cssText = `
    background: rgba(0,0,0,0.6);
    border: 2px solid #0ff;
    color: #0ff;
    padding: 12px 25px;
    font-size: 1.6rem;
    font-family: 'Courier New', monospace;
    text-transform: uppercase;
    letter-spacing: 3px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    text-shadow: 0 0 5px #0ff;
    box-shadow: 0 0 20px rgba(0,255,255,0.5);
    width: 320px;
    z-index: 1;
  `;
  
  // Add button glow effect
  const buttonGlow = document.createElement('div');
  buttonGlow.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1));
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  startButton.appendChild(buttonGlow);
  
  // Button hover effects
  startButton.addEventListener('mouseover', () => {
    startButton.style.background = 'rgba(0,255,255,0.2)';
    startButton.style.boxShadow = '0 0 30px rgba(0,255,255,0.8)';
    startButton.style.transform = 'scale(1.05)';
    buttonGlow.style.opacity = '1';
  });
  
  startButton.addEventListener('mouseout', () => {
    startButton.style.background = 'rgba(0,0,0,0.6)';
    startButton.style.boxShadow = '0 0 20px rgba(0,255,255,0.5)';
    startButton.style.transform = 'scale(1)';
    buttonGlow.style.opacity = '0';
  });
  
  // Start game on click
  startButton.addEventListener('click', () => {
    startGame(false); // Pass false to indicate single player mode
  });
  
  buttonContainer.appendChild(startButton);
  
  // Create multiplayer button with matching style
  const multiplayerButton = document.createElement('button');
  multiplayerButton.textContent = 'JOIN MULTIPLAYER';
  multiplayerButton.style.cssText = `
    background: rgba(0,0,0,0.6);
    border: 2px solid #f0f;
    color: #f0f;
    padding: 12px 25px;
    font-size: 1.6rem;
    font-family: 'Courier New', monospace;
    text-transform: uppercase;
    letter-spacing: 3px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    text-shadow: 0 0 5px #f0f;
    box-shadow: 0 0 20px rgba(255,0,255,0.5);
    width: 320px;
    z-index: 1;
  `;
  
  // Add button glow effect
  const mpButtonGlow = document.createElement('div');
  mpButtonGlow.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, rgba(255,0,255,0.1), rgba(0,255,255,0.1));
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  multiplayerButton.appendChild(mpButtonGlow);
  
  // Button hover effects
  multiplayerButton.addEventListener('mouseover', () => {
    multiplayerButton.style.background = 'rgba(255,0,255,0.2)';
    multiplayerButton.style.boxShadow = '0 0 30px rgba(255,0,255,0.8)';
    multiplayerButton.style.transform = 'scale(1.05)';
    mpButtonGlow.style.opacity = '1';
  });
  
  multiplayerButton.addEventListener('mouseout', () => {
    multiplayerButton.style.background = 'rgba(0,0,0,0.6)';
    multiplayerButton.style.boxShadow = '0 0 20px rgba(255,0,255,0.5)';
    multiplayerButton.style.transform = 'scale(1)';
    mpButtonGlow.style.opacity = '0';
  });
  
  // Toggle multiplayer panel on click
  multiplayerButton.addEventListener('click', () => {
    toggleMultiplayerPanel();
  });
  
  buttonContainer.appendChild(multiplayerButton);
  
  // Create simplified instructions section
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    display: flex;
    justify-content: center;
    width: 100%;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 40px;
  `;
  
  // Create left column - controls
  const controlsCol = document.createElement('div');
  controlsCol.style.cssText = `
    flex: 0 1 auto;
    padding: 0 10px;
    min-width: 180px;
    text-align: center;
  `;
  
  const controlsTitle = document.createElement('h3');
  controlsTitle.textContent = 'CONTROLS';
  controlsTitle.style.cssText = `
    color: #0ff;
    text-shadow: 0 0 5px #0ff;
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 1.1rem;
    letter-spacing: 2px;
    text-align: center;
  `;
  
  const controlsList = document.createElement('ul');
  controlsList.style.cssText = `
    list-style-type: none;
    padding: 0;
    margin: 0;
    text-align: left;
  `;
  
  const controlItems = [
    'WASD / Arrows: Move',
    'Mouse: Aim',
    'Left Click: Shoot',
    'R: Reload',
    '1-3: Switch weapons',
    'Space: Jump'
  ];
  
  controlItems.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span style="color:#f0f">></span> ${item}`;
    li.style.cssText = `
      margin-bottom: 6px;
      font-size: 0.85rem;
      color: #ddd;
    `;
    controlsList.appendChild(li);
  });
  
  controlsCol.appendChild(controlsTitle);
  controlsCol.appendChild(controlsList);
  
  // Create right column - objectives
  const objectivesCol = document.createElement('div');
  objectivesCol.style.cssText = `
    flex: 0 1 auto;
    padding: 0 10px;
    min-width: 180px;
    text-align: center;
  `;
  
  const objectivesTitle = document.createElement('h3');
  objectivesTitle.textContent = 'OBJECTIVES';
  objectivesTitle.style.cssText = `
    color: #0ff;
    text-shadow: 0 0 5px #0ff;
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 1.1rem;
    letter-spacing: 2px;
    text-align: center;
  `;
  
  const objectivesList = document.createElement('ul');
  objectivesList.style.cssText = `
    list-style-type: none;
    padding: 0;
    margin: 0;
    text-align: left;
  `;
  
  const objectiveItems = [
    'Collect weapons & ammo',
    'Eliminate opponents',
    'Stay inside the safe zone',
    'Be the last one standing'
  ];
  
  objectiveItems.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span style="color:#f0f">></span> ${item}`;
    li.style.cssText = `
      margin-bottom: 6px;
      font-size: 0.85rem;
      color: #ddd;
    `;
    objectivesList.appendChild(li);
  });
  
  objectivesCol.appendChild(objectivesTitle);
  objectivesCol.appendChild(objectivesList);
  
  instructions.appendChild(controlsCol);
  instructions.appendChild(objectivesCol);
  
  // Create AI credit with updated styling
  const aiCredit = document.createElement('div');
  aiCredit.style.cssText = `
    margin-top: 5px;
    text-align: center;
    color: #aaa;
    max-width: 600px;
    border-top: 1px solid rgba(0,200,255,0.3);
    padding-top: 10px;
  `;
  
  const aiTitle = document.createElement('h3');
  aiTitle.textContent = '100% AI-GENERATED GAME';
  aiTitle.style.cssText = `
    color: #f0f;
    text-shadow: 0 0 5px #f0f;
    margin-bottom: 3px;
    font-size: 0.9rem;
  `;
  
  const aiDesc = document.createElement('p');
  aiDesc.innerHTML = 'Created with <span style="color:#0ff;text-shadow:0 0 5px #0ff;">Claude 3.7 Sonnet</span> and <span style="color:#0ff;text-shadow:0 0 5px #0ff;">Three.js</span>';
  aiDesc.style.cssText = `
    font-size: 0.8rem;
    line-height: 1.4;
    margin: 0;
  `;
  
  aiCredit.appendChild(aiTitle);
  aiCredit.appendChild(aiDesc);
  
  // Add multiplayer panel to content container
  contentContainer.appendChild(titleContainer);
  contentContainer.appendChild(subtitleContainer);
  contentContainer.appendChild(buttonContainer);
  contentContainer.appendChild(instructions);
  contentContainer.appendChild(aiCredit);
  
  // Add content container to main menu
  mainMenu.appendChild(contentContainer);
  
  // Add enhanced animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes glitch-anim {
      0% { clip: rect(31px, 9999px, 94px, 0); transform: translateX(-2px); }
      5% { clip: rect(70px, 9999px, 71px, 0); transform: translateX(1px); }
      10% { clip: rect(29px, 9999px, 43px, 0); transform: translateX(-1px); }
      15% { clip: rect(16px, 9999px, 86px, 0); transform: translateX(2px); }
      20% { clip: rect(7px, 9999px, 92px, 0); transform: translateX(-2px); }
      25% { clip: rect(33px, 9999px, 5px, 0); transform: translateX(1px); }
      30% { clip: rect(10px, 9999px, 98px, 0); transform: translateX(0px); }
      35% { clip: rect(71px, 9999px, 64px, 0); transform: translateX(-1px); }
      40% { clip: rect(31px, 9999px, 61px, 0); transform: translateX(2px); }
      45% { clip: rect(7px, 9999px, 75px, 0); transform: translateX(-2px); }
      50% { clip: rect(28px, 9999px, 53px, 0); transform: translateX(1px); }
      55% { clip: rect(19px, 9999px, 35px, 0); transform: translateX(0px); }
      60% { clip: rect(45px, 9999px, 47px, 0); transform: translateX(-1px); }
      65% { clip: rect(69px, 9999px, 32px, 0); transform: translateX(2px); }
      70% { clip: rect(57px, 9999px, 25px, 0); transform: translateX(-2px); }
      75% { clip: rect(33px, 9999px, 54px, 0); transform: translateX(1px); }
      80% { clip: rect(0px, 9999px, 92px, 0); transform: translateX(-1px); }
      85% { clip: rect(66px, 9999px, 24px, 0); transform: translateX(2px); }
      90% { clip: rect(95px, 9999px, 2px, 0); transform: translateX(-2px); }
      95% { clip: rect(48px, 9999px, 59px, 0); transform: translateX(1px); }
      100% { clip: rect(83px, 9999px, 73px, 0); transform: translateX(0px); }
    }
    
    @keyframes glitch-anim2 {
      0% { clip: rect(18px, 9999px, 23px, 0); transform: translateX(2px); }
      5% { clip: rect(63px, 9999px, 21px, 0); transform: translateX(-1px); }
      10% { clip: rect(59px, 9999px, 49px, 0); transform: translateX(1px); }
      15% { clip: rect(10px, 9999px, 86px, 0); transform: translateX(-2px); }
      20% { clip: rect(54px, 9999px, 18px, 0); transform: translateX(2px); }
      25% { clip: rect(84px, 9999px, 96px, 0); transform: translateX(-1px); }
      30% { clip: rect(14px, 9999px, 49px, 0); transform: translateX(0px); }
      35% { clip: rect(33px, 9999px, 35px, 0); transform: translateX(1px); }
      40% { clip: rect(68px, 9999px, 89px, 0); transform: translateX(-2px); }
      45% { clip: rect(93px, 9999px, 55px, 0); transform: translateX(2px); }
      50% { clip: rect(53px, 9999px, 90px, 0); transform: translateX(-1px); }
      55% { clip: rect(82px, 9999px, 12px, 0); transform: translateX(0px); }
      60% { clip: rect(37px, 9999px, 56px, 0); transform: translateX(1px); }
      65% { clip: rect(24px, 9999px, 13px, 0); transform: translateX(-2px); }
      70% { clip: rect(24px, 9999px, 89px, 0); transform: translateX(2px); }
      75% { clip: rect(87px, 9999px, 59px, 0); transform: translateX(-1px); }
      80% { clip: rect(4px, 9999px, 41px, 0); transform: translateX(0px); }
      85% { clip: rect(10px, 9999px, 56px, 0); transform: translateX(1px); }
      90% { clip: rect(63px, 9999px, 26px, 0); transform: translateX(-2px); }
      95% { clip: rect(13px, 9999px, 72px, 0); transform: translateX(2px); }
      100% { clip: rect(59px, 9999px, 42px, 0); transform: translateX(-1px); }
    }
    
    @keyframes pulseCircle {
      0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.1; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.3; }
      100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.1; }
    }
  `;
  
  document.head.appendChild(style);
  
  // Update media queries for better responsiveness
  const mediaQueries = document.createElement('style');
  mediaQueries.textContent = `
    @media (max-height: 800px) {
      .glitch-container {
        height: 80px !important;
      }
      .glitch-container h1, 
      .glitch-container .glitch-layer {
        font-size: 3.5rem !important;
      }
      h2 {
        font-size: 1.5rem !important;
      }
      button {
        padding: 10px 20px !important;
        font-size: 1.3rem !important;
      }
      .instructions-container {
        gap: 30px !important;
      }
    }
    
    @media (max-height: 700px) {
      .glitch-container {
        height: 60px !important;
        margin-bottom: 10px !important;
      }
      .glitch-container h1, 
      .glitch-container .glitch-layer {
        font-size: 2.8rem !important;
      }
      h2 {
        font-size: 1.2rem !important;
        margin-bottom: 5px !important;
      }
      button {
        padding: 8px 15px !important;
        font-size: 1.1rem !important;
        width: 250px !important;
      }
      ul li {
        margin-bottom: 4px !important;
        font-size: 0.75rem !important;
      }
      .content-container {
        padding: 15px 10px !important;
      }
      .instructions-container {
        gap: 20px !important;
      }
    }
    
    @media (max-height: 600px) {
      .main-menu {
        justify-content: flex-start !important;
        padding-top: 10px !important;
      }
      .glitch-container {
        height: 50px !important;
        margin-bottom: 5px !important;
      }
      .glitch-container h1, 
      .glitch-container .glitch-layer {
        font-size: 2.2rem !important;
      }
      h2 {
        font-size: 1rem !important;
        margin-bottom: 3px !important;
      }
      .subtitle-desc {
        font-size: 0.8rem !important;
      }
      button {
        padding: 5px 10px !important;
        font-size: 1rem !important;
        width: 200px !important;
        margin: 5px 0 10px 0 !important;
      }
      .instructions-container {
        margin-bottom: 5px !important;
        gap: 15px !important;
      }
      .instructions-title {
        font-size: 0.9rem !important;
        margin-bottom: 3px !important;
      }
      ul li {
        margin-bottom: 2px !important;
        font-size: 0.7rem !important;
      }
      .ai-credit {
        margin-top: 3px !important;
        padding-top: 5px !important;
      }
      .ai-title {
        font-size: 0.8rem !important;
        margin-bottom: 1px !important;
      }
      .ai-desc {
        font-size: 0.7rem !important;
      }
    }
    
    @media (max-width: 768px) {
      .content-container {
        width: 95% !important;
        padding: 15px 10px !important;
      }
      .instructions-container {
        flex-direction: column !important;
        gap: 10px !important;
      }
      .instructions-column {
        padding: 0 5px !important;
        margin-bottom: 10px !important;
      }
    }
  `;
  
  document.head.appendChild(mediaQueries);
  
  // Add classes for media query targeting
  mainMenu.classList.add('main-menu');
  contentContainer.classList.add('content-container');
  instructions.classList.add('instructions-container');
  controlsCol.classList.add('instructions-column');
  objectivesCol.classList.add('instructions-column');
  controlsTitle.classList.add('instructions-title');
  objectivesTitle.classList.add('instructions-title');
  subtitleDesc.classList.add('subtitle-desc');
  aiCredit.classList.add('ai-credit');
  aiTitle.classList.add('ai-title');
  aiDesc.classList.add('ai-desc');
  
  document.body.appendChild(mainMenu);
}

// Toggle multiplayer panel visibility
function toggleMultiplayerPanel() {
  // Get references to elements
  const mainMenu = document.getElementById('main-menu');
  let multiplayerPanel = document.getElementById('multiplayer-container');
  
  // Check if the multiplayer panel is currently visible
  const isVisible = multiplayerPanel && multiplayerPanel.style.display === 'block';
  
  if (isVisible) {
    // Hide the multiplayer panel
    multiplayerPanel.style.display = 'none';
    
    // Show the main menu
    if (mainMenu) {
      mainMenu.style.display = 'flex';
    }
  } else {
    // If the multiplayer panel doesn't exist or is inside the main menu, create a new one
    if (!multiplayerPanel || multiplayerPanel.closest('#main-menu')) {
      // If there's an existing panel inside the main menu, remove it
      if (multiplayerPanel) {
        multiplayerPanel.parentNode.removeChild(multiplayerPanel);
      }
      
      // Create a new panel outside the main menu
      multiplayerPanel = document.createElement('div');
      multiplayerPanel.id = 'multiplayer-container';
      multiplayerPanel.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(5,10,20,0.98) 0%, rgba(20,30,70,0.95) 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        padding: 20px;
      `;
      document.body.appendChild(multiplayerPanel);
      
      // Initialize the multiplayer UI
      import('../multiplayer-ui.js').then(module => {
        module.initializeMultiplayerUI(null, 'multiplayer-container');
        
        // Add custom styles for the standalone multiplayer panel
        const multiplayerStyles = document.createElement('style');
        multiplayerStyles.textContent = `
          #multiplayer-container .multiplayer-panel {
            background: rgba(0,0,0,0.7);
            border: 1px solid rgba(255,0,255,0.5);
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 0 30px rgba(255,0,255,0.5);
            max-width: 600px;
            width: 90%;
          }
          
          #multiplayer-container h2 {
            color: #f0f;
            text-shadow: 0 0 5px #f0f;
            font-size: 1.8rem;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          
          #multiplayer-container h3 {
            color: #0ff;
            text-shadow: 0 0 5px #0ff;
            font-size: 1.2rem;
            letter-spacing: 1px;
          }
          
          #multiplayer-container .multiplayer-controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 20px;
          }
          
          #multiplayer-container .multiplayer-controls input {
            padding: 10px;
            border-radius: 3px;
            border: 1px solid #f0f;
            background: rgba(0,0,0,0.6);
            color: white;
            font-family: 'Courier New', monospace;
          }
          
          #multiplayer-container .multiplayer-controls button {
            padding: 10px 15px;
            border-radius: 3px;
            border: 1px solid #f0f;
            background: rgba(0,0,0,0.6);
            color: #f0f;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            text-shadow: 0 0 3px #f0f;
          }
          
          #multiplayer-container .multiplayer-controls button:hover:not(:disabled) {
            background: rgba(255,0,255,0.2);
            box-shadow: 0 0 10px rgba(255,0,255,0.5);
          }
          
          #multiplayer-container #back-to-menu-button {
            background: transparent;
            border: 1px solid #f0f;
            color: #f0f;
            padding: 8px 15px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
          }
          
          #multiplayer-container #back-to-menu-button:hover {
            background: rgba(255,0,255,0.2);
            box-shadow: 0 0 10px rgba(255,0,255,0.5);
          }
        `;
        document.head.appendChild(multiplayerStyles);
      });
    } else {
      // Show the existing panel
      multiplayerPanel.style.display = 'flex';
    }
    
    // Hide the main menu
    if (mainMenu) {
      mainMenu.style.display = 'none';
    }
  }
}

// Expose toggleMultiplayerPanel to the window object
window.toggleMultiplayerPanel = toggleMultiplayerPanel;

// Start the game
function startGame(isMultiplayer = false) {
  if (gameStarted) return;
  
  // Set game state variables
  gameStarted = true;
  menuActive = false;
  
  console.log('Starting game, menuActive =', menuActive);
  
  // Completely remove the main menu from the DOM
  const mainMenu = document.getElementById('main-menu');
  if (mainMenu && mainMenu.parentNode) {
    mainMenu.parentNode.removeChild(mainMenu);
    console.log('Main menu completely removed from DOM');
  }
  
  // Also remove any multiplayer container that might be visible
  const multiplayerContainer = document.getElementById('multiplayer-container');
  if (multiplayerContainer && multiplayerContainer.parentNode) {
    multiplayerContainer.parentNode.removeChild(multiplayerContainer);
    console.log('Multiplayer container completely removed from DOM');
  }
  
  // Show game instructions
  const gameInstructions = document.getElementById('instructions');
  if (gameInstructions) {
    gameInstructions.style.display = 'block';
  }
  
  // Initialize the world
  initWorld();
  
  // Initialize multiplayer connector if needed
  if (gameManager) {
    multiplayerConnector = initializeMultiplayerConnector(this, gameManager);
    console.log('Multiplayer connector initialized');
    
    // Don't add the multiplayer button to UI since we're handling it in the main menu
    // Only add it if we're starting in single player mode
    if (!isMultiplayer) {
      addMultiplayerButton();
    }
  }
}

// Expose startGame to the window object so it can be called from the multiplayer UI
window.startGame = startGame;

// Add multiplayer button to UI
function addMultiplayerButton() {
  const gameUI = document.getElementById('game-ui');
  if (!gameUI) return;
  
  const multiplayerButton = document.createElement('div');
  multiplayerButton.id = 'multiplayer-button';
  multiplayerButton.textContent = 'Multiplayer';
  multiplayerButton.style.position = 'absolute';
  multiplayerButton.style.top = '10px';
  multiplayerButton.style.right = '10px';
  multiplayerButton.style.padding = '10px 15px';
  multiplayerButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  multiplayerButton.style.color = '#f0f';
  multiplayerButton.style.border = '1px solid #f0f';
  multiplayerButton.style.borderRadius = '5px';
  multiplayerButton.style.cursor = 'pointer';
  multiplayerButton.style.pointerEvents = 'auto';
  multiplayerButton.style.fontFamily = 'monospace';
  multiplayerButton.style.zIndex = '1000';
  multiplayerButton.style.textShadow = '0 0 5px #f0f';
  multiplayerButton.style.boxShadow = '0 0 10px rgba(255,0,255,0.3)';
  multiplayerButton.style.transition = 'all 0.3s ease';
  
  // Add hover effects
  multiplayerButton.addEventListener('mouseover', () => {
    multiplayerButton.style.backgroundColor = 'rgba(255,0,255,0.2)';
    multiplayerButton.style.boxShadow = '0 0 15px rgba(255,0,255,0.5)';
  });
  
  multiplayerButton.addEventListener('mouseout', () => {
    multiplayerButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    multiplayerButton.style.boxShadow = '0 0 10px rgba(255,0,255,0.3)';
  });
  
  multiplayerButton.addEventListener('click', () => {
    // Check if multiplayer container exists
    let multiplayerContainer = document.getElementById('multiplayer-container');
    
    // If it doesn't exist, create it
    if (!multiplayerContainer) {
      multiplayerContainer = document.createElement('div');
      multiplayerContainer.id = 'multiplayer-container';
      multiplayerContainer.style.cssText = `
        position: absolute;
        top: 50px;
        right: 10px;
        width: 300px;
        background-color: rgba(0, 0, 0, 0.8);
        border: 1px solid #f0f;
        border-radius: 5px;
        padding: 15px;
        z-index: 999;
        box-shadow: 0 0 20px rgba(255,0,255,0.3);
        display: none;
        font-family: 'Courier New', monospace;
      `;
      document.body.appendChild(multiplayerContainer);
      
      // Initialize multiplayer UI
      import('../multiplayer-ui.js').then(module => {
        module.initializeMultiplayerUI(null, 'multiplayer-container');
        
        // Add custom styles to match the game theme
        const multiplayerStyles = document.createElement('style');
        multiplayerStyles.textContent = `
          #multiplayer-container .multiplayer-panel {
            position: relative;
            top: auto;
            right: auto;
            width: 100%;
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            z-index: auto;
            font-family: 'Courier New', monospace;
          }
          
          #multiplayer-container h2 {
            color: #f0f;
            text-shadow: 0 0 5px #f0f;
            font-size: 1.5rem;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          
          #multiplayer-container h3 {
            color: #0ff;
            text-shadow: 0 0 5px #0ff;
            font-size: 1.1rem;
            letter-spacing: 1px;
          }
          
          #multiplayer-container .multiplayer-controls {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 15px;
          }
          
          #multiplayer-container .multiplayer-controls input {
            padding: 8px;
            border-radius: 3px;
            border: 1px solid #f0f;
            background: rgba(0,0,0,0.6);
            color: white;
            font-family: 'Courier New', monospace;
          }
          
          #multiplayer-container .multiplayer-controls button {
            padding: 8px;
            border-radius: 3px;
            border: 1px solid #f0f;
            background: rgba(0,0,0,0.6);
            color: #f0f;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            text-shadow: 0 0 3px #f0f;
          }
          
          #multiplayer-container .multiplayer-controls button:hover:not(:disabled) {
            background: rgba(255,0,255,0.2);
            box-shadow: 0 0 10px rgba(255,0,255,0.5);
          }
          
          #multiplayer-container .game-info {
            margin-bottom: 15px;
            text-align: center;
            padding: 8px;
            border: 1px solid rgba(0,255,255,0.3);
            background: rgba(0,0,0,0.4);
          }
          
          #multiplayer-container #game-status.status-playing {
            color: #0ff;
            text-shadow: 0 0 5px #0ff;
          }
          
          #multiplayer-container .players-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid rgba(0,255,255,0.3);
            background: rgba(0,0,0,0.4);
            padding: 8px;
          }
          
          #multiplayer-container .player-item {
            display: flex;
            justify-content: space-between;
            padding: 6px;
            border-bottom: 1px solid rgba(0,255,255,0.2);
          }
          
          #multiplayer-container .player-name {
            color: #0ff;
            text-shadow: 0 0 3px #0ff;
          }
        `;
        document.head.appendChild(multiplayerStyles);
      });
    }
    
    // Toggle visibility
    multiplayerContainer.style.display = 
      multiplayerContainer.style.display === 'none' || 
      multiplayerContainer.style.display === '' ? 'block' : 'none';
  });
  
  gameUI.appendChild(multiplayerButton);
}

// Initialize the game world
async function initWorld() {
  // Setup lights first to ensure they're available during city generation
  setupLights();
  
  // Create materials
  const materials = new NeonMaterials();
  
  // Generate city
  cityGenerator = new CityGenerator(scene, materials);
  await cityGenerator.generate();
  
  // Force a renderer update to ensure all objects are properly initialized
  renderer.render(scene, camera);
  
  // Setup collision system
  collisionSystem = new CollisionSystem(cityGenerator.getCollidableObjects());
  
  // Setup vehicles
  vehicleSystem = new VehicleSystem(scene, cityGenerator.getRoadNetwork());
  vehicleSystem.spawnVehicles(20);
  
  // Setup FPS controls after city is generated
  fpsControls = new FPSControls(camera, document.body, collisionSystem);
  
  // Setup loot system
  lootSystem = new LootSystem(scene, cityGenerator);
  lootSystem.spawnChests();
  
  // Setup shield system
  shieldSystem = new ShieldSystem(scene, cityGenerator);
  shieldSystem.spawnShields();
  
  // Position player at a good starting point
  const startPosition = cityGenerator.getRandomSpawnPoint();
  camera.position.copy(startPosition);
  
  // Spawn player at a higher position for parachute drop
  camera.position.y += 20; // Spawn height for parachute drop
  
  // Set initial vertical velocity for gentle falling
  fpsControls.velocity.y = -2; // Slow initial descent
  fpsControls.isParachuting = true; // Enable parachute mode
  
  orbitControls.target.copy(startPosition);
  
  // Always use FPS controls when starting the game
  controlsMode = 'fps';
  orbitControls.enabled = false;
  fpsControls.enabled = true;
  
  // Force another render to ensure everything is visible
  renderer.render(scene, camera);
  
  // Initialize game manager after everything else is set up
  gameManager = new GameManager(scene, camera, fpsControls);
  
  // Start the game
  gameManager.startGame();
  
  // Add a document-wide click handler to ensure pointer lock
  document.addEventListener('click', () => {
    if (controlsMode === 'fps' && !document.pointerLockElement) {
      fpsControls.lock();
    }
  });
  
  // Request pointer lock to enable FPS controls
  // We need to do this with a slight delay to ensure the browser is ready
  setTimeout(() => {
    try {
      console.log('Requesting pointer lock...');
      fpsControls.lock();
      
      // Add a fallback in case the first attempt fails
      setTimeout(() => {
        if (!document.pointerLockElement) {
          console.log('Retrying pointer lock...');
          fpsControls.lock();
        }
      }, 500);
    } catch (error) {
      console.error('Error requesting pointer lock:', error);
    }
  }, 200);
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Toggle between FPS and orbit controls
function toggleControlMode() {
  if (controlsMode === 'orbit') {
    controlsMode = 'fps';
    orbitControls.enabled = false;
    fpsControls.enabled = true;
    
    // Request pointer lock when switching to FPS mode
    if (fpsControls && !document.pointerLockElement) {
      fpsControls.lock();
    }
  } else {
    controlsMode = 'orbit';
    fpsControls.enabled = false;
    orbitControls.enabled = true;
    
    // Exit pointer lock when switching to orbit mode
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
}

// Animation loop with fixed time step for consistent updates
function animate() {
  requestAnimationFrame(animate);
  
  // Calculate delta time
  const now = performance.now();
  let deltaTime = 0;
  
  if (lastTime !== null) {
    deltaTime = (now - lastTime) / 1000; // Convert to seconds
  }
  
  lastTime = now;
  
  // Update stats
  if (stats) stats.update();
  
  // Skip updates if menu is active and game hasn't started
  if (menuActive && !gameStarted) {
    renderer.render(scene, camera);
    return;
  }
  
  // If game has started, ensure menuActive is false
  if (gameStarted && menuActive) {
    console.warn('Game has started but menuActive is true. Forcing to false.');
    menuActive = false;
  }
  
  // Fixed time step for physics and gameplay
  accumulator += deltaTime;
  
  while (accumulator >= fixedTimeStep) {
    // Update game systems
    if (gameManager && gameManager.isGameRunning) {
      gameManager.update(fixedTimeStep);
    }
    
    if (vehicleSystem) {
      vehicleSystem.update(fixedTimeStep);
    }
    
    if (lootSystem) {
      lootSystem.update(fixedTimeStep);
    }
    
    if (shieldSystem) {
      shieldSystem.update(fixedTimeStep);
    }
    
    // Update controls based on mode
    if (controlsMode === 'fps' && fpsControls) {
      fpsControls.update(fixedTimeStep);
      
      // Update player position in multiplayer
      if (multiplayerConnector && gameManager && gameManager.localPlayer) {
        // Only send updates every 3 frames to reduce network traffic
        if (Math.floor(now / 50) % 3 === 0) {
          multiplayerConnector.updatePosition();
        }
      }
    } else if (controlsMode === 'orbit' && orbitControls) {
      orbitControls.update();
    }
    
    accumulator -= fixedTimeStep;
  }
  
  // Render scene
  renderer.render(scene, camera);
}

// Show main menu after loading screen
loadingManager.onLoad = function() {
  console.log('Loading complete');
  
  // We don't need to handle the loading screen transition anymore
  // as it's now handled in the HTML
};

// Lighting
function setupLights() {
  // Ambient light for base illumination - dramatically increased for better visibility in shadows
  const ambientLight = new THREE.AmbientLight(0x606080, 1.2);
  scene.add(ambientLight);
  
  // Note: The main directional light (moonlight) is now created in the CityGenerator.createMoon() method
  
  // Add some colored point lights to simulate neon
  const colors = [0xff00ff, 0x00ffff, 0x0033ff, 0x33ff00];
  for (let i = 0; i < 15; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const intensity = 2 + Math.random() * 3;
    const pointLight = new THREE.PointLight(color, intensity, 30);
    const x = (Math.random() - 0.5) * 100;
    const y = 3 + Math.random() * 20;
    const z = (Math.random() - 0.5) * 100;
    pointLight.position.set(x, y, z);
    scene.add(pointLight);
  }
  
  // Add a few fill lights to brighten shadowed areas
  addFillLights();
}

// Add subtle fill lights to brighten shadowed areas
function addFillLights() {
  // Create a few strategic fill lights at key positions
  const fillLightPositions = [
    { x: -50, y: 30, z: -50 },
    { x: 50, y: 30, z: 50 },
    { x: -50, y: 30, z: 50 },
    { x: 50, y: 30, z: -50 }
  ];
  
  // Add fill lights with a subtle blue tint
  for (const pos of fillLightPositions) {
    const fillLight = new THREE.PointLight(0xaaccff, 0.8, 150);
    fillLight.position.set(pos.x, pos.y, pos.z);
    // Disable shadows for these lights to improve performance
    fillLight.castShadow = false;
    scene.add(fillLight);
  }
}

// Initialize the application
init(); 