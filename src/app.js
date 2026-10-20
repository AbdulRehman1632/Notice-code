// import express from "express";
// import mongoose from "mongoose";
// import { settings } from "./config.js";
// import { connectDB } from "./db.js";
// import { Case, CaseStatus } from "./models/Case.js";
// import { Client } from "./models/Client.js";
// import cron from "node-cron";
// import { newCase } from "./services/cases.js";
// import { pollInbox } from "./services/pipeline.js";
// import * as zoho from "./services/zoho.js";
// import * as clickup from "./services/clickup.js";
// import { log } from "./utils/log.js";

// const app = express();
// app.use(express.json());

// // ---------- helpers ----------
// function caseOut(c) {
//   return {
//     id: c._id,
//     ref_code: c.ref_code,
//     status: c.status,
//     client: c.client?.name ?? null, 
//     notice_json: c.notice_json ?? null,
//     from_email: c.from_email ?? null,
//     subject: c.subject ?? null,
//     draft_reply: c.draft_reply ?? null,
//     final_reply: c.final_reply ?? null,
//     clickup_task_id: c.clickup_task_id ?? null,
//     last_error: c.last_error ?? null,
//     created_at: c.createdAt,
//   };
// }

// const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);



// // ---------- routes ----------
// app.get("/health", (req, res) => res.json({ ok: true }));

// app.post("/clients", wrap(async (req, res) => {
//   const { name, phone, email } = req.body;
//   if (!name) return res.status(422).json({ detail: "name is required" });
//   const client = await Client.create({ name, phone, email });
//   res.json({ id: client._id, name: client.name });
// }));

// app.get("/clients", wrap(async (req, res) => {
//   const clients = await Client.find();
//   res.json(clients.map((c) => ({ id: c._id, name: c.name, phone: c.phone, email: c.email })));
// }));

// // Phase 1 manual testing. Phase 2 me Retell ka create_notice_case function newCase() call karega.
// app.post("/cases", wrap(async (req, res) => {
//   const { client_id } = req.body;
//   if (client_id) {
//     if (!mongoose.isValidObjectId(client_id) || !(await Client.findById(client_id))) {
//       return res.status(404).json({ detail: "client not found" });
//     }
//   }
//   const c = await newCase({ client: client_id || null });
//   await c.populate("client");
//   res.json(caseOut(c));
// }));

// app.get("/cases", wrap(async (req, res) => {
//   const { status } = req.query;
//   if (status && !Object.values(CaseStatus).includes(status)) {
//     return res.status(422).json({ detail: "invalid status" });
//   }
//   const filter = status ? { status } : {};
//   const cases = await Case.find(filter).sort({ _id: -1 }).populate("client");
//   res.json(cases.map(caseOut));
// }));

// app.get("/cases/:refCode", wrap(async (req, res) => {
//   const c = await Case.findOne({ ref_code: req.params.refCode }).populate("client");
//   if (!c) return res.status(404).json({ detail: "case not found" });
//   res.json(caseOut(c));
// }));

// // Manual poll trigger (testing ke liye)
// app.post("/poll", wrap(async (req, res) => res.json(await pollInbox())));

// // Staff approve -> reply send -> ClickUp update
// app.post("/cases/:refCode/approve", wrap(async (req, res) => {
//   const c = await Case.findOne({ ref_code: req.params.refCode }).populate("client");
//   if (!c) return res.status(404).json({ detail: "case not found" });
//   if (c.status !== CaseStatus.pending_approval)
//     return res.status(409).json({ detail: `case is ${c.status}, not pending_approval` });

//   c.final_reply = req.body?.final_reply || c.draft_reply;
//   await zoho.sendReply(c.zoho_message_id, {
//     to: c.from_email, subject: c.subject, content: c.final_reply,
//   });
//   c.status = CaseStatus.replied;
//   c.last_error = null;
//   await c.save();
//   log("REPLY", `${c.ref_code} ka reply ${c.from_email} ko send ho gaya -> replied ✅`);

//   if (c.clickup_task_id)
//     await clickup.addComment(c.clickup_task_id, "Reply sent to client.").catch((e) => console.error(e.message));
//   res.json(caseOut(c));
// }));

// // ---------- error handler ---------- 
// app.use((err, req, res, next) => {
//   console.error(err);
//   if (err.code === 11000) return res.status(409).json({ detail: "duplicate value", keys: err.keyValue });
//   if (err.name === "ValidationError") return res.status(422).json({ detail: err.message });
//   res.status(500).json({ detail: "internal server error" });
// });


// // ---------- start ---------- 
// connectDB()
//   .then(() => {
//     app.listen(settings.port, () => console.log(`Server: http://localhost:${settings.port}`));
//     log("SERVER", `poller chalu (cron: ${settings.pollCron})`);
//     cron.schedule(settings.pollCron, () => pollInbox().catch((e) => console.error("poll:", e.message)));
//     app.get("/api/poll", wrap(async (req, res) => {
//   const result = await pollInbox();
//   res.json(result);
// }));
//   })
//   .catch((e) => {
//     console.error("MongoDB connection failed:", e.message);
//     process.exit(1);
//   }); 


import express from "express";
import mongoose from "mongoose";
import { settings } from "./config.js";
import { connectDB } from "./db.js";
import { Case, CaseStatus } from "./models/Case.js";
import { Client } from "./models/Client.js";
import { newCase } from "./services/cases.js";
import { pollInbox } from "./services/pipeline.js";
import * as zoho from "./services/zoho.js";
import * as clickup from "./services/clickup.js";
import { log } from "./utils/log.js";

const app = express();
app.use(express.json());

// ---------- helpers ----------
function caseOut(c) {
  return {
    id: c._id,
    ref_code: c.ref_code,
    status: c.status,
    client: c.client?.name ?? null, 
    notice_json: c.notice_json ?? null,
    from_email: c.from_email ?? null,
    subject: c.subject ?? null,
    draft_reply: c.draft_reply ?? null,
    final_reply: c.final_reply ?? null,
    clickup_task_id: c.clickup_task_id ?? null,
    last_error: c.last_error ?? null,
    created_at: c.createdAt,
  };
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- routes ----------
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/clients", wrap(async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name) return res.status(422).json({ detail: "name is required" });
  const client = await Client.create({ name, phone, email });
  res.json({ id: client._id, name: client.name });
}));

app.get("/clients", wrap(async (req, res) => {
  const clients = await Client.find();
  res.json(clients.map((c) => ({ id: c._id, name: c.name, phone: c.phone, email: c.email })));
}));

app.post("/cases", wrap(async (req, res) => {
  const { client_id } = req.body;
  if (client_id) {
    if (!mongoose.isValidObjectId(client_id) || !(await Client.findById(client_id))) {
      return res.status(404).json({ detail: "client not found" });
    }
  }
  const c = await newCase({ client: client_id || null });
  await c.populate("client");
  res.json(caseOut(c));
}));

app.get("/cases", wrap(async (req, res) => {
  const { status } = req.query;
  if (status && !Object.values(CaseStatus).includes(status)) {
    return res.status(422).json({ detail: "invalid status" });
  }
  const filter = status ? { status } : {};
  const cases = await Case.find(filter).sort({ _id: -1 }).populate("client");
  res.json(cases.map(caseOut));
}));

app.get("/cases/:refCode", wrap(async (req, res) => {
  const c = await Case.findOne({ ref_code: req.params.refCode }).populate("client");
  if (!c) return res.status(404).json({ detail: "case not found" });
  res.json(caseOut(c));
}));

// Yahan se cron-job.org is route ko har 1 minute mein hit karega
app.get("/api/poll", wrap(async (req, res) => {
  // Serverless mein database connection lazmi ensure karna parta hai har request par
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
  const result = await pollInbox();
  res.json(result);
}));

app.post("/poll", wrap(async (req, res) => {
  if (mongoose.connection.readyState === 0) await connectDB();
  res.json(await pollInbox());
}));

app.post("/cases/:refCode/approve", wrap(async (req, res) => {
  if (mongoose.connection.readyState === 0) await connectDB();
  const c = await Case.findOne({ ref_code: req.params.refCode }).populate("client");
  if (!c) return res.status(404).json({ detail: "case not found" });
  if (c.status !== CaseStatus.pending_approval)
    return res.status(409).json({ detail: `case is ${c.status}, not pending_approval` });

  c.final_reply = req.body?.final_reply || c.draft_reply;
  await zoho.sendReply(c.zoho_message_id, {
    to: c.from_email, subject: c.subject, content: c.final_reply,
  });
  c.status = CaseStatus.replied;
  c.last_error = null;
  await c.save();
  log("REPLY", `${c.ref_code} ka reply ${c.from_email} ko send ho gaya -> replied ✅`);

  if (c.clickup_task_id)
    await clickup.addComment(c.clickup_task_id, "Reply sent to client.").catch((e) => console.error(e.message));
  res.json(caseOut(c));
}));

// ---------- error handler ---------- 
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ detail: "duplicate value", keys: err.keyValue });
  if (err.name === "ValidationError") return res.status(422).json({ detail: err.message });
  res.status(500).json({ detail: "internal server error" });
});

// Database connection initialization for Vercel
if (mongoose.connection.readyState === 0) {
  connectDB().catch((e) => console.error("MongoDB connection failed:", e.message));
}

// Vercel ke liye app export karna zaroori hai
export default app;