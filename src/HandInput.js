export class HandInput {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    
    this.handsData = {
      left: null, // { x, y, z, gesture: 'open'|'fist'|'pinch' }
      right: null
    };

    // Smoothing state
    this.smoothedRight = null;
    this.smoothedLeft = null;
    this.smoothingFactor = 0.15; // Lower = smoother but more lag

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
    
    hands.setOptions({
      maxNumHands: 1, // Limit to 1 hand for performance
      modelComplexity: 0, // Lite model (fastest)
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(this.onResults.bind(this));

    const camera = new window.Camera(this.videoElement, {
      onFrame: async () => {
        if (this.videoElement.videoWidth) {
             this.canvasElement.width = this.videoElement.videoWidth;
             this.canvasElement.height = this.videoElement.videoHeight;
        }
        await hands.send({image: this.videoElement});
      },
      width: 1280,
      height: 720
    });
    
    await camera.start();
    this.isReady = true;
    this.status = "Hand Tracking Active";
  }

  onResults(results) {
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
    
    this.handsData.left = null;
    this.handsData.right = null;

    if (results.multiHandLandmarks) {
      for (const [index, landmarks] of results.multiHandLandmarks.entries()) {
        const label = results.multiHandedness[index].label; // "Left" or "Right"
        
        // Draw
        window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 1});
        window.drawLandmarks(this.canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1});

        // Analyze Gesture
        const gesture = this.detectGesture(landmarks);
        
        // Position (Center of palm approx by index 0 and 9)
        const x = (landmarks[0].x + landmarks[9].x) / 2;
        const y = (landmarks[0].y + landmarks[9].y) / 2;
        
        // Pinch distance (Thumb tip 4 to Index tip 8)
        const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);

        const handInfo = {
            x: x, // 0..1
            y: y, // 0..1
            landmarks: landmarks,
            gesture: gesture,
            pinchDistance: pinchDist
        };

        if (label === 'Left') {
            if (!this.smoothedLeft) this.smoothedLeft = handInfo;
            else {
                this.smoothedLeft.x = this.lerp(this.smoothedLeft.x, handInfo.x, this.smoothingFactor);
                this.smoothedLeft.y = this.lerp(this.smoothedLeft.y, handInfo.y, this.smoothingFactor);
                this.smoothedLeft.gesture = handInfo.gesture; // Update gesture immediately
                this.smoothedLeft.pinchDistance = handInfo.pinchDistance;
            }
            this.handsData.left = this.smoothedLeft;
        }
        else {
            if (!this.smoothedRight) this.smoothedRight = handInfo;
            else {
                this.smoothedRight.x = this.lerp(this.smoothedRight.x, handInfo.x, this.smoothingFactor);
                this.smoothedRight.y = this.lerp(this.smoothedRight.y, handInfo.y, this.smoothingFactor);
                this.smoothedRight.gesture = handInfo.gesture;
                this.smoothedRight.pinchDistance = handInfo.pinchDistance;
            }
            this.handsData.right = this.smoothedRight;
        }
      }
    }
    // Reset if hands lost? No, onResults clears handsData every frame anyway.
    // But we should probably reset smoothed state if hand is lost for a while to avoid "flying" from old pos.
    // For now, simple logic:
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
    // Simple logic
    // Fist: Fingertips below knuckles (roughly, depending on orientation). 
    // For simplicity: Check if tips are close to palm center compared to knuckles.
    
    // Easier: Check open/closed state of fingers
    const isThumbOpen = landmarks[4].x < landmarks[3].x; // Assuming right hand palm facing camera? No, too complex for generic.
    
    // Y-check (assuming hand is upright)
    // 8 (Index Tip) < 6 (Index PIP) -> Open
    const fingers = [8, 12, 16, 20];
    const knuckles = [6, 10, 14, 18];
    
    let openCount = 0;
    for(let i=0; i<4; i++) {
        if (landmarks[fingers[i]].y < landmarks[knuckles[i]].y) openCount++;
    }
    
    if (openCount === 0) return 'fist';
    if (openCount === 4) return 'open';
    
    // Pinch check
    const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
    if (pinchDist < 0.05) return 'pinch';
    
    return 'neutral';
  }

  getRightHand() { return this.handsData.right; }
  getLeftHand() { return this.handsData.left; }
  getStatus() { return this.status; }
}
