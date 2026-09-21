import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import gsap from 'gsap';

/**
 * AnimatedCounter.jsx
 * -------------------
 * Reusable GSAP-powered numeric counter that smoothly animates
 * from 0 or previous value to target value with easing.
 */
export default function AnimatedCounter({
  value = 0,
  prefix = '',
  suffix = '',
  duration = 1,
  className = '',
}) {
  const elRef = useRef(null);
  const valRef = useRef({ val: 0 });

  // Auto-detect prefix if value is a string with currency symbol
  const detectedPrefix = (() => {
    if (prefix) return prefix;
    if (typeof value === 'string') {
      if (value.startsWith('₱')) return '₱';
      if (value.startsWith('$')) return '$';
    }
    return '';
  })();

  useEffect(() => {
    let numeric = 0;
    let isNonNumeric = false;

    if (typeof value === 'number') {
      numeric = value;
    } else if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]+/g, '');
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed)) {
        isNonNumeric = true;
      } else {
        numeric = parsed;
      }
    }

    if (isNonNumeric) {
      if (elRef.current) elRef.current.innerText = value;
      return;
    }

    const isInteger = Number.isInteger(numeric);

    const tween = gsap.to(valRef.current, {
      val: numeric,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (elRef.current) {
          const formatted = isInteger
            ? Math.round(valRef.current.val).toLocaleString()
            : valRef.current.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          elRef.current.innerText = `${detectedPrefix}${formatted}${suffix}`;
        }
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, detectedPrefix, suffix, duration]);

  if (value === undefined || value === null) {
    return <span className={className}>—</span>;
  }

  const initialFormatted = (() => {
    if (typeof value === 'number') return `${detectedPrefix}${value.toLocaleString()}${suffix}`;
    return value;
  })();

  return (
    <span ref={elRef} className={className}>
      {initialFormatted}
    </span>
  );
}

AnimatedCounter.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  prefix: PropTypes.string,
  suffix: PropTypes.string,
  duration: PropTypes.number,
  className: PropTypes.string,
};
