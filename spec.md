# Our Heaven

## Current State
Full app is built with splash screen, registration, 16 feature boxes (Messages, Group Chat, Important Messages, Your Ideas, Home Works, School Works, Star of the Month, Birthday Dates, Meet, Attendance, Photos, Calendar, Prayer, WhatsApp Group, YouTube Channel, Rules), notifications, leader badge, and background music.

The backend `registerAccount` function currently requires `#user` permission. Since brand-new users (Srida, Afira, and others) have no account yet, they are treated as guests and the permission check blocks them from creating an account. Registration fails silently for them.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `registerAccount` backend function: remove the `#user` permission check so that any guest can call it to create a new account. The phone-number duplicate check should still be enforced.

### Remove
- The `#user` authorization guard on `registerAccount` only

## Implementation Plan
1. Regenerate backend Motoko code with `registerAccount` open to all callers (no permission check), keeping all other functions unchanged.
2. All other backend functions remain identical.
3. Deploy.
