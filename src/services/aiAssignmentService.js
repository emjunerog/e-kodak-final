import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getAiClient, isAiConfigured } from '../lib/ai';

/**
 * assignPhotographer
 * ------------------
 * Attempts to automatically assign a photographer to a new booking using AI (Groq / Gemini).
 * @param {Object} booking - The booking details (date, time, service, etc.)
 */
export async function assignPhotographer(booking) {
  if (!isSupabaseConfigured || !isAiConfigured() || !booking?.id) {
    return { assigned: false, error: 'Studio schedule allocation pending.' };
  }

  const eventDate = booking.event_date || booking.booking_date;
  const preferredTime = booking.preferred_time || booking.booking_time || 'TBD';

  if (!eventDate) {
    return { assigned: false, reason: 'Booking date is TBD; manual dispatcher assignment required.' };
  }

  try {
    // 1. Fetch photographers who have explicitly marked availability for this date
    const { data: availabilities, error: availError } = await supabase
      .from('photographer_availability')
      .select('photographer_id, availability_date, is_available, start_time, end_time')
      .eq('availability_date', eventDate)
      .eq('is_available', true);

    if (availError || !availabilities || availabilities.length === 0) {
      return { assigned: false, reason: 'No photographers available on this date.' };
    }

    const availableIds = availabilities.map((a) => a.photographer_id).filter(Boolean);
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        is_active,
        photographer_profile:photographer_profiles(specialization, is_available)
      `)
      .in('id', availableIds)
      .eq('role', 'photographer');

    if (profError || !profiles || profiles.length === 0) {
      return { assigned: false, reason: 'No active photographers matched for this date.' };
    }

    // 2. Prepare context for the AI
    const photographerList = profiles
      .filter((p) => p.is_active !== false)
      .map((p) => {
        const phProf = Array.isArray(p.photographer_profile) ? p.photographer_profile[0] : p.photographer_profile;
        return {
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Studio Photographer',
          specialization: phProf?.specialization || 'Portrait & Studio Photography',
        };
      });

    if (photographerList.length === 0) {
      return { assigned: false, reason: 'No active photographers available on this date.' };
    }

    const prompt = `
      You are an intelligent booking manager for a photography studio.
      A new booking has been made. You need to assign the best available photographer from the list.
      
      Booking Details:
      - Service: ${booking.service_name || booking.service?.name || 'Photography Session'}
      - Date: ${eventDate}
      - Time: ${preferredTime}
      
      Available Photographers:
      ${JSON.stringify(photographerList, null, 2)}
      
      Rules:
      1. Choose the photographer whose specialization best matches the service.
      2. If multiple match or none match perfectly, pick the first available one to ensure the client gets served.
      3. "assigned_id" MUST be an exact "id" from the Available Photographers list above.
      
      Respond with ONLY a JSON object in this exact format, with no markdown formatting or backticks:
      {
        "assigned_id": "UUID of the chosen photographer",
        "reason": "Short explanation of why they were chosen"
      }
    `;

    // 3. Ask AI to make the decision
    const ai = getAiClient();
    if (!ai) {
      return { assigned: false, reason: 'AI service unavailable.' };
    }

    const response = await ai.models.generateContent({
      contents: prompt,
      config: { maxTokens: 400, temperature: 0.2 },
    });

    const resultText = response.text || '';
    const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanedText);

    // Verify AI-selected ID actually belongs to our verified available photographers list
    const chosenPhotographer = photographerList.find((p) => p.id === result?.assigned_id) || photographerList[0];

    if (chosenPhotographer?.id) {
      // 4. Update the booking in Supabase
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          photographer_id: chosenPhotographer.id,
          status: 'PHOTOGRAPHER_ASSIGNED',
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // 5. Record booking status history & notification for the photographer
      await Promise.allSettled([
        supabase.from('booking_status_history').insert({
          booking_id: booking.id,
          old_status: booking.status || 'PENDING',
          new_status: 'PHOTOGRAPHER_ASSIGNED',
          notes: `Automated AI dispatch assigned ${chosenPhotographer.name}: ${result?.reason || 'Best available match'}`,
        }),
        supabase.from('notifications').insert([{
          user_id: chosenPhotographer.id,
          title: 'New Booking Assigned!',
          message: `You have been automatically assigned to booking ${booking.booking_number || ''} on ${eventDate}.`,
          notification_type: 'ASSIGNMENT',
          booking_id: booking.id,
        }]),
      ]);

      return {
        assigned: true,
        photographer_id: chosenPhotographer.id,
        reason: result?.reason || `Assigned to ${chosenPhotographer.name}`,
      };
    }

    return { assigned: false, reason: 'Studio operations team will assign an available photographer.' };
  } catch (error) {
    console.error("Photographer allocation error:", error);
    return { assigned: false, error: error.message };
  }
}
