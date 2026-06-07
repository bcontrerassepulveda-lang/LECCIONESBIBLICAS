import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
DATA_DIR = Path(__file__).resolve().parent / "data"


META_KEYS = {
    "Tipo de lección": "type",
    "Libro": "book",
    "Porción Bíblica": "portion",
    "Título ajustado": "adjustedTitle",
    "Necesidad espiritual": "need",
    "Objetivo general": "objective",
    "Versículo de memoria": "memoryVerse",
    "Canto sugerido": "song",
    "Temas de la lección": "topics",
}

DIVISIONS = {
    "Génesis": "Pentateuco",
    "Éxodo": "Pentateuco",
    "Levítico": "Pentateuco",
    "Números": "Pentateuco",
    "Deuteronomio": "Pentateuco",
    "Josué": "Históricos",
    "Jueces": "Históricos",
    "Rut": "Históricos",
    "1 Samuel": "Históricos",
    "2 Samuel": "Históricos",
    "1 Reyes": "Históricos",
    "2 Reyes": "Históricos",
    "1 Crónicas": "Históricos",
    "2 Crónicas": "Históricos",
    "Esdras": "Históricos",
    "Nehemías": "Históricos",
    "Ester": "Históricos",
    "Job": "Poéticos",
    "Salmos": "Poéticos",
    "Proverbios": "Poéticos",
    "Eclesiastés": "Poéticos",
    "Cantares": "Poéticos",
    "Isaías": "Profetas mayores",
    "Jeremías": "Profetas mayores",
    "Lamentaciones": "Profetas mayores",
    "Ezequiel": "Profetas mayores",
    "Daniel": "Profetas mayores",
    "Oseas": "Profetas menores",
    "Joel": "Profetas menores",
    "Amós": "Profetas menores",
    "Abdías": "Profetas menores",
    "Jonás": "Profetas menores",
    "Miqueas": "Profetas menores",
    "Nahúm": "Profetas menores",
    "Habacuc": "Profetas menores",
    "Sofonías": "Profetas menores",
    "Hageo": "Profetas menores",
    "Zacarías": "Profetas menores",
    "Malaquías": "Profetas menores",
    "Mateo": "Evangelios",
    "Marcos": "Evangelios",
    "Lucas": "Evangelios",
    "Juan": "Evangelios",
    "Hechos": "Historia de la iglesia",
    "Romanos": "Cartas paulinas",
    "1 Corintios": "Cartas paulinas",
    "2 Corintios": "Cartas paulinas",
    "Gálatas": "Cartas paulinas",
    "Efesios": "Cartas paulinas",
    "Filipenses": "Cartas paulinas",
    "Colosenses": "Cartas paulinas",
    "1 Tesalonicenses": "Cartas paulinas",
    "2 Tesalonicenses": "Cartas paulinas",
    "1 Timoteo": "Cartas paulinas",
    "2 Timoteo": "Cartas paulinas",
    "Tito": "Cartas paulinas",
    "Filemón": "Cartas paulinas",
    "Hebreos": "Cartas generales",
    "Santiago": "Cartas generales",
    "1 Pedro": "Cartas generales",
    "2 Pedro": "Cartas generales",
    "1 Juan": "Cartas generales",
    "2 Juan": "Cartas generales",
    "3 Juan": "Cartas generales",
    "Judas": "Cartas generales",
    "Apocalipsis": "Profecía apocalíptica",
}


def normalize(text):
    return re.sub(r"\s+", " ", str(text or "")).strip()


def slugify(value):
    value = value.lower()
    value = re.sub(r"[áàäâ]", "a", value)
    value = re.sub(r"[éèëê]", "e", value)
    value = re.sub(r"[íìïî]", "i", value)
    value = re.sub(r"[óòöô]", "o", value)
    value = re.sub(r"[úùüû]", "u", value)
    value = value.replace("ñ", "n")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:80] or "bosquejo"


def scene_hint(history, limit=150):
    text = normalize(history)
    text = re.sub(
        r"^(La historia comienza así:|La historia continúa:|Luego la historia|Después,? la historia|Finalmente,?|Y entonces,?)\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    parts = re.split(r"(?<=[.!?])\s+", text)
    chosen = next((part for part in parts if len(part) >= 45), parts[0] if parts else text)
    if len(chosen) > limit:
        chosen = chosen[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "..."
    return chosen


def default_bridge(history, label):
    scene = scene_hint(history)
    if label == "Dios nos ama":
        return f"Al mirar esta parte de la historia, vemos el cuidado de Dios: {scene} Esta escena nos ayuda a recordar que Dios se acerca con amor y bondad."
    if label == "Somos pecadores":
        return f"Pero esta parte también nos hace pensar en nuestro corazón: {scene} Así entendemos que nosotros muchas veces no obedecemos a Dios."
    if label == "Jesús murió y resucitó":
        return f"Ahora sentimos que la necesidad es más grande de lo que alguien puede resolver solo: {scene} Por eso miramos la solución que Dios da por medio de Jesús."
    if label == "Le recibo":
        return f"Esta parte de la historia nos invita a responder personalmente: {scene} Cada niño debe pensar qué hará con lo que Dios le está mostrando."
    if label == "Promesa de salvación":
        return f"Al llegar a este punto, la historia también habla al niño que escucha hoy: {scene} Dios llama a responder con fe y promete salvar al que cree en Jesús."
    return f"Esta parte de la historia nos prepara para escuchar una verdad importante: {scene}"


def clean_bridge(bridge, history, label):
    bridge = normalize(
        bridge.replace("➡️", "")
        .replace("âž¡ï¸", "")
        .replace("FRASE PUENTE INTEGRADA", "")
        .replace("Frase puente integrada", "")
    )
    return bridge or default_bridge(history, label)


def section(text, heading, next_heading=None):
    start = text.find(heading)
    if start == -1:
        return ""
    start += len(heading)
    if next_heading:
        end = text.find(next_heading, start)
        if end != -1:
            return text[start:end].strip()
    return text[start:].strip()


def parse_meta(text):
    body = section(text, "1. Datos generales", "2. Lectura 1")
    meta = {}
    for line in body.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        if key in META_KEYS:
            meta[META_KEYS[key]] = value.strip()
    meta["topicsList"] = [
        t.strip().strip(".")
        for t in meta.get("topics", "").split(",")
        if t.strip()
    ]
    return meta


def parse_diagram(text):
    body = section(text, "10. Diagrama final narrado:")
    rows = []
    for line in body.splitlines():
        raw = line.strip()
        if not raw.startswith("| ") or raw.startswith("|---") or "HISTORIA / EVENTOS" in raw:
            continue
        cells = [c.strip() for c in raw.strip("|").split("|")]
        if len(cells) != 3 or not cells[0]:
            continue
        plan = cells[2]
        label = ""
        label_match = re.search(r"\*\*(.*?)\*\*", plan)
        if label_match:
            label = label_match.group(1)
            plan = plan.replace(label_match.group(0), "")
        history = normalize(cells[0])
        rows.append(
            {
                "history": history,
                "bridge": clean_bridge(cells[1], history, label),
                "label": label,
                "plan": normalize(plan.replace("➡️", "").replace("âž¡ï¸", "").replace("<br>", " ")),
            }
        )
    return rows


SECTION_HEADING_RE = re.compile(
    r"(?m)^(\d+)\.\s+"
    r"((?:Datos generales)|(?:Lectura \d: .+)|(?:Reflexión para el niño salvo)|"
    r"(?:Cantos sugeridos)|(?:Diagrama final narrado))\s*:?\s*$"
)


def parse_sections(text):
    matches = list(SECTION_HEADING_RE.finditer(text))
    sections = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        title = f"{match.group(1)}. {match.group(2).strip()}"
        content = text[start:end].strip()
        if title.startswith("10. Diagrama final narrado"):
            continue
        sections.append({"title": title, "content": content})
    return sections


def main():
    DATA_DIR.mkdir(exist_ok=True)
    lessons = []
    for folder in sorted(OUTPUTS.iterdir()):
        if not folder.is_dir():
            continue
        file = folder / "leccion.txt"
        if not file.exists():
            continue
        text = file.read_text(encoding="utf-8")
        match = re.match(r"^(\d{3}) - (.+)$", folder.name)
        if not match:
            continue
        meta = parse_meta(text)
        book = meta.get("book", "").strip()
        lesson = {
            "id": int(match.group(1)),
            "code": match.group(1),
            "title": match.group(2),
            "downloadUrl": f"./downloads/bosquejos/{match.group(1)}-{slugify(match.group(2))}.docx",
            "division": DIVISIONS.get(book, "Otros"),
            "diagram": parse_diagram(text),
            "sections": parse_sections(text),
            "fullText": text,
            "searchText": normalize(text).lower(),
        }
        lesson.update(meta)
        lessons.append(lesson)

    payload = {
        "lessons": lessons,
        "books": sorted({lesson.get("book", "") for lesson in lessons if lesson.get("book")}),
        "divisions": sorted({lesson["division"] for lesson in lessons}),
        "topics": sorted({topic for lesson in lessons for topic in lesson.get("topicsList", [])}),
    }
    (DATA_DIR / "lessons.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Generated {len(lessons)} lessons")


if __name__ == "__main__":
    main()
