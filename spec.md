# Our Heaven

## Current State
The app stores media messages (photos, videos, voice) in localStorage as data URLs or blob URLs. localStorage has a ~5MB limit and blob URLs are ephemeral (lost on page reload). The microphone recording produces a blob URL which disappears on reload. There are also microphone access issues on some Android/browser setups.

## Requested Changes (Diff)

### Add
- IndexedDB utility module for persisting media message content (photos, videos, voice audio as ArrayBuffer/base64)
- Media loading from IndexedDB on component mount for both private chat (ChatWithFriends) and group chat

### Modify
- `handleMediaSend` in ChatWithFriends: convert media content to base64 data URL before storing; save to IndexedDB keyed by message id; load back from IndexedDB on mount
- `handleMediaSend` in GroupChat: same IndexedDB persistence
- Voice recording in `VoiceRecorder`/`MediaAttachment`: after recording stops, convert blob to base64 data URL instead of blob URL so it persists across reloads
- Microphone permission request: improve error handling for Android Chrome and Firefox; always re-request if previous state is unknown; catch NotAllowedError, NotFoundError, NotReadableError with specific user-friendly messages
- Media message rendering: fall back gracefully if IndexedDB content not found (show placeholder)

### Remove
- localStorage-based media message persistence (replace with IndexedDB)

## Implementation Plan
1. Create `src/frontend/src/mediaDB.ts` - IndexedDB wrapper with `saveMedia(id, dataUrl)`, `loadMedia(id)`, `loadAllMedia(prefix)`, `deleteMedia(id)` functions
2. Update voice recording: convert blob to base64 data URL using FileReader before calling onMediaSend
3. Update ChatWithFriends `handleMediaSend`: save media to IndexedDB, store message with data URL content
4. Update ChatWithFriends mount: load media from IndexedDB for the current chat key
5. Update GroupChat `handleMediaSend` and mount similarly
6. Update microphone permission error handling for better device compatibility
7. Remove localStorage media persistence code
