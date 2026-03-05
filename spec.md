# Our Heaven

## Current State
Full-stack app with splash, registration, home screen, and 16+ feature boxes. Backend in Motoko with authorization. Frontend in React/TypeScript. Messages sending currently requires `#user` permission which can block some users.

## Requested Changes (Diff)

### Add
- Settings box as the **last box** in the homepage feature boxes list (after all existing boxes)
- Settings icon button in the **top left corner** of the homepage header (gear icon)
- Both the icon and the box open the same **half-page slide-up Sheet panel** (bottom sheet covering ~50% of screen)
- Settings panel contents:
  - Edit Profile (opens existing edit account dialog)
  - Change Password field
  - Log Out button (clears localStorage and returns to splash/welcome)
  - Notifications toggle (on/off)

### Modify
- Fix `sendMessage` calls in MessagesScreen, GroupChatScreen: remove the `!actor` guard from the send button disabled state so all users can send messages freely. The send button should only be disabled when input is empty or sending is in progress.
- Add `"settings"` to the `Screen` type
- Add Settings icon (Settings/Gear icon from lucide-react) to imports

### Remove
- Nothing removed

## Implementation Plan
1. Add `Settings` to lucide-react imports
2. Add `"settings"` to Screen type (or handle settings as a sheet overlay, not a screen)
3. Add `settingsOpen` state to HomeScreen
4. Add Settings gear icon button to top-left of homepage header
5. Add Sheet component (half-page bottom sheet) for settings panel with: Edit Profile trigger, Change Password, Log Out, Notifications toggle
6. Add Settings box as last item in `featureBoxes` array in HomeScreen
7. Fix send button disabled condition in MessagesScreen and GroupChatScreen to only check `!input.trim() || sending`
8. Wire Log Out to clear localStorage and navigate to "welcome" screen
