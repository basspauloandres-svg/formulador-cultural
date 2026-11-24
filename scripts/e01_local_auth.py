"""Integration probe: real local Supabase Auth, no production data or secrets."""
import asyncio
import os
import secrets

import httpx
from fastapi import HTTPException
from assistant_pilot import verified_user


async def main():
    url = os.environ["VERTICE_TEST_SUPABASE_URL"]
    key = os.environ["VERTICE_TEST_SUPABASE_PUBLIC_KEY"]
    if os.environ.get("VERTICE_AUTH_MODE") != "isolated" or url != "http://127.0.0.1:54321":
        raise RuntimeError("Isolated local auth required")
    headers = {"apikey": key}
    email = f"e01-{secrets.token_hex(8)}@example.com"
    password = secrets.token_urlsafe(32)
    async with httpx.AsyncClient(timeout=20, trust_env=False) as client:
        signup = await client.post(url + "/auth/v1/signup", headers=headers,
                                   json={"email": email, "password": password})
        if signup.status_code not in (200, 201):
            raise RuntimeError(f"Local signup failed: {signup.status_code}")
        token = signup.json().get("access_token")
        if not token:
            login = await client.post(url + "/auth/v1/token?grant_type=password",
                                      headers=headers, json={"email": email, "password": password})
            if login.status_code != 200:
                raise RuntimeError(f"Local login failed: {login.status_code}")
            token = login.json()["access_token"]
    user = await verified_user("Bearer " + token)
    assert isinstance(user, str) and user
    print("E01 real local authenticated session: PASS")
    for bearer in ("", "Bearer invalid-synthetic-token"):
        try:
            await verified_user(bearer)
        except HTTPException as exc:
            assert exc.status_code == 401
        else:
            raise AssertionError("Invalid session accepted")
    print("E01 missing and invalid sessions rejected: PASS")


if __name__ == "__main__":
    asyncio.run(main())
