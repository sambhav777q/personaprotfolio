# Persona 5 Style Portfolio — Sambhav Giri

A Persona 5 menu-inspired interactive portfolio web application structured using Model–View–Controller (MVC).

## Structure

```
├── index.html            View skeleton — markup only, no inline logic
├── css/
│   └── style.css         All styling (theme colors in :root, animations, ransomware typography)
├── js/
│   ├── model.js          DATA — projects, skills, GitHub API fetch, app state
│   ├── view.js           DOM — rendering, ransom lettering, wipe transition, animated cursor, sound
│   └── controller.js     EVENTS — keyboard/mouse navigation, contact form submission
└── assets/
    ├── sfx/select.mp3    Menu sound effect (plays on selection/confirm)
    ├── cursors/          Animated cursor sprite strips (normal.png, link.png)
    ├── menus/            Per-screen background artwork (home.jpg, skills.jpg, about.jpg, contact.jpg)
    ├── hero.png          Hero character art (Morgana)
    └── me.png            Profile photo for the About polaroid
```

## Features

- **Iconic Persona 5 Visual Style**: Bold angled geometric layouts, dynamic rotating stars, halftone patterns, and high-contrast red/black/white palettes.
- **Ransom-Note Lettering**: Dynamically generated tilted letter blocks with pseudo-random styling.
- **Screen Transitions**: Triple-pane angled wipe with screen flash.
- **Sprite-Strip Animated Cursor**: 30-frame custom animated cursor mimicking the Persona 5 game cursor.
- **Audio Feedback**: Authentic menu audio playback on navigation and selection.
- **GitHub Live API**: Automatically pulls public repositories from `sambhav777q` while highlighting featured work (RemotePlay, Persona 5 Portfolio, TaskMaster, Portfolio v1).
- **Interactive Contact Form**: Direct message relay with local backend and email fallback.

## Controls

- **↑ / ↓**: Navigate menu items
- **Enter**: Confirm / Enter section
- **Esc**: Return to Home Menu
- **Click Name**: Jump back to Home Menu

## Local Development

```bash
# Using Python
python -m http.server 8080

# Or using Node.js
npm start
```
Open [http://localhost:8080](http://localhost:8080) in your browser.
