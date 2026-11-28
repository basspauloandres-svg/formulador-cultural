"""Bounded public institutional discovery. Candidates are never evidence."""
from __future__ import annotations
import asyncio
from collections import OrderedDict
from hashlib import sha256
from html.parser import HTMLParser
import re
from time import monotonic
from urllib.parse import urlsplit, urljoin
import httpx
from territory_registry import normalized
from prompt_boundary import contains_directive

# Reviewed entry points, not an exhaustive directory or a stored factual answer.
NATIONAL_PORTALS = (("https://www.mincultura.gov.co/", "Ministerio de las Culturas, las Artes y los Saberes"),)
NATIONAL_ARTICLE_HOSTS = frozenset({"mincultura.gov.co", "www.mincultura.gov.co", "mng.mincultura.gov.co"})
PORTALS = {"narino": (("https://narino.gov.co/noticias/", "Gobernación de Nariño"),), "caldas": (
    ("https://educacion.caldas.gov.co/sala-de-prensa/articles-category-blog", "Secretaría de Educación de Caldas"),
    ("https://caldas.gov.co/noticias-gobernacion/149-educacion", "Gobernación de Caldas"),
)}
SEEDS = {("tumaco", "narino"): (
    ("https://mng.mincultura.gov.co/prensa/noticias/Paginas/sonidos-para-la-construccion-de-paz-primera-dotacion-instrumentos-tumaco.aspx", "Ministerio de las Culturas, las Artes y los Saberes"),
    ("https://bancodecontenidos.mincultura.gov.co/Comunicacion-Territorio/pcfsur.html", "Banco de Contenidos del Ministerio de las Culturas"),
    ("https://normograma.mincultura.gov.co/compilacion/docs/resolucion_mincultura_1645_2010.htm", "Ministerio de las Culturas"),
), ("neira", "caldas"): (
    ("https://educacion.caldas.gov.co/sala-de-prensa/articles-category-blog/neira-villamaria-y-aguadas-ocuparon-los-primeros-lugares-en-la-version-43-del-concurso-departamental-de-bandas-estudiantiles-de-musica", "Secretaría de Educación de Caldas"),
    ("https://caldas.gov.co/noticias-gobernacion/15213-con-alegria-y-mucho-orgullo-neira-recibio-a-la-banda-sinfonica-que-gano-el-festi-band-en-republica-dominicana-gobernacion-anuncio-recursos-para-impulsarla", "Gobernación de Caldas"),
)}
HOSTS = {"educacion.caldas.gov.co", "caldas.gov.co", "www.caldas.gov.co", "mincultura.gov.co", "www.mincultura.gov.co", "mng.mincultura.gov.co", "narino.gov.co", "bancodecontenidos.mincultura.gov.co", "normograma.mincultura.gov.co"}
ECONOMIC_PROFILES = {("aguadas", "caldas"): (
    "https://caldas.gov.co/index.php/component/k2/item/4-municipio-de-aguadas",
    "Gobernación de Caldas", "Municipio de Aguadas",
)}
ECONOMIC_PROFILE_URLS = frozenset(profile[0] for profile in ECONOMIC_PROFILES.values())
ECONOMIC_TERMS = re.compile(r"\b(?:econom\w*|agropecuari\w*|agricultur\w*|ganader\w*|cultiv\w*|aguacat\w*|cafe\w*|inversion\w*|produccion)\b")
TERMS = ("marimba", "canto", "banda", "music", "artist", "cultur", "danza", "teatro", "biblioteca", "patrimonio", "festival")
MAX_BYTES = 2_500_000
TTL = 3600
CACHE = OrderedDict()
INFLIGHT = {}
LOCK = asyncio.Lock()
DOWNLOADS = asyncio.Semaphore(3)

def safe_url(url, article=True):
    try:
        p=urlsplit(url)
        if not (p.scheme=="https" and p.hostname in HOSTS and p.port in (None,443)
                and not p.username and not p.password and not p.query and not p.fragment
                and re.fullmatch(r"/[a-zA-Z0-9/_.-]*",p.path)):
            return False
        if not article:
            return any(url==u for u,_ in NATIONAL_PORTALS) or any(url==u for values in PORTALS.values() for u,_ in values)
        if any(url == u for key, entries in SEEDS.items() if key != ("neira", "caldas") for u, _ in entries):
            return True
        if p.hostname == "narino.gov.co":
            return bool(re.fullmatch(r"/noticias/[a-z0-9-]+/?", p.path))
        if p.hostname == "mng.mincultura.gov.co":
            return bool(re.fullmatch(r"/prensa/noticias/Paginas/[a-zA-Z0-9-]+\.aspx", p.path))
        if url in ECONOMIC_PROFILE_URLS:
            return True
        if p.hostname in {"mincultura.gov.co","www.mincultura.gov.co"}:
            return bool(re.fullmatch(r"/noticias/Paginas/(?!default\.aspx$)[a-zA-Z0-9-]+\.aspx",p.path))
        return bool(re.fullmatch(r"/sala-de-prensa/articles-category-blog/[a-z0-9-]+",p.path)
                    or re.fullmatch(r"/(?:index.php/)?noticias-gobernacion/(?:[0-9]+-[a-z-]+/)?[0-9]+-[a-z0-9-]+",p.path))
    except ValueError:
        return False

def has_private_contact(text):
    return bool(re.search(r"(?i)\b(?:contacto|celular|tel[eé]fono|whatsapp)\s*[:.]|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?<!\d)(?:\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)",text))

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip=0; self.p=False; self.buf=[]; self.paragraphs=[]
        self.links=[]; self.href=None; self.link=[]; self.dates=[]; self.visible=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ("script","style","noscript"): self.skip+=1
        if self.skip: return
        if tag=="p": self.p=True; self.buf=[]
        if tag=="a": self.href=a.get("href"); self.link=[]
        if tag=="time" and a.get("datetime"): self.dates.append(a["datetime"])
        if tag=="meta" and (a.get("property") or a.get("name")) in ("article:published_time","datePublished"):
            self.dates.append(a.get("content",""))
    def handle_data(self,data):
        if self.skip: return
        if len(self.visible)<500: self.visible.append(data)
        if self.p: self.buf.append(data)
        if self.href: self.link.append(data)
    def handle_endtag(self,tag):
        if tag in ("script","style","noscript"): self.skip=max(0,self.skip-1)
        if self.skip: return
        if tag=="p" and self.p:
            self.paragraphs.append(" ".join("".join(self.buf).split())); self.p=False
        if tag=="a" and self.href:
            self.links.append((self.href," ".join("".join(self.link).split()))); self.href=None

def relevant(text,city):
    n=normalized(text)
    return bool(re.search(r"\b"+re.escape(city)+r"\b",n) and any(t in n for t in TERMS))

def date_from(page):
    for value in page.dates:
        m=re.match(r"(20\d{2})-(\d{2})-(\d{2})",value)
        if m:
            try:
                from datetime import date
                return date.fromisoformat(m.group(0)).isoformat()
            except ValueError: pass
    months="enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()
    value=normalized(" ".join(page.visible))
    m=re.search(r"\b(\d{1,2}) (?:de )?("+"|".join(months)+r") (?:de )?(20\d{2})\b",value)
    if m:
        try:
            from datetime import date
            return date(int(m[3]),months.index(m[2])+1,int(m[1])).isoformat()
        except ValueError: pass
    m=re.search(r"\b(\d{1,2})-(\d{1,2})-(20\d{2})\b",value)
    if m:
        try:
            from datetime import date
            return date(int(m[3]),int(m[2]),int(m[1])).isoformat()
        except ValueError: pass
    return None

async def _download(url,article):
    try:
        async with DOWNLOADS:
            async with asyncio.timeout(8):
                async with httpx.AsyncClient(timeout=6,follow_redirects=False,trust_env=False) as c:
                    async with c.stream("GET",url,headers={"Accept":"text/html","User-Agent":"VerticeResearchAssistant/0.5"}) as r:
                        if r.status_code!=200 or "html" not in r.headers.get("content-type","").lower(): return None
                        data=bytearray()
                        async for chunk in r.aiter_bytes():
                            data.extend(chunk)
                            if len(data)>MAX_BYTES: return None
                        return bytes(data)
    except (httpx.HTTPError,TimeoutError): return None

async def _load(key,url,article):
    try:
        data=await _download(url,article)
        if data:
            async with LOCK:
                CACHE[key]=(monotonic(),data)
                CACHE.move_to_end(key)
                while len(CACHE)>24: CACHE.popitem(last=False)
        return data
    finally:
        async with LOCK: INFLIGHT.pop(key,None)

async def public_html(url,article=True):
    if not safe_url(url,article): return None
    key=(url,article)
    async with LOCK:
        old=CACHE.get(key)
        if old and monotonic()-old[0]<TTL: return old[1]
        if key not in INFLIGHT:
            if len(INFLIGHT)>=12: return None
            INFLIGHT[key]=asyncio.create_task(_load(key,url,article))
        task=INFLIGHT[key]
    return await asyncio.shield(task)

def parse(data):
    page=Page()
    page.feed(data.decode("utf-8",errors="replace"))
    return page

async def economic_profile_passages(key, text):
    profile = ECONOMIC_PROFILES.get(key)
    if not profile or not ECONOMIC_TERMS.search(normalized(text)):
        return []
    url, publisher, title = profile
    data = await public_html(url)
    if not data:
        return []
    page = parse(data)
    date = date_from(page)
    if not date or normalized(title) not in normalized(" ".join(page.visible)):
        return []
    for number, paragraph in enumerate(page.paragraphs, 1):
        if has_private_contact(paragraph) or contains_directive(paragraph):
            continue
        for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
            text = normalized(sentence)
            if 45 <= len(sentence) <= 420 and "actividad economica" in text and ECONOMIC_TERMS.search(text):
                return [{"source_id": "official-" + sha256(url.encode()).hexdigest()[:16],
                    "title": title, "publisher": publisher, "url": url,
                    "locator": f"Párrafo HTML {number}", "sha256": sha256(data).hexdigest(),
                    "excerpt": sentence, "category": "PERFIL_ECONOMICO",
                    "passage_status": "EXCERPT_FOUND_CLAIM_UNVERIFIED",
                    "scope_warning": "Perfil fechado; no acredita por sí solo cambios recientes, cifras vigentes ni origen de inversiones.",
                    "publication_date": date, "publication_year": int(date[:4])}]
    return []

def article_passages(data,url,publisher,city,department=None):
    page=parse(data); date=date_from(page)
    # Undated pages remain candidates, not dated live evidence.
    if url == "https://normograma.mincultura.gov.co/compilacion/docs/resolucion_mincultura_1645_2010.htm":
        date = "2010-07-31"
    if not date and url != "https://bancodecontenidos.mincultura.gov.co/Comunicacion-Territorio/pcfsur.html": return []
    result=[]
    blocks = [(f"Párrafo HTML {i}", p) for i,p in enumerate(page.paragraphs,1)]
    # Shared extraction strategy for approved national article paths; never portal pages.
    # Require both territorial names in the extracted sentence below.
    if safe_url(url) and urlsplit(url).hostname in NATIONAL_ARTICLE_HOSTS and department:
        blocks.extend((f"Nodo de texto HTML {i}", p.strip())
                      for i,p in enumerate(page.visible,1)
                      if 45 <= len(p.strip()) <= 1500)
    for locator,paragraph in blocks:
        if not relevant(paragraph,city) or has_private_contact(paragraph) or contains_directive(paragraph): continue
        # Complete sentences only, never manufacture a quotation by redacting words.
        sentences=re.split(r"(?<=[.!?])\s+",paragraph)
        for sentence in sentences:
            if not 45<=len(sentence)<=420 or not relevant(sentence,city): continue
            if department and urlsplit(url).hostname in NATIONAL_ARTICLE_HOSTS and not re.search(r"\b"+re.escape(department)+r"\b",normalized(sentence)): continue
            result.append({"source_id":"official-"+sha256(url.encode()).hexdigest()[:16],
                "title":"Publicación institucional · "+(date or "fecha no determinada"),"publisher":publisher,"url":url,
                "locator":locator,"sha256":sha256(data).hexdigest(),
                "excerpt":sentence,"category":"PRACTICAS_MUSICALES",
                "passage_status":"EXCERPT_FOUND_CLAIM_UNVERIFIED",
                "scope_warning":"Publicación fechada; no acredita vigencia posterior." if date else "Fecha no determinada; no acredita vigencia actual.",
                "publication_date":date,"publication_year":int(date[:4]) if date else None})
            return result
    return result

async def institutional_passages(key,categories,web_candidates=()):
    if not key or "PRACTICAS_MUSICALES" not in categories: return []
    city,dept=key
    portals=NATIONAL_PORTALS+PORTALS.get(dept,())
    candidates=list(SEEDS.get(key,()))
    # Known candidate downloads and portal discovery overlap in time.
    seed_tasks=[asyncio.create_task(public_html(url)) for url,_ in candidates]
    pages=await asyncio.gather(*(public_html(url,False) for url,_ in portals))
    for (base,publisher),data in zip(portals,pages):
        if not data: continue
        for href,title in parse(data).links:
            url=urljoin(base,href)
            if safe_url(url) and relevant(title+" "+urlsplit(url).path,city):
                candidates.append((url,publisher))
    for item in web_candidates:
        url=item.get("url","")
        if not safe_url(url) or not relevant(item.get("title","")+" "+item.get("summary",""),city): continue
        host=urlsplit(url).hostname
        if host in NATIONAL_ARTICLE_HOSTS:
            candidates.append((url,NATIONAL_PORTALS[0][1]))
        elif dept=="narino" and host=="narino.gov.co":
            candidates.append((url,"Gobernación de Nariño"))
        elif dept=="caldas" and host in {"educacion.caldas.gov.co","caldas.gov.co","www.caldas.gov.co"}:
            candidates.append((url,"Secretaría de Educación de Caldas" if host=="educacion.caldas.gov.co" else "Gobernación de Caldas"))
    # Deduplicate by URL, not by publisher label; prefer one discovered candidate
    # even when reviewed seed lists fill the budget.
    seeds=list(SEEDS.get(key,()))
    discovered=[entry for entry in candidates if entry[0] not in {u for u,_ in seeds}]
    ordered=discovered[:1]+seeds+discovered[1:]
    unique=list({u:(u,p) for u,p in reversed(ordered)}.values())[::-1][:4]
    seed_data=await asyncio.gather(*seed_tasks)
    seed_pages=dict(zip(SEEDS.get(key,()),seed_data))
    async def retrieve(entry):
        return seed_pages[entry] if entry in seed_pages else await public_html(entry[0])
    pages=await asyncio.gather(*(retrieve(entry) for entry in unique))
    found=[]
    for (url,publisher),data in zip(unique,pages):
        if data: found.extend(article_passages(data,url,publisher,city,dept))
    return sorted(found,key=lambda r:r["publication_date"] or "",reverse=True)[:2]
