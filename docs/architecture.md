
# Architecture Design:


                        Browser
                           │
                           ▼
                  Observatory Dashboard
                           │
                      HTTP Requests
                           │
                           ▼
                    Python Backend
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
 Weather Service     Camera Service     Infrastructure Service
      │                    │                    │
 NOAA/API           Reolink API         Proxmox API
      │                    │                    │
      └────────────────────┼────────────────────┘
                           │
                           ▼
                     PostgreSQL Database
                           │
          Weather History / Wildlife / Events

## folder structure

operation-observatory/
│
├── README.md              <-- Project overview
├── .gitignore
├── LICENSE                <-- Optional later
│
├── docs/
│   ├── vision.md
│   ├── roadmap.md
│   ├── architecture.md
│   ├── meeting-notes.md
│   └── ideas.md
│
├── backend/
│
├── frontend/
│
├── database/
│
├── scripts/
│
└── assets/
    ├── diagrams/
    └── images/