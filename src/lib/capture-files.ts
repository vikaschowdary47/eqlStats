// File bytes stay on this device in IndexedDB; localStorage holds only references.
function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("eqlstats-capture-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("File storage is unavailable in this browser."));
  });
}
export async function storeCaptureFiles(
  files: { id: string; file: File }[],
): Promise<void> {
  if (!files.length) return;
  const db = await openFiles();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      for (const { id, file } of files) tx.objectStore("files").put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error(
            "Could not store these files. Try smaller files or another browser.",
          ),
        );
      tx.onabort = () =>
        reject(new Error("File storage was interrupted. Nothing was saved."));
    });
  } finally {
    db.close();
  }
}
export async function downloadCaptureFile(
  id: string,
  name: string,
): Promise<void> {
  const db = await openFiles();
  try {
    const file = await new Promise<Blob>((resolve, reject) => {
      const request = db.transaction("files").objectStore("files").get(id);
      request.onsuccess = () =>
        request.result
          ? resolve(request.result)
          : reject(new Error("This file is no longer stored in this browser."));
      request.onerror = () =>
        reject(new Error("Could not open the saved file."));
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } finally {
    db.close();
  }
}
