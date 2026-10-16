// Browser entry of READ FRANCE's reading engine (VREAD-corp/vread-reading-engine), bundled by tools/bundle-engine.mjs
// into src/assets/engine.js. Only the parts the teacher tool runs: the historical segmenter (H1), the checkpoint
// format and builder, and the offline QA rules (H3). No prompt, no network call.
export { segmentText, DEFAULT_SEGMENT_WORDS } from "@engine/ingest/segmenter";
export {
  CHECKPOINT_FORMAT, segmentUnits, segmentWholeText, answerCandidates, fallbackCheckpoint, buildCheckpoints, checkpointsOk,
} from "@engine/checkpoints/build";
export { runQa } from "@engine/qa/run";
export { checkQuestion, isYesNoQuestion, GENERIC_ANSWERS, QUESTION_MIN_LENGTH, QUESTION_MAX_LENGTH } from "@engine/qa/question-rules";
export { validateQuestion } from "@engine/qa/validator";
export { answerAppearsInText, buildWordSet } from "@engine/qa/answer-presence";
export { matchEvidence } from "@engine/qa/evidence";
export { findDuplicates, similarity, DUPLICATE_THRESHOLD } from "@engine/qa/duplicates";
export { detectTextLanguage } from "@engine/ingest/text-language";
export { ENGINE_VERSION } from "@engine/version";
