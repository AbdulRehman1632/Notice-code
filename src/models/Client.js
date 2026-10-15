import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200 },
    // sparse: null/undefined phone wale multiple clients allowed
    phone: { type: String, maxlength: 30, unique: true, sparse: true },
    email: { type: String, maxlength: 200, index: true },
    clickup_list_id: { type: String, maxlength: 50 },
  },
  { timestamps: true }
);

export const Client = mongoose.model("Client", clientSchema);
