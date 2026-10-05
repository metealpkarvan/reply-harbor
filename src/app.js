import * as C from "./core.js";
import * as U from "./ui.js";
const { $, t, esc } = U;
const state = U.store("reply-harbor", { items: [] }, C.validate);
let view = "waiting",
  selected = "";
function budget() {
  return Math.max(1, Math.min(30, Math.trunc(Number($("budget").value) || 10)));
}
function commit(items) {
  try {
    if (state.set({ items })) {
      render();
      return true;
    }
  } catch (e) {
    U.notify(e.message);
  }
  return false;
}
function clearForm() {
  $("item-form").reset();
  $("edit-id").value = "";
  $("cancel-edit").hidden = true;
}
function energyLabel(n) {
  return n === 1
    ? t("Hafif", "Light")
    : n === 2
      ? t("Orta", "Medium")
      : t("Yüksek", "High");
}
function render() {
  $("lead").textContent = t(
    "Cevap vermek istediğin insanları ve küçük bağlam notlarını kendi limanında tut. Şu anki enerjine göre bir grup seç, taslağını düzenle ve kendi mesaj uygulamanda gönder.",
    "Keep people you want to reply to and small context notes in your harbor. Choose a batch for your energy, edit a draft and send it in your own messaging app.",
  );
  state.warn();
  const data = state.get().items,
    batch = C.chooseBatch(
      data,
      Number($("capacity").value),
      budget(),
      U.today(),
    );
  $("metrics").innerHTML = [
    [batch.items.length, t("BU GRUPTA", "IN THIS BATCH")],
    [batch.minutes + " / " + budget(), t("DAKİKA", "MINUTES")],
    [
      data.filter((r) => r.status === "waiting" && r.when > U.today()).length,
      t("GELECEK GÜNE", "FOR A LATER DAY"),
    ],
  ]
    .map(
      ([n, s]) =>
        `<div class="metric"><strong>${n}</strong><small>${s}</small></div>`,
    )
    .join("");
  const card = (r, small = false) =>
    `<article class="record"><div class="section-head"><h3>${esc(r.name)}</h3><span class="tag">${esc(r.channel)}</span></div><p class="hint">${esc(r.topic)}</p><div class="meta"><span>${energyLabel(r.energy)} · ${r.minutes} ${t("dk", "min")}</span>${r.when ? "<span>" + U.dateLabel(r.when) + "</span>" : ""}</div><div class="actions"><button data-action="draft" data-id="${esc(r.id)}" class="${small ? "primary" : ""}">${t("Taslak masası", "Draft desk")}</button>${small ? "" : `<button data-action="edit" data-id="${esc(r.id)}">${t("Düzenle", "Edit")}</button>${r.status === "waiting" ? `<button data-action="tomorrow" data-id="${esc(r.id)}">${t("Yarın dön", "Return tomorrow")}</button><button data-action="park" data-id="${esc(r.id)}">${t("Şimdilik bırak", "Park for now")}</button>` : `<button data-action="restore" data-id="${esc(r.id)}">${t("Geri al", "Bring back")}</button>`}<button data-action="delete" data-id="${esc(r.id)}">${t("Sil", "Delete")}</button>`}</div></article>`;
  $("batch").innerHTML =
    batch.items.map((r) => card(r, true)).join("") ||
    '<div class="empty">' +
      t(
        "Bu enerji ve süre için konuşma yok. Kendi bütçeni değiştir veya yeni bir konuşma ekle.",
        "No conversation fits this energy and time. Change your budget or add a conversation.",
      ) +
      "</div>";
  $("tabs").innerHTML = [
    ["waiting", t("Bekleyen", "Waiting")],
    ["replied", t("Cevaplanan", "Replied")],
    ["parked", t("Şimdilik bırakılan", "Parked")],
  ]
    .map(
      ([id, label]) =>
        `<button data-view="${id}" aria-pressed="${view === id}">${label}</button>`,
    )
    .join("");
  const q = C.fold($("search").value);
  $("items").innerHTML =
    data
      .filter(
        (r) => r.status === view && C.fold(r.name + " " + r.topic).includes(q),
      )
      .map((r) => card(r))
      .join("") ||
    '<div class="empty">' +
      t("Burada kayıt yok.", "No records here.") +
      "</div>";
  const active = data.find((r) => r.id === selected);
  $("draft-panel").hidden = !active;
  if (active) {
    $("draft-heading").textContent =
      active.name + " · " + t("taslak masası", "draft desk");
    $("draft-context").textContent = active.topic;
    $("draft").value = active.draft;
    $("calendar").disabled = !active.when;
  }
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => action(b.dataset.action, b.dataset.id)));
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.view;
        render();
      }),
  );
}
function action(action, id) {
  const items = structuredClone(state.get().items),
    r = items.find((r) => r.id === id);
  if (!r) return;
  if (action === "draft") {
    selected = id;
    render();
    $("draft").focus();
    return;
  }
  if (action === "edit") {
    $("edit-id").value = id;
    for (const f of [
      "name",
      "channel",
      "topic",
      "energy",
      "minutes",
      "priority",
      "when",
    ])
      $(f).value = r[f];
    $("cancel-edit").hidden = false;
    $("name").focus();
    return;
  }
  if (action === "delete") {
    if (
      confirm(
        t("Bu konuşma kaydı silinsin mi?", "Delete this conversation record?"),
      )
    ) {
      if (selected === id) selected = "";
      commit(items.filter((r) => r.id !== id));
    }
    return;
  }
  if (action === "tomorrow") r.when = U.afterDays(1);
  if (action === "park") r.status = "parked";
  if (action === "restore") {
    r.status = "waiting";
    r.when = "";
  }
  commit(items);
}
$("item-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    const old = state.get().items.find((r) => r.id === $("edit-id").value);
    const row = {
      id: old?.id || U.uid(),
      name: $("name").value,
      channel: $("channel").value,
      topic: $("topic").value,
      energy: Number($("energy").value),
      minutes: Number($("minutes").value),
      priority: Number($("priority").value),
      when: $("when").value,
      added: old?.added || U.today(),
      draft: old?.draft || "",
      status: old?.status || "waiting",
    };
    const items = old
      ? state.get().items.map((r) => (r.id === old.id ? row : r))
      : [...state.get().items, row];
    if (commit(items)) clearForm();
  } catch (e) {
    U.notify(e.message);
  }
};
$("templates").onclick = (e) => {
  const kind = e.target.closest("[data-template]")?.dataset.template;
  if (!kind) return;
  const items = structuredClone(state.get().items),
    r = items.find((r) => r.id === selected);
  if (!r) return;
  if (r.draft && !confirm(t("Taslak değişecek. Devam?", "Replace this draft?")))
    return;
  r.draft = C.draft(r, kind, U.lang());
  commit(items);
};
$("draft").oninput = () => {
  const items = structuredClone(state.get().items),
    r = items.find((r) => r.id === selected);
  if (!r) return;
  r.draft = $("draft").value;
  try {
    state.set({ items });
  } catch (e) {
    U.notify(e.message);
  }
};
$("copy-draft").onclick = () => {
  const r = state.get().items.find((r) => r.id === selected);
  if (r?.draft) U.copy(r.draft);
  else U.notify(t("Önce bir taslak yaz.", "Write a draft first."));
};
$("calendar").onclick = () => {
  const r = state.get().items.find((r) => r.id === selected);
  if (!r) return;
  try {
    U.download(
      "reply-harbor.ics",
      C.calendar(
        r,
        new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
      ),
      "text/calendar",
    );
  } catch (e) {
    U.notify(e.message);
  }
};
$("replied").onclick = () => {
  if (
    !confirm(
      t(
        "Mesajı kendi uygulamanda gönderdiğini onaylıyor musun?",
        "Confirm you sent the message in your own app?",
      ),
    )
  )
    return;
  const items = structuredClone(state.get().items),
    r = items.find((r) => r.id === selected);
  if (r) {
    r.status = "replied";
    selected = "";
    commit(items);
  }
};
$("close-draft").onclick = () => {
  selected = "";
  render();
};
$("cancel-edit").onclick = clearForm;
$("capacity").onchange = render;
$("budget").onchange = () => {
  $("budget").value = budget();
  render();
};
$("search").oninput = render;
$("markdown").onclick = () =>
  U.download("reply-harbor.md", C.markdown(state.get().items), "text/markdown");
$("demo").onclick = () => {
  if (
    state.get().items.length &&
    !confirm(
      t(
        "Kurgusal örnekler mevcut kayıtların yerini alacak. Devam?",
        "Fictional samples will replace current records. Continue?",
      ),
    )
  )
    return;
  selected = "";
  commit([
    {
      id: "demo1",
      name: "Deniz",
      topic: t(
        "Pazar günü kahve için uygun bir saat konuşacağız.",
        "Agree on a time for Sunday coffee.",
      ),
      channel: "whatsapp",
      energy: 1,
      minutes: 2,
      priority: 3,
      when: U.today(),
      added: U.afterDays(-3),
      draft: "",
      status: "waiting",
    },
    {
      id: "demo2",
      name: "Ece",
      topic: t(
        "Gönderdiği fotoğraflar için teşekkür etmek istiyorum.",
        "I want to thank them for the photos.",
      ),
      channel: "signal",
      energy: 1,
      minutes: 1,
      priority: 2,
      when: "",
      added: U.afterDays(-2),
      draft: "",
      status: "waiting",
    },
    {
      id: "demo3",
      name: "Proje ekibi",
      topic: t(
        "Kapsamla ilgili uzun bir kararı açıklayacağım.",
        "Explain a longer decision about project scope.",
      ),
      channel: "email",
      energy: 3,
      minutes: 12,
      priority: 3,
      when: "",
      added: U.afterDays(-1),
      draft: "",
      status: "waiting",
    },
    {
      id: "demo4",
      name: "Can",
      topic: t(
        "Gelecek haftanın yürüyüş planını soracağım.",
        "Ask about next week’s walking plan.",
      ),
      channel: "sms",
      energy: 1,
      minutes: 2,
      priority: 1,
      when: U.afterDays(3),
      added: U.today(),
      draft: "",
      status: "waiting",
    },
  ]);
  clearForm();
};
U.bindData("reply-harbor", state, C.validate, () => {
  selected = "";
  clearForm();
  render();
});
U.init(render);
