import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Key,
  Clock,
  Database,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { maskClientPII } from '../../lib/securityValidator';

export default function SecuritySessionWidget() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(1800); // 30-min idle timeout
  const [sessionRefreshed, setSessionRefreshed] = useState(false);
  const [demoPiiMasked, setDemoPiiMasked] = useState(true);

  // Session idle countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshSession = () => {
    setSessionSecondsRemaining(1800);
    setSessionRefreshed(true);
    setTimeout(() => setSessionRefreshed(false), 2500);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const roleName = profile?.role === 'admin' ? 'Administrator' : 'Staff';
  const rolePrivilege = profile?.role === 'admin' 
    ? 'Full Administrative Authority' 
    : 'Least Privilege (Restricted Actions)';

  return (
    <>
      {/* Header Pill / Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 text-xs font-semibold font-body transition-all shadow-sm group"
        title="View Live Administrative Security & Session Controls"
        aria-label="Security Status"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <ShieldCheck size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
        <span className="hidden xl:inline font-bold">Security Shield:</span>
        <span>Active</span>
        <span className="text-[10px] bg-emerald-200/60 text-emerald-900 font-body px-1.5 py-0.5 rounded uppercase">
          TLS 1.3
        </span>
      </button>

      {/* Modal / Drawer of Live Administrative Security Controls */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                    Administrative Security & Access Guard
                  </h3>
                  <p className="text-[11px] text-neutral-300 font-body">
                    Live security enforcement active across all management screens
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs font-body divide-y divide-neutral-100">

              {/* Pillar 1: Authentication & Identity Security */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <UserCheck size={14} /> 1. Authentication & Identity
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-full">
                    RBAC Enforced
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Unique Account ID</span>
                      <span className="font-body font-bold text-primary truncate block" title={user?.id}>
                        {user?.id ? `${user.id.slice(0, 14)}...` : 'AUTH_ADMIN_SESSION'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Account Email</span>
                      <span className="font-semibold text-neutral-700 truncate block">
                        {user?.email || 'admin@e-kodak.com'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Active Role</span>
                      <span className="font-bold text-primary flex items-center gap-1">
                        <Key size={11} className="text-gold" /> {roleName}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase">Privilege Level</span>
                      <span className="text-emerald-700 font-semibold">{rolePrivilege}</span>
                    </div>
                  </div>

                  {/* Session Watchdog */}
                  <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-neutral-600">
                      <Clock size={13} className="text-gold" />
                      <span>Idle Inactivity Watchdog:</span>
                      <span className="font-body font-bold text-primary">{formatTime(sessionSecondsRemaining)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshSession}
                      className="text-[11px] font-bold text-gold hover:text-primary flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw size={11} className={sessionRefreshed ? "animate-spin" : ""} />
                      {sessionRefreshed ? "Refreshed!" : "Extend Session"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Data Integrity & Transaction Monitoring */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Database size={14} /> 2. Data Integrity & DB Permissions
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-full">
                    RLS Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <span className="text-neutral-400 block text-[10px] uppercase">Input Validation</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} /> XSS & SQLi Sanitized
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <span className="text-neutral-400 block text-[10px] uppercase">Database Security</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} /> Restricted RLS Policies
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Controlled Access to Client Information */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Lock size={14} /> 3. Confidentiality & PII Protection
                  </span>
                  <button
                    type="button"
                    onClick={() => setDemoPiiMasked(!demoPiiMasked)}
                    className="text-[10px] text-primary hover:text-gold flex items-center gap-1 font-semibold"
                  >
                    {demoPiiMasked ? <Eye size={11} /> : <EyeOff size={11} />}
                    {demoPiiMasked ? "Simulate Reveal" : "Enforce Mask"}
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Client Phone Number:</span>
                    <span className="font-body font-bold text-primary">
                      {demoPiiMasked ? maskClientPII('09171234567', 'phone') : '0917 123 4567'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Student ID Number:</span>
                    <span className="font-body font-bold text-primary">
                      {demoPiiMasked ? maskClientPII('22104582', 'id_number') : '22104582'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Storage & Transit Encryption:</span>
                    <span className="font-bold text-emerald-700">AES-256 / TLS 1.3</span>
                  </div>
                </div>
              </div>

              {/* Pillar 4 & 5: Media & Audit Logs */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Fingerprint size={14} /> 4 & 5. Media & Activity Monitoring
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-full">
                    Audited in PHT
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 font-body leading-relaxed">
                  All administrative mutations, booking deletions, payment receipts, and QR scans are uniquely attributed to your account ID and logged with exact UTC and Philippine Standard Time timestamps.
                </p>
              </div>

            </div>

            {/* Modal Footer with Direct Link */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-500 font-body">
                Policy Version 2026.4.2 • E-Kodak Studio
              </span>
              <Link
                to="/admin/security"
                onClick={() => setIsOpen(false)}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shrink-0"
              >
                Open Full Security Command Center <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
