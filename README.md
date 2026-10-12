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


## Configuration (backend/.env)

Proxmox (Infrastructure card):

| Key                  | Example            |
| -------------------- | ------------------ |
| PROXMOX_HOST         | 192.168.1.10       |
| PROXMOX_PORT         | 8006               |
| PROXMOX_USER         | observatory@pve    |
| PROXMOX_TOKEN_ID     | dashboard          |
| PROXMOX_TOKEN_SECRET | (your token)       |

Weather (Weather card, data from Open-Meteo, no API key needed):

| Key                   | Example      | Notes                                   |
| --------------------- | ------------ | --------------------------------------- |
| WEATHER_LAT           | 39.7392      | Required                                |
| WEATHER_LON           | -104.9903    | Required                                |
| WEATHER_LOCATION_NAME | Home         | Label shown on the card                 |
| WEATHER_UNITS         | fahrenheit   | `fahrenheit` (mph + inches) or `celsius` (km/h + mm) |
| WEATHER_TIMEZONE      | auto         | `auto` or an IANA zone like America/Denver |
| WEATHER_FORECAST_DAYS | 7            | Daily forecast length to fetch (1-7). The UI can toggle 3d / 5d / 7d within that range. |

Click the Weather card on the dashboard to open a details modal with precipitation, the next 12 hours of precip chance, and the daily forecast.

The Nature card is a placeholder for a later eBird integration (and your own sightings). The Cameras card is the same kind of placeholder.

The header shows the local time, date and a sunrise/sunset daylight bar (sunrise and sunset come from the weather feed).

Run it from `backend/`:

    uvicorn main:app --reload

Then open http://127.0.0.1:8000.
