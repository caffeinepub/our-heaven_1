# We are friends

## Current State
The app has a two-part reset system:
1. Frontend `ACCOUNT_RESET_VERSION` constant -- when changed, clears localStorage user/account data
2. Backend `resetKey` variable -- when changed, triggers `clearAllData()` which wipes accounts, contacts, attendance, prayers, songs, rules, quiz, timetable, and usersData from the backend

However, the backend `messages` list is NOT currently cleared by `clearAllData()`. Messages are stored as `let messages = List.empty<Message>()` (immutable binding). Private chat metadata is stored in localStorage.

All Persons box and Attendance box pull from registered accounts + `usersData` JSON blob.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `backend/main.mo`: Change `let messages` to `var messages` so it can be reassigned; update `clearAllData()` to also reset `messages := List.empty<Message>()`; update `resetKey` value to `"reset-20260331-v3"` to trigger the reset
- `frontend/src/App.tsx`: Update `ACCOUNT_RESET_VERSION` to `"reset-2026-03-31"` and `APP_VERSION` to `"2026-03-31-v1"` to force localStorage wipe on all devices

### Remove
- All existing accounts, registered user names, messages, attendance records, contacts, prayers, songs, rules, quiz data, timetable data

## Implementation Plan
1. Edit `main.mo`: change `let messages` to `var messages`, update `clearAllData()` to also do `messages := List.empty<Message>()`, change `resetKey` to `"reset-20260331-v3"`
2. Edit `App.tsx`: update `ACCOUNT_RESET_VERSION` to `"reset-2026-03-31"` and `APP_VERSION` to `"2026-03-31-v1"`
3. When any user opens the app, the new reset key triggers the full wipe and redirects to the registration screen
