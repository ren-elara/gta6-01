# Neon Harbor: Afterglow

![Competition](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/ren-elara/gta6-01/rank.svg)
![Reward](https://make.fun/badge/gta6-01/ren-elara/gta6-01/reward.svg)

A self-contained, top-down crime adventure set in an original coastal city. Meet Kira at the Blue Lantern, borrow the teal coupe, deliver a package, escape Bluewatch, and recover the signal at Cobalt Yard. The Harbor Courier Exchange adds four optional timed routes, express payouts, and saved personal bests across all four districts.

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
| H | Open the mission briefing without advancing the city simulation |
| C | Open / close the paused courier exchange, including from the story briefing |
| 1–4 or up/down arrows | Select a courier route while the exchange is open; clicking a route also selects it |
| Enter / accept button | Accept the selected route, or return to an active route |
| G | Collect / deliver a parcel within 100 m of its violet depot; slow below about 22 km/h in a car |
| X / cancel button | Cancel the active contract from the exchange; no fee or story reset |
| R | Toggle reduced-motion camera and marker effects |

Changing tabs or losing window focus pauses the game and silences the motor and queued effects. Starting, resuming, and courier menu clicks consume their input so they do not fire a shot. The courier exchange, story briefing, pause and completion screens freeze simulation time. Closing a menu after focus loss returns to pause.

Saves use this browser's local storage on the current server address; unavailable storage is reported in the HUD. Version 5 saves preserve the seed, vehicles, pedestrians, story, guards, active contract clock, last courier result, and route records. Existing version 4 saves load with an empty courier ledger. Malformed, oversized, incompatible, or obstructed saves are rejected before replacing the live world. Acceptance, handoffs, cancellation, expiry and chapter completion save automatically. A fresh chapter keeps validated courier records from the saved run; chapter restart resets cash and story. O explicitly restores the complete saved run.

## Features and mission route

- A seeded 3,600 × 2,400 city with four districts, a waterfront, traffic, pedestrians, solid buildings, a following camera, and a minimap. Gold marks the current objective, cyan marks you, and coral marks pursuers. A gold direction arrow guides you toward distant objectives.
- Stealable vehicles with acceleration, braking, reverse, steering, a nearby-car prompt, speed-aware synthesized engine audio, and reliable entry/exit. On-foot sprinting and mouse-aimed combat also work from a vehicle.
- Vehicle theft and gunfire raise wanted heat. Bluewatch units pursue and attack; the HUD distinguishes a spotted chase from a search and counts the escape timer. Break their sight for nine seconds to lose them. Buildings block sight and bullets. Nearby pedestrians flee trouble. A clinic recovery preserves your job and restarts a failed yard encounter.
- **Sunset Switch:** meet Kira at the opening position, drive to Sunline Market's gold marker, lose the patrol, and return to the Blue Lantern. The package pays $400 and the delivery pays $900.
- **Signal in the Rain:** travel to Cobalt Yard and defeat its three guards. Aim and hold fire while keeping your distance. Clearing them awards $1,500 and opens the chapter-complete screen, even if unrelated patrols are nearby.
- Procedural action, impact, escape, save, and engine audio; persistent saves; a pause menu; and a full-screen mission briefing that freezes the simulation.
- Reduced-motion mode, health meter, hit confirmation, brief collision feedback, district-change cues, and an accessible status announcement region.

## Harbor Courier Exchange

Press C during play or from the briefing to choose any route. Selection takes no game time; accepting starts the clock immediately, including the trip to pickup. The violet marker, bearing arrow, HUD and minimap show your current depot and distance. The gold story objective stays visible. Reach pickup and press G, then reach the destination and press G again. Both walking and driving work; a fast drive-through cannot complete a handoff.

| Contract | District route | Deadline | Base pay | Express target |
| --- | --- | --- | --- | --- |
| Lantern Plates | Marina Azul → Crescent Heights | 75 s | $240 | 30 s |
| Rooftop Seeds | Crescent Heights → Sunline Market | 100 s | $320 | 42 s |
| Copper After Dark | Sunline Market → Cobalt Yard | 120 s | $400 | 50 s |
| The Tide Tapes | Cobalt Yard → Marina Azul | 150 s | $520 | 68 s |

Deliver at or before the express target for an extra $100. Time is counted in fixed 1/60-second simulation ticks; tab changes and menus never consume the deadline. The clock expires at the deadline. Missing it, visiting the clinic, or cancelling earns nothing and charges nothing; choose the route again to retry. A successful handoff pays once, reports its time and reward, increments the completion count, and updates the fastest time. Connecting all four routes earns the City Connector ledger title. Routes remain replayable.

Route cards give street directions along existing roads. The depot layout does not depend on random building placement. Courier work can run alongside either story mission without changing story steps. Finishing Signal in the Rain closes an unfinished contract with no payout; C still opens the records on the completion screen, and restarting the chapter enables routes again.

## Captures and dossier

`shots.json` describes four fresh moments captured during a live keyboard-and-mouse playthrough with city seed 7: the opening on foot, the package chase, the yard encounter, and an active Lantern Plates courier pickup. `?seed=7` only seeds the city; it opens the normal playable title screen. Seeds must be unsigned decimal integers from 0 through 4294967295; invalid or longer inputs choose an ordinary random city. There are no staged screenshot modes. `window.__neonHarbor()` returns a detached diagnostic snapshot for browser verification, including contracts and presentation preferences; it cannot modify the game.

The four JPEGs in `screenshots/` are unedited Chromium renders at 1280 × 720. Generate the submission artifact with:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This validates the inputs before replacing generated output, copies the static game and captures, and writes `out/dossier.json` using the unchanged `vendor/makefun-game.ts`. It also works in a submission checkout without Git or claim metadata. Source directories, source ancestors, and output aliases into source are refused. Repeated builds with unchanged inputs produce identical dossier bytes.

Run `node verify.mjs` for deterministic city, story, pursuit, driving, courier lifecycle, safe route corridors, payouts, save migration and invalid-save checks. `node verify-audio.mjs` checks gesture, mute and pause behavior with a Web Audio test double. `node verify-platform.mjs` uses a TypeScript-capable runtime to check a metadata-free build, alias protection, dossier parity and HTTP GET/HEAD, malformed URLs, MIME, symlinks and stream disconnects. These checks use only the Node standard library; gameplay still has no dependencies or build step. The existing MIT license applies; see `LICENSE`.

The local checks cannot validate recorded authorship or sealed-recording eligibility. The supervising session handles recording review and submission.
