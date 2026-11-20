
import hashlib

from datetime import datetime
from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from audit import record_security_event


api_key_header = APIKeyHeader(
    name="X-API-Key",
    auto_error=False
)


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def authenticate_integration(
    request: Request,
    api_key: str = Depends(api_key_header),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"

    if not api_key:
        record_security_event(
            db, None, "MISSING_API_KEY", client_ip,
            "Request attempted without an API key", "high"
        )
        raise HTTPException(401, "API key missing")

    key_hash = hash_api_key(api_key)

    result = db.execute(
        text("""
            SELECT id, name, identity, scopes,
                   allowed_ips, expires_at, status
            FROM integrations
            WHERE api_key_hash = :key_hash
        """),
        {"key_hash": key_hash}
    ).mappings().first()

    if not result:
        record_security_event(
            db, "unknown", "INVALID_API_KEY", client_ip,
            "Request attempted using an invalid API key", "high"
        )
        raise HTTPException(401, "Invalid API key")

    identity = result["identity"]

    if result["status"] != "active":
        record_security_event(
            db, identity, "INACTIVE_CREDENTIAL_USED", client_ip,
            "Inactive or revoked credential was used", "high"
        )
        raise HTTPException(403, "Integration is inactive")

    if result["expires_at"] and result["expires_at"] < datetime.now():
        record_security_event(
            db, identity, "EXPIRED_CREDENTIAL_USED", client_ip,
            "Expired API credential was used", "high"
        )
        raise HTTPException(403, "API key has expired")

    allowed_ips = result["allowed_ips"] or []

    if allowed_ips and client_ip not in allowed_ips:
        record_security_event(
            db, identity, "UNAPPROVED_IP", client_ip,
            "Credential used from an unapproved IP address", "high"
        )
        raise HTTPException(403, "Request from unapproved IP address")

    return {
        "id": result["id"],
        "name": result["name"],
        "identity": identity,
        "scopes": result["scopes"] or []
    }


def require_scope(required_scope: str):
    def scope_checker(
        request: Request,
        integration: dict = Depends(authenticate_integration),
        db: Session = Depends(get_db)
    ):
        if required_scope not in integration["scopes"]:
            client_ip = request.client.host if request.client else "unknown"

            record_security_event(
                db,
                integration["identity"],
                "INSUFFICIENT_SCOPE",
                client_ip,
                "Attempted operation requiring scope: " + required_scope,
                "high"
            )

            raise HTTPException(
                status_code=403,
                detail="Insufficient integration permissions"
            )

        return integration

    return scope_checker
