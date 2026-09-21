import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { 
  X, 
  CalendarDays, 
  Layers, 
  ChevronRight, 
  CreditCard, 
  MapPin, 
  CalendarPlus, 
  Sparkles,
  FileText,
  CheckCircle,
  Camera,
  Aperture,
  Package,
  Info
} from 'lucide-react';
import { getProgressSteps, getStatusBadge } from '../../lib/bookingUtils';
import SidebarOrderCalendar from './SidebarOrderCalendar';

export default function ScheduleProgressSidebar({ isOpen, onClose, bookings = [] }) {
  const latestBooking = bookings && bookings.length > 0 ? bookings[0] : null;

  const stageInfo = useMemo(() => {
    if (!latestBooking) return { percentage: 0, stageText: 'No active session' };
    const steps = getProgressSteps(latestBooking.status);
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.done || s.completed).length;
    const currentStep = steps.find(s => s.active || s.current) || steps[Math.max(0, completedSteps - 1)];
    
    let percentage = 0;
    if (completedSteps >= totalSteps) {
      percentage = 100;
    } else {
      // Give partial credit for being "in" the current step (add 10% offset)
      percentage = Math.min(95, Math.round((completedSteps / totalSteps) * 100) + 10);
    }
    
    return {
      percentage,
      stageText: `Stage ${Math.max(1, completedSteps)}/${totalSteps} · ${currentStep?.label || 'In Progress'}`
    };
  }, [latestBooking]);

  const remBalance = Number(latestBooking?.remaining_balance ?? latestBooking?.total_amount ?? 0);
  const latestBookingNeedsDownpayment = Boolean(
    latestBooking && 
    remBalance > 0 &&
    latestBooking.status !== 'CANCELLED' && 
    latestBooking.status !== 'REJECTED' &&
    (!latestBooking.down_payment_confirmed && Number(latestBooking.down_payment_amount || 0) === 0)
  );

  const latestDownAmount = latestBooking && remBalance > 0 ? Math.min(
    remBalance,
    Math.max(500, Math.round(Number(latestBooking.total_amount || 0) * 0.5))
  ) : 0;

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs z-50 transition-opacity animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Dedicated Right Sidebar Drawer */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-neutral-900 
          border-l border-neutral-200 dark:border-neutral-800 shadow-2xl 
          flex flex-col h-screen transform transition-transform duration-300 ease-in-out font-body
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-label="Studio Schedule & Progress"
      >
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
              <CalendarDays size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-primary dark:text-neutral-100 font-heading">
                Status & Schedule
              </h3>
              <p className="text-[10px] text-neutral-400 font-body">
                Order tracking and calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* 1. Status Progress Card */}
          {latestBooking ? (
            <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
              
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold mb-1 block">
                    Status
                  </span>
                  <h4 className="text-sm font-bold font-heading text-primary dark:text-neutral-100">
                    Order #{latestBooking.booking_number}
                  </h4>
                </div>
                <div className="text-right">
                   <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                     <CalendarDays size={14} className="text-gold" />
                     {latestBooking.event_date ? new Date(latestBooking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                   </div>
                   {latestBooking.preferred_time && (
                     <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">{latestBooking.preferred_time.substring(0, 5)}</p>
                   )}
                </div>
              </div>

              {/* Engineered Details: Sets & Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                  <Layers size={14} className="text-gold mb-2" />
                  <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Package</p>
                  <p className="text-xs font-bold text-primary dark:text-neutral-200 truncate mt-0.5" title={latestBooking.service?.name}>
                     {latestBooking.service?.name || 'Studio Session'}
                  </p>
                  <p className="text-[10px] font-semibold text-gold mt-1">
                    {(latestBooking.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || (latestBooking.package_name ? 1 : 0))} Sets
                  </p>
                </div>
                
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                  <CreditCard size={14} className={remBalance > 0 ? 'text-amber-500' : 'text-emerald-500'} mb={8} />
                  <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Payment</p>
                  <p className="text-xs font-bold text-primary dark:text-neutral-200 mt-0.5">
                     ₱{Number(latestBooking.total_amount || 0).toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-semibold mt-1 ${remBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {remBalance > 0 ? `₱${remBalance.toLocaleString()} Balance` : 'Fully Paid'}
                  </p>
                </div>
              </div>

              {/* Icon-based Status Tracker */}
              <div className="pt-2">
                 <p className="text-[10px] font-bold text-neutral-400 mb-3 text-center uppercase tracking-widest">
                   {stageInfo.stageText}
                 </p>
                 <div className="flex items-center justify-between relative px-1">
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-neutral-100 dark:bg-neutral-800 z-0 rounded-full" />
                    
                    {getProgressSteps(latestBooking.status).map((step, idx) => {
                       const icons = [FileText, CheckCircle, Camera, Aperture, Package];
                       const Icon = icons[idx] || Info;
                       const isActive = step.active || step.current;
                       const isDone = step.done || step.completed;
                       
                       let iconClass = "text-neutral-300 dark:text-neutral-600 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";
                       if (isActive) iconClass = "text-gold bg-gold/10 border-gold shadow-sm ring-2 ring-gold/20";
                       else if (isDone) iconClass = "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30";
                       
                       return (
                         <div key={idx} className="relative z-10 group/step flex flex-col items-center">
                           <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${iconClass}`}>
                             <Icon size={14} className={isActive ? 'animate-pulse' : ''} />
                           </div>
                           {/* Hover Tooltip */}
                           <div className="pointer-events-none absolute bottom-full mb-1.5 opacity-0 group-hover/step:opacity-100 transition-opacity bg-neutral-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap z-50 border border-neutral-700">
                             {step.label}
                           </div>
                         </div>
                       );
                    })}
                 </div>
              </div>


              {/* Downpayment Notice */}
              {latestBookingNeedsDownpayment && (
                <Link
                  to="/dashboard/payments"
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={14} className="shrink-0" />
                    <span>₱{latestDownAmount.toLocaleString()} Deposit Due</span>
                  </span>
                  <span className="underline">Pay Now</span>
                </Link>
              )}

              <Link
                to="/dashboard/progress"
                onClick={onClose}
                className="w-full py-2 px-3 mt-2 rounded-xl bg-gold/10 hover:bg-gold hover:text-primary text-gold-dark dark:text-gold text-xs font-bold flex items-center justify-center gap-1 transition-all border border-gold/20 group"
              >
                <span>Track Full Timeline</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-center space-y-2">
              <Sparkles size={20} className="text-gold mx-auto" />
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                No active session scheduled yet.
              </p>
              <Link
                to="/dashboard/book"
                onClick={onClose}
                className="btn-primary inline-flex py-1.5 px-3 text-xs font-bold rounded-xl"
              >
                Book a Session
              </Link>
            </div>
          )}

          {/* 2. Interactive Studio Calendar */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-3 shadow-xs">
            <SidebarOrderCalendar bookings={bookings} />
          </div>

          {/* 3. Assigned Photographer (Hover Bulletin) */}
          {latestBooking?.photographer && (
            <div className="relative group/bulletin">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between cursor-pointer hover:border-gold/40 hover:shadow-sm transition-all shadow-xs">
                 <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0 overflow-hidden">
                      {latestBooking.photographer.profile?.avatar_url ? (
                        <img src={latestBooking.photographer.profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <Camera size={16} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-0.5">Assigned Photographer</p>
                      <p className="text-xs font-bold text-primary dark:text-neutral-200 truncate">
                        {latestBooking.photographer.profile?.first_name} {latestBooking.photographer.profile?.last_name}
                      </p>
                    </div>
                 </div>
                 <Info size={16} className="text-neutral-400 group-hover/bulletin:text-gold transition-colors" />
              </div>

              {/* Hover Dropdown / Bulletin */}
              <div className="absolute bottom-full left-0 right-0 mb-3 opacity-0 invisible group-hover/bulletin:opacity-100 group-hover/bulletin:visible transition-all duration-300 z-50">
                 <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-5">
                   <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                         <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0">
                            {latestBooking.photographer.profile?.avatar_url ? (
                               <img 
                                 src={latestBooking.photographer.profile.avatar_url} 
                                 className="w-full h-full object-cover" 
                               />
                            ) : (
                               <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                                 <Camera size={20} />
                               </div>
                            )}
                         </div>
                         <div>
                           <h5 className="font-heading font-bold text-sm text-primary dark:text-neutral-100">
                             {latestBooking.photographer.profile?.first_name} {latestBooking.photographer.profile?.last_name}
                           </h5>
                           <p className="text-[10px] uppercase tracking-wider text-gold font-bold mt-0.5">
                             {latestBooking.photographer.specialization || 'Lead Photographer'}
                           </p>
                         </div>
                      </div>
                      {latestBooking.photographer.bio && (
                         <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                           <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed italic">
                             "{latestBooking.photographer.bio}"
                           </p>
                         </div>
                      )}
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

ScheduleProgressSidebar.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  bookings: PropTypes.array,
};
