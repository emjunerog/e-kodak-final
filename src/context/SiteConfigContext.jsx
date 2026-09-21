import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { siteConfig as staticConfig } from '../config/siteConfig';

const SiteConfigContext = createContext();

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(staticConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('studio_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching studio settings:", error);
        } else if (data) {
          // Merge dynamic data with static config
          setConfig(prev => ({
            ...prev,
            contact: {
              ...prev.contact,
              email: data.contact_email || prev.contact.email,
              phone: data.contact_phone || prev.contact.phone,
              address: data.address || prev.contact.address,
              hours: data.business_hours || prev.contact.hours,
            },
            social: {
              ...prev.social,
              ...(data.social_links || {})
            }
          }));
        }
      } catch (err) {
        console.error("Unexpected error fetching studio settings:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return (
    <SiteConfigContext.Provider value={{ config, loading }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const context = useContext(SiteConfigContext);
  if (context === undefined) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
}
