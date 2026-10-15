import { Case, CaseStatus } from "../models/Case.js";
import { nextSeq } from "../models/Counter.js";

export async function newCase(fields = {}) {
  const seq = await nextSeq("case");
  return Case.create({
    status: CaseStatus.awaiting_email,
    ...fields,
    ref_code: `NTC-${1000 + seq}`,
  });
}
