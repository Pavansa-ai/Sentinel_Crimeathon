
import os
import json
import base64
import secrets

from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import text

from cryptography.hazmat.primitives import serialization


PRIVATE_KEY_PATH = os.path.join("keys", "sentinel_private.pem")


def load_private_key():
    if not os.path.exists(PRIVATE_KEY_PATH):
        raise RuntimeError("SENTINEL private key not found")

    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )


def create_payment_instruction(db, vendor_code, amount, payment_date):
    # Validate payment amount
    try:
        payment_amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid payment amount")

    if payment_amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")

    # Find vendor
    vendor = db.execute(
        text("""
            SELECT id
            FROM vendors
            WHERE vendor_code = :vendor_code
        """),
        {"vendor_code": vendor_code}
    ).fetchone()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Get the currently active bank version
    bank = db.execute(
        text("""
            SELECT id
            FROM approved_bank_versions
            WHERE vendor_id = :vendor_id
              AND is_active = TRUE
        """),
        {"vendor_id": vendor.id}
    ).fetchone()

    if not bank:
        raise HTTPException(status_code=409, detail="No approved bank details found")

    payment_ref = "PAY-" + secrets.token_hex(6).upper()
    nonce = secrets.token_urlsafe(24)
    expires_at = datetime.now() + timedelta(hours=24)

    result = db.execute(
        text("""
            INSERT INTO payment_instructions (
                payment_ref,
                vendor_id,
                bank_version_id,
                amount,
                currency,
                payment_date,
                status,
                nonce,
                expires_at
            )
            VALUES (
                :payment_ref,
                :vendor_id,
                :bank_version_id,
                :amount,
                'INR',
                :payment_date,
                'pending',
                :nonce,
                :expires_at
            )
            RETURNING id
        """),
        {
            "payment_ref": payment_ref,
            "vendor_id": vendor.id,
            "bank_version_id": bank.id,
            "amount": payment_amount,
            "payment_date": payment_date,
            "nonce": nonce,
            "expires_at": expires_at
        }
    )

    payment_id = result.fetchone().id
    db.commit()

    return {
        "message": "Payment instruction created",
        "payment_ref": payment_ref,
        "status": "pending",
        "expires_at": expires_at.isoformat()
    }


def build_payment_payload(payment, bank):
    # Build a deterministic representation of the exact payment
    payload = {
        "payment_ref": payment.payment_ref,
        "vendor_id": payment.vendor_id,
        "bank_version_id": payment.bank_version_id,
        "account_holder": bank.account_holder,
        "account_number": bank.account_number,
        "ifsc_code": bank.ifsc_code,
        "bank_name": bank.bank_name or "",
        "amount": format(Decimal(str(payment.amount)), ".2f"),
        "currency": payment.currency,
        "payment_date": payment.payment_date.isoformat(),
        "nonce": payment.nonce,
        "expires_at": payment.expires_at.isoformat()
    }

    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":")
    ).encode("utf-8")


def sign_payment_instruction(db, payment_ref, signed_by):
    # Find payment
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
        raise HTTPException(status_code=409, detail="Payment is not pending")

    if payment.expires_at < datetime.now():
        raise HTTPException(status_code=410, detail="Payment instruction expired")

    # Confirm that this is still the vendor's active bank version
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
            detail="Bank details changed. Create a new payment instruction."
        )

    # Prevent duplicate signing
    existing = db.execute(
        text("""
            SELECT id
            FROM payment_signatures
            WHERE payment_id = :payment_id
        """),
        {"payment_id": payment.id}
    ).fetchone()

    if existing:
        raise HTTPException(status_code=409, detail="Payment already signed")

    # Sign the canonical payment payload
    private_key = load_private_key()
    payload = build_payment_payload(payment, bank)
    signature = private_key.sign(payload)

    signature_text = base64.b64encode(signature).decode("ascii")

    db.execute(
        text("""
            INSERT INTO payment_signatures (
                payment_id,
                signature,
                algorithm,
                signed_by
            )
            VALUES (
                :payment_id,
                :signature,
                'Ed25519',
                :signed_by
            )
        """),
        {
            "payment_id": payment.id,
            "signature": signature_text,
            "signed_by": signed_by
        }
    )

    db.commit()

    return {
        "message": "Payment digitally signed",
        "payment_ref": payment_ref,
        "signed_by": signed_by,
        "algorithm": "Ed25519",
        "status": "signed"
    }
