import * as THREE from 'three';
import { BlackHole } from './BlackHole.js';

export class Planets {
    constructor(scene) {
        this.scene = scene;
        this.planets = []; 
        this.systems = []; 
        this.loader = new THREE.TextureLoader();
        this.lodFrame = 0; 
        this.tempVec = new THREE.Vector3();
        
        // Shared Geometry (The Big Optimization)
        this.sharedSphereGeo = new THREE.SphereGeometry(1, 32, 32); 
        this.sharedLowPolyGeo = new THREE.SphereGeometry(1, 16, 16); // For moons

        // Main Groups
        this.galaxyPivot = new THREE.Group();
        this.scene.add(this.galaxyPivot);
        
        this.blackHole = new BlackHole(this.galaxyPivot, null); 
        
        this.solarSystemGroup = new THREE.Group();
        this.scene.add(this.solarSystemGroup); 
        this.solarSystemAngle = 0;
        this.solarSystemDist = 400;
        this.solarSystemSpeed = 0.0003;

        this.tauCetiGroup = new THREE.Group();
        this.scene.add(this.tauCetiGroup);
        this.tauCetiAngle = Math.PI; 
        this.tauCetiDist = 600; 
        this.tauCetiSpeed = 0.0002;

        // Config Data
        this.config = [
            { name: 'Mercury', radius: 0.8, distance: 10, speed: 0.02, type: 'mercury' },
            { name: 'Venus',   radius: 1.2, distance: 15, speed: 0.015, type: 'venus' },
            { name: 'Earth',   radius: 1.3, distance: 20, speed: 0.01,  type: 'earth', 
              moons: [{name: 'Luna', r: 0.3, d: 2.5, s: 0.05}] 
            }, 
            { name: 'Mars',    radius: 0.9, distance: 25, speed: 0.008, type: 'mars', 
              moons: [{name: 'Phobos', r: 0.06, d: 1.4, s: 0.2}, {name: 'Deimos', r: 0.04, d: 1.8, s: 0.15}] 
            },
            { name: 'Jupiter', radius: 3.5, distance: 35, speed: 0.004, type: 'jupiter', 
              moons: [{name: 'Io', r: 0.25, d: 4.2, s: 0.04}, {name: 'Europa', r: 0.22, d: 4.8, s: 0.035},
                      {name: 'Ganymede', r: 0.35, d: 5.6, s: 0.03}, {name: 'Callisto', r: 0.32, d: 6.5, s: 0.025}] 
            },
            { name: 'Saturn',  radius: 3.0, distance: 45, speed: 0.003, type: 'saturn', ring: true, 
              moons: [{name: 'Titan', r: 0.38, d: 7.5, s: 0.025}, {name: 'Enceladus', r: 0.1, d: 4.5, s: 0.05}] 
            },
            { name: 'Uranus',  radius: 2.0, distance: 55, speed: 0.002, type: 'uranus', 
              moons: [{name: 'Titania', r: 0.15, d: 4.2, s: 0.04}, {name: 'Oberon', r: 0.14, d: 4.8, s: 0.03}] 
            },
            { name: 'Neptune', radius: 1.9, distance: 65, speed: 0.001, type: 'neptune', 
              moons: [{name: 'Triton', r: 0.25, d: 3.5, s: -0.04}] 
            },
            { name: 'Pluto',   radius: 0.4, distance: 75, speed: 0.0008, type: 'pluto', 
              moons: [{name: 'Charon', r: 0.20, d: 0.8, s: 0.02}] 
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
        
        // 1. Solar System
        this.createSun();
        this.createPlanets();
        this.systems.push({ name: 'Solar System', group: this.solarSystemGroup, dist: this.solarSystemDist, angle: this.solarSystemAngle, speed: this.solarSystemSpeed });

        // 2. Tau Ceti
        this.createTauCetiSystem();
        this.systems.push({ name: 'Tau Ceti', group: this.tauCetiGroup, dist: this.tauCetiDist, angle: this.tauCetiAngle, speed: this.tauCetiSpeed });

        // 3. New Systems (Procedural, no assets)
        const galaxyConfigs = [
            { name: "Alpha Centauri",  dist: 220, planets: 3, starColor: 0xffdd99, starSize: 4.8 },
            { name: "Barnard's Star",  dist: 300, planets: 2, starColor: 0xff4433, starSize: 3.0 },
            { name: "Wolf 359",        dist: 390, planets: 2, starColor: 0xff3322, starSize: 2.8 },
            { name: "Lalande 21185",   dist: 415, planets: 3, starColor: 0xff5544, starSize: 3.2 },
            { name: "Epsilon Eridani", dist: 525, planets: 1, starColor: 0xffaa55, starSize: 4.2 },
            { name: "Ross 128",        dist: 550, planets: 1, starColor: 0xff4433, starSize: 3.1 }
        ];

        galaxyConfigs.forEach((sys, i) => {
            const angle = (Math.PI / 3) * (i + 1);
            this.createGenericSystem(sys, angle);
        });
        
        this.createStarfield(); 
        
        if (this.camera) {
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);
            this.setupAudio();
        }
    }

        createGenericSystem(config, angle) {
            const group = new THREE.Group();
            this.scene.add(group);
            
            const starMat = new THREE.MeshBasicMaterial({
                map: this.loadTexture('./textures/sun.jpg'),
                color: config.starColor 
            });
            const star = new THREE.Mesh(this.sharedSphereGeo, starMat);        star.scale.setScalar(config.starSize);
        group.add(star);

        const light = new THREE.PointLight(config.starColor, 1.0, 100);
        light.castShadow = false;
        group.add(light);

        // Planets
        for(let i=0; i<config.planets; i++) {
            const planetName = `${config.name} ${String.fromCharCode(98 + i)}`;
            const dist = 10 + (i * 6) + (config.starSize * 2); 
            const r = 0.8 + Math.random() * 1.5;
            const speed = 0.02 / (i + 1);
            
            const pGroup = new THREE.Group();
            this.createOrbitLine(dist, group, 0.1);
            
            // Random texture
            const isGas = r > 2.0;
            const tex = isGas ? 'jupiter.jpg' : (Math.random() > 0.5 ? 'mars.jpg' : 'venus.jpg');
            
            const mat = new THREE.MeshBasicMaterial({ 
                map: this.loadTexture(`./textures/${tex}`),
                color: 0xffffff // White to show texture clearly
            });
            
            const mesh = new THREE.Mesh(this.sharedSphereGeo, mat);
            mesh.scale.setScalar(r);
            mesh.frustumCulled = true;
            pGroup.add(mesh);
            
            const startAngle = Math.random() * Math.PI * 2;
            pGroup.position.set(Math.cos(startAngle) * dist, 0, Math.sin(startAngle) * dist);
            group.add(pGroup);
            
            this.planets.push({
                mesh: pGroup,
                distance: dist,
                speed: speed,
                angle: startAngle,
                name: planetName,
                radius: r,
                moons: [],
                system: config.name
            });
        }

        this.systems.push({
            name: config.name,
            group: group,
            dist: config.dist,
            angle: angle,
            speed: 0.0002
        });
    }

    setVolume(vol) {
        if (this.audioListener) this.audioListener.setMasterVolume(vol);
    }

    setupAudio() {
        // Procedural Audio (No download)
        const listener = this.audioListener;
        const ctx = listener.context;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < data.length; i++) {
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

    loadTexture(path) {
        // Optimization: return Texture immediately, set params
        const tex = this.loader.load(path);
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.anisotropy = 1;
        return tex;
    }

    createSun() {
        const material = new THREE.MeshBasicMaterial({ 
            map: this.loadTexture('./textures/sun.jpg'),
            color: 0xffffff 
        });
        this.sunMesh = new THREE.Mesh(this.sharedSphereGeo, material);
        this.sunMesh.scale.setScalar(5); 
        this.solarSystemGroup.add(this.sunMesh);

        // Simple Glow Sprite
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(16,16,0,16,16,16);
        g.addColorStop(0, 'rgba(255,200,100,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0,0,32,32);
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: new THREE.CanvasTexture(canvas),
            color: 0xffaa00, 
            transparent: true, 
            blending: THREE.AdditiveBlending 
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(15, 15, 1.0);
        this.sunMesh.add(sprite);
    }

    createTauCetiSystem() {
        // Star with Texture
        const sunMat = new THREE.MeshBasicMaterial({ 
            map: this.loadTexture('./textures/sun.jpg'),
            color: 0xffdd88 
        });
        const star = new THREE.Mesh(this.sharedSphereGeo, sunMat);
        star.scale.setScalar(4.5); 
        this.tauCetiGroup.add(star);
        
        const light = new THREE.PointLight(0xffddaa, 1.5, 200);
        light.castShadow = false;
        this.tauCetiGroup.add(light);

        for (let i = 0; i < 8; i++) {
            const planetName = `Tau Ceti ${String.fromCharCode(98 + i)}`; 
            const radius = 1.4 + Math.random() * 0.4; 
            const distance = 10 + i * 5 + Math.random() * 2; 
            const speed = 0.02 - (i * 0.0015); 
            
            const group = new THREE.Group();
            this.createOrbitLine(distance, this.tauCetiGroup, 0.1);

            let tex = 'mars.jpg';
            const rand = Math.random();
            if (rand > 0.6) tex = 'venus.jpg';
            else if (rand > 0.3) tex = '00_earthmap1k.jpg'; 
            
            const material = new THREE.MeshBasicMaterial({
                map: this.loadTexture(`./textures/${tex}`),
                color: 0xffffff
            });

            const mesh = new THREE.Mesh(this.sharedSphereGeo, material);
            mesh.scale.setScalar(radius);
            group.add(mesh);
            
            const angle = Math.random() * Math.PI * 2;
            group.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
            this.tauCetiGroup.add(group);
            
            this.planets.push({
                mesh: group, distance, speed, angle, name: planetName, radius, moons: [], system: 'Tau Ceti'
            });
        }
    }

    createPlanets() {
        this.config.forEach(cfg => {
            const group = new THREE.Group();
            this.createOrbitLine(cfg.distance);

            let material;
            if (cfg.name === 'Earth') {
                // Earth gets special textures
                material = new THREE.MeshBasicMaterial({
                    map: this.loadTexture('./textures/00_earthmap1k.jpg'),
                });
                // Simple Cloud Shell
                const cloudsMesh = new THREE.Mesh(this.sharedSphereGeo, new THREE.MeshBasicMaterial({
                    map: this.loadTexture("./textures/04_earthcloudmap.jpg"),
                    transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
                }));
                cloudsMesh.scale.setScalar(cfg.radius + 0.01);
                group.add(cloudsMesh);
            } else {
                // Procedural fallback or simple texture map based on type
                // Use color tinting on basic textures to save unique downloads
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
                material = new THREE.MeshBasicMaterial({
                    map: this.loadTexture(`./textures/${texMap[cfg.type]}`)
                });
            }

            const mesh = new THREE.Mesh(this.sharedSphereGeo, material);
            mesh.scale.setScalar(cfg.radius);
            group.add(mesh);

            // Moons
            const moons = [];
            if (cfg.moons) {
                cfg.moons.forEach(mCfg => {
                    let moonColor = 0xdddddd;
                    // Tinting based on name
                    if (mCfg.name === 'Io') moonColor = 0xffffaa;
                    if (mCfg.name === 'Titan') moonColor = 0xffaa00;
                    
                    const moonMat = new THREE.MeshBasicMaterial({ 
                        map: this.loadTexture('./textures/moon.jpg'),
                        color: moonColor
                    });
                    const moon = new THREE.Mesh(this.sharedLowPolyGeo, moonMat);
                    moon.scale.setScalar(mCfg.r);
                    
                    const moonPivot = new THREE.Group();
                    group.add(moonPivot);
                    moonPivot.add(moon);
                    moon.position.set(mCfg.d, 0, 0);
                    
                    // Orbit line for moon
                    this.createOrbitLine(mCfg.d, group, 0.1);

                    moons.push({ pivot: moonPivot, speed: mCfg.s, mesh: moon });
                });
            }

            if (cfg.ring) {
                const ringGeo = new THREE.RingGeometry(cfg.radius + 0.5, cfg.radius + 2.5, 32);
                // Simple Ring UVs
                const pos = ringGeo.attributes.position;
                const uv = ringGeo.attributes.uv;
                for (let i = 0; i < pos.count; i++){
                    const v3 = new THREE.Vector3().fromBufferAttribute(pos, i);
                    uv.setXY(i, v3.length() < cfg.radius + 1.5 ? 0 : 1, 1);
                }
                const ringMat = new THREE.MeshBasicMaterial({
                    map: this.loadTexture('./textures/saturn_ring.png'),
                    side: THREE.DoubleSide, transparent: true, opacity: 0.8
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }

            const angle = Math.random() * Math.PI * 2;
            group.position.set(Math.cos(angle) * cfg.distance, 0, Math.sin(angle) * cfg.distance);

            this.solarSystemGroup.add(group);
            this.planets.push({
                mesh: group, distance: cfg.distance, speed: cfg.speed, angle, name: cfg.name, radius: cfg.radius, moons, system: 'Solar System'
            });
        });
    }

    createOrbitLine(radius, parentGroup = null, opacity = 0.2) {
        const points = [];
        const segments = 32; // Low poly orbit
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity });
        const line = new THREE.Line(geometry, material);
        if (parentGroup) parentGroup.add(line);
        else this.solarSystemGroup.add(line);
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x888888); 
        this.scene.add(ambientLight);
    }

    createStarfield() {
        // Procedural Starfield (No Texture Download)
        const starCount = 400; 
        const particleGeo = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const c = new THREE.Color();
        
        for(let i=0; i<starCount; i++) {
            const r = 3000 + Math.random() * 1000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            c.setHSL(Math.random(), 0.5, 0.8);
            colors.push(c.r, c.g, c.b);
        }
        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({ size: 10, vertexColors: true });
        this.scene.add(new THREE.Points(particleGeo, mat));
    }

    animate(deltaTime) {
        this.lodFrame++;
        const timeScale = deltaTime * 60;
        const globalSpeedMult = this.hoveredPlanetName ? 0.05 : 1.0;

        if (!this.pausedPlanetName) {
            this.galaxyPivot.rotation.y += 0.0001 * globalSpeedMult * timeScale;
            
            this.systems.forEach(sys => {
                sys.angle += sys.speed * globalSpeedMult * timeScale;
                sys.group.position.x = Math.cos(sys.angle) * sys.dist;
                sys.group.position.z = Math.sin(sys.angle) * sys.dist;
            });
        }
        
        if (this.blackHole) this.blackHole.animate(deltaTime);

        this.planets.forEach(p => {
            let planetSpeedMult = 1.0;
            if (p.name === this.hoveredPlanetName) planetSpeedMult = 0.05; 

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

            if (this.lodFrame % 15 === 0 && this.camera && p.moons) {
                p.mesh.getWorldPosition(this.tempVec); 
                const distToCam = this.camera.position.distanceTo(this.tempVec);
                const showMoons = distToCam < 150; 
                p.moons.forEach(m => m.pivot.visible = showMoons);
            }

            if (p.moons) {
                p.moons.forEach(m => {
                    if (m.pivot.visible) {
                        m.pivot.rotation.y += m.speed * planetSpeedMult * timeScale;
                    }
                });
            }
        });
        
        this.sunMesh.rotation.y += 0.002 * timeScale;
    }
}
