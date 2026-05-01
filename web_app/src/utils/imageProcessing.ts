/**
 * Options for adversarial perturbations applied during preprocessing.
 */
export interface PerturbationOptions {
  /** Gaussian noise level as a percentage (0-100). */
  noiseLevel?: number;
  /** Spatial rotation angle in degrees (-180 to 180). */
  rotationAngle?: number;
}

/**
 * Generates a random number from a standard normal distribution
 * using the Box-Muller transform.
 */
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Reusable offscreen canvases for performance
let offscreenCanvas: HTMLCanvasElement | null = null;
let rotatedCanvas: HTMLCanvasElement | null = null;

/**
 * Preprocesses the HTML canvas image for MNIST model inference.
 * Enhanced with Center-of-Mass centering for optimal model accuracy.
 */
export function preprocessCanvas(
  canvas: HTMLCanvasElement,
  perturbation: PerturbationOptions = {}
): Float32Array {
  const { noiseLevel = 0, rotationAngle = 0 } = perturbation;
  const targetSize = 28;
  const mnistDigitSize = 20; // MNIST digits are typically 20x20 within 28x28

  // --- Step 1: Rotation on a staging canvas ---
  let sourceCanvas: HTMLCanvasElement = canvas;
  if (rotationAngle !== 0) {
    if (!rotatedCanvas) rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = canvas.width;
    rotatedCanvas.height = canvas.height;
    const rCtx = rotatedCanvas.getContext('2d');
    if (rCtx) {
      rCtx.fillStyle = 'black';
      rCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);
      const cx = rotatedCanvas.width / 2;
      const cy = rotatedCanvas.height / 2;
      rCtx.translate(cx, cy);
      rCtx.rotate((rotationAngle * Math.PI) / 180);
      rCtx.translate(-cx, -cy);
      rCtx.drawImage(canvas, 0, 0);
      sourceCanvas = rotatedCanvas;
    }
  }

  // --- Step 2: Extract Grayscale and Detect Bounding Box ---
  const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sCtx) throw new Error('Could not get source canvas context');
  
  const srcData = sCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  let minX = sourceCanvas.width, minY = sourceCanvas.height, maxX = 0, maxY = 0;
  let found = false;

  // Temporary grayscale buffer for CoM calculation
  const grayscaleBuffer = new Float32Array(sourceCanvas.width * sourceCanvas.height);

  for (let y = 0; y < sourceCanvas.height; y++) {
    for (let x = 0; x < sourceCanvas.width; x++) {
      const idx = (y * sourceCanvas.width + x) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const alpha = srcData[idx + 3];
      
      // Use alpha-weighted average for better detection of strokes
      const val = ((r + g + b) / 3) * (alpha / 255);
      grayscaleBuffer[y * sourceCanvas.width + x] = val;

      if (val > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // --- Step 3: Centering logic (Bounding Box Scale + Center of Mass) ---
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = targetSize;
    offscreenCanvas.height = targetSize;
  }
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get offscreen context');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetSize, targetSize);

  if (found) {
    const digitW = (maxX - minX) + 1;
    const digitH = (maxY - minY) + 1;
    
    // Scale digit to fit 20x20 box
    const scale = mnistDigitSize / Math.max(digitW, digitH);
    const finalW = digitW * scale;
    const finalH = digitH * scale;

    // Create a temporary canvas for the scaled digit to calculate its CoM
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = 'black';
      tCtx.fillRect(0, 0, targetSize, targetSize);
      
      // Initial draw centered by bounding box
      const bx = (targetSize - finalW) / 2;
      const by = (targetSize - finalH) / 2;
      tCtx.drawImage(sourceCanvas, minX, minY, digitW, digitH, bx, by, finalW, finalH);
      
      // Calculate Center of Mass of the scaled digit
      const tData = tCtx.getImageData(0, 0, targetSize, targetSize).data;
      let sumMass = 0, sumX = 0, sumY = 0;
      for (let y = 0; y < targetSize; y++) {
        for (let x = 0; x < targetSize; x++) {
          const val = tData[(y * targetSize + x) * 4];
          if (val > 10) {
            sumMass += val;
            sumX += x * val;
            sumY += y * val;
          }
        }
      }

      if (sumMass > 0) {
        const comX = sumX / sumMass;
        const comY = sumY / sumMass;
        
        // Shift digit so CoM is at (14, 14)
        const dx = 14 - comX;
        const dy = 14 - comY;
        
        ctx.drawImage(tempCanvas, dx, dy);
      } else {
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  }

  // --- Step 4: Final Normalization & Noise ---
  const finalData = ctx.getImageData(0, 0, targetSize, targetSize).data;
  const float32Data = new Float32Array(targetSize * targetSize);
  const sigma = (noiseLevel / 100) * 80;

  for (let i = 0; i < finalData.length; i += 4) {
    let grayscale = (finalData[i] + finalData[i+1] + finalData[i+2]) / 3.0;
    if (noiseLevel > 0) {
      grayscale = Math.max(0, Math.min(255, grayscale + gaussianRandom() * sigma));
    }
    // Formula from train_mnist.ipynb: transforms.Normalize((0.5,), (0.5,))
    // (x / 255.0 - 0.5) / 0.5
    float32Data[i / 4] = (grayscale / 255.0 - 0.5) / 0.5;
  }

  return float32Data;
}
