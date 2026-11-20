
import pyotp
from sqlalchemy import text
from database import SessionLocal

db = SessionLocal()

try:
    result = db.execute(
        text("""
            SELECT totp_secret
            FROM finance_approvers
            WHERE username = 'finance-approver-01'
              AND is_active = TRUE
        """)
    ).fetchone()

    if not result:
        print("Finance approver not found")
    else:
        secret = result.totp_secret.strip()
        totp = pyotp.TOTP(secret)
        code = totp.now()

        print("Generated code:", code)
        print("Database secret validation:", totp.verify(code, valid_window=1))

finally:
    db.close()
