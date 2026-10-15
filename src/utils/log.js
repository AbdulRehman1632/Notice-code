const ts = () => new Date().toLocaleTimeString("en-GB");
export const log = (tag, msg) => console.log(`[${ts()}] [${tag}] ${msg}`);
export const logErr = (tag, msg) => console.error(`[${ts()}] [${tag}] ❌ ${msg}`);
