import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * CustomDropdown.jsx
 * ------------------
 * Fully styled custom dropdown component replacing standard browser <select>.
 * Supports option icons, colored status dots, badge counts, and smooth animations.
 */
export default function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  icon: TriggerIcon,
  label,
  className = '',
  popoverWidth = 'w-56',
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation: Escape to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Find active option
  const activeOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 font-body">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-9 flex items-center justify-between gap-2.5 px-3 bg-white dark:bg-neutral-800 hover:bg-neutral-50/80 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-100 rounded-xl text-xs sm:text-sm font-medium font-body border border-neutral-300/80 dark:border-neutral-700 hover:border-gold/60 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all shadow-2xs cursor-pointer select-none ${
          open ? 'border-gold ring-2 ring-gold/20 bg-white dark:bg-neutral-800' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {TriggerIcon && <TriggerIcon size={15} className="text-gold flex-shrink-0" />}
          {activeOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full ${activeOption.dotColor} ring-1 ring-black/10 flex-shrink-0`} />
          )}
          {activeOption?.icon && (
            <activeOption.icon size={14} className="text-gold flex-shrink-0" />
          )}
          <span className="truncate text-neutral-800 dark:text-neutral-100 font-medium">
            {activeOption ? activeOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
          {activeOption?.badge && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-600">
              {activeOption.badge}
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-neutral-400 transition-transform duration-200 ${
              open ? 'rotate-180 text-gold' : ''
            }`}
          />
        </div>
      </button>

      {/* Glassmorphic Floating Popover Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 ${popoverWidth} backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 rounded-2xl shadow-2xl shadow-neutral-900/15 dark:shadow-black/60 border border-neutral-200/90 dark:border-neutral-700/80 ring-1 ring-black/5 dark:ring-white/10 p-1.5 z-50 overflow-hidden`}
          >
          <div className="max-h-64 overflow-y-auto space-y-0.5 scrollbar-thin">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-all duration-150 font-body cursor-pointer ${
                    isSelected
                      ? 'bg-gold/15 dark:bg-gold/20 font-semibold text-neutral-900 dark:text-gold shadow-2xs'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 hover:text-neutral-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                    {option.dotColor && (
                      <span className={`w-2.5 h-2.5 rounded-full ${option.dotColor} ring-1 ring-black/10 flex-shrink-0`} />
                    )}
                    {option.icon && (
                      <option.icon size={15} className={`${isSelected ? 'text-gold' : 'text-neutral-400'} flex-shrink-0`} />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                    {option.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        isSelected
                          ? 'bg-white/80 text-gold-dark font-semibold'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700'
                      }`}>
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check size={16} className="text-gold flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

CustomDropdown.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.any.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      dotColor: PropTypes.string,
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  placeholder: PropTypes.string,
  icon: PropTypes.elementType,
  label: PropTypes.string,
  className: PropTypes.string,
  popoverWidth: PropTypes.string,
  align: PropTypes.oneOf(['left', 'right']),
};
