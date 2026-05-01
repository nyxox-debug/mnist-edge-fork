"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import DrawingCanvas, { DrawingCanvasHandle } from '@/components/DrawingCanvas';
import { ExternalLink, ChevronUp } from 'lucide-react';

import BarChart from '@/components/BarChart';
import { preprocessCanvas } from '@/utils/imageProcessing';
import { runInference, initInference } from '@/utils/onnxInference';

const ANOMALY_THRESHOLD = 0.45; // Adjusted floor for better inclusivity of bold/variable styles

export default function Home() {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputBufferRef = useRef<HTMLDivElement>(null);
  const [probabilities, setProbabilities] = useState<number[]>(new Array(10).fill(0));
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<number | string | null>("AWAITING_INPUT");
  const [error, setError] = useState<string | null>(null);
  const [hasInput, setHasInput] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Pre-load the ONNX model on mount
  useEffect(() => {
    initInference().catch((err) => {
      console.error('Initial model warmup failed:', err);
    });
  }, []);

  const handlePredict = useCallback(async () => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas || !hasInput) return;

    setIsPredicting(true);
    setPrediction("RUNNING...");
    setError(null);
    try {
      const processedImage = preprocessCanvas(canvas, { noiseLevel, rotationAngle });
      
      const isCanvasBlank = !Array.from(processedImage).some(pixel => pixel > -0.9);

      if (isCanvasBlank) {
        setPrediction("AWAITING_INPUT");
        setIsPredicting(false);
        return;
      }

      const result = await runInference(processedImage);
      setProbabilities(result);
      
      const maxProb = Math.max(...result);
      const topDigit = result.indexOf(maxProb);

      // Restore accurate anomaly detection logic
      if (maxProb < ANOMALY_THRESHOLD) {
        setPrediction("UNKNOWN");
      } else {
        setPrediction(topDigit.toString());
      }
    } catch (err) {
      console.error('Prediction failed:', err);
      setPrediction("AWAITING_INPUT");
      if (err instanceof Error) {
        if (err.message === 'MODEL_LOAD_FAILED') {
          setError("FATAL_ERROR: Model weights not found. Ensure public/models/mnist_model.onnx exists.");
        } else if (err.message === 'WASM_BACKEND_INITIALIZATION_FAILED') {
          setError("FATAL_ERROR: WebAssembly initialization failed. Check browser compatibility.");
        } else {
          setError(`INFERENCE_ERROR: ${err.message}`);
        }
      } else {
        setError("INFERENCE_ENGINE_FAILURE: An unknown error occurred during prediction.");
      }
    } finally {
      setIsPredicting(false);
    }
  }, [hasInput, noiseLevel, rotationAngle]);

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    setProbabilities(new Array(10).fill(0));
    setPrediction("AWAITING_INPUT");
    setError(null);
    setHasInput(false);
    setNoiseLevel(0);
    setRotationAngle(0);
  };

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canvasRef.current) {
      try {
        await canvasRef.current.loadImage(file);
        const img = new Image();
        img.onload = () => {
          setHasInput(true);
          handlePredict();
        };
        img.src = URL.createObjectURL(file);
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }
    e.target.value = '';
  };

  const handleStroke = useCallback(() => {
    setHasInput(true);
    setPrediction("AWAITING_INPUT");
  }, []);

  const handleResetParameters = () => {
    setNoiseLevel(0);
    setRotationAngle(0);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (inputBufferRef.current) {
        const rect = inputBufferRef.current.getBoundingClientRect();
        setShowScrollTop(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        handlePredict();
      } else if (e.key === 'Backspace') {
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePredict, handleUndo]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const hasRealResult = prediction !== null && prediction !== "AWAITING_INPUT" && prediction !== "RUNNING...";

    if (hasRealResult && !isPredicting && resultsRef.current) {
      if (window.innerWidth < 1024) {
        scrollTimeout = setTimeout(() => {
          requestAnimationFrame(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }, 300);
      }
    }

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [prediction, isPredicting]);

  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden pt-8 pb-24 lg:pb-0 px-4 sm:px-6 flex flex-col items-center bg-neutral-950 text-emerald-500 font-mono relative">
      <div className="w-full max-w-6xl">
        <header className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-[#00FF41]/30 pb-3 mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider italic">
              Handwritten <span className="text-emerald-300">Digit</span> Recognition
            </h1>
            <p className="text-xs tracking-widest opacity-80 uppercase">
              System Status: Online | ONNX Runtime Web Enabled
            </p>
          </div>

          <a 
            href="https://github.com/Longman-max/MNIST-Edge-Inference.git" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#00FF41]/70 hover:text-[#00FF41] transition-colors font-mono text-sm mt-4 sm:mt-0"
            suppressHydrationWarning
          >
            <ExternalLink size={20} />
            <span>[ VIEW_SOURCE ]</span>
          </a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 justify-items-center items-start gap-8 lg:gap-x-16 lg:gap-y-8 w-full max-w-6xl mx-auto">
          <section ref={inputBufferRef} className="w-full max-w-125 flex flex-col justify-start gap-3 order-1">
            <div className="w-full border-b border-[#00FF41]/30 pb-2 mb-4 text-lg lg:text-xl font-bold tracking-widest uppercase">INPUT_BUFFER</div>
            
            <div className="flex flex-wrap items-center justify-start gap-3 w-full mb-4 min-h-[40px]">
              <button
                onClick={handleClear}
                className="px-3 h-8 text-[11px] border border-emerald-500 hover:bg-emerald-500 hover:text-black transition-all uppercase font-bold flex items-center justify-center min-w-[110px]"
              >
                Clear_Buffer
              </button>
              <label className="px-3 h-8 text-[11px] border border-emerald-500 hover:bg-emerald-500 hover:text-black transition-all uppercase font-bold cursor-pointer flex items-center justify-center min-w-[110px]">
                Upload_Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={handlePredict}
                disabled={isPredicting || !hasInput}
                className={`px-3 h-8 text-[11px] border border-emerald-500 transition-all uppercase font-bold flex items-center justify-center min-w-[110px] ${
                  (isPredicting || !hasInput) 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:bg-emerald-500 hover:text-black cursor-pointer'
                }`}
              >
                {isPredicting ? 'Run_Inference' : 'Run_Inference'}
              </button>
            </div>

            <div className="relative group w-full flex justify-center">
              <div className="relative w-full overflow-hidden rounded-md border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] bg-black">
                <div
                  className="relative w-full transition-transform duration-200 ease-out [&_canvas]:!border-0 [&_canvas]:!shadow-none [&_canvas]:!rounded-none"
                  style={{ transform: `rotate(${rotationAngle}deg)` }}
                >
                  <DrawingCanvas ref={canvasRef} onStroke={handleStroke} rotationAngle={rotationAngle} />
                </div>
                {noiseLevel > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-screen"
                    style={{ opacity: noiseLevel / 100 }}
                  >
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <filter id="noiseFilter">
                        <feTurbulence
                          type="fractalNoise"
                          baseFrequency={0.65 + (noiseLevel / 100) * 0.35}
                          numOctaves="3"
                          stitchTiles="stitch"
                        />
                        <feColorMatrix type="saturate" values="0" />
                      </filter>
                      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="w-full border border-[#00FF41]/30 p-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-8 rounded-sm bg-[#00FF41]/5 order-2 lg:order-3 lg:col-span-2">
            <div className="flex flex-col gap-2">
              <div className="whitespace-nowrap text-xs font-bold tracking-widest uppercase opacity-80">
                [ PERTURBATION_PARAMETERS ]
              </div>
              <button 
                onClick={handleResetParameters}
                className="text-[10px] border border-[#00FF41]/30 px-2 py-0.5 hover:bg-[#00FF41] hover:text-black transition-all uppercase font-bold w-fit"
              >
                Reset_Values
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 w-full lg:flex-1">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center w-full text-[10px] sm:text-xs font-mono opacity-80">
                  <span>GAUSSIAN_NOISE</span>
                  <span>{noiseLevel}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(Number(e.target.value))}
                  className="w-full h-1 bg-[#00FF41]/30 rounded-lg appearance-none cursor-pointer accent-[#00FF41]"
                />
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center w-full text-[10px] sm:text-xs font-mono opacity-80">
                  <span>SPATIAL_ROTATION</span>
                  <span>{rotationAngle}°</span>
                </div>
                <input 
                  type="range" 
                  min="-180" 
                  max="180" 
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(Number(e.target.value))}
                  className="w-full h-1 bg-[#00FF41]/30 rounded-lg appearance-none cursor-pointer accent-[#00FF41]"
                />
              </div>
            </div>
          </div>

          <section ref={resultsRef} className="w-full max-w-125 flex flex-col justify-start gap-3 order-3 lg:order-2">
            <div className="w-full border-b border-[#00FF41]/30 pb-2 mb-4 text-lg lg:text-xl font-bold tracking-widest uppercase">
              OUTPUT_PROBABILITIES
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-center w-full gap-3 mb-2 min-h-[40px]">
              <div className="flex flex-row gap-3">
                <div className="border border-emerald-500/30 px-3 py-1.5 flex flex-col justify-center rounded-sm bg-emerald-500/5 min-w-[110px]">
                  <div className="text-[10px] opacity-70 uppercase font-bold text-emerald-700">Inference_Engine</div>
                  <div className="text-xs font-bold">ONNX-Runtime-Web</div>
                </div>
                <div className="border border-emerald-500/30 px-3 py-1.5 flex flex-col justify-center rounded-sm bg-emerald-500/5 min-w-[110px]">
                  <div className="text-[10px] opacity-70 uppercase font-bold text-emerald-700">Model_Architecture</div>
                  <div className="text-xs font-bold">CNN (MNIST)</div>
                </div>
              </div>

              <div className="flex flex-col items-center lg:items-end justify-center text-center lg:text-right overflow-visible">
                {error ? (
                  <>
                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">FATAL_ERROR</span>
                    <span className="text-[10px] sm:text-xs font-bold text-red-500 tracking-wider break-words max-w-[200px] leading-tight">
                      {error}
                    </span>
                  </>
                ) : prediction === "RUNNING..." ? (
                  <span className="text-xs font-mono text-[#00FF41] uppercase tracking-widest animate-blink">RUNNING...</span>
                ) : prediction === "UNKNOWN" ? (
                  <>
                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">SYSTEM_WARNING</span>
                    <span className="text-sm sm:text-base font-bold text-red-500 tracking-wider whitespace-nowrap">ANOMALY DETECTED</span>
                  </>
                ) : prediction === "AWAITING_INPUT" ? (
                  <span className="text-xs font-mono text-[#00FF41]/50 uppercase tracking-widest">AWAITING_INPUT...</span>
                ) : (
                  <div className="flex flex-row items-baseline gap-2 text-lg lg:text-xl font-bold text-[#00FF41] uppercase tracking-wider">
                    <span className="opacity-80">PREDICTION:</span>
                    <span>{prediction}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <BarChart probabilities={probabilities} />
            </div>
          </section>
        </div>
      </div>

      <button
        onClick={scrollToTop}
        className={`lg:hidden fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[#00FF41] text-black shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all duration-300 transform ${
          showScrollTop ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-50 pointer-events-none'
        }`}
        aria-label="Scroll to Top"
      >
        <ChevronUp size={24} strokeWidth={3} />
      </button>
    </main>
  );
}
