import React from 'react';
import PropTypes from 'prop-types';
import { Camera, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardHero from './DashboardHero';

/**
 * ClientHeroBanner
 * ----------------
 * Streamlined luxury hero banner for the E-Kodak Studio Client Portal:
 * - Dynamic personalized greeting ("Good [time], [Name]")
 * - Live Studio operational clock
 */
export default function ClientHeroBanner({
  title,
  subtitle = null,
  badgeLabel = null,
  className = '',
  showBookCta = false,
  showStudioStatus = true,
  extraActions = null,
}) {
  const { profile } = useAuth();
  const displayName = profile?.first_name || 'Client';

  return (
    <DashboardHero
      role="client"
      userName={displayName}
      title={title}
      subtitle={subtitle}
      badgeLabel={badgeLabel}
      badgeIcon={Sparkles}
      showStudioStatus={showStudioStatus}
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
      extraActions={extraActions}
    />
  );
}

ClientHeroBanner.propTypes = {
  bookings: PropTypes.array,
  selectedBooking: PropTypes.object,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  badgeLabel: PropTypes.string,
  className: PropTypes.string,
  showBookCta: PropTypes.bool,
  showStudioStatus: PropTypes.bool,
  showToolsDock: PropTypes.bool,
  extraActions: PropTypes.node,
};
