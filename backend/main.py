from __future__ import annotations
from uuid import UUID
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from domain import Project, VesterRelation, calculate_vester
from repository_memory import InMemoryProjectRepository

app = FastAPI(title="Formulador Cultural API", version="0.2.0")
repo = InMemoryProjectRepository()

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

class SectionUpdate(BaseModel):
    data: dict

class VesterInput(BaseModel):
    source: str
    target: str
    score: int = Field(ge=0, le=3)
    justification: str = Field(min_length=1)

def current_user(x_user_id: str | None) -> UUID:
    if not x_user_id:
        raise HTTPException(401, "Falta X-User-Id; en producción se reemplaza por autenticación Supabase")
    try:
        return UUID(x_user_id)
    except ValueError as exc:
        raise HTTPException(400, "X-User-Id no es un UUID válido") from exc

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "phase": 2, "persistence": "memory"}

@app.post("/projects")
def create_project(payload: ProjectCreate, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = current_user(x_user_id)
    project = repo.create(Project(user_id=user_id, title=payload.title))
    return serialize(project)

@app.get("/projects")
def list_projects(x_user_id: str | None = Header(default=None)) -> list[dict]:
    user_id = current_user(x_user_id)
    return [serialize(p) for p in repo.list_for_user(user_id)]

@app.get("/projects/{project_id}")
def get_project(project_id: UUID, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = current_user(x_user_id)
    project = repo.get(user_id, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    return serialize(project)

@app.put("/projects/{project_id}/sections/{section_code}")
def update_section(project_id: UUID, section_code: str, payload: SectionUpdate, x_user_id: str | None = Header(default=None)) -> dict:
    user_id = current_user(x_user_id)
    project = repo.get(user_id, project_id)
    if not project:
        raise HTTPException(404, "Proyecto no encontrado")
    section_code = section_code.upper()
    if section_code not in project.sections:
        raise HTTPException(400, "Sección fuera del alcance S01–S08")
    for key, value in payload.data.items():
        project.sections[section_code].set_value(key, value)
    repo.save(project)
    return {"project_id": str(project.id), "section": section_code, "data": project.sections[section_code].data}

@app.post("/vester/calculate")
def vester_calculate(payload: list[VesterInput]) -> dict:
    relations = [VesterRelation(**item.model_dump()) for item in payload]
    return {"result": calculate_vester(relations), "note": "Cálculo determinístico; la valoración 0–3 es decisión humana."}

def serialize(project: Project) -> dict:
    return {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "title": project.title,
        "sections": {code: section.data for code, section in project.sections.items()},
    }
