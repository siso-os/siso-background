# v2 ideas

Everything v1 built, everything the owner said on 20 Nov 2026, and what follows from it. Each idea says whether it
needs images (a batch) or code. The batches hold 640 images.

## 1. Story mode: the owner's loop

The owner: "you're scrolling across to see the whole cities and then you go to the end, chill for a bit, got a nice
city tower, whatever, then an attack, then a rebuild maybe, and then like a hellfire missile swarm on the cities, and
then like launch, shoot down enemy island, and then shoot a rocket and it goes all the way up and you follow the
rocket, and then it blows up some shit, and then them guys start shooting the big tower, and then the big tower
hellfire swarms them, and then the islands start falling back onto the city, and smoke, city back on the floor, and
then the buildings respawn, and they shoot some stuff, and then you go across to that tower, tower hellfire, back in
a loop."

Story mode is a director: one camera path and one event list that loop, about four minutes long. The free scene
(scroll, climb, events at random) stays as it is; the story is a mode beside it. It also becomes the loop that plays
behind T3 (section 9).

| # | Beat | Camera | Images | Code (exists in v1 / new) |
|---|---|---|---|---|
| 1 | Pan across the whole city | slow sideways pan, low | 03 buildings, 04 strips and foregrounds | pan path (new) |
| 2 | Chill at the SISO Tower | settles on the tower, light drifts to golden | 01 tower, home isle | idle life (v1) |
| 3 | Attack on the city | holds, slight shake on hits | 02 forts, 07 missiles, 03 ruins | raid, barrage (v1) |
| 4 | Rebuild | holds | 03 rebuild frames | rebuild with cranes (new) |
| 5 | Hellfire swarm on the enemy cities | pans right to the enemy shore | 04 enemy shore | hellfire (v1) |
| 6 | Launch, shoot down an enemy island | follows the jets | 06 jet frames, 02 falling fort | dogfight, island-fall (v1, now with the new jet) |
| 7 | Rocket launch, follow it up | climbs with the rocket into space | 01 launch isle, 06 rocket, 08 Earth plates | follow-cam (new) |
| 8 | Rocket blows up the enemy orbital fortress | holds in orbit | 08 fortress and its hit frame | orbital strike (new) |
| 9 | They shoot the big tower | drops back to the tower | 02 artillery, sky-barge | barrage on the shield (v1) |
| 10 | The tower's hellfire swarm answers | holds on the tower | 01 tower with open bays | tower swarm (new) |
| 11 | Islands fall onto the city | follows the falling islands down | 02 falling and wrecked forts | island-fall onto land (new) |
| 12 | Smoke; the city on the floor | holds, smoke drifts | 03 ruins, 09 smoke | ruin state (new) |
| 13 | Buildings respawn | holds | 03 rebuild frames | regrow (new) |
| 14 | They shoot some more | short pan | 07 enemy aircraft | patrol, flyby (v1) |
| 15 | Across to the tower; tower hellfire; loop | pans to the tower | 10 victory keyframe | loop seam (new) |

Batch 10 has one keyframe plate per beat (`b10-s01-pan` … `b10-s15-victory`): the target each beat is built to.

## 2. Control and interaction

- **An event bar at the bottom.** The owner: "compress all the edge cases ... maybe a slider at the bottom shows it ...
  it needs to be happening on the screen". It's a timeline of the story's beats plus the free events: click one and
  the camera goes there and plays it. The free world gets shorter, so something is always on screen. (code)
- **Controls.** Fire the gun pod, raise the shield, call a hellfire swarm, launch a rocket, go hypersonic, and switch
  between day, dusk and night. The keys keep Shift+A/D/W/S for the camera. (code)
- **Climb.** Climbing from sea to orbit uses the new Earth plates for each altitude (08), not the drawn limb the owner
  called "kind of shit". (images + code)
- **Go inside the palace.** Click the space palace and the camera flies in through the hangar doors to the interior
  plates (08: great hall, throne, observation deck, hangar, atrium, reactor, bridge). (images + code)

## 3. Places, mixed and matched

The owner: "not always water in front, mix and match". The world becomes a row of regions, each with a skyline strip,
a foreground and a landscape, in any mix: downtown behind a rooftop; the old town behind a cliff; the desert city
behind red rocks; the arctic town behind a snow ridge; the resort behind palms; the port behind a rail yard; the SISO
district behind the carrier deck. (04, 05)

## 4. The air war

- **The SISO Tomahawk** (06): a new hero jet with 12 roll frames, pitch frames, a four-frame gun pod that drops from
  the belly and fires, hypersonic frames with heat glow and a vapour cone, and missile drops. It always beats the Brute.
- **The Brute** (07): the enemy fighter, with hit and broken-in-half frames.
- Wingman drones, a bomber, a gunship, the frigate, the airship and the tanker for refuelling scenes. (06)
- Enemy bombers, gunships and a war zeppelin. (07)

## 5. The sea

- Real boats cut at the waterline: 15 kinds, day and night. (07)
- Wakes drawn in code from real foam sprites (07 bow splash and stern churn), so they stop "looking like smoke".
- A whale breach, a dolphin arc, gulls with two wing frames. (07)
- Fixes in code: the sun glint on the water (laggy), the moon's reflection (weird), the wakes.

## 6. Space

The palace inside and out, a hit state and a docking shuttle; the Moon in four phases; the moon city; the station;
satellites including a SISO one; enemy attack ships, a cruiser and the orbital fortress; asteroids, and the space
elevator climber. (08)

## 7. Aliens

The craft, mothership, hive island, wreck, drifter (three bell frames), flyer (three wing frames), walker (four stride
frames) and the portal in four stages, plus a portal rising from the sea. (09)

## 8. The SISO lion everywhere

The owner: "show the SISO logo and the shield more often". The lion on a metal badge, a hologram, neon, a billboard,
a blimp, a tail fin, two crests, a statue, the HQ gate, a towed banner, a drone show, a mural and a pennant, plus
giant rooftop and hillside letters and a four-frame waving flag. The shield dome flashes the lion crest when hit. (10)

## 9. Behind T3 and on the desktop

- **What T3 allows.** A T3 theme is one image of up to 16 MB plus up to 100,000 characters of CSS, and it can't run
  scripts. A `t3 theme set` call swaps it live. So the live engine can't run inside T3; a rendered loop can.
- **The story loop for T3.** Render Story mode into frames, ship it as the theme's image and CSS, and swap chapters
  with `t3 theme set`. (code)
- **Agent events drive the scene.** Anything can call `t3 theme set`, including an agent hook: a finished task sets
  off fireworks, a failed check sets off a raid. (code)
- **The scene reacts to T3 itself, with no hooks.** CSS `:has()` can see T3's own labels (a thread row that says
  Working), so jets can scramble while an agent works. CSS scroll timelines may let the camera follow the chat's scroll,
  so scrolling up climbs toward space. (code; neither is tested in T3 yet)
- **The Omarchy desktop.** The live page as a wallpaper, interactive when no window covers it. (code)

## 10. Weather and nature

Real cloud sprites in place of the drawn cloud bank (the owner: it "lets it down a bit"), storm towers with forked
lightning, cirrus, an erupting volcano, a calving glacier, a sea arch. Aurora and meteor showers stay in code. (05, 09)
