"""Contrato nacional DIVIPOLA: código de cinco dígitos, homónimos y fallos seguros."""
import asyncio
import os
import sys
from unittest.mock import AsyncMock, patch

import pytest
sys.path.insert(0, os.path.dirname(__file__))
import territory_registry as registry


def row(code, name, dept, dept_code, kind="Municipio"):
    return {"cod_mpio":code, "nom_mpio":name,
            "cod_dpto":dept_code,"dpto":dept,"tipo_municipio":kind}


def fixture_rows():
    data = []
    for n in range(1000):
        data.append(row("05"+f"{n:03d}", "PUEBLO "+str(n), "ANTIOQUIA","05"))
    for n in range(119):
        data.append(row("08"+f"{n:03d}", "VILLA "+str(n), "ATLÁNTICO","08"))
    # Exactamente 1122 filas, con tres controles de identidad DANE.
    data.extend([
        row("17873","VILLAMARÍA","CALDAS","17"),
        row("17486","NEIRA","CALDAS","17"),
        row("11001","BOGOTÁ, D.C.","BOGOTÁ, D.C.","11","Distrito"),
    ])
    return data


def test_full_dataset_coverage_and_preservation_of_leading_zeros():
    records=registry.parse_dataset(fixture_rows())
    assert len(records)==1122
    assert records[0]["divipola"]=="05000"
    assert next(x for x in records if x["divipola"]=="17873")["municipality"]=="VILLAMARÍA"
    assert all(x["status"]=="ADMINISTRATIVE_REGISTRY_MATCH" for x in records)


def test_dataset_rejects_partial_or_duplicate_download():
    with pytest.raises(ValueError,match="filas"):
        registry.parse_dataset(fixture_rows()[:700])
    data=fixture_rows()
    data[-1]["cod_mpio"]="17486"
    data[-1]["cod_dpto"]="17"
    with pytest.raises(ValueError,match="repetidos"):
        registry.parse_dataset(data)


def test_same_name_in_different_departments_needs_disambiguation():
    data=[
        registry.parse_row(row("05010","GRANADA","ANTIOQUIA","05")),
        registry.parse_row(row("50313","GRANADA","META","50")),
        registry.parse_row(row("25312","GRANADA","CUNDINAMARCA","25")),
    ]
    value=registry.resolve_from_records("Granada",data)
    assert value["status"]=="AMBIGUOUS_MUNICIPALITY"
    assert len(value["candidates"])==3
    specific=registry.resolve_from_records("Granada, Meta",data)
    assert specific["identity"]["divipola"]=="50313"
    assert registry.resolve_from_records("Granada, Caldas",data)["status"]=="NOT_FOUND"


def test_accents_prefix_and_non_municipalized_category():
    records=registry.parse_dataset(fixture_rows())
    assert registry.resolve_from_records("Municipio de Villamaria, Caldas",records)["identity"]["divipola"]=="17873"
    assert registry.resolve_from_records("Neira, Caldas",records)["identity"]["divipola"]=="17486"
    island=registry.parse_row(row("88001","SAN ANDRÉS","ARCHIPIÉLAGO DE SAN ANDRÉS","88","Isla"))
    assert island["territory_type"]=="Isla"


def test_no_invalid_department_or_code_is_silently_accepted():
    assert registry.parse_row(row("123","FAKE","CALDAS","17")) is None
    assert registry.parse_row(row("17873","VILLAMARÍA","ANTIOQUIA","05")) is None


def test_offline_registry_returns_explicit_unavailable():
    with patch.object(registry,"registry",new=AsyncMock(return_value=None)):
        result=asyncio.run(registry.resolve_territory("Anserma, Caldas"))
    assert result["status"]=="REGISTRY_UNAVAILABLE"
    assert result["identity"] is None


def test_registry_preserves_a_complete_cached_snapshot_on_network_failure():
    saved, refreshed=registry._REGISTRY,registry._REFRESHED_AT
    try:
        snapshot=registry.parse_dataset(fixture_rows())
        registry._REGISTRY=snapshot
        registry._REFRESHED_AT=0
        with patch.object(registry,"fetch_registry",new=AsyncMock(side_effect=ValueError("offline"))):
            cached=asyncio.run(registry.registry())
        assert cached is snapshot
    finally:
        registry._REGISTRY=saved
        registry._REFRESHED_AT=refreshed


def test_explicit_conflicts_preserve_homonyms_and_numbers():
    records=[registry.parse_row(row("05010","GRANADA","ANTIOQUIA","05")),
             registry.parse_row(row("50313","GRANADA","META","50"))]
    assert registry.explicit_conflicts("Granada y 50313 asistentes", "05010", records)==[]
    assert registry.explicit_conflicts("En Granada, Meta", "05010", records)[0]["divipola"]=="50313"
    assert registry.explicit_conflicts("Código DANE 50313", "05010", records)[0]["divipola"]=="50313"
    assert registry.explicit_conflicts("En Granada, Antioquia", "05010", records)==[]


def test_index_preserves_all_catalog_codes_names_and_ambiguity():
    rows=registry.parse_dataset(fixture_rows())
    rows=[r for r in rows if r["divipola"]!="05313"]
    rows.extend([registry.parse_row(row("05313","GRANADA","ANTIOQUIA","05")),
                 registry.parse_row(row("50313","GRANADA","META","50"))])
    queries=[r["divipola"] for r in rows]+["Granada","Granada Meta","Municipio de Villamaria Caldas","Bogotá D.C.","","no existe"]
    # Establish equivalence to the original scan, including ambiguous inputs.
    expected=[registry.resolve_from_records(q,rows) for q in queries]
    assert [registry.resolve_indexed(q,rows) for q in queries]==expected
    assert registry.resolve_indexed("Granada",rows)["status"]=="AMBIGUOUS_MUNICIPALITY"
    replacement=[r for r in rows if r["divipola"]!="50313"]
    assert registry.resolve_indexed("Granada",replacement)["identity"]["department"]=="ANTIOQUIA"
    assert registry.resolve_indexed("50313",replacement)["status"]=="NOT_FOUND"


def test_index_benchmark_reports_paired_cpu_time_without_network():
    from time import perf_counter
    from statistics import median
    rows=registry.parse_dataset(fixture_rows())
    queries=[r["divipola"] for r in rows[::11]]
    start=perf_counter()
    registry.resolve_indexed(queries[0],rows)
    build_ms=(perf_counter()-start)*1000
    scan=[]; indexed=[]
    for _ in range(3):
        start=perf_counter()
        a=[registry.resolve_from_records(q,rows) for q in queries]
        scan.append((perf_counter()-start)*1000)
        start=perf_counter()
        b=[registry.resolve_indexed(q,rows) for q in queries]
        indexed.append((perf_counter()-start)*1000)
        assert a==b
    print("DIVIPOLA_INDEX_BENCHMARK", {"records":len(rows),"queries":len(queries),"repetitions":3,
          "build_and_first_ms":round(build_ms,3),"scan_median_ms":round(median(scan),3),
          "indexed_median_ms":round(median(indexed),3),"model_calls":0,"network_calls":0})
