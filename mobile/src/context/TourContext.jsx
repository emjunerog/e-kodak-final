import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

export const CUSTOMER_TOUR_STEPS = [
  {
    id: 'customer_btn_guide',
    title: 'Scan Guide',
    description: 'Tap here anytime for step-by-step help on finding and scanning your studio receipt QR code.',
    borderRadius: 20,
  },
  {
    id: 'customer_btn_notifications',
    title: 'Studio Updates',
    description: 'Check live alerts when your shoot progresses from Capture and Editing to Ready for Pickup.',
    borderRadius: 20,
  },
  {
    id: 'customer_btn_hero_cta',
    title: 'Track Order',
    description: 'Tap this button to open your live shoot timeline, package inclusions, and delivery tracker.',
    borderRadius: 16,
  },
  {
    id: 'customer_tab_bookings',
    title: 'Bookings Tab',
    description: 'View all of your saved QR passes, receipt totals, payment statuses, and past bookings.',
    borderRadius: 16,
  },
  {
    id: 'customer_tab_scanner',
    title: 'Scan QR Button',
    description: 'Open the live QR camera anytime to link another booking receipt or scan a studio pass.',
    borderRadius: 30,
  },
  {
    id: 'customer_tab_profile',
    title: 'Profile Tab',
    description: 'Manage your profile photo, delivery details, studio bay map, and personalized theme cover.',
    borderRadius: 16,
  },
];

export const PHOTOGRAPHER_TOUR_STEPS = [
  {
    id: 'ph_btn_duty',
    title: 'Studio Duty Toggle',
    description: 'Tap this status button to switch your general studio readiness between Available and Off Duty.',
    borderRadius: 20,
  },
  {
    id: 'ph_btn_alerts',
    title: 'Workstation Alerts',
    description: 'Open urgent assignment handoffs, reschedule notices, and messages from Studio Admin.',
    borderRadius: 20,
  },
  {
    id: 'ph_btn_hero_cta',
    title: 'View Shoots Queue',
    description: 'Jump directly to your assigned shoots to accept bookings and advance capture or editing stages.',
    borderRadius: 16,
  },
  {
    id: 'ph_tab_schedule',
    title: 'Schedule Tab',
    description: 'Check your monthly shoot calendar and set custom working hours or off-duty dates.',
    borderRadius: 16,
  },
  {
    id: 'ph_tab_shoots',
    title: 'Shoots Action Button',
    description: 'Quickly open your active shoot queue to update session status or request a reschedule.',
    borderRadius: 30,
  },
  {
    id: 'ph_tab_profile',
    title: 'Credentials & Profile',
    description: 'Review your verified staff credentials, QR pass ID, workload totals, and edit your studio bio.',
    borderRadius: 16,
  },
];

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const targetsRef = useRef(new Map());
  const [activeTourRole, setActiveTourRole] = useState(null); // 'customer' | 'photographer' | null
  const [stepIndex, setStepIndex] = useState(0);

  const registerTarget = useCallback((id, ref) => {
    if (!id) return;
    if (ref) {
      targetsRef.current.set(id, ref);
    } else {
      targetsRef.current.delete(id);
    }
  }, []);

  const getTargetRef = useCallback((id) => {
    return targetsRef.current.get(id) || null;
  }, []);

  const startTour = useCallback((role) => {
    if (role !== 'customer' && role !== 'photographer') return;
    setStepIndex(0);
    setActiveTourRole(role);
  }, []);

  const steps =
    activeTourRole === 'photographer'
      ? PHOTOGRAPHER_TOUR_STEPS
      : activeTourRole === 'customer'
        ? CUSTOMER_TOUR_STEPS
        : [];

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev + 1 >= steps.length) {
        setActiveTourRole(null);
        return 0;
      }
      return prev + 1;
    });
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const finishTour = useCallback(() => {
    setActiveTourRole(null);
    setStepIndex(0);
  }, []);

  return (
    <TourContext.Provider
      value={{
        activeTourRole,
        stepIndex,
        steps,
        currentStep: steps[stepIndex] || null,
        registerTarget,
        getTargetRef,
        startTour,
        nextStep,
        prevStep,
        finishTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}

export function useRegisterTourTarget(targetId) {
  const tour = useTour();
  const nodeRef = useRef(null);

  const setRef = useCallback(
    (node) => {
      nodeRef.current = node;
      if (tour?.registerTarget) {
        tour.registerTarget(targetId, node ? nodeRef : null);
      }
    },
    [tour, targetId]
  );

  return setRef;
}
