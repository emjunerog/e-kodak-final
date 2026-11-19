import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * 6-digit segmented OTP input with keyboard navigation, paste support,
 * and Light/Dark studio theme styling.
 */
export default function OtpCodeInput({
  value = "",
  onChange,
  length = 6,
  disabled = false,
  isDark = false,
  autoFocus = true,
  idPrefix = "otp-digit",
}) {
  const inputRefs = useRef([]);
  const digits = Array.from({ length }, (_, idx) => value[idx] || "");

  useEffect(() => {
    if (autoFocus && !disabled) {
      const targetIdx = Math.min(value.length, length - 1);
      inputRefs.current[targetIdx]?.focus();
    }
    // Only run on mount / autoFocus toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const updateAt = (index, rawVal) => {
    const clean = rawVal.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    // Handle multi-digit paste or autofill into a single cell
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < clean.length && index + i < length; i += 1) {
        next[index + i] = clean[i];
      }
      const joined = next.join("").slice(0, length);
      onChange(joined);
      const focusIdx = Math.min(index + clean.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean[0];
    onChange(next.join(""));
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        onChange(next.join(""));
        inputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div
      className="grid grid-cols-6 gap-2 sm:gap-2.5"
      role="group"
      aria-label="6-digit verification code"
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => {
        const filled = Boolean(digit);
        return (
          <input
            key={index}
            id={`${idPrefix}-${index}`}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            onChange={(e) => updateAt(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            className={`w-full h-13 sm:h-14 text-center font-mono text-xl sm:text-2xl font-semibold rounded-xl border outline-none transition-all duration-150 disabled:opacity-50 ${
              isDark
                ? filled
                  ? "bg-[#1e2026] border-gold/70 text-white shadow-[0_0_0_1px_rgba(201,169,110,0.2)]"
                  : "bg-[#17191e] border-[#323640] text-white focus:border-gold focus:ring-2 focus:ring-gold/25"
                : filled
                  ? "bg-[#fdfaf3] border-[#c9a96e] text-neutral-950 shadow-2xs"
                  : "bg-white border-neutral-300 text-neutral-950 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/25 shadow-2xs"
            }`}
          />
        );
      })}
    </div>
  );
}

OtpCodeInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  length: PropTypes.number,
  disabled: PropTypes.bool,
  isDark: PropTypes.bool,
  autoFocus: PropTypes.bool,
  idPrefix: PropTypes.string,
};
