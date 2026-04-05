# We are friends

## Current State
The app currently shows a `MahavirGreetingScreen` (using `pesaha.jpg`) for 2 seconds after the splash screen for ALL users every time they open the app. The background is a red/blue space theme with planets and rocket on all pages.

## Requested Changes (Diff)

### Add
- Easter greeting screen that plays the uploaded Easter video (`easter-video.mp4`)
- One-time-per-person logic: each user sees the Easter greeting only once (tracked via `localStorage` using a key like `waf_easter_2026_seen_{userId}`)
- Easter egg background theme: colorful Easter egg decorations scattered across the background on all pages (alongside or replacing the space theme)

### Modify
- `MahavirGreetingScreen`: rename/repurpose to `EasterGreetingScreen`, swap `pesaha.jpg` with the Easter video
- Greeting trigger logic: instead of showing every time, check `localStorage` to only show the first time per user; after seeing it once, never show again
- Background: add colorful Easter egg decorations (pastel colors: pink, yellow, green, purple) on all pages

### Remove
- `pesaha.jpg` reference from greeting screen
- "Show every time" behavior for the current greeting

## Implementation Plan
1. Add `EasterGreetingScreen` component that plays the Easter video fullscreen and calls `onComplete` when video ends or after 5 seconds
2. Add `localStorage` check: key `waf_easter_2026_seen` -- if set, skip greeting; if not set, show greeting and mark as seen after completion
3. Update splash screen `onComplete` handler to check this key before deciding whether to show easter greeting
4. Update background CSS/component to add colorful Easter egg decorations (CSS-drawn or emoji-based eggs scattered across all pages)
5. Remove pesaha.jpg reference
