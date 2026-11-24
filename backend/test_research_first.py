import asyncio
import unittest
from unittest.mock import AsyncMock, patch
import automatic_assistant as aa

class ResearchFirstTests(unittest.IsolatedAsyncioTestCase):
    async def test_empty_field_without_evidence(self):
        with patch.object(aa, "research", AsyncMock(return_value={"sources": [], "errors": []})), patch.object(aa, "resolve_territory", AsyncMock(return_value={"identity": None, "status": "UNRESOLVED"})), patch.object(aa, "municipal_passages", AsyncMock(return_value=[])), patch.object(aa, "assist", AsyncMock()) as assist:
            result = await aa.guide(aa.GuidedRequest(field="antecedentes", context="Manizales, Caldas"), "Bearer test")
            self.assertTrue(result["blocked_for_evidence"])
            self.assertIsNone(result["suggestion"])
            assist.assert_not_awaited()

    async def test_forty_equivalent_downloads(self):
        aa._PUBLIC_DOC_CACHE.clear()
        aa._PUBLIC_DOC_INFLIGHT.clear()
        record = {"url": "https://www.mincultura.gov.co/test.pdf"}
        async def fake(record, field):
            await asyncio.sleep(0.01)
            return {**record, "document_sha256": "test", "passages": [{"page": 1, "excerpt": "test"}], "status": "PASSAGES_EXTRACTED_CLAIMS_UNVERIFIED"}
        with patch.object(aa, "_fetch_document", AsyncMock(side_effect=fake)) as fetch:
            results = await asyncio.gather(*(aa.fetch_document(record, "antecedentes") for _ in range(40)))
            self.assertEqual(len(results), 40)
            self.assertTrue(all(r["document_sha256"] == "test" for r in results))
            self.assertEqual(fetch.await_count, 1)
            await aa.fetch_document(record, "antecedentes")
            self.assertEqual(fetch.await_count, 1)
        aa._PUBLIC_DOC_CACHE.clear()

if __name__ == "__main__":
    unittest.main()
