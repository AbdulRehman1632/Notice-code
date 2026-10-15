import mongoose from "mongoose";
import { settings } from "./config.js";

export async function connectDB() {
  await mongoose.connect(settings.mongodbUri);
  console.log("MongoDB connected");
}
