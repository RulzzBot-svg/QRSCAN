"""PIN hashing and verification (supports legacy plain-text during migration)."""
import bcrypt

_BCRYPT_PREFIX = "$2b$"


def is_hashed(value: str) -> bool:
    return isinstance(value, str) and value.startswith(_BCRYPT_PREFIX)


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(plain: str, stored: str) -> bool:
    if not stored:
        return False
    if is_hashed(stored):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except ValueError:
            return False
    return plain == stored
