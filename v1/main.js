import * as THREE from 'three';
import { Planets } from './src/Planets.js?v=4';
import { HandInput } from './src/HandInput.js?v=4';

// --- Global State ---
let renderer, is3D = true, planetsSystem, handInput = null;
const raycaster = new THREE.Raycaster();
let highlightedPlanet = null, currentTarget = null, reticle = null;
let cameraRadius = 100, cameraTheta = Math.PI/4, cameraPhi = Math.PI/6;
let targetTheta = cameraTheta, targetPhi = cameraPhi, targetRadius = cameraRadius;
let targetPosition = new THREE.Vector3(0,0,0);
let currentSystemName = 'Solar System';
let isDragging = false, prevMouse = {x:0, y:0}, mouseNdc = new THREE.Vector2(-99,-99);
const clock = new THREE.Clock();
let frameCount = 0;
let isTableView = false; // Track view state globally

// --- Init Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 5000);

// --- Init Renderer (Safe) ---
const canvas = document.createElement('canvas');
canvas.id = 'glCanvas';
document.body.appendChild(canvas);
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'default' });
} catch (e) {
    console.warn("Standard WebGL failed");
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power', precision: 'lowp' });
    } catch (e2) {
        is3D = false;
        console.error("Critical WebGL Error");
        showSystemData(currentSystemName); // Fallback to table immediately
    }
}

if (is3D) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1.0); // Standard DPI for perf
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
}

// --- UI ---
const statusDiv = document.createElement('div');
statusDiv.style.cssText = "position:absolute; top:10px; left:10px; color:#0f0; font-family:monospace; pointer-events:none;";
statusDiv.innerText = "System Ready";
document.body.appendChild(statusDiv);

const loadingDiv = document.getElementById('loading');
if (loadingDiv) loadingDiv.style.display = 'none';

// Warp Overlay
const warpOverlay = document.createElement('div');
warpOverlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9000; display:flex; justify-content:center; align-items:center; overflow:hidden;";
warpOverlay.innerHTML = `
    <style>
        @keyframes warpSpeed {
            0% { transform: scale(1) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: scale(5) rotate(180deg); opacity: 1; }
        }
        .warping-tunnel {
            animation: warpSpeed 1.5s cubic-bezier(0.7, 0, 0.3, 1) forwards;
        }
    </style>
    <div id="warp-tunnel" style="
        position: absolute;
        width: 200vw; height: 200vh;
        background: radial-gradient(circle, transparent 10%, #000 100%),
                    conic-gradient(from 0deg, transparent 0%, #00ffff 10%, transparent 20%, transparent 50%, #0088ff 60%, transparent 70%);
        background-size: 100% 100%;
        opacity: 0;
        border-radius: 50%;
        mix-blend-mode: screen;
    "></div>
    <div id="warp-flash" style="
        position: absolute; width: 100%; height: 100%; background: white; opacity: 0; transition: opacity 0.5s ease-in-out;
    "></div>
`;
document.body.appendChild(warpOverlay);

// Settings
const settingsPanel = document.createElement('div');
settingsPanel.style.cssText = "position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:10px; color:white; border:1px solid #444; z-index:1000;";
settingsPanel.innerHTML = '<h3>Settings</h3><label><input type="checkbox" id="chkCamera"> Hand Control</label><br><label><input type="checkbox" id="chkAudio"> Audio</label><br><br><button id="btnGalaxyMap" style="background:#0088ff; color:white; border:1px solid #0055aa; padding:8px; width:100%; margin-bottom:5px;">Galaxy Map</button><button id="btnToggleView" style="background:#444; color:white; border:1px solid #888; padding:5px; width:100%;">Data Table</button>';
document.body.appendChild(settingsPanel);

// --- Logic ---
if (is3D) {
    try {
        planetsSystem = new Planets(scene);
        planetsSystem.init(camera);
        
        // Reticle
        const reticleGeo = new THREE.RingGeometry(1, 1.1, 32);
        const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
        reticle = new THREE.Mesh(reticleGeo, reticleMat);
        reticle.visible = false;
        scene.add(reticle);
        
        const camLight = new THREE.PointLight(0xffffff, 0.5);
        camera.add(camLight);
        scene.add(camera);
    } catch(e) { console.error(e); }
    
    animate();
}

// Listeners
document.getElementById('chkCamera').addEventListener('change', (e) => {
    if (e.target.checked && !handInput) {
        handInput = new HandInput(document.getElementById('input_video'), document.getElementById('output_canvas'));
        handInput.init();
    }
});

document.getElementById('chkAudio').addEventListener('change', (e) => {
    if (planetsSystem) planetsSystem.setVolume(e.target.checked ? 1 : 0);
});

document.getElementById('btnGalaxyMap').addEventListener('click', showGalaxyMap);
document.getElementById('btnToggleView').addEventListener('click', toggleView);

if (is3D) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Mouse Controls
    renderer.domElement.addEventListener('mousedown', e => { isDragging = true; prevMouse = {x:e.clientX, y:e.clientY}; });
    renderer.domElement.addEventListener('mouseup', () => isDragging = false);
    renderer.domElement.addEventListener('mousemove', e => {
        if (isDragging) {
            const dx = e.clientX - prevMouse.x;
            const dy = e.clientY - prevMouse.y;
            targetPhi -= dx * 0.005;
            targetTheta = Math.max(0.1, Math.min(Math.PI-0.1, targetTheta - dy * 0.005));
            prevMouse = {x:e.clientX, y:e.clientY};
        }
        const rect = renderer.domElement.getBoundingClientRect();
        mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    renderer.domElement.addEventListener('wheel', e => {
        const minR = currentTarget ? (currentTarget.radius || 1) * 2.0 : 5;
        targetRadius = Math.max(minR, Math.min(800, targetRadius + e.deltaY * 0.1));
    });
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);
}

// --- Functions ---
function animate() {
    requestAnimationFrame(animate);
    frameCount++;
    if (frameCount % 2 !== 0) return; // 30 FPS Cap

    const delta = clock.getDelta();
    if (planetsSystem) planetsSystem.animate(delta);

    // Hand Input
    let hasHand = false;
    if (handInput && document.getElementById('chkCamera').checked) {
        const hand = handInput.getRightHand();
        if (hand) {
            hasHand = true;
            // Map hand to screen pos
            // ... (Simplified logic)
        }
    }

    // Raycast (Throttle)
    if (frameCount % 10 === 0) {
        raycaster.setFromCamera(mouseNdc, camera);
        let hits = [];
        if (planetsSystem) {
            // Check All Stars in Galaxy
            if (planetsSystem.systems) {
                planetsSystem.systems.forEach(sys => {
                    if (sys.group.children.length > 0) hits.push(sys.group.children[0]);
                });
            }
            if (planetsSystem.planets) {
                planetsSystem.planets.forEach(p => { if(p.mesh) p.mesh.traverse(c => {if(c.isMesh) hits.push(c)}); });
            }
            if (planetsSystem.blackHole && planetsSystem.blackHole.group) {
                planetsSystem.blackHole.group.traverse(c => {if(c.isMesh) hits.push(c)});
            }
        }
        
        const intersects = raycaster.intersectObjects(hits);
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            // Identify Object
            let found = null;
            if (planetsSystem) {
                // Check Systems
                if (planetsSystem.systems) {
                    found = planetsSystem.systems.find(s => s.group.children[0] === obj);
                    if (found) found.type = 'star';
                }
                
                // Check Planets
                if (!found && planetsSystem.planets) found = planetsSystem.planets.find(p => {
                    let parent = obj.parent;
                    while(parent) { if (parent === p.mesh) return true; parent = parent.parent; }
                });
                if (found && !found.type) found.type = 'planet';
                
                // Check BH
                if (!found && planetsSystem.blackHole && (obj.parent === planetsSystem.blackHole.group || obj.parent?.parent === planetsSystem.blackHole.group)) {
                    found = { name: 'Black Hole', type: 'blackhole', radius: 30 };
                }
            }
            
            if (found) {
                highlightedPlanet = found;
                if (reticle) {
                    reticle.visible = true;
                    const pos = new THREE.Vector3();
                    obj.getWorldPosition(pos);
                    reticle.position.copy(pos);
                    let r = found.radius || 1;
                    if (found.type === 'star') r *= 1.2;
                    if (found.type === 'blackhole') r = 100;
                    reticle.scale.setScalar(r * 2.5);
                    reticle.lookAt(camera.position);
                }
                statusDiv.innerText = "Hover: " + found.name;
                // Auto-slowdown
                if (planetsSystem) {
                    const sysName = found.type === 'moon' ? found.parentName : found.name;
                    planetsSystem.setHoveredPlanet(sysName);
                }
            }
        } else {
            highlightedPlanet = null;
            if (reticle) reticle.visible = false;
            if (planetsSystem) planetsSystem.setHoveredPlanet(null);
            statusDiv.innerText = "System Ready";
        }
    }

    // Camera
    const lerp = 0.1;
    cameraTheta += (targetTheta - cameraTheta) * lerp;
    cameraPhi += (targetPhi - cameraPhi) * lerp;
    cameraRadius += (targetRadius - cameraRadius) * lerp;
    
    let targetVec = new THREE.Vector3();
    if (currentTarget) {
        if (currentTarget.mesh) currentTarget.mesh.getWorldPosition(targetVec);
        else if (currentTarget.group) currentTarget.group.getWorldPosition(targetVec);
        else if (currentTarget.getWorldPosition) currentTarget.getWorldPosition(targetVec);
    } else if (planetsSystem) {
        // Fallback: Follow the center of the currently active system
        const activeSys = planetsSystem.systems.find(s => s.name === currentSystemName);
        if (activeSys) {
            activeSys.group.getWorldPosition(targetVec);
        } else {
            planetsSystem.solarSystemGroup.getWorldPosition(targetVec);
        }
    }
    targetPosition.lerp(targetVec, 0.1);

    camera.position.x = targetPosition.x + cameraRadius * Math.sin(cameraTheta) * Math.cos(cameraPhi);
    camera.position.y = targetPosition.y + cameraRadius * Math.cos(cameraTheta);
    camera.position.z = targetPosition.z + cameraRadius * Math.sin(cameraTheta) * Math.sin(cameraPhi);
    camera.lookAt(targetPosition);

    renderer.render(scene, camera);
}

function handleDoubleClick() {
    if (highlightedPlanet) {
        if (highlightedPlanet.type === 'star') {
            warpToSystem(highlightedPlanet.name);
        } 
        else if (highlightedPlanet.type === 'blackhole') {
            currentTarget = highlightedPlanet;
            if (planetsSystem) planetsSystem.setPausedPlanet(null); 
            targetRadius = 150;
        }
        else {
            currentTarget = highlightedPlanet;
            if (planetsSystem) {
                const pauseName = highlightedPlanet.type === 'moon' ? highlightedPlanet.parentName : highlightedPlanet.name;
                planetsSystem.setPausedPlanet(pauseName);
            }
            targetRadius = (highlightedPlanet.radius || 1) * 4.0;
        }
    } else {
        currentTarget = null;
        if (planetsSystem) planetsSystem.setPausedPlanet(null);
        targetRadius = 150;
    }
}

function showGalaxyMap() {
    if (!planetsSystem || !planetsSystem.systems) return;
    
    // Create Map Overlay Container
    const mapDiv = document.createElement('div');
    mapDiv.id = 'galaxy-map-overlay';
    mapDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:2000; display:flex; justify-content:center; align-items:center; flex-direction:column;';
    
    // Header
    const header = document.createElement('h1');
    header.innerText = 'Wormhole Navigation';
    header.style.cssText = 'color:#00ffff; text-shadow:0 0 10px blue; margin-bottom: 5px;';
    mapDiv.appendChild(header);

    const sub = document.createElement('p');
    sub.innerText = 'Select a Star System to Warp';
    sub.style.cssText = 'color:#aaa; margin-bottom: 20px;';
    mapDiv.appendChild(sub);

    // Map Container
    const mapContainer = document.createElement('div');
    mapContainer.style.cssText = 'position:relative; width:80%; height:70%; border:2px solid #333; background:radial-gradient(circle, #111 0%, #000 100%); border-radius:10px; overflow:hidden;';
    mapDiv.appendChild(mapContainer);
    
    // Center Black Hole Marker
    const bhMarker = document.createElement('div');
    bhMarker.style.cssText = 'position:absolute; top:50%; left:50%; width:20px; height:20px; background:#000; border:2px solid #fff; border-radius:50%; transform:translate(-50%, -50%); box-shadow:0 0 30px white;';
    mapContainer.appendChild(bhMarker);
    
    // Plot Systems
    planetsSystem.systems.forEach(sys => {
        const node = document.createElement('div');
        const x = 50 + (Math.cos(sys.angle) * (sys.dist/800) * 40); 
        const y = 50 + (Math.sin(sys.angle) * (sys.dist/800) * 40);
        
        node.style.cssText = `position:absolute; left:${x}%; top:${y}%; width:12px; height:12px; background:${sys.name === 'Solar System' ? 'yellow' : 'orange'}; border-radius:50%; cursor:pointer; transform:translate(-50%, -50%); border:1px solid #fff; transition:all 0.2s;`;
        node.title = sys.name;
        
        // Label
        const label = document.createElement('span');
        label.innerText = sys.name;
        label.style.cssText = 'position:absolute; top:15px; left:50%; transform:translateX(-50%); color:white; font-size:12px; white-space:nowrap; pointer-events:none; text-shadow:0 0 5px #000;';
        node.appendChild(label);

        // Hover Effect
        node.onmouseenter = () => { node.style.transform = 'translate(-50%,-50%) scale(1.5)'; node.style.boxShadow = '0 0 10px yellow'; };
        node.onmouseleave = () => { node.style.transform = 'translate(-50%,-50%) scale(1)'; node.style.boxShadow = 'none'; };

        // Click Action
        node.onclick = () => {
            warpToSystem(sys.name);
        };

        mapContainer.appendChild(node);
    });
    
    // Close Button
    const btnClose = document.createElement('button');
    btnClose.innerText = 'Close Map';
    btnClose.style.cssText = 'margin-top:20px; padding:10px 20px; background:#444; color:white; border:none; cursor:pointer; border-radius:5px; font-size:14px;';
    btnClose.onclick = () => mapDiv.remove();
    mapDiv.appendChild(btnClose);
    
    document.body.appendChild(mapDiv);
}

window.warpToSystem = function(name) {
    const mapOverlay = document.getElementById('galaxy-map-overlay');
    if (mapOverlay) mapOverlay.remove();
    
    const sys = planetsSystem.systems.find(s => s.name === name);
    if (!sys) return;
    
    statusDiv.innerText = `HYPERSPACE JUMP TO ${name.toUpperCase()}...`;
    
    // 1. Engage Warp Visuals
    const tunnel = document.getElementById('warp-tunnel');
    const flash = document.getElementById('warp-flash');
    
    tunnel.classList.remove('warping-tunnel');
    void tunnel.offsetWidth; 
    tunnel.classList.add('warping-tunnel');
    
    // 2. Camera FOV
    const startFOV = camera.fov;
    let fovFrame = 0;
    const fovInterval = setInterval(() => {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 150, 0.1);
        camera.updateProjectionMatrix();
        fovFrame++;
        if (fovFrame > 40) clearInterval(fovInterval);
    }, 16);

    // 3. Flash & Arrival
    setTimeout(() => {
        if (flash) flash.style.opacity = 1;
        
        setTimeout(() => {
            const pos = new THREE.Vector3();
            sys.group.getWorldPosition(pos);
            targetPosition.copy(pos).add(new THREE.Vector3(80, 40, 80));
            targetRadius = 100;
            currentSystemName = name;
            camera.position.copy(targetPosition);
            camera.lookAt(pos);
            
            if (planetsSystem) planetsSystem.setPausedPlanet(name);
            
            if (flash) flash.style.opacity = 0;
            tunnel.classList.remove('warping-tunnel');
            tunnel.style.opacity = 0;
            
            statusDiv.innerText = `ARRIVED: ${name}`;
            camera.fov = 60;
            camera.updateProjectionMatrix();
            
            // Auto lock star
            if (sys.group.children[0]) {
                currentTarget = { name: name, mesh: sys.group.children[0], radius: sys.group.children[0].scale.x };
                targetRadius = currentTarget.radius * 6.0;
            }
        }, 500);
    }, 1000);
}

function showSystemData(sysName) {
    // Hide canvas if 3D, remove if 2D
    if (is3D && canvas) canvas.style.display = 'none';
    
    const old = document.getElementById('solar-data-table');
    if (old) old.remove();
    
    let planets = [];
    if (planetsSystem && planetsSystem.planets) {
        planets = planetsSystem.planets.filter(p => p.system === sysName);
    }
    
    const container = document.createElement('div');
    container.id = 'solar-data-table';
    container.style.cssText = "position:absolute; top:60px; left:50%; transform:translate(-50%,0); width:90%; max-width:800px; color:white; background:rgba(0,0,0,0.9); padding:20px; border:1px solid #444; font-family:sans-serif; z-index:5000;";
    
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 style="color:#00ffff; margin:0;">${sysName.toUpperCase()} DATA</h2>
        <button id="btnCloseTableInternal" style="background:#ff3333; color:white; border:none; padding:8px 16px; cursor:pointer; font-weight:bold; border-radius:4px;">CLOSE X</button>
    </div>
    <table style="width:100%; border-collapse:collapse;">
    <tr style="background:#333; color:#0f0;"><th style="padding:8px; text-align:left;">Planet</th><th style="padding:8px; text-align:left;">Radius (Relative)</th><th style="padding:8px; text-align:left;">Orbit Dist</th></tr>`;
    
    if (planets.length === 0) {
        html += `<tr><td colspan="3" style="padding:15px; text-align:center; color:#888;">No planetary data available for this system.</td></tr>`;
    } else {
        planets.forEach((p, i) => {
            const bg = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent';
            html += `<tr style="background:${bg}; border-bottom:1px solid #444;">
                <td style="padding:8px;">${p.name}</td>
                <td style="padding:8px;">${typeof p.radius === 'number' ? p.radius.toFixed(2) : p.radius}</td>
                <td style="padding:8px;">${typeof p.distance === 'number' ? p.distance.toFixed(0) : p.distance}</td>
            </tr>`;
        });
    }
    html += '</table>';
    
    container.innerHTML = html;
    document.body.appendChild(container);
    document.body.style.backgroundColor = '#000';
    
    const btn = document.getElementById('btnCloseTableInternal');
    if (btn) btn.onclick = toggleView;
}

function toggleView() {
    const table = document.getElementById('solar-data-table');
    if (table) {
        table.remove();
        isTableView = false;
        if (is3D) canvas.style.display = 'block';
        btnToggleView.innerText = "Switch to Data Table";
    } else {
        isTableView = true;
        showSystemData(currentSystemName);
        btnToggleView.innerText = "Switch to 3D View";
    }
}// force update 
