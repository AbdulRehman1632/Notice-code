import { settings as s } from "../config.js";
import { log } from "../utils/log.js";

let token = null;
let expiresAt = 0;

async function accessToken() {
  if (token && Date.now() < expiresAt) return token;
  const url = new URL(`${s.zohoAccountsDomain}/oauth/v2/token`);
  url.search = new URLSearchParams({
    refresh_token: s.zohoRefreshToken,
    client_id: s.zohoClientId,
    client_secret: s.zohoClientSecret,
    grant_type: "refresh_token",
  });
  const j = await (await fetch(url, { method: "POST" })).json();
  if (!j.access_token) throw new Error("Zoho token error: " + JSON.stringify(j));
  token = j.access_token;
  log("ZOHO", "access token refreshed ");
  expiresAt = Date.now() + ((j.expires_in || 3600) - 60) * 1000;
  return token;
}

async function zoho(path, { method = "GET", body, raw = false } = {}) {
  const r = await fetch(`${s.zohoMailDomain}/api/accounts/${s.zohoAccountId}${path}`, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${await accessToken()}`,
      Accept: raw ? "*/*" : "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Zoho ${method} ${path} -> ${r.status} ${await r.text()}`);
  return raw ? Buffer.from(await r.arrayBuffer()) : r.json();
}

export const listUnread = async () =>
  (await zoho("/messages/view?status=unread&limit=20")).data || [];

export async function getContent(folderId, messageId) {
  const j = await zoho(`/folders/${folderId}/messages/${messageId}/content`);
  return (j.data?.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function getAttachments(folderId, messageId) {
  const j = await zoho(`/folders/${folderId}/messages/${messageId}/attachmentinfo`);
  return j.data?.attachments || [];
}

export const downloadAttachment = (folderId, messageId, attId) =>
  zoho(`/folders/${folderId}/messages/${messageId}/attachments/${attId}`, { raw: true });

export const markRead = (messageId) =>
  zoho("/updatemessage", { method: "PUT", body: { mode: "markAsRead", messageId: [messageId] } });

export const sendReply = (messageId, { to, subject, content }) =>
  zoho(`/messages/${messageId}`, {
    method: "POST",
    body: {
      action: "reply",
      fromAddress: s.firmEmail,
      toAddress: to,
      subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
      content: content.replace(/\n/g, "<br>"),
    },
  });

  export const saveDraft = ({ to, subject, content }) =>
  zoho("/messages", {
    method: "POST",
    body: {
      mode: "draft",
      fromAddress: s.firmEmail,
      toAddress: to,
      subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
      content: content.replace(/\n/g, "<br>"),
    },
  });