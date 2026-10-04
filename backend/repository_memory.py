from __future__ import annotations
from uuid import UUID
from domain import Project

class InMemoryProjectRepository:
    def __init__(self) -> None:
        self._items: dict[UUID, Project] = {}

    def create(self, project: Project) -> Project:
        self._items[project.id] = project
        return project

    def get(self, user_id: UUID, project_id: UUID) -> Project | None:
        project = self._items.get(project_id)
        if project is None or project.user_id != user_id:
            return None
        return project

    def save(self, project: Project) -> Project:
        self._items[project.id] = project
        return project

    def list_for_user(self, user_id: UUID) -> list[Project]:
        return [p for p in self._items.values() if p.user_id == user_id]
