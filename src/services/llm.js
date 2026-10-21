// import { settings as s } from "../config.js";

// async function callLLM(content, system, maxTokens = 1500) {
//   // const r = await fetch("https://api.anthropic.com/v1/messages", {
//   //   method: "POST",
//   //   headers: {
//   //     "x-api-key": s.llmApiKey,
//   //     "anthropic-version": "2023-06-01",
//   //     "content-type": "application/json",
//   //   },
//   //   body: JSON.stringify({
//   //     model: s.llmModel,
//   //     max_tokens: maxTokens,
//   //     system,
//   //     messages: [{ role: "user", content }],
//   //   }),
//     const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "x-api-key": s.llmApiKey,
//       // "anthropic-version": "2023-06-01",
//       "content-type": "application/json",
//     },
//     body: JSON.stringify({
//       model: s.llmModel,
//       max_tokens: maxTokens,
//       system,
//       messages: [{ role: "user", content }],
//     }),
//   });
//   const j = await r.json();
//   if (!r.ok) throw new Error("LLM error: " + JSON.stringify(j));
//   return j.content.filter((b) => b.type === "text").map((b) => b.text).join("");
// }

// // Attachment (PDF/image) seedha LLM ko jata hai, alag OCR ki zarurat nahi
// export async function extractNotice({ emailText, attachment }) {
//   const content = [];
//   if (attachment) {
//     const data = attachment.buffer.toString("base64");
//     content.push(
//       attachment.mime === "application/pdf"
//         ? { type: "document", source: { type: "base64", media_type: attachment.mime, data } }
//         : { type: "image", source: { type: "base64", media_type: attachment.mime, data } }
//     );
//   }
//   content.push({
//     type: "text",
//     text: `Email body:\n${emailText || "(empty)"}\n\nExtract the notice details.`,
//   });

//   const out = await callLLM(
//     content,
//     `You extract data from official notices. Reply with ONLY valid JSON with keys:
// notice_type, issuing_authority, notice_number, date_issued, due_date, amount_due, summary, required_action.
// Use null for anything not found.`
//   );
//   return JSON.parse(out.replace(/```json|```/g, "").trim());
// }

// export const draftReply = (notice, clientName) =>
//   callLLM(
//     `Client: ${clientName}\nNotice data: ${JSON.stringify(notice)}`,
//     `You write professional, concise email replies for a firm acknowledging a client's notice.
// Confirm receipt, summarise the notice, state next steps/deadline. Plain text, no subject line.`,
//     800
//   );


// 5-10-2026

// import pdf from "pdf-parse/lib/pdf-parse.js";
// import { settings as s } from "../config.js";

// const EXTRACT_SYSTEM = `You extract data from official notices. Reply with ONLY valid JSON with keys:
// notice_type, issuing_authority, notice_number, date_issued, due_date, amount_due, summary, required_action.
// Use null for anything not found.`;

// // Groq = OpenAI-compatible API (Bearer auth, system alag message, response choices[0] mein)
// async function callLLM({ system, user, model = s.llmModel, maxTokens = 4000, json = false }) {
//   const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: { Authorization: `Bearer ${s.llmApiKey}`, "content-type": "application/json" },
//     body: JSON.stringify({
//       model,
//       max_tokens: maxTokens,
//       temperature: 0.2,
//       ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
//       ...(json ? { response_format: { type: "json_object" } } : {}),
//       messages: [
//         { role: "system", content: system },
//         { role: "user", content: user },
//       ],
//     }),
//   });
//   const j = await r.json();
//   if (!r.ok) throw new Error("LLM error: " + JSON.stringify(j));
//   const text = j.choices?.[0]?.message?.content;
//   if (!text) throw new Error("LLM ne khali reply diya: " + JSON.stringify(j.choices?.[0]));
//   return text;
// }

// export async function extractNotice({ emailText, attachment }) {
//   let docText = "";
//   let image = null;

//   if (attachment?.mime === "application/pdf") {
//     docText = (await pdf(attachment.buffer)).text.trim();
//     if (docText.length < 30)
//       throw new Error("PDF mein text nahi mila (scanned lagti hai). Image (png/jpg) bhejo ya OCR add karo");
//   } else if (attachment) {
//     image = attachment;
//   }

//   const prompt =
//     `Email body:\n${emailText || "(empty)"}\n\n` +
//     `Notice document text:\n${docText.slice(0, 8000) || "(see attached image)"}\n\nExtract the notice details.`;

//   const user = image
//     ? [
//         { type: "text", text: prompt },
//         { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.buffer.toString("base64")}` } },
//       ]
//     : prompt;

//   const out = await callLLM({
//     system: EXTRACT_SYSTEM,
//     user,
//     model: image ? s.llmVisionModel : s.llmModel,
//     json: !image,
//   });
//   return JSON.parse(out.replace(/```json|```/g, "").trim());
// }

// export const draftReply = (notice, clientName) =>
//   callLLM({
//     system: `You write professional, concise email replies for a firm acknowledging a client's notice.
// Confirm receipt, summarise the notice, state next steps/deadline. Plain text, no subject line.`,
//     user: `Client: ${clientName}\nNotice data: ${JSON.stringify(notice)}`,
//     maxTokens: 2000,
//   });


// ===============================================================================

// import pdf from "pdf-parse/lib/pdf-parse.js";
// import { pdf as pdfToImages } from "pdf-to-img";
// import { settings as s } from "../config.js";
// import { log } from "../utils/log.js";

// const MAX_PAGES = 3; // scanned PDF ke sirf pehle 3 pages vision model ko jayenge

// const EXTRACT_SYSTEM = `You extract data from official notices. Reply with ONLY valid JSON with keys:
// notice_type, issuing_authority, notice_number, date_issued, due_date, amount_due, summary, required_action.
// Use null for anything not found.`;

// // Groq = OpenAI-compatible API (Bearer auth, system alag message, response choices[0] mein)
// async function callLLM({ system, user, model = s.llmModel, maxTokens = 4000, json = false }) {
//   const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method: "POST",
//     headers: { Authorization: `Bearer ${s.llmApiKey}`, "content-type": "application/json" },
//     body: JSON.stringify({
//       model,
//       max_tokens: maxTokens,
//       temperature: 0.2,
//       ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
//       ...(json ? { response_format: { type: "json_object" } } : {}),
//       messages: [
//         { role: "system", content: system },
//         { role: "user", content: user },
//       ],
//     }),
//   });
//   const j = await r.json();
//   if (!r.ok) throw new Error("LLM error: " + JSON.stringify(j));
//   const text = j.choices?.[0]?.message?.content;
//   if (!text) throw new Error("LLM ne khali reply diya: " + JSON.stringify(j.choices?.[0]));
//   return text;
// }

// // Reasoning models <think>...</think> likhte hain, usko hata kar sirf JSON nikalo
// export function parseJSON(out) {
//   const clean = out.replace(/<think>[\s\S]*?<\/think>/g, "");
//   const a = clean.indexOf("{");
//   const b = clean.lastIndexOf("}");
//   if (a === -1 || b === -1) throw new Error("LLM ke jawab mein JSON nahi mila: " + out.slice(0, 200));
//   return JSON.parse(clean.slice(a, b + 1));
// }

// // Scanned PDF -> pages ko PNG images bana do
// async function pdfPagesToImages(buffer) {
//   const images = [];
//   const doc = await pdfToImages(buffer, { scale: 2 });
//   for await (const page of doc) {
//     images.push({ mime: "image/png", buffer: page });
//     if (images.length >= MAX_PAGES) break;
//   }
//   return images;
// }

// export async function extractNotice({ emailText, attachment }) {
//   let docText = "";
//   let images = [];

//   if (attachment?.mime === "application/pdf") {
//     docText = (await pdf(attachment.buffer)).text.trim();
//     if (docText.length < 30) {
//       log("LLM", "PDF mein text nahi (scanned), pages ko image bana kar vision model ko bhej raha hoon...");
//       docText = "";
//       images = await pdfPagesToImages(attachment.buffer);
//       if (!images.length) throw new Error("PDF se koi page image nahi bana");
//       log("LLM", `${images.length} page(s) image ban gaye`);
//     }
//   } else if (attachment) {
//     images = [attachment]; // png/jpg
//   }

//   const prompt =
//     `Email body:\n${emailText || "(empty)"}\n\n` +
//     `Notice document text:\n${docText.slice(0, 8000) || "(see attached image(s))"}\n\nExtract the notice details.`;

//   const user = images.length
//     ? [
//         { type: "text", text: prompt },
//         ...images.map((img) => ({
//           type: "image_url",
//           image_url: { url: `data:${img.mime};base64,${img.buffer.toString("base64")}` },
//         })),
//       ]
//     : prompt;

//   const out = await callLLM({
//     system: EXTRACT_SYSTEM,
//     user,
//     model: images.length ? s.llmVisionModel : s.llmModel,
//     json: !images.length,
//   });
//   return parseJSON(out);
// }

// export const draftReply = (notice, clientName) =>
//   callLLM({
//     system: `You write professional, concise email replies for a firm acknowledging a client's notice.
// Confirm receipt, summarise the notice, state next steps/deadline. Plain text, no subject line.`,
//     user: `Client: ${clientName}\nNotice data: ${JSON.stringify(notice)}`,
//     maxTokens: 2000,
//   }).then((t) => t.replace(/<think>[\s\S]*?<\/think>/g, "").trim());





























// import pdf from "pdf-parse/lib/pdf-parse.js";
// import { pdf as pdfToImages } from "pdf-to-img";
// import { settings as s } from "../config.js";
// import { log } from "../utils/log.js";

// const MAX_PAGES = 3; // scanned PDF ke sirf pehle 3 pages padhe jayenge
// const RETRY_CODES = [429, 500, 502, 503, 504];
// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// const stripThink = (t) => t.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

// const OCR_SYSTEM = `You are an OCR engine. Transcribe ALL the text visible in the image exactly as written,
// keeping numbers, dates, amounts, form names and table rows intact. Output ONLY the transcribed text, nothing else.`;

// const EXTRACT_SYSTEM = `You extract data from official notices (tax, government, legal). Reply with ONLY valid JSON with keys:
// notice_type, issuing_authority, notice_number, date_issued, due_date, amount_due, summary,
// reason_for_notice (string: why this notice was issued, in plain words),
// issues (array of strings: EVERY error, discrepancy, mismatch, missing document/information, penalty or problem the notice points out, each with specifics such as amounts, tax years, form names),
// required_action.
// Use null for anything not found and [] if there are no issues. Never invent facts.`;

// // OpenAI-compatible API (Groq / OpenRouter). 429/5xx ya khali jawab par 3 baar tak retry.
// async function callLLM({
//   system, user, model = s.llmModel, baseUrl = s.llmBaseUrl, apiKey = s.llmApiKey, maxTokens = 4000, json = false,
// }) {
//   for (let attempt = 1; ; attempt++) {
//     const r = await fetch(`${baseUrl}/chat/completions`, {
//       method: "POST",
//       headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
//       body: JSON.stringify({
//         model,
//         max_tokens: maxTokens,
//         temperature: 0.2,
//         ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
//         ...(json ? { response_format: { type: "json_object" } } : {}),
//         messages: [
//           { role: "system", content: system},
//           { role: "user", content: user },
//         ],
//       }),
//     });
//     const j = await r.json().catch(() => ({}));
//     const failed = !r.ok || j.error;
//     const status = r.ok ? Number(j.error?.code) || 500 : r.status; // OpenRouter kabhi 200 ke saath error deta hai

//     if (failed) {
//       if (RETRY_CODES.includes(status) && attempt < 3) {
//         log("LLM", `${status} error aaya, ${attempt * 3}s baad dobara try (${attempt}/3)...`);
//         await sleep(attempt * 3000);
//         continue;
//       }
//       throw new Error("LLM error: " + JSON.stringify(j));
//     }

//     const text = j.choices?.[0]?.message?.content;
//     if (!text) {
//       if (attempt < 3) {
//         log("LLM", `khali jawab aaya, dobara try (${attempt}/3)...`);
//         await sleep(attempt * 2000);
//         continue;
//       }
//       throw new Error("LLM ne khali reply diya: " + JSON.stringify(j.choices?.[0]));
//     }
//     return text;
//   }
// }

// // Reasoning models <think>...</think> likhte hain, usko hata kar sirf JSON nikalo
// export function parseJSON(out) {
//   const clean = stripThink(out);
//   const a = clean.indexOf("{");
//   const b = clean.lastIndexOf("}");
//   if (a === -1 || b === -1) throw new Error("LLM ke jawab mein JSON nahi mila: " + out.slice(0, 200));
//   return JSON.parse(clean.slice(a, b + 1));
// }

// // Scanned PDF -> pages ko PNG images bana do
// async function pdfPagesToImages(buffer) {
//   const images = [];
//   const doc = await pdfToImages(buffer, { scale: 2 });
//   for await (const page of doc) {
//     images.push({ mime: "image/png", buffer: page });
//     if (images.length >= MAX_PAGES) break;
//   }
//   return images;
// }

// // Vision model sirf OCR ke liye: har page alag request (free models multi-image pe fail hote hain)
// async function transcribeImages(images) {
//   const model = s.llmVisionModel;
//   if (!model) throw new Error("LLM_VISION_MODEL set nahi hai (.env check karo)");
//   const pages = [];
//   for (let i = 0; i < images.length; i++) {
//     log("LLM", `page ${i + 1}/${images.length} vision se padh raha hoon (${model})...`);
//     const url = `data:${images[i].mime};base64,${images[i].buffer.toString("base64")}`;
//     const txt = await callLLM({
//       system: OCR_SYSTEM,
//       user: [
//         { type: "text", text: "Transcribe this page." },
//         { type: "image_url", image_url: { url } },
//       ],
//       model,
//       baseUrl: s.llmVisionBaseUrl,
//       apiKey: s.llmVisionApiKey,
//     });
//     pages.push(`--- Page ${i + 1} ---\n${stripThink(txt)}`);
//   }
//   const all = pages.join("\n\n");
//   log("LLM", `vision se ${all.length} chars ka text mila`);
//   return all;
// }

// export async function extractNotice({ emailText, attachment }) {
//   let docText = "";
//   let images = [];

//   if (attachment?.mime === "application/pdf") {
//     docText = (await pdf(attachment.buffer)).text.trim();
//     if (docText.length < 30) {
//       log("LLM", "PDF mein text nahi (scanned), pages ko image bana raha hoon...");
//       images = await pdfPagesToImages(attachment.buffer);
//       if (!images.length) throw new Error("PDF se koi page image nahi bana");
//       log("LLM", `${images.length} page(s) image ban gaye`);
//     }
//   } else if (attachment) {
//     images = [attachment]; // png/jpg
//   }

//   // image/scanned ho to pehle vision se text nikalo, phir extract text model (Groq) karega
//   if (images.length) {
//     docText = await transcribeImages(images);
//     if (docText.replace(/--- Page \d+ ---/g, "").trim().length < 20)
//       throw new Error("Image/scanned PDF se text nahi padha gaya");
//   }

//   const prompt =
//     `Email body:\n${emailText || "(empty)"}\n\n` +
//     `Notice document text:\n${docText.slice(0, 9000) || "(no document text)"}\n\nExtract the notice details.`;

//   log("LLM", `model: ${s.llmModel} (text extract)`);
//   const out = await callLLM({ system: EXTRACT_SYSTEM, user: prompt, json: true });
//   return parseJSON(out);
// }

// const displayName = (n) => (!n || n.includes("@") ? "Valued Client" : n);

// export const draftReply = (notice, clientName) => {
//   const name = displayName(clientName);
//   return callLLM({
//     system: `You write email replies on behalf of a firm to a client who forwarded a notice.
// Use ONLY facts present in the notice data. Never invent numbers, dates, or issues.
// Write plain text (no markdown, no subject line) in exactly this structure:

// 1. First line exactly: Dear ${name},
// 2. One short paragraph: we received and reviewed your notice; mention notice type, number, issuing authority and date when available.
// 3. "Why you received this notice:" a plain-language explanation using reason_for_notice and summary.
// 4. "Errors / issues mentioned in the notice:" a numbered list (1., 2., 3.) with EVERY item from "issues", keeping the specifics (amounts, periods, forms). If issues is empty, write one line saying the notice does not list specific errors.
// 5. "What needs to be done:" required_action, plus due_date and amount_due if present.
// 6. Closing: say we will handle the next steps and they can reply with any questions, then sign off with:
// Best regards,
// ${s.firmName}

// Keep the tone professional and simple; explain any jargon.`,
//     user: `Notice data: ${JSON.stringify(notice)}`,
//     maxTokens: 3000,
//   }).then(stripThink);
// };













import pdf from "pdf-parse/lib/pdf-parse.js";
import { settings as s } from "../config.js";
import { log } from "../utils/log.js";

const RETRY_CODES = [429, 500, 502, 503, 504];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripThink = (t) => t.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

const EXTRACT_SYSTEM = `You extract data from official notices (tax, government, legal). Reply with ONLY valid JSON with keys:
notice_type, issuing_authority, notice_number, date_issued, due_date, amount_due, summary,
reason_for_notice (string: why this notice was issued, in plain words),
issues (array of strings: EVERY error, discrepancy, mismatch, missing document/information, penalty or problem the notice points out, each with specifics such as amounts, tax years, form names),
required_action.
Use null for anything not found and [] if there are no issues. Never invent facts.`;

async function callLLM({
  system, user, model = s.llmModel, baseUrl = s.llmBaseUrl, apiKey = s.llmApiKey, maxTokens = 4000, json = false,
}) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const j = await r.json().catch(() => ({}));
    const failed = !r.ok || j.error;
    const status = r.ok ? Number(j.error?.code) || 500 : r.status;

    if (failed) {
      if (RETRY_CODES.includes(status) && attempt < 3) {
        log("LLM", `${status} error aaya, ${attempt * 3}s baad dobara try (${attempt}/3)...`);
        await sleep(attempt * 3000);
        continue;
      }
      throw new Error("LLM error: " + JSON.stringify(j));
    }

    const text = j.choices?.[0]?.message?.content;
    if (!text) {
      if (attempt < 3) {
        log("LLM", `khali jawab aaya, dobara try (${attempt}/3)...`);
        await sleep(attempt * 2000);
        continue;
      }
      throw new Error("LLM ne khali reply diya: " + JSON.stringify(j.choices?.[0]));
    }
    return text;
  }
}

export function parseJSON(out) {
  const clean = stripThink(out);
  const a = clean.indexOf("{");
  const b = clean.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("LLM ke jawab mein JSON nahi mila: " + out.slice(0, 200));
  return JSON.parse(clean.slice(a, b + 1));
}

export async function extractNotice({ emailText, attachment }) {
  let docText = "";

  if (attachment?.mime === "application/pdf") {
    const parsed = await pdf(attachment.buffer);
    docText = parsed.text.trim();
  } else if (attachment) {
    // Agar image ho toh skip ya handle karein
    docText = "(image attachment)";
  }

  const prompt =
    `Email body:\n${emailText || "(empty)"}\n\n` +
    `Notice document text:\n${docText.slice(0, 9000) || "(no document text)"}\n\nExtract the notice details.`;

  log("LLM", `model: ${s.llmModel} (text extract)`);
  const out = await callLLM({ system: EXTRACT_SYSTEM, user: prompt, json: true });
  return parseJSON(out);
}

const displayName = (n) => (!n || n.includes("@") ? "Valued Client" : n);

export const draftReply = (notice, clientName) => {
  const name = displayName(clientName);
  return callLLM({
    system: `You write email replies on behalf of a firm to a client who forwarded a notice.
Use ONLY facts present in the notice data. Never invent numbers, dates, or issues.
Write plain text (no markdown, no subject line) in exactly this structure:

1. First line exactly: Dear ${name},
2. One short paragraph: we received and reviewed your notice; mention notice type, number, issuing authority and date when available.
3. "Why you received this notice:" a plain-language explanation using reason_for_notice and summary.
4. "Errors / issues mentioned in the notice:" a numbered list (1., 2., 3.) with EVERY item from "issues", keeping the specifics (amounts, periods, forms). If issues is empty, write one line saying the notice does not list specific errors.
5. "What needs to be done:" required_action, plus due_date and amount_due if present.
6. Closing: say we will handle the next steps and they can reply with any questions, then sign off with:
Best regards,
${s.firmName}

Keep the tone professional and simple; explain any jargon.`,
    user: `Notice data: ${JSON.stringify(notice)}`,
    maxTokens: 3000,
  }).then(stripThink);
};