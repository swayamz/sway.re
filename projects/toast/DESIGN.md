# DESIGN.md
This is the high level design of the timers app.

## Project Overview
This is an app to manage entosis notifications in Eve Online.

## Users
There will be the ability for users to sign in with their eve online character. This is the way a user will be able to authenticate as their user.

## Adding entosis events
A user can import entosis by copy pasting a dump from their mail. There should be button and dialog to add timers where the user is prompted to "Ctrl A" all the mails from their Sovereignty mail

	Pandemic Horde Inc.	Sovereignty Hub in RZ8A-P is being captured	2025.10.03 00:57
	Pandemic Horde Inc.	Sovereignty Hub in MTO2-2 is being captured	2025.10.03 00:55
	Pandemic Horde	Sovereignty hub in VJ-NQP has entered reinforced mode	2025.10.03 00:39
	Pandemic Horde	Sovereignty hub in RFGW-V has entered reinforced mode	2025.10.03 00:39
	Pandemic Horde Inc.	Sovereignty Hub in JE1-36 is being captured	2025.10.03 00:21
	Pandemic Horde Inc.	Sovereignty Hub in 1-BK1Q is being captured	2025.10.03 00:08
	Pandemic Horde Inc.	Sovereignty Hub in 1P-QWR is being captured	2025.10.03 00:08
	Pandemic Horde Inc.	Sovereignty Hub in O5-YNW is being captured	2025.10.03 00:08
	Pandemic Horde Inc.	Sovereignty Hub in 04-LQM is being captured	2025.10.03 00:05
	Pandemic Horde Inc.	Sovereignty Hub in F-5WYK is being captured	2025.10.03 00:01
	Pandemic Horde Inc.	Sovereignty Hub in DN58-U is being captured	2025.10.03 00:01
	Pandemic Horde Inc.	Sovereignty Hub in FZCR-3 is being captured	2025.10.03 00:01
	Pandemic Horde Inc.	Sovereignty Hub in UJXC-B is being captured	2025.10.03 00:01

We only care about these notifications "Sovereignty Hub in UJXC-B is being captured	2025.10.03 00:01"

Parse these notifications and store them in the database. Multiple users can and will import the same notifications, we simply ignore if it's the same notification already in the database.

We also should store a reinforcement notification, "Sovereignty hub in VJ-NQP has entered reinforced mode" as we will use that to automatically move events in the main ui from their current state to REINFORCED. See the next section for details.

## Main UI

We should list entosis events from newest to oldest like so:

SYSTEM [Region] [STATUS] TimeSinceBeingCaptured TravelingButton ClearButton ResetButton

Only show entosis events that are 6 hours old or newer.

EXAMPLE:
UJXC-B [The Kalevala Expanse] [Being Captured!] 5m ago TravelingButton ClearedButton ResetButton
UJXC-B [The Kalevala Expanse] [On the way] 5m ago TravelingButton ClearedButton ResetButton  Sway Re is on the way
UJXC-B [The Kalevala Expanse] [Cleared] 10m ago TravelingButton ClearedButton ResetButton Sway Re marked as cleared
UJXC-B [The Kalevala Expanse] [Reset] 25m ago TravelingButton ClearedButton ResetButton Sway Re marked as reset
VJ-NQP [Geminate] [REINFORCED] 1h ago

## EVE ONLINE ESI

We will need the ESI to determine what region a system is in and more in the future. Use timers app as a reference.