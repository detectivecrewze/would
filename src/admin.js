import { defaultGift } from "./data.js";
import { PUBLIC_APP_URL, apiRequest } from "./config.js";

const tokenInput = document.querySelector("#admin-token");
const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginError = document.querySelector("#login-error");
const projectList = document.querySelector("#project-list");
const toast = document.querySelector("#admin-toast");
const modal = document.querySelector("#create-modal");
const deleteModal = document.querySelector("#delete-modal");
let deleteTargetId = "";
const TOKEN_KEY = "crush-note:admin-token";
let adminToken = sessionStorage.getItem(TOKEN_KEY) || "";
let allProjects = [];
let activeFilter = "all";
let createdStudioUrl = "";

function headers(extra = {}) {
  return { authorization: "Bearer " + adminToken, ...extra };
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function niceDate(value) {
  if (!value) return "Belum dipublikasikan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function studioUrl(id, token) {
  const url = new URL("/studio/", PUBLIC_APP_URL);
  url.searchParams.set("project", id);
  url.searchParams.set("token", token);
  return url.toString();
}

async function makeStudioUrl(id) {
  const access = await apiRequest("/api/admin/projects/" + encodeURIComponent(id) + "/access", {
    method: "POST",
    headers: headers(),
  });
  return studioUrl(id, access.studioToken);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    notify("Link Studio berhasil disalin.");
  } catch {
    const input = document.querySelector("#new-studio-link");
    input.value = value;
    input.select();
    notify("Link ditandai. Salin secara manual.");
  }
}

function renderProjects() {
  const projects = activeFilter === "all" ? allProjects : allProjects.filter((project) => project.status === activeFilter);
  projectList.replaceChildren();
  if (!projects.length) {
    const label = activeFilter === "all" ? "Belum ada gift" : activeFilter === "draft" ? "Belum ada draft" : "Belum ada gift terbit";
    projectList.innerHTML = '<div class="empty-state"><span>♡</span><h3>' + label + '</h3><p>Buat gift baru, lalu susun isinya di Studio.</p></div>';
    return;
  }
  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";
    const info = document.createElement("div");
    info.className = "project-card__info";
    const badge = document.createElement("span");
    badge.className = "project-status " + (project.status === "published" ? "is-published" : "");
    badge.textContent = project.status === "published" ? "Dipublikasikan" : "Draft";
    const name = document.createElement("h3");
    name.textContent = project.id;
    const date = document.createElement("p");
    date.textContent = (project.status === "published" ? "Terbit " + niceDate(project.publishedAt) : "Diperbarui " + niceDate(project.updatedAt));
    info.append(badge, name, date);
    const actions = document.createElement("div");
    actions.className = "project-card__actions";
    const copyStudio = document.createElement("button");
    copyStudio.type = "button";
    copyStudio.textContent = "Salin link Studio";
    copyStudio.addEventListener("click", async () => {
      copyStudio.disabled = true;
      try { await copyText(await makeStudioUrl(project.id)); }
      catch (error) { notify(error.message); }
      finally { copyStudio.disabled = false; }
    });
    const openStudio = document.createElement("button");
    openStudio.type = "button";
    openStudio.textContent = "Buka Studio";
    openStudio.addEventListener("click", async () => {
      const tab = window.open("about:blank", "_blank");
      if (tab) tab.opener = null;
      openStudio.disabled = true;
      try {
        const url = await makeStudioUrl(project.id);
        if (tab) tab.location.href = url;
        else notify("Popup diblokir. Gunakan Salin link Studio.");
      } catch (error) { if (tab) tab.close(); notify(error.message); }
      finally { openStudio.disabled = false; }
    });
    const deleteGift = document.createElement("button");
    deleteGift.type = "button";
    deleteGift.className = "project-delete";
    deleteGift.textContent = "Hapus";
    deleteGift.addEventListener("click", () => {
      deleteTargetId = project.id;
      document.querySelector("#delete-target").textContent = project.id;
      document.querySelector("#confirm-delete").disabled = false;
      deleteModal.showModal();
    });
    actions.append(copyStudio, openStudio, deleteGift);
    if (project.status === "published") {
      const openGift = document.createElement("a");
      openGift.href = new URL("/share/" + encodeURIComponent(project.id), PUBLIC_APP_URL).toString();
      openGift.target = "_blank";
      openGift.rel = "noopener";
      openGift.textContent = "Lihat gift";
      actions.append(openGift);
    }
    card.append(info, actions);
    projectList.append(card);
  });
}

async function loadDashboard() {
  loginError.textContent = "";
  try {
    const result = await apiRequest("/api/admin/projects", { headers: headers() });
    sessionStorage.setItem(TOKEN_KEY, adminToken);
    loginPanel.hidden = true;
    dashboard.hidden = false;
    allProjects = result.projects || [];
    renderProjects();
  } catch (error) {
    loginError.textContent = error.message;
  }
}

function showCreateModal() {
  document.querySelector("#create-form-view").hidden = false;
  document.querySelector("#create-result-view").hidden = true;
  document.querySelector("#confirm-create").disabled = false;
  modal.showModal();
}

document.querySelector("#login-button").addEventListener("click", async () => {
  adminToken = tokenInput.value.trim();
  await loadDashboard();
});
tokenInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#login-button").click();
});

document.querySelector("#create-project").addEventListener("click", showCreateModal);
document.querySelector("#cancel-create").addEventListener("click", () => modal.close());
document.querySelector("#close-create-modal").addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
document.querySelectorAll("[data-project-filter]").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.projectFilter;
  document.querySelectorAll("[data-project-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
  renderProjects();
}));

document.querySelector("#confirm-create").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const project = structuredClone(defaultGift);
    if (!document.querySelector("#start-with-defaults").checked) {
      project.sender = "";
      project.recipient = "";
      project.music = { title: "", artist: "", coverUrl: "", url: "", source: "library" };
      project.puzzle.photo = "";
      project.cover.photo = "";
      project.memory.photo = "";
      project.reasons.photo = "";
    }
    const result = await apiRequest("/api/admin/projects", {
      method: "POST",
      headers: headers({ "content-type": "application/json" }),
      body: JSON.stringify({ project }),
    });
    createdStudioUrl = studioUrl(result.project.id, result.studioToken);
    document.querySelector("#new-studio-link").value = createdStudioUrl;
    document.querySelector("#create-form-view").hidden = true;
    document.querySelector("#create-result-view").hidden = false;
    await loadDashboard();
  } catch (error) {
    notify(error.message);
    button.disabled = false;
  }
});

document.querySelector("#close-delete-modal").addEventListener("click", () => deleteModal.close());
document.querySelector("#cancel-delete").addEventListener("click", () => deleteModal.close());
deleteModal.addEventListener("click", (event) => { if (event.target === deleteModal) deleteModal.close(); });
document.querySelector("#confirm-delete").addEventListener("click", async (event) => {
  if (!deleteTargetId) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Menghapus…";
  try {
    await apiRequest("/api/admin/projects/" + encodeURIComponent(deleteTargetId), {
      method: "DELETE",
      headers: headers(),
    });
    deleteModal.close();
    notify("Gift dan media project berhasil dihapus.");
    deleteTargetId = "";
    await loadDashboard();
  } catch (error) {
    notify(error.message || "Gift belum dapat dihapus.");
  } finally {
    button.textContent = "Hapus permanen";
    button.disabled = !deleteTargetId;
  }
});

document.querySelector("#copy-new-link").addEventListener("click", () => copyText(createdStudioUrl));
document.querySelector("#open-new-studio").addEventListener("click", () => {
  if (createdStudioUrl) window.open(createdStudioUrl, "_blank", "noopener");
});
if (adminToken) {
  tokenInput.value = adminToken;
  loadDashboard();
}
