# E-Kodak Companion App — Mobile

This is the React Native (Expo) companion app for E-Kodak Photography Studio.

## Setup

1. **Install dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Then edit .env with your Supabase project URL and anon key
   ```

3. **Run the app**
   ```bash
   npx expo start
   # Press 'a' for Android emulator
   # Or scan the QR code with Expo Go on your phone
   ```

## Build for Android (APK)

```bash
npx eas build --platform android --profile preview
```

## Structure

```
mobile/
├── App.js              # Root + tutorial/splash logic
├── app.json            # Expo configuration
├── src/
│   ├── theme/          # Design tokens (colors, typography)
│   ├── navigation/     # AppNavigator (tabs + stack)
│   ├── screens/        # All screen components
│   │   ├── HomeScreen.jsx
│   │   ├── QRScannerScreen.jsx
│   │   ├── BookingTrackerScreen.jsx
│   │   ├── SavedBookingsScreen.jsx
│   │   ├── TutorialScreen.jsx
│   │   ├── PhotographerLoginScreen.jsx
│   │   └── PhotographerScheduleScreen.jsx
│   ├── components/     # Reusable UI
│   │   ├── GoldButton.jsx
│   │   ├── GlassCard.jsx
│   │   ├── StatusBadge.jsx
│   │   └── MilestoneStepper.jsx
│   └── services/       # Backend integration
│       ├── supabase.js
│       ├── bookingService.js
│       └── storageService.js
└── assets/             # Icons and splash image
```
