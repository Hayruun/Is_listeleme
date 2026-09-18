/**
 * Oturum kimligi.
 *
 * Bu katman KIMLIK DOGRULAMA YAPMAZ; yalnizca "bu tarayicida kim calisiyor"
 * bilgisini tutar. Kurumsal SSO (Keycloak / Azure AD) devreye alindiginda
 * degismesi gereken tek yer burasidir: loadSessionUserId yerine saglayicidan
 * gelen kimlik okunur, arayuzun geri kalani ayni kalir.
 */
const KEY = 'is-listeleme:session';

export function loadSessionUserId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveSessionUserId(userId: string): void {
  try {
    window.localStorage.setItem(KEY, userId);
  } catch {
    // Depolama kapali: oturum yalnizca sayfa acik kaldigi surece surer.
  }
}

export function clearSessionUserId(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Yoksayilir.
  }
}
