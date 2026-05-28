import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const useSnowEffect = () => {
  const [isSnowing, setIsSnowing] = useState(false);
  const [theme, setTheme] = useState('dark');
  const frameRef = useRef(null);

  useEffect(() => {
    const themeChange = () => {
      const curr = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(curr);
      if (curr === 'light' && isSnowing) {
        setIsSnowing(false);
      }
    };

    const obs = new MutationObserver(themeChange);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => obs.disconnect();
  }, [isSnowing]);

  useEffect(() => {
    if (isSnowing) {
      const dur = 15 * 1000;
      const end = Date.now() + dur;
      let skew = 1;

      const rand = (min, max) => Math.random() * (max - min) + min;

      const tick = () => {
        if (Date.now() > end) {
          setIsSnowing(false);
          return;
        }
        
        skew = Math.max(0.8, skew - 0.001);

        if (Math.random() > 0.75) {
          confetti({
            particleCount: 1,
            startVelocity: 0,
            ticks: 300,
            origin: {
              x: Math.random(),
              y: (Math.random() * skew) - 0.2
            },
            colors: ['#ffffff'],
            shapes: ['circle'],
            gravity: rand(0.3, 0.5),
            scalar: rand(0.3, 0.5),
            drift: rand(-0.2, 0.2),
            disableForReducedMotion: true,
            opacity: rand(0.4, 0.8)
          });
        }

        if (isSnowing) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      tick();
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      confetti.reset();
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isSnowing]);

  const toggleSnow = () => {
    if (theme === 'light') return;
    setIsSnowing(prev => !prev);
  };

  return { isSnowing, toggleSnow };
};

export default useSnowEffect;
