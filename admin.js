// Public browser config only. Never place the Supabase service_role key here.
const SUPABASE_URL = "https://inpfnxduaeliboxhxqdf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8TKGFhnoLhOFhVYNaBO5XA_S-YuReMT";
const WORKER_BASE_URL = "https://master.worldshop.workers.dev"; // e.g. https://my-worker.example.workers.dev

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const authCard = $("auth-card"), app = $("app"), message = $("message");

function say(text, type = "") { message.textContent = text; message.className = type; }
function validHttpsUrl(value) {
  try { const u = new URL(value); return u.protocol === "https:"; } catch { return false; }
}
function resetForm() {
  $("link-form").reset(); $("row-id").value = ""; $("form-title").textContent = "เพิ่มลิงก์ใหม่"; say("");
}
$("reset").addEventListener("click", resetForm);

async function showSession() {
  const { data: { session } } = await client.auth.getSession();
  authCard.hidden = !!session; app.hidden = !session;
  if (session) { $("whoami").textContent = session.user.email || "ผู้ดูแล"; await loadLinks(); }
}
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await client.auth.signInWithPassword({ email: $("email").value, password: $("password").value });
  if (error) { alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message); return; }
  await showSession();
});
$("logout").addEventListener("click", async () => { await client.auth.signOut(); await showSession(); });

$("link-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const slug = $("slug").value.trim().toLowerCase();
  const url_a = $("url-a").value.trim(), url_b = $("url-b").value.trim();
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return say("Slug ต้องมี 2–60 ตัว ใช้ a-z, 0-9 และขีดกลางเท่านั้น", "error");
  if (!validHttpsUrl(url_a) || !validHttpsUrl(url_b)) return say("ปลายทางทั้งสองต้องเป็น HTTPS URL", "error");
  const row = { slug, url_a, url_b, active_target: $("active-target").value };
  const id = $("row-id").value;
  const query = id ? client.from("switch_links").update(row).eq("id", id) : client.from("switch_links").insert(row);
  const { error } = await query;
  if (error) return say("บันทึกไม่สำเร็จ: " + error.message, "error");
  say("บันทึกเรียบร้อย", "ok"); resetForm(); await loadLinks();
});

async function loadLinks() {
  const tbody = $("links-body");
  tbody.innerHTML = "<tr><td colspan='4'>กำลังโหลด…</td></tr>";
  const { data, error } = await client.from("switch_links").select("*").order("created_at", { ascending: false });
  if (error) { tbody.innerHTML = ""; say("โหลดข้อมูลไม่สำเร็จ: " + error.message, "error"); return; }
  tbody.innerHTML = "";
  if (!data.length) { tbody.innerHTML = "<tr><td colspan='4'>ยังไม่มีลิงก์</td></tr>"; return; }
  for (const item of data) {
    const tr = document.createElement("tr");
    const link = `${WORKER_BASE_URL.replace(/\/$/, "")}/go/${encodeURIComponent(item.slug)}`;
    const cells = [item.slug, item.active_target, link];
    for (const value of cells) {
      const td = document.createElement("td");
      if (value === link) { const a = document.createElement("a"); a.href = link; a.textContent = link; a.target = "_blank"; a.rel = "noopener noreferrer"; td.appendChild(a); }
      else td.textContent = value;
      tr.appendChild(td);
    }
    const td = document.createElement("td");
    const edit = document.createElement("button"); edit.className = "small-btn secondary"; edit.textContent = "แก้ไข";
    edit.addEventListener("click", () => {
      $("row-id").value = item.id; $("slug").value = item.slug; $("url-a").value = item.url_a;
      $("url-b").value = item.url_b; $("active-target").value = item.active_target;
      $("form-title").textContent = "แก้ไข " + item.slug; window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const del = document.createElement("button"); del.className = "small-btn danger"; del.textContent = "ลบ";
    del.addEventListener("click", async () => {
      if (!confirm(`ยืนยันลบ ${item.slug} ?`)) return;
      const { error } = await client.from("switch_links").delete().eq("id", item.id);
      if (error) say("ลบไม่สำเร็จ: " + error.message, "error"); else { say("ลบแล้ว", "ok"); await loadLinks(); }
    });
    td.append(edit, del); tr.appendChild(td); tbody.appendChild(tr);
  }
}
client.auth.onAuthStateChange(() => { showSession(); });
if (SUPABASE_URL.startsWith("REPLACE_") || SUPABASE_ANON_KEY.startsWith("REPLACE_") || WORKER_BASE_URL.startsWith("REPLACE_")) {
  authCard.insertAdjacentHTML("beforeend", '<p class="error">ตั้งค่า Supabase URL, anon key และ Worker URL ใน admin.js ก่อนใช้งาน</p>');
}
showSession();
