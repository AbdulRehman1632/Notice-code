// import { settings as s } from "../config.js";

// async function cu(path, body) {
//   const r = await fetch(`https://api.clickup.com/api/v2${path}`, {
//     method: "POST",
//     headers: { Authorization: s.clickupApiToken, "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!r.ok) throw new Error(`ClickUp ${path} -> ${r.status} ${await r.text()}`);
//   return r.json();
// }

// export async function createTask(listId, { name, description }) {
//   return (await cu(`/list/${listId || s.clickupListId}/task`, { name, description })).id;
// }

// export const addComment = (taskId, text) => cu(`/task/${taskId}/comment`, { comment_text: text });



import { settings as s } from "../config.js";

const BASE = "https://api.clickup.com/api/v2";
// Field ke naam normalize hoke match hote hain: "EMail" -> "email", "AI draft Reply" -> "aidraftreply"
const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const EMAIL_FIELD = "email";
const DRAFT_FIELD = "aidraftreply";

async function cu(path, { method = "GET", body } = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: s.clickupApiToken, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`ClickUp ${method} ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

// List ke custom fields (id chahiye, naam se dhoondte hain)
const fieldCache = new Map();
async function getFields(listId) {
  if (fieldCache.has(listId)) return fieldCache.get(listId);
  const { fields } = await cu(`/list/${listId}/field`);
  const emailF = fields.find((f) => norm(f.name) === EMAIL_FIELD);
  const draftF = fields.find((f) => norm(f.name) === DRAFT_FIELD);
  if (!emailF || !draftF) {
    const names = fields.map((f) => `"${f.name}"`).join(", ") || "(koi custom field nahi)";
    throw new Error(`ClickUp list mein "E-Mail" ya "AI draft Reply" field nahi mila. Maujooda fields: ${names}`);
  }
  const out = { emailF, draftF };
  fieldCache.set(listId, out);
  return out;
}

// List ke tasks mein E-Mail field se client dhoondo (case-insensitive)
async function findTaskByEmail(listId, emailFieldId, email) {
  for (let page = 0; page < 50; page++) {
    const j = await cu(`/list/${listId}/task?page=${page}&include_closed=true&subtasks=true`);
    for (const t of j.tasks) {
      const f = (t.custom_fields || []).find((x) => x.id === emailFieldId);
      if (f?.value && String(f.value).trim().toLowerCase() === email) return t;
    }
    if (j.last_page || j.tasks.length < 100) break;
  }
  return null;
}

// Email se task dhoondo -> usme "AI draft Reply" bharo. Task na mile to naya task banao.
export async function syncDraft({ listId, email, name, draft }) {
  const { emailF, draftF } = await getFields(listId);
  email = email.trim().toLowerCase();

  let task = await findTaskByEmail(listId, emailF.id, email);
  let created = false;
  if (!task) {
    task = await cu(`/list/${listId}/task`, {
      method: "POST",
      body: { name: name || email, custom_fields: [{ id: emailF.id, value: email }] },
    });
    created = true;
  }

  try {
    await cu(`/task/${task.id}/field/${draftF.id}`, { method: "POST", body: { value: draft } });
    return { taskId: task.id, created, via: "field" };
  } catch (e) {
    // Free plan pe custom field uses khatam (FIELD_033): draft ko comment bana kar daal do
    if (!String(e.message).includes("FIELD_033")) throw e;
    await addComment(task.id, `AI draft reply:\n\n${draft}`);
    return { taskId: task.id, created, via: "comment" };
  }
}

export const addComment = (taskId, text) =>
  cu(`/task/${taskId}/comment`, { method: "POST", body: { comment_text: text } });