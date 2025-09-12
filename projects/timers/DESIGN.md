# DESIGN.md
This is the high level design of the timers app.

## Project Overview
This is an app to manage Eve Online structure timers. The app will contain the ability to sign in to your eve online account. Users will then be able to see their timerboards that they are a part of. Users can then view the upcoming timers, past timers, and add new timers. The app will need a postgres database with multiple tables as needed.

## Users
There will be the ability for users to sign in with their eve online character. This is the way a user will be able to authenticate as their user. 

Roles:
There will be a "site admin" role which gives you access to all timerboards on the site and the ability to create new timerboards and all below permissions and the ability to assign moderator roles to a user on a timerboard.
A "moderator" role which is specific to individual timerboards. If a user has a moderator role on a timerboard they can add users to the timerboard and delete timers.
A regular role which allows a user to see a specific timerboard and add timers.

# Timerboards
A timerboard will contain a list of upcoming timers from closest to happening to later.
A timerboard will look like this:
2025-09-13 22:42:48　Orbital Skyhook (VK-A5G [Cache] IV) [Fanatic HQ]
2025-09-13 17:30:39　Orbital Skyhook (VK-A5G [Cache] VIII) [Fanatic HQ]
2025-09-12 23:11:46　Orbital Skyhook (X1-IZ0 [Insmother] VIII) [GSF Logistics and Posting Reserves]
2025-09-12 22:44:47　Orbital Skyhook (8-SPNN [Cache] III) [Fanatic HQ]
2025-09-12 03:27:00　RV5-TT [Cache] - Bravo - RV5-TT [Cache] [Horde][Astrahus][ARMOR]

Except it should be ordered from closest to happening to later happening. Additionally it should list how long till the timer is active (example: "33 minutes from now"). All times on this site are in UTC and local time should not appear anywhere.

There should be a place to view the past timers from most recently passed to later passed.
There should be a place to add notes to a timer.
A timer should indicate who added it.
A moderator should have the ability to delete a timer (DONT add it to past timers).
Eve Online ESI https://developers.eveonline.com/api-explorer should be used to determine what region a system is in. For example the system 8-SPNN belongs to Cache.

There should be a moderator only page for each board. It should give the ability for moderators to add user names to the board so that users can see it and also add new moderators. Additionally it should have a log of who added timers and when and who deleted timers and when and statistics on who has added what timers each month and the structures each timer has added.
Only a admin can create a timerboard.

# Types of Timers
These are the following types of timers which are needed when displaying information and adding timers. NOTE that any distances you see from the in game copy pastes such as "69 km" and "1,595 m" are not relevant and should not be stored anywhere.

## Orbital Skyhook:
These are added by simply pasting the following from in game:
"
Orbital Skyhook (F2OY-X IV) [Brave Holdings]
69 km
Reinforced until 2025.05.04 20:23:01
"

In this example, F2OY-X is the system and IV is the planet the skyhook is on. Brave Holdings is the owner.
Once the timer happens, the timer should stay active for a 15 minute repair stage. That is for 15 mins from 20:23:01 the timer should say "Active Now". After which the timer should be moved to past timers.

## Jump Bridge
These are added by pasting the following from in game AND asking the user for the owner of the jump bridge.
"
EFM-C4 » C-J6MT - Eye Of Terror Mk.VIII
1,595 m
Reinforced until 2025.08.26 19:16:49
"
EFM-C4 is the system where the structure is because it's the first system in the name. The second system is where the Jump Bridge is attatched to but that is not relevant. Eye Of Terror Mk.VIII is the name of the ansiblex.  The user will provide the owner of the ansiblex.
Once the timer happens, the timer should stay active for 30 minutes. That is for 30 mins from 20:23:01 the timer should say "Active Now". A jump bridge can be manually repaired so a user should have the ability to click "Repaired" button (ONLY AFTER the timer has come out) which immediately sends the timer to the past timers.

## Mercenary Den
Once the user specifies they are adding a mercenary den, they can copy paste the below timer and NOTE that it does not look like the other copy pastes. It should then ask the user for the system and planet the mercenary den is on, such as F2OY-X IV where F2OY-X and IV is the planet.
It should then ask the user for the owner of the structure.
"
2025.08.26 19:16:49
"
Once the timer happens, the timer should stay active for 30 minutes. That is for 30 mins from 20:23:01 the timer should say "Active Now". A mercenary den can be manually repaired so a user should have the ability to click "Repaired" button (ONLY AFTER the timer has come out) which immediately sends the timer to the past timers.

## Metenox
Once the user indicated a structure is a metenox. These are added by simply pasting the following from in game. It should then ask the user for the owner of the structure.
"
L-FVHR - Military Parade S
3,714 km
Reinforced until 2025.08.24 19:25:45
"

## Other Structures
These require the user to specify if the structure is the following:
- Astrahus
- Athanor
- Tatara
- Fortizar
- Azbel
- Sotiyo
- Keepstar

It will then ask the user to specify the LAYER of the structure:
- Anchoring
- Armor
- Hull

It will then ask for the owner of the structure.

It will then ask the user for the in game copy paste which looks like this:
"
Y-MPWL - Road of Military Parade S
3,714 km
Reinforced until 2025.08.24 19:25:45
"
"
RT64-C - Borderpatrol Omega
174 km
Reinforced until 2025.08.14 17:07:35
"

RT64-C is the system where the structure is located. Borderpatrol Omega is the name of the structure. The timer should stay active for a 15 minute repair stage. That is for 15 mins from 17:07:35 the timer should say "Active Now". After which the timer should be moved to past timers.

## Sovereignty Campaigns
Under manage board for a board, moderators should be able to add region names where we want to track sovereignty campaigns for that region on the timerboard. 


Read this link to see a Eve online ESI for sovereignty campaign:
https://developers.eveonline.com/api-explorer#/operations/GetSovereigntyCampaigns

● The API returns an array of active sovereignty campaigns in EVE Online. Here's what the        
  current data shows:

  Active Campaigns (10 total):
  - All are "ihub_defense" event types (Infrastructure Hub defense campaigns)
  - Campaign IDs range from 108372-108381
  - All show 0.4 attackers_score vs 0.6 defender_score (defenders currently winning)
  - Start times span from today (2025-09-12) through tomorrow (2025-09-13)
  - Various solar systems and constellations across different regions
  - Different defending alliance IDs (99012786, 99012042, 99002003, 1354830081)

  Key fields returned:
  - campaign_id: Unique identifier for each campaign
  - attackers_score/defender_score: Current progress (0.0-1.0 scale)
  - event_type: Type of sovereignty event
  - solar_system_id: Where the campaign is taking place
  - constellation_id: Constellation containing the system
  - defender_id: Alliance ID of the defending party
  - structure_id: Specific structure being contested
  - start_time: When the campaign began (ISO 8601 format)

Read this link to see how to resolve the ids to names:
https://developers.eveonline.com/api-explorer#/operations/PostUniverseNames

On the timerboard for regions which we care about, we need to list the sovereignty campaigns, including the current scores if the campaign is active.
