import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';

// Initialize the GenAI client. 
// In a real production app, this should be a backend edge function because 
// exposing the API key in the frontend is a security risk.
// For this prototype, we'll use the import.meta.env.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

/**
 * assignPhotographer
 * ------------------
 * Attempts to automatically assign a photographer to a new booking using Gemini.
 * @param {Object} booking - The booking details (date, time, service, etc.)
 */
export async function assignPhotographer(booking) {
  if (!isSupabaseConfigured || !import.meta.env.VITE_GEMINI_API_KEY) {
    return { assigned: false, error: 'Studio schedule allocation pending.' };
  }

  try {
    // 1. Fetch all photographers and their availability for this date
    // Note: In a robust setup, you'd filter by exact date.
    const { data: availabilities, error: availError } = await supabase
      .from('photographer_availability')
      .select(`
        photographer_id,
        is_available,
        photographer:photographer_profiles(
          id, specialization,
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('date', booking.booking_date)
      .eq('is_available', true);

    if (availError || !availabilities || availabilities.length === 0) {
      return { assigned: false, reason: 'No photographers available on this date.' };
    }

    // 2. Prepare context for the AI
    const photographerList = availabilities.map(a => ({
      id: a.photographer_id,
      name: `${a.photographer?.profile?.first_name} ${a.photographer?.profile?.last_name}`,
      specialization: a.photographer?.specialization || 'General',
    }));

    const prompt = `
      You are an intelligent booking manager for a photography studio.
      A new booking has been made. You need to assign the best available photographer from the list.
      
      Booking Details:
      - Service: ${booking.service_name || 'Photography Session'}
      - Date: ${booking.booking_date}
      - Time: ${booking.booking_time}
      
      Available Photographers:
      ${JSON.stringify(photographerList, null, 2)}
      
      Rules:
      1. Choose the photographer whose specialization best matches the service.
      2. If multiple match or none match perfectly, just pick the first available one to ensure the client gets served.
      
      Respond with ONLY a JSON object in this exact format, with no markdown formatting or backticks:
      {
        "assigned_id": "UUID of the chosen photographer",
        "reason": "Short explanation of why they were chosen"
      }
    `;

    // 3. Ask Gemini to make the decision
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const resultText = response.text;
    
    // Parse the JSON (handle potential markdown blocks if the model ignores the instruction)
    const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedText);

    if (result.assigned_id) {
      // 4. Update the booking in Supabase
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          photographer_id: result.assigned_id,
          status: 'PHOTOGRAPHER_ASSIGNED'
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // 5. Optionally, create a notification for the photographer
      await supabase.from('notifications').insert([{
        user_id: result.assigned_id,
        title: 'New Booking Assigned!',
        message: `You have been automatically assigned to a new booking on ${booking.booking_date}.`,
        notification_type: 'ASSIGNMENT',
        booking_id: booking.id
      }]);

      return { assigned: true, photographer_id: result.assigned_id, reason: result.reason };
    }

    return { assigned: false, reason: 'Studio operations team will assign an available photographer.' };
  } catch (error) {
    console.error("Photographer allocation error:", error);
    return { assigned: false, error: error.message };
  }
}
