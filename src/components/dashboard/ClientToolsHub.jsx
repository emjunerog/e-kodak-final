import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  QrCode, CheckSquare, Calculator, X, Check,
  RefreshCw, History, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import QRPass from "../booking/QRPass";
import { getServices } from "../../services/contentService";
import { SERVICES } from "../../data/servicesData";
import { getCustomerActivityAudit } from "../../services/bookingService";
import StudioDropdown from "../ui/StudioDropdown";

const CHECKLIST_ITEMS = [
  { id: "school_id", label: "Bring School ID or valid government ID for verification", category: "Documents" },
  { id: "inner_wear", label: "Wear or bring formal inner attire (collared dress shirt, blouse, or plain barong undershirt)", category: "Wardrobe" },
  { id: "arrival", label: "Arrive at studio 15 minutes before your scheduled call-time", category: "Call-Time" },
  { id: "qr_pass", label: "Have your E-Kodak Studio QR Pass downloaded or saved on phone", category: "Studio Pass" }
];

const ESTIMATOR_ADDONS = [
  { id: "makeup", label: "Professional Makeup", price: 1200 },
  { id: "frame8R", label: "8R Framed Print", price: 650 },
  { id: "rush", label: "Rush Processing", price: 500 },
  { id: "softCopies", label: "Soft Copies", price: 400 },
];

export default function ClientToolsHub({
  isOpen,
  onClose,
  initialTool = "qr",
  bookings = [],
  selectedBooking = null,
}) {
  const [activeTool, setActiveTool] = useState(initialTool);
  const [activityEvents, setActivityEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Sync activeTool whenever initialTool or modal open state changes
  useEffect(() => {
    if (initialTool) {
      // Fall back to the QR Pass when an unknown tool is requested
      setActiveTool(["qr", "checklist", "estimator", "activity"].includes(initialTool) ? initialTool : "qr");
    }
  }, [initialTool, isOpen]);

  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem("ekodak_checklist");
      return saved ? JSON.parse(saved) : CHECKLIST_ITEMS.map(item => ({ ...item, done: false }));
    } catch {
      return CHECKLIST_ITEMS.map(item => ({ ...item, done: false }));
    }
  });

  // Package Cost Estimator state (pulls dynamically from database with fallback)
  const [servicesList, setServicesList] = useState(SERVICES);

  useEffect(() => {
    getServices().then(({ data }) => {
      if (data && data.length > 0) {
        setServicesList(data);
      }
    });
  }, []);

  const [selectedServiceId, setSelectedServiceId] = useState(SERVICES[0]?.id || "college-packages");
  const currentService = servicesList.find(s => s.id === selectedServiceId || s.slug === selectedServiceId) || servicesList[0];

  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const currentTier = currentService?.tiers?.[selectedTierIndex] || currentService?.tiers?.[0];

  // Parse numeric price from tier price string (e.g. "₱4,875.00" -> 4875)
  const parseNumericPrice = (priceStr) => {
    if (!priceStr) return 0;
    const clean = String(priceStr).replace(/[^0-9.]/g, "");
    return parseFloat(clean) || 0;
  };

  const estBase = parseNumericPrice(currentTier?.price);

  const [estAddOns, setEstAddOns] = useState({
    makeup: false,
    frame8R: false,
    rush: false,
    softCopies: true
  });

  // Selected Booking for QR Pass
  const confirmedBooking = bookings.find(b => b.status === "CONFIRMED") || bookings[0] || null;
  const [selectedBookingId, setSelectedBookingId] = useState(selectedBooking?.id || confirmedBooking?.id || "");

  // Sync selected booking when prop updates
  useEffect(() => {
    if (selectedBooking?.id) {
      setSelectedBookingId(selectedBooking.id);
    } else if (confirmedBooking?.id && !selectedBookingId) {
      setSelectedBookingId(confirmedBooking.id);
    }
  }, [selectedBooking, confirmedBooking]);

  // Load activity audit log when activity tool is active
  const bookingIds = React.useMemo(() => bookings.map(b => b.id), [bookings]);
  useEffect(() => {
    if (isOpen && activeTool === 'activity') {
      const targetUserId = bookings[0]?.user_id;
      if (targetUserId) {
        setActivityLoading(true);
        getCustomerActivityAudit(targetUserId, bookingIds).then(({ data }) => {
          setActivityEvents(data || []);
          setActivityLoading(false);
        });
      } else {
        setActivityEvents([]);
        setActivityLoading(false);
      }
    }
  }, [isOpen, activeTool, bookings, bookingIds]);


  const toggleChecklistItem = (id) => {
    const updated = checklist.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setChecklist(updated);
    try {
      localStorage.setItem("ekodak_checklist", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to persist checklist", e);
    }
  };

  const resetChecklist = () => {
    const reset = CHECKLIST_ITEMS.map(item => ({ ...item, done: false }));
    setChecklist(reset);
    localStorage.removeItem("ekodak_checklist");
  };

  const completedCount = checklist.filter(c => c.done).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  // Estimator Add-on calculations
  const addOnPricing = {
    makeup: 1200,
    frame8R: 650,
    rush: 500,
    softCopies: 400
  };
  const totalAddons = Object.entries(estAddOns).reduce((sum, [k, v]) => v ? sum + addOnPricing[k] : sum, 0);
  const estTotal = estBase + totalAddons;
  const estDown = Math.round(estTotal * 0.5);

  if (!isOpen) return null;

  const currentPassBooking = bookings.find(b => b.id === selectedBookingId) || selectedBooking || confirmedBooking;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div 
        className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh] border border-neutral-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-primary">Client Tools</h3>
              <p className="text-xs text-neutral-500 font-body">QR pass, checklist, cost estimator, activity log</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-primary transition-colors p-1.5 rounded-full hover:bg-neutral-200"
            aria-label="Close tools modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tool Switcher Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/40 px-6 gap-2 pt-2 overflow-x-auto">
          {[
            { id: "qr", label: "QR Pass", icon: QrCode },
            { id: "checklist", label: "Checklist", icon: CheckSquare, badge: `${completedCount}/${checklist.length}` },
            { id: "estimator", label: "Cost Estimator", icon: Calculator },
            { id: "activity", label: "Activity", icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTool(tab.id)}
              className={`pb-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTool === tab.id
                  ? "border-gold text-primary bg-white/60 rounded-t-lg shadow-xs"
                  : "border-transparent text-neutral-500 hover:text-primary"
              }`}
            >
              <tab.icon size={15} className={activeTool === tab.id ? "text-gold" : "text-neutral-400"} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-xs bg-gold/20 text-gold-dark px-1.5 py-0.2 rounded-full font-body">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tool Content Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* 1. QR PASS TOOL */}
          {activeTool === "qr" && (
            <div className="space-y-4">
              {bookings.length > 1 && (
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 space-y-2">
                  <span className="text-xs font-bold text-primary block">Select Session Pass:</span>
                  <div className="w-full">
                    <StudioDropdown
                      value={selectedBookingId}
                      onChange={val => setSelectedBookingId(val)}
                      options={bookings.map(b => ({
                        value: b.id,
                        label: `#${b.booking_number} – ${b.service?.name || "Session"}`,
                        badge: b.status,
                      }))}
                    />
                  </div>
                </div>
              )}

              {currentPassBooking ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-full max-w-sm">
                    <QRPass
                      booking={currentPassBooking}
                      bookingNumber={currentPassBooking.booking_number}
                      bookingToken={
                        currentPassBooking.booking_token ||
                        currentPassBooking.qr_code_token ||
                        currentPassBooking.token ||
                        currentPassBooking.booking_number ||
                        currentPassBooking.id
                      }
                      qrCodePath={currentPassBooking.qr_code_path || currentPassBooking.qr_code_url}
                      size={220}
                      showActions={true}
                    />
                  </div>

                  <div className="mt-4 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl w-full max-w-sm text-center">
                    <p className="text-[11px] text-neutral-500 font-body">
                      Present this digital pass upon arrival at the studio reception for instant check-in.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                    <QrCode size={28} />
                  </div>
                  <h4 className="font-heading text-primary font-bold">No Active Booking Found</h4>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1 mb-4">
                    Book a photoshoot session to generate your digital studio check-in QR pass.
                  </p>
                  <Link to="/dashboard/book" onClick={onClose} className="btn-primary inline-flex text-xs">
                    Book a Session Now
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 2. CHECKLIST TOOL */}
          {activeTool === "checklist" && (
            <div className="space-y-5">
              {/* Progress Header */}
              <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-primary">Shoot Day Readiness</span>
                  <span className="text-xs font-body font-bold text-gold">{progressPct}% Complete</span>
                </div>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold to-amber-500 transition-all duration-500" 
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-2">
                  Essential reminders for a smooth studio session.
                </p>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2.5">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      item.done
                        ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                        : "bg-white border-neutral-200 hover:border-gold/40 text-primary"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      item.done
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                        : "border-neutral-300 bg-white"
                    }`}>
                      {item.done && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug ${item.done ? "line-through text-neutral-400" : "text-primary"}`}>
                        {item.label}
                      </p>
                      <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={resetChecklist}
                  className="text-xs text-neutral-400 hover:text-red-500 flex items-center gap-1 font-medium"
                >
                  <RefreshCw size={12} /> Reset Checklist
                </button>
              </div>
            </div>
          )}
          {/* 3. COST ESTIMATOR TOOL */}
          {activeTool === "estimator" && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Service</span>
                  <StudioDropdown
                    value={currentService?.id || selectedServiceId}
                    onChange={val => setSelectedServiceId(val)}
                    options={servicesList.map(s => ({
                      value: s.id,
                      label: s.name || s.title || "Service",
                    }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Package tier</span>
                  <StudioDropdown
                    value={selectedTierIndex}
                    onChange={val => setSelectedTierIndex(Number(val))}
                    options={(currentService?.tiers || []).map((t, i) => ({
                      value: i,
                      label: t.name || `Tier ${i + 1}`,
                      desc: t.price || "",
                    }))}
                  />
                </div>
              </div>

              {/* Add-ons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Add-ons</span>
                <div className="grid grid-cols-2 gap-2">
                  {ESTIMATOR_ADDONS.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setEstAddOns(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        estAddOns[a.id]
                          ? "bg-gold/10 border-gold/50"
                          : "bg-white border-neutral-200 hover:border-gold/40"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-primary">{a.label}</p>
                        <p className="text-[11px] text-neutral-400">₱{a.price.toLocaleString()}</p>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border shrink-0 ${
                        estAddOns[a.id]
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-neutral-300 bg-white"
                      }`}>
                        {estAddOns[a.id] && <Check size={11} strokeWidth={3} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote Summary */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Base package</span>
                  <span className="font-bold text-primary">₱{estBase.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Add-ons</span>
                  <span className="font-bold text-primary">₱{totalAddons.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Estimate</span>
                  <span className="font-heading text-lg font-extrabold text-amber-700 dark:text-amber-400">
                    ₱{estTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  50% downpayment (₱{estDown.toLocaleString()}) reserves this package.
                </p>
              </div>
            </div>
          )}

          {/* 4. ACTIVITY TRAIL TOOL */}
          {activeTool === "activity" && (
            <div className="space-y-3">
              {activityLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <RefreshCw size={22} className="animate-spin text-gold" />
                  <p className="text-xs">Loading activity…</p>
                </div>
              ) : activityEvents.length > 0 ? (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {activityEvents.map(ev => {
                    const isPayment = ev.category === "PAYMENT";
                    return (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-2xl border border-neutral-200 flex items-start gap-3"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isPayment ? "bg-emerald-500/15 text-emerald-600" : "bg-gold/15 text-gold"
                        }`}>
                          {isPayment ? <ExternalLink size={14} /> : <History size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-primary truncate">{ev.title}</p>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {ev.timestamp instanceof Date && !isNaN(ev.timestamp)
                                ? ev.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                                : ""}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{ev.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                    <History size={28} />
                  </div>
                  <h4 className="font-heading text-primary font-bold">No activity yet</h4>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
                    Status updates and payments will appear here as your session progresses.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

ClientToolsHub.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialTool: PropTypes.string,
  bookings: PropTypes.array,
  selectedBooking: PropTypes.object,
};