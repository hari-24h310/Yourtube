// Baseline migration: records existing schema state without changes.
export async function up({ mongoose }) {
  // This migration intentionally does nothing to avoid modifying existing data.
  // It serves as a marker so future migrations run deterministically.
  console.log('Running baseline migration (no-op)');
}

export async function down({ mongoose }) {
  // No-op
}
