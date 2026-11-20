import pyotp
from sqlalchemy import text
from database import SessionLocal

db = SessionLocal()

try:
    new_secret = pyotp.random_base32()

    db.execute(
        text("""
            UPDATE finance_approvers
            SET totp_secret = :secret
            WHERE username = :username
        """),
        {
            "secret": new_secret,
            "username": "finance-approver-01"
        }
    )

    db.commit()

    print("New MFA secret:", new_secret)
    print("Save this secret securely.")

finally:
    db.close()