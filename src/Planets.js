import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';
import { BlackHole } from './BlackHole.js';

export class Planets {
    constructor(scene) {
        this.scene = scene;
        this.textureGen = new TextureGenerator();
        this.planets = []; // { mesh, distance, speed, angle, name, group }
        this.solarSystemGroup = new THREE.Group();
        this.scene.add(this.solarSystemGroup);
        
        // Configuration: Visual Scale (Not real scale)
        // 1 unit = 1000km approx? No, arbitrary.
        // Sun radius = 5
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
                  {name: 'Ganymede', r: 0.35, d: 5.6, s: 0.03}, // Largest
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
                  {name: 'Titan',    r: 0.38, d: 7.5, s: 0.025}, // Big
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
            { name: 'Pluto',   radius: 0.4, distance: 75, speed: 0.0008, type: 'pluto', // Dwarf Planet
              moons: [
                  {name: 'Charon',   r: 0.20, d: 0.8, s: 0.02}, // Very close, binary-like
                  {name: 'Styx',     r: 0.02, d: 1.2, s: 0.018},
                  {name: 'Nix',      r: 0.02, d: 1.4, s: 0.016},
                  {name: 'Kerberos', r: 0.02, d: 1.6, s: 0.014},
                  {name: 'Hydra',    r: 0.03, d: 1.8, s: 0.012}
              ] 
            }
        ];
        
        // Galactic Center Pivot
        this.galaxyPivot = new THREE.Group();
        this.scene.add(this.galaxyPivot);
        
        // Supermassive Black Hole
        this.blackHole = new BlackHole(this.galaxyPivot, null); // Camera passed in init
        
        // Solar System Container
        // Detach from rigid pivot to allow independent orbit
        this.solarSystemGroup = new THREE.Group();
        this.scene.add(this.solarSystemGroup); 
        
        this.solarSystemAngle = 0;
        this.solarSystemDist = 400;
        this.solarSystemSpeed = 0.0003;

        // Tau Ceti System Container (12 Light Years away -> Distance 600)
        this.tauCetiGroup = new THREE.Group();
        this.scene.add(this.tauCetiGroup);
        this.tauCetiAngle = Math.PI; // Opposite side of Black Hole
        this.tauCetiDist = 600; 
        this.tauCetiSpeed = 0.0002;

        // Audio Listener (will be assigned from main)
        this.audioListener = null;
        
        // Interaction State
        this.pausedPlanetName = null;
        this.hoveredPlanetName = null;
    }

    setPausedPlanet(name) {
        this.pausedPlanetName = name;
    }

    setHoveredPlanet(name) {
        this.hoveredPlanetName = name;
    }

    init(camera) {
        this.camera = camera;
        this.blackHole.camera = camera; // Update camera reference
        this.createSun();
        this.createPlanets();
        this.createTauCetiSystem(); // New System
        this.createLights();
        this.createStarfield(); 
        
        // Audio Setup
        if (this.camera) {
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);
            this.setupAudio();
        }
    }

    setVolume(vol) {
        if (this.audioListener) {
            this.audioListener.setMasterVolume(vol);
        }
    }

    setupAudio() {
        // Create a procedural drone sound
        const audioLoader = new THREE.AudioLoader();
        const listener = this.audioListener;
        
        // We can't easily load a file, so we generate a buffer
        const ctx = listener.context;
        const sampleRate = ctx.sampleRate;
        const duration = 2.0;
        const frameCount = sampleRate * duration;
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Pink/Brown Noise generation
        let lastOut = 0;
        for (let i = 0; i < frameCount; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Gain
        }

        // Sun Sound
        const sunSound = new THREE.PositionalAudio(listener);
        sunSound.setBuffer(buffer);
        sunSound.setLoop(true);
        sunSound.setRefDistance(20);
        sunSound.setVolume(0.5);
        sunSound.play(); // Auto-play might be blocked until user interaction, usually handled by 'resume' on click
        this.sunMesh.add(sunSound);
    }

    createTauCetiSystem() {
        const loader = new THREE.TextureLoader();
        
        // 1. Tau Ceti Star (Yellow Dwarf, slightly smaller than Sun)
        const sunGeo = new THREE.SphereGeometry(4.5, 64, 64);
        const sunMat = new THREE.MeshBasicMaterial({ 
            map: loader.load('./textures/sun.jpg'), // Reuse sun texture
            color: 0xffdd88 // Tint closer to orange/yellow
        });
        const star = new THREE.Mesh(sunGeo, sunMat);
        this.tauCetiGroup.add(star);
        
        // Star Glow
        const glowMat = new THREE.SpriteMaterial({ 
            map: this.createGlowTexture(), 
            color: 0xffcc44, 
            transparent: true, 
            blending: THREE.AdditiveBlending 
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(12, 12, 1.0);
        star.add(glow);

        // Point Light for this system
        const light = new THREE.PointLight(0xffddaa, 1.5, 200);
        this.tauCetiGroup.add(light);

        // 2. Planets (8 Super-Earths)
        // Description: Bigger than Earth, smaller than Neptune. Close together.
        // No moons.
        for (let i = 0; i < 8; i++) {
            const planetName = `Tau Ceti ${String.fromCharCode(98 + i)}`; // b, c, d...
            const radius = 1.4 + Math.random() * 0.4; // 1.4 - 1.8 (Super Earth)
            const distance = 10 + i * 5 + Math.random() * 2; // Close packing: 10, 15, 20...
            const speed = 0.02 - (i * 0.0015); // Faster inner, slower outer
            
            const group = new THREE.Group();
            
            // Orbit Line
            this.createOrbitLine(distance, this.tauCetiGroup, 0.1);

            // Mesh
            // Use mixture of Earth/Mars/Venus textures to simulate rocky super-earths
            let tex = 'mars.jpg';
            let color = 0xffffff;
            const r = Math.random();
            if (r > 0.6) { tex = 'venus.jpg'; color = 0xddddff; }
            else if (r > 0.3) { tex = '00_earthmap1k.jpg'; color = 0xaaaaaa; } // Rocky/Desolate earth
            
            // If it's the "Earth-like" map, use Phong for shininess
            let material;
            if (tex.includes('earth')) {
                 material = new THREE.MeshPhongMaterial({
                    map: loader.load(`./textures/${tex}`),
                    specular: 0x111111,
                    shininess: 5,
                    color: 0xaaccff // Alien blue tint
                });
            } else {
                 material = new THREE.MeshStandardMaterial({
                    map: loader.load(`./textures/${tex}`),
                    color: color,
                    roughness: 0.8
                });
            }

            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
            
            // Initial Pos
            const angle = Math.random() * Math.PI * 2;
            group.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
            
            this.tauCetiGroup.add(group);
            
            // Register for interaction
            this.planets.push({
                mesh: group,
                distance: distance,
                speed: speed,
                angle: angle,
                name: planetName,
                radius: radius,
                moons: [] // "Hard for them to keep moons"
            });
        }

        // 3. Debris Field ("A lot of trash/asteroids")
        const particleCount = 2000;
        const geo = new THREE.BufferGeometry();
        const pos = [];
        for(let i=0; i<particleCount; i++) {
            // Distribute in a disk among the planets (dist 8 to 50)
            const d = 8 + Math.random() * 45;
            const a = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 2; // Thin disk
            
            pos.push(Math.cos(a)*d, y, Math.sin(a)*d);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x887766, size: 0.15 }); // Dust colored
        const debris = new THREE.Points(geo, mat);
        this.tauCetiGroup.add(debris);
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

        // Sun Glow
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
            
            // Orbit Line
            this.createOrbitLine(cfg.distance);

            // Planet Mesh (Optimized Geometry: 32x32)
            const geometry = new THREE.SphereGeometry(cfg.radius, 32, 32);
            let material;

            if (cfg.name === 'Earth') {
                // Use the good textures we have locally
                material = new THREE.MeshPhongMaterial({
                    map: loader.load('./textures/00_earthmap1k.jpg'),
                    specularMap: loader.load('./textures/02_earthspec1k.jpg'),
                    bumpMap: loader.load('./textures/01_earthbump1k.jpg'),
                    bumpScale: 0.05,
                });
                // Clouds (Optimized)
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
                // Downloaded Textures
                // Map type to filename
                const texMap = {
                    'mercury': 'mercury.jpg',
                    'venus': 'venus.jpg', // Surface
                    'mars': 'mars.jpg',
                    'jupiter': 'jupiter.jpg',
                    'saturn': 'saturn.jpg',
                    'uranus': 'uranus.jpg',
                    'neptune': 'neptune.jpg',
                    'pluto': 'moon.jpg' // Fallback for Pluto
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
                    const moonGeo = new THREE.SphereGeometry(mCfg.r, 16, 16); // Low Poly for Moons
                    
                    // Distinct Moon Colors
                    let moonColor = 0xffffff; // Default Luna-like
                    const n = mCfg.name;
                    if (['Phobos', 'Deimos'].includes(n)) moonColor = 0x554433; // Dark asteroid-like
                    else if (n === 'Io') moonColor = 0xffdd00; // Sulfur Yellow
                    else if (n === 'Europa') moonColor = 0xf0f0ff; // Ice White
                    else if (n === 'Ganymede') moonColor = 0xaba89e; // Dirty Ice
                    else if (n === 'Callisto') moonColor = 0x333333; // Dark Cratered
                    else if (n === 'Titan') moonColor = 0xffaa00; // Orange Haze
                    else if (n === 'Enceladus') moonColor = 0xffffff; // Pure Ice
                    else if (n === 'Triton') moonColor = 0xffcccc; // Pinkish Ice
                    else if (n === 'Charon') moonColor = 0x887766; // Reddish Brown
                    
                    const moonMat = new THREE.MeshStandardMaterial({ 
                        map: loader.load('./textures/moon.jpg'),
                        color: moonColor,
                        roughness: 0.8 
                    });
                    const moon = new THREE.Mesh(moonGeo, moonMat);
                    moon.name = mCfg.name || 'Moon'; // Assign name
                    
                    const moonPivot = new THREE.Group();
                    group.add(moonPivot);
                    moonPivot.add(moon);
                    moon.position.set(mCfg.d, 0, 0);
                    
                    // Moon Orbit Line
                    this.createOrbitLine(mCfg.d, group, 0.1);

                    moons.push({ pivot: moonPivot, speed: mCfg.s, mesh: moon });
                });
            }

            // Rings for Saturn
            if (cfg.ring) {
                const ringGeo = new THREE.RingGeometry(cfg.radius + 0.5, cfg.radius + 2.5, 64);
                // Rotate UVs for ring texture
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

            // Initial Position
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
        const segments = 128; // Optimized circle
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
        const ambientLight = new THREE.AmbientLight(0x888888); // Increased ambient
        this.scene.add(ambientLight);

        // Point light at Sun's position (0,0,0) - Attach to sunMesh so it moves if sun moves (though sun is static in group 0,0,0)
        const sunLight = new THREE.PointLight(0xffffff, 2, 300);
        this.solarSystemGroup.add(sunLight);
    }

    createStarfield() {
        // 1. Distant Background Sphere (The Backdrop)
        const geometry = new THREE.SphereGeometry(4000, 64, 64);
        const loader = new THREE.TextureLoader();
        const material = new THREE.MeshBasicMaterial({ 
            map: loader.load('./textures/stars.jpg', undefined, undefined, (err) => console.error("Error loading stars.jpg", err)), 
            side: THREE.BackSide,
            color: 0x666666 // Dim it slightly so particles pop
        });
        const skybox = new THREE.Mesh(geometry, material);
        this.scene.add(skybox);

        // 2. 3D Star Particles (Depth)
        const particles = 1000; // Optimized count
        const particleGeo = new THREE.BufferGeometry();
        const particlePos = [];
        const particleColors = [];
        const color = new THREE.Color();

        for (let i = 0; i < particles; i++) {
            // Random point in sphere shell (radius 2000-3900)
            const r = 2000 + Math.random() * 1900;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            particlePos.push(x, y, z);

            // Random Star Colors
            const starType = Math.random();
            if (starType > 0.9) color.setHex(0xaaaaff); // Blue giant
            else if (starType > 0.7) color.setHex(0xffddaa); // Yellow
            else color.setHex(0xffffff); // White
            
            particleColors.push(color.r, color.g, color.b);
        }

        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePos, 3));
        particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 8, // Large distant stars
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        const starSystem = new THREE.Points(particleGeo, particleMat);
        this.scene.add(starSystem);

        // 3. Galactic Band (Milky Way Plane)
        const bandParticles = 800; // Optimized count
        const bandGeo = new THREE.BufferGeometry();
        const bandPos = [];
        const bandColors = [];
        
        for (let i = 0; i < bandParticles; i++) {
            // Flattened disk distribution
            const r = 2500 + Math.random() * 1000;
            const angle = Math.random() * Math.PI * 2;
            
            // X/Z is the plane, Y is thickness
            const x = r * Math.cos(angle);
            const z = r * Math.sin(angle);
            const y = (Math.random() - 0.5) * 800; // Thickness

            bandPos.push(x, y, z);
            
            // Hazy purple/blue/pink colors
            const t = Math.random();
            if (t > 0.6) color.setHex(0xaa88ff); // Purple
            else if (t > 0.3) color.setHex(0xff88aa); // Pink
            else color.setHex(0x88aaff); // Blue

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
        // Tilt the galaxy slightly
        bandSystem.rotation.z = Math.PI / 6; 
        bandSystem.rotation.x = Math.PI / 8;
        this.scene.add(bandSystem);
    }

    animate(deltaTime) {
        const timeScale = deltaTime * 60;
        
        // Calculate global speed multiplier (for hover slowdown)
        // We can check if *any* planet is hovered. 
        // Logic: if this.hoveredPlanetName is not null, speed is 0.05
        const globalSpeedMult = this.hoveredPlanetName ? 0.05 : 1.0;

        // 1. Galactic Rotation (Background)
        // Only rotate if not inspecting a specific planet (paused)
        if (!this.pausedPlanetName) {
            this.galaxyPivot.rotation.y += 0.0001 * globalSpeedMult * timeScale;
            
            // 2. Solar System Orbit (Black Hole at 0,0,0)
            this.solarSystemAngle += this.solarSystemSpeed * globalSpeedMult * timeScale;
            this.solarSystemGroup.position.x = Math.cos(this.solarSystemAngle) * this.solarSystemDist;
            this.solarSystemGroup.position.z = Math.sin(this.solarSystemAngle) * this.solarSystemDist;
            
            // 3. Tau Ceti System Orbit
            this.tauCetiAngle += this.tauCetiSpeed * globalSpeedMult * timeScale;
            this.tauCetiGroup.position.x = Math.cos(this.tauCetiAngle) * this.tauCetiDist;
            this.tauCetiGroup.position.z = Math.sin(this.tauCetiAngle) * this.tauCetiDist;
        }
        
        // Black Hole Swirl (Always animate, looks cool)
        if (this.blackHole) {
            this.blackHole.animate(deltaTime); 
        }

        // 4. Planets Orbit
        this.planets.forEach(p => {
            // Determine speed multiplier based on hover state (Per planet or Global?)
            // If we hover *any* planet, we slowed down galaxy. 
            // We should also slow down the specific planet we are hovering?
            // The previous logic slowed down ONLY the hovered planet.
            // Let's keep that precise control for planets.
            
            let planetSpeedMult = 1.0;
            if (p.name === this.hoveredPlanetName) {
                planetSpeedMult = 0.05; 
            }

            // Only orbit if not paused (targeted)
            if (p.name !== this.pausedPlanetName) {
                p.angle += p.speed * planetSpeedMult * timeScale; 
                p.mesh.position.x = Math.cos(p.angle) * p.distance;
                p.mesh.position.z = Math.sin(p.angle) * p.distance;
            }
            
            // Rotate Planet Itself (Always rotate, even if orbit is paused)
            // (The group doesn't rotate, the mesh inside does? No, we added mesh to group)
            // The group position changes. We should rotate the mesh inside the group.
            // My structure: Group -> [Mesh, Clouds, Ring, MoonPivots]
            // Let's rotate the Mesh (index 0 usually)
             p.mesh.children.forEach(child => {
                 if (child.isMesh && !child.geometry.type.includes('Ring')) {
                     child.rotation.y += 0.01 * timeScale;
                 }
             });

            // 3. Moons Orbit (Always orbit parent, even if parent is stopped)
            if (p.moons) {
                p.moons.forEach(m => {
                    // Also slow down moons if the parent system is hovered
                    m.pivot.rotation.y += m.speed * planetSpeedMult * timeScale;
                });
            }
        });
        
        this.sunMesh.rotation.y += 0.002 * timeScale;
    }
}
