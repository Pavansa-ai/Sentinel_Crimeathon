
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import text

from audit import record_security_event


def request_bank_change(
    db,
    integration,
    vendor_code,
    account_holder,
    account_number,
    ifsc_code,
    bank_name,
    source_ip
):
    # Confirm that the vendor exists
    vendor = db.execute(
        text("""
            SELECT id, vendor_code
            FROM vendors
            WHERE vendor_code = :vendor_code
        """),
        {"vendor_code": vendor_code}
    ).mappings().first()

    if not vendor:
        raise HTTPException(404, "Vendor not found")

    # Ensure the vendor has an existing approved bank account
    current_bank = db.execute(
        text("""
            SELECT id
            FROM approved_bank_versions
            WHERE vendor_id = :vendor_id
              AND is_active = TRUE
        """),
        {"vendor_id": vendor["id"]}
    ).first()

    if not current_bank:
        raise HTTPException(
            400,
            "Vendor has no active approved bank account"
        )

    # Create a unique pending request
    change_ref = "BANK-" + uuid.uuid4().hex[:12].upper()

    result = db.execute(
        text("""
            INSERT INTO pending_bank_changes (
                change_ref,
                vendor_id,
                requested_by,
                proposed_account_holder,
                proposed_account_number,
                proposed_ifsc_code,
                proposed_bank_name,
                status,
                verification_status,
                approval_status,
                expires_at
            )
            VALUES (
                :change_ref,
                :vendor_id,
                :requested_by,
                :account_holder,
                :account_number,
                :ifsc_code,
                :bank_name,
                'pending',
                'pending',
                'pending',
                :expires_at
            )
            RETURNING id
        """),
        {
            "change_ref": change_ref,
            "vendor_id": vendor["id"],
            "requested_by": integration["identity"],
            "account_holder": account_holder,
            "account_number": account_number,
            "ifsc_code": ifsc_code,
            "bank_name": bank_name,
            "expires_at": datetime.now() + timedelta(hours=24)
        }
    )

    change_id = result.scalar()

    # Record the request without exposing bank details
    record_security_event(
        db,
        integration["identity"],
        "BANK_CHANGE_REQUESTED",
        source_ip,
        "A bank-detail change was submitted for vendor "
        + vendor_code + ". Request reference: " + change_ref,
        "high"
    )

    db.commit()

    return {
        "message": "Bank change submitted for independent verification",
        "change_ref": change_ref,
        "status": "pending",
        "vendor_code": vendor_code,
        "expires_at": datetime.now() + timedelta(hours=24)
    }


def get_pending_changes(db):
    result = db.execute(
        text("""
            SELECT
                p.change_ref,
                v.vendor_code,
                v.vendor_name,
                p.requested_by,
                p.status,
                p.verification_status,
                p.approval_status,
                p.created_at,
                p.expires_at
            FROM pending_bank_changes p
            JOIN vendors v ON v.id = p.vendor_id
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
        """)
    )

    return [dict(row._mapping) for row in result]
