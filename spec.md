# Our Heaven

## Current State
The app has 17+ feature boxes on the homepage. Screen type and home boxes array are in App.tsx. Rules is 1st, Quiz is 2nd. No Games box exists.

## Requested Changes (Diff)

### Add
- `"games"` to the Screen type union
- Games box as 3rd item in home boxes (after Rules and Quiz)
- `GamesScreen` component with SOS, Tic-Tac-Toe, Memory Match, Number Puzzle

### Modify
- Screen type, homeBoxes array, app render switch

### Remove
- Nothing

## Implementation Plan
1. Add `"games"` to Screen type
2. Insert Games box at index 2 in homeBoxes
3. Implement GamesScreen with game menu and 4 mini-games
4. Wire navigation in render block
