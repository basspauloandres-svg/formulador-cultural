import unittest
from unittest.mock import AsyncMock, patch

import httpx
import national_sources as ns


class NationalSourceTests(unittest.IsolatedAsyncioTestCase):
    async def fetch(self, rows, code="05001", status=200):
        with patch.object(ns.httpx, "AsyncClient") as client:
            get = AsyncMock(return_value=httpx.Response(
                status, json=rows, request=httpx.Request("GET", ns.URL)))
            client.return_value.__aenter__.return_value.get = get
            result = await ns.cultural_registry(code)
            return result, get

    async def test_leading_zero_and_scope(self):
        result, get = await self.fetch([{"divipola": "5001", "tipo": "Entidad"}])
        self.assertEqual(result["status"], "RECORDS_RETRIEVED")
        self.assertEqual(result["divipola"], "05001")
        self.assertRegex(result["response_sha256"], r"^[0-9a-f]{64}$")
        query = get.await_args.kwargs["params"]
        self.assertIn("'05001'", query["$where"])
        self.assertIn("'5001'", query["$where"])
        self.assertNotIn("nombre", query["$select"])

    async def test_no_rows_is_distinct_from_failure(self):
        result, _ = await self.fetch([])
        self.assertEqual(result["status"], "NO_RECORDS_RETURNED")
        failed, _ = await self.fetch([], status=503)
        self.assertEqual(failed["status"], "SOURCE_UNAVAILABLE_OR_INVALID")

    async def test_wrong_territory_rejected(self):
        result, _ = await self.fetch([{"divipola": "17001"}])
        self.assertEqual(result["status"], "SOURCE_UNAVAILABLE_OR_INVALID")
        self.assertEqual(result["records"], [])

    async def test_unexpected_field_rejected(self):
        result, _ = await self.fetch([{"divipola": "05001", "nombre": "Synthetic"}])
        self.assertEqual(result["status"], "SOURCE_UNAVAILABLE_OR_INVALID")

    async def test_truncation_is_explicit(self):
        result, _ = await self.fetch([{"divipola": "05001"}] * 21)
        self.assertTrue(result["truncated"])
        self.assertEqual(len(result["records"]), 20)

    async def test_invalid_code_rejected_before_network(self):
        with patch.object(ns.httpx, "AsyncClient") as client:
            with self.assertRaises(ValueError):
                await ns.cultural_registry("5001")
            client.assert_not_called()
