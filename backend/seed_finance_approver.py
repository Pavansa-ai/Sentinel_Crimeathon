
import pyotp
from sqlalchemy import text
from database import SessionLocal


db = SessionLocal()

try:
    username = "finance-approver-01"

    existing = db.execute(
        text("SELECT id FROM finance_approvers WHERE username = :username"),
        {"username": username}
    ).fetchone()

    if existing:
        print("Finance approver already exists.")
        print("No changes made. Existing MFA secret was preserved.")
    else:
        secret = pyotp.random_base32()

        db.execute(
            text("""
                INSERT INTO finance_approvers
                (username, totp_secret, is_active)
                VALUES (:username, :secret, TRUE)
            """),
            {"username": username, "secret": secret}
        )
        db.commit()

        print("Finance approver created successfully.")
        print("Username:", username)
        print("MFA Secret:", secret)
        print("Keep this secret private.")

        totp = pyotp.TOTP(secret)
        print("Current MFA Code:", totp.now())

finally:
    db.close()
