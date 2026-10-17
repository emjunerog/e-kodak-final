import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children, 
  footer,
  maxWidth = 'max-w-lg',
  maxHeight = 'max-h-[90vh] sm:max-h-[92vh]',
  className = '',
  bodyClassName = 'p-6',
  customLayout = false,
  hideHeader = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fade-in">
      <div 
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} border border-neutral-200/80 overflow-hidden animate-slide-up flex flex-col ${maxHeight} z-10 ${className}`}>
        {/* Fixed Header */}
        {!hideHeader && title !== null && title !== undefined && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white shrink-0 z-10">
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="font-heading font-bold text-base sm:text-lg text-primary truncate">{title}</h3>
              {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-100 rounded-full transition-colors shrink-0 cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Modal Content */}
        {customLayout ? (
          children
        ) : footer ? (
          <>
            <div className={`overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>
              {children}
            </div>
            <div className="shrink-0 px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/70 z-10">
              {footer}
            </div>
          </>
        ) : (
          <div className={`overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

