import * as THREE from 'three';

export class HandInput {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    
    this.handsData = {
      left: null, 
      right: null
    };

    this.smoothedRight = null;
    this.smoothedLeft = null;
    this.smoothingFactor = 0.15; 
    this.frameCount = 0;

    this.isReady = false;
    this.status = "Initializing Hand Tracking...";
  }

  async init() {
    if (!window.Hands) {
        console.error("MediaPipe Hands not loaded.");
        this.status = "Error: MediaPipe Hands not loaded";
        return;
    }

    const hands = new window.Hands({locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
    
    // ULTRA PERFORMANCE MODE:
    // 1. Lite Model (0)
    // 2. Max 1 Hand (halves processing)
    hands.setOptions({
      maxNumHands: 1, 
      modelComplexity: 0, 
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(this.onResults.bind(this));

    const camera = new window.Camera(this.videoElement, {
      onFrame: async () => {
        this.frameCount++;
        // SUPER THROTTLE: Run inference only every 4th frame (~15 FPS tracking)
        // This is the key to preventing GPU lockup on old laptops.
        if (this.frameCount % 4 !== 0) return;

        if (this.videoElement.videoWidth) {
             this.canvasElement.width = this.videoElement.videoWidth;
             this.canvasElement.height = this.videoElement.videoHeight;
        }
        await hands.send({image: this.videoElement});
      },
      width: 320,  // LOW RES INPUT: 320x240 is enough for cursors, vast speedup
      height: 240
    });
    
    await camera.start();
    this.isReady = true;
    this.status = "Hand Tracking Active";
  }

  onResults(results) {
    // Skip drawing debug lines to canvas if we want max perf, 
    // but user might want feedback. We'll draw minimal.
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    // this.canvasCtx.drawImage(results.image, 0, 0, ...); // Skip drawing video feed to canvas, save GPU
    
    this.handsData.left = null;
    this.handsData.right = null;

    if (results.multiHandLandmarks) {
      for (const [index, landmarks] of results.multiHandLandmarks.entries()) {
        const label = results.multiHandedness[index].label; 
        
        // Minimal drawing
        window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});

        const gesture = this.detectGesture(landmarks);
        
        const x = (landmarks[0].x + landmarks[9].x) / 2;
        const y = (landmarks[0].y + landmarks[9].y) / 2;
        const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);

        const handInfo = { x, y, landmarks, gesture, pinchDistance: pinchDist };

        if (label === 'Left') {
            if (!this.smoothedLeft) this.smoothedLeft = handInfo;
            else {
                this.smoothedLeft.x = this.lerp(this.smoothedLeft.x, handInfo.x, this.smoothingFactor);
                this.smoothedLeft.y = this.lerp(this.smoothedLeft.y, handInfo.y, this.smoothingFactor);
                this.smoothedLeft.gesture = handInfo.gesture; 
            }
            this.handsData.left = this.smoothedLeft;
        } else {
            if (!this.smoothedRight) this.smoothedRight = handInfo;
            else {
                this.smoothedRight.x = this.lerp(this.smoothedRight.x, handInfo.x, this.smoothingFactor);
                this.smoothedRight.y = this.lerp(this.smoothedRight.y, handInfo.y, this.smoothingFactor);
                this.smoothedRight.gesture = handInfo.gesture;
            }
            this.handsData.right = this.smoothedRight;
        }
      }
    }
    
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        this.smoothedLeft = null;
        this.smoothedRight = null;
    }

    this.canvasCtx.restore();
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  detectGesture(landmarks) {
    const fingers = [8, 12, 16, 20];
    const knuckles = [6, 10, 14, 18];
    let openCount = 0;
    for(let i=0; i<4; i++) {
        if (landmarks[fingers[i]].y < landmarks[knuckles[i]].y) openCount++;
    }
    if (openCount === 0) return 'fist';
    return 'neutral';
  }

  getRightHand() { return this.handsData.right; }
  getLeftHand() { return this.handsData.left; }
  getStatus() { return this.status; }
}
