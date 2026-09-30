"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Floating3DParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  color?: string;
  secondaryColor?: string;
}

interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
  color: string;
}

export const Floating3DParticles: React.FC<Floating3DParticlesProps> = ({
  className,
  quantity = 35,
  staticity = 50,
  ease = 50,
  color = "#1A56DB",
  secondaryColor = "#0E9F6E",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const circles: Circle[] = [];
    const mouse = { x: 0, y: 0 };
    const canvasSize = { w: 0, h: 0 };
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    let isVisible = true;
    let animationFrameId: number | null = null;

    const circleParams = (): Circle => {
      const x = Math.floor(Math.random() * canvasSize.w);
      const y = Math.floor(Math.random() * canvasSize.h);
      const translateX = 0;
      const translateY = 0;
      const size = Math.floor(Math.random() * 2) + 1.5;
      const alpha = 0;
      const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
      const dx = (Math.random() - 0.5) * 0.2;
      const dy = (Math.random() - 0.5) * 0.2;
      const magnetism = 0.1 + Math.random() * 4;
      const selectedColor = Math.random() > 0.4 ? color : secondaryColor;
      return {
        x,
        y,
        translateX,
        translateY,
        size,
        alpha,
        targetAlpha,
        dx,
        dy,
        magnetism,
        color: selectedColor,
      };
    };

    const drawCircle = (circle: Circle, update = false) => {
      const { x, y, translateX, translateY, size, alpha, color: c } = circle;
      ctx.translate(translateX, translateY);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = c;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!update) {
        circles.push(circle);
      }
    };

    const clearContext = () => {
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
    };

    const drawParticles = () => {
      clearContext();
      for (let i = 0; i < quantity; i++) {
        const circle = circleParams();
        drawCircle(circle);
      }
    };

    const resizeCanvas = () => {
      circles.length = 0;
      canvasSize.w = container.offsetWidth;
      canvasSize.h = container.offsetHeight;
      canvas.width = canvasSize.w * dpr;
      canvas.height = canvasSize.h * dpr;
      canvas.style.width = `${canvasSize.w}px`;
      canvas.style.height = `${canvasSize.h}px`;
      ctx.scale(dpr, dpr);
    };

    const remapValue = (
      value: number,
      start1: number,
      end1: number,
      start2: number,
      end2: number
    ): number => {
      const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
      return remapped > 0 ? remapped : 0;
    };

    const animate = () => {
      if (isVisible) {
        clearContext();
        circles.forEach((circle: Circle, i: number) => {
          const edge = [
            circle.x + circle.translateX - circle.size,
            canvasSize.w - circle.x - circle.translateX - circle.size,
            circle.y + circle.translateY - circle.size,
            canvasSize.h - circle.y - circle.translateY - circle.size,
          ];
          const closestEdge = edge.reduce((a, b) => Math.min(a, b));
          const remap = remapValue(closestEdge, 0, 20, 0, 1);
          if (remap > 1) {
            circle.alpha += 0.02;
            if (circle.alpha > circle.targetAlpha) {
              circle.alpha = circle.targetAlpha;
            }
          } else {
            circle.alpha = circle.targetAlpha * remap;
          }
          circle.x += circle.dx;
          circle.y += circle.dy;
          circle.translateX +=
            (mouse.x / (staticity / circle.magnetism) - circle.translateX) / ease;
          circle.translateY +=
            (mouse.y / (staticity / circle.magnetism) - circle.translateY) / ease;

          if (
            circle.x < -circle.size ||
            circle.x > canvasSize.w + circle.size ||
            circle.y < -circle.size ||
            circle.y > canvasSize.h + circle.size
          ) {
            circles.splice(i, 1);
            const newCircle = circleParams();
            drawCircle(newCircle);
          } else {
            drawCircle(circle, true);
          }
        });
      }
      animationFrameId = window.requestAnimationFrame(animate);
    };

    resizeCanvas();
    drawParticles();
    animate();

    const handleResize = () => {
      resizeCanvas();
      drawParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const { w, h } = canvasSize;
      const x = e.clientX - rect.left - w / 2;
      const y = e.clientY - rect.top - h / 2;
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (inside) {
        mouse.x = x;
        mouse.y = y;
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [color, secondaryColor, quantity, staticity, ease]);

  return (
    <div
      ref={canvasContainerRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};

export default Floating3DParticles;
