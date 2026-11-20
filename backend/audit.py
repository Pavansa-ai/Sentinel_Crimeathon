
from sqlalchemy import text


def record_security_event(
    db,
    identity,
    event_type,
    source_ip,
    description,
    severity="medium"
):
    db.execute(
        text("""
            INSERT INTO security_events
            (identity, event_type, source_ip, description, severity)
            VALUES
            (:identity, :event_type, :source_ip, :description, :severity)
        """),
        {
            "identity": identity,
            "event_type": event_type,
            "source_ip": source_ip,
            "description": description,
            "severity": severity
        }
    )

    db.commit()
