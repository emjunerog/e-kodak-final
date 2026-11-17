import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  Smartphone,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const ORDER_STATUS_BADGE = {
  PHOTOGRAPHER_ASSIGNED: { label: 'Assigned', className: 'bg-blue-50 text-blue-700' },
  PENDING: { label: 'Pending', className: 'bg-neutral-100 text-neutral-600' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700' },
  READY: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700' },
  CAPTURE: { label: 'Capture', className: 'bg-amber-50 text-amber-800' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-amber-50 text-amber-800' },
  EDITING: { label: 'Editing', className: 'bg-amber-50 text-amber-800' },
  RETOUCHING: { label: 'Retouching', className: 'bg-amber-50 text-amber-800' },
  FINALIZED: { label: 'Finalized', className: 'bg-emerald-50 text-emerald-700' },
  PRINTING: { label: 'Printing', className: 'bg-amber-50 text-amber-800' },
  UNDER_DELIVERY: { label: 'Delivery', className: 'bg-blue-50 text-blue-700' },
};

export default function SmsCustomerDirectory({
  contacts = [],
  loading = false,
  selectedIds = [],
  onToggleSelect,
  onSelectMany,
  onClearSelection,
  onQuickPickCustomer,
  embedded = false,
}) {
  const [search, setSearch] = useState('');

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.rawPhone.toLowerCase().includes(q) ||
        c.normalizedPhone.toLowerCase().includes(q) ||
        (c.source || '').toLowerCase().includes(q) ||
        (c.latestBooking?.booking_number || '').toLowerCase().includes(q) ||
        (c.latestBooking?.serviceName || '').toLowerCase().includes(q)
      );
    });
  }, [contacts, search]);

  const reachableVisible = useMemo(
    () => filteredContacts.filter((c) => c.isValidPhone),
    [filteredContacts]
  );

  const allVisibleSelected =
    reachableVisible.length > 0 &&
    reachableVisible.every((c) => selectedIds.includes(c.id));

  const handleToggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(reachableVisible.map((c) => c.id));
      onSelectMany(selectedIds.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...reachableVisible.map((c) => c.id)]));
      onSelectMany(merged);
    }
  };

  const wrapperClass = embedded
    ? 'flex flex-col overflow-hidden h-full font-body bg-white'
    : 'rounded-2xl border border-neutral-200/90 bg-white shadow-xs flex flex-col overflow-hidden h-full font-body';

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="p-5 pb-3.5 border-b border-neutral-100 space-y-3.5 bg-white">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
            Current orders
          </h3>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer shrink-0"
            >
              Clear ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking, name, or mobile"
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#B45309] focus:ring-2 focus:ring-amber-600/15"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Select All Row */}
        {reachableVisible.length > 0 && (
          <div className="flex items-center justify-between pt-0.5 text-xs text-neutral-500">
            <button
              type="button"
              onClick={handleToggleAllVisible}
              className="inline-flex items-center gap-2 font-medium text-neutral-700 hover:text-neutral-900 cursor-pointer"
            >
              {allVisibleSelected ? (
                <CheckSquare size={15} className="text-[#B45309]" />
              ) : (
                <Square size={15} className="text-neutral-400" />
              )}
              <span>Select all</span>
            </button>
            <span className="text-neutral-400">{selectedIds.length} selected</span>
          </div>
        )}
      </div>

      {/* Order Contact List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 max-h-[540px]">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-14 rounded-xl bg-neutral-100/80 animate-pulse" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 space-y-2">
            <Smartphone size={22} className="mx-auto text-neutral-300" />
            <p className="text-xs font-medium text-neutral-500">
              No active orders with mobile numbers match your search.
            </p>
          </div>
        ) : (
          filteredContacts.map((c, idx) => {
            const isSelected = selectedIds.includes(c.id);
            const statusKey = String(c.bookingStatus || '').toUpperCase();
            const badge = ORDER_STATUS_BADGE[statusKey] || {
              label: c.source || 'Active',
              className: 'bg-neutral-100 text-neutral-600',
            };
            const balance = Number(c.latestBooking?.remaining_balance || 0);

            return (
              <div
                key={c.id}
                onClick={() => onToggleSelect(c.id)}
                className={`px-5 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-amber-50/50' : 'hover:bg-neutral-50/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(c.id);
                    }}
                    className="text-neutral-400 hover:text-neutral-700 shrink-0 cursor-pointer"
                    aria-label={`Select ${c.latestBooking?.booking_number || c.name}`}
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-[#B45309]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>

                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx % 2 === 0
                        ? 'bg-amber-100/80 text-amber-800'
                        : 'bg-neutral-200/80 text-neutral-700'
                    }`}
                  >
                    {getInitials(c.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-neutral-900 truncate">
                        {c.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-500 flex-wrap">
                      <span className="font-medium text-emerald-700 tabular-nums">
                        {c.normalizedPhone || c.rawPhone}
                      </span>
                      {c.latestBooking?.booking_number && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <span className="text-neutral-500">#{c.latestBooking.booking_number}</span>
                        </>
                      )}
                      {balance > 0 && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <span className="font-semibold text-[#B45309]">
                            ₱{balance.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickPickCustomer(c);
                  }}
                  className="h-8 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 shrink-0 transition-colors cursor-pointer shadow-2xs"
                  title={`Compose SMS to ${c.name}`}
                >
                  Text
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

SmsCustomerDirectory.propTypes = {
  contacts: PropTypes.array,
  loading: PropTypes.bool,
  selectedIds: PropTypes.array,
  onToggleSelect: PropTypes.func.isRequired,
  onSelectMany: PropTypes.func.isRequired,
  onClearSelection: PropTypes.func.isRequired,
  onQuickPickCustomer: PropTypes.func.isRequired,
  embedded: PropTypes.bool,
};
