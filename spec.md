# Our Heaven

## Current State
- App has 22+ feature boxes in a 4-column grid with section headers (Community, Learning, Activities, People, Settings)
- Community section includes Messages, Group Chat, Your Ideas, Notifications, Important Messages, WhatsApp Group
- People section includes Rules, Birthday Dates, Star of the Month, Meet, Calling
- Microphone code exists (useVoiceRecorder) but browser permissions policy may block it
- getAllAccounts() backend function exists returning all Account records with firstName, lastName, phone fields

## Requested Changes (Diff)

### Add
- **All Persons box** in the Community section (first section): shows all registered members' full name and phone number pulled from getAllAccounts()
- **WhatsApp-style bottom tab bar** inside the Messages/chat boxes: 4 tabs — Chats (Messages), Updates (Notifications), Groups (Group Chat), Calls (Calling) — with yellow/gold active pill highlight and unread badge counts on relevant tabs
- **Microphone permissions policy** in index.html to allow microphone access in the web app

### Modify
- Community section: add All Persons box item
- App routing: Messages/Group Chat/Calling boxes navigated from the new tab bar
- index.html: add `<meta>` or `allow` attribute for microphone

### Remove
- Nothing

## Implementation Plan
1. Add `<meta http-equiv="Permissions-Policy" content="microphone=*">` to index.html to enable mic
2. Create AllPersonsScreen component that calls actor.getAllAccounts() and displays name + phone for each
3. Add 'all-persons' screen/route and add the box to the Community section items list
4. Create a MessagingHub component with a WhatsApp-style bottom tab bar (4 tabs: Chats, Updates, Groups, Calls) in yellow/gold theme with badge counts, that renders the appropriate sub-screen based on active tab
5. Wire the Messages box to open MessagingHub instead of MessagesScreen directly
