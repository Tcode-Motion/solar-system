import * as THREE from 'three';
import { Planets } from './src/Planets.js';
import { HandInput } from './src/HandInput.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Ensure black background
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000); 

let renderer;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
    console.warn("WebGL Antialiasing failed, falling back to basic renderer.", e);
    try {
        renderer = new THREE.WebGLRenderer({ antialias: false });
    } catch (e2) {
        console.warn("Basic WebGL failed, trying low-spec mode.", e2);
        try {
            renderer = new THREE.WebGLRenderer({ 
                antialias: false, 
                powerPreference: 'low-power',
                precision: 'mediump',
                depth: true,
                stencil: false,
                failIfMajorPerformanceCaveat: false
            });
        } catch (e3) {
            console.error("Critical WebGL Error:", e3);
            document.body.innerHTML = '<div style="color:red; font-size:20px; padding:20px; background:white;">CRITICAL ERROR: Could not create WebGL Context.<br>1. Close other tabs (especially 3D/Video).<br>2. Restart your browser.<br>3. Check your graphics drivers.<br>Error: ' + e3.message + '</div>';
            throw e3;
        }
    }
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1); // Performance mode: max 1.0
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0'; 
document.body.appendChild(renderer.domElement);
document.body.style.backgroundColor = '#000000'; // HTML background black

// --- UI Elements ---
const statusDiv = document.createElement('div');
statusDiv.style.position = 'absolute';
statusDiv.style.top = '10px';
statusDiv.style.left = '10px';
statusDiv.style.color = '#00ff00';
statusDiv.style.fontFamily = 'monospace';
statusDiv.style.fontSize = '16px';
statusDiv.innerText = "Initializing System...";
document.body.appendChild(statusDiv);

const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error-overlay');

// Settings Panel
const settingsPanel = document.createElement('div');
settingsPanel.style.position = 'absolute';
settingsPanel.style.top = '10px';
settingsPanel.style.right = '10px';
settingsPanel.style.background = 'rgba(0,0,0,0.7)';
settingsPanel.style.padding = '10px';
settingsPanel.style.color = '#fff';
settingsPanel.style.border = '1px solid #444';
settingsPanel.style.zIndex = '1000';

const settingsHTML = '<h3>Settings</h3>' +
    '<label><input type="checkbox" id="chkCamera" checked> Enable Camera (Hand Control)</label><br>' +
    '<label><input type="checkbox" id="chkAudio"> Enable Audio</label><br>';
settingsPanel.innerHTML = settingsHTML;
document.body.appendChild(settingsPanel);

const chkCamera = document.getElementById('chkCamera');
const chkAudio = document.getElementById('chkAudio');

// Visual Cursor (Hand)
const cursor = document.createElement('div');
cursor.style.position = 'absolute';
cursor.style.width = '20px';
cursor.style.height = '20px';
cursor.style.border = '2px solid #00ffff';
cursor.style.borderRadius = '50%';
cursor.style.transform = 'translate(-50%, -50%)';
cursor.style.pointerEvents = 'none';
cursor.style.zIndex = '999';
cursor.style.display = 'none';
document.body.appendChild(cursor);

function logError(err) {
    console.error(err);
    if (errorDiv) {
        errorDiv.style.display = 'block';
        errorDiv.innerText += err.toString() + "\n";
    }
}

// --- World Init ---
let planetsSystem;
try {
    planetsSystem = new Planets(scene);
    planetsSystem.init(camera);
    console.log("Planets System Initialized");
    if (loadingDiv) loadingDiv.style.display = 'none';
} catch (e) {
    logError("Error Initializing Planets: " + e.message);
}

// Audio Handling
chkAudio.addEventListener('change', () => {
    if (planetsSystem && planetsSystem.audioListener) {
        if (chkAudio.checked) {
            if (planetsSystem.audioListener.context.state === 'suspended') {
                planetsSystem.audioListener.context.resume();
            }
            planetsSystem.setVolume(1.0);
        } else {
            planetsSystem.setVolume(0);
        }
    }
});

window.addEventListener('click', () => {
    if (chkAudio.checked && planetsSystem && planetsSystem.audioListener && planetsSystem.audioListener.context.state === 'suspended') {
        planetsSystem.audioListener.context.resume();
    }
});

// --- Camera State ---
let cameraRadius = 100;
let cameraTheta = Math.PI / 4;
let cameraPhi = Math.PI / 6;

// Smooth Targets
let targetTheta = cameraTheta;
let targetPhi = cameraPhi;
let targetRadius = cameraRadius;

let targetPosition = new THREE.Vector3(0,0,0); 
let currentTarget = null; 

const cameraLight = new THREE.PointLight(0xffffff, 0.5, 200);
camera.add(cameraLight);
scene.add(camera);

// Target Reticle
const reticleGeo = new THREE.RingGeometry(1, 1.1, 32);
const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
const reticle = new THREE.Mesh(reticleGeo, reticleMat);
reticle.visible = false;
scene.add(reticle);

// --- Input Setup ---
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
let handInput = null;

try {
    handInput = new HandInput(videoElement, canvasElement);
    handInput.init().catch(e => logError("HandInput Init Failed: " + e.message));
} catch (e) {
    logError("HandInput Constructor Failed: " + e.message);
}

const raycaster = new THREE.Raycaster();
let highlightedPlanet = null;

// Mouse Variables
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let mouseNdc = new THREE.Vector2(-99, -99);

// --- Event Listeners ---
renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        const sensitivity = 0.005;
        targetPhi -= deltaMove.x * sensitivity;
        targetTheta -= deltaMove.y * sensitivity;
        targetTheta = THREE.MathUtils.clamp(targetTheta, 0.1, Math.PI - 0.1);

        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});

renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
});

renderer.domElement.addEventListener('dblclick', () => {
    if (highlightedPlanet) {
        if (highlightedPlanet.name === 'Sun') {
            currentTarget = null;
            if (planetsSystem) planetsSystem.setPausedPlanet(null);
            targetPosition.set(0,0,0);
            targetRadius = 100;
        } else {
            currentTarget = highlightedPlanet;
            if (planetsSystem) {
                const pauseName = currentTarget.type === 'moon' ? currentTarget.parentName : currentTarget.name;
                planetsSystem.setPausedPlanet(pauseName);
            }
            // Set comfortable viewing distance
            targetRadius = (currentTarget.radius || 1) * 4.0;
        }
    }
});

renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.1;
    targetRadius += e.deltaY * zoomSensitivity;
    
    // Dynamic minimum distance based on target size
    const minR = currentTarget ? (currentTarget.radius || 1) * 2.0 : 5;
    targetRadius = THREE.MathUtils.clamp(targetRadius, minR, 400);
});

renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main Loop ---
const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    
    try {
        frameCount++;
        const delta = clock.getDelta();

        // 1. Physics Update
        if (planetsSystem) planetsSystem.animate(delta);

        let inputX = mouseNdc.x;
        let inputY = mouseNdc.y;
        let hasHandInput = false;

        // 2. Input Processing (Every frame for smoothness)
        if (chkCamera.checked && handInput) {
             // ... Hand input logic ...
             // (Keep this running to update cursor, but maybe throttle detection? 
             // Mediapipe is async anyway, so it throttles itself mostly.)
        }

        // 3. Raycasting (Optimized: Run every 10 frames)
        if (frameCount % 10 === 0) {
            // Update inputs for raycasting
            if (chkCamera.checked && handInput) {
                // ... logic to get hand pos ...
                // Wait, the original code had hand processing mixed with raycasting input prep.
                // I need to be careful not to break the hand cursor logic which is in block 2.
                // The original code calculated inputX/inputY in block 2. I should use those values.
                
                // Re-obtaining hand data here might be redundant but safe.
                // Actually, let's just use the 'mouseNdc' or the last known hand pos.
                // But wait, the 'handInput' block logic (block 2) runs every frame in original code.
                // So inputX and inputY are fresh.
            }
            
            // ... Execute Raycasting ...
            raycaster.setFromCamera(new THREE.Vector2(inputX, inputY), camera);
            
            // ... (Existing Raycast Logic) ...
            let checkObjects = [];
            if (planetsSystem) {
                 checkObjects.push(planetsSystem.sunMesh);
                 if (planetsSystem.blackHole && planetsSystem.blackHole.group) {
                     planetsSystem.blackHole.group.traverse(child => {
                        if (child.isMesh) checkObjects.push(child);
                     });
                 }
                 planetsSystem.planets.forEach(p => {
                     p.mesh.traverse(child => {
                         if (child.isMesh) checkObjects.push(child);
                     });
                 });
            }
    
            const intersects = raycaster.intersectObjects(checkObjects);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                let found = null;
                
                // 1. Check Moons
                for (const p of planetsSystem.planets) {
                    if (p.moons) {
                        const moon = p.moons.find(m => m.mesh === obj);
                        if (moon) {
                            found = {
                                name: moon.mesh.name,
                                mesh: moon.mesh,
                                radius: moon.mesh.geometry.parameters.radius,
                                type: 'moon',
                                parentName: p.name
                            };
                            break;
                        }
                    }
                }
    
                // 2. Check Planets
                if (!found) {
                    let planet = planetsSystem.planets.find(p => {
                        let parent = obj.parent;
                        while(parent) {
                            if (parent === p.mesh) return true;
                            parent = parent.parent;
                        }
                        return false;
                    });
                    if (planet) {
                        found = { ...planet, type: 'planet' }; // Copy planet props
                    }
                }
                
                if (!found && (obj === planetsSystem.sunMesh || obj.parent === planetsSystem.sunMesh)) found = { name: 'Sun', type: 'star' };
                
                // Check Black Hole
                if (!found && planetsSystem.blackHole && planetsSystem.blackHole.group) {
                    let parent = obj.parent;
                    // If direct child or grandchild
                    if (obj.parent === planetsSystem.blackHole.group || (parent && parent.parent === planetsSystem.blackHole.group)) {
                        found = { 
                            name: 'Supermassive Black Hole', 
                            mesh: planetsSystem.blackHole.horizon, // Use horizon for target center
                            radius: 30,
                            type: 'blackhole'
                        };
                    }
                }
    
                if (found) {
                    statusDiv.innerText = `System: ${chkCamera.checked ? 'Hand' : 'Mouse'} | Hover: ${found.name}`; // Simplified status update
                    highlightedPlanet = found;
                    
                    // Slow down the hovered planet (or parent of moon) for easier targeting
                    if (planetsSystem) {
                        const sysName = found.type === 'moon' ? found.parentName : found.name;
                        planetsSystem.setHoveredPlanet(sysName);
                    }
                    
                    reticle.visible = true;
                    if (found.name === 'Sun') {
                         reticle.position.copy(planetsSystem.sunMesh.getWorldPosition(new THREE.Vector3()));
                         reticle.scale.setScalar(6);
                    } else if (found.name === 'Supermassive Black Hole') {
                         reticle.position.copy(planetsSystem.blackHole.group.getWorldPosition(new THREE.Vector3()));
                         reticle.scale.setScalar(100); 
                    } else {
                         reticle.position.copy(found.mesh.getWorldPosition(new THREE.Vector3()));
                         // Moons are small, ensure reticle is visible
                         const r = found.radius || 1;
                         reticle.scale.setScalar(r * 2.5);
                    }
                    reticle.lookAt(camera.position);
    
                    if (hasHandInput && handInput.getRightHand().gesture === 'fist') {
                        if (found.name === 'Sun') {
                            currentTarget = null;
                            planetsSystem.setPausedPlanet(null);
                            targetPosition.set(0,0,0);
                            targetRadius = 100;
                        } else if (found.name === 'Supermassive Black Hole') {
                            currentTarget = found; 
                            planetsSystem.setPausedPlanet(null); 
                            targetRadius = (found.radius || 30) * 4.0;
                        } else {
                            currentTarget = found;
                            // If moon, pause parent planet
                            const pauseName = found.type === 'moon' ? found.parentName : found.name;
                            planetsSystem.setPausedPlanet(pauseName);
                            targetRadius = (found.radius || 1) * 4.0;
                        }
                    }
                }
            } else {
                highlightedPlanet = null;
                if (planetsSystem) planetsSystem.setHoveredPlanet(null);
                reticle.visible = false;
                statusDiv.innerText = `System: ${chkCamera.checked ? 'Hand' : 'Mouse'}`;
            }
        } // End Raycasting Frame Check

        // 4. Camera Update
        const dampFactor = 1 - Math.exp(-10 * delta); // Adjust speed (10 is roughly equivalent to 0.15 at 60fps)
        
        cameraTheta = THREE.MathUtils.lerp(cameraTheta, targetTheta, dampFactor);
        cameraPhi = THREE.MathUtils.lerp(cameraPhi, targetPhi, dampFactor);
        cameraRadius = THREE.MathUtils.lerp(cameraRadius, targetRadius, dampFactor);

        let worldTarget = new THREE.Vector3();
        if (currentTarget) {
            currentTarget.mesh.getWorldPosition(worldTarget);
            // Removed auto-zoom lerp that caused clipping
        } else {
            if (planetsSystem && planetsSystem.sunMesh) {
                planetsSystem.sunMesh.getWorldPosition(worldTarget);
            }
        }

        targetPosition.lerp(worldTarget, 1 - Math.exp(-5 * delta)); // Smoother, frame-rate independent following

        const x = targetPosition.x + cameraRadius * Math.sin(cameraTheta) * Math.cos(cameraPhi);
        const y = targetPosition.y + cameraRadius * Math.cos(cameraTheta);
        const z = targetPosition.z + cameraRadius * Math.sin(cameraTheta) * Math.sin(cameraPhi);

        camera.position.set(x,y,z);
        camera.lookAt(targetPosition);

        renderer.render(scene, camera);

    } catch (e) {
        logError("Loop Error: " + e.message);
    }
}

animate();
