import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Camera, 
  CalendarDays, 
  CalendarClock, 
  Layers, 
  Upload 
} from 'lucide-react';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import { 
  getAssignedBookings, 
  uploadPhotoOutput, 
  getPhotoOutputs,
  deletePhotoOutput,
  submitSamplesToAdmin,
  getRequiredSetsForBooking,
  extractSetName,
  getCleanFileName
} from '../../services/photographerService';
import Toast from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';

export default function PhotographerUploads() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [outputs, setOutputs] = useState([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);

  // Target set for the file upload trigger
  const [activeUploadSet, setActiveUploadSet] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submittingToAdmin, setSubmittingToAdmin] = useState(false);
  const [toast, setToast] = useState(null);

  // Custom set addition state
  const [customSets, setCustomSets] = useState([]);
  const [newCustomSetName, setNewCustomSetName] = useState('');
  const [showAddCustomSet, setShowAddCustomSet] = useState(false);

  // Filter and preview modals
  const [selectedSetFilter, setSelectedSetFilter] = useState('ALL');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadBookings();
    }
  }, [user?.id]);

  const loadBookings = async () => {
    setLoading(true);
    const { data } = await getAssignedBookings(user.id);
    if (data) {
      setBookings(data);
      if (data.length > 0 && !selectedBooking) {
        handleSelectBooking(data[0]);
      }
    }
    setLoading(false);
  };

  const handleSelectBooking = async (booking) => {
    setSelectedBooking(booking);
    setLoadingOutputs(true);
    setCustomSets([]);
    const { data } = await getPhotoOutputs(booking.id);
    if (data) {
      setOutputs(data);
    }
    setLoadingOutputs(false);
  };

  // Determine required sets based on the booking package & tier
  const requiredSets = useMemo(() => {
    if (!selectedBooking) return [];
    const base = getRequiredSetsForBooking(selectedBooking);
    return [...base, ...customSets];
  }, [selectedBooking, customSets]);

  // Map each set to its uploaded photo (enforcing 1 sample per set)
  const setPhotoMap = useMemo(() => {
    const map = {};
    outputs.forEach(out => {
      const sName = extractSetName(out.file_name);
      // Keep latest sample for this set
      if (!map[sName]) {
        map[sName] = out;
      }
    });
    return map;
  }, [outputs]);

  // Overall completion metrics
  const completedSetsCount = useMemo(() => {
    if (requiredSets.length === 0) return 0;
    return requiredSets.filter(s => !!setPhotoMap[s.name]).length;
  }, [requiredSets, setPhotoMap]);

  const allRequiredSetsCompleted = requiredSets.length > 0 && completedSetsCount === requiredSets.length;

  // Trigger upload for a specific set slot
  const handleTriggerUpload = (targetSet) => {
    setActiveUploadSet(targetSet);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking || !activeUploadSet) return;

    setUploading(true);

    // If a photo already exists for this set, delete it first to enforce exactly 1 sample per set
    const existingPhoto = setPhotoMap[activeUploadSet.name];
    if (existingPhoto?.id) {
      await deletePhotoOutput(existingPhoto.id);
    }

    const { data, error } = await uploadPhotoOutput(file, selectedBooking.id, activeUploadSet.name);
    setUploading(false);

    if (error) {
      setToast({ type: 'error', message: 'Failed to upload photo sample: ' + (error.message || 'Unknown error') });
    } else if (data) {
      setToast({ 
        type: 'success', 
        message: `Sample photo uploaded for ${activeUploadSet.name} (1/1 completed).` 
      });
      // Refresh outputs
      const { data: updatedOutputs } = await getPhotoOutputs(selectedBooking.id);
      if (updatedOutputs) setOutputs(updatedOutputs);
    }

    setActiveUploadSet(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    if (!deleteConfirmTarget) return;
    setDeleting(true);
    const { error } = await deletePhotoOutput(deleteConfirmTarget.id);
    setDeleting(false);

    if (error) {
      setToast({ type: 'error', message: 'Failed to remove sample: ' + error.message });
    } else {
      setToast({ type: 'success', message: 'Photo sample removed from set slot.' });
      setOutputs(prev => prev.filter(o => o.id !== deleteConfirmTarget.id));
      setDeleteConfirmTarget(null);
    }
  };

  const handleAddCustomSet = (e) => {
    e.preventDefault();
    if (!newCustomSetName.trim()) return;
    const title = newCustomSetName.trim();
    setCustomSets(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: title.startsWith('Set') ? title : `Set (Extra): ${title}`,
        description: 'Additional studio shoot look',
        icon: 'bi-camera'
      }
    ]);
    setNewCustomSetName('');
    setShowAddCustomSet(false);
    setToast({ type: 'success', message: `Added ${title} to required sets list.` });
  };

  const handleSubmitToAdmin = async () => {
    if (!selectedBooking) return;
    if (outputs.length === 0) {
      setToast({ type: 'error', message: 'Please upload at least one sample photo before submitting to Admin.' });
      return;
    }

    if (!allRequiredSetsCompleted) {
      const missingSets = requiredSets
        .filter(s => !setPhotoMap[s.name])
        .map(s => s.name)
        .join(', ');
      setToast({ 
        type: 'error', 
        message: `Incomplete sets: Please upload 1 sample for: ${missingSets}` 
      });
      return;
    }

    // Build sets summary
    const setsSummary = requiredSets.map(s => s.name).join(', ');

    setSubmittingToAdmin(true);
    const { error: err } = await submitSamplesToAdmin({
      bookingId: selectedBooking.id,
      photographerId: user?.id,
      photographerName: `${profile?.first_name || 'Photographer'} ${profile?.last_name || ''}`.trim(),
      bookingNumber: selectedBooking.booking_number,
      photoCount: outputs.length,
      setsSummary
    });
    setSubmittingToAdmin(false);

    if (err) {
      setToast({ type: 'error', message: 'Failed to submit samples: ' + err.message });
    } else {
      setToast({ type: 'success', message: 'Sample photos submitted to Admin for review.' });
      setSelectedBooking(prev => ({ ...prev, status: 'EDITING' }));
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'EDITING' } : b));
    }
  };

  const displayedSets = useMemo(() => {
    if (selectedSetFilter === 'ALL') return requiredSets;
    return requiredSets.filter(s => s.id === selectedSetFilter || s.name === selectedSetFilter);
  }, [requiredSets, selectedSetFilter]);

  const displayName = profile?.first_name
    ? `${profile.first_name}`
    : user?.email?.split('@')[0] || 'Photographer';

  const operationalSummary = loading
    ? 'Loading assigned shoots...'
    : `${bookings.length} assigned shoot${bookings.length !== 1 ? 's' : ''} · ${selectedBooking ? `#${selectedBooking.booking_number}` : 'No session selected'}`;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* Hidden File Input Trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <AdminHeroBanner
        station="photographer"
        badgeLabel="Photographer Bay"
        userName={displayName}
        title="Photoshoot Outputs"
        subtitle="Manage photoshoot sample sets and submit completed sets to Admin."
        statusSummary={operationalSummary}
        primaryAction={{
          label: 'My Shoots Queue',
          href: '/photographer/bookings',
          icon: Camera,
        }}
        secondaryAction={{
          label: 'Bay Schedule',
          href: '/photographer/availability',
          icon: CalendarDays,
        }}
        onRefresh={loadBookings}
        isRefreshing={loading}
        extraTools={[
          {
            label: 'Assigned Shoots',
            sublabel: 'View shoot queue',
            icon: Camera,
            onClick: () => navigate('/photographer/bookings'),
          },
          {
            label: 'Availability Calendar',
            sublabel: 'Update working slots',
            icon: CalendarClock,
            onClick: () => navigate('/photographer/availability'),
          },
          {
            label: 'Studio Dashboard',
            sublabel: 'Overview & metrics',
            icon: Layers,
            onClick: () => navigate('/photographer/dashboard'),
          },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Assigned Bookings List */}
        <div className="w-full lg:w-1/3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-body flex items-center gap-1.5">
              <i className="bi bi-calendar2-check text-gold"></i>
              Assigned Shoots ({bookings.length})
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center glass-card rounded-2xl bg-white border border-neutral-200">
              <i className="bi bi-arrow-repeat animate-spin text-2xl text-gold mx-auto mb-2 block"></i>
              <p className="text-xs text-neutral-500 font-body">Loading assigned bookings…</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl bg-white border border-dashed border-neutral-200">
              <i className="bi bi-camera text-3xl text-neutral-300 mb-2 block"></i>
              <p className="text-xs text-neutral-500 font-body font-medium">No assigned shoots found.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {bookings.map(booking => {
                const isSelected = selectedBooking?.id === booking.id;
                const bSets = getRequiredSetsForBooking(booking);
                return (
                  <button
                    key={booking.id}
                    onClick={() => handleSelectBooking(booking)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white border-neutral-200/90 hover:border-gold/60 text-primary shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-body text-xs font-bold text-gold flex items-center gap-1">
                        <i className="bi bi-hash"></i>
                        {booking.booking_number}
                      </span>
                      <span className={`text-[11px] font-body ${isSelected ? 'text-white/70' : 'text-neutral-400'}`}>
                        <i className="bi bi-calendar3 me-1"></i>
                        {booking.event_date || 'Date TBD'}
                      </span>
                    </div>

                    <p className={`font-heading text-base font-bold truncate ${isSelected ? 'text-white' : 'text-primary'}`}>
                      {booking.service?.name || 'Photoshoot'}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10">
                      <p className={`text-xs font-body truncate ${isSelected ? 'text-white/80' : 'text-neutral-600'}`}>
                        <i className="bi bi-person me-1"></i>
                        {booking.customer?.first_name} {booking.customer?.last_name}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {booking.tier_name && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-neutral-100 text-neutral-800'
                          }`}>
                            {booking.tier_name}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : booking.status === 'EDITING'
                              ? 'bg-amber-100 text-amber-800'
                              : ['PRINTING', 'READY'].includes(booking.status)
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {booking.status === 'EDITING' ? 'Under Review' : booking.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Order Sets & Single Photo Slot Uploads */}
        <div className="w-full lg:w-2/3">
          {!selectedBooking ? (
            <div className="glass-card rounded-2xl bg-white border border-dashed border-neutral-200 p-16 text-center flex flex-col items-center justify-center min-h-[440px]">
              <i className="bi bi-camera text-4xl text-neutral-300 mb-3 block"></i>
              <h3 className="font-heading text-lg font-bold text-primary">No booking selected</h3>
              <p className="text-xs text-neutral-400 font-body max-w-sm mt-1">
                Select an assigned shoot from the left column to view order set requirements and upload photo samples.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-7 shadow-xs space-y-6">
              {/* Order Info & Status Strip */}
              <div className="pb-5 border-b border-neutral-100 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs font-bold text-gold bg-gold/10 px-2.5 py-1 rounded-md border border-gold/20">
                        #{selectedBooking.booking_number}
                      </span>
                      {selectedBooking.tier_name && (
                        <span className="text-xs font-bold text-primary bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                          <i className="bi bi-bag-check me-1 text-gold"></i>
                          {selectedBooking.tier_name}
                        </span>
                      )}
                    </div>
                    <h2 className="font-heading text-2xl text-primary font-bold mt-1.5">
                      {selectedBooking.service?.name}
                    </h2>
                    <p className="text-xs text-neutral-500 font-body mt-1 flex items-center gap-3">
                      <span><i className="bi bi-person me-1"></i> Client: <strong>{selectedBooking.customer?.first_name} {selectedBooking.customer?.last_name}</strong></span>
                      <span>·</span>
                      <span><i className="bi bi-calendar3 me-1"></i> Shoot Date: <strong>{selectedBooking.event_date || 'TBD'}</strong></span>
                    </p>
                  </div>

                  {/* Workflow Review Badge */}
                  <div>
                    {selectedBooking.status === 'EDITING' ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-body">
                        <i className="bi bi-clock-history text-amber-600"></i>
                        Awaiting Admin Review
                      </span>
                    ) : ['PRINTING', 'READY', 'COMPLETED'].includes(selectedBooking.status) ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-body">
                        <i className="bi bi-check-circle-fill text-emerald-600"></i>
                        Admin Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 font-body">
                        <i className="bi bi-camera text-neutral-500"></i>
                        Studio Capture Stage
                      </span>
                    )}
                  </div>
                </div>

                {/* Sets Progress & Submit to Admin */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-body">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-700 flex items-center gap-1.5">
                        <i className="bi bi-layers text-gold"></i>
                        Sets Progress
                      </span>
                      <span className="font-bold text-neutral-900">
                        {completedSetsCount} of {requiredSets.length} Completed
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          allRequiredSetsCompleted ? 'bg-emerald-600' : 'bg-gold'
                        }`}
                        style={{ width: `${requiredSets.length > 0 ? (completedSetsCount / requiredSets.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitToAdmin}
                    disabled={submittingToAdmin || outputs.length === 0}
                    className={`px-5 py-2.5 rounded-xl font-body text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0 ${
                      allRequiredSetsCompleted
                        ? 'bg-gold hover:bg-gold-dark text-neutral-950 ring-2 ring-gold/40'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-40'
                    }`}
                  >
                    {submittingToAdmin ? (
                      <i className="bi bi-arrow-repeat animate-spin"></i>
                    ) : (
                      <i className="bi bi-send-check text-sm"></i>
                    )}
                    <span>Submit to Admin</span>
                  </button>
                </div>
              </div>

              {/* Set Filtering & Add Extra Set Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap font-body">
                {/* Custom Styled Set Dropdown Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <i className="bi bi-funnel text-gold"></i>
                    View Set:
                  </label>
                  <select
                    value={selectedSetFilter}
                    onChange={(e) => setSelectedSetFilter(e.target.value)}
                    className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold cursor-pointer"
                  >
                    <option value="ALL">All Sets ({requiredSets.length})</option>
                    {requiredSets.map(s => {
                      const isDone = !!setPhotoMap[s.name];
                      return (
                        <option key={s.id} value={s.id}>
                          {isDone ? '✓ ' : '○ '} {s.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Add Extra Set Trigger */}
                <button
                  type="button"
                  onClick={() => setShowAddCustomSet(!showAddCustomSet)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-body"
                >
                  <i className="bi bi-plus-circle text-gold"></i>
                  <span>Add Additional Set</span>
                </button>
              </div>

              {/* Custom Set Creator Form */}
              {showAddCustomSet && (
                <form onSubmit={handleAddCustomSet} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 font-body">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700">Add Extra Photo Set for this Order</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCustomSet(false)}
                      className="text-xs text-neutral-400 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newCustomSetName}
                      onChange={(e) => setNewCustomSetName(e.target.value)}
                      placeholder="e.g. Set 4: Creative Milestone, Full-Body Studio..."
                      className="flex-1 px-3.5 py-2 bg-white border border-neutral-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-all cursor-pointer"
                    >
                      Add Set
                    </button>
                  </div>
                </form>
              )}

              {/* Set Upload Slots Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-body">
                    Required Sets
                  </h3>
                </div>

                {loadingOutputs ? (
                  <div className="py-16 text-center">
                    <i className="bi bi-arrow-repeat animate-spin text-2xl text-gold mx-auto mb-2 block"></i>
                    <p className="text-xs text-neutral-400 font-body">Loading slots…</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displayedSets.map((s, index) => {
                      const photo = setPhotoMap[s.name];
                      const isCompleted = !!photo;

                      return (
                        <div
                          key={s.id || index}
                          className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                            isCompleted
                              ? 'bg-white border-emerald-200/90 shadow-2xs ring-1 ring-emerald-500/10'
                              : 'bg-neutral-50/70 border-dashed border-neutral-300 hover:border-gold/60'
                          }`}
                        >
                          {/* Set Card Header */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-bold text-primary truncate">
                                <i className={`bi ${s.icon || 'bi-camera'} text-gold me-1.5`}></i>
                                {s.name}
                              </span>
                              {isCompleted ? (
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                                  <i className="bi bi-check-circle-fill text-emerald-600"></i> Uploaded
                                </span>
                              ) : (
                                <span className="bg-neutral-100 text-neutral-600 border border-neutral-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                  Pending
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-neutral-500 font-body line-clamp-2 min-h-[32px]">
                              {s.description || 'Studio shoot look'}
                            </p>
                          </div>

                          {/* Center: Photo Preview or Empty Dropzone */}
                          <div className="my-4">
                            {isCompleted ? (
                              <div className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 aspect-[4/3] shadow-xs">
                                <img
                                  src={photo.file_url || photo.file_path}
                                  alt={photo.file_name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=400&q=80';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                                  <p className="text-xs font-semibold truncate">
                                    {getCleanFileName(photo.file_name) || photo.file_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewPhoto(photo)}
                                      className="text-xs bg-white/20 hover:bg-white/40 px-2 py-1 rounded text-white inline-flex items-center gap-1"
                                    >
                                      <i className="bi bi-eye"></i> View Full
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => handleTriggerUpload(s)}
                                className="border border-dashed border-neutral-300 rounded-xl p-6 text-center hover:bg-white/80 transition-all cursor-pointer aspect-[4/3] flex flex-col items-center justify-center group"
                              >
                                <div className="w-10 h-10 rounded-full bg-gold/10 group-hover:bg-gold/20 text-gold flex items-center justify-center mb-2 transition-colors">
                                  <i className="bi bi-cloud-arrow-up text-lg"></i>
                                </div>
                                <span className="text-xs font-bold text-neutral-700 block">
                                  Upload Photo
                                </span>
                                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                                  JPG, PNG, or WEBP
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                            {isCompleted ? (
                              <>
                                <button
                                  type="button"
                                  disabled={uploading}
                                  onClick={() => handleTriggerUpload(s)}
                                  className="text-xs font-semibold text-neutral-700 hover:text-primary transition-colors inline-flex items-center gap-1 cursor-pointer font-body"
                                  title="Replace photo"
                                >
                                  <i className="bi bi-arrow-repeat text-gold"></i> Replace
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmTarget(photo)}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors inline-flex items-center gap-1 cursor-pointer font-body"
                                  title="Remove photo"
                                >
                                  <i className="bi bi-trash3"></i> Remove
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={uploading}
                                onClick={() => handleTriggerUpload(s)}
                                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer font-body"
                              >
                                <i className="bi bi-cloud-arrow-up text-gold"></i> Upload Photo
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PHOTO FULL PREVIEW LIGHTBOX MODAL ─────────────────────────────── */}
      {previewPhoto && (
        <Modal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          title={`Preview — ${extractSetName(previewPhoto.file_name)}`}
        >
          <div className="space-y-4 font-body">
            <div className="max-h-[520px] overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <img
                src={previewPhoto.file_url || previewPhoto.file_path}
                alt={previewPhoto.file_name}
                className="max-h-[520px] w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600 px-1">
              <div>
                <p className="font-bold text-neutral-900">
                  {getCleanFileName(previewPhoto.file_name) || previewPhoto.file_name}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Set: <strong>{extractSetName(previewPhoto.file_name)}</strong>
                </p>
              </div>
              <a
                href={previewPhoto.file_url || previewPhoto.file_path}
                target="_blank"
                rel="noreferrer"
                download
                className="btn-outline px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
              >
                <i className="bi bi-download"></i> Download
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* ── REMOVE PHOTO CONFIRMATION MODAL ─────────────────────────────────── */}
      {deleteConfirmTarget && (
        <Modal
          isOpen={!!deleteConfirmTarget}
          onClose={() => !deleting && setDeleteConfirmTarget(null)}
          title="Remove Photo?"
        >
          <div className="space-y-4 font-body">
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Remove the photo for{' '}
              <strong className="text-neutral-900">{extractSetName(deleteConfirmTarget.file_name)}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-xs text-neutral-600 hover:bg-neutral-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeletePhoto}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <i className="bi bi-arrow-repeat animate-spin"></i>
                ) : (
                  <i className="bi bi-trash3"></i>
                )}
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
