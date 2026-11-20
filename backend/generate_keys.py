
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
import os

os.makedirs("keys", exist_ok=True)

private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

# Save private key
with open("keys/sentinel_private.pem", "wb") as f:
    f.write(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
    )

# Save public key
with open("keys/sentinel_public.pem", "wb") as f:
    f.write(
        public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )

print("Ed25519 key pair generated successfully!")
print("Private key: keys/sentinel_private.pem")
print("Public key: keys/sentinel_public.pem")
