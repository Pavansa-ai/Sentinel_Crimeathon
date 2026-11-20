from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db
from datetime import date
from security import require_scope
from credential_admin import router as credential_admin_router
from ticket_service import submit_ticket
from data_access import monitor_search, process_export
from data_admin import router as data_admin_router
from financial_integrity import (
    request_bank_change,
    get_pending_changes
)
from credential_admin import verify_admin
from verification import generate_vendor_otp, verify_vendor_otp
from finance_approval import approve_bank_change
from payment_service import create_payment_instruction, sign_payment_instruction
import pyotp
from payment_verification import verify_payment_instruction
from itdr import run_itdr_scan
app = FastAPI(title="SENTINEL Security Gateway", version="1.0.0")
app = FastAPI(
    title="SENTINEL Security Gateway",
    description="Integration Security and Financial Integrity Platform",
    version="1.0.0"
)
app.include_router(credential_admin_router)
app.include_router(data_admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityEvent(BaseModel):
    identity: str
    event_type: str
    source_ip: str
    description: str
    severity: str = "low"

class TicketRequest(BaseModel):
    ticket_ref: str
    subject: str
    description: str    

class SearchRequest(BaseModel):
    search_term: str


class ExportRequest(BaseModel):
    resource: str
    records_requested: int


class BankChangeRequest(BaseModel):
    vendor_code: str
    account_holder: str
    account_number: str
    ifsc_code: str
    bank_name: str

class OTPRequest(BaseModel):
    change_ref: str


class OTPVerification(BaseModel):
    change_ref: str
    otp: str


class PaymentCreateRequest(BaseModel):
    vendor_code: str
    amount: float
    payment_date: date


class PaymentSignRequest(BaseModel):
    payment_ref: str
    username: str
    otp: str

@app.get("/")
def home():
    return {
        "system": "SENTINEL",
        "status": "active",
        "message": "Security Gateway is running"
    }
class FinanceApprovalRequest(BaseModel):
    change_ref: str
    username: str
    otp: str

@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {
        "api": "healthy",
        "database": "connected"
    }


@app.post("/events")
def create_event(
    event: SecurityEvent,
    db: Session = Depends(get_db)
):
    query = text("""
        INSERT INTO security_events
        (identity, event_type, source_ip, description, severity)
        VALUES
        (:identity, :event_type, :source_ip, :description, :severity)
        RETURNING id
    """)

    result = db.execute(query, event.model_dump())
    event_id = result.scalar()
    db.commit()

    return {
        "message": "Security event recorded",
        "event_id": event_id
    }


@app.get("/events")
def get_events(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT id, identity, event_type, source_ip,
               description, severity, status, created_at
        FROM security_events
        ORDER BY created_at DESC
    """))

    return [dict(row._mapping) for row in result]


@app.get("/events/activity")
def get_event_activity(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT
            TO_CHAR(
                DATE_TRUNC('hour', created_at),
                'HH24:00'
            ) AS time,
            COUNT(*) AS events
        FROM security_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY DATE_TRUNC('hour', created_at)
    """))

    return [
        {
            "time": row.time,
            "events": row.events
        }
        for row in result
    ]

@app.get("/protected/vendor-data")
def read_vendor_data(
    integration: dict = Depends(require_scope("vendor:read"))
):
    return {
        "message": "Access granted",
        "authenticated_as": integration["identity"],
        "data": [
            {
                "vendor_id": "V-1001",
                "vendor_name": "Demo Packaging",
                "status": "active"
            },
            {
                "vendor_id": "V-1002",
                "vendor_name": "Sample Logistics",
                "status": "active"
            }
        ]
    }


@app.post("/protected/vendor-bank-update")
def attempt_bank_update(
    integration: dict = Depends(require_scope("vendor:bank:update"))
):
    return {
        "message": "Permission granted",
        "authenticated_as": integration["identity"]
    }


@app.get("/events/security")
def get_security_events(
    severity: str = None,
    db: Session = Depends(get_db)
):
    query = text("""
        SELECT id, identity, event_type, source_ip,
               description, severity, status, created_at
        FROM security_events
        WHERE (:severity IS NULL OR severity = :severity)
        ORDER BY created_at DESC
    """)

    result = db.execute(query, {"severity": severity})

    return [dict(row._mapping) for row in result]


@app.post("/tickets")
def create_support_ticket(
    ticket: TicketRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    source_ip = request.client.host if request.client else "unknown"

    result = submit_ticket(
        db,
        ticket.ticket_ref,
        ticket.subject,
        ticket.description,
        source_ip
    )

    if not result["allowed"]:
        raise HTTPException(
            status_code=422,
            detail=result
        )

    return result


@app.get("/tickets")
def list_support_tickets(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT id, ticket_ref, subject, description,
               status, created_at
        FROM support_tickets
        ORDER BY created_at DESC
    """))

    return [dict(row._mapping) for row in result]


@app.post("/data/search")
def search_activity(
    data: SearchRequest,
    request: Request,
    db: Session = Depends(get_db),
    integration: dict = Depends(require_scope("vendor:read"))
):
    source_ip = request.client.host if request.client else "unknown"

    return monitor_search(
        db,
        integration,
        data.search_term,
        source_ip
    )


@app.post("/data/export")
def export_data(
    data: ExportRequest,
    request: Request,
    db: Session = Depends(get_db),
    integration: dict = Depends(require_scope("vendor:export"))
):
    source_ip = request.client.host if request.client else "unknown"

    return process_export(
        db,
        integration,
        data.resource,
        data.records_requested,
        source_ip
    )


@app.get("/data/activity")
def get_data_activity(
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT id, identity, action, resource,
               records_requested, source_ip, created_at
        FROM data_access_events
        ORDER BY created_at DESC
    """))

    return [dict(row._mapping) for row in result]


@app.post("/financial/bank-change")
def create_bank_change(
    data: BankChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    integration: dict = Depends(
        require_scope("vendor:bank:request")
    )
):
    source_ip = request.client.host if request.client else "unknown"

    return request_bank_change(
        db=db,
        integration=integration,
        vendor_code=data.vendor_code,
        account_holder=data.account_holder,
        account_number=data.account_number,
        ifsc_code=data.ifsc_code,
        bank_name=data.bank_name,
        source_ip=source_ip
    )


@app.get("/financial/bank-changes")
def list_bank_changes(
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    return get_pending_changes(db)


@app.post("/financial/verification/generate")
def generate_verification(
    data: OTPRequest,
    request: Request,
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    source_ip = request.client.host if request.client else "unknown"

    return generate_vendor_otp(
        db,
        data.change_ref,
        source_ip
    )


@app.post("/financial/verification/verify")
def verify_vendor(
    data: OTPVerification,
    request: Request,
    _: None = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    source_ip = request.client.host if request.client else "unknown"

    return verify_vendor_otp(
        db,
        data.change_ref,
        data.otp,
        source_ip
    )
@app.post("/financial/approval/approve")
def finance_approval_endpoint(
    request: FinanceApprovalRequest,
    db: Session = Depends(get_db)
):
    source_ip = "unknown"

    return approve_bank_change(
        db=db,
        change_ref=request.change_ref,
        username=request.username,
        otp=request.otp,
        source_ip=source_ip
    )


@app.post("/payments/create")
def create_payment_endpoint(
    request: PaymentCreateRequest,
    db: Session = Depends(get_db),
    admin=Depends(verify_admin)
):
    return create_payment_instruction(
        db=db,
        vendor_code=request.vendor_code,
        amount=request.amount,
        payment_date=request.payment_date
    )

@app.post("/payments/sign")
def sign_payment_endpoint(
    request: PaymentSignRequest,
    db: Session = Depends(get_db)
):
    approver = db.execute(
        text("""
            SELECT totp_secret
            FROM finance_approvers
            WHERE username = :username
              AND is_active = TRUE
        """),
        {"username": request.username}
    ).fetchone()

    if not approver:
        raise HTTPException(status_code=403, detail="Finance approver not found")

    if not pyotp.TOTP(approver.totp_secret).verify(
        request.otp, valid_window=1
    ):
        raise HTTPException(status_code=401, detail="Invalid finance MFA code")

    return sign_payment_instruction(
        db=db,
        payment_ref=request.payment_ref,
        signed_by=request.username
    )
@app.post("/payments/verify")
def verify_payment_endpoint(
    request: PaymentSignRequest,
    db: Session = Depends(get_db)
):
    return verify_payment_instruction(
        db=db,
        payment_ref=request.payment_ref
    )

@app.post("/itdr/scan")
def trigger_itdr_scan(
    db: Session = Depends(get_db),
    admin=Depends(verify_admin)
):
    return run_itdr_scan(db)

@app.get("/itdr/alerts")
def get_itdr_alerts(
    db: Session = Depends(get_db),
    admin=Depends(verify_admin)
):
    alerts = db.execute(
        text("""
            SELECT *
            FROM itdr_alerts
            ORDER BY created_at DESC
        """)
    ).fetchall()

    return [dict(row._mapping) for row in alerts]


@app.patch("/itdr/alerts/{alert_ref}/resolve")
def resolve_itdr_alert(
    alert_ref: str,
    db: Session = Depends(get_db),
    admin=Depends(verify_admin)
):
    result = db.execute(
        text("""
            UPDATE itdr_alerts
            SET status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP
            WHERE alert_ref = :alert_ref
              AND status = 'open'
            RETURNING alert_ref
        """),
        {"alert_ref": alert_ref}
    ).fetchone()

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Open alert not found"
        )

    db.commit()

    return {
        "message": "Alert resolved successfully",
        "alert_ref": alert_ref,
        "status": "resolved"
    }

@app.post("/payments/verify")
def verify_payment_endpoint(
    request: PaymentSignRequest,
    db: Session = Depends(get_db)
):
    return verify_payment_instruction(
        db=db,
        payment_ref=request.payment_ref
    )


@app.get("/payments/summary")
def get_payment_summary(
    db: Session = Depends(get_db),
    admin=Depends(verify_admin)
):
    result = db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'signed') AS signed,
                COUNT(*) FILTER (WHERE status = 'executed') AS executed,
                COUNT(*) FILTER (WHERE status = 'blocked') AS blocked
            FROM payment_instructions
        """)
    ).fetchone()

    return {
        "total": result.total,
        "pending": result.pending,
        "signed": result.signed,
        "executed": result.executed,
        "blocked": result.blocked
    }
