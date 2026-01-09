import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';
import { BlackHole } from './BlackHole.js';

export class Planets {
    constructor(scene) {
        this.scene = scene;
        this.textureGen = new TextureGenerator();
        this.planets = []; // { mesh, distance, speed, angle, name, group }
        
        // Galactic Center Pivot (Background rotation)
        this.galaxyPivot = new THREE.Group();
        this.scene.add(this.galaxyPivot);
        
        // Supermassive Black Hole
        this.blackHole = new BlackHole(this.galaxyPivot, null); 
        
        // Solar System Container (Detached for independent orbit)
        this.solarSystemGroup = new THREE.Group();
        this.scene.add(this.solarSystemGroup); 
        this.solarSystemAngle = 0;
        this.solarSystemDist = 400;
        this.solarSystemSpeed = 0.0003;

        // Tau Ceti System Container (12 Light Years away -> Distance 600)
        this.tauCetiGroup = new THREE.Group();
        this.scene.add(this.tauCetiGroup);
        this.tauCetiAngle = Math.PI; 
        this.tauCetiDist = 600; 
        this.tauCetiSpeed = 0.0002;

        // Configuration: Solar System
        this.config = [
            { name: 'Mercury', radius: 0.8, distance: 10, speed: 0.02, type: 'mercury' },
            { name: 'Venus',   radius: 1.2, distance: 15, speed: 0.015, type: 'venus' },
            { name: 'Earth',   radius: 1.3, distance: 20, speed: 0.01,  type: 'earth', 
              moons: [{name: 'Luna', r: 0.3, d: 2.5, s: 0.05}] 
            }, 
            { name: 'Mars',    radius: 0.9, distance: 25, speed: 0.008, type: 'mars', 
              moons: [
                  {name: 'Phobos', r: 0.06, d: 1.4, s: 0.2}, 
                  {name: 'Deimos', r: 0.04, d: 1.8, s: 0.15}
              ] 
            },
            { name: 'Jupiter', radius: 3.5, distance: 35, speed: 0.004, type: 'jupiter', 
              moons: [
                  {name: 'Io',       r: 0.25, d: 4.2, s: 0.04}, 
                  {name: 'Europa',   r: 0.22, d: 4.8, s: 0.035},
                  {name: 'Ganymede', r: 0.35, d: 5.6, s: 0.03}, 
                  {name: 'Callisto', r: 0.32, d: 6.5, s: 0.025},
                  {name: 'Amalthea', r: 0.08, d: 3.8, s: 0.1},
                  {name: 'Himalia',  r: 0.06, d: 7.5, s: 0.01}
              ] 
            },
            { name: 'Saturn',  radius: 3.0, distance: 45, speed: 0.003, type: 'saturn', ring: true, 
              moons: [
                  {name: 'Mimas',    r: 0.08, d: 4.0, s: 0.06},
                  {name: 'Enceladus',r: 0.10, d: 4.5, s: 0.05},
                  {name: 'Tethys',   r: 0.15, d: 5.0, s: 0.045},
                  {name: 'Dione',    r: 0.15, d: 5.6, s: 0.04},
                  {name: 'Rhea',     r: 0.18, d: 6.2, s: 0.035},
                  {name: 'Titan',    r: 0.38, d: 7.5, s: 0.025}, 
                  {name: 'Iapetus',  r: 0.12, d: 9.0, s: 0.015}
              ] 
            },
            { name: 'Uranus',  radius: 2.0, distance: 55, speed: 0.002, type: 'uranus', 
              moons: [
                  {name: 'Miranda',  r: 0.08, d: 2.5, s: 0.08},
                  {name: 'Ariel',    r: 0.12, d: 3.0, s: 0.06},
                  {name: 'Umbriel',  r: 0.12, d: 3.5, s: 0.05},
                  {name: 'Titania',  r: 0.15, d: 4.2, s: 0.04},
                  {name: 'Oberon',   r: 0.14, d: 4.8, s: 0.03}
              ] 
            },
            { name: 'Neptune', radius: 1.9, distance: 65, speed: 0.001, type: 'neptune', 
              moons: [
                  {name: 'Proteus',  r: 0.08, d: 2.8, s: 0.07},
                  {name: 'Triton',   r: 0.25, d: 3.5, s: -0.04}, // Retrograde
                  {name: 'Nereid',   r: 0.06, d: 5.5, s: 0.01}
              ] 
            },
            { name: 'Pluto',   radius: 0.4, distance: 75, speed: 0.0008, type: 'pluto', 
              moons: [
                  {name: 'Charon',   r: 0.20, d: 0.8, s: 0.02}, 
                  {name: 'Styx',     r: 0.02, d: 1.2, s: 0.018},
                  {name: 'Nix',      r: 0.02, d: 1.4, s: 0.016},
                  {name: 'Kerberos', r: 0.02, d: 1.6, s: 0.014},
                  {name: 'Hydra',    r: 0.03, d: 1.8, s: 0.012}
              ] 
            }
        ];
        
        this.audioListener = null;
        this.pausedPlanetName = null;
        this.hoveredPlanetName = null;
    }

    setPausedPlanet(name) { this.pausedPlanetName = name; }
    setHoveredPlanet(name) { this.hoveredPlanetName = name; }

    init(camera) {
        this.camera = camera;
        this.blackHole.camera = camera;
        this.createSun();
        this.createPlanets();
        this.createTauCetiSystem();
        this.createLights();
        this.createStarfield(); 
        
        if (this.camera) {
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);
            this.setupAudio();
        }
    }

    setVolume(vol) {
        if (this.audioListener) this.audioListener.setMasterVolume(vol);
    }

    setupAudio() {
        const audioLoader = new THREE.AudioLoader();
        const listener = this.audioListener;
        const ctx = listener.context;
        const sampleRate = ctx.sampleRate;
        const duration = 2.0;
        const frameCount = sampleRate * duration;
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        
        let lastOut = 0;
        for (let i = 0; i < frameCount; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }

        const sunSound = new THREE.PositionalAudio(listener);
        sunSound.setBuffer(buffer);
        sunSound.setLoop(true);
        sunSound.setRefDistance(20);
        sunSound.setVolume(0.5);
        sunSound.play();
        this.sunMesh.add(sunSound);
    }

    createSun() {
        const geometry = new THREE.SphereGeometry(5, 64, 64);
        const loader = new THREE.TextureLoader();
        const material = new THREE.MeshBasicMaterial({ 
            map: loader.load('./textures/sun.jpg'),
            color: 0xffffff 
        });
        this.sunMesh = new THREE.Mesh(geometry, material);
        this.solarSystemGroup.add(this.sunMesh);

        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: this.createGlowTexture(), 
            color: 0xffaa00, 
            transparent: true, 
            blending: THREE.AdditiveBlending 
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(15, 15, 1.0);
        this.sunMesh.add(sprite);
    }

    createTauCetiSystem() {
        const loader = new THREE.TextureLoader();
        
        // 1. Tau Ceti Star
        const sunGeo = new THREE.SphereGeometry(4.5, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ 
            map: loader.load('./textures/sun.jpg'), 
            color: 0xffdd88 
        });
        const star = new THREE.Mesh(sunGeo, sunMat);
        this.tauCetiGroup.add(star);
        
        const glowMat = new THREE.SpriteMaterial({ 
            map: this.createGlowTexture(), 
            color: 0xffcc44, 
            transparent: true, 
            blending: THREE.AdditiveBlending 
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(12, 12, 1.0);
        star.add(glow);

        const light = new THREE.PointLight(0xffddaa, 1.5, 200);
        this.tauCetiGroup.add(light);

        // 2. Planets
        for (let i = 0; i < 8; i++) {
            const planetName = `Tau Ceti ${String.fromCharCode(98 + i)}`; 
            const radius = 1.4 + Math.random() * 0.4; 
            const distance = 10 + i * 5 + Math.random() * 2; 
            const speed = 0.02 - (i * 0.0015); 
            
            const group = new THREE.Group();
            
            this.createOrbitLine(distance, this.tauCetiGroup, 0.1);

            let tex = 'mars.jpg';
            let color = 0xffffff;
            const r = Math.random();
            if (r > 0.6) { tex = 'venus.jpg'; color = 0xddddff; }
            else if (r > 0.3) { tex = '00_earthmap1k.jpg'; color = 0xaaaaaa; } 
            
            let material;
            if (tex.includes('earth')) {
                 material = new THREE.MeshPhongMaterial({
                    map: loader.load(`./textures/${tex}`),
                    specular: 0x111111,
                    shininess: 5,
                    color: 0xaaccff 
                });
            } else {
                 material = new THREE.MeshStandardMaterial({
                    map: loader.load(`./textures/${tex}`),
                    color: color,
                    roughness: 0.8
                });
            }

            const geometry = new THREE.SphereGeometry(radius, 16, 16);
            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
            
            const angle = Math.random() * Math.PI * 2;
            group.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
            
            this.tauCetiGroup.add(group);
            
            this.planets.push({
                mesh: group,
                distance: distance,
                speed: speed,
                angle: angle,
                name: planetName,
                radius: radius,
                moons: [] 
            });
        }

        // 3. Debris Field (Optimized)
        const particleCount = 200; 
        const geo = new THREE.BufferGeometry();
        const pos = [];
        for(let i=0; i<particleCount; i++) {
            const d = 8 + Math.random() * 45;
            const a = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 2; 
            
            pos.push(Math.cos(a)*d, y, Math.sin(a)*d);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x887766, size: 0.15 }); 
        const debris = new THREE.Points(geo, mat);
        this.tauCetiGroup.add(debris);
    }

    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 200, 100, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    createPlanets() {
        const loader = new THREE.TextureLoader();

        this.config.forEach(cfg => {
            const group = new THREE.Group();
            
            this.createOrbitLine(cfg.distance);

            // Optimized Geometry
            const geometry = new THREE.SphereGeometry(cfg.radius, 32, 32);
            let material;

            if (cfg.name === 'Earth') {
                material = new THREE.MeshPhongMaterial({
                    map: loader.load('./textures/00_earthmap1k.jpg'),
                    specularMap: loader.load('./textures/02_earthspec1k.jpg'),
                    bumpMap: loader.load('./textures/01_earthbump1k.jpg'),
                    bumpScale: 0.05,
                });
                const cloudsMat = new THREE.MeshStandardMaterial({
                    map: loader.load("./textures/04_earthcloudmap.jpg"),
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
                });
                const cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.radius + 0.005, 32, 32), cloudsMat);
                group.add(cloudsMesh);
            } else {
                const texMap = {
                    'mercury': 'mercury.jpg',
                    'venus': 'venus.jpg',
                    'mars': 'mars.jpg',
                    'jupiter': 'jupiter.jpg',
                    'saturn': 'saturn.jpg',
                    'uranus': 'uranus.jpg',
                    'neptune': 'neptune.jpg',
                    'pluto': 'moon.jpg' 
                };

                material = new THREE.MeshStandardMaterial({
                    map: loader.load(`./textures/${texMap[cfg.type]}`),
                    roughness: 0.7,
                    metalness: 0.1
                });
            }

            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);

            // Moons
            const moons = [];
            if (cfg.moons) {
                cfg.moons.forEach(mCfg => {
                    const moonGeo = new THREE.SphereGeometry(mCfg.r, 16, 16); 
                    
                    let moonColor = 0xffffff; 
                    const n = mCfg.name;
                    if (['Phobos', 'Deimos'].includes(n)) moonColor = 0x554433; 
                    else if (n === 'Io') moonColor = 0xffdd00; 
                    else if (n === 'Europa') moonColor = 0xf0f0ff; 
                    else if (n === 'Ganymede') moonColor = 0xaba89e; 
                    else if (n === 'Callisto') moonColor = 0x333333; 
                    else if (n === 'Titan') moonColor = 0xffaa00; 
                    else if (n === 'Enceladus') moonColor = 0xffffff; 
                    else if (n === 'Triton') moonColor = 0xffcccc; 
                    else if (n === 'Charon') moonColor = 0x887766; 
                    
                    const moonMat = new THREE.MeshStandardMaterial({ 
                        map: loader.load('./textures/moon.jpg'),
                        color: moonColor,
                        roughness: 0.8 
                    });
                    const moon = new THREE.Mesh(moonGeo, moonMat);
                    moon.name = mCfg.name || 'Moon'; 
                    
                    const moonPivot = new THREE.Group();
                    group.add(moonPivot);
                    moonPivot.add(moon);
                    moon.position.set(mCfg.d, 0, 0);
                    
                    this.createOrbitLine(mCfg.d, group, 0.1);

                    moons.push({ pivot: moonPivot, speed: mCfg.s, mesh: moon });
                });
            }

            if (cfg.ring) {
                const ringGeo = new THREE.RingGeometry(cfg.radius + 0.5, cfg.radius + 2.5, 64);
                const pos = ringGeo.attributes.position;
                const v3 = new THREE.Vector3();
                for (let i = 0; i < pos.count; i++){
                    v3.fromBufferAttribute(pos, i);
                    ringGeo.attributes.uv.setXY(i, v3.length() < cfg.radius + 1.5 ? 0 : 1, 1);
                }

                const ringMat = new THREE.MeshBasicMaterial({
                    map: loader.load('./textures/saturn_ring.png'),
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
                
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }

            const angle = Math.random() * Math.PI * 2;
            group.position.set(Math.cos(angle) * cfg.distance, 0, Math.sin(angle) * cfg.distance);

            this.solarSystemGroup.add(group);
            this.planets.push({
                mesh: group,
                distance: cfg.distance,
                speed: cfg.speed,
                angle: angle,
                name: cfg.name,
                radius: cfg.radius,
                moons: moons
            });
        });
    }

    createOrbitLine(radius, parentGroup = null, opacity = 0.2) {
        const points = [];
        const segments = 128; 
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: opacity });
        const line = new THREE.Line(geometry, material);
        if (parentGroup) {
            parentGroup.add(line);
        } else {
            this.solarSystemGroup.add(line);
        }
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x888888); 
        this.scene.add(ambientLight);
        const sunLight = new THREE.PointLight(0xffffff, 2, 300);
        this.solarSystemGroup.add(sunLight);
    }

    createStarfield() {
        // 1. Distant Background Sphere
        const geometry = new THREE.SphereGeometry(4000, 32, 32); // Optimized segments
        const loader = new THREE.TextureLoader();
        const material = new THREE.MeshBasicMaterial({ 
            map: loader.load('./textures/stars.jpg', undefined, undefined, (err) => console.error("Error loading stars.jpg", err)), 
            side: THREE.BackSide,
            color: 0x666666 
        });
        const skybox = new THREE.Mesh(geometry, material);
        this.scene.add(skybox);

        // 2. 3D Star Particles (Reduced count for performance)
        const particles = 200; 
        const particleGeo = new THREE.BufferGeometry();
        const particlePos = [];
        const particleColors = [];
        const color = new THREE.Color();

        for (let i = 0; i < particles; i++) {
            const r = 2000 + Math.random() * 1900;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            particlePos.push(x, y, z);

            const starType = Math.random();
            if (starType > 0.9) color.setHex(0xaaaaff); 
            else if (starType > 0.7) color.setHex(0xffddaa); 
            else color.setHex(0xffffff); 
            
            particleColors.push(color.r, color.g, color.b);
        }

        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePos, 3));
        particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 8,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        const starSystem = new THREE.Points(particleGeo, particleMat);
        this.scene.add(starSystem);

        // 3. Galactic Band (Reduced)
        const bandParticles = 100; 
        const bandGeo = new THREE.BufferGeometry();
        const bandPos = [];
        const bandColors = [];
        
        for (let i = 0; i < bandParticles; i++) {
            const r = 2500 + Math.random() * 1000;
            const angle = Math.random() * Math.PI * 2;
            const x = r * Math.cos(angle);
            const z = r * Math.sin(angle);
            const y = (Math.random() - 0.5) * 800; 

            bandPos.push(x, y, z);
            
            const t = Math.random();
            if (t > 0.6) color.setHex(0xaa88ff); 
            else if (t > 0.3) color.setHex(0xff88aa); 
            else color.setHex(0x88aaff); 

            bandColors.push(color.r, color.g, color.b);
        }
        
        bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(bandPos, 3));
        bandGeo.setAttribute('color', new THREE.Float32BufferAttribute(bandColors, 3));
        
        const bandMat = new THREE.PointsMaterial({
            size: 15,
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });
        
        const bandSystem = new THREE.Points(bandGeo, bandMat);
        bandSystem.rotation.z = Math.PI / 6; 
        bandSystem.rotation.x = Math.PI / 8;
        this.scene.add(bandSystem);
    }

    animate(deltaTime) {
        const timeScale = deltaTime * 60;
        const globalSpeedMult = this.hoveredPlanetName ? 0.05 : 1.0;

        if (!this.pausedPlanetName) {
            this.galaxyPivot.rotation.y += 0.0001 * globalSpeedMult * timeScale;
            
            this.solarSystemAngle += this.solarSystemSpeed * globalSpeedMult * timeScale;
            this.solarSystemGroup.position.x = Math.cos(this.solarSystemAngle) * this.solarSystemDist;
            this.solarSystemGroup.position.z = Math.sin(this.solarSystemAngle) * this.solarSystemDist;
            
            this.tauCetiAngle += this.tauCetiSpeed * globalSpeedMult * timeScale;
            this.tauCetiGroup.position.x = Math.cos(this.tauCetiAngle) * this.tauCetiDist;
            this.tauCetiGroup.position.z = Math.sin(this.tauCetiAngle) * this.tauCetiDist;
        }
        
        if (this.blackHole) {
            this.blackHole.animate(deltaTime); 
        }

        // 4. Planets Orbit
        this.planets.forEach(p => {
            let planetSpeedMult = 1.0;
            if (p.name === this.hoveredPlanetName) {
                planetSpeedMult = 0.05; 
            }

            if (p.name !== this.pausedPlanetName) {
                p.angle += p.speed * planetSpeedMult * timeScale; 
                p.mesh.position.x = Math.cos(p.angle) * p.distance;
                p.mesh.position.z = Math.sin(p.angle) * p.distance;
            }
            
             p.mesh.children.forEach(child => {
                 if (child.isMesh && !child.geometry.type.includes('Ring')) {
                     child.rotation.y += 0.01 * timeScale;
                 }
             });

            // LOD: Hide moons if camera is far away (> 60 units)
            // This saves huge FPS by not drawing tiny moons when zoomed out
            let distToCam = 9999;
            if (this.camera) {
                distToCam = this.camera.position.distanceTo(p.mesh.position);
            }

            if (p.moons) {
                const showMoons = distToCam < 60; // LOD Threshold
                p.moons.forEach(m => {
                    m.pivot.visible = showMoons; // Toggle visibility
                    if (showMoons) {
                        m.pivot.rotation.y += m.speed * planetSpeedMult * timeScale;
                    }
                });
            }
        });
        
        // LOD for Tau Ceti Debris
        if (this.camera && this.tauCetiGroup) {
            const dist = this.camera.position.distanceTo(this.tauCetiGroup.position);
            // The debris is the last child we added
            const debris = this.tauCetiGroup.children[this.tauCetiGroup.children.length - 1];
            if (debris && debris.isPoints) {
                debris.visible = dist < 250;
            }
        }
        
        this.sunMesh.rotation.y += 0.002 * timeScale;
    }
}