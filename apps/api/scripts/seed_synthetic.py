"""Generate synthetic intake notes, payer eligibility, and status events.

Why synthetic? The OSM dump gives us geo + amenity tags but not free-text
intake notes (the 'messy 10k records' the challenge brief points at). We
synthesise representative notes to demo the local-LLM extraction path.

Notes are embedded with `bge-m3` via local Ollama — zero PHI egress.
If the embed model is not yet pulled, intake notes are still inserted
(without embeddings) so semantic search degrades gracefully.

Run:
    uv run python -m scripts.seed_synthetic
"""

from __future__ import annotations

import asyncio
import random
import sys

from rich.console import Console
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
from aarogya_api.local_llm import embed  # noqa: E402
from aarogya_api.settings import settings  # noqa: E402

console = Console()
random.seed(42)


# Synthetic intake notes drawn from realistic patterns: handwritten OPD
# slips, ASHA-worker WhatsApp updates, and admin spreadsheets — multilingual.
INTAKE_TEMPLATES = [
    ("en", "Pt 54M c/o chest pain x 2 days. ECG done — sinus tachy. Referred for echo. Cardiology OPD Tue/Thu only."),
    ("en", "ANC visit, G2P1, 28 wk. BP 140/90. USG machine working. Iron + folic given. Next visit 2 wk."),
    ("en", "Dialysis machine #2 down since Mon. Only 1 chair functional. ~6 patients waiting today."),
    ("en", "Ayushman Bharat empanelled. Cataract surgery list — 12 booked for Sat. Phaco available."),
    ("en", "Snake bite case received 11pm. ASV 4 vials given. Referred to district hosp for ICU — no vent here."),
    ("en", "Vaccine fridge temp logged at 6.5C. BCG, OPV, Penta-3 stocks adequate. MMR low — 4 doses left."),
    ("hi", "मरीज को बुखार और खांसी 5 दिन से। X-ray मशीन खराब है। टीबी की जांच के लिए जिला अस्पताल भेजा।"),
    ("hi", "गर्भवती महिला, सिजेरियन की जरूरत। यहाँ ओटी नहीं है। 108 बुलाई गई।"),
    ("hi", "डायलिसिस की सुविधा है, हफ्ते में सोम-बुध-शुक्र। आयुष्मान भारत में फ्री।"),
    ("ta", "நோயாளி பெண் 32 வயது, வயிற்று வலி. அல்ட்ராசவுண்ட் செய்யப்பட்டது. கோல்ஸ்டோன் கண்டறியப்பட்டது."),
    ("en", "MRI not available. Patient sent to BMC Hospital Bangalore for brain MRI w contrast."),
    ("en", "Insulin (regular + NPH) in stock. Glucometer strips low. HbA1c testing offered Mon/Wed."),
    ("en", "Free OPD Tue/Thu/Sat. CGHS empanelled. Ortho clinic Wed only. Plaster room functional."),
    ("en", "Blood bank: O+ 12u, B+ 8u, A+ 5u, AB+ 2u, O- 0u. Critical: O- needed urgently."),
    ("en", "Eye camp held Sat — 87 screened. 14 referred for cataract surg. Spectacles distributed: 42."),
    ("en", "Mental health OPD started Mon by Dr Rao. Antidepressants stocked. Counselling room available."),
    ("en", "Pediatric ICU 4 beds, all occupied. Ventilator x1 in use (DKA case). NICU 6 beds, 4 occupied."),
    ("en", "Methadone OST clinic, Mon-Fri 10-1. ~30 active patients. Referrals welcome."),
    ("en", "Trauma — RTA, 26M, GCS 9, head injury. CT brain done — SDH. Neurosurg referral, transferred to NIMHANS."),
    ("hi", "कैंसर कीमोथेरेपी की सुविधा है। ऑन्कोलॉजी क्लिनिक मंगलवार और शनिवार। आयुष्मान भारत स्वीकार।"),
]

PAYER_MIX = {
    "ayushman-bharat": 0.55,    # most rural/secondary facilities are empanelled
    "cghs":            0.20,
    "esi":             0.15,
    "private":         0.85,    # most accept private cash/insurance
    "cash":            0.95,
}

STATUS_TEMPLATES = [
    ("Dialysis", "available", "asha-worker", "Both chairs working today"),
    ("Dialysis", "down",      "staff",       "Machine #2 compressor failure, eta repair Wed"),
    ("MRI",      "queue-long","patient-sms", "Wait time ~3 hours per OPD slip"),
    ("ECG",      "available", "staff",       "Tech available 9-5"),
    ("Ventilator","down",     "asha-worker", "Only ICU vent under maintenance"),
    ("Insulin",  "available", "staff",       "Regular + NPH in stock"),
    ("Vaccination","available","asha-worker","DPT, BCG, MMR all in stock; OPV low"),
    ("Cataract surgery","queue-long","staff","30+ on waiting list, next slots in 3 wk"),
]


async def main():
    s = settings()
    engine = create_async_engine(s.database_url, future=True)

    # 1. Pull a sample of locations to attach notes/payers/status to.
    async with engine.begin() as conn:
        loc_rows = (await conn.execute(text(
            "SELECT id, name FROM fhir_location ORDER BY random() LIMIT 200"
        ))).all()
    if not loc_rows:
        console.log("[red]No facilities — run ingest_osm.py first.")
        return
    console.log(f"Sampled [bold]{len(loc_rows)}[/] facilities for synthetic enrichment.")

    # 2. Build intake notes — assign ~3 notes per template across random facilities.
    notes_to_insert: list[dict] = []
    for lang, txt in INTAKE_TEMPLATES:
        for _ in range(3):
            loc_id = random.choice(loc_rows)[0]
            notes_to_insert.append({"location_id": loc_id, "text": txt, "language": lang})

    # 3. Embed (try; degrade gracefully if model not yet pulled)
    try:
        console.log(f"Embedding {len(notes_to_insert)} notes via local [bold]bge-m3[/]…")
        vecs = await embed([n["text"] for n in notes_to_insert])
        for n, v in zip(notes_to_insert, vecs):
            n["embedding"] = str(v)  # pgvector accepts string '[..]' literal
        console.log(f"[green]Embeddings done.")
    except Exception as e:
        console.log(f"[yellow]Embed unavailable ({e!r}); inserting notes without embeddings.")
        for n in notes_to_insert:
            n["embedding"] = None

    # 4. Build payer assignments
    payer_rows: list[dict] = []
    for loc_id, _ in loc_rows:
        for payer, prob in PAYER_MIX.items():
            if random.random() < prob:
                payer_rows.append({
                    "location_id": loc_id,
                    "payer": payer,
                    "accepted": True,
                    "evidence_source": "synthetic-mock",
                })

    # 5. Status events — sample 60 facilities, assign 1-2 status events each
    status_rows: list[dict] = []
    for loc_id, _ in random.sample(loc_rows, k=min(60, len(loc_rows))):
        for tmpl in random.sample(STATUS_TEMPLATES, k=random.randint(1, 2)):
            svc, status, by, note = tmpl
            status_rows.append({
                "location_id": loc_id,
                "service_name": svc,
                "status": status,
                "reported_by": by,
                "note": note,
            })

    # 6. Persist
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM intake_note"))
        await conn.execute(text("DELETE FROM facility_payer"))
        await conn.execute(text("DELETE FROM facility_status_event"))

        if any(n.get("embedding") for n in notes_to_insert):
            await conn.execute(text("""
                INSERT INTO intake_note (location_id, text, language, embedding)
                VALUES (:location_id, :text, :language, CAST(:embedding AS vector))
            """), notes_to_insert)
        else:
            await conn.execute(text("""
                INSERT INTO intake_note (location_id, text, language)
                VALUES (:location_id, :text, :language)
            """), [{k: n[k] for k in ("location_id","text","language")} for n in notes_to_insert])

        await conn.execute(text("""
            INSERT INTO facility_payer (location_id, payer, accepted, evidence_source)
            VALUES (:location_id, :payer, :accepted, :evidence_source)
            ON CONFLICT DO NOTHING
        """), payer_rows)

        await conn.execute(text("""
            INSERT INTO facility_status_event (location_id, service_name, status, reported_by, note)
            VALUES (:location_id, :service_name, :status, :reported_by, :note)
        """), status_rows)

    console.log(f"[green]Inserted {len(notes_to_insert)} notes, "
                f"{len(payer_rows)} payer rows, {len(status_rows)} status events.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
