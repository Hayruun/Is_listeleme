/**
 * Dosya indirme.
 *
 * claude.ai Artifact olarak yayinlandiginda sayfa kendi basina indirme
 * baslatamaz; dosya platformun `downloads` yetenegiyle, kullanicinin
 * onayina sunularak verilir. Diger her yerde olagan <a download> kullanilir.
 */
interface Downloads {
  save(request: { filename: string; data: Blob }): Promise<unknown>;
}

let downloadsPromise: Promise<Downloads | null> | null = null;

function artifactDownloads(): Promise<Downloads | null> {
  if (!downloadsPromise) {
    const host = (window as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
    downloadsPromise =
      typeof host?.use === 'function'
        ? host
            .use('downloads')
            .then((ns) => (ns as Downloads | null) ?? null)
            .catch(() => null)
        : Promise.resolve(null);
  }
  return downloadsPromise;
}

export async function offerFile(filename: string, blob: Blob): Promise<void> {
  const downloads = await artifactDownloads();
  if (downloads) {
    // Kullanici vazgecerse ya da kayit reddedilirse sessizce birakilir.
    await downloads.save({ filename, data: blob }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
