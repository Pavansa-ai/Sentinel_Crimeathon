
import os
import base64
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import text

from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature

from payment_service import build_payment_payload
from audit import record_security_event


PUBLIC_KEY_PATH = os.path.join("keys", "sentinel_public.pem")


def load_public_key():
    if not os.path.exists(PUBLIC_KEY_PATH):
        raise RuntimeError("SENTINEL public key not found")

    with open(PUBLIC_KEY_PATH, "rb") as key_file:
        return serialization.load_pem_public_key(key_file.read())


def verify_payment_instruction(db, payment_ref, source_ip="unknown"):

    try:
        # 1. Lock the payment record
        payment = db.execute(
            text("""
                SELECT *
                FROM payment_instructions
                WHERE payment_ref = :payment_ref
                FOR UPDATE
            """),
            {"payment_ref": payment_ref}
        ).fetchone()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status != "pending":
            raise HTTPException(
                status_code=409,
                detail="Payment is not pending or has already been processed"
            )

        if payment.expires_at < datetime.now():
            raise HTTPException(status_code=410, detail="Payment has expired")

        # 2. Retrieve its signature
        signature_record = db.execute(
            text("""
                SELECT signature, algorithm, signed_by
                FROM payment_signatures
                WHERE payment_id = :payment_id
            """),
            {"payment_id": payment.id}
        ).fetchone()

        if not signature_record:
            raise HTTPException(status_code=409, detail="Payment has not been signed")

        if signature_record.algorithm != "Ed25519":
            raise HTTPException(status_code=400, detail="Unsupported signature algorithm")

        # 3. Retrieve the exact bank version referenced by the payment
        bank = db.execute(
            text("""
                SELECT *
                FROM approved_bank_versions
                WHERE id = :bank_version_id
                  AND vendor_id = :vendor_id
                  AND is_active = TRUE
            """),
            {
                "bank_version_id": payment.bank_version_id,
                "vendor_id": payment.vendor_id
            }
        ).fetchone()

        if not bank:
            raise HTTPException(
                status_code=409,
                detail="Bank version is no longer active. Payment blocked."
            )

        # 4. Reconstruct the signed payload
        payload = build_payment_payload(payment, bank)

        # 5. Verify the Ed25519 signature
        public_key = load_public_key()
        signature = base64.b64decode(signature_record.signature, validate=True)

        try:
            public_key.verify(signature, payload)
        except InvalidSignature:
            db.execute(
                text("""
                    UPDATE payment_instructions
                    SET status = 'blocked'
                    WHERE id = :payment_id
                """),
                {"payment_id": payment.id}
            )
            db.commit()

            record_security_event(
                db,
                "SENTINEL_PAYMENT_EXECUTOR",
                "PAYMENT_TAMPERING_DETECTED",
                source_ip,
                "Invalid payment signature for " + payment_ref,
                "critical"
            )

            raise HTTPException(
                status_code=403,
                detail="Payment signature invalid. Possible tampering detected."
            )

        # 6. Mark payment as executed (simulation only)
        db.execute(
            text("""
                UPDATE payment_instructions
                SET status = 'executed'
                WHERE id = :payment_id
                  AND status = 'pending'
            """),
            {"payment_id": payment.id}
        )

        db.commit()

        record_security_event(
            db,
            "SENTINEL_PAYMENT_EXECUTOR",
            "PAYMENT_SIGNATURE_VERIFIED",
            source_ip,
            "Payment signature verified and simulated execution completed: " + payment_ref,
            "low"
        )

        return {
            "message": "Payment signature verified successfully",
            "payment_ref": payment_ref,
            "signed_by": signature_record.signed_by,
            "algorithm": "Ed25519",
            "signature_valid": True,
            "status": "executed",
            "execution": "SIMULATED - no real money transferred"
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
