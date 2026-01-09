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
        // Optimized: 32 segments
        const horizonGeo = new THREE.SphereGeometry(this.radius * 0.95, 32, 32); 
        const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.horizon = new THREE.Mesh(horizonGeo, horizonMat);
        this.group.add(this.horizon);

        // 2. Accretion Disk
        this.createAccretionDisk();

        // 3. Gravitational Lensing
        this.createGravitationalLens();
        
        // 4. Glow Sprite
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
                float speed = 2.0;
                float angle = vUv.x * 20.0 - uTime * speed * (2.0 - vUv.y); 
                
                float n1 = snoise(vec2(angle, vUv.y * 3.0));
                float n2 = snoise(vec2(angle * 2.0, vUv.y * 10.0 - uTime));
                
                float intensity = 0.5 + 0.5 * n1;
                intensity += 0.5 * n2;
                intensity *= 1.5; 
                
                vec3 color = mix(uColorInner, uColorOuter, pow(vUv.y, 0.8));
                
                float alpha = 1.0;
                alpha *= smoothstep(0.0, 0.1, vUv.y);
                alpha *= 1.0 - smoothstep(0.5, 1.0, vUv.y);
                
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
                uColorInner: { value: new THREE.Color(0xffaa00) }, 
                uColorOuter: { value: new THREE.Color(0xaa0000) }  
            },
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // Disk 1: Horizontal (Optimized 64x32)
        const geoH = new THREE.RingGeometry(this.diskInner, this.diskOuter, 64, 32);
        const pos = geoH.attributes.position;
        const uv = geoH.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++){
            v3.fromBufferAttribute(pos, i);
            const r = v3.length();
            const ang = Math.atan2(v3.y, v3.x);
            let u = ang / (2.0 * Math.PI);
            if (u < 0) u += 1.0;
            const v = (r - this.diskInner) / (this.diskOuter - this.diskInner);
            uv.setXY(i, u, v);
        }
        
        this.diskH = new THREE.Mesh(geoH, this.diskMaterial);
        this.diskH.rotation.x = -Math.PI / 2;
        this.group.add(this.diskH);

        // Disk 2: Vertical "Halo"
        const geoV = new THREE.RingGeometry(this.diskInner, this.diskOuter * 0.8, 64, 32);
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
        this.group.add(this.diskV);
    }

    createGravitationalLens() {
        const ringGeo = new THREE.RingGeometry(this.radius * 1.05, this.radius * 1.1, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const photonRing = new THREE.Mesh(ringGeo, ringMat);
        if (this.camera) photonRing.lookAt(this.camera.position); 
        this.photonRing = photonRing;
        this.group.add(photonRing);
    }

    createGlow() {
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
        
        if (this.camera && this.diskV) {
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