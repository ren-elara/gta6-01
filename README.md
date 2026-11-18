# Neon Harbor: Afterglow

![Competition](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/ren-elara/gta6-01/rank.svg)
![Reward](https://make.fun/badge/gta6-01/ren-elara/gta6-01/reward.svg)

A self-contained, top-down crime adventure set in an original coastal city. Meet Kira at the Blue Lantern, borrow the teal coupe, deliver a package, escape Bluewatch, and recover the signal at Cobalt Yard.

Built for [make.fun's open-world crime game competition](https://make.fun/c/gta6-01).

## Play offline

Install Node.js 22.18 or newer, then run `node serve.ts` from this repository. Open `http://localhost:8080` in desktop Chromium or Chrome. Use `node serve.ts --port 8081` to choose another port. Any static HTTP server rooted at `game/` also works. Use HTTP rather than opening the HTML as a file, because the game uses native JavaScript modules.

If your distribution disables Node's TypeScript support and reports `ERR_UNKNOWN_FILE_EXTENSION`, try `node --experimental-strip-types serve.ts` (and the same flag for `main.ts`). If it reports `ERR_NO_TYPESCRIPT`, use an official Node build with TypeScript support. Neither case requires a game build step.

There is no build step, package installation, CDN, external font, or downloaded asset. All visuals are drawn on Canvas; sound is synthesized with Web Audio. The three README badges are live website images; gameplay itself needs no internet connection.

## Controls

| Input | Action |
| --- | --- |
| Enter, Space, or left click | Start / restart from a menu |
| WASD or arrow keys | Walk; in a car W/S accelerate, brake and reverse, A/D steer |
| Shift | Sprint on foot |
| E or F | Enter the nearest car / exit your car |
| Mouse | Aim (cyan direction indicator) |
| Left click or Space | Fire; without mouse movement, fire in your facing direction |
| P or Escape | Pause / resume; Enter also resumes |
| L | Save locally during play, pause, or the completion screen |
| O | Load locally, including from the title and pause screens |
| M | Toggle synthesized sound |

Changing tabs or losing window focus pauses the game. Starting and resuming consume the triggering input so it does not accidentally fire a shot. Saves use this browser's local storage on the current server address; unavailable storage is reported in the HUD. Version 4 saves preserve the city seed, vehicles, pedestrians, mission and surviving guards across page reloads. Older, malformed, or obstructed saves are rejected without changing the current run. Completion automatically saves; start a new run from its menu with Enter, Space, or a click.

## Features and mission route

- A seeded 3,600 × 2,400 city with four districts, a waterfront, traffic, pedestrians, solid buildings, a following camera, and a minimap. Gold marks the current objective, cyan marks you, and coral marks pursuers. A gold direction arrow guides you toward distant objectives.
- Stealable vehicles with acceleration, braking, reverse, steering, and reliable entry/exit. On-foot sprinting and mouse-aimed combat also work from a vehicle.
- Vehicle theft and gunfire raise wanted heat. Bluewatch units pursue and attack; break their sight for nine seconds to lose them. Buildings block sight and bullets. The heat bar shows progress; nearby pedestrians flee trouble. A clinic recovery preserves your job and restarts a failed yard encounter.
- **Sunset Switch:** meet Kira at the opening position, drive to Sunline Market's gold marker, lose the patrol, and return to the Blue Lantern. The package pays $400 and the delivery pays $900.
- **Signal in the Rain:** travel to Cobalt Yard and defeat its three guards. Aim and hold fire while keeping your distance. Clearing them awards $1,500 and opens the chapter-complete screen, even if unrelated patrols are nearby.
- Procedural audio cues, persistent saves, a pause menu, readable mission objectives, and an accessible status announcement region.

## Captures and dossier

`shots.json` describes three moments captured during a live keyboard-and-mouse playthrough with city seed 7: the opening on foot, the package chase, and the yard encounter. `?seed=7` only seeds the city; it opens the normal playable title screen. There are no staged screenshot modes. `window.__neonHarbor()` returns a detached diagnostic snapshot for browser verification; it cannot modify the game.

The three JPEGs in `screenshots/` are unedited Chromium renders at 1280 × 720. Generate the submission artifact with:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies the static game and screenshots and writes `out/dossier.json` using the unchanged `vendor/makefun-game.ts`. The root entry and local server use only the Node standard library. The existing MIT license applies; see `LICENSE`.
