import mongoose from "mongoose";

export const CaseStatus = Object.freeze({
  awaiting_email: "awaiting_email",
  email_received: "email_received",
  extracted: "extracted",
  pending_approval: "pending_approval",
  replied: "replied",
});

const caseSchema = new mongoose.Schema(
  {
    ref_code: { type: String, maxlength: 20, unique: true, sparse: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    status: {
      type: String,
      enum: Object.values(CaseStatus),
      default: CaseStatus.awaiting_email,
      index: true,
    },

    from_email: { type: String, maxlength: 200 },
    subject: { type: String, maxlength: 500 },

    retell_call_id: { type: String, maxlength: 100, unique: true, sparse: true },
    zoho_message_id: { type: String, maxlength: 100, unique: true, sparse: true },
    notice_json: { type: mongoose.Schema.Types.Mixed },
    draft_reply: String,
    final_reply: String,
    clickup_task_id: { type: String, maxlength: 50 },

    // Extras used by later steps
    attachment_path: { type: String, maxlength: 500 }, // Step 7
    call_data: { type: mongoose.Schema.Types.Mixed }, // Step 6: transcript + analysis
    last_error: String, // Step 11: never lose a notice silently
  },
  { timestamps: true } // createdAt, updatedAt
);

export const Case = mongoose.model("Case", caseSchema);
