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
- **Üç görünüm.** *Ağaç* hiyerarşiyi gösterir; *Pano* aynı öğeleri durum
  sütunlarına dizer; *Özet* işlerin gidişatını grafiklerle anlatır. Geçiş araç
  çubuğundaki anahtarla yapılır.
- **Sorumlular.** Atananlardan ayrı olarak, bir işin hesap verebilir sahibi
  işaretlenir ve birden fazla olabilir. Sorumlu yapılan kişi atananlara da
  eklenir; avatarı vurgu halkasıyla gösterilir.
- **Adımlar / kabul kriterleri.** Bir işin içine işaretlenebilir adımlar
  eklenir. Kartta "☑ 3/7" olarak görünür ve üstündeki kutunun yüzdesine kısmi
  katkı verir.
- **Takip listem.** Yıldızladığınız işler kişisel listede toplanır; filtre
  çubuğundaki kısayolla süzülür. Liste kullanıcı başına, tarayıcıda saklanır.
- **Bayatlama uyarısı.** Akışta görünen ama uzun süredir kimsenin dokunmadığı
  işler kartta ve özet ekranında işaretlenir.
- **Sürükle-bırak.** Ağaçta bir öğeyi kardeşleri arasında yeniden sıralayabilir
  ya da başka bir ebeveynin altına taşıyabilirsiniz: kartın üst/alt kenarına
  bırakmak sıralar, ortasına bırakmak alt öğe yapar. Panoda kartı başka bir
  sütuna sürüklemek durumunu değiştirir.
- **Filtreler.** Arama kutusu dışındaki bütün seçenekler tek bir **Filtreler**
  düğmesinin altında toplanır; panel gruplara ayrılmıştır (hızlı filtreler,
  tür, durum, öncelik, kişi). Açık filtreler panel kapalıyken de çubuğun
  altında kaldırılabilir rozetler olarak durur, düğmede de sayısı görünür.
  Bir öğe filtreye uymasa bile alt öğelerinden biri uyuyorsa bağlamı korumak
  için ağaçta kalır.
- **İlerleme.** Her epic, alt ağacındaki tamamlanma yüzdesini ve toplanmış story
  point'i gösterir.
- **Oturum açma.** Uygulama önce kim olduğunuzu sorar: ekipten kendinizi seçer
  ya da listede yoksanız oracıkta eklersiniz. Seçim tarayıcıda saklanır,
  üst sağdaki menüden oturum kapatılır.
- **Açık / koyu tema.** Üst bardaki ☾/☀ düğmesi tek tıkla değiştirir; Görünüm
  penceresinde Sistem / Açık / Koyu olarak da ayarlanır. "Sistem" seçiliyken
  işletim sisteminin tercihi izlenir ve değiştiğinde arayüz anında uyar.
- **Kişiye özel görünüm.** Tema ve renk paleti her kullanıcı için ayrı ayrı
  saklanır; sizin seçiminiz ekip arkadaşınızın ekranını değiştirmez.
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

## İş öğesi türleri

Azure Boards hiyerarşisi, büyükten küçüğe:

| Tür | Ne demek | Örnek |
|---|---|---|
| **Epic** | En büyük kapsayıcı; aylara yayılan bir hedef | ".NET 8 Geçişi" |
| **Feature** | Epic'i oluşturan işlev parçası | "Breaking change taraması" |
| **User Story** | Kullanıcı gözünden anlamlı tek bir iş | "EF Core migration uyumluluğu doğrulansın" |
| **Task** | Story'yi bitirmek için yapılacak somut adım | "Migration'lar yeniden üretilsin" |
| **Bug** | Hata kaydı; story ya da feature altında durur | "System.Text.Json alan adlarını değiştiriyor" |

Rozetlerde kısaltma kullanılmaz: türün tam adı yazılır, üzerine gelince ne
anlama geldiğini söyleyen ipucu çıkar. Hangi türün altına ne eklenebileceği
`src/lib/constants.ts` içindeki `TYPE_META[...].children` ile tanımlıdır.

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

## Adımlar, takip listesi ve bayatlama

**Adımlar** her iş öğesinin içindedir (`steps`, en fazla 50 adım). İşaretli
adımlar ögenin kendi ilerlemesini gösterir ve üstündeki kutunun yüzdesine
*kısmi* katkı verir: tamamlanmamış ama adımlarının yarısı biten bir iş 0 değil
0,5 sayılır. Bu yüzden kutu başlığındaki yüzde ile "6/16" sayısı birebir
örtüşmeyebilir — yüzdenin üzerine gelince bunu açıklayan ipucu çıkar.

**Bayatlama** (`src/lib/staleness.ts`) yalnızca *akıştaki* işler için işler:
durumu "Devam Ediyor", "Engellendi" ya da "İncelemede" olup `STALE_DAYS`
(varsayılan 14) gündür güncellenmemiş kalemler. Henüz başlanmamış bir backlog
kalemi uzun süredir duruyor diye sorun sayılmaz. Rozet rengin yanında kaç gün
geçtiğini rakamla da yazar.

**Takip listesi** (`src/lib/starred.ts`) kişiseldir ve panonun ortak dosyasına
yazılmaz: bir kişinin yıldızladığı işler başkasını ilgilendirmez. Görünüm
tercihleri gibi kullanıcı kimliğine göre tarayıcıda saklanır.

## Özet görünümü ve grafikler

Grafikler harici bir grafik kütüphanesi kullanmaz; hepsi tasarım belirteçleriyle
boyanan HTML/CSS çubuklardır. Formlar işin gereğine göre seçildi:

| Ne anlatılıyor | Form |
|---|---|
| Tek başlık sayısı (genel ilerleme) | hero figür, sayfada yalnızca bir tane |
| Birkaç anlık sayı | KPI şeridi |
| Parça-bütün (durum dağılımı) | tek yığılmış yatay çubuk + efsane |
| Büyüklük karşılaştırması (kutu ilerlemesi) | tek serili yatay çubuk |
| Sıralı ölçek (öncelik) | sıralı ramp'li yatay çubuk |
| Kişi × durum | kişi başına yığılmış çubuk + tablo görünümü |
| Dikkat gerektirenler | liste (grafik değil) |

Uygulanan kurallar: segmentleri ayıran şey çizgi değil zemin renginde 2px
boşluk; taban kare, veri ucu 4px yuvarlak; ızgara ve eksen yok denecek kadar
silik; metin hiçbir zaman veri rengini giymez (kimliği yanındaki renk kutusu
taşır); iki veya daha fazla seri olan her grafikte efsane var; her çubuğun
üzerinde imleçle değeri okunuyor; kişi bazlı grafiğin tüm sayıları "Tabloyu
göster" ile metin olarak da okunabiliyor.

### Renklerin ölçülmesi

Durum ve öncelik renkleri göz kararıyla seçilmedi, OKLab kontrast doğrulayıcısı
ile ölçüldü. İki şey bu yüzden değişti:

- **"İncelemede" amberden mora alındı.** Eski amber (#d97706) ile "Engellendi"
  kırmızısı arasındaki fark normal görüşte bile eşiğin altındaydı (ΔE 14.4 < 15).
  Mor ile dört anlamlı durum rengi, renk körlüğünün üç yaygın tipi dahil tüm
  ayırt edilebilirlik kontrollerini geçiyor.
- **Öncelik dört ayrı renk yerine tek tonun dört basamağı oldu.** Öncelik sıralı
  bir ölçek, kimlik değil. Klasik kırmızı–turuncu–mavi–gri dizisi denendi ve
  kırmızı–turuncu ikilisi ölçümde kaldı (ΔE 8.7); sıralı ramp (koyudan soluğa)
  tüm kontrolleri geçiyor. Rozetin üzerindeki "P1".."P4" metni her zaman yazılı
  olduğu için anlam hiçbir zaman yalnızca renge emanet değil.

Her iki ölçek de seçilen paletin tonundan türetilir; "Erişilebilir" palette
öncelik rampı o paletin uyarı renginden (vermilyon) üretilir.

## Sürükle-bırak kuralları

Taşıma `src/state/dnd.tsx` (sürükleme durumu ve hedef hesabı) ile
`boardStore.tsx` içindeki `item/drop` eylemi arasında bölünmüştür. Harici bir
sürükle-bırak kütüphanesi kullanılmaz; tarayıcının kendi HTML5 sürükleme
olayları yeterlidir.

İki kural her taşımada uygulanır ve geçersiz hedefler daha bırakılmadan elenir:

- **Hiyerarşi.** Bir tür yalnızca izin verilen bir ebeveynin altına konabilir
  (`canPlace`, `src/lib/hierarchy.ts`). Bir epic'i task'ın içine sürükleyemezsiniz.
- **Döngü yok.** Bir öğe kendi alt ağacının içine taşınamaz.

İmlecin kart üzerindeki konumu hedefi belirler: üst %32 → öncesine, alt %32 →
sonrasına, orta bölge → içine. Ortaya bırakmak o tür için geçersizse, imlecin
yarısına göre öncesine/sonrasına düşer.

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
  state/dnd.tsx               Sürükle-bırak durumu ve hedef doğrulaması
  lib/escapeStack.ts          Esc katman yığını (üstteki katman önce kapanır)
  lib/staleness.ts            Bayatlama kuralı
  lib/starred.ts              Kişisel takip listesi (kullanıcı başına)
  components/Dashboard.tsx    Özet görünümü ve grafikler
  components/                 Arayüz bileşenleri
  styles/global.css           Tasarım belirteçleri ve tüm stiller
```
