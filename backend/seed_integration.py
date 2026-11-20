
import secrets
from datetime import datetime, timedelta

from sqlalchemy import text
from database import engine
from security import hash_api_key

# Generate a fresh synthetic API key
api_key = "SENTINEL-" + secrets.token_urlsafe(32)

with engine.begin() as connection:
    connection.execute(
        text("""
            INSERT INTO integrations
            (name, identity, api_key_hash, owner,
             scopes, allowed_ips, expires_at, status)
            VALUES
            (:name, :identity, :api_key_hash, :owner,
             :scopes, :allowed_ips, :expires_at, :status)
            ON CONFLICT (identity)
            DO UPDATE SET
                api_key_hash = EXCLUDED.api_key_hash,
                scopes = EXCLUDED.scopes,
                allowed_ips = EXCLUDED.allowed_ips,
                expires_at = EXCLUDED.expires_at,
                status = EXCLUDED.status
        """),
        {
            "name": "SENTINEL Demo Integration",
            "identity": "sentinel-demo-01",
            "api_key_hash": hash_api_key(api_key),
            "owner": "SENTINEL Testing",
            "scopes": ["vendor:read"],
            "allowed_ips": ["127.0.0.1", "::1"],
            "expires_at": datetime.now() + timedelta(days=30),
            "status": "active"
        }
    )

print("\nSynthetic integration created!")
print("Identity: sentinel-demo-01")
print("API KEY (copy this for testing):")
print(api_key)
