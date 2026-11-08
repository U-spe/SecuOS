export async function open() {
  if (!window.SecuFileSystem?.renderFiles) throw new Error("Files service is unavailable.");
  await window.SecuFileSystem.renderFiles({ trash: true });
}
