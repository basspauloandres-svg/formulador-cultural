"""Disposable local stack only. Application-data round trip, not a DB disaster recovery.

No hosted credentials, no production data, no disk artifacts containing auth
tokens. Restore exact synthetic rows under their original authenticated owner;
verify foreign access stays denied. Never run against a shared environment.
"""
from hashlib import sha256
import json
from time import monotonic
import httpx
from s01_isolation import signup, req, row, deny, select, check

TABLES=("projects","sections","evidence")

def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode("utf-8")

def snapshot(client, headers, project_id):
    result={}
    for table in TABLES:
        params={"id":"eq."+project_id} if table=="projects" else {"project_id":"eq."+project_id}
        response=req(client,headers,"GET",table,params)
        check(response.status_code==200,"P01 read synthetic "+table)
        result[table]=sorted(response.json(),key=lambda x:x["id"])
    return result

def main():
    with httpx.Client(timeout=20,trust_env=False) as c:
        a,ha=signup(c)
        b,hb=signup(c)
        project=row(c,ha,"projects",{"title":"P01 synthetic restoration"},"P01 create synthetic project A")
        other=row(c,hb,"projects",{"title":"P01 synthetic unaffected B"},"P01 create synthetic project B")
        for n in range(1,17):
            row(c,ha,"sections",{"project_id":project,"code":f"S{n:02d}",
                  "data":{"synthetic":True,"section":n,"unknown":None,"zero":0}},
                "P01 create synthetic section "+str(n))
        for i,text in enumerate(("Synthetic observation A","Contradictory synthetic observation B")):
            row(c,ha,"evidence",{"project_id":project,"section_code":"S04",
                  "text":text,"source_kind":"observation",
                  "verification_status":"por_verificar","verified":False,
                  "notes":"Unresolved synthetic discrepancy"},"P01 synthetic evidence "+str(i))
        before=snapshot(c,ha,project)
        unaffected=snapshot(c,hb,other)
        check([len(before[t]) for t in TABLES]==[1,16,2],"P01 full section and evidence count")
        check(all(r["user_id"]==a for t in TABLES for r in before[t]),"P01 original ownership")
        backup=canonical(before)
        digest=sha256(backup).hexdigest()
        # Backup is kept in memory only. Deletion is restricted to the random
        # synthetic fixture just created in the disposable stack.
        start=monotonic()
        response=req(c,ha,"DELETE","projects",{"id":"eq."+project})
        check(response.status_code==200 and len(response.json())==1,"P01 delete synthetic fixture only")
        check(all(not rows for rows in snapshot(c,ha,project).values()),"P01 cascade removal observed")
        restored=json.loads(backup)
        for table in TABLES:
            deny(req(c,hb,"POST",table,data=restored[table][0]),"P01 foreign restore denied "+table)
            for item in restored[table]:
                response=req(c,ha,"POST",table,data=item)
                check(response.status_code==201 and len(response.json())==1,"P01 restore "+table)
        after=snapshot(c,ha,project)
        check(canonical(after)==backup,"P01 exact row values and identifiers restored")
        check(sha256(canonical(after)).hexdigest()==digest,"P01 exact restored digest")
        for table in TABLES:
            for item in before[table]:
                deny(select(c,hb,table,item["id"]),"P01 restored foreign row remains invisible "+table)
        check(snapshot(c,hb,other)==unaffected,"P01 unrelated project unchanged")
        print("P01 APPLICATION_DATA_ROUNDTRIP PASS rows=19 restore_elapsed_ms="+str(round((monotonic()-start)*1000)))
        # Remove only the two synthetic projects created here.
        for headers,pid in ((ha,project),(hb,other)):
            response=req(c,headers,"DELETE","projects",{"id":"eq."+pid})
            check(response.status_code==200 and len(response.json())==1,"P01 synthetic cleanup")

if __name__=="__main__":
    main()
