-- Migration 07: Seed initial studio_settings and announcements if empty
INSERT INTO studio_settings (contact_email, contact_phone, address, business_hours, social_links)
SELECT 
  'contact@e-kodak.com', 
  '+63 917 123 4567', 
  '3rd Floor Colon Heritage Bldg, Colon St, Cebu City, 6000 Cebu, Philippines', 
  'Mon – Sat: 8:00 AM – 6:00 PM | Sun: By Appointment', 
  '{"facebook": "https://facebook.com/ekodakcebu", "instagram": "https://instagram.com/ekodakcebu", "tiktok": "https://tiktok.com/@ekodakcebu"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM studio_settings);

INSERT INTO announcements (text, cta_text, cta_link, type, is_active, sort_order)
SELECT 
  '🎓 2026 Graduation Season Priority Bookings are now officially open! Reserve your package slot today.', 
  'Book Session', 
  '/services', 
  'info', 
  true, 
  1
WHERE NOT EXISTS (SELECT 1 FROM announcements);
