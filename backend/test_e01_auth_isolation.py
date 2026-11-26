import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
import assistant_pilot as ap


class IsolatedAuthTests(unittest.IsolatedAsyncioTestCase):
    async def test_isolated_auth_rejects_hosted_endpoint(self):
        with patch.dict(ap.os.environ, {
            "VERTICE_AUTH_MODE": "isolated",
            "VERTICE_TEST_SUPABASE_URL": ap.SUPABASE_URL,
            "VERTICE_TEST_SUPABASE_PUBLIC_KEY": "test",
        }), patch.object(ap.httpx, "AsyncClient") as client:
            with self.assertRaises(HTTPException) as exc:
                await ap.verified_user("Bearer synthetic-token")
            self.assertEqual(exc.exception.status_code, 503)
            client.assert_not_called()

    async def test_isolated_auth_rejects_missing_key(self):
        with patch.dict(ap.os.environ, {
            "VERTICE_AUTH_MODE": "isolated",
            "VERTICE_TEST_SUPABASE_URL": "http://127.0.0.1:54321",
            "VERTICE_TEST_SUPABASE_PUBLIC_KEY": "",
        }), patch.object(ap.httpx, "AsyncClient") as client:
            with self.assertRaises(HTTPException) as exc:
                await ap.verified_user("Bearer synthetic-token")
            self.assertEqual(exc.exception.status_code, 503)
            client.assert_not_called()

    async def test_isolated_auth_uses_local_endpoint(self):
        with patch.dict(ap.os.environ, {
            "VERTICE_AUTH_MODE": "isolated",
            "VERTICE_TEST_SUPABASE_URL": "http://127.0.0.1:54321",
            "VERTICE_TEST_SUPABASE_PUBLIC_KEY": "synthetic-key",
        }), patch.object(ap.httpx, "AsyncClient") as client:
            session = client.return_value.__aenter__.return_value
            response = ap.httpx.Response(200, json={"id": "synthetic-user"})
            session.get = AsyncMock(return_value=response)
            self.assertEqual(await ap.verified_user("Bearer synthetic-token"), "synthetic-user")
            session.get.assert_awaited_once_with(
                "http://127.0.0.1:54321/auth/v1/user",
                headers={"Authorization": "Bearer synthetic-token", "apikey": "synthetic-key"},
            )
