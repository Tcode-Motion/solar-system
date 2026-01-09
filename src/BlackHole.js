import * as THREE from 'three';

export class BlackHole {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // Parameters
        this.radius = 25; // Event Horizon Radius
        this.diskInner = 35;
        this.diskOuter = 140;
        
        this.init();
    }

    init() {
        // 1. Event Horizon (The Void)
        // Strictly black, consumes all light.
        const horizonGeo = new THREE.SphereGeometry(this.radius * 0.95, 64, 64); // Slightly smaller to avoid z-fighting with disk inner edge
        const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.horizon = new THREE.Mesh(horizonGeo, horizonMat);
        this.group.add(this.horizon);

        // 2. Accretion Disk (The Glowing Matter)
        // We use two crossed planes to fake the "Interstellar" lensing effect.
        // Plane 1: The actual flat disk.
        // Plane 2: The "Halo" (bent light) appearing as a vertical ring.
        
        this.createAccretionDisk();

        // 3. Gravitational Lensing (The Light Bender)
        // A larger sphere that refracts the background
        this.createGravitationalLens();
        
        // 4. Glow Sprite (Volumetric Haze)
        this.createGlow();
    }

    createAccretionDisk() {
        // Shader for the swirling plasma
        const vertexShader = `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `;

        const fragmentShader = `
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColorInner;
            uniform vec3 uColorOuter;
            
            // Simplex Noise
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                // UVs: x = angle (0..1), y = radius (0..1)
                
                // 1. Swirl Animation
                // Inner part rotates faster
                float speed = 2.0;
                float angle = vUv.x * 20.0 - uTime * speed * (2.0 - vUv.y); 
                
                // 2. Noise layers
                float n1 = snoise(vec2(angle, vUv.y * 3.0));
                float n2 = snoise(vec2(angle * 2.0, vUv.y * 10.0 - uTime));
                
                // 3. Compose
                float intensity = 0.5 + 0.5 * n1;
                intensity += 0.5 * n2;
                intensity *= 1.5; // Boost brightness
                
                // 4. Color Gradient
                // Inner: Hot White/Yellow. Outer: Red/Orange/Dark
                vec3 color = mix(uColorInner, uColorOuter, pow(vUv.y, 0.8));
                
                // 5. Alpha/Edge Softness
                float alpha = 1.0;
                // Fade inner hard edge
                alpha *= smoothstep(0.0, 0.1, vUv.y);
                // Fade outer soft edge
                alpha *= 1.0 - smoothstep(0.5, 1.0, vUv.y);
                
                // Bright ring at the very inner edge (collision with event horizon)
                float innerGlow = smoothstep(0.1, 0.0, vUv.y) * 2.0;
                
                vec3 finalColor = color * intensity + vec3(1.0, 0.8, 0.5) * innerGlow;

                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        this.diskMaterial = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColorInner: { value: new THREE.Color(0xffaa00) }, // Bright Orange/White
                uColorOuter: { value: new THREE.Color(0xaa0000) }  // Dark Red
            },
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // Disk 1: Horizontal
        const geoH = new THREE.RingGeometry(this.diskInner, this.diskOuter, 128, 64);
        // Fix UVs to be Angle/Radius based
        const pos = geoH.attributes.position;
        const uv = geoH.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++){
            v3.fromBufferAttribute(pos, i);
            const r = v3.length();
            const ang = Math.atan2(v3.y, v3.x);
            // Normalize angle 0..1
            let u = ang / (2.0 * Math.PI);
            if (u < 0) u += 1.0;
            // Normalize radius 0..1
            const v = (r - this.diskInner) / (this.diskOuter - this.diskInner);
            uv.setXY(i, u, v);
        }
        
        this.diskH = new THREE.Mesh(geoH, this.diskMaterial);
        this.diskH.rotation.x = -Math.PI / 2;
        this.group.add(this.diskH);

        // Disk 2: Vertical "Halo" (Faking the bent light)
        // Slightly larger/different to look like the 'hump'
        // In "Interstellar", the halo is the back of the disk.
        // It forms a ring around the black hole.
        const geoV = new THREE.RingGeometry(this.diskInner, this.diskOuter * 0.8, 128, 64);
        // Copy UV logic
        const posV = geoV.attributes.position;
        const uvV = geoV.attributes.uv;
        for (let i = 0; i < posV.count; i++){
            v3.fromBufferAttribute(posV, i);
            const r = v3.length();
            const ang = Math.atan2(v3.y, v3.x);
            let u = ang / (2.0 * Math.PI);
            if (u < 0) u += 1.0;
            const v = (r - this.diskInner) / ((this.diskOuter*0.8) - this.diskInner);
            uvV.setXY(i, u, v);
        }

        this.diskV = new THREE.Mesh(geoV, this.diskMaterial);
        // This needs to always face the camera? 
        // A true halo is spherical. 
        // A simple "Interstellar" fake is just a vertical disk that makes it look like the disk wraps around.
        // Let's position it to cross the sphere.
        // But if the user flies around, this static vertical disk looks wrong.
        // Ideally, this secondary disk should "Billboard" (look at camera) but only on one axis?
        // Actually, for a simple scene, a static "Cross" (one horiz, one vert) often looks surprisingly good from any equatorial angle.
        // Since we are mostly on the ecliptic plane, this works.
        this.group.add(this.diskV);
    }

    createGravitationalLens() {
        // Refraction sphere
        const geometry = new THREE.SphereGeometry(this.radius * 3.0, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.0, // Invisible, just there for logic? No, we need a shader.
            side: THREE.BackSide // Draw back to not obscure disk?
        });
        
        // Actually, let's just make the "Lensing" a subtle glass shell that distorts slightly.
        // Or simpler: A glowing edge ring (Einstein Ring) at the horizon.
        
        // We will skip complex refraction for stability and focus on the glowing disk visuals which are dominant.
        // Instead, let's add a "Photon Sphere" - a thin bright ring right near the horizon.
        
        const ringGeo = new THREE.RingGeometry(this.radius * 1.05, this.radius * 1.1, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const photonRing = new THREE.Mesh(ringGeo, ringMat);
        if (this.camera) photonRing.lookAt(this.camera.position); // Always face camera
        // We'll update this in animate
        this.photonRing = photonRing;
        this.group.add(photonRing);
    }

    createGlow() {
        // Large volumetric glow
        const material = new THREE.SpriteMaterial({ 
            map: new THREE.TextureLoader().load('./textures/stars/circle.png'), 
            color: 0xff4400, 
            blending: THREE.AdditiveBlending,
            opacity: 0.2
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(300, 300, 1);
        this.group.add(sprite);
    }

    animate(delta) {
        if (this.diskMaterial) {
            this.diskMaterial.uniforms.uTime.value += delta;
        }
        
        // Make the "Halo" disk (diskV) always face the camera on the Y-axis?
        // For the "Interstellar" effect, the vertical part is effectively the "back" of the disk bent up.
        // So it should always appear "up" relative to the camera view of the black hole.
        // If the camera is at (x,y,z), the vertical disk should rotate to be perpendicular to the view vector but 'upright'.
        
        if (this.camera && this.diskV) {
            // Simple Billboard Y
            const angle = Math.atan2(
                this.camera.position.x - this.group.position.x,
                this.camera.position.z - this.group.position.z
            );
            this.diskV.rotation.y = angle;
        }
        
        if (this.photonRing && this.camera) {
            this.photonRing.lookAt(this.camera.position);
        }
    }
}
