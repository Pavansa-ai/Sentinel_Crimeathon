
import re

SECRET_PATTERNS = {
    "PRIVATE_KEY": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "BEARER_TOKEN": r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]{12,}",
    "API_KEY": r"(?i)\b(?:api[_-]?key|access[_-]?key)\s*[:=]\s*['\"]?[A-Za-z0-9._~+/=-]{8,}",
    "PASSWORD": r"(?i)\b(?:password|passwd|pwd)\s*[:=]\s*['\"]?[^'\"\s,;]{6,}",
    "ACCESS_TOKEN": r"(?i)\b(?:access[_-]?token|auth[_-]?token)\s*[:=]\s*['\"]?[A-Za-z0-9._~+/=-]{8,}",
    "AWS_ACCESS_KEY": r"\bAKIA[0-9A-Z]{16}\b",
    "GENERIC_SECRET": r"(?i)\b(?:client_secret|secret_key)\s*[:=]\s*['\"]?[A-Za-z0-9._~+/=-]{8,}"
}


def detect_secrets(text: str):
    findings = []

    for secret_type, pattern in SECRET_PATTERNS.items():
        if re.search(pattern, text):
            findings.append(secret_type)

    return findings
