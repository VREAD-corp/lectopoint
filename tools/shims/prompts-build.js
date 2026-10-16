// Browser stand-in for the engine's src/prompts/build.ts. The checkpoint builder only reads the prompt VERSION from it
// (`prompt_version` in read-france.checkpoints/1). The historical generation prompt stays private: it is never bundled.
export const buildGenerationPrompt = (metadata) => {
  const lang = String(metadata.language || 'fr').toLowerCase().slice(0, 2);
  return { version: lang === 'fr' ? 'engine:v4' : 'engine:v4-en', system: '', user: '' };
};
export const buildMetadataBlock = () => '';
export const excerptBundle = () => '';
