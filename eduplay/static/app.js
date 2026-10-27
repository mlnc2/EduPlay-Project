const state = { items: [], filter: "all", query: "" };
const $ = (selector) => document.querySelector(selector);
const grid = $("#library-grid");
const empty = $("#empty-state");
const uploadDialog = $("#upload-dialog");
const playerDialog = $("#player-dialog");
const form = $("#upload-form");
const toast = $("#toast");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => toast.classList.remove("show"), 3000);
}

async function requestLibrary() {
  try {
    const response = await fetch("/api/library");
    if (!response.ok) throw new Error("Não foi possível carregar a biblioteca.");
    state.items = await response.json();
    render();
  } catch (error) {
    notify(error.message || "Falha ao conectar com o servidor.");
  }
}

function render() {
  const videos = state.items.filter(item => item.kind === "video").length;
  const audios = state.items.filter(item => item.kind === "audio").length;
  $("#total-count").textContent = state.items.length;
  $("#video-count").textContent = videos;
  $("#audio-count").textContent = audios;

  const query = state.query.trim().toLocaleLowerCase("pt-BR");
  const visible = state.items.filter(item => {
    const matchesKind = state.filter === "all" || item.kind === state.filter;
    const haystack = `${item.title} ${item.subject} ${item.description}`.toLocaleLowerCase("pt-BR");
    return matchesKind && haystack.includes(query);
  });

  $("#result-count").textContent = `${visible.length} ${visible.length === 1 ? "item" : "itens"}`;
  grid.innerHTML = visible.map(item => `
    <article class="media-card">
      <div class="card-art ${item.kind === "audio" ? "audio" : ""}">
        <span class="kind-pill">${item.kind === "video" ? "VIDEOAULA" : "AUDIOBOOK"}</span>
        <span class="art-orb"></span>
        <span class="art-symbol">${item.kind === "video" ? "▷" : "♫"}</span>
      </div>
      <div class="card-body">
        <span class="subject">${escapeHtml(item.subject || "Geral")}</span>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p class="card-description">${escapeHtml(item.description || "Sem descrição. Abra o conteúdo para começar a estudar.")}</p>
        <div class="card-actions">
          <button class="play-button" data-play="${escapeHtml(item.id)}">▶ ${item.kind === "video" ? "Assistir aula" : "Ouvir audiobook"}</button>
          <button class="delete-button" data-delete="${escapeHtml(item.id)}" aria-label="Excluir ${escapeHtml(item.title)}" title="Excluir conteúdo">×</button>
        </div>
      </div>
    </article>`).join("");

  empty.classList.toggle("visible", visible.length === 0);
  grid.style.display = visible.length === 0 ? "none" : "grid";
  if (state.items.length === 0 && !query && state.filter === "all") {
    empty.querySelector("h3").textContent = "Sua biblioteca começa aqui";
    empty.querySelector("p").textContent = "Adicione uma videoaula ou audiobook para começar.";
  } else if (visible.length === 0) {
    empty.querySelector("h3").textContent = "Nenhum conteúdo encontrado";
    empty.querySelector("p").textContent = "Tente mudar a busca ou o filtro selecionado.";
  }
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("selected", button.classList.contains("chip") && button.dataset.filter === filter);
    button.classList.toggle("active", button.classList.contains("nav-item") && button.dataset.filter === filter);
  });
  render();
}

function openUpload() {
  $("#upload-error").textContent = "";
  uploadDialog.showModal();
}
function closeUpload() { uploadDialog.close(); }

$("#open-upload").addEventListener("click", openUpload);
$("#empty-upload").addEventListener("click", openUpload);
$("#close-upload").addEventListener("click", closeUpload);
$("#cancel-upload").addEventListener("click", closeUpload);
$("#close-player").addEventListener("click", () => {
  const media = $("#player-stage").querySelector("video, audio");
  if (media) media.pause();
  playerDialog.close();
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});
$("#search").addEventListener("input", event => {
  state.query = event.target.value;
  render();
});

$("#kind").addEventListener("change", () => {
  const isVideo = $("#kind").value === "video";
  $("#file-hint").textContent = isVideo
    ? "Vídeo: MP4, WebM ou OGG. O limite é 1 GB."
    : "Áudio: MP3, WAV, M4A, AAC ou OGG. O limite é 1 GB.";
  $("#media-file").value = "";
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const submit = $("#submit-upload");
  const file = $("#media-file").files[0];
  if (!file) {
    $("#upload-error").textContent = "Selecione um arquivo antes de salvar.";
    return;
  }
  if (file.size > 1024 * 1024 * 1024) {
    $("#upload-error").textContent = "O arquivo ultrapassa o limite de 1 GB.";
    return;
  }
  submit.disabled = true;
  submit.textContent = "Enviando...";
  $("#upload-error").textContent = "";
  try {
    const response = await fetch("/api/library", { method: "POST", body: new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível salvar o conteúdo.");
    state.items.unshift(data);
    form.reset();
    closeUpload();
    setFilter("all");
    notify("Conteúdo adicionado à biblioteca!");
  } catch (error) {
    $("#upload-error").textContent = error.message || "Erro inesperado no envio.";
  } finally {
    submit.disabled = false;
    submit.textContent = "Salvar conteúdo";
  }
});

grid.addEventListener("click", async event => {
  const playButton = event.target.closest("[data-play]");
  const deleteButton = event.target.closest("[data-delete]");
  if (playButton) {
    const item = state.items.find(entry => entry.id === playButton.dataset.play);
    if (item) playItem(item);
  }
  if (deleteButton) {
    const item = state.items.find(entry => entry.id === deleteButton.dataset.delete);
    if (!item || !window.confirm(`Excluir "${item.title}" da biblioteca? O arquivo local também será apagado.`)) return;
    deleteButton.disabled = true;
    try {
      const response = await fetch(`/api/library/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir.");
      state.items = state.items.filter(entry => entry.id !== item.id);
      render();
      notify("Conteúdo excluído.");
    } catch (error) {
      notify(error.message || "Erro ao excluir conteúdo.");
      deleteButton.disabled = false;
    }
  }
});

function playItem(item) {
  $("#player-title").textContent = item.title;
  $("#player-kind").textContent = item.kind === "video" ? "VIDEOAULA" : "AUDIOBOOK";
  $("#player-description").textContent = item.description || "";
  const stage = $("#player-stage");
  stage.replaceChildren();
  const media = document.createElement(item.kind === "video" ? "video" : "audio");
  media.controls = true;
  media.autoplay = true;
  media.preload = "metadata";
  media.src = item.url;
  media.setAttribute("aria-label", item.title);
  stage.append(media);
  playerDialog.showModal();
  media.play().catch(() => {});
}

requestLibrary();
