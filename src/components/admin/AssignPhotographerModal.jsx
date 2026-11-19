import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Camera,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import Modal from '../ui/Modal';
import {
  getPhotographersWithWorkloadAndAvailability,
  assignPhotographerToBooking,
} from '../../services/bookingAdminService';

/**
 * AssignPhotographerModal
 * -----------------------
 * Focused studio modal for assigning an available photographer to a booking
 * before it proceeds to the Ongoing Pictorial stage.
 */
export default function AssignPhotographerModal({
  booking,
  changedById,
  isOpen,
  onClose,
  onAssigned,
  onError,
  zIndexClass = 'z-[100]',
}) {
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !booking) return;
    let active = true;
    setLoading(true);
    setRemarks('');
    setSelectedId(booking.photographer_id || booking.photographer?.id || '');

    getPhotographersWithWorkloadAndAvailability(booking.event_date, booking.preferred_time)
      .then(({ data }) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setPhotographers(list);
        const existingId = booking.photographer_id || booking.photographer?.id;
        if (existingId && list.some((p) => p.id === existingId)) {
          setSelectedId(existingId);
        } else {
          const firstAvailable = list.find((p) => p.is_available && !p.hasConflict) || list[0];
          setSelectedId(firstAvailable?.id || '');
        }
      })
      .catch((err) => {
        if (active) onError?.(err?.message || 'Unable to load photographers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, booking?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!booking?.id || !selectedId || submitting) return;
    const chosen = photographers.find((p) => p.id === selectedId);
    const chosenName = chosen
      ? `${chosen.first_name || ''} ${chosen.last_name || ''}`.trim() || chosen.email
      : 'Studio Photographer';

    setSubmitting(true);
    try {
      const { error } = await assignPhotographerToBooking({
        bookingId: booking.id,
        photographerId: selectedId,
        photographerName: chosenName,
        changedById: changedById || null,
        remarks,
        customerId: booking.customer?.id || booking.customer_id || null,
        bookingNumber: booking.booking_number || '',
        eventDate: booking.event_date || '',
      });
      if (error) throw error;
      onAssigned?.(booking, chosenName, selectedId);
      onClose?.();
    } catch (err) {
      onError?.(err?.message || 'Failed to assign photographer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  const clientName =
    `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim() ||
    'Client';

  const footer = (
    <div className="flex items-center justify-end gap-2.5">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="assign-photographer-form"
        disabled={submitting || loading || !selectedId}
        className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 size={13} className="animate-spin text-gold" aria-hidden="true" />
            <span>Assigning...</span>
          </>
        ) : (
          <>
            <UserCheck size={13} className="text-gold" aria-hidden="true" />
            <span>Confirm &amp; Assign</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose?.()}
      title="Assign Studio Photographer"
      subtitle={`Booking #${booking.booking_number} · ${clientName}`}
      maxWidth="max-w-lg"
      zIndexClass={zIndexClass}
      footer={footer}
    >
      <form id="assign-photographer-form" onSubmit={handleSubmit} className="space-y-4 font-body">
        <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-950 flex items-start gap-2">
          <CalendarDays size={15} className="text-gold-dark shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {booking.event_date
                ? `Scheduled: ${new Date(booking.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}${booking.preferred_time ? ` · ${String(booking.preferred_time).slice(0, 5)}` : ''}`
                : 'No pictorial date scheduled yet'}
            </p>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              Assign a lead photographer before moving this order to Ongoing Pictorial.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <Loader2 size={15} className="animate-spin text-gold" aria-hidden="true" />
            <span>Checking photographer schedules &amp; workload...</span>
          </div>
        ) : photographers.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-500">
            No active photographers found in the studio roster.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {photographers.map((ph) => {
              const name = `${ph.first_name || ''} ${ph.last_name || ''}`.trim() || ph.email;
              const isSelected = selectedId === ph.id;
              return (
                <label
                  key={ph.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-gold bg-amber-50/60 ring-1 ring-gold/40'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="radio"
                      name="assigned_photographer"
                      value={ph.id}
                      checked={isSelected}
                      onChange={() => setSelectedId(ph.id)}
                      className="mt-0.5 accent-[#c9a96e] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1.5">
                        <Camera size={12} className="text-gold-dark shrink-0" aria-hidden="true" />
                        <span>{name}</span>
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {ph.specialization || 'Studio Photographer'} · {ph.activeWorkloadCount || 0} active shoot{ph.activeWorkloadCount === 1 ? '' : 's'}
                      </p>
                      {ph.conflictReason && (
                        <p className="text-[11px] text-amber-800 mt-1 flex items-center gap-1">
                          <AlertTriangle size={11} className="text-amber-600 shrink-0" aria-hidden="true" />
                          <span>{ph.conflictReason}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 border ${
                      ph.is_available && !ph.hasConflict
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {ph.is_available && !ph.hasConflict ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={10} aria-hidden="true" />
                        Available
                      </span>
                    ) : (
                      ph.availability_status || 'Check'
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div>
          <label
            htmlFor="assign-photographer-remarks"
            className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1"
          >
            Assignment Note (Optional)
          </label>
          <input
            id="assign-photographer-remarks"
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Bring studio strobe kit and graduation props"
            className="w-full h-9 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}

AssignPhotographerModal.propTypes = {
  booking: PropTypes.object,
  changedById: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAssigned: PropTypes.func,
  onError: PropTypes.func,
  zIndexClass: PropTypes.string,
};
