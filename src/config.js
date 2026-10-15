import "dotenv/config";

export const settings = {
  port: process.env.PORT || 8000,
  // Local MongoDB fallback (Atlas ka URI .env me daal do)
  mongodbUri: process.env.MONGODB_URI || "",
  firmEmail: process.env.FIRM_EMAIL || "notices@firm.com",
  firmName: process.env.FIRM_NAME || "Tax Magic Inc",

  zohoClientId: process.env.ZOHO_CLIENT_ID || "",
  zohoClientSecret: process.env.ZOHO_CLIENT_SECRET || "",
  zohoRefreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
  zohoAccountId: process.env.ZOHO_ACCOUNT_ID || "",
  zohoAccountsDomain: process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com",
  zohoMailDomain: process.env.ZOHO_MAIL_DOMAIN || "https://mail.zoho.com",

  clickupApiToken: process.env.CLICKUP_API_TOKEN || "",
  clickupListId: process.env.CLICKUP_LIST_ID || "",


//   // llmModel: process.env.LLM_MODEL || "claude-sonnet-5-5",
//   llmModel: process.env.LLM_MODEL || "openai/gpt-oss-120b",
//   pollCron: process.env.POLL_CRON || "*/1 * * * *",
//   retellApiKey: process.env.RETELL_API_KEY || "",
// };

  llmBaseUrl: (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, ""), // OpenRouter: https://openrouter.ai/api/v1
llmApiKey: process.env.LLM_API_KEY || "", // key sirf .env mein rakho
  llmModel: process.env.LLM_MODEL || "openai/gpt-oss-120b",

   llmVisionBaseUrl: (process.env.LLM_VISION_BASE_URL || process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
  llmVisionApiKey: process.env.LLM_VISION_API_KEY || process.env.LLM_API_KEY || "",

llmVisionModel: process.env.LLM_VISION_MODEL || "openrouter/free",
  pollCron: process.env.POLL_CRON || "*/1 * * * *",
  retellApiKey: process.env.RETELL_API_KEY || "",
};








