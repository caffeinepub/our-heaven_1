# Our Heaven

## Current State
The app has 23+ feature boxes organized in sections (Community, Learning, Activities, People, Settings) on a 4-column grid homepage with a 3D starfield background. The Learning section contains: Quiz Box, School Works, Home Works, Time Table, Dates & Calendar, Attendance & Level.

## Requested Changes (Diff)

### Add
- New AI chat box named **"Luttapi"** in the Learning section
- Chat-style UI where all members can type any question and receive an AI-generated answer
- Uses free public AI API (Pollinations AI text API - no key required) to answer questions
- Shows a loading indicator while waiting for response
- Chat history displayed in the session (not persisted to backend)
- "Luttapi" branded header with a Bot/Sparkles icon

### Modify
- Learning section: add Luttapi box item
- Screen type union: add `"luttapi"` screen
- Import a suitable icon (Bot or Sparkles) from lucide-react

### Remove
- Nothing removed

## Implementation Plan
1. Add `"luttapi"` to the Screen type
2. Import Bot (or Sparkles) icon from lucide-react
3. Add Luttapi box to the Learning section items array
4. Create LuttapiScreen component with a chat UI that calls Pollinations AI text API (`https://text.pollinations.ai/`) for free AI responses
5. Wire up the screen in the navigation renderer
