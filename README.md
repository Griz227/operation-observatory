# operation-observatory
README.md

Mission Statement:
Observatory is a self-hosted dashboard that helps me understand my home, property, infrastructure, and environment through one beautiful interface.

Four Pillars:
🏡 Home

What's happening around my home?

Examples:

Weather
Cameras
Sunrise / sunset
Air quality
Power outages (later)
Internet status
🖥 Infrastructure

How is my homelab doing?

Examples:

Proxmox health
Raspberry Pi status
Docker containers
Disk usage
CPU
Memory
Pi-hole stats
🌿 Nature

This is what makes the project uniquely yours.

Examples:

Bird sightings
Wildlife observations
Plants
Seasonal changes
Rainfall
Temperature history

I wouldn't be surprised if this eventually became your favorite section.

📈 History

This answers:

"How has this changed over time?"

Examples:

Rain this month
Bird sightings by season
Server uptime
Camera events
Temperature trends

History is what turns a dashboard into something you actually learn from.

		  
		  
## File Organization:
observatory/

    backend/

        weather/

        cameras/

        infrastructure/

        wildlife/

        database/

        dashboard/
		
		
Version 1.0
✓ Dashboard loads
✓ Weather card
✓ Infrastructure card
✓ Camera status card
✓ Wildlife section (manual entries)
✓ Historical weather graph
✓ Runs on your server
✓ Accessible from your home network

Version 0.1
Operation Observatory v0.1
One page.
Four cards.
	Weather
	Infrastructure
	Camera status
	Current time
	
| Version | New Concept                    |
| ------- | ------------------------------ |
| 0.1     | FastAPI + serving a webpage    |
| 0.2     | Calling external APIs          |
| 0.3     | PostgreSQL and storing history |
| 0.4     | Docker                         |
| 0.5     | Authentication                 |
| 0.6     | Camera integration             |
| 0.7     | Wildlife database              |
| 0.8     | Charts and analytics           |
