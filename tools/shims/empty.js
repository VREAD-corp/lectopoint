// Browser stand-in for node:fs / node:path in the engine bundle: only file-loading helpers use them, never the tool.
const unavailable = () => { throw new Error('not available in the browser'); };
export const readFileSync = unavailable; export const resolve = unavailable; export const dirname = unavailable;
export default { readFileSync, resolve, dirname };
