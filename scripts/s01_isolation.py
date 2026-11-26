"""S01: real two-user REST/RLS isolation. Run only against a disposable local stack."""
import os
import secrets
import httpx

URL = os.environ["VERTICE_TEST_SUPABASE_URL"]
KEY = os.environ["VERTICE_TEST_SUPABASE_PUBLIC_KEY"]
if URL != "http://127.0.0.1:54321" or os.environ.get("VERTICE_AUTH_MODE") != "isolated":
    raise RuntimeError("Local isolated environment required")

def check(ok, label):
    if not ok:
        raise AssertionError(label)
    print("PASS " + label)

def signup(c):
    email = "s01-" + secrets.token_hex(8) + "@example.com"
    password = secrets.token_urlsafe(32)
    headers = {"apikey":KEY}
    r = c.post(URL+"/auth/v1/signup",headers=headers,json={"email":email,"password":password})
    check(r.status_code in (200,201),"synthetic signup")
    token = r.json().get("access_token")
    if not token:
        r = c.post(URL+"/auth/v1/token?grant_type=password",headers=headers,json={"email":email,"password":password})
        check(r.status_code==200,"synthetic login")
        token=r.json()["access_token"]
    headers.update(Authorization="Bearer "+token,Prefer="return=representation")
    r = c.get(URL+"/auth/v1/user",headers=headers)
    check(r.status_code==200,"real authenticated identity")
    return r.json()["id"],headers

def req(c,h,method,table,params=None,data=None):
    return c.request(method,URL+"/rest/v1/"+table,headers=h,params=params,json=data)

def row(c,h,table,data,label):
    r=req(c,h,"POST",table,data=data)
    check(r.status_code==201 and len(r.json())==1,label)
    return r.json()[0]["id"]

def deny(r,label):
    # RLS may hide inaccessible rows without returning an HTTP error.
    check(r.status_code in (401,403) or (r.status_code==200 and r.json()==[]),label)

def select(c,h,t,id):
    return req(c,h,"GET",t,{"id":"eq."+id})

def main():
    with httpx.Client(timeout=20,trust_env=False) as c:
        a,ha=signup(c); b,hb=signup(c)
        check(a!=b,"distinct users")
        owned={}
        for label,user,h in (("A",a,ha),("B",b,hb)):
            p=row(c,h,"projects",{"title":"synthetic "+label},label+" create own project")
            s=row(c,h,"sections",{"project_id":p,"code":"S01","data":{"synthetic":label}},label+" create own section")
            e=row(c,h,"evidence",{"project_id":p,"text":"synthetic "+label,"source_kind":"observation"},label+" create own evidence")
            owned[label]={"projects":p,"sections":s,"evidence":e}
        # The browser uses POST upsert on (project_id, code), not only PATCH.
        # Check the actual operation with the same authenticated identities.
        for label,user,h,other in (("A",a,ha,"B"),("B",b,hb,"A")):
            upsert={**h,"Prefer":"resolution=merge-duplicates,return=representation"}
            params={"on_conflict":"project_id,code"}
            own={"project_id":owned[label]["projects"],"code":"S01","data":{"synthetic":label}}
            r=req(c,upsert,"POST","sections",params,own)
            check(r.status_code in (200,201) and len(r.json())==1 and r.json()[0]["id"]==owned[label]["sections"],label+" own section upsert")
            foreign={"project_id":owned[other]["projects"],"code":"S01","data":{"synthetic":"forged"}}
            deny(req(c,upsert,"POST","sections",params,foreign),label+" cannot upsert foreign section")
        for label,user,h,other,other_user in (("A",a,ha,"B",b),("B",b,hb,"A",a)):
            for table,own in owned[label].items():
                visible=req(c,h,"GET",table)
                check(visible.status_code==200 and {r["id"] for r in visible.json()}=={own},label+" list contains only own "+table)
                foreign=owned[other][table]
                r=select(c,h,table,own)
                check(r.status_code==200 and len(r.json())==1,label+" read own "+table)
                deny(select(c,h,table,foreign),label+" cannot read foreign "+table)
                update={"title":"updated"} if table=="projects" else ({"data":{"synthetic":"updated"}} if table=="sections" else {"text":"updated"})
                deny(req(c,h,"PATCH",table,{"id":"eq."+foreign},update),label+" cannot update foreign "+table)
                deny(req(c,h,"DELETE",table,{"id":"eq."+foreign}),label+" cannot delete foreign "+table)
                r=req(c,h,"PATCH",table,{"id":"eq."+own},update)
                check(r.status_code==200 and len(r.json())==1,label+" update own "+table)
                deny(req(c,h,"PATCH",table,{"id":"eq."+own},{"user_id":other_user}),label+" cannot reassign owner "+table)
                if table!="projects":
                    deny(req(c,h,"PATCH",table,{"id":"eq."+own},{"project_id":owned[other]["projects"]}),label+" cannot move "+table+" to foreign project")
            deny(req(c,h,"POST","projects",data={"title":"forged","user_id":other_user}),label+" cannot insert forged owner")
            deny(req(c,h,"POST","sections",data={"project_id":owned[other]["projects"],"code":"S02","data":{}}),label+" cannot insert foreign section")
            deny(req(c,h,"POST","evidence",data={"project_id":owned[other]["projects"],"text":"forged","source_kind":"observation"}),label+" cannot insert foreign evidence")
        for table,oid in owned["A"].items():
            anonymous={"apikey":KEY,"Prefer":"return=representation"}
            deny(select(c,anonymous,table,oid),"anonymous cannot read "+table)
            deny(req(c,anonymous,"DELETE",table,{"id":"eq."+oid}),"anonymous cannot delete "+table)
            update={"title":"anonymous"} if table=="projects" else ({"data":{"anonymous":True}} if table=="sections" else {"text":"anonymous"})
            deny(req(c,anonymous,"PATCH",table,{"id":"eq."+oid},update),"anonymous cannot update "+table)
            payload={"title":"anonymous"} if table=="projects" else ({"project_id":owned["A"]["projects"],"code":"S03"} if table=="sections" else {"project_id":owned["A"]["projects"],"source_kind":"observation","text":"anonymous"})
            deny(req(c,anonymous,"POST",table,data=payload),"anonymous cannot insert "+table)
            invalid={**anonymous,"Authorization":"Bearer invalid-synthetic-token"}
            deny(select(c,invalid,table,oid),"invalid token denied "+table)
        # Verify foreign writes did not mutate or remove the other user's rows.
        for label,user,h in (("A",a,ha),("B",b,hb)):
            for table in ("evidence","sections","projects"):
                oid=owned[label][table]
                r=select(c,h,table,oid)
                check(r.status_code==200 and len(r.json())==1,label+" row intact "+table)
                item=r.json()[0]
                check(item["user_id"]==user,label+" ownership intact "+table)
                if table=="projects":
                    check(item["title"]=="updated",label+" project content intact")
                else:
                    check(item["project_id"]==owned[label]["projects"],label+" parent intact "+table)
                    check(item["data"]=={"synthetic":"updated"} if table=="sections" else item["text"]=="updated",label+" child content intact "+table)
                r=req(c,h,"DELETE",table,{"id":"eq."+oid})
                check(r.status_code==200 and len(r.json())==1,label+" delete own "+table)
    print("S01 REAL A/B ISOLATION PASS")

if __name__=="__main__":
    main()
