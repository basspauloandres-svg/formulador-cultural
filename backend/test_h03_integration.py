"""H03: exercise actual territorial resolution and S02 routing, no private data."""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from unittest.mock import AsyncMock, patch
import territory_registry as tr
import automatic_assistant as a
import institutional_sources as s

def row(code,city,dept):
    return dict(divipola=code,municipality=city,department=dept,territory_type="Municipio")

RECORDS=[row("52835","San Andrés de Tumaco","Nariño"),row("63001","Armenia","Quindío"),
         row("05059","Armenia","Antioquia"),row("11001","Bogotá D.C.","Bogotá D.C."),
         row("86568","Puerto Asís","Putumayo"),row("97001","Mitú","Vaupés"),
         row("12345","Santa Rosa de Ejemplo","Ejemplo")]

def test_territorial_variants_and_negative_controls():
    for value,code in [("Tumaco","52835"),("Tumaco, Nariño","52835"),
                       ("San Andrés de Tumaco, Nariño","52835"),("52835","52835"),
                       ("Armenia, Antioquia","05059"),("Bogota","11001"),
                       ("Puerto Asis, Putumayo","86568"),("Mitu","97001")]:
        result=tr.resolve_from_records(value,RECORDS)
        assert result["status"]=="FOUND",value
        assert result["identity"]["divipola"]==code
    for value in ("Armenia","Tumaco, Caldas","Puerto Asís, Nariño","Ejemplo"):
        assert tr.resolve_from_records(value,RECORDS)["identity"] is None
    assert tr.resolve_from_records("Armenia",RECORDS)["status"]=="AMBIGUOUS_MUNICIPALITY"
    assert tr.resolve_from_records("Ejemplo",RECORDS)["status"]=="CONFIRM_TERRITORY"

async def exercise(records, context, live=False):
    req=a.GuidedRequest(field="caracteristicas_culturales",context=context,
        text="Investiga las principales prácticas musicales y dancísticas de Tumaco, los procesos de formación artística, las organizaciones culturales y los antecedentes institucionales.",
        include_web=True,generate=False)
    html=b'<meta property="article:published_time" content="2024-04-11"><div>En Tumaco (Narino) se realizaron actividades de formacion musical con estudiantes.</div>'
    from contextlib import ExitStack
    with ExitStack() as stack:
        stack.enter_context(patch.object(tr,"registry",new=AsyncMock(return_value=records)))
        stack.enter_context(patch.object(a,"research",new=AsyncMock(return_value={"sources":[],"errors":[]})))
        stack.enter_context(patch.object(a,"cultural_registry",new=AsyncMock(return_value=None)))
        if not live:
            stack.enter_context(patch.object(s,"public_html",new=AsyncMock(side_effect=lambda url,article=True:html if article and url==s.SEEDS[("tumaco","narino")][0][0] else None)))
        model=stack.enter_context(patch.object(a,"assist",new=AsyncMock()))
        result=await a.guide(req,"synthetic-test")
        model.assert_not_awaited()
        return result

def test_s02_orchestrator_routes_real_extractor():
    result=asyncio.run(exercise(RECORDS,"Tumaco, Nariño"))
    assert result["territory"]["divipola"]=="52835"
    assert result["evidence_input_status"]=="LIVE_PASSAGES_AVAILABLE"
    assert any(p.get("sha256") for p in result["municipal_references"])
    invalid=asyncio.run(exercise(RECORDS,"Tumaco, Caldas"))
    assert invalid["territory"] is None
    assert invalid["evidence_input_status"]=="NO_LIVE_PASSAGES"

async def live_check():
    import json
    records=await tr.fetch_registry()
    for r in records:
        result=tr.resolve_from_records(r["divipola"],records)
        assert result["identity"]["divipola"]==r["divipola"]
    result=await exercise(records,"Tumaco, Nariño",live=True)
    print("H03_INTEGRATION "+json.dumps({"catalog_rows":len(records),"territory":result["territory"],
        "resolution":result["territory_resolution"],"evidence":result["evidence_input_status"],
        "passages":len(result["municipal_references"]),"model_calls":0},ensure_ascii=False))
    assert result["territory"]["divipola"]=="52835"
    assert result["evidence_input_status"]=="LIVE_PASSAGES_AVAILABLE"

if __name__=="__main__":
    asyncio.run(live_check())
