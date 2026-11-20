
from sqlalchemy import text
from secret_detector import detect_secrets
from audit import record_security_event


def submit_ticket(db, ticket_ref, subject, description, source_ip):

    findings = detect_secrets(subject + "\n" + description)

    if findings:
        record_security_event(
            db,
            "support-ticket-service",
            "SECRET_EXPOSURE_BLOCKED",
            source_ip,
            "Ticket blocked due to detected credential types: "
            + ", ".join(findings),
            "high"
        )

        return {
            "allowed": False,
            "reason": "Potential credentials detected",
            "detected_types": findings
        }

    db.execute(
        text("""
            INSERT INTO support_tickets
            (ticket_ref, subject, description)
            VALUES
            (:ticket_ref, :subject, :description)
        """),
        {
            "ticket_ref": ticket_ref,
            "subject": subject,
            "description": description
        }
    )

    db.commit()

    return {
        "allowed": True,
        "message": "Ticket created successfully",
        "ticket_ref": ticket_ref
    }
