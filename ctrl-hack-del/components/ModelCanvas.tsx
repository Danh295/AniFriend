"use client";
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

// Expose PIXI to window immediately
if (typeof window !== "undefined") {
  (window as any).PIXI = PIXI;
}

interface ModelCanvasProps {
  emotion: string;
}

export default function ModelCanvas({ emotion }: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let app: PIXI.Application | null = null;

    // --- HELPER: Manually load a script tag ---
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        // 1. LOAD BOTH RUNTIMES
        await loadScript("/live2d.min.js");
        await loadScript("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");

        // 2. Import the library
        const { Live2DModel } = await import('pixi-live2d-display');

        // 3. Start Pixi
        app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          resizeTo: canvasRef.current!.parentElement as HTMLElement,
          transparent: true,
          antialias: true,
        });

        // 4. Load Model
        const modelPath = "/models/01arisa/arisa_t11.model3.json";
        const model = await Live2DModel.from(modelPath);

        app.stage.addChild(model as unknown as PIXI.DisplayObject);
        modelRef.current = model;

        // Scale & Position Logic
        const scaleX = (canvasRef.current!.width * 0.7) / model.width;
        const scaleY = (canvasRef.current!.height * 1.2) / model.height;
        const scale = Math.min(scaleX, scaleY);

        model.scale.set(scale);
        model.x = canvasRef.current!.width / 2;
        model.y = canvasRef.current!.height / 3 * 2;
        model.anchor.set(0.5, 0.5);

        model.motion('Idle');

      } catch (e) {
        console.error(e);
      }
    };

    init();

    return () => {
      if (app) app.destroy(true);
    };
  }, []);

  // Emotion Switcher - Use actual expression file names
  useEffect(() => {
    if (modelRef.current && emotion) {
      try {
        // Map to actual .exp3.json file names in /models/01arisa/expressions/
        const expressionFiles: Record<string, string> = {
          'Angry': 'Angry',
          'Sad': 'Sad',
          'Smile': 'Smile',
          'Surprised': 'Surprised',
          'Normal': 'Normal'
        };
        
        const expName = expressionFiles[emotion] || 'Normal';
        if (modelRef.current.expression) {
          modelRef.current.expression(expName);
        }
      } catch (e) {
        console.error('Failed to set expression:', e);
      }
    }
  }, [emotion]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}