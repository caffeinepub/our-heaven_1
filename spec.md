# Our Heaven

## Current State
The app has an AttendanceScreen component that uses hardcoded members (Aaron, Nevveen), does not load registered users, does not filter by date, and does not persist data to the backend. The blank screen issue affects certain users (Don) during app load.

## Requested Changes (Diff)

### Add
- Backend: `saveAttendance(data: Text)` and `getAttendance()` functions for persistent storage
- AttendanceScreen: date picker so leaders can mark attendance for a specific date
- AttendanceScreen: auto-load all registered users from `getAllAccounts()` instead of hardcoded list
- AttendanceScreen: only leaders (Aaron David, Jojo, Nevveen) can toggle Present/Absent; all members can view
- AttendanceScreen: persist attendance data to backend via `saveAttendance`
- Blank screen fix: add error boundary / null guard in app load so users like Don don't see a blank screen

### Modify
- AttendanceScreen: replace hardcoded members with real registered accounts
- AttendanceScreen: add date selector at top; show attendance records per date
- Backend: add attendanceData variable and save/get functions

### Remove
- Hardcoded member list in AttendanceScreen
- "Add Member" button (members come from registration now)

## Implementation Plan
1. Add `var attendanceData: ?Text = null` + `saveAttendance`/`getAttendance` to backend main.mo
2. Rebuild AttendanceScreen: fetch all accounts, show date picker, mark present/absent per date, save/load from backend
3. Fix blank screen: add try/catch around loadStoredUser() and ensure navigate always resolves to a valid screen
