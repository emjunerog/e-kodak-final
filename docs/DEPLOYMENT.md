# Deployment, Mobile Installation & Operations Guide — E-Kodak Studio

This document covers deploying **E-Kodak Studio** to **GitHub**, installing the app on **mobile phones** (both via **PWA Web App Install** and the **Native Android Companion APK**), and configuring Supabase / notifications.

---

## 1. GitHub Repository & Automated Web Deployment

Repository: `https://github.com/emjunerog/e-kodak-final`

### A. One-Time GitHub Repository Configuration
1. Open your GitHub repository → **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `VITE_SUPABASE_URL` — your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase `anon` public key
   - `VITE_GEMINI_API_KEY` *(optional)* — Gemini API key for the AI Assistant
   - `VITE_TEXTBEE_API_KEY` *(optional)* — TextBee API key for automatic SMS milestones
   - `VITE_TEXTBEE_DEVICE_ID` *(optional)* — TextBee Android gateway Device ID
2. Open **Settings → Pages → Build and deployment**:
   - Set **Source** to **GitHub Actions**.
3. Pushing to `main` triggers [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml), which:
   - Builds the Vite production bundle with `VITE_BASE_PATH=/e-kodak-final/`
   - Copies `dist/index.html` to `dist/404.html` so SPA routes (`/admin/*`, `/photographer/*`, `/dashboard/*`) resolve cleanly on refresh
   - Publishes the installable PWA to `https://emjunerog.github.io/e-kodak-final/`

> **Alternative Hosts (Vercel / Netlify):** Root configurations (`vercel.json` and `netlify.toml`) and `public/_redirects` are already included. Both build cleanly with `npm run build` and output `dist/` at root base `/`.

---

## 2. Installing E-Kodak on Mobile Phones

Customers, Photographers, and Admins can install the system on phones using either the **Web App (PWA)** or the **Native Android APK**.

### Option A: Install Web App (PWA) on Android & iOS (Recommended for All Roles)
The web portal includes `public/manifest.webmanifest`, `public/sw.js` (Service Worker), iOS web-app metadata in `index.html`, and an interactive install prompt (`PwaInstallPrompt.jsx`).

- **Android (Chrome / Edge / Samsung Internet):**
  1. Open your deployed HTTPS URL (e.g. `https://emjunerog.github.io/e-kodak-final/`).
  2. Tap **Install** on the bottom *"Install E-Kodak App"* prompt, or open browser menu (`⋮`) → **Install app** / **Add to Home screen**.
  3. Launch **E-Kodak** directly from your home screen in standalone full-screen mode.
- **iPhone / iPad (Safari):**
  1. Open the deployed HTTPS URL in **Safari**.
  2. Tap the **Share** button (`□↑`), then select **Add to Home Screen**.
  3. Tap **Add** to place **E-Kodak Studio** on your iOS home screen.

### Option B: Install Native Android Companion App (`.apk`)
The React Native / Expo app lives in [`mobile/`](../mobile/) (`com.ekodak.companion`) with EAS and Gradle configurations ready for APK generation.

1. **Via GitHub Actions (No Local Android Studio Required):**
   - Go to **GitHub → Actions → Build Android APK (Mobile App) → Run workflow** (or push a tag like `git tag mobile-v1.0.0 && git push origin mobile-v1.0.0`).
   - Download the `ekodak-studio-android-apk` artifact (`ekodak-studio-android.apk`).
   - Transfer to your Android phone and open the `.apk` file (allow *"Install unknown apps"* if prompted).
2. **Via Expo EAS Cloud Build:**
   ```bash
   cd mobile
   npm install
   npx eas login
   npm run build:android
   ```
   (`mobile/eas.json` configures the `preview` profile as `"buildType": "apk"` for direct phone installation.)
3. **Via Local Android Gradle Build:**
   ```bash
   cd mobile
   npm install
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
