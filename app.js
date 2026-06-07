const state = {
  lessons: [],
  filtered: [],
  selected: null,
  division: "",
  type: "",
  topic: "",
};

const divisions = [
  { name: "", title: "Todos", subtitle: "toda la biblioteca", icon: "📚" },
  { name: "Pentateuco", title: "Pentateuco", subtitle: "Génesis-Deuteronomio", icon: "🌱" },
  { name: "Históricos", title: "Históricos", subtitle: "Josué-Ester", icon: "🏰" },
  { name: "Poéticos", title: "Poéticos", subtitle: "Job-Cantares", icon: "🎵" },
  { name: "Profetas mayores", title: "Profetas", subtitle: "Isaías-Malaquías", icon: "📜" },
  { name: "Profetas menores", title: "Profetas menores", subtitle: "Oseas-Malaquías", icon: "🔥" },
  { name: "Evangelios", title: "Evangelios", subtitle: "Mateo-Juan", icon: "✝️" },
  { name: "Historia de la iglesia", title: "Hechos", subtitle: "Iglesia primitiva", icon: "🔥" },
  { name: "Cartas paulinas", title: "Epístolas", subtitle: "Romanos-Filemón", icon: "✉️" },
  { name: "Cartas generales", title: "Epístolas generales", subtitle: "Hebreos-Judas", icon: "📨" },
  { name: "Profecía apocalíptica", title: "Apocalipsis", subtitle: "esperanza y reino", icon: "👑" },
];

const labelColors = {
  "Dios nos ama": "#f59e0b",
  "Somos pecadores": "#111827",
  "Jesús murió y resucitó": "#dc2626",
  "Le recibo": "#64748b",
  "Promesa de salvación": "#16a34a",
};

// ── Broad-topic classification ────────────────────────────────────────────────
const BROAD_TOPICS = ["Amor","Arrepentimiento","Carácter","Crecimiento","Cristo","Evangelio","Fe","Obediencia","Oración","Pecado","Salvación"];

const LABEL_TOPICS = {
  "Dios nos ama":          ["Amor", "Evangelio"],
  "Somos pecadores":       ["Pecado", "Evangelio"],
  "Jesús murió y resucitó":["Cristo", "Salvación", "Evangelio"],
  "Le recibo":             ["Fe", "Salvación", "Arrepentimiento", "Evangelio"],
  "Promesa de salvación":  ["Salvación", "Fe", "Evangelio"],
};

const KW_TOPICS = {
  "Amor":           ["amor", "amar", "amado"],
  "Arrepentimiento":["arrepentimiento", "arrepentirse", "conversion", "convertirse"],
  "Carácter":       ["caracter", "virtud", "integridad", "honestidad", "humildad"],
  "Crecimiento":    ["crecimiento", "crecer", "discipulado", "madurez"],
  "Cristo":         ["cristo", "jesucristo", "mesias", "hijo de dios"],
  "Evangelio":      ["evangelio", "buenas nuevas"],
  "Fe":             ["confianza", "creer en dios", "vida de fe"],
  "Obediencia":     ["obediencia", "obedecer", "desobediencia"],
  "Oración":        ["oracion", "orar", "intercesion"],
  "Pecado":         ["pecado", "pecador", "transgresion", "iniquidad"],
  "Salvación":      ["salvacion", "salvar", "redencion", "perdon"],
};

function classifyBroadTopics(lesson) {
  const result = new Set();

  // 1. Keep any broad topic already present in the data
  (lesson.topicsList || []).forEach((t) => { if (BROAD_TOPICS.includes(t)) result.add(t); });

  // 2. Diagram labels are the strongest signal
  (lesson.diagram || []).forEach((row) => {
    (LABEL_TOPICS[row.label] || []).forEach((t) => result.add(t));
  });

  // 3. Lesson type
  if ((lesson.type || "").includes("Crecimiento"))   result.add("Crecimiento");
  if ((lesson.type || "").includes("Evangelización")) result.add("Evangelio");

  // 4. Keyword scan on small fields (title, need, topics text)
  const small = normalize([lesson.title, lesson.adjustedTitle, lesson.need, lesson.objective, lesson.topics].join(" "));
  Object.entries(KW_TOPICS).forEach(([topic, keywords]) => {
    if (keywords.some((kw) => small.includes(kw))) result.add(topic);
  });

  return result.size ? [...result] : ["Evangelio"];
}
// ─────────────────────────────────────────────────────────────────────────────

const els = {
  search: document.querySelector("#searchInput"),
  book: document.querySelector("#bookFilter"),
  topic: document.querySelector("#topicFilter"),
  divisionButtons: document.querySelector("#divisionButtons"),
  topicChips: document.querySelector("#topicChips"),
  grid: document.querySelector("#lessonGrid"),
  total: document.querySelector("#totalCount"),
  evangelism: document.querySelector("#evangelismCount"),
  growth: document.querySelector("#growthCount"),
  visible: document.querySelector("#visibleCount"),
  clear: document.querySelector("#clearFilters"),
  scope: document.querySelector("#currentScope"),
  scopeTitle: document.querySelector("#scopeTitle"),
  scopeDescription: document.querySelector("#scopeDescription"),
  resultsTitle: document.querySelector("#resultsTitle"),
  scrollResults: document.querySelector("#scrollResults"),
  dialog: document.querySelector("#lessonDialog"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogBook: document.querySelector("#dialogBook"),
  dialogPortion: document.querySelector("#dialogPortion"),
  dialogVerse: document.querySelector("#dialogVerse"),
  closeDialog: document.querySelector("#closeDialog"),
  diagram: document.querySelector("#diagramBody"),
  info: document.querySelector("#lessonInfo"),
  copyDiagram: document.querySelector("#copyDiagram"),
  copyFull: document.querySelector("#copyFullLesson"),
  downloadLesson: document.querySelector("#downloadLesson"),
  toast: document.querySelector("#toast"),
};

function normalize(value) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return (value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function optionList(select, values, label) {
  select.innerHTML = `<option value="">${label}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function renderDivisionButtons() {
  els.divisionButtons.innerHTML = "";
  divisions.forEach((division) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `division-button${state.division === division.name ? " active" : ""}`;
    button.innerHTML = `<span>${division.icon}</span><strong>${division.title}</strong><small>${division.subtitle}</small>`;
    button.addEventListener("click", () => {
      state.division = division.name;
      applyFilters({ resetBook: true });
    });
    els.divisionButtons.appendChild(button);
  });
}

function renderTopicChips(topics) {
  const featured = ["Todos", "Amor", "Arrepentimiento", "Carácter", "Crecimiento", "Cristo", "Evangelio", "Fe", "Obediencia", "Oración", "Pecado", "Salvación"];
  els.topicChips.innerHTML = "";
  featured.forEach((topic) => {
    const value = topic === "Todos" ? "" : topic;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `topic-chip${state.topic === value ? " active" : ""}`;
    button.textContent = topic;
    button.disabled = value && !topics.includes(value);
    button.addEventListener("click", () => {
      state.topic = value;
      els.topic.value = value;
      applyFilters();
    });
    els.topicChips.appendChild(button);
  });
}

function matchesFilters(lesson) {
  const query = normalize(els.search.value);
  const book = els.book.value;
  const topic = state.topic || els.topic.value;
  const searchable = normalize([
    lesson.code,
    lesson.title,
    lesson.adjustedTitle,
    lesson.book,
    lesson.portion,
    lesson.memoryVerse,
    lesson.topics,
    lesson.searchText,
  ].join(" "));

  return (
    (!query || searchable.includes(query)) &&
    (!state.division || lesson.division === state.division) &&
    (!book || lesson.book === book) &&
    (!state.type || lesson.type?.includes(state.type)) &&
    (!topic || lesson.topicsList.includes(topic))
  );
}

function applyFilters({ resetBook = false } = {}) {
  if (resetBook) els.book.value = "";
  state.topic = els.topic.value;
  state.filtered = state.lessons.filter(matchesFilters);
  els.visible.textContent = state.filtered.length.toLocaleString("es-CL");
  renderDivisionButtons();
  renderTopicChips([...new Set(state.lessons.flatMap((lesson) => lesson.topicsList || []))]);
  renderScope();
  renderCards();
}

function renderScope() {
  const division = divisions.find((item) => item.name === state.division) || divisions[0];
  const book = els.book.value;
  const topic = state.topic;
  const query = els.search.value.trim();
  const title = book || topic || division.title;
  els.scope.textContent = query ? `Búsqueda: ${query}` : division.name ? division.name : "Toda la biblioteca";
  els.scopeTitle.textContent = title || "Toda la biblioteca";
  els.scopeDescription.textContent = `${state.filtered.length.toLocaleString("es-CL")} lecciones relacionadas con la selección actual.`;
  els.resultsTitle.textContent = state.filtered.length ? "Lecciones encontradas" : "Sin resultados";
}

function renderCards() {
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((lesson) => {
    const card = document.createElement("article");
    card.className = "resource-card";
    const chips = (lesson.topicsList || []).slice(0, 4).map((topic) => `<span>${escapeHtml(topic)}</span>`).join("");
    card.innerHTML = `
      <div class="card-pills">
        <span class="pill green">${escapeHtml(lesson.type || "Evangelización")}</span>
        <span class="pill blue">${escapeHtml(lesson.book || "Libro")}</span>
        <span class="pill amber">${escapeHtml(lesson.portion || "Porción")}</span>
      </div>
      <h3>${lesson.code}. ${escapeHtml(lesson.title)}</h3>
      <p><strong>Enfoque:</strong> ${escapeHtml(lesson.need || lesson.objective || "Lección bíblica evangelística.")}</p>
      <div class="mini-tags">${chips}</div>
      <div class="card-actions">
        <button class="open-button" type="button">Ver recurso</button>
        <a class="download-card" href="${escapeHtml(lesson.downloadUrl || "#")}" download>Descargar bosquejo</a>
      </div>
    `;
    card.querySelector(".open-button").addEventListener("click", () => openLesson(lesson));
    fragment.appendChild(card);
  });
  els.grid.innerHTML = "";
  els.grid.appendChild(fragment);
}

function openLesson(lesson) {
  state.selected = lesson;
  els.dialogMeta.textContent = `${lesson.code} · ${lesson.division}`;
  els.dialogTitle.textContent = lesson.title;
  els.dialogBook.textContent = lesson.book || "-";
  els.dialogPortion.textContent = lesson.portion || "-";
  els.dialogVerse.textContent = lesson.memoryVerse || "-";
  els.downloadLesson.href = lesson.downloadUrl || "#";
  els.downloadLesson.setAttribute("download", "");
  renderDiagram(lesson);
  renderInfo(lesson);
  els.dialog.showModal();
}

function renderDiagram(lesson) {
  const fragment = document.createDocumentFragment();
  lesson.diagram.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.className = "story-row";
    tr.innerHTML = `
      <td>${escapeHtml(row.history)}</td>
      <td>➡️ ${escapeHtml(row.bridge)}</td>
      <td><span class="plan-label" style="--label-color:${labelColors[row.label] || "#2f7a4f"}">${escapeHtml(row.label || "Verdad bíblica")}</span><br>${escapeHtml(row.plan)}</td>
    `;
    fragment.appendChild(tr);
    if (lesson.diagram[index + 1]) {
      const ret = document.createElement("tr");
      ret.className = "return-row";
      ret.innerHTML = `<td></td><td>⬅️ ${escapeHtml(returnBridge(row, lesson))}</td><td></td>`;
      fragment.appendChild(ret);
    }
  });
  els.diagram.innerHTML = "";
  els.diagram.appendChild(fragment);
}

function renderInfo(lesson) {
  const fragment = document.createDocumentFragment();
  lesson.sections.forEach((section, index) => {
    const details = document.createElement("details");
    details.className = "info-section";
    details.open = index < 2;
    details.innerHTML = `
      <summary><span>${escapeHtml(section.title)}</span><b>abrir</b></summary>
      <div class="info-content">${formatContent(section.content)}</div>
    `;
    fragment.appendChild(details);
  });
  els.info.innerHTML = "";
  els.info.appendChild(fragment);
}

function formatContent(value) {
  return escapeHtml(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function returnBridge(row, lesson) {
  const label = row.label || "";

  if (label === "Dios nos ama") {
    return "Y ese mismo amor de Dios... estaba obrando en cada detalle de esta historia.";
  }
  if (label === "Somos pecadores") {
    return "Y esa misma necesidad de perdón... también estaba en el corazón de quien escuchamos en el relato.";
  }
  if (label === "Jesús murió y resucitó") {
    return "Y hacia esa esperanza apuntaba todo lo que estaba sucediendo.";
  }
  if (label === "Le recibo") {
    return "Y ese mismo llamado de Dios a responder con fe... también llegó a quien vivía esta historia.";
  }
  if (label === "Promesa de salvación") {
    return "Y esa promesa de Dios... también se cumplió en la vida de quien escuchamos hoy.";
  }
  return "Y esa verdad de Dios seguía presente en todo lo que continuaba pasando.";
}


function setType(type) {
  state.type = type;
  document.querySelectorAll("[data-type]").forEach((button) => {
    button.classList.toggle("active", button.dataset.type === type);
  });
  applyFilters();
}

function clearFilters() {
  state.division = "";
  state.type = "";
  state.topic = "";
  els.search.value = "";
  els.book.value = "";
  els.topic.value = "";
  document.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("active", button.dataset.type === ""));
  applyFilters();
}

function copyDiagram() {
  if (!state.selected) return;
  const lines = [`${state.selected.code}. ${state.selected.title}`, ""];
  state.selected.diagram.forEach((row) => lines.push(`${row.history} -> ${row.bridge} -> ${row.label}: ${row.plan}`));
  navigator.clipboard.writeText(lines.join("\n")).then(() => showToast("Diagrama copiado"));
}

function copyFullLesson() {
  if (!state.selected) return;
  navigator.clipboard.writeText(state.selected.fullText || "").then(() => showToast("Lección copiada"));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1500);
}

async function init() {
  const response = await fetch("./data/lessons.json");
  const data = await response.json();
  // Enrich each lesson with classified broad topics
  state.lessons = data.lessons.map((lesson) => ({
    ...lesson,
    topicsList: classifyBroadTopics(lesson),
  }));
  optionList(els.book, data.books, "Todos");
  optionList(els.topic, BROAD_TOPICS, "Todos");
  els.total.textContent = state.lessons.length.toLocaleString("es-CL");
  els.evangelism.textContent = state.lessons.filter((lesson) => lesson.type?.includes("Evangelización")).length.toLocaleString("es-CL");
  els.growth.textContent = state.lessons.filter((lesson) => lesson.type?.includes("Crecimiento")).length.toLocaleString("es-CL");

  els.search.addEventListener("input", () => applyFilters());
  els.book.addEventListener("input", () => applyFilters());
  els.topic.addEventListener("input", () => applyFilters());
  els.clear.addEventListener("click", clearFilters);
  els.scrollResults.addEventListener("click", () => document.querySelector("#resultsAnchor").scrollIntoView({ behavior: "smooth" }));
  els.closeDialog.addEventListener("click", () => els.dialog.close());
  els.copyDiagram.addEventListener("click", copyDiagram);
  els.copyFull.addEventListener("click", copyFullLesson);
  document.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => setType(button.dataset.type)));

  applyFilters();
}

init().catch((error) => {
  console.error(error);
  els.grid.innerHTML = `<div class="empty-state">No pude cargar las lecciones.</div>`;
});
