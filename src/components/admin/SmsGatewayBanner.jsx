import React from 'react';
import PropTypes from 'prop-types';
import {
  Smartphone,
  Wifi,
  BatteryCharging,
  Battery,
  Radio,
  RefreshCw,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

function formatHeartbeat(iso) {
  if (!iso) return 'No heartbeat yet';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SmsGatewayBanner({
  device,
  loading = false,
  error = null,
  isConfigured = false,
  onRefresh,
  onOpenSettings,
}) {
  const sims = device?.simInfo?.sims || [];
  const primarySim = sims[0] || null;
  const batteryPct = device?.batteryInfo?.percentage;
  const isCharging = device?.batteryInfo?.isCharging;
  const networkType = device?.networkInfo?.networkType;
  const isOnline = Boolean(device?.enabled);
  const lowBattery = typeof batteryPct === 'number' && batteryPct <= 15 && !isCharging;

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white/95 backdrop-blur-md px-4 py-3.5 shadow-xs font-body">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Paired Android Device Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
          }`}>
            <Smartphone size={19} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                {device ? `${device.brand || ''} ${device.model || device.name || 'Android Gateway'}`.trim() : 'TextBee Android Gateway'}
              </span>

              {loading ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                  <RefreshCw size={10} className="animate-spin" />
                  Checking device...
                </span>
              ) : isOnline ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={11} />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle size={11} />
                  {isConfigured ? 'Offline' : 'Not Configured'}
                </span>
              )}

              {lowBattery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertTriangle size={11} />
                  Low Battery ({batteryPct}%)
                </span>
              )}
            </div>

            <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
              {error
                ? error
                : device
                  ? `Android ${device.osVersion || '—'} · App v${device.appVersionName || '—'} · Synced ${formatHeartbeat(device.lastHeartbeat)}`
                  : 'Pair your Android device in Gateway settings to enable SMS.'}
            </p>
          </div>
        </div>

        {/* Right: Live Telemetry Pills & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {primarySim && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs font-semibold text-amber-900">
              <Radio size={12} className="text-amber-600" />
              <span>{primarySim.displayName || primarySim.carrierName || 'Active SIM'}</span>
            </span>
          )}

          {typeof batteryPct === 'number' && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold ${
              lowBattery
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-neutral-50 border-neutral-200 text-neutral-700'
            }`}>
              {isCharging ? <BatteryCharging size={13} className="text-emerald-600" /> : <Battery size={13} />}
              <span>{batteryPct}%{isCharging ? ' Charging' : ''}</span>
            </span>
          )}

          {networkType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-700 uppercase">
              <Wifi size={12} className="text-blue-600" />
              <span>{networkType}</span>
            </span>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 px-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh TextBee phone status"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-gold' : 'text-neutral-500'} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="h-8 px-2.5 rounded-xl border border-gold/40 bg-gold/10 hover:bg-gold/20 text-xs font-semibold text-gold-dark flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Configure TextBee API Key & Device ID"
          >
            <Settings2 size={12} />
            <span>Gateway</span>
          </button>
        </div>
      </div>
    </div>
  );
}

SmsGatewayBanner.propTypes = {
  device: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  isConfigured: PropTypes.bool,
  onRefresh: PropTypes.func,
  onOpenSettings: PropTypes.func,
};
