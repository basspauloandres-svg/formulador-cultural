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

    async def test_empty_field_requires_recovered_citation(self):
        passage = {"passage_status": "EXCERPT_FOUND_CLAIM_UNVERIFIED", "sha256": "test", "excerpt": "Registro de talleres musicales en 2020.", "publisher": "Fuente de prueba", "title": "Informe", "url": "https://example.org", "locator": "p. 1"}
        with patch.object(aa, "research", AsyncMock(return_value={"sources": [], "errors": []})), patch.object(aa, "resolve_territory", AsyncMock(return_value={"identity": None, "status": "UNRESOLVED"})), patch.object(aa, "municipal_passages", AsyncMock(return_value=[passage])), patch.object(aa, "assist", AsyncMock()) as assist:
            req = aa.GuidedRequest(field="antecedentes", context="Manizales, Caldas")
            for proposal, expected in [("Talleres en 2020 [M1].", False), ("Talleres en 2020.", True), ("Talleres en 2020 [M2].", True)]:
                assist.return_value = {"suggestion": proposal}
                result = await aa.guide(req, "Bearer test")
                self.assertEqual(result["blocked_for_evidence"], expected)
                self.assertEqual(result["suggestion"] is None, expected)
            self.assertIn("[M1]", assist.await_args.kwargs["evidence"])

    def test_pdf_requires_explicit_municipality(self):
        from unittest.mock import Mock
        page = Mock()
        page.extract_text.return_value = (
            "En Chinchiná se realizaron talleres de música durante 2020."
        )
        with patch.object(aa, "PdfReader", return_value=Mock(pages=[page])):
            self.assertEqual(aa.passages_from_pdf(b"", "caracteristicas_culturales", "Neira"), [])
            page.extract_text.return_value = (
                "En Neira se realizaron talleres de música durante 2020."
            )
            result = aa.passages_from_pdf(b"", "caracteristicas_culturales", "Neira")
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]["page"], 1)

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
