import * as THREE from 'three';

export class TextureGenerator {
  constructor() {
    this.loader = new THREE.TextureLoader();
  }

  createPlanetTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    switch (type) {
      case 'sun':
        this.drawNoise(ctx, w, h, '#ffaa00', '#ff5500', 40);
        break;
      case 'mercury':
        this.drawNoise(ctx, w, h, '#aaaaaa', '#777777', 100);
        this.drawCraters(ctx, w, h, 50);
        break;
      case 'venus':
        this.drawNoise(ctx, w, h, '#eecb8b', '#c59d5f', 30);
        this.drawStripes(ctx, w, h, '#d4ac6e', 5);
        break;
      case 'mars':
        this.drawNoise(ctx, w, h, '#c1440e', '#8a3315', 80);
        this.drawCraters(ctx, w, h, 20);
        break;
      case 'jupiter':
        this.drawStripes(ctx, w, h, '#c99039', 15, true);
        this.drawRedSpot(ctx, w, h);
        break;
      case 'saturn':
        this.drawStripes(ctx, w, h, '#e3e0c0', 10, true);
        break;
      case 'uranus':
        ctx.fillStyle = '#add8e6';
        ctx.fillRect(0,0,w,h);
        this.drawNoise(ctx, w, h, '#add8e6', '#99ccee', 10);
        break;
      case 'neptune':
        ctx.fillStyle = '#4b70dd';
        ctx.fillRect(0,0,w,h);
        this.drawNoise(ctx, w, h, '#4b70dd', '#3a5bb5', 20);
        break;
      default:
        this.drawNoise(ctx, w, h, '#ffffff', '#aaaaaa', 50);
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  createRingTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const centerX = 256;
    const centerY = 256;

    ctx.clearRect(0,0,512,512);
    
    // Draw rings
    for(let i=0; i<50; i++) {
        ctx.beginPath();
        const r = 100 + Math.random() * 150;
        ctx.arc(centerX, centerY, r, 0, Math.PI*2);
        ctx.strokeStyle = color || 'rgba(200, 200, 200, ' + (Math.random() * 0.5 + 0.1) + ')';
        ctx.lineWidth = Math.random() * 3;
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.rotation = Math.PI / 2;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  drawNoise(ctx, w, h, color1, color2, scale) {
    for (let i = 0; i < scale * 50; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? color1 : color2;
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * (w / scale);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawStripes(ctx, w, h, baseColor, count, turbulent = false) {
    const stripeHeight = h / count;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = i % 2 === 0 ? baseColor : this.shadeColor(baseColor, -20);
      const y = i * stripeHeight;
      if (turbulent) {
        // Simple curvy lines
        ctx.beginPath();
        ctx.moveTo(0, y);
        for(let x=0; x<=w; x+=50) {
            ctx.lineTo(x, y + Math.sin(x*0.01 + i)*20);
        }
        ctx.lineTo(w, y + stripeHeight);
        ctx.lineTo(0, y + stripeHeight);
        ctx.fill();
      } else {
        ctx.fillRect(0, y, w, stripeHeight);
      }
    }
  }

  drawCraters(ctx, w, h, count) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for(let i=0; i<count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 20 + 5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  drawRedSpot(ctx, w, h) {
    ctx.fillStyle = 'rgba(180, 50, 20, 0.6)';
    ctx.beginPath();
    ctx.ellipse(w * 0.7, h * 0.6, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  shadeColor(color, percent) {
    if (!color || typeof color !== 'string' || color.length < 7) return '#888888';
    // Basic helper to darken/lighten hex
    try {
        let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
        return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
    } catch (e) {
        return color;
    }
  }
}
