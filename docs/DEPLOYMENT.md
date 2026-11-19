# Deployment, Mobile APK Installation & Operations Guide — E-Kodak Studio

This document covers deploying the **E-Kodak Studio** web portal to **GitHub Pages** and building/installing the **Native Android Companion App (`mobile/`)** (`ekodak-companion.apk`) on Android phones.

---

## 1. GitHub Repository & Automated Web Deployment

Repository: `https://github.com/emjunerog/e-kodak-final`

### A. One-Time GitHub Repository Configuration
1. Open your GitHub repository → **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `VITE_SUPABASE_URL` — your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase `anon` public key
   - `VITE_GROQ_API_KEY` *(optional)* — Groq AI Assistant key
   - `VITE_GROQ_MODEL` *(optional)* — Groq AI model
   - `VITE_GEMINI_API_KEY` *(optional)* — Gemini API key fallback for AI Assistant
   - `VITE_TEXTBEE_API_KEY` *(optional)* — TextBee API key for automatic SMS milestones
   - `VITE_TEXTBEE_DEVICE_ID` *(optional)* — TextBee Android gateway Device ID
   - `VITE_XENDIT_SECRET_KEY` *(optional, sandbox only)* — Xendit test secret key
   - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` *(optional)* — Google Maps key for Mobile Companion
2. Open **Settings → Pages → Build and deployment**:
   - Set **Source** to **GitHub Actions**.
3. Pushing to `main` triggers [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml), which builds the Vite web portal with `VITE_BASE_PATH=/e-kodak-final/`, copies `dist/index.html` to `dist/404.html`, and publishes it to `https://emjunerog.github.io/e-kodak-final/`.

> **Alternative Hosts (Vercel / Netlify):** Root configurations (`vercel.json` and `netlify.toml`) and `public/_redirects` are already included. Both build cleanly with `npm run build` and output `dist/` at root base `/`.

---

## 2. Installing the Native Android Companion App (`.apk`)

The standalone React Native / Expo mobile companion app lives in [`mobile/`](../mobile/) (`com.ekodak.companion`).

### Option A: Direct Download from GitHub Releases (Built Automatically)
1. Pushing changes in `mobile/` (or running **Actions → Build Android APK (Mobile App) → Run workflow**) generates `ekodak-companion.apk` via `expo prebuild --platform android` and Gradle `assembleRelease`.
2. Download directly on your Android phone from:
   `https://github.com/emjunerog/e-kodak-final/releases/download/companion-latest/ekodak-companion.apk`
   *(Or download the `ekodak-companion-apk` artifact from the GitHub Actions run.)*
3. Open `ekodak-companion.apk` on your Android phone, allow **"Install unknown apps"** if prompted, and tap **Install**.

### Option B: Expo EAS Cloud Build
```bash
cd mobile
npm install
npx eas login
npm run build:android
```
(`mobile/eas.json` configures the `preview` profile as `"buildType": "apk"` for direct phone installation.)

### Option C: Local Android Gradle Build
```bash
cd mobile
npm install
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
```
Output APK path: `mobile/android/app/build/outputs/apk/release/app-release.apk`.

---

## 3. Studio Production & Notification Architecture

- **Walk-In Studio Fulfillment:** Courier/home-delivery dispatch steps are removed across Web & Mobile. Completed orders route to **Walk-In Claiming (`Ready to Receive`)** at **311 Rizal Street, City of Naga, Cebu** alongside digital soft copies.
- **Photo Outputs Soft-Copy Release Gate:** Photographers' editing batches remain internal (`UPLOADED`) until reviewed by Admin. From **Booking Quick Inspector** (`Retouching` / `Finalized`), Admin clicks **Move to Photo Outputs** (`/admin/photos?bookingId=<id>&openUpload=true`) to add client digital copies (`status: 'RELEASED'`), then explicitly clicks **Finalize Booking Order** and **Release Soft Copy**.
- **Admin Undo / Redo:** Quick Inspector header provides **Undo** and **Redo** controls backed by `booking_status_history` audit entries.
- **Automated Emails & TextBee SMS (`src/services/orderLifecycleNotificationService.js`):**
  - Sends branded HTML progress emails via Supabase Edge Function `send-email` (logged to `email_logs`) on every order progress update.
  - Automatically resolves the booking's customer phone number from `bookingId` and sends short `E-Kodak Studios:` SMS messages via TextBee (`src/services/textbeeService.js`, logged to `sms_logs`) on major milestones (`DOWNPAYMENT_RECEIVED`, `CONFIRMED`, `DIGITAL_COPIES_SENT`, `FINALIZED`, `READY`, and `COMPLETED`).
- **Completed Order Notifications:** Moving an order to `COMPLETED` records an **`Order Ready to Receive`** customer notification in both the Web Customer Dashboard and the Mobile Companion App.

---

## 4. Supabase Backend Checklist

1. Apply SQL migrations sequentially from `supabase/migrations/` (`01_booking_system.sql` through `19_google_oauth_names_and_customer_deletion.sql`).
2. Ensure Storage buckets exist (`studio-assets` public; `photo-outputs` / `outputs` / `booking-references` signed via `resolvePhotoOutputUrls`).
3. Deploy Supabase Edge Functions from `supabase/functions/` (`send-email`, etc.) and configure SMTP secrets in **Supabase Dashboard → Edge Functions → Secrets**.
