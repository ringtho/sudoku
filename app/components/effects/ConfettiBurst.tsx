import { useMemo } from "react";

const COLORS = ["#f97316", "#6366f1", "#22d3ee", "#facc15", "#ec4899", "#34d399"];

export function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 80 }).map((_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.6,
        color: COLORS[index % COLORS.length],
        size: 6 + Math.random() * 4,
        rotate: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute top-[-10%] rounded-sm opacity-0"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size * 0.6,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotate}deg)`,
            animation: `confetti-fall ${particle.duration}s ease-out ${particle.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
