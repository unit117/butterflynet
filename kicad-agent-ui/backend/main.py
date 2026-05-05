from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routers import project, viewer, pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    config.ensure_dirs()
    kicad = config.get_kicad_cli()
    print(f"KiCad CLI: {kicad}")
    for pid, proj in config.PROJECTS.items():
        exists = proj["path"].exists()
        print(f"Project {pid}: {proj['path']} ({'OK' if exists else 'MISSING'})")
    yield


app = FastAPI(title="KiCad Agent Workbench", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(project.router, prefix="/api/project", tags=["project"])
app.include_router(viewer.router, prefix="/api/view", tags=["viewer"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
