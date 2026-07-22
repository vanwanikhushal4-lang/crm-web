import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to calculate animated running/counting number values.
 * @param {number|string} value - Target numeric value to count up/down to
 * @param {Object} options - Configuration options
 * @param {number} [options.duration=1000] - Animation duration in milliseconds
 * @param {Function} [options.formatter] - Optional function to format the intermediate number
 * @returns {{ numericValue: number, formattedValue: string }}
 */
export function useRunningNumber(value, options = {}) {
  const { duration = 1000, formatter } = options;
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseFloat(value) || 0;
    const start = prevValueRef.current;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
        prevValueRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const formattedValue = formatter 
    ? formatter(displayValue) 
    : Math.round(displayValue).toLocaleString('en-IN');

  return {
    numericValue: displayValue,
    formattedValue,
  };
}

/**
 * Reusable React Component for animated running/counting numbers.
 */
export default function RunningNumber({ 
  value, 
  duration = 1000, 
  formatter = (v) => Math.round(v).toLocaleString('en-IN'),
  className = '',
  style = {}
}) {
  const { formattedValue } = useRunningNumber(value, { duration, formatter });
  return <span className={className} style={style}>{formattedValue}</span>;
}

export { RunningNumber };
