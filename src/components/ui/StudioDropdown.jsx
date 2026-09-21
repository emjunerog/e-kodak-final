import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * StudioDropdown
 * Luxury custom dropdown component designed for E-Kodak Studio dashboard.
 * Supports rich options (icons, descriptions, color swatches, search filtering, dark mode).
 */
export default function StudioDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  searchable = false,
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  icon: LeadingIcon,
  ariaLabel,
  align = 'left',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label, desc, colorBadge, icon, badge }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return {
      value: opt.value !== undefined ? opt.value : opt.id,
      label: opt.label || opt.name || String(opt.value),
      desc: opt.desc || opt.description || '',
      colorBadge: opt.colorBadge || opt.color || '',
      icon: opt.icon || null,
      badge: opt.badge || '',
    };
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    opt => String(opt.value) === String(value)
  );

  // Filter options if searchable
  const filteredOptions = searchQuery.trim()
    ? normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.desc && opt.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (opt.badge && opt.badge.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : normalizedOptions;

  // Auto-close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation: Escape to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* ── Dropdown Trigger Button ───────────────────────────────────────── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl border text-sm font-body transition-all duration-150 outline-none text-left cursor-pointer select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-400'
            : isOpen
              ? 'bg-white dark:bg-neutral-800 border-gold ring-2 ring-gold/20 shadow-xs text-primary dark:text-neutral-100'
              : 'bg-white dark:bg-neutral-800/90 hover:bg-neutral-50/80 dark:hover:bg-neutral-800 border-neutral-300/80 dark:border-neutral-700/80 text-primary dark:text-neutral-100 hover:border-gold/50 dark:hover:border-neutral-600 shadow-2xs'
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {LeadingIcon && (
            <LeadingIcon size={16} className="text-gold shrink-0" />
          )}

          {/* Color swatch if option has one */}
          {selectedOption?.colorBadge && (
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10 ${selectedOption.colorBadge}`} />
          )}

          <div className="min-w-0 flex-1 truncate">
            {selectedOption ? (
              <span className="font-medium text-neutral-800 dark:text-neutral-100 truncate block">
                {selectedOption.label}
              </span>
            ) : (
              <span className="text-neutral-400 truncate block">{placeholder}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {selectedOption?.badge && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-600">
              {selectedOption.badge}
            </span>
          )}

          {/* Chevron Indicator */}
          <ChevronDown
            size={16}
            className={`text-neutral-400 dark:text-neutral-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-gold dark:text-gold' : ''
            }`}
          />
        </div>
      </button>

      {/* ── Dropdown Menu Popover ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-50 bg-white/98 dark:bg-neutral-900/98 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/90 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/60 overflow-hidden animate-fade-in ${menuClassName}`}
          style={{ minWidth: '100%' }}
        >
          {/* Optional Search Filter */}
          {searchable && (
            <div className="p-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-1 focus:ring-gold focus:border-gold outline-none text-primary dark:text-neutral-100 font-body placeholder:text-neutral-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = String(option.value) === String(value);
                const OptionIcon = option.icon;

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm font-body text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-gold/15 dark:bg-gold/20 text-neutral-900 dark:text-gold font-semibold shadow-2xs'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 hover:text-neutral-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Optional Option Icon */}
                      {OptionIcon && (
                        <OptionIcon size={15} className={isSelected ? 'text-gold' : 'text-neutral-400'} />
                      )}

                      {/* Optional Color Swatch */}
                      {option.colorBadge && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/10 ${option.colorBadge}`} />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate block">
                            {option.label}
                          </span>
                        </div>

                        {option.desc && (
                          <span className="text-xs text-neutral-400 dark:text-neutral-400 block truncate font-normal">
                            {option.desc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-1">
                      {option.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          isSelected
                            ? 'bg-white/80 text-gold-dark font-semibold'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700'
                        }`}>
                          {option.badge}
                        </span>
                      )}

                      {/* Checkmark for active selection */}
                      {isSelected && (
                        <Check size={16} className="text-gold shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center text-sm text-neutral-400 font-body">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
