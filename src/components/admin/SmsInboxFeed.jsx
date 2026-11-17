import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Inbox,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Reply,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  User,
} from 'lucide-react';
import { resolveGatewayMessageContact, detectPhilippineCarrier } from '../../services/textbeeService';

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SmsInboxFeed({
  messages = [],
  loading = false,
  error = null,
  phoneToCustomerMap = new Map(),
  onRefresh,
  onReply,
}) {
  const [direction, setDirection] = useState('all'); // 'all' | 'received' | 'sent'
  const [search, setSearch] = useState('');

  const enrichedMessages = useMemo(() => {
    return messages
      .map((m) => {
        const { isReceived, rawPhone, normalizedPhone, matchedCustomer } =
          resolveGatewayMessageContact(m, phoneToCustomerMap);

        // Strictly exclusive to messages matched to verified database records
        if (!matchedCustomer) return null;

        return {
          ...m,
          isReceived,
          rawPhone: rawPhone || 'Unknown',
          normalizedPhone,
          carrier: detectPhilippineCarrier(rawPhone),
          matchedCustomer,
          timestamp: m.receivedAt || m.deliveredAt || m.sentAt || m.createdAt,
        };
      })
      .filter(Boolean);
  }, [messages, phoneToCustomerMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedMessages.filter((m) => {
      if (direction === 'received' && !m.isReceived) return false;
      if (direction === 'sent' && m.isReceived) return false;
      if (!q) return true;
      return (
        m.rawPhone.toLowerCase().includes(q) ||
        (m.message || '').toLowerCase().includes(q) ||
        (m.matchedCustomer?.name || '').toLowerCase().includes(q) ||
        (m.matchedCustomer?.latestBooking?.booking_number || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedMessages, direction, search]);

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white shadow-xs overflow-hidden font-body">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-100 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-gold flex items-center justify-center shrink-0">
              <Inbox size={19} />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-neutral-900">
                Order SMS Inbox
              </h3>
              <p className="text-xs text-neutral-500">
                Messages matched strictly to verified booking records
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-gold' : ''} />
            <span>Sync</span>
          </button>
        </div>

        {/* Search & Direction Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `All (${enrichedMessages.length})` },
              { id: 'received', label: `Incoming (${enrichedMessages.filter((m) => m.isReceived).length})` },
              { id: 'sent', label: `Outgoing (${enrichedMessages.filter((m) => !m.isReceived).length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDirection(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  direction === t.id
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, message, customer..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs outline-none focus:bg-white focus:border-gold"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          Unable to sync TextBee messages: {error}
        </div>
      )}

      {/* Feed */}
      <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <Send size={26} className="mx-auto text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-700">No order-linked messages found</p>
            <p className="text-xs max-w-md mx-auto">
              Only SMS sent to or received from phone numbers registered on bookings in the database appear here.
            </p>
          </div>
        ) : (
          filtered.map((m) => {
            const status = String(m.status || '').toLowerCase();
            return (
              <div key={m._id} className="p-4 sm:px-5 hover:bg-neutral-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    m.isReceived
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {m.isReceived ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.matchedCustomer ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900">
                          <User size={12} className="text-gold-dark" />
                          {m.matchedCustomer.name}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-neutral-800">
                          {m.isReceived ? 'Incoming SMS' : 'Outbound SMS'}
                        </span>
                      )}

                      <span className="font-mono text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {m.rawPhone}
                      </span>

                      {m.matchedCustomer?.latestBooking?.booking_number && (
                        <span className="font-mono text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                          #{m.matchedCustomer.latestBooking.booking_number}
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        status === 'delivered' || status === 'received' || status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {status === 'failed' ? <XCircle size={10} /> : status === 'pending' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                        <span className="capitalize">{status || 'synced'}</span>
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap break-words">
                      {m.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                      <span>{fmtTime(m.timestamp)}</span>
                      {m.simUsed?.displayName && <span>SIM: {m.simUsed.displayName}</span>}
                      {m.smsBatch && <span className="font-mono">Batch: {m.smsBatch}</span>}
                    </div>
                  </div>
                </div>

                {/* Reply only allowed for active/matched database records */}
                {m.matchedCustomer && (
                  <button
                    type="button"
                    onClick={() => onReply({
                      phone: m.normalizedPhone || m.rawPhone,
                      customer: m.matchedCustomer,
                    })}
                    className="h-8 px-3 rounded-xl border border-gold/40 bg-gold/10 hover:bg-gold hover:text-white text-xs font-bold text-gold-dark flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer self-start"
                  >
                    <Reply size={12} />
                    <span>Reply</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

SmsInboxFeed.propTypes = {
  messages: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.string,
  phoneToCustomerMap: PropTypes.instanceOf(Map),
  onRefresh: PropTypes.func,
  onReply: PropTypes.func.isRequired,
};
