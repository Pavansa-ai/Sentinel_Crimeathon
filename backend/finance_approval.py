
from datetime import datetime
import pyotp

from fastapi import HTTPException
from sqlalchemy import text

from audit import record_security_event


def approve_bank_change(db, change_ref, username, otp, source_ip):
    # 1. Find the finance approver
    approver = db.execute(
        text("""
            SELECT username, totp_secret
            FROM finance_approvers
            WHERE username = :username
              AND is_active = TRUE
        """),
        {"username": username}
    ).fetchone()

    if not approver:
        raise HTTPException(status_code=403, detail="Finance approver not found or inactive")

    # 2. Validate the MFA code
    totp = pyotp.TOTP(approver.totp_secret)

    if not totp.verify(otp, valid_window=1):
        record_security_event(
            db,
            username,
            "FINANCE_MFA_FAILED",
            source_ip,
            "Invalid MFA code during bank change approval",
            "high"
        )
        raise HTTPException(status_code=401, detail="Invalid MFA code")

    try:
        # 3. Lock and retrieve the pending change
        change = db.execute(
            text("""
                SELECT *
                FROM pending_bank_changes
                WHERE change_ref = :change_ref
                FOR UPDATE
            """),
            {"change_ref": change_ref}
        ).fetchone()

        if not change:
            raise HTTPException(status_code=404, detail="Bank change not found")

        if change.status != "pending":
            raise HTTPException(status_code=409, detail="Bank change is not pending")

        if change.verification_status != "verified":
            raise HTTPException(status_code=403, detail="Vendor verification is incomplete")

        if change.expires_at and change.expires_at < datetime.now():
            raise HTTPException(status_code=410, detail="Bank change request has expired")

        if change.approval_status != "pending":
            raise HTTPException(status_code=409, detail="Bank change is not awaiting approval")

        # 4. Prevent the requester from approving their own request
        if change.requested_by == username:
            raise HTTPException(status_code=403, detail="Requester cannot approve their own bank change")

        # 5. Lock the currently active bank version
        current_bank = db.execute(
            text("""
                SELECT id, version_number
                FROM approved_bank_versions
                WHERE vendor_id = :vendor_id
                  AND is_active = TRUE
                FOR UPDATE
            """),
            {"vendor_id": change.vendor_id}
        ).fetchone()

        if not current_bank:
            raise HTTPException(status_code=409, detail="No active bank version found")

        new_version = current_bank.version_number + 1

        # 6. Deactivate the old bank version
        db.execute(
            text("""
                UPDATE approved_bank_versions
                SET is_active = FALSE
                WHERE id = :bank_id
            """),
            {"bank_id": current_bank.id}
        )

        # 7. Activate the newly approved bank details
        db.execute(
            text("""
                INSERT INTO approved_bank_versions (
                    vendor_id,
                    version_number,
                    account_holder,
                    account_number,
                    ifsc_code,
                    bank_name,
                    is_active
                )
                VALUES (
                    :vendor_id,
                    :version_number,
                    :account_holder,
                    :account_number,
                    :ifsc_code,
                    :bank_name,
                    TRUE
                )
            """),
            {
                "vendor_id": change.vendor_id,
                "version_number": new_version,
                "account_holder": change.proposed_account_holder,
                "account_number": change.proposed_account_number,
                "ifsc_code": change.proposed_ifsc_code,
                "bank_name": change.proposed_bank_name
            }
        )

        # 8. Mark the request as approved
        db.execute(
            text("""
                UPDATE pending_bank_changes
                SET status = 'approved',
                    approval_status = 'approved'
                WHERE id = :change_id
            """),
            {"change_id": change.id}
        )

        # 9. Record the finance approval
        db.execute(
            text("""
                INSERT INTO bank_change_approvals (
                    change_id,
                    approval_type,
                    approved_by,
                    verification_method,
                    mfa_verified,
                    status,
                    approved_at
                )
                VALUES (
                    :change_id,
                    'FINANCE',
                    :username,
                    'TOTP',
                    TRUE,
                    'approved',
                    CURRENT_TIMESTAMP
                )
            """),
            {
                "change_id": change.id,
                "username": username
            }
        )

        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    # 10. Log the successful approval
    record_security_event(
        db,
        username,
        "BANK_CHANGE_APPROVED",
        source_ip,
        "Finance approved bank change " + change_ref,
        "high"
    )

    return {
        "message": "Bank change approved successfully",
        "change_ref": change_ref,
        "approved_by": username,
        "new_bank_version": new_version,
        "status": "approved"
    }
