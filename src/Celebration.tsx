import { type CSSProperties } from "react";
import { celebrationLevels } from "./gameFeedback";
import styles from "./NumberPathGame.module.css";

export function Celebration({ size }: { size: 3 | 4 | 5 | 6 }) {
  const config = celebrationLevels[size];
  return <div className={styles.celebration} aria-hidden="true" data-celebration={size}>
    {Array.from({ length: config.particles }, (_, i) => {
      const burst = i % config.bursts;
      const angle = (i / config.particles) * Math.PI * 2 * config.bursts;
      const radius = 65 + (i % 7) * 13;
      return <i key={i} className={size === 3 ? styles.spark : styles.firework} style={{
        left: `${config.bursts === 1 ? 50 : 28 + burst * (44 / (config.bursts - 1))}%`,
        top: `${burst % 2 ? 30 : 44}%`,
        "--dx": `${Math.cos(angle) * radius}px`,
        "--dy": `${Math.sin(angle) * radius}px`,
        "--delay": `${burst * 320}ms`,
        "--duration": `${config.duration - (config.bursts - 1) * 320}ms`,
        "--particle": ["#d39b21", "#2d8f83", "#d46b40", "#8572b5"][i % 4],
      } as CSSProperties} />;
    })}
  </div>;
}
