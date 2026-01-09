import * as THREE from 'three';

export class BlackHole {
    constructor(scene, camera) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.radius = 25; 
        this.diskInner = 35;
        this.diskOuter = 140;
        
        this.init();
    }

    init() {
        // 1. Event Horizon (Low Poly)
        const horizonGeo = new THREE.SphereGeometry(this.radius * 0.95, 32, 32); 
        const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.horizon = new THREE.Mesh(horizonGeo, horizonMat);
        this.group.add(this.horizon);

        // 2. Accretion Disk (Texture based, no shaders)
        this.createAccretionDisk();

        // 3. Gravitational Lensing (Simple Ring)
        this.createGravitationalLens();
        
        // 4. Glow (Sprite)
        this.createGlow();
    }

    createAccretionDisk() {
        // Optimized: Single texture generation, small size
        const diskTex = this.generateDiskTexture();

        this.diskMaterial = new THREE.MeshBasicMaterial({
            map: diskTex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Disk 1: Horizontal
        const geoH = new THREE.RingGeometry(this.diskInner, this.diskOuter, 32, 2); // Reduced segments
        // Fix UVs
        const pos = geoH.attributes.position;
        const uv = geoH.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++){
            v3.fromBufferAttribute(pos, i);
            const r = v3.length();
            const ang = Math.atan2(v3.y, v3.x);
            const u = (ang / (Math.PI * 2)) + 0.5;
            const v = (r - this.diskInner) / (this.diskOuter - this.diskInner);
            uv.setXY(i, u, v);
        }
        
        this.diskH = new THREE.Mesh(geoH, this.diskMaterial);
        this.diskH.rotation.x = -Math.PI / 2;
        this.group.add(this.diskH);

        // Disk 2: Vertical
        const geoV = new THREE.RingGeometry(this.diskInner, this.diskOuter * 0.8, 32, 2);
        const posV = geoV.attributes.position;
        const uvV = geoV.attributes.uv;
        for (let i = 0; i < posV.count; i++){
            v3.fromBufferAttribute(posV, i);
            const r = v3.length();
            const ang = Math.atan2(v3.y, v3.x);
            const u = (ang / (Math.PI * 2)) + 0.5;
            const v = (r - this.diskInner) / ((this.diskOuter*0.8) - this.diskInner);
            uvV.setXY(i, u, v);
        }

        this.diskV = new THREE.Mesh(geoV, this.diskMaterial);
        this.group.add(this.diskV);
    }

    generateDiskTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128; // Tiny texture
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0,0,128,32);
        
        const grad = ctx.createLinearGradient(0, 0, 0, 32);
        grad.addColorStop(0.0, 'rgba(255, 200, 100, 0)'); 
        grad.addColorStop(0.2, 'rgba(255, 220, 150, 1)'); 
        grad.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)'); 
        grad.addColorStop(1.0, 'rgba(100, 0, 0, 0)');     
        
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,128,32);
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }

    createGravitationalLens() {
        const ringGeo = new THREE.RingGeometry(this.radius * 1.02, this.radius * 1.1, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        this.photonRing = new THREE.Mesh(ringGeo, ringMat);
        this.group.add(this.photonRing);
    }

    createGlow() {
        // Simple sprite, no texture load needed if we generate it
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(16,16,0,16,16,16);
        g.addColorStop(0, 'rgba(255,100,50,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,32,32);
        
        const material = new THREE.SpriteMaterial({ 
            map: new THREE.CanvasTexture(canvas), 
            color: 0xff4400, 
            blending: THREE.AdditiveBlending,
            opacity: 0.3
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(300, 300, 1);
        this.group.add(sprite);
    }

    animate(delta) {
        // Simple rotation
        if (this.diskH) this.diskH.rotation.z += 0.2 * delta;
        if (this.diskV) this.diskV.rotation.z += 0.2 * delta; 
        
        // Billboard logic handled in main loop or here if we had camera ref update
        // We simplified constructor to not require camera for everything, 
        // but let's assume it's static or handled by lookAt if accessed.
    }
}