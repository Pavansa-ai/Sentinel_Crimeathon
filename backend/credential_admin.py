
import os
import hmac

from datetime import datetime
from typing import Literal, Optional, List

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Request
from audit import record_security_event

from database import get_db


router = APIRouter(prefix="/credentials", tags=["Credential Governance"])


def verify_admin(
    x_admin_token: str = Header(None, alias="X-Admin-Token")
):
    expected_token = os.getenv("ADMIN_TOKEN")

    if not expected_token or not x_admin_token:
        raise HTTPException(
            status_code=401,
            detail="Admin authentication required"
        )

    if not hmac.compare_digest(x_admin_token, expected_token):
        raise HTTPException(
            status_code=403,
            detail="Invalid admin token"
        )


class CredentialUpdate(BaseModel):
    status: Optional[Literal["active", "inactive", "revoked"]] = None
    scopes: Optional[List[str]] = None
    allowed_ips: Optional[List[str]] = None
    expires_at: Optional[datetime] = None


@router.get("/")
def list_credentials(
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT id, name, identity, owner, scopes,
               allowed_ips, expires_at, status, created_at
        FROM integrations
        ORDER BY id
    """))

    return [dict(row) for row in result.mappings().all()]

@router.get("/summary")
def credential_summary(
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'active') AS active,
            COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
            COUNT(*) FILTER (WHERE status = 'revoked') AS revoked
        FROM integrations
    """)).fetchone()

    return {
        "total": result.total,
        "active": result.active,
        "inactive": result.inactive,
        "revoked": result.revoked
    }


@router.patch("/{identity}")
def update_credential(
    identity: str,
    update: CredentialUpdate,
    request: Request,
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    db.commit()
    record_security_event(
    db,
    identity,
    "CREDENTIAL_UPDATED",
    request.client.host if request.client else "unknown",
    "Administrator modified credential settings",
    "medium"
)
    changes = update.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    if "scopes" in changes and changes["scopes"] is not None:
        if not all(scope.strip() for scope in changes["scopes"]):
            raise HTTPException(
                status_code=400,
                detail="Scopes cannot contain empty values"
            )

    if "allowed_ips" in changes and changes["allowed_ips"] is not None:
        if not all(ip.strip() for ip in changes["allowed_ips"]):
            raise HTTPException(
                status_code=400,
                detail="IP addresses cannot contain empty values"
            )

    if "expires_at" in changes and changes["expires_at"] is not None:
        if changes["expires_at"].tzinfo is not None:
            raise HTTPException(
                status_code=400,
                detail="Use a timezone-naive datetime for this local prototype"
            )

    allowed_fields = {
        "status", "scopes", "allowed_ips", "expires_at"
    }

    assignments = []
    for field in changes:
        if field not in allowed_fields:
            raise HTTPException(status_code=400, detail="Invalid field")
        assignments.append(f"{field} = :{field}")

    changes["identity"] = identity

    query = text(
        f"""
        UPDATE integrations
        SET {", ".join(assignments)}
        WHERE identity = :identity
        RETURNING id, name, identity, owner, scopes,
                  allowed_ips, expires_at, status
        """
    )

    result = db.execute(query, changes).mappings().first()

    if not result:
        db.rollback()
        raise HTTPException(
            status_code=404,
            detail="Integration not found"
        )

    db.commit()

    return {
        "message": "Credential updated successfully",
        "integration": dict(result)
    }


@router.post("/{identity}/revoke")
def revoke_credential(
    identity: str,
    request: Request,
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    db.commit()
    record_security_event(
    db,
    identity,
    "CREDENTIAL_REVOKED",
    request.client.host if request.client else "unknown",
    "Administrator revoked an integration credential",
    "high"
)
    result = db.execute(
        text("""
            UPDATE integrations
            SET status = 'revoked'
            WHERE identity = :identity
            RETURNING identity, status
        """),
        {"identity": identity}
    ).mappings().first()

    if not result:
        db.rollback()
        raise HTTPException(
            status_code=404,
            detail="Integration not found"
        )

    db.commit()

    return {
        "message": "Credential revoked successfully",
        "integration": dict(result)
    }
