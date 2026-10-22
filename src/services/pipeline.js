// import fs from "node:fs/promises";
// import path from "node:path";
// import { settings as s } from "../config.js";
// import { Case, CaseStatus } from "../models/Case.js";
// import { Client } from "../models/Client.js";
// import { newCase } from "./cases.js";
// import * as zoho from "./zoho.js";
// import * as llm from "./llm.js";
// import * as clickup from "./clickup.js";
// import { log, logErr } from "../utils/log.js";

// const MIME = {
//   ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
//   ".jpeg": "image/jpeg", ".webp": "image/webp",
// };
// let running = false;

// // Email aate hi poora kaam yahan se shuru hota hai
// export async function pollInbox() {
//   if (running) {
//     log("POLL", "pichla poll abhi chal raha hai, skip");
//     return { skipped: true };
//   }
//   running = true;
//   try {
//     log("POLL", "inbox check ho raha hai...");
//     const msgs = await zoho.listUnread();
//     log("POLL", msgs.length ? `${msgs.length} unread email(s) mili` : "koi nayi email nahi");
//     let created = 0;
//     for (const m of msgs) {
//       try {
//         if (await processEmail(m)) created++;
//       } catch (e) {
//         logErr("EMAIL", `process fail (messageId ${m.messageId}): ${e.message}`);
//       }
//     }
//     if (msgs.length) log("POLL", `done: ${created} naye case bane`);
//     return { checked: msgs.length, created };
//   } finally {
//     running = false;
//   }
// }

// async function processEmail(m) {
//   const messageId = String(m.messageId);
//   const from = (m.fromAddress || "").toLowerCase();
//   log("EMAIL", `📩 aayi: "${m.subject || "(no subject)"}" from ${from} (id ${messageId})`);

//   if (from === s.firmEmail.toLowerCase()) {
//     log("EMAIL", "apni hi firm email hai, ignore");
//     return false;
//   }
//   if (await Case.exists({ zoho_message_id: messageId })) {
//     log("EMAIL", "pehle hi process ho chuki hai, sirf read mark kar raha hoon");
//     await zoho.markRead(messageId);
//     return false;
//   }

//   // sender ko client bana do (ya purana dhoondo)
//   let client = await Client.findOne({ email: from });
//   if (client) log("CLIENT", `purana client mila: ${client.name}`);
//   else {
//     client = await Client.create({ name: m.sender || from, email: from });
//     log("CLIENT", `naya client bana: ${client.name}`);
//   }

//   const c = await newCase({
//     client: client._id,
//     status: CaseStatus.email_received,
//     zoho_message_id: messageId,
//     from_email: from,
//     subject: m.subject || "Notice",
//   });
//   log("CASE", `${c.ref_code} bana (status: ${c.status})`);
//   await zoho.markRead(messageId);
//   log("EMAIL", "Zoho mein read mark ho gayi ✅");

//   let step = "email body";
//   try {
//     const folderId = m.folderId;
//     const emailText = await zoho.getContent(folderId, messageId);
//     log("EMAIL", `body parh li (${emailText.length} chars)`);
//     step = "attachment";

//     // pehli PDF/image attachment
//     let attachment = null;
//     const atts = await zoho.getAttachments(folderId, messageId);
//     const att = atts.find((a) => MIME[path.extname(a.attachmentName || "").toLowerCase()]);
//     if (att) {
//       const buffer = await zoho.downloadAttachment(folderId, messageId, att.attachmentId);
//       const file = path.join("uploads", `${c.ref_code}-${att.attachmentName}`);
//       await fs.mkdir("uploads", { recursive: true });
//       await fs.writeFile(file, buffer);
//       c.attachment_path = file;
//       log("ATTACH", `${att.attachmentName} download hui (${buffer.length} bytes) -> ${file}`);
//       attachment = { buffer, mime: MIME[path.extname(att.attachmentName).toLowerCase()] };
//     }

//     if (!att) log("ATTACH", `koi PDF/image attachment nahi (total attachments: ${atts.length})`);

//     step = "LLM extract";
//     log("LLM", "notice extract ho raha hai...");
//     c.notice_json = await llm.extractNotice({ emailText, attachment });
//     c.status = CaseStatus.extracted;
//     await c.save();
//     log("CASE", `${c.ref_code} -> extracted`);

//     log("LLM", `extract result: ${JSON.stringify(c.notice_json)}`);

//     step = "ClickUp task";

//     c.clickup_task_id = await clickup.createTask(client.clickup_list_id, {
//       name: `${c.ref_code} - ${c.notice_json.notice_type || c.subject}`,
//       description: `${client.name}\n${c.notice_json.summary || ""}`,
//     });

//     log("CLICKUP", `task bana: ${c.clickup_task_id}`);

//     step = "LLM draft reply";
//     c.draft_reply = await llm.draftReply(c.notice_json, client.name);
//     c.status = CaseStatus.pending_approval;
//     c.last_error = null;
//     log("CASE", `${c.ref_code} -> pending_approval ✅ (approve ka wait)`);
//   } catch (e) {
//     c.last_error = e.message; 
//     logErr("CASE", `${c.ref_code} "${step}" step pe fail, status ${c.status} pe ruka: ${e.message}`);
//   }
//   await c.save();
//   return true;
// }


// ========================================================================

// import fs from "node:fs/promises";
// import path from "node:path";
// import { settings as s } from "../config.js";
// import { Case, CaseStatus } from "../models/Case.js";
// import { Client } from "../models/Client.js";
// import { newCase } from "./cases.js";
// import * as zoho from "./zoho.js";
// import * as llm from "./llm.js";
// import * as clickup from "./clickup.js";
// import { log, logErr } from "../utils/log.js";

// const MIME = {
//   ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
//   ".jpeg": "image/jpeg", ".webp": "image/webp",
// };
// let running = false;
// const ignored = new Set(); // non-notice emails, baar baar log na ho

// // Email aate hi poora kaam yahan se shuru hota hai
// export async function pollInbox() {
//   if (running) {
//     log("POLL", "pichla poll abhi chal raha hai, skip");
//     return { skipped: true };
//   }
//   running = true;
//   try {
//     log("POLL", "Checking Inbox...");
//     const msgs = await zoho.listUnread();
//     log("POLL", msgs.length ? `${msgs.length} unread (email)s found` : "new email is not available");
//     let created = 0;
//     for (const m of msgs) {
//       try {
//         if (await processEmail(m)) created++;
//       } catch (e) {
//         logErr("EMAIL", `process fail (messageId ${m.messageId}): ${e.message}`);
//       }
//     }
//     if (msgs.length) log("POLL", `done: ${created} new case create`);
//     return { checked: msgs.length, created };
//   } finally {
//     running = false;
//   }
// }

// async function processEmail(m) {
//   const messageId = String(m.messageId);
//   const from = (m.fromAddress || "").toLowerCase();
//   if (ignored.has(messageId)) return false;
//   log("EMAIL", `📩 aayi: "${m.subject || "(no subject)"}" from ${from} (id ${messageId})`);

//   if (from === s.firmEmail.toLowerCase()) {
//     log("EMAIL", "own firm email, ignore");
//     return false;
//   }
//   if (await Case.exists({ zoho_message_id: messageId })) {
//     log("EMAIL", "pehle hi process ho chuki hai, sirf read mark kar raha hoon");
//     await zoho.markRead(messageId);
//     return false;
//   }

//   // PDF/image attachment nahi to notice nahi, case hi nahi banega
//   const folderId = m.folderId;
//   const atts = await zoho.getAttachments(folderId, messageId);
//   const att = atts.find((a) => MIME[path.extname(a.attachmentName || "").toLowerCase()]);
//   if (!att) {
//     ignored.add(messageId);
//     log("EMAIL", "⏭️ PDF/image attachment nahi hai, notice nahi lagta -> skip (case nahi bana)");
//     return false;
//   }

//   // sender ko client bana do (ya purana dhoondo)
//   let client = await Client.findOne({ email: from });
//   if (client) log("CLIENT", `old client found: ${client.name}`);
//   else {
//     client = await Client.create({ name: m.sender || from, email: from });
//     log("CLIENT", `new client created: ${client.name}`);
//   }

//   const c = await newCase({
//     client: client._id,
//     status: CaseStatus.email_received,
//     zoho_message_id: messageId,
//     from_email: from,
//     subject: m.subject || "Notice",
//   });
//   log("CASE", `${c.ref_code} bana (status: ${c.status})`);
//   await zoho.markRead(messageId);
//   log("EMAIL", "Mark as read in Zoho mail");

//   let step = "email body";
//   try {
//     const emailText = await zoho.getContent(folderId, messageId);
//     log("EMAIL", `Read body (${emailText.length} chars)`);

//     step = "attachment";
//     const buffer = await zoho.downloadAttachment(folderId, messageId, att.attachmentId);
//     const file = path.join("uploads", `${c.ref_code}-${att.attachmentName}`);
//     await fs.mkdir("uploads", { recursive: true });
//     await fs.writeFile(file, buffer);
//     c.attachment_path = file;
//     log("ATTACH", `${att.attachmentName} download hui (${buffer.length} bytes) -> ${file}`);
//     const attachment = { buffer, mime: MIME[path.extname(att.attachmentName).toLowerCase()] };

//     step = "LLM extract";
//     log("LLM", "notice extract ho raha hai...");
//     c.notice_json = await llm.extractNotice({ emailText, attachment });
//     c.status = CaseStatus.extracted;
//     await c.save();
//     log("CASE", `${c.ref_code} -> extracted`);
//     log("LLM", `extract result: ${JSON.stringify(c.notice_json)}`);

//     step = "ClickUp task";
//     if (s.clickupApiToken && (client.clickup_list_id || s.clickupListId)) {
//       c.clickup_task_id = await clickup.createTask(client.clickup_list_id, {
//         name: `${c.ref_code} - ${c.notice_json.notice_type || c.subject}`,
//         description: `${client.name}\n${c.notice_json.summary || ""}`,
//       });
//       log("CLICKUP", `task bana: ${c.clickup_task_id}`);
//     } else {
//       log("CLICKUP", "token/list id nahi hai, skip");
//     }

//     step = "LLM draft reply";
//     c.draft_reply = await llm.draftReply(c.notice_json, client.name);
//     log("LLM", `draft reply is ready:\n---------------\n${c.draft_reply}\n---------------`);
//     c.status = CaseStatus.pending_approval;
//     c.last_error = null;
//     log("CASE", `${c.ref_code} -> pending_approval ✅ (approve ka wait)`);
//   } catch (e) {
//     c.last_error = e.message; // notice kabhi silently gum nahi hoga
//     logErr("CASE", `${c.ref_code} "${step}" step pe fail, status ${c.status} pe ruka: ${e.message}`);
//   }
//   await c.save();
//   return true;
// }
import fs from "node:fs/promises";
import path from "node:path";
import { settings as s } from "../config.js";
import { Case, CaseStatus } from "../models/Case.js";
import { Client } from "../models/Client.js";
import { newCase } from "./cases.js";
import * as zoho from "./zoho.js";
import * as llm from "./llm.js";
import * as clickup from "./clickup.js";
import { log, logErr } from "../utils/log.js";

const MIME = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp",
};
let running = false;
const ignored = new Set(); // non-notice emails, baar baar log na ho

// Email aate hi poora kaam yahan se shuru hota hai

            // working code

// export async function pollInbox() {
//   if (running) {
//     log("POLL", "pichla poll abhi chal raha hai, skip");
//     return { skipped: true };
//   }
//   running = true;
//   try {
//     log("POLL", "inbox check ho raha hai...");
//     const msgs = await zoho.listUnread();
//     log("POLL", msgs.length ? `${msgs.length} unread email(s) mili` : "koi nayi email nahi");
//     let created = 0;
//     for (const m of msgs) {
//       try {
//         if (await processEmail(m)) created++;
//       } catch (e) {
//         logErr("EMAIL", `process fail (messageId ${m.messageId}): ${e.message}`);
//       }
//     }
//     if (msgs.length) log("POLL", `done: ${created} naye case bane`);
//     return { checked: msgs.length, created };
//   } finally {
//     running = false;
//   }
// }


export async function pollInbox() {
  if (running) {
    log("POLL", "pichla poll abhi chal raha hai, skip");
    return { skipped: true };
  }
  running = true;
  try {
    log("POLL", "inbox check ho raha hai...");
    const msgs = await zoho.listUnread();
    log("POLL", msgs.length ? `${msgs.length} unread email(s) mili` : "koi nayi email nahi");
    
    let created = 0;
    
    const batch = msgs.slice(0, 1);
    
    for (const m of batch) {
      try {
        if (await processEmail(m)) created++;
      } catch (e) {
        logErr("EMAIL", `process fail (messageId ${m.messageId}): ${e.message}`);
      }
    }
    
    if (batch.length) log("POLL", `done: ${created} naye case bane (batch size: 1)`);
    return { checked: batch.length, created };
  } finally {
    running = false;
  }
}

async function processEmail(m) {
  const messageId = String(m.messageId);
  const from = (m.fromAddress || "").toLowerCase();
  if (ignored.has(messageId)) return false;
  log("EMAIL", `📩 aayi: "${m.subject || "(no subject)"}" from ${from} (id ${messageId})`);

  if (from === s.firmEmail.toLowerCase()) {
    log("EMAIL", "apni hi firm email hai, ignore");
    return false;
  }
  if (await Case.exists({ zoho_message_id: messageId })) {
    log("EMAIL", "pehle hi process ho chuki hai, sirf read mark kar raha hoon");
    await zoho.markRead(messageId);
    return false;
  }

  // PDF/image attachment nahi to notice nahi, case hi nahi banega
  const folderId = m.folderId;
  const atts = await zoho.getAttachments(folderId, messageId);
  const att = atts.find((a) => MIME[path.extname(a.attachmentName || "").toLowerCase()]);
  if (!att) {
    ignored.add(messageId);
    log("EMAIL", "⏭️ PDF/image attachment nahi hai, notice nahi lagta -> skip (case nahi bana)");
    return false;
  }

  // sender ko client bana do (ya purana dhoondo)
  let client = await Client.findOne({ email: from });
  if (client) log("CLIENT", `purana client mila: ${client.name}`);
  else {
    client = await Client.create({ name: m.sender || from, email: from });
    log("CLIENT", `naya client bana: ${client.name}`);
  }

  const c = await newCase({
    client: client._id,
    status: CaseStatus.email_received,
    zoho_message_id: messageId,
    from_email: from,
    subject: m.subject || "Notice",
  });
  log("CASE", `${c.ref_code} bana (status: ${c.status})`);
  await zoho.markRead(messageId);
  log("EMAIL", "Zoho mein read mark ho gayi ✅");

  let step = "email body";
  try {
    const emailText = await zoho.getContent(folderId, messageId);
    log("EMAIL", `body parh li (${emailText.length} chars)`);

    // step = "attachment";
    // const buffer = await zoho.downloadAttachment(folderId, messageId, att.attachmentId);
    // const file = path.join("uploads", `${c.ref_code}-${att.attachmentName}`);
    // await fs.mkdir("uploads", { recursive: true });
    // await fs.writeFile(file, buffer);
    // c.attachment_path = file;
    // log("ATTACH", `${att.attachmentName} download hui (${buffer.length} bytes) -> ${file}`);
    // const attachment = { buffer, mime: MIME[path.extname(att.attachmentName).toLowerCase()] };

    step = "attachment";
    const buffer = await zoho.downloadAttachment(folderId, messageId, att.attachmentId);
    c.attachment_path = att.attachmentName;
    log("ATTACH", `${att.attachmentName} download hui (${buffer.length} bytes) - Memory buffer ready ✅`);
    const attachment = { buffer, mime: MIME[path.extname(att.attachmentName).toLowerCase()] };

    step = "LLM extract";
    log("LLM", "notice extract ho raha hai...");
    c.notice_json = await llm.extractNotice({ emailText, attachment });
    c.status = CaseStatus.extracted;
    await c.save();
    log("CASE", `${c.ref_code} -> extracted`);
    log("LLM", `extract result: ${JSON.stringify(c.notice_json)}`);

    step = "LLM draft reply";
    c.draft_reply = await llm.draftReply(c.notice_json, client.name);
    log("LLM", `draft reply tayyar:\n---------------\n${c.draft_reply}\n---------------`);
    c.status = CaseStatus.pending_approval;
    c.last_error = null;
    await c.save();
    log("CASE", `${c.ref_code} -> pending_approval ✅ (approve ka wait)`);

     // Zoho Drafts folder mein bhi draft save karo (fail ho to baaki flow na ruke)
    try {
      await zoho.saveDraft({ to: from, subject: c.subject, content: c.draft_reply });
      log("ZOHO", `draft reply Zoho ke Drafts folder mein save ho gayi ✅ (to: ${from})`);
    } catch (e) {
      logErr("ZOHO", `draft save fail (baaki flow chalta rahega): ${e.message}`);
    }

    // ClickUp: sender ki email se task dhoondo, usme AI draft Reply update karo
    step = "ClickUp update";

    // ClickUp: sender ki email se task dhoondo, usme AI draft Reply update karo
    step = "ClickUp update";
    const listId = client.clickup_list_id || s.clickupListId;
    if (s.clickupApiToken && listId) {
      const r = await clickup.syncDraft({ listId, email: from, name: client.name, draft: c.draft_reply });
      c.clickup_task_id = r.taskId;
      const where = r.via === "comment" ? "COMMENT mein daal diya (custom field limit poori hai) ⚠️" : "AI draft Reply field update ho gayi ✅";
      log(
        "CLICKUP",
        r.created
          ? `${from} ka task nahi mila, naya task bana (${r.taskId}), draft: ${where}`
          : `${from} se task match hua (${r.taskId}), draft: ${where}`
      );
    } else {
      log("CLICKUP", "token/list id nahi hai, skip");
    }
  } catch (e) {
    c.last_error = e.message; // notice kabhi silently gum nahi hoga
    logErr("CASE", `${c.ref_code} "${step}" step pe fail, status ${c.status} pe ruka: ${e.message}`);
  }
  await c.save();
  return true;
}