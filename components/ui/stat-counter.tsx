'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

export function StatCounter({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return <>{display}</>;
}