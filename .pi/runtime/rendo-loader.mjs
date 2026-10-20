import { createJiti } from 'jiti';
import * as typebox from 'typebox';
import { fileURLToPath } from 'node:url';

// Native .mjs imports remain cached across Pi /reload, including transitive imports.
export async function loadRendoExtension(path = fileURLToPath(new URL('./sdd-extension.mjs', import.meta.url))) {
  const loader = createJiti(import.meta.url, { moduleCache: false, fsCache: false, tryNative: false, virtualModules: { typebox } });
  // Jiti's async .mjs import uses Node's cache even with tryNative:false.
  // The synchronous loader transpiles the local dependency tree afresh.
  return loader(path).default;
}
export default async function (pi) {
  const extension = await loadRendoExtension();
  await extension(pi);
}
