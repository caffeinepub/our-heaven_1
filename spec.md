# We are friends

## Current State
The Attendance box exists with a date picker and Present/Absent toggle. It uses `loadAllMembers()` which calls `getAllAccounts()` from the backend. The issue is that some registered users are not appearing in the attendance list -- the `getAllAccounts` call may fail or return stale data, and the fallback is localStorage which is device-specific.

## Requested Changes (Diff)

### Add
- On registration, also save user to the `usersData` JSON blob (shared backend storage) so both `getAllAccounts` and `getUsersData` return the full list.
- In the Attendance screen, show a loading indicator while members are being fetched.
- Retry logic: if `getAllAccounts` returns empty, wait 1 second and retry once before falling back to `getUsersData`.

### Modify
- `registerAccount` flow: after successful registration, call `saveUsersData` to append the new user to the shared users JSON blob.
- `loadAllMembers`: combine results from both `getAllAccounts` and `getUsersData`/localStorage, deduplicate by phone, so no user is ever missed.
- Attendance screen: always shows all members from the combined/deduped list.

### Remove
- Nothing removed.

## Implementation Plan
1. Update the registration handler to also write the new user into the `usersData` JSON blob on the backend.
2. Update `loadAllMembers` to merge results from `getAllAccounts()` AND `getUsersData()` AND localStorage, deduplicating by phone number.
3. Update AttendanceScreen to show a loading spinner while members load and display all merged members.
