# LifeLine – Driver App (Expo / React Native)

Works with the existing `lifeline-backend` and `lifeline-requester-app` unchanged. No endpoints or socket events were invented.

## Run
```
cp .env.example .env     # EXPO_PUBLIC_API_URL (real phone: your computer's LAN IP) + Google Maps key (Maps SDK + Directions API)
npm install && npx expo install --fix
npx expo run:android     # or run:ios (a dev build is required for Google Maps / siren audio; Expo Go is not enough on iOS)
```
Flow to test end to end: seed backend → register driver here → approve in hospital (`POST /api/hospital/drivers/:id/decision`)
→ sign in → go Online → book from the requester app.

## Backend contract used
| Purpose | Call |
|---|---|
| Hospitals list for sign-up | `GET /api/auth/hospitals` |
| Register (multipart) | `POST /api/auth/driver/register` (fullName, phone, password, licenseNumber, vehicleNumber, hospital, licenseImage, rcImage, profilePhoto) |
| Login (403 = pending/rejected) | `POST /api/auth/driver/login` |
| Online / offline | `PATCH /api/driver/online {online}` |
| Accept / reject (409 = already taken) | `POST /api/driver/bookings/:id/accept|reject` |
| Status machine | `PATCH /api/driver/bookings/:id/status` (Driver Arriving → Arrived → Patient Picked → Trip Started → Completed) |
| Top-3 hospitals / choose (omit id = nearest) | `GET .../hospitals`, `POST .../hospital {hospitalId?}` |
| History | `GET /api/driver/history` |
| Socket in | `booking:offer`, `booking:taken`, `booking:expired`, `booking:cancelled` |
| Socket out | `driver:location {lat,lng,heading}` |

## Behaviour notes
- **Siren** (`assets/siren.wav`, generated loop + repeating vibration) rings while any offer is undecided; stops on accept, reject,
  `booking:taken` ("Request Already Accepted", buttons disabled, popup auto-removes) or `booking:expired`. No polling anywhere.
- The backend sets the driver **offline whenever the socket disconnects**, so the app re-sends `PATCH /driver/online` on every reconnect.
- Dispatch matches on the stored driver location, so a GPS fix is sent **before** going online and then every ~3 s (+5 s heartbeat).
- Hospital is notified by the backend the moment the driver confirms a hospital (`hospital:incoming`); the app then auto-advances to *Trip Started*.

## Gaps in the existing backend (reported, not faked)
1. **No driver forgot/reset password.** `/auth/forgot-password` only touches the User model. The Forgot screen says so.
2. **No `GET /driver/me`.** Profile shows only login data (name, vehicle) + phone; hospital name and profile photo can't be shown
   (uploaded files are served only to hospitals via `/api/files/:name`).
3. **No active-trip endpoint.** The in-progress trip is saved on the device so it survives an app restart. A cancellation that happens
   while the app is closed can't be detected until the next action (the backend answers 409 and the app clears the trip); a manual
   "Trip not active? Clear it" link covers edge cases.
4. **Requester phone is not exposed to drivers**, so there is no "call requester".
5. **`accept` does not check `isBusy`.** The app compensates: it rejects other offers after accepting and auto-rejects offers while on a trip.
6. **No push notifications / background GPS.** Alerts and tracking work while the app is open (screen kept awake while online).
   Background operation needs push (FCM/APNs) and a background location task on the backend/app.
7. Siren loudness is limited by the phone's media volume.
