import {
  buildCompatibilityBundle,
  compatibilityPaths,
  sha256,
  writeCompatibilityBundle,
} from './paper-glider-compat-lib.mjs';

const bundle = await buildCompatibilityBundle();
await writeCompatibilityBundle(bundle);

process.stdout.write(`${JSON.stringify({
  ok: true,
  bundleDir: compatibilityPaths.bundleDir,
  recipeHash: bundle.manifest.source.recipeHash,
  contentHash: bundle.manifest.contentHash,
  glbSha256: bundle.manifest.files.glb.sha256,
  manifestSha256: sha256(bundle.manifestBytes),
  schemaSha256: bundle.manifest.files.schema.sha256,
  rightsSha256: bundle.manifest.files.rights.sha256,
  glbBytes: bundle.glb.byteLength,
  counts: bundle.manifest.counts,
}, null, 2)}\n`);
