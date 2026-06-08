const FAVORITES_KEY = "lecciones-biblicas-favoritas";

const state = {
  lessons: [],
  filtered: [],
  selected: null,
  division: "",
  type: "",
  topic: "",
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")),
  storyIndex: 0,
  activePanel: "diagram",
  presentation: false,
};

const divisions = [
  { name: "", title: "Todos", subtitle: "toda la biblioteca", icon: "📚", scene: "Todo" },
  { name: "Pentateuco", title: "Pentateuco", subtitle: "Génesis-Deuteronomio", icon: "🌱", scene: "Creación" },
  { name: "Históricos", title: "Históricos", subtitle: "Josué-Ester", icon: "🏰", scene: "Reino" },
  { name: "Poéticos", title: "Poéticos", subtitle: "Job-Cantares", icon: "🎵", scene: "Sabiduría" },
  { name: "Profetas mayores", title: "Profetas", subtitle: "Isaías-Malaquías", icon: "📜", scene: "Llamado" },
  { name: "Profetas menores", title: "Profetas menores", subtitle: "Oseas-Malaquías", icon: "🔥", scene: "Voz" },
  { name: "Evangelios", title: "Evangelios", subtitle: "Mateo-Juan", icon: "✝️", scene: "Cristo" },
  { name: "Historia de la iglesia", title: "Hechos", subtitle: "Iglesia primitiva", icon: "🕊️", scene: "Iglesia" },
  { name: "Cartas paulinas", title: "Epístolas", subtitle: "Romanos-Filemón", icon: "✉️", scene: "Doctrina" },
  { name: "Cartas generales", title: "Epístolas generales", subtitle: "Hebreos-Judas", icon: "📨", scene: "Fe" },
  { name: "Profecía apocalíptica", title: "Apocalipsis", subtitle: "esperanza y reino", icon: "👑", scene: "Esperanza" },
];

const labelColors = {
  "Dios nos ama": "#f59e0b",
  "Somos pecadores": "#111827",
  "Jesús murió y resucitó": "#dc2626",
  "Le recibo": "#64748b",
  "Promesa de salvación": "#16a34a",
};

const BROAD_TOPICS = ["Amor","Arrepentimiento","Carácter","Crecimiento","Cristo","Evangelio","Fe","Obediencia","Oración","Pecado","Salvación"];

const LABEL_TOPICS = {
  "Dios nos ama": ["Amor", "Evangelio"],
  "Somos pecadores": ["Pecado", "Evangelio"],
  "Jesús murió y resucitó": ["Cristo", "Salvación", "Evangelio"],
  "Le recibo": ["Fe", "Salvación", "Arrepentimiento", "Evangelio"],
  "Promesa de salvación": ["Salvación", "Fe", "Evangelio"],
};

const KW_TOPICS = {
  Amor: ["amor", "amar", "amado"],
  Arrepentimiento: ["arrepentimiento", "arrepentirse", "conversion", "convertirse"],
  Carácter: ["caracter", "virtud", "integridad", "honestidad", "humildad"],
  Crecimiento: ["crecimiento", "crecer", "discipulado", "madurez"],
  Cristo: ["cristo", "jesucristo", "mesias", "hijo de dios"],
  Evangelio: ["evangelio", "buenas nuevas"],
  Fe: ["confianza", "creer en dios", "vida de fe"],
  Obediencia: ["obediencia", "obedecer", "desobediencia"],
  Oración: ["oracion", "orar", "intercesion"],
  Pecado: ["pecado", "pecador", "transgresion", "iniquidad"],
  Salvación: ["salvacion", "salvar", "redencion", "perdon"],
};

const els = {
  loading: document.querySelector("#loadingOverlay"),
  search: document.querySelector("#searchInput"),
  book: document.querySelector("#bookFilter"),
  topic: document.querySelector("#topicFilter"),
  divisionButtons: document.querySelector("#divisionButtons"),
  topicChips: document.querySelector("#topicChips"),
  journeyMap: document.querySelector("#journeyMap"),
  favoritesOnly: document.querySelector("#favoritesOnly"),
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
  favoriteDialog: document.querySelector("#favoriteDialog"),
  presentationMode: document.querySelector("#presentationMode"),
  closeDialog: document.querySelector("#closeDialog"),
  diagram: document.querySelector("#diagramBody"),
  info: document.querySelector("#lessonInfo"),
  copyDiagram: document.querySelector("#copyDiagram"),
  copyFull: document.querySelector("#copyFullLesson"),
  downloadLesson: document.querySelector("#downloadLesson"),
  storyMeta: document.querySelector("#storyStepMeta"),
  storyLabel: document.querySelector("#storyStepLabel"),
  storyContent: document.querySelector("#storyStepContent"),
  storyProgress: document.querySelector("#storyProgressBar"),
  storyPrev: document.querySelector("#storyPrev"),
  storyNext: document.querySelector("#storyNext"),
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
  return (value || "").toString().replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function classifyBroadTopics(lesson) {
  const result = new Set();
  (lesson.topicsList || []).forEach((topic) => { if (BROAD_TOPICS.includes(topic)) result.add(topic); });
  (lesson.diagram || []).forEach((row) => (LABEL_TOPICS[row.label] || []).forEach((topic) => result.add(topic)));
  if ((lesson.type || "").includes("Crecimiento")) result.add("Crecimiento");
  if ((lesson.type || "").includes("Evangelización")) result.add("Evangelio");

  const small = normalize([lesson.title, lesson.adjustedTitle, lesson.need, lesson.objective, lesson.topics].join(" "));
  Object.entries(KW_TOPICS).forEach(([topic, keywords]) => {
    if (keywords.some((keyword) => small.includes(keyword))) result.add(topic);
  });
  return result.size ? [...result] : ["Evangelio"];
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

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function isFavorite(lesson) {
  return state.favorites.has(lesson.code);
}

function toggleFavorite(lesson) {
  if (isFavorite(lesson)) {
    state.favorites.delete(lesson.code);
    showToast("Quitada de favoritas");
  } else {
    state.favorites.add(lesson.code);
    showToast("Guardada en favoritas");
  }
  saveFavorites();
  updateFavoriteControls();
  renderJourneyMap();
  renderCards();
  if (state.favoritesOnly) applyFilters();
}

function animateNumber(element, target) {
  if (!element) return;
  element.textContent = target.toLocaleString("es-CL");
}

function renderDivisionButtons() {
  els.divisionButtons.innerHTML = "";
  divisions.forEach((division) => {
    const count = division.name ? state.lessons.filter((lesson) => lesson.division === division.name).length : state.lessons.length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `division-button${state.division === division.name ? " active" : ""}`;
    button.innerHTML = `<span>${division.icon}</span><strong>${division.title}</strong><small>${division.subtitle} · ${count}</small>`;
    button.addEventListener("click", () => {
      state.division = division.name;
      applyFilters({ resetBook: true });
    });
    els.divisionButtons.appendChild(button);
  });
}

function renderJourneyMap() {
  if (!els.journeyMap) return;
  els.journeyMap.innerHTML = "";
  divisions.slice(1).forEach((division, index) => {
    const count = state.lessons.filter((lesson) => lesson.division === division.name).length;
    const favCount = state.lessons.filter((lesson) => lesson.division === division.name && isFavorite(lesson)).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-node${state.division === division.name ? " active" : ""}`;
    button.style.setProperty("--delay", `${index * 42}ms`);
    button.innerHTML = `
      <span class="node-icon">${division.icon}</span>
      <span class="node-title">${division.title}</span>
      <small>${division.scene} · ${count}</small>
      <b>${favCount ? `★ ${favCount}` : "Explorar"}</b>
    `;
    button.addEventListener("click", () => {
      state.division = division.name;
      els.book.value = "";
      applyFilters({ resetBook: true });
      document.querySelector("#resultsAnchor").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.journeyMap.appendChild(button);
  });
}

function renderTopicChips(topics) {
  const featured = ["Todos", ...BROAD_TOPICS];
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
    (!topic || lesson.topicsList.includes(topic)) &&
    (!state.favoritesOnly || isFavorite(lesson))
  );
}

function applyFilters({ resetBook = false } = {}) {
  if (resetBook) els.book.value = "";
  state.topic = els.topic.value;
  state.filtered = state.lessons.filter(matchesFilters);
  animateNumber(els.visible, state.filtered.length);
  renderDivisionButtons();
  renderJourneyMap();
  renderTopicChips([...new Set(state.lessons.flatMap((lesson) => lesson.topicsList || []))]);
  renderScope();
  renderCards();
}

function renderScope() {
  const division = divisions.find((item) => item.name === state.division) || divisions[0];
  const book = els.book.value;
  const topic = state.topic;
  const query = els.search.value.trim();
  const title = state.favoritesOnly ? "Mis favoritas" : book || topic || division.title;
  els.scope.textContent = query ? `Búsqueda: ${query}` : state.favoritesOnly ? "Selección guardada" : division.name ? division.name : "Toda la biblioteca";
  els.scopeTitle.textContent = title || "Toda la biblioteca";
  els.scopeDescription.textContent = `${state.filtered.length.toLocaleString("es-CL")} lecciones relacionadas con la selección actual.`;
  els.resultsTitle.textContent = state.filtered.length ? "Lecciones encontradas" : "Sin resultados";
  if (els.favoritesOnly) {
    els.favoritesOnly.classList.toggle("active", state.favoritesOnly);
    els.favoritesOnly.textContent = state.favoritesOnly ? `★ Favoritas (${state.favorites.size})` : `☆ Favoritas (${state.favorites.size})`;
  }
}

function renderCards() {
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((lesson, index) => {
    const card = document.createElement("article");
    card.className = `resource-card ${isFavorite(lesson) ? "is-favorite" : ""}`;
    card.style.setProperty("--delay", `${Math.min(index, 24) * 28}ms`);
    const chips = (lesson.topicsList || []).slice(0, 4).map((topic) => `<span>${escapeHtml(topic)}</span>`).join("");
    card.innerHTML = `
      <button class="favorite-button" type="button" aria-label="Guardar favorita">${isFavorite(lesson) ? "★" : "☆"}</button>
      <div class="card-illustration" aria-hidden="true">${divisionIcon(lesson.division)}</div>
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
    card.querySelector(".favorite-button").addEventListener("click", () => toggleFavorite(lesson));
    fragment.appendChild(card);
  });
  els.grid.innerHTML = "";
  els.grid.appendChild(fragment);
}

function divisionIcon(name) {
  return (divisions.find((division) => division.name === name) || divisions[0]).icon;
}

function openLesson(lesson) {
  state.selected = lesson;
  state.storyIndex = 0;
  state.activePanel = "diagram";
  state.presentation = false;
  els.dialog.classList.remove("presentation");
  if (els.presentationMode) els.presentationMode.textContent = "Presentar";
  els.dialogMeta.textContent = `${lesson.code} · ${lesson.division}`;
  els.dialogTitle.textContent = lesson.title;
  els.dialogBook.textContent = lesson.book || "-";
  els.dialogPortion.textContent = lesson.portion || "-";
  els.dialogVerse.textContent = lesson.memoryVerse || "-";
  els.downloadLesson.href = lesson.downloadUrl || "#";
  els.downloadLesson.setAttribute("download", "");
  renderDiagram(lesson);
  renderInfo(lesson);
  renderStoryStep();
  updateFavoriteControls();
  setPanel("diagram");
  els.dialog.showModal();
}

window.openLesson = openLesson;

function updateFavoriteControls() {
  if (!state.selected || !els.favoriteDialog) return;
  els.favoriteDialog.textContent = isFavorite(state.selected) ? "★ Guardada" : "☆ Guardar";
}

function setPanel(panel) {
  state.activePanel = panel;
  document.querySelectorAll("[data-panel]").forEach((button) => button.classList.toggle("active", button.dataset.panel === panel));
  document.querySelectorAll("[data-panel-content]").forEach((section) => section.classList.toggle("active", section.dataset.panelContent === panel));
}

function renderDiagram(lesson) {
  const fragment = document.createDocumentFragment();
  (lesson.diagram || []).forEach((row, index) => {
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
      ret.innerHTML = `<td></td><td>⬅️ ${escapeHtml(returnBridge(row))}</td><td></td>`;
      fragment.appendChild(ret);
    }
  });
  els.diagram.innerHTML = "";
  els.diagram.appendChild(fragment);
}

function renderStoryStep() {
  if (!state.selected || !els.storyMeta || !els.storyLabel || !els.storyContent || !els.storyProgress || !els.storyPrev || !els.storyNext) return;
  const steps = state.selected.diagram || [];
  const step = steps[state.storyIndex] || steps[0];
  if (!step) return;
  els.storyMeta.textContent = `Paso ${state.storyIndex + 1} de ${steps.length}`;
  els.storyLabel.textContent = step.label || "Historia";
  els.storyContent.innerHTML = `
    <article>
      <h4>Historia</h4>
      <p>${escapeHtml(step.history)}</p>
    </article>
    <article>
      <h4>Puente</h4>
      <p>${escapeHtml(step.bridge)}</p>
    </article>
    <article>
      <h4>Aplicación</h4>
      <p>${escapeHtml(step.plan)}</p>
    </article>
  `;
  const progress = ((state.storyIndex + 1) / steps.length) * 100;
  els.storyProgress.style.width = `${progress}%`;
  els.storyPrev.disabled = state.storyIndex === 0;
  els.storyNext.textContent = state.storyIndex === steps.length - 1 ? "Volver al inicio" : "Siguiente";
}

function moveStory(delta) {
  if (!state.selected) return;
  const length = state.selected.diagram.length;
  state.storyIndex = delta > 0 && state.storyIndex === length - 1 ? 0 : Math.max(0, Math.min(length - 1, state.storyIndex + delta));
  renderStoryStep();
}

function renderInfo(lesson) {
  const fragment = document.createDocumentFragment();
  (lesson.sections || []).forEach((section, index) => {
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

function returnBridge(row) {
  const label = row.label || "";
  if (label === "Dios nos ama") return "Volvemos a la historia viendo el amor de Dios en acción.";
  if (label === "Somos pecadores") return "Volvemos al relato recordando la necesidad del corazón humano.";
  if (label === "Jesús murió y resucitó") return "Volvemos a la escena mirando la esperanza que Dios prepara.";
  if (label === "Le recibo") return "Volvemos a la historia con una respuesta personal delante de Dios.";
  if (label === "Promesa de salvación") return "Volvemos al cierre con una promesa segura para el que cree.";
  return "Volvemos a la historia con naturalidad para seguir contando.";
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
  state.favoritesOnly = false;
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
  state.lessons = data.lessons.map((lesson) => ({
    ...lesson,
    topicsList: classifyBroadTopics(lesson),
  }));
  optionList(els.book, data.books, "Todos");
  optionList(els.topic, BROAD_TOPICS, "Todos");
  animateNumber(els.total, state.lessons.length);
  animateNumber(els.evangelism, state.lessons.filter((lesson) => lesson.type?.includes("Evangelización")).length);
  animateNumber(els.growth, state.lessons.filter((lesson) => lesson.type?.includes("Crecimiento")).length);

  els.search.addEventListener("input", () => applyFilters());
  els.book.addEventListener("input", () => applyFilters());
  els.topic.addEventListener("input", () => applyFilters());
  els.clear.addEventListener("click", clearFilters);
  els.scrollResults.addEventListener("click", () => document.querySelector("#resultsAnchor").scrollIntoView({ behavior: "smooth" }));
  els.favoritesOnly?.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    applyFilters();
  });
  els.closeDialog.addEventListener("click", () => els.dialog.close());
  els.favoriteDialog?.addEventListener("click", () => state.selected && toggleFavorite(state.selected));
  els.presentationMode?.addEventListener("click", () => {
    state.presentation = !state.presentation;
    els.dialog.classList.toggle("presentation", state.presentation);
    els.presentationMode.textContent = state.presentation ? "Salir" : "Presentar";
    setPanel(state.presentation ? "story" : state.activePanel);
  });
  els.storyPrev?.addEventListener("click", () => moveStory(-1));
  els.storyNext?.addEventListener("click", () => moveStory(1));
  els.copyDiagram.addEventListener("click", copyDiagram);
  els.copyFull.addEventListener("click", copyFullLesson);
  document.querySelectorAll("[data-panel]").forEach((button) => button.addEventListener("click", () => setPanel(button.dataset.panel)));
  document.querySelectorAll("[data-type]").forEach((button) => button.addEventListener("click", () => setType(button.dataset.type)));

  applyFilters();
  window.setTimeout(() => els.loading?.classList.add("hidden"), 450);
}

init().catch((error) => {
  console.error(error);
  els.loading?.classList.add("hidden");
  els.grid.innerHTML = `<div class="empty-state">No pude cargar las lecciones.</div>`;
});
