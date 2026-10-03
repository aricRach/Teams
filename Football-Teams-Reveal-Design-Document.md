# Football Teams Reveal Experience - Design Document

## Goal

Create a shareable public page that reveals the teams for an upcoming football match in a premium broadcast-style experience.

The page should feel similar to a Premier League lineup reveal, EA FC presentation, or sports TV graphics.

Users will receive a URL in WhatsApp and open it on mobile.

Example:

```text
https://app.com/match/123/reveal
```

The experience should be optimized primarily for mobile devices.

---

# Main User Flow

## 1. Loading Screen

Duration: 1-2 seconds

Display:

```text
⚽ Friday Match

20 Players
3 Teams

Loading Teams...
```

Background:
- Dark football-themed design
- Subtle animated particles
- Smooth fade-in animation

---

## 2. Match Introduction

Display:

```text
Friday Night Football

25 July 2026
20:00

20 Players
3 Teams
```

Animation:
- Slide in from bottom
- Scale animation
- Fade transition to next section

Duration: 3 seconds

---

## 3. Team Reveal

Reveal teams one by one.

### Team Card Layout

```text
━━━━━━━━━━━━━━━━━━

TEAM A

Overall Rating: 84

Players

⭐ Aric
David
Moshe
Nir
Yossi
Avi

━━━━━━━━━━━━━━━━━━
```

### Animation Sequence

1. Team title appears.
2. Team rating counts up from 0.
3. Players appear one by one.
4. Star player receives special highlight.
5. Pause.
6. Move to next team.

Duration per team: 5-8 seconds

---

## 4. Team Statistics Comparison

Display all teams together.

```text
TEAM A    84

TEAM B    82

TEAM C    83
```

Visual:
- Horizontal rating bars
- Animated fill effect

---

## 5. Team Insights

Examples:

```text
Strongest Team
TEAM A

Best Attack
TEAM C

Best Defense
TEAM B
```

---

## 6. Match Prediction

```text
Who Will Win Tonight?
```

```text
TEAM A
45%

TEAM B
30%

TEAM C
25%
```

---

## 7. Player Spotlight

```text
⭐ Star Player

Aric

Rating 92
12 Goals
5 MVP Awards
```

---

## 8. Final Screen

```text
Game Starts In

03:42:12
```

or

```text
See You On The Pitch ⚽
```

---

# Visual Style

## Theme

Modern sports broadcast graphics.

References:
- Premier League
- Champions League
- EA FC Ultimate Team
- Sky Sports

## Colors

Primary: `#00E5FF`
Secondary: `#1E1E1E`
Accent: `#FFD700`
Background: `#0B0B0B`

## Typography

Use:
- Inter
- Poppins

---

# Mobile Requirements

Target:
- 360px - 480px width

Requirements:
- Fit on mobile screens
- No horizontal scrolling
- Fast loading

---

# Technical Requirements

Framework:
- Angular 20+

Use:
- Signals
- Standalone Components
- New Angular Control Flow (@if, @for)
- OnPush Change Detection
- Lazy Loading

Avoid:
- NgIf
- NgFor
- RxJS where signals are sufficient

---

# Route Structure

```text
/reveal/:matchId
```

Example:

```text
/reveal/abc123
```

---

# Data Model

```ts
interface TeamReveal {
  matchId: string;
  matchDate: Timestamp;
  teams: Team[];
}

interface Team {
  id: string;
  name: string;
  rating: number;
  winProbability?: number;
  players: TeamPlayer[];
}

interface TeamPlayer {
  id: string;
  name: string;
  photoUrl?: string;
  rating?: number;
  isStarPlayer?: boolean;
}
```

---

# Future Enhancements

## Version 2

- Background music
- Voice-over
- Auto-generated video
- Share to Instagram Story
- MVP prediction
- Head-to-head statistics
- Live countdown

---

# Success Criteria

1. User shares a single link in WhatsApp.
2. Friends open the link on mobile.
3. Teams are revealed with engaging animations.
4. Experience feels like a professional football broadcast.
5. Page loads in under 2 seconds.
6. Users stay on the page until the final screen.
