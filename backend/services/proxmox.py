import os
from pathlib import Path

import requests
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def get_nodes():
    load_dotenv(ENV_PATH, override=True)

    host = os.getenv("PROXMOX_HOST")
    port = os.getenv("PROXMOX_PORT")
    user = os.getenv("PROXMOX_USER")
    token_id = os.getenv("PROXMOX_TOKEN_ID")
    token_secret = os.getenv("PROXMOX_TOKEN_SECRET")

    url = f"https://{host}:{port}/api2/json/nodes"

    headers = {
        "Authorization": (
            f"PVEAPIToken={user}!{token_id}={token_secret}"
        )
    }

    response = requests.get(
        url,
        headers=headers,
        verify=False,
        timeout=5
    )

    response.raise_for_status()

    data = response.json()["data"]

    nodes = []

    for node in data:
            nodes.append({
                "node": node["node"],
                "status": node["status"],
                "cpu_percent": round(node["cpu"] * 100, 1),
                "memory_percent": round(
                    (node["mem"] / node["maxmem"]) * 100, 1
                ),
                "disk_percent": round(
                    (node["disk"] / node["maxdisk"]) * 100, 1
                ),
                "uptime_seconds": node["uptime"]
            })

    return nodes