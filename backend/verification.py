
import hashlib
import secrets
import hmac

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import text

from audit import record_security_event


def hash_otp(otp):
    return hashlib.sha256(otp.encode()).hexdigest()


def generate_vendor_otp(db, change_ref, source_ip):
    # Find the pending bank-change request
    change = db.execute(
        text("""
            SELECT id, vendor_id, status, expires_at
            FROM pending_bank_changes
            WHERE change_ref = :change_ref
        """),
        {"change_ref": change_ref}
    ).mappings().first()

    if not change:
        raise HTTPException(404, "Bank-change request not found")

    if change["status"] != "pending":
        raise HTTPException(400, "Request is not pending")

    if change["expires_at"] < datetime.now():
        raise HTTPException(400, "Bank-change request has expired")

    # Retrieve the previously registered verification contact
    vendor = db.execute(
        text("""
            SELECT verification_email, verification_phone
            FROM vendors
            WHERE id = :vendor_id
        """),
        {"vendor_id": change["vendor_id"]}
    ).mappings().first()

    if not vendor or not (
        vendor["verification_email"] or vendor["verification_phone"]
    ):
        raise HTTPException(
            400,
            "No registered verification contact available"
        )

    # Generate a cryptographically random six-digit OTP
    otp = f"{secrets.randbelow(1000000):06d}"

    expires_at = datetime.now() + timedelta(minutes=5)

    db.execute(
        text("""
            INSERT INTO bank_change_verifications
            (change_id, otp_hash, expires_at, attempts)
            VALUES (:change_id, :otp_hash, :expires_at, 0)
            ON CONFLICT (change_id)
            DO UPDATE SET
                otp_hash = EXCLUDED.otp_hash,
                expires_at = EXCLUDED.expires_at,
                attempts = 0,
                verified_at = NULL
        """),
        {
            "change_id": change["id"],
            "otp_hash": hash_otp(otp),
            "expires_at": expires_at
        }
    )

    record_security_event(
        db,
        "vendor-verification-service",
        "VENDOR_VERIFICATION_INITIATED",
        source_ip,
        "Verification code generated for " + change_ref,
        "medium"
    )

    db.commit()

    # DEMO ONLY: In production, deliver through an independent channel.
    return {
        "message": "Verification code generated",
        "change_ref": change_ref,
        "delivery_mode": "SIMULATED",
        "registered_contact": (
            "email" if vendor["verification_email"] else "phone"
        ),
        "demo_otp": otp,
        "expires_in_seconds": 300
    }


def verify_vendor_otp(db, change_ref, otp, source_ip):
    change = db.execute(
        text("""
            SELECT id, status
            FROM pending_bank_changes
            WHERE change_ref = :change_ref
        """),
        {"change_ref": change_ref}
    ).mappings().first()

    if not change:
        raise HTTPException(404, "Bank-change request not found")

    if change["status"] != "pending":
        raise HTTPException(400, "Request is not pending")

    verification = db.execute(
        text("""
            SELECT id, otp_hash, expires_at, attempts, verified_at
            FROM bank_change_verifications
            WHERE change_id = :change_id
        """),
        {"change_id": change["id"]}
    ).mappings().first()

    if not verification:
        raise HTTPException(400, "Generate a verification code first")

    if verification["verified_at"]:
        raise HTTPException(400, "Request already verified")

    if verification["expires_at"] < datetime.now():
        raise HTTPException(400, "Verification code expired")

    if verification["attempts"] >= 3:
        raise HTTPException(429, "Maximum verification attempts exceeded")

    if not hmac.compare_digest(
        verification["otp_hash"],
        hash_otp(otp)
    ):
        db.execute(
            text("""
                UPDATE bank_change_verifications
                SET attempts = attempts + 1
                WHERE id = :id
            """),
            {"id": verification["id"]}
        )

        record_security_event(
            db,
            "vendor-verification-service",
            "INVALID_VENDOR_OTP",
            source_ip,
            "Incorrect verification code for " + change_ref,
            "high"
        )

        db.commit()

        raise HTTPException(401, "Incorrect verification code")

    db.execute(
        text("""
            UPDATE bank_change_verifications
            SET verified_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """),
        {"id": verification["id"]}
    )

    db.execute(
        text("""
            UPDATE pending_bank_changes
            SET verification_status = 'verified'
            WHERE id = :id
        """),
        {"id": change["id"]}
    )

    record_security_event(
        db,
        "vendor-verification-service",
        "VENDOR_VERIFICATION_SUCCESS",
        source_ip,
        "Vendor verification completed for " + change_ref,
        "medium"
    )

    db.commit()

    return {
        "message": "Vendor verification successful",
        "change_ref": change_ref,
        "verification_status": "verified",
        "approval_status": "pending"
    }
