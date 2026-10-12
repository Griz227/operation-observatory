import requests
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from services.proxmox import get_nodes
from services.weather import get_weather

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


def upstream_error(source, error):
    if isinstance(error, requests.Timeout):
        reason = "request timed out"
    elif isinstance(error, requests.ConnectionError):
        reason = "could not connect"
    elif isinstance(error, requests.HTTPError):
        detail = ""
        try:
            detail = error.response.json().get("reason") or error.response.text
        except Exception:
            detail = error.response.text
        detail = (detail or "").strip()
        reason = f"HTTP {error.response.status_code}"
        if detail:
            reason = f"{reason}: {detail[:160]}"
    else:
        reason = str(error)

    return JSONResponse(
        status_code=502,
        content={"error": f"{source} unavailable: {reason}"}
    )


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )

@app.get("/api/systems")
def systems():
    try:
        return get_nodes()
    except Exception as error:
        return upstream_error("Proxmox", error)

@app.get("/api/weather")
def weather():
    try:
        return get_weather()
    except Exception as error:
        return upstream_error("Weather", error)
