import { FETCH_DISCLOSURES_TOOL_NAME } from "../contracts/tool.js";

export const DISCLOSURE_INTAKE_SKILL = "disclosure-intake-skill";

export type SkillSelection = {
  skill: typeof DISCLOSURE_INTAKE_SKILL;
  tool: typeof FETCH_DISCLOSURES_TOOL_NAME;
};

export const selectDisclosureIntakeSkill = (): SkillSelection => ({
  skill: DISCLOSURE_INTAKE_SKILL,
  tool: FETCH_DISCLOSURES_TOOL_NAME
});
