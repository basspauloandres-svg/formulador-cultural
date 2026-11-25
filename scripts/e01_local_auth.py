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

    # No provider credential in this run: exercise live retrieval and abstention,
    # without allowing a model call or reading any participant data.
    isolated_model_key = os.environ.pop("VERTICE_E01_GROQ_KEY", "").strip()
    os.environ.pop("GROQ_API_KEY", None)
    from automatic_assistant import GuidedRequest, guide
    from unittest.mock import patch
    import re

    bearer = "Bearer " + token
    positive = False
    for context, field, code in (
        ("Neira, Caldas", "caracteristicas_culturales", "17486"),
        ("Villamaría, Caldas", "territorio_o_lugar_de_intervencion", "17873"),
        ("Villamaría, Caldas", "caracteristicas_culturales", "17873"),
    ):
        result = await guide(GuidedRequest(field=field, context=context,
                                          text="", include_web=False, generate=False), bearer)
        identity = result.get("territory")
        print(f"E01 retrieval {code}/{field}: {result['territory_resolution']} / {result['evidence_input_status']}")
        if result["evidence_input_status"] != "LIVE_PASSAGES_AVAILABLE":
            continue
        assert identity and identity["divipola"] == code
        assert result["suggestion"] is None
        assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"
        for doc in result["sources"]:
            assert re.fullmatch(r"[0-9a-f]{64}", doc["document_sha256"])
            assert doc["passages"] and all(p["page"] >= 1 and p["excerpt"] for p in doc["passages"])
        for passage in result["municipal_references"]:
            if passage["passage_status"] == "EXCERPT_FOUND_CLAIM_UNVERIFIED":
                assert re.fullmatch(r"[0-9a-f]{64}", passage["sha256"])
                assert passage["locator"] and passage["excerpt"]
        positive = True
    # A deliberately nonexistent territory tests the actual negative path.
    # The spy fails immediately if a model call is attempted.
    with patch("automatic_assistant.assist", side_effect=AssertionError("Model invoked without evidence")) as model:
        negative = await guide(GuidedRequest(field="antecedentes",
                               context="Municipio inexistente E01 00000", text="",
                               include_web=False, generate=True), bearer)
        assert negative["evidence_input_status"] == "NO_LIVE_PASSAGES"
        assert negative["blocked_for_evidence"] is True
        assert negative["suggestion"] is None
        assert any(f["type"] == "NO_RECOVERED_EVIDENCE" for f in negative["review_flags"])
        model.assert_not_called()
    print("E01 real negative path: PASS")
    if not positive:
        raise RuntimeError("E01 INSUFFICIENT_EVIDENCE: no live positive document recovered")
    print("E01 live positive retrieval: PASS (semantic support and model inference not assessed)")
    # Explicitly separate real inference from synthetic and retrieval-only evidence.
    if not isolated_model_key:
        print("E01 real inference: NOT_RUN_NO_ISOLATED_CREDENTIAL")
        return
    os.environ["GROQ_API_KEY"] = isolated_model_key
    try:
        for code in ("05001", "11001"):
            result = await guide(GuidedRequest(field="caracteristicas_culturales",
                                  context=code, text="", include_web=False, generate=True), bearer)
            print(f"E01 inference {code}: territory={result['territory_resolution']} evidence={result['evidence_input_status']} draft={bool(result['suggestion'])} blocked={result['blocked_for_evidence']} flags={[f.get('type') for f in result['review_flags']]}")
            if not result.get("national_evidence"):
                continue
            assert result["territory"]["divipola"] == code
            assert result["requires_approval"] is True
            assert result["claim_status"] == "INSUFFICIENT_EVIDENCE"
            if (result["suggestion"] and not result["blocked_for_evidence"] and
                    result.get("suggestion_origin") == "MODEL_DRAFT_UNVERIFIED"):
                assert re.search(r"\[(?:N1|M[12]|F1,\s*p\.\d+)\]", result["suggestion"])
                print(f"E01 real inference {code}: PASS_STRUCTURAL_ONLY")
                return
        raise RuntimeError("E01 real inference did not return a reviewable cited draft")
    finally:
        os.environ.pop("GROQ_API_KEY", None)




if __name__ == "__main__":
    asyncio.run(main())
