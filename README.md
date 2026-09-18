# İş Listeleme

Ekibin iş kalemlerini **Epic → Feature → User Story → Task / Bug** hiyerarşisinde
yöneten, tek sayfalık bir web uygulaması. Azure Boards alışkanlıklarını korur,
ama veriyi ekibin kendi deposundaki ortak bir JSON dosyasında tutar.

## Hızlı başlangıç

```bash
npm install
npm run dev      # http://localhost:5173
```

Diğer komutlar:

```bash
npm run build      # tip kontrolü + üretim derlemesi (dist/)
npm run preview    # derlenmiş sürümü ortak dosya yazma desteğiyle çalıştırır
npm run typecheck  # yalnızca tip kontrolü
```

## Ne yapabilir

- **Kutu görünümünde epic'ler.** Her epic kendi kutusunda; başlığına tıklayınca
  altındaki feature / user story / task ağacı açılır, her kademe ayrıca
  genişletilip daraltılabilir.
- **Çoklu kişi etiketleme.** Bir iş öğesine istediğiniz kadar kişi atanır;
  kartlarda üst üste binmiş avatarlar, detay panelinde tam liste görünür.
  Kişi seçicinin içinden yeni ekip üyesi de eklenebilir.
- **Satır içi hızlı ekleme.** Her kademenin altındaki "＋ … ekle" satırına başlık
  yazıp Enter'a basmak yeterli; Enter'da alan açık kalır, arka arkaya öğe girilir.
- **Detay paneli.** Durum, öncelik, tür, efor (story point), başlangıç/bitiş
  tarihi, etiketler, açıklama ve atananlar tek yerden düzenlenir.
- **Filtreler.** Metin araması (başlık, açıklama, etiket, kişi adı) ile tür,
  durum, öncelik ve kişi filtreleri birlikte çalışır. Bir öğe filtreye uymasa
  bile alt öğelerinden biri uyuyorsa bağlamı korumak için ağaçta kalır.
- **İlerleme.** Her epic, alt ağacındaki tamamlanma yüzdesini ve toplanmış story
  point'i gösterir.
- **Oturum açma.** Uygulama önce kim olduğunuzu sorar: ekipten kendinizi seçer
  ya da listede yoksanız oracıkta eklersiniz. Seçim tarayıcıda saklanır,
  üst sağdaki menüden oturum kapatılır.
- **Kişiye özel görünüm.** Tema (sistem / açık / koyu) ve renk paleti her
  kullanıcı için ayrı ayrı saklanır; sizin seçiminiz ekip arkadaşınızın
  ekranını değiştirmez.
- **Renk paletleri.** Beş hazır palet (biri renk körlüğüne uygun) ve kendi beş
  renginizi hex ile girebileceğiniz özel palet. Vurgu rengini de siz seçersiniz.
- **Dışa / içe aktarma.** Panoyu JSON olarak indirip paylaşabilir, geri yükleyebilirsiniz.

## Veri nerede duruyor

Tek kaynak: **`public/data/board.json`** — depoya commit'lenen, herkesin
erişebildiği ortak dosya.

- Uygulama açılışta bu dosyayı okur.
- Yaptığınız değişiklikler kısa bir gecikmeyle (debounce) `PUT /api/board`
  ucuna gönderilir ve **doğrudan aynı dosyaya yazılır**. Bu uç Vite'ın
  geliştirme ve önizleme sunucusuna eklenen küçük bir ara katmandır
  (`src/server/boardApiPlugin.ts`).
- Paylaşmak için dosyayı commit'leyip push'lamanız yeterli; ekip arkadaşınız
  `git pull` ile güncel panoyu alır.

**Çakışma koruması.** Her yazma isteği, istemcinin okuduğu son `updatedAt`
damgasını da taşır. Dosya bu arada başkası tarafından güncellenmişse sunucu
`409` döner ve uygulama üstte bir uyarı gösterir: önce kendi değişikliğinizi
dışa aktarır, sonra güncel sürümü alırsınız. Yani kimsenin yazdığı sessizce
ezilmez.

**Sunucusuz kullanım.** Uygulama `api/board` ucu olmadan da (salt statik
barındırma) açılır; bu durumda dosya salt okunur okunur, değişiklikler o
tarayıcıda tutulur ve arayüz "Yalnızca bu tarayıcıda" uyarısı gösterir.
Paylaşmak için dışa aktarma kullanılır.

## Veri modeli

`src/types.ts` içindeki `Board` tipi dosyanın tamamını tanımlar:

```jsonc
{
  "version": 1,
  "project": { "name": "…", "description": "…" },
  "people": [{ "id": "usr-…", "name": "…", "role": "…", "color": "#…" }],
  "items": [
    {
      "id": "wi-…",
      "type": "epic | feature | story | task | bug",
      "title": "…",
      "state": "new | active | blocked | review | done",
      "priority": 1,
      "assignees": ["usr-…"],     // birden fazla kişi
      "tags": ["…"],
      "parentId": "wi-… | null",  // hiyerarşi bu alandan kurulur
      "effort": 5,
      "startDate": "2026-09-01",
      "dueDate": "2026-10-15",
      "order": 0
    }
  ],
  "updatedAt": "…"
}
```

Dosya elle de düzenlenebilir. Okunurken `src/lib/normalize.ts` devreye girer:
eksik alanları tamamlar, tanınmayan değerleri güvenli varsayılana çeker, kopuk
`parentId` bağlarını ve döngüsel zincirleri temizler. Yani bozuk bir düzenleme
uygulamayı çökertmez.

Hangi türün altına ne eklenebileceği `src/lib/constants.ts` içindeki
`TYPE_META[...].children` ile tanımlıdır; hiyerarşiyi değiştirmek için tek
düzenlenmesi gereken yer burasıdır.

## İleride gerçek bir API'ye bağlamak

Veri erişiminin tamamı **`src/lib/boardApi.ts`** arkasında toplanmıştır
(`loadBoard`, `saveBoard`, `exportBoard`, `importBoardFile`). Pano bir ASP.NET
Core Web API'sine taşınacaksa yalnızca bu modülün içi değişir; bileşenlerin
hiçbiri veri kaynağını bilmez. Çakışma kontrolü de aynı sözleşmeyle çalışır
(`baseUpdatedAt` gönderilir, `409` beklenir), dolayısıyla sunucu tarafında
optimistic concurrency'e doğrudan karşılık gelir.

## Görünüm ve renk paletleri

Üst sağdaki kullanıcı menüsünden **Görünüm** ile açılır.

Palet beş renkten oluşur ve sırasıyla Epic, Feature, User Story, Task ve Bug
türlerine karşılık gelir; bunlardan biri vurgu (düğme, bağlantı, odak halkası,
ilerleme çubuğu) rengi olarak seçilir. Hazır paletler `src/lib/palettes.ts`
içinde tanımlıdır, yeni palet eklemek o dizinin bir satırıdır.

Üç tasarım kararı:

- **Zemin paletten boyanmaz.** Seçtiğiniz paletin tonu arka plana yalnızca çok
  düşük doygunlukta sızar; sayfa nötr kalır. Palet vurguyu ve öğe türlerini
  belirler, arka planı değil.
- **Girdiğiniz renk okunur hale getirilir.** Çok açık ya da çok koyu bir renk,
  tonu (hue) korunarak ölçülebilir kontrast eşiğine taşınır ve üzerine yazılacak
  mürekkep otomatik seçilir. Yani okunmayan bir arayüz üretemezsiniz. Hesap
  `src/lib/color.ts` (WCAG kontrast) ve `src/lib/appearance.ts` içindedir.
- **Anlam renge emanet edilmez.** Her tür kendi ikonu ve üç harfli koduyla
  (EPC / FTR / STR / TSK / BUG), her durum kendi metin etiketiyle gelir.
  "Erişilebilir" paleti (Okabe–Ito) buna ek olarak renk körlüğünün üç yaygın
  tipinde de ayırt edilebilen renkler kullanır ve durum renklerini de
  kendisi belirler.

Tercihler `localStorage`'da kullanıcı kimliğine göre ayrı anahtarlarda tutulur
(`is-listeleme:appearance:<userId>`), panonun ortak dosyasına yazılmaz.

## Oturum açma

`src/lib/session.ts` ve `src/components/LoginScreen.tsx`.

Bu ekran **kimlik doğrulaması yapmaz**; yalnızca "bu tarayıcıda kim çalışıyor"
bilgisini belirler. Güvenlik yönergesi sıfırdan özel kimlik doğrulama yazmayı
yasakladığı için, doğrulama yapmayan bir parola alanı bilerek konmadı — öyle bir
alan yanlış bir güvenlik hissi yaratırdı.

Kurumsal SSO (Keycloak / Azure AD) bağlanacağında değişmesi gereken tek yer
`session.ts`: kimlik `localStorage` yerine sağlayıcıdan okunur, arayüzün geri
kalanı aynı kalır. Giriş ekranındaki "Kurumsal hesapla giriş yap" düğmesi bu
bağlantı için hazır ve şimdilik devre dışı duruyor.

## Güvenlik notları

Kurum güvenlik yönergesiyle uyum için uygulanan başlıca noktalar:

- **Gizli bilgi yok.** Kodda parola, anahtar, token veya bağlantı dizesi
  bulunmuyor; uygulamanın kimlik doğrulaması ya da dış servis çağrısı yok.
- **XSS.** Tüm metin React veri bağlamasıyla basılır; `dangerouslySetInnerHTML`
  hiçbir yerde kullanılmaz.
- **Dinamik kod yok.** `eval`, `new Function`, dize alan `setTimeout` kullanılmaz.
- **Girdi doğrulama.** Dışarıdan gelen her JSON (ortak dosya, içe aktarılan
  dosya, `PUT` gövdesi) sunucu ve istemci tarafında şema doğrulamasından geçer;
  başlık/etiket/açıklama alanlarında uzunluk sınırları uygulanır; içe aktarılan
  dosya ve istek gövdesi 8 MB ile sınırlıdır.
- **CSRF.** `PUT /api/board` yalnızca aynı kaynaktan gelen isteklerden kabul
  edilir (`Sec-Fetch-Site` ve `Origin` kontrolü). CORS başlığı hiç verilmediği
  için çapraz kaynaklı okuma da mümkün değildir.
- **Güvenlik başlıkları.** Her yanıta `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`
  ve `Permissions-Policy` eklenir. CSP üretim derlemesinde daha sıkıdır;
  geliştirmede yalnızca HMR'ın ihtiyaç duyduğu kadar gevşetilir.
- **Hata mesajları.** Sunucu istemciye stack trace, dosya yolu veya iç detay
  yansıtmaz; ayrıntı yalnızca sunucu günlüğüne yazılır.
- **Dosya yolu.** Yazma ucu sabit tek bir dosyayı hedefler, istekten gelen yol
  kabul etmez; yazma önce geçici dosyaya yapılıp yer değiştirilir, böylece yarım
  yazılmış dosya kalmaz.
- **Rastgelelik.** Kimlikler `Math.random()` ile değil Web Crypto (CSPRNG) ile
  üretilir.
- **Tedarik zinciri.** Bağımlılıklar `package-lock.json` ile sabitlenmiştir;
  çalışma zamanında yalnızca React kullanılır, harici CDN'e (font dahil) hiçbir
  istek yapılmaz.

> Not: Giriş ekranı kimlik **belirler**, kimlik **doğrulamaz** — erişim denetimi
> şu an uygulamayı barındırdığınız ortamın sorumluluğundadır. Ekip içi kullanım
> dışına çıkarılacaksa önce kurumsal SSO'nun arkasına alınmalıdır.

## Proje yapısı

```
public/data/board.json        Ekibin ortak veri dosyası (tek kaynak)
src/
  server/boardApiPlugin.ts    /api/board ucu + güvenlik başlıkları (Vite eklentisi)
  lib/
    boardApi.ts               Veri erişiminin tek sözleşmesi
    normalize.ts              Gelen JSON'un doğrulanması / onarılması
    hierarchy.ts              Ağaç kurma, ilerleme hesabı, ata/alt öğe sorguları
    filters.ts                Filtreleme ve istatistik
    constants.ts              Tür / durum / öncelik tanımları
    color.ts                  Renk matematiği ve WCAG kontrast hesabı
    palettes.ts               Hazır renk paletleri
    appearance.ts             Paletten CSS belirteci üretimi, kullanıcı tercihleri
    session.ts                Oturum kimliği (SSO buraya bağlanır)
  state/boardStore.tsx        Reducer, otomatik kaydetme, çakışma yönetimi
  components/                 Arayüz bileşenleri
  styles/global.css           Tasarım belirteçleri ve tüm stiller
```
