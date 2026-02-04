'use client';

import { useEffect, useRef } from 'react';
import type { WindParticle } from '@/types';

interface WindParticlesProps {
  windSpeed: number;
  windDirection: number;
  enabled: boolean;
}

export default function WindParticles({
  windSpeed,
  windDirection,
  enabled
}: WindParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<WindParticle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!enabled || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const numParticles = Math.floor(windSpeed * 20);
    particlesRef.current = createParticles(numParticles);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        updateParticle(particle, windSpeed, windDirection);
        drawParticle(ctx, particle);

        if (particle.age >= particle.maxAge) {
          particlesRef.current[index] = createParticle();
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled, windSpeed, windDirection]);

  if (!enabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ opacity: 0.6 }}
    />
  );
}

function createParticle(): WindParticle {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: 0,
    vy: 0,
    age: 0,
    maxAge: 100 + Math.random() * 100,
  };
}

function createParticles(count: number): WindParticle[] {
  return Array.from({ length: count }, () => createParticle());
}

function updateParticle(
  particle: WindParticle,
  windSpeed: number,
  windDirection: number
): void {
  const radians = (windDirection * Math.PI) / 180;
  const speed = windSpeed * 0.3;

  particle.vx = Math.sin(radians) * speed;
  particle.vy = -Math.cos(radians) * speed;

  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.age += 1;

  if (particle.x < 0) particle.x = window.innerWidth;
  if (particle.x > window.innerWidth) particle.x = 0;
  if (particle.y < 0) particle.y = window.innerHeight;
  if (particle.y > window.innerHeight) particle.y = 0;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: WindParticle
): void {
  const opacity = 1 - particle.age / particle.maxAge;
  const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = '#0091c3';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(particle.x, particle.y);
  ctx.lineTo(
    particle.x - particle.vx * 3,
    particle.y - particle.vy * 3
  );
  ctx.stroke();

  ctx.restore();
}
