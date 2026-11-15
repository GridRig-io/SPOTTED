/** Shrinks a photo on the device before upload (max 1600 px, JPEG): faster on mobile data and well under the 6 MB limit. */
export async function resizeImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("That file is not a photo we can read.")); i.src = url; });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error("Could not prepare the photo."))), "image/jpeg", quality));
  } finally { URL.revokeObjectURL(url); }
}
