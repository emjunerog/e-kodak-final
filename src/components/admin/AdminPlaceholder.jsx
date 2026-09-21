/**
 * AdminPlaceholder — shared template for admin pages not yet implemented.
 * Used by all placeholder pages: Bookings, Customers, Photographers, etc.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminPlaceholder({ title, description, icon: Icon }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <p className="text-xs font-body font-semibold text-gold uppercase tracking-widest mb-1">
          E-KODAK Admin
        </p>
        <h1 className="font-heading text-2xl sm:text-3xl text-primary">{title}</h1>
      </div>

      {/* Placeholder card */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm">
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          {Icon && (
            <div className="w-16 h-16 bg-gold/10 rounded-xl flex items-center justify-center text-gold mb-6 ring-1 ring-gold/20">
              <Icon size={28} />
            </div>
          )}
          <h2 className="font-heading text-xl text-primary mb-3">{title}</h2>
          <p className="font-body text-sm text-neutral-500 max-w-sm leading-relaxed mb-6">
            {description || `The ${title} module is currently under development and will be available in the next phase.`}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-body">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Scheduled for next development phase
          </div>
          <Link
            to="/admin"
            className="mt-8 text-sm font-medium text-gold hover:text-primary transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
