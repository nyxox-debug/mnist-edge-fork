"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from "react";

export interface DrawingCanvasHandle {
  clearCanvas: () => void;
  undo: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  loadImage: (file: File) => Promise<void>;
}

interface DrawingCanvasProps {
  onStroke?: () => void;
  rotationAngle?: number;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  type: 'draw' | 'image';
  image?: HTMLImageElement;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(({ onStroke, rotationAngle = 0 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const rotationRef = useRef(rotationAngle);
  const onStrokeRef = useRef(onStroke);

  // Keep refs in sync with props
  useEffect(() => {
    rotationRef.current = rotationAngle;
  }, [rotationAngle]);

  useEffect(() => {
    onStrokeRef.current = onStroke;
  }, [onStroke]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear with black
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    strokesRef.current.forEach(stroke => {
      if (stroke.type === 'draw') {
        if (stroke.points.length === 0) return;
        
        ctx.strokeStyle = "white";
        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        
        const firstPoint = stroke.points[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        // Handle single point strokes
        if (stroke.points.length === 1) {
          ctx.lineTo(firstPoint.x, firstPoint.y);
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
        }
        ctx.stroke();
        ctx.closePath();
      } else if (stroke.type === 'image' && stroke.image) {
        const img = stroke.image;
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;
        
        let drawWidth, drawHeight, x, y;

        if (imgAspect > canvasAspect) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgAspect;
          x = 0;
          y = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgAspect;
          x = (canvas.width - drawWidth) / 2;
          y = 0;
        }
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
      }
    });
  };

  // Initial canvas setup
  useEffect(() => {
    redraw();
  }, []);

  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      strokesRef.current = [];
      redraw();
    },
    undo: () => {
      strokesRef.current.pop();
      redraw();
    },
    getCanvas: () => canvasRef.current,
    loadImage: (file: File) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Clear previous strokes to ensure image overrides input
          strokesRef.current = [{
            type: 'image',
            points: [],
            image: img
          }];
          redraw();
          if (onStrokeRef.current) onStrokeRef.current();
          resolve();
        };
        img.onerror = () => reject("Failed to load image");
        img.src = URL.createObjectURL(file);
      });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isDrawing = false;
    let currentStrokePoints: Point[] = [];

    const getNormalizedCoordinates = (
      e: MouseEvent | TouchEvent,
      canvas: HTMLCanvasElement,
      angleInDegrees: number
    ) => {
      const rect = canvas.getBoundingClientRect();
      
      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = rawX - cx;
      const dy = rawY - cy;

      const rad_original = (angleInDegrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad_original));
      const sin = Math.abs(Math.sin(rad_original));
      const unrotatedSize = rect.width / (cos + sin);

      const rad_inv = -rad_original;
      const rotatedX = dx * Math.cos(rad_inv) - dy * Math.sin(rad_inv);
      const rotatedY = dx * Math.sin(rad_inv) + dy * Math.cos(rad_inv);

      return {
        x: (rotatedX / unrotatedSize + 0.5) * canvas.width,
        y: (rotatedY / unrotatedSize + 0.5) * canvas.height
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing = true;

      const { x, y } = getNormalizedCoordinates(e, canvas, rotationRef.current);
      currentStrokePoints = [{ x, y }];

      ctx.strokeStyle = "white";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (onStrokeRef.current) onStrokeRef.current();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const { x, y } = getNormalizedCoordinates(e, canvas, rotationRef.current);
      currentStrokePoints.push({ x, y });
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      isDrawing = false;
      ctx.closePath();
      
      if (currentStrokePoints.length > 0) {
        strokesRef.current.push({
          type: 'draw',
          points: currentStrokePoints
        });
      }
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing, { passive: false });
    canvas.addEventListener("touchcancel", stopDrawing, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);

      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
      canvas.removeEventListener("touchcancel", stopDrawing);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      style={{
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
      className="block border-2 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)] bg-black cursor-crosshair rounded-md w-full aspect-square max-h-[350px] max-w-[350px] mx-auto shrink-0"
    />
  );
});

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;