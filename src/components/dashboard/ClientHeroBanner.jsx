import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Camera,
  Sparkles,
  QrCode,
  CheckSquare,
  Calculator,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardHero from './DashboardHero';
import ClientToolsHub from './ClientToolsHub';

const QUICK_TOOLS = [
  { id: 'qr',        label: 'Studio QR Pass', icon: QrCode },
  { id: 'checklist', label: 'Prep Checklist', icon: CheckSquare },
  { id: 'estimator', label: 'Cost Estimator', icon: Calculator },
  { id: 'activity',  label: 'Activity Audit', icon: History },
];

/**
 * ClientHeroBanner
 * ----------------
 * Unified compact luxury dark hero banner for the E-Kodak Studio Client Portal.
 * Uses shared DashboardHero with customer personalization:
 * - Dynamic greeting ("Welcome back, [First Name]")
 * - Space-efficient horizontal layout with studio operations pill
 * - Quick session count summary
 * - Primary "Book a Session" action
 * - Integrated Quick Tools dock (QR pass, checklist, estimator, activity)
 */
export default function ClientHeroBanner({
  bookings = [],
  selectedBooking = null,
  title,
  subtitle,
  className = '',
  showBookCta = true,
  showToolsDock = true,
  extraActions,
}) {
  const { profile } = useAuth();
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('qr');
  const [modalBooking, setModalBooking] = useState(null);

  const activeBookings = (bookings || []).filter(
    (b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && b.status !== 'REJECTED'
  );
  const upcomingCount = (bookings || []).filter((b) => b.status === 'CONFIRMED').length;

  const handleOpenTool = (toolId) => {
    setActiveTool(toolId);
    setModalBooking(selectedBooking || activeBookings[0] || bookings[0] || null);
    setToolsModalOpen(true);
  };

  const displayName = profile?.first_name || 'Client';

  // Contextual status subtitle
  const defaultSubtitle = activeBookings.length > 0 ? (
    <>
      You have{' '}
      <strong className="text-white font-semibold">
        {activeBookings.length} active session{activeBookings.length !== 1 ? 's' : ''}
      </strong>{' '}
      on record.
      {upcomingCount > 0 && (
        <span>
          {' '}·{' '}
          <strong className="text-gold">
            {upcomingCount} confirmed shoot{upcomingCount !== 1 ? 's' : ''}
          </strong>
        </span>
      )}
    </>
  ) : (
    'Review your photo deliverables, schedule your next photoshoot, or track studio order milestones.'
  );

  return (
    <>
      <DashboardHero
        role="client"
        userName={displayName}
        title={title}
        subtitle={subtitle || defaultSubtitle}
        badgeLabel="E-KODAK STUDIO CLIENT PORTAL"
        badgeIcon={Sparkles}
        className={className}
        primaryAction={
          showBookCta
            ? {
                label: 'Book a Session',
                href: '/dashboard/book',
                icon: Camera,
              }
            : null
        }
        extraActions={
          <div className="flex items-center gap-2">
            {showToolsDock && (
              <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-1 backdrop-blur-md shadow-xs">
                {QUICK_TOOLS.map((tool) => (
                  <div key={tool.id} className="relative group/tool">
                    <button
                      type="button"
                      onClick={() => handleOpenTool(tool.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-gold hover:bg-neutral-800 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      aria-label={tool.label}
                    >
                      <tool.icon size={15} />
                    </button>
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tool:flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-neutral-900 text-white shadow-xl whitespace-nowrap z-50 animate-fade-in border border-neutral-700">
                      {tool.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {extraActions}
          </div>
        }
      />

      {/* Built-in Client Tools Hub Modal */}
      <ClientToolsHub
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        initialTool={activeTool}
        bookings={bookings}
        selectedBooking={modalBooking}
      />
    </>
  );
}

ClientHeroBanner.propTypes = {
  bookings: PropTypes.array,
  selectedBooking: PropTypes.object,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  className: PropTypes.string,
  showBookCta: PropTypes.bool,
  showToolsDock: PropTypes.bool,
  extraActions: PropTypes.node,
};
