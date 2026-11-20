
import secrets
from datetime import datetime, timedelta

from sqlalchemy import text


DETECTION_WINDOW_MINUTES = 10


def create_or_update_alert(
    db, identity, source_ip, alert_type, description, severity, event_count
):
    # Avoid duplicate open alerts for the same threat
    existing = db.execute(
        text("""
            SELECT id, event_count
            FROM itdr_alerts
            WHERE identity = :identity
              AND source_ip = :source_ip
              AND alert_type = :alert_type
              AND status = 'open'
              AND created_at >= :cutoff
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {
            "identity": identity,
            "source_ip": source_ip,
            "alert_type": alert_type,
            "cutoff": datetime.now() - timedelta(
                minutes=DETECTION_WINDOW_MINUTES
            )
        }
    ).fetchone()

    if existing:
        db.execute(
            text("""
                UPDATE itdr_alerts
                SET event_count = :event_count,
                    description = :description,
                    severity = :severity
                WHERE id = :alert_id
            """),
            {
                "event_count": existing.event_count + event_count,
                "description": description,
                "severity": severity,
                "alert_id": existing.id
            }
        )
        return "updated"

    alert_ref = "ITDR-" + secrets.token_hex(6).upper()

    db.execute(
        text("""
            INSERT INTO itdr_alerts (
                alert_ref,
                identity,
                source_ip,
                alert_type,
                description,
                severity,
                status,
                event_count
            )
            VALUES (
                :alert_ref,
                :identity,
                :source_ip,
                :alert_type,
                :description,
                :severity,
                'open',
                :event_count
            )
        """),
        {
            "alert_ref": alert_ref,
            "identity": identity,
            "source_ip": source_ip,
            "alert_type": alert_type,
            "description": description,
            "severity": severity,
            "event_count": event_count
        }
    )

    return "created"


def scan_authentication_events(db):
    cutoff = datetime.now() - timedelta(
        minutes=DETECTION_WINDOW_MINUTES
    )

    suspicious_events = [
        "INVALID_API_KEY",
        "MISSING_API_KEY",
        "INACTIVE_CREDENTIAL_USED",
        "EXPIRED_CREDENTIAL_USED",
        "UNAPPROVED_IP",
        "INSUFFICIENT_SCOPE"
    ]

    results = db.execute(
        text("""
            SELECT
                identity,
                source_ip,
                event_type,
                COUNT(*) AS total
            FROM security_events
            WHERE event_type IN (
                'INVALID_API_KEY',
                'MISSING_API_KEY',
                'INACTIVE_CREDENTIAL_USED',
                'EXPIRED_CREDENTIAL_USED',
                'UNAPPROVED_IP',
                'INSUFFICIENT_SCOPE'
            )
            AND created_at >= :cutoff
            GROUP BY identity, source_ip, event_type
            HAVING COUNT(*) >= 3
        """),
        {"cutoff": cutoff}
    ).fetchall()

    detected = 0

    for event in results:
        severity = "critical" if event.event_type in (
            "INACTIVE_CREDENTIAL_USED",
            "EXPIRED_CREDENTIAL_USED"
        ) else "high"

        description = (
            str(event.total)
            + " suspicious authentication or authorization events "
            + "detected within 10 minutes."
        )

        create_or_update_alert(
            db,
            event.identity,
            event.source_ip,
            event.event_type,
            description,
            severity,
            event.total
        )

        detected += 1

    return detected


def scan_bulk_exports(db):
    cutoff = datetime.now() - timedelta(
        minutes=DETECTION_WINDOW_MINUTES
    )

    results = db.execute(
        text("""
            SELECT
                identity,
                source_ip,
                COUNT(*) AS export_count,
                SUM(records_requested) AS total_records
            FROM data_access_events
            WHERE action = 'EXPORT'
              AND created_at >= :cutoff
            GROUP BY identity, source_ip
            HAVING SUM(records_requested) >= 500
        """),
        {"cutoff": cutoff}
    ).fetchall()

    detected = 0

    for event in results:
        description = (
            str(event.total_records)
            + " records requested through "
            + str(event.export_count)
            + " export operations within 10 minutes."
        )

        create_or_update_alert(
            db,
            event.identity,
            event.source_ip,
            "BULK_EXPORT_DETECTED",
            description,
            "high",
            event.export_count
        )

        detected += 1

    return detected


def run_itdr_scan(db):
    try:
        authentication_alerts = scan_authentication_events(db)
        export_alerts = scan_bulk_exports(db)

        db.commit()

        return {
            "message": "ITDR scan completed",
            "authentication_alerts_detected": authentication_alerts,
            "bulk_export_alerts_detected": export_alerts,
            "total_detection_groups": (
                authentication_alerts + export_alerts
            )
        }

    except Exception:
        db.rollback()
        raise
