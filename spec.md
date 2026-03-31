# We are friends

## Current State
The app has a splash screen, Srida-specific greeting, and a full account system stored in backend Maps and localStorage. Accounts persist across sessions. The backend has no reset mechanism.

## Requested Changes (Diff)

### Add
- `getResetKey()` backend query returning hardcoded `"reset-20260331-v2"` to trigger a forced re-registration for all users
- `clearAllData()` backend function that wipes all accounts, timetable, contacts, prayers, songs, rules, quiz, and attendance data
- `MahavirGreetingScreen` component showing `/assets/mahavir-jayanti.jpg` fullscreen for 2 seconds, shown to ALL users after splash (before home/welcome/srida-greeting)
- `"mahavir-greeting"` screen type
- Frontend startup reset check: compare localStorage `waf_resetKey` with backend `getResetKey()`; if mismatch, call `clearAllData()`, wipe all localStorage keys, show registration

### Modify
- Splash `onComplete` handler: after checking user, navigate to `"mahavir-greeting"` instead of directly to home/welcome/srida-greeting; store intended next screen in a ref
- Screen type union: add `"mahavir-greeting"`

### Remove
- Nothing removed

## Implementation Plan
1. Add `getResetKey` and `clearAllData` to `src/backend/main.mo`
2. Add corresponding signatures to `src/frontend/src/backend.d.ts`
3. In AppInner: add `mahavirNextRef` to store where to go after greeting; add reset check on mount that calls backend `getResetKey`, compares with localStorage, clears everything if mismatch
4. Modify splash `onComplete` to navigate to `"mahavir-greeting"` always (for all users), storing the real destination
5. Add `MahavirGreetingScreen` component: fullscreen image with 2-second auto-dismiss
6. Add `screen === "mahavir-greeting"` renderer in main JSX
