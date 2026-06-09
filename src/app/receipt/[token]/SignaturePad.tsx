"use client";

import { useRef, useState } from "react";
import { Eraser } from "lucide-react";

type Point = {
  x: number;
  y: number;
};

function getPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function SignaturePad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  function syncSignature() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    setSignatureData(canvas.toDataURL("image/png"));
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0A3A60";
    setIsDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
    syncSignature();
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="signature_data" value={signatureData} />
      <canvas
        ref={canvasRef}
        width={720}
        height={220}
        className="h-44 w-full touch-none rounded-lg border border-slate-200 bg-white shadow-inner"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        aria-label="Area tanda tangan digital"
      />
      <button
        type="button"
        onClick={clearSignature}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <Eraser className="size-4" aria-hidden="true" />
        Bersihkan tanda tangan
      </button>
    </div>
  );
}
