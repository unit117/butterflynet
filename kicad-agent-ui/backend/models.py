from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ProjectInfo(BaseModel):
    id: str
    name: str
    path: str
    schematic: str
    pcb: str
    status: str
    model: Optional[str] = None


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASS = "pass"
    FAIL = "fail"
    BLOCKED = "blocked"
    CRASH = "crash"


class RunEvent(BaseModel):
    run_id: str
    event: str  # started, tool_called, artifact_written, drc_complete, erc_complete, export_ready, crashed
    detail: str = ""
    data: Optional[dict] = None


class DrcResult(BaseModel):
    status: RunStatus
    violations: int = 0
    unconnected: int = 0
    shorting: int = 0
    breakdown: Optional[dict] = None
    raw_path: Optional[str] = None


class ErcResult(BaseModel):
    status: RunStatus
    errors: int = 0
    warnings: int = 0
    raw_path: Optional[str] = None


class SvgCacheKey(BaseModel):
    board_hash: str
    layers: str
    view_type: str  # "pcb" or "sch"
