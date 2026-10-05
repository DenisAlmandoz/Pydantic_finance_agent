import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas import Role

bearer = HTTPBearer(auto_error=False)
DEFAULT_TOKENS: dict[str, Role] = {
    "demo-admin-token": "admin",
    "demo-analyst-token": "analyst",
    "demo-viewer-token": "viewer",
}


@dataclass(frozen=True)
class Principal:
    role: Role


def configured_tokens() -> dict[str, Role]:
    raw_tokens = os.getenv("FINANCE_API_TOKENS")
    if not raw_tokens:
        return DEFAULT_TOKENS
    tokens: dict[str, Role] = {}
    for entry in raw_tokens.split(","):
        token, separator, role = entry.strip().partition(":")
        if separator and token and role in {"admin", "analyst", "viewer"}:
            tokens[token] = role  # type: ignore[assignment]
    return tokens


async def current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Principal:
    tokens = configured_tokens()
    if credentials is None or credentials.credentials not in tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Valid bearer token required"
        )
    return Principal(role=tokens[credentials.credentials])


async def analyst_or_admin(principal: Principal = Depends(current_principal)) -> Principal:
    if principal.role not in {"analyst", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analyst role required")
    return principal
