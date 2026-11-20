
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from credential_admin import verify_admin


router = APIRouter(
    prefix="/data-governance",
    tags=["Data Access Governance"]
)


class QuotaUpdate(BaseModel):
    export_limit: Optional[int] = None
    export_window_minutes: Optional[int] = None


@router.patch("/quota/{identity}")
def update_quota(
    identity: str,
    update: QuotaUpdate,
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    changes = update.dict(exclude_unset=True)

    if not changes:
        raise HTTPException(400, "No quota settings provided")

    if "export_limit" in changes:
        value = changes["export_limit"]
        if value is None or not 1 <= value <= 10000:
            raise HTTPException(
                400, "Export limit must be between 1 and 10000"
            )

    if "export_window_minutes" in changes:
        value = changes["export_window_minutes"]
        if value is None or not 1 <= value <= 1440:
            raise HTTPException(
                400, "Export window must be between 1 and 1440 minutes"
            )

    allowed_fields = ["export_limit", "export_window_minutes"]

    assignments = [
        field + " = :" + field
        for field in changes
        if field in allowed_fields
    ]

    changes["identity"] = identity

    result = db.execute(
        text("""
            UPDATE integrations
            SET """ + ", ".join(assignments) + """
            WHERE identity = :identity
            RETURNING identity, export_limit, export_window_minutes
        """),
        changes
    ).mappings().first()

    if not result:
        db.rollback()
        raise HTTPException(404, "Integration not found")

    db.commit()

    return {
        "message": "Export quota updated",
        "configuration": dict(result)
    }
