
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import text

from audit import record_security_event


def record_activity(
    db,
    integration,
    action,
    resource,
    records_requested,
    source_ip
):
    db.execute(
        text("""
            INSERT INTO data_access_events
            (integration_id, identity, action, resource,
             records_requested, source_ip)
            VALUES
            (:integration_id, :identity, :action, :resource,
             :records_requested, :source_ip)
        """),
        {
            "integration_id": integration["id"],
            "identity": integration["identity"],
            "action": action,
            "resource": resource,
            "records_requested": records_requested,
            "source_ip": source_ip
        }
    )


def monitor_search(db, integration, search_term, source_ip):
    record_activity(
        db, integration, "SEARCH",
        search_term, 0, source_ip
    )

    db.commit()

    return {
        "message": "Search activity recorded",
        "identity": integration["identity"]
    }


def process_export(
    db,
    integration,
    resource,
    records_requested,
    source_ip
):
    if records_requested <= 0:
        raise HTTPException(400, "Record count must be positive")

    if records_requested > 10000:
        raise HTTPException(400, "Absolute export limit exceeded")

    config = db.execute(
        text("""
            SELECT export_limit, export_window_minutes
            FROM integrations
            WHERE id = :id
        """),
        {"id": integration["id"]}
    ).mappings().first()

    if not config:
        raise HTTPException(404, "Integration configuration not found")

    export_limit = config["export_limit"] or 1000
    window_minutes = config["export_window_minutes"] or 60

    window_start = datetime.now() - timedelta(minutes=window_minutes)

    usage = db.execute(
        text("""
            SELECT COALESCE(SUM(records_exported), 0)
            FROM export_usage
            WHERE integration_id = :integration_id
              AND created_at >= :window_start
        """),
        {
            "integration_id": integration["id"],
            "window_start": window_start
        }
    ).scalar()

    usage = int(usage or 0)

    recent_search = db.execute(
        text("""
            SELECT id
            FROM data_access_events
            WHERE integration_id = :integration_id
              AND action = 'SEARCH'
              AND created_at >= :search_start
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {
            "integration_id": integration["id"],
            "search_start": datetime.now() - timedelta(minutes=10)
        }
    ).first()

    if recent_search and records_requested >= 500:
        record_security_event(
            db,
            integration["identity"],
            "SEARCH_FOLLOWED_BY_BULK_EXPORT",
            source_ip,
            "Recent search followed by a large export request",
            "high"
        )

    if usage + records_requested > export_limit:
        record_security_event(
            db,
            integration["identity"],
            "EXPORT_LIMIT_EXCEEDED",
            source_ip,
            "Export request exceeded configured quota",
            "high"
        )

        raise HTTPException(
            status_code=429,
            detail={
                "message": "Export quota exceeded",
                "limit": export_limit,
                "used": usage,
                "requested": records_requested
            }
        )

    record_activity(
        db, integration, "EXPORT",
        resource, records_requested, source_ip
    )

    db.execute(
        text("""
            INSERT INTO export_usage
            (integration_id, records_exported)
            VALUES (:integration_id, :records_exported)
        """),
        {
            "integration_id": integration["id"],
            "records_exported": records_requested
        }
    )

    db.commit()

    return {
        "message": "Export request approved",
        "identity": integration["identity"],
        "records_requested": records_requested,
        "remaining_quota": export_limit - usage - records_requested
    }
