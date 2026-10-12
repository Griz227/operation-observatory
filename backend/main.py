from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
#from fastapi.templating import Jinja2Templates
#from fastapi.staticfiles import StaticFiles
from services.proxmox import get_nodes

app = FastAPI()

# removing for now until we have a front end to serve
#
# app.mount("/static", StaticFiles(directory="static"), name="static")
# templates = Jinja2Templates(directory="templates")

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )

@app.get("/api/systems")
def systems():
    return get_nodes()