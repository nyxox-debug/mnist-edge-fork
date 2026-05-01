import * as ort from 'onnxruntime-web';

// set wasm path for onnxruntime-web
// In a typical Next.js setup, you'd copy these from node_modules to public/static/js/
// For now, we'll use the default CDN fallback or local path if available
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';

// Cache the session to avoid reloading the model on every inference
let cachedSession: ort.InferenceSession | null = null;

/**
 * Pre-loads the ONNX model and initializes the inference session.
 */
export async function initInference(): Promise<void> {
  if (cachedSession) return;

  try {
    cachedSession = await ort.InferenceSession.create('/models/mnist_model.onnx', {
      executionProviders: ['wasm'], // Force WASM for stability across browsers
      externalData: [
        {
          path: 'mnist_model.onnx.data',
          data: '/models/mnist_model.onnx.data',
        },
      ],
    });

    // Warm up the session with a dummy inference to fully initialize the WASM runtime
    const dummyInput = new Float32Array(28 * 28).fill(0);
    const tensorInput = new ort.Tensor('float32', dummyInput, [1, 1, 28, 28]);
    const feeds: Record<string, ort.Tensor> = {};
    feeds[cachedSession.inputNames[0]] = tensorInput;
    await cachedSession.run(feeds);
  } catch (error) {
    console.error('Failed to initialize ONNX session:', error);
    throw error;
  }
}

/**
 * Runs inference on the preprocessed 28x28 grayscale image array.
 */
export async function runInference(imageArray: Float32Array): Promise<number[]> {
  try {
    if (!cachedSession) {
      await initInference();
    }
    
    // Type assertion because initInference ensures cachedSession is set or throws
    const session = cachedSession!;

    const tensorInput = new ort.Tensor('float32', imageArray, [1, 1, 28, 28]);
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = tensorInput;
    
    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    const outputTensor = results[outputName];
    const logits = outputTensor.data as Float32Array;

    return softmax(Array.from(logits));
  } catch (error) {
    // Re-throw with descriptive context
    if (error instanceof Error) {
      if (error.message.includes('no available backend')) {
        throw new Error('WASM_BACKEND_INITIALIZATION_FAILED');
      }
      if (error.message.includes('failed to load model')) {
        throw new Error('MODEL_LOAD_FAILED');
      }
    }
    throw error;
  }
}

/**
 * Helper function: Softmax implementation for an array of numbers.
 */
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits); // Numerical stability
  const scores = logits.map((l) => Math.exp(l - maxLogit));
  const totalScore = scores.reduce((a, b) => a + b, 0);
  return scores.map((s) => s / totalScore);
}
