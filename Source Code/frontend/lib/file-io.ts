// The picker promise must settle even when the user cancels: `change` never
// fires on cancel, so the old implementation hung forever (stuck spinners).
// Modern browsers fire `cancel`; a window-focus fallback covers the rest.
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;

    let settled = false;
    let focusTimer: number | null = null;

    function finish(file: File | null) {
      if (settled) return;
      settled = true;
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      window.removeEventListener("focus", handleFocus);
      input.onchange = null;
      input.oncancel = null;
      // Detached input: drop the reference so repeated picks don't leak.
      input.remove();
      resolve(file);
    }

    function handleChange() {
      finish(input.files?.[0] ?? null);
    }

    // Fired when the picker dialog is dismissed without a selection.
    function handleCancel() {
      finish(null);
    }

    // Fallback for browsers without `cancel`: when the window regains focus
    // and nothing was selected, the dialog was dismissed. Give any pending
    // `change` event a moment to arrive first.
    function handleFocus() {
      if (settled) return;
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => finish(null), 500);
    }

    input.onchange = handleChange;
    input.oncancel = handleCancel;
    window.addEventListener("focus", handleFocus);
    input.click();
  });
}

export async function openFile(accept: string): Promise<{ name: string; content: string } | null> {
  const file = await pickFile(accept);
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, content: reader.result as string });
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export async function openBinaryFile(accept: string): Promise<{ name: string; data: ArrayBuffer } | null> {
  const file = await pickFile(accept);
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: reader.result as ArrayBuffer });
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

export async function openDataURL(accept: string): Promise<{ name: string; url: string } | null> {
  const file = await pickFile(accept);
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, url: reader.result as string });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function saveFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function saveDataURL(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
