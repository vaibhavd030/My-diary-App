from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize rate limiter as a global singleton for reuse across routers
limiter = Limiter(key_func=get_remote_address)
