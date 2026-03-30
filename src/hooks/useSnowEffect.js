import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const useSnowEffect = () => {
  const [isSnowing, setIsSnowing] = useState(false);
  const [theme, setTheme] = useState('dark');
  const animationFrameId = useRef(null);

  // Listen for theme changes and disable snow in light mode
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(currentTheme);
      if (currentTheme === 'light' && isSnowing) {
        setIsSnowing(false);
      }
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, [isSnowing]);

  useEffect(() => {
    if (isSnowing) {
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      let skew = 1;

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const frame = () => {
        // Stop animation after duration expires
        if (Date.now() > animationEnd) {
          setIsSnowing(false);
          return;
        }
        
        // Lower ticks (duration) for lighter feel? No, keep it floaty.
        skew = Math.max(0.8, skew - 0.001);

        // Throttle: Only spawn snow every 4th frame (approx 15fps generation)
        if (Math.random() > 0.75) {
          confetti({
            particleCount: 1,
            startVelocity: 0,
            ticks: 300, // Float longer
            origin: {
              x: Math.random(),
              y: (Math.random() * skew) - 0.2
            },
            colors: ['#ffffff'],
            shapes: ['circle'],
            gravity: randomInRange(0.3, 0.5), // Lower gravity for slower fall
            scalar: randomInRange(0.3, 0.5), // Smaller flakes
            drift: randomInRange(-0.2, 0.2), // Less chaotic drift
            disableForReducedMotion: true,
            opacity: randomInRange(0.4, 0.8) // Varying opacity
          });
        }

        if (isSnowing) {
           animationFrameId.current = requestAnimationFrame(frame);
        }
      };

      frame();
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      confetti.reset();
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Don't reset on unmount immediately to let them fall out naturally? 
      // Nah, clean up is better.
    };
  }, [isSnowing]);

  const toggleSnow = () => {
    // Prevent snow effect in light theme
    if (theme === 'light') return;
    setIsSnowing(prev => !prev);
  };

  return { isSnowing, toggleSnow };
};

export default useSnowEffect;
