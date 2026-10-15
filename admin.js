// Browser-side public configuration only. Never expose the Supabase service-role key here.
const SUPABASE_URL = "https://inpfnxduaeliboxhxqdf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8TKGFhnoLhOFhVYNaBO5XA_S-YuReMT";
const WORKER_BASE_URL = "https://master.worldshop.workers.dev";
const TABLE = "switch_links";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const authCard = $("auth-card"), app = $("app"), message = $("message");
let cachedLinks = [];
let toastTimer;

function say(text, type = "") {
  message.textContent = text;
  message.className = type;
  if (text) showToast(text, type);
}
function showToast(text, type = "") {
  const toast = $("toast");
  toast.textContent = text;
  toast.className = `toast show ${type}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 3000);
}
function validHttpsUrl(value) {
  try { const u = new URL(value); return u.protocol === "https:" && !!u.hostname; }
  catch { return false; }
}
function centralUrl(slug) {
  return `${WORKER_BASE_URL.replace(/\/$/, "")}/go/${encodeURIComponent(slug)}`;
}
function resetForm() {
  $("link-form").reset();
  $("row-id").value = "";
  $("form-title").textContent = "เพิ่มลิงก์ใหม่";
  say("");
}
function updateStats(links) {
  $("total-links").textContent = String(links.length);
  $("ready-links").textContent = String(links.filter(x => validHttpsUrl(x.destination_url || "")).length);
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
async function copyUrl(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const input = document.createElement("textarea");
      input.value = value; input.setAttribute("readonly", "");
      input.style.position = "fixed"; input.style.opacity = "0";
      document.body.appendChild(input); input.select();
      const ok = document.execCommand("copy"); input.remove();
      if (!ok) throw new Error("copy failed");
    }
    showToast("คัดลอกลิงก์กลางแล้ว");
  } catch {
    showToast("คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกจากช่อง URL", "error");
    const valueField = document.createElement("input");
    valueField.value = value; valueField.readOnly = true;
    valueField.style.cssText = "position:fixed;z-index:20;left:12px;right:12px;bottom:76px;width:calc(100% - 24px);padding:14px;background:#0a1525;color:#fff;border:1px solid #789;border-radius:10px";
    document.body.appendChild(valueField); valueField.focus(); valueField.select();
    valueField.addEventListener("blur", () => valueField.remove(), { once: true });
  }
}

$("reset").addEventListener("click", resetForm);
$("refresh").addEventListener("click", loadLinks);
$("search-links").addEventListener("input", renderLinks);

async function showSession() {
  const { data: { session }, error } = await client.auth.getSession();
  if (error) { showToast("ตรวจสอบเซสชันไม่สำเร็จ", "error"); return; }
  authCard.hidden = !!session;
  app.hidden = !session;
  if (session) {
    $("whoami").textContent = session.user.email || "ผู้ดูแล";
    await loadLinks();
  }
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const { error } = await client.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (error) { showToast("เข้าสู่ระบบไม่สำเร็จ: " + error.message, "error"); return; }
    await showSession();
  } finally { button.disabled = false; }
});
$("logout").addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) showToast("ออกจากระบบไม่สำเร็จ", "error");
  await showSession();
});

$("link-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const slug = $("slug").value.trim().toLowerCase();
  const destination_url = $("destination-url").value.trim();
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return say("Slug ต้องมี 2–60 ตัว ใช้ a-z, 0-9 และขีดกลางเท่านั้น", "error");
  if (!validHttpsUrl(destination_url)) return say("URL ปลายทางต้องเป็น HTTPS URL ที่ถูกต้อง", "error");
  const row = { slug, destination_url };
  const id = $("row-id").value;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const query = id ? client.from(TABLE).update(row).eq("id", id) : client.from(TABLE).insert(row);
    const { error } = await query;
    if (error) {
      const msg = /destination_url|column/i.test(error.message)
        ? "ฐานข้อมูลยังไม่ได้อัปเดตเป็นระบบปลายทางเดียว กรุณารันไฟล์ supabase/migrate_single_destination.sql ก่อน"
        : "บันทึกไม่สำเร็จ: " + error.message;
      return say(msg, "error");
    }
    say("บันทึกลิงก์เรียบร้อย", "ok");
    resetForm();
    await loadLinks();
  } finally { submit.disabled = false; }
});

async function loadLinks() {
  const tbody = $("links-body");
  tbody.replaceChildren();
  tbody.append(el("tr", "", ""));
  const loadingCell = el("td", "loading-cell", "กำลังโหลดรายการ…");
  loadingCell.colSpan = 3; tbody.firstChild.append(loadingCell);
  const { data, error } = await client.from(TABLE).select("id,slug,destination_url,created_at").order("created_at", { ascending: false });
  if (error) {
    tbody.replaceChildren();
    const tr = el("tr"); const td = el("td", "loading-cell", /destination_url|column/i.test(error.message)
      ? "ต้องอัปเดตฐานข้อมูลก่อน: รันไฟล์ supabase/migrate_single_destination.sql"
      : "โหลดข้อมูลไม่สำเร็จ: " + error.message);
    td.colSpan = 3; tr.append(td); tbody.append(tr);
    $("list-count").textContent = "โหลดข้อมูลไม่สำเร็จ";
    showToast("โหลดรายการไม่สำเร็จ", "error");
    return;
  }
  cachedLinks = data || [];
  updateStats(cachedLinks);
  renderLinks();
}

function renderLinks() {
  const tbody = $("links-body");
  tbody.replaceChildren();
  const q = $("search-links").value.trim().toLowerCase();
  const filtered = cachedLinks.filter(item => `${item.slug} ${item.destination_url || ""}`.toLowerCase().includes(q));
  $("empty-state").hidden = filtered.length > 0;
  $("list-count").textContent = `${filtered.length} จาก ${cachedLinks.length} รายการ`;
  if (!filtered.length) {
    const tr = el("tr"); const td = el("td", "loading-cell", cachedLinks.length ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีลิงก์");
    td.colSpan = 3; tr.append(td); tbody.append(tr); return;
  }
  for (const item of filtered) {
    const tr = el("tr");
    const url = centralUrl(item.slug);
    const info = el("td", "slug-cell");
    info.append(el("strong", "", item.slug));
    info.append(el("small", "", url));
    tr.append(info);
    const statusCell = el("td");
    statusCell.append(el("span", "status-pill", "● พร้อมใช้งาน"));
    tr.append(statusCell);
    const actionCell = el("td");
    const actions = el("div", "row-actions");
    const copy = el("button", "small-btn copy-btn", "คัดลอก URL");
    copy.type = "button"; copy.addEventListener("click", () => copyUrl(url));
    const edit = el("button", "small-btn secondary", "แก้ไข");
    edit.type = "button"; edit.addEventListener("click", () => {
      $("row-id").value = item.id;
      $("slug").value = item.slug;
      $("destination-url").value = item.destination_url || "";
      $("form-title").textContent = "แก้ไข " + item.slug;
      window.scrollTo({ top: 0, behavior: "smooth" });
      $("slug").focus({ preventScroll: true });
    });
    const del = el("button", "small-btn danger", "ลบ");
    del.type = "button"; del.addEventListener("click", async () => {
      if (!confirm(`ยืนยันลบลิงก์ “${item.slug}” ใช่หรือไม่?`)) return;
      del.disabled = true;
      const { error } = await client.from(TABLE).delete().eq("id", item.id);
      if (error) { showToast("ลบไม่สำเร็จ: " + error.message, "error"); del.disabled = false; }
      else { showToast("ลบลิงก์แล้ว"); await loadLinks(); }
    });
    actions.append(copy, edit, del); actionCell.append(actions); tr.append(actionCell);
    tbody.append(tr);
  }
}

client.auth.onAuthStateChange(() => { showSession(); });
showSession();
