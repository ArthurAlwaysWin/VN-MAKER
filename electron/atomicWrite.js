import fs from 'node:fs/promises';

export async function atomicWrite(filePath, content) {
  const tmpPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  try { await fs.rename(filePath, backupPath); } catch {}
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    try { await fs.rename(backupPath, filePath); } catch {}
    try { await fs.unlink(tmpPath); } catch {}
    throw error;
  }
  try { await fs.unlink(backupPath); } catch {}
}
