import { useMemo, useState } from 'react';
import { createId } from '../lib/id';
import { useBoard } from '../state/boardStore';
import { Avatar } from './Avatar';

interface Props {
  onSignIn: (personId: string) => void;
}

const MAX_NAME = 60;
const MAX_ROLE = 40;

/**
 * Oturum acma ekrani.
 *
 * Bilerek parola alani yok: guvenlik yonergesi sifirdan ozel kimlik dogrulama
 * yazmayi yasakliyor, dolayisiyla dogrulama yapmayan bir parola kutusu koymak
 * yanlis bir guvenlik hissi yaratirdi. Ekran kim oldugunuzu sorar; gercek
 * dogrulama kurumsal SSO baglandiginda bu ekranin ustune gelir.
 */
export function LoginScreen({ onSignIn }: Props): JSX.Element {
  const { board, dispatch } = useBoard();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    if (needle === '') return board.people;
    return board.people.filter((person) =>
      person.name.toLocaleLowerCase('tr-TR').includes(needle),
    );
  }, [board.people, query]);

  const createAndSignIn = (): void => {
    const trimmed = name.trim();
    if (trimmed === '') return;

    // Kimligi burada uretiyoruz ki kisi eklenir eklenmez onunla oturum acabilelim.
    const id = createId('usr');
    dispatch({
      type: 'person/add',
      id,
      name: trimmed.slice(0, MAX_NAME),
      role: role.slice(0, MAX_ROLE),
    });
    setName('');
    setRole('');
    setAdding(false);
    onSignIn(id);
  };

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="login__brand">
          <span className="login__brand-mark" aria-hidden="true">
            ◆
          </span>
          {board.project.name}
        </div>

        <div className="login__pitch">
          <h1 className="login__headline">Ekibin işi, tek bir yerde.</h1>
          <p className="login__sub">
            Epic’ten task’a kadar bütün iş kalemleri aynı ağaçta. Kim neyle uğraşıyor,
            ne kadar yol alındı, nerede takılındı — hepsi tek ekranda.
          </p>
          <ul className="login__points">
            <li>
              <span aria-hidden="true">◆</span>
              Epic · Feature · User Story · Task hiyerarşisi
            </li>
            <li>
              <span aria-hidden="true">◆</span>
              Bir işe birden fazla kişi etiketleme
            </li>
            <li>
              <span aria-hidden="true">◆</span>
              Kendi renk paletinizi seçip kaydetme
            </li>
          </ul>
        </div>

        <p className="login__footnote">
          {board.items.length} iş kalemi · {board.people.length} kişi
        </p>
      </aside>

      <main className="login__main">
        <div className="login__card">
          <h2 className="login__title">Oturum aç</h2>
          <p className="login__hint">Devam etmek için kim olduğunuzu seçin.</p>

          {board.people.length > 3 && (
            <input
              className="input"
              style={{ marginBottom: 10 }}
              value={query}
              maxLength={60}
              placeholder="İsim ara…"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="İsim ara"
            />
          )}

          <div className="login__people">
            {matches.map((person) => (
              <button
                key={person.id}
                type="button"
                className="login__person"
                onClick={() => onSignIn(person.id)}
              >
                <Avatar person={person} size="lg" />
                <span className="login__person-name">{person.name}</span>
                {person.role && <span className="login__person-role">{person.role}</span>}
              </button>
            ))}

            {matches.length === 0 && (
              <p className="faint" style={{ fontSize: 12.5, margin: '4px 0' }}>
                {board.people.length === 0
                  ? 'Ekipte henüz kimse yok. Aşağıdan kendinizi ekleyin.'
                  : 'Bu isimde kimse bulunamadı.'}
              </p>
            )}
          </div>

          {adding ? (
            <div className="stack" style={{ gap: 8 }}>
              <label className="field">
                <span className="field__label">Ad soyad</span>
                <input
                  className="input"
                  value={name}
                  maxLength={MAX_NAME}
                  placeholder="Ayşe Yılmaz"
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      createAndSignIn();
                    }
                  }}
                />
              </label>
              <label className="field">
                <span className="field__label">Rol (isteğe bağlı)</span>
                <input
                  className="input"
                  value={role}
                  maxLength={MAX_ROLE}
                  placeholder="Backend"
                  onChange={(event) => setRole(event.target.value)}
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={createAndSignIn}
                  disabled={name.trim() === ''}
                >
                  Ekle ve devam et
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setAdding(false)}>
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn" style={{ width: '100%' }} onClick={() => setAdding(true)}>
              ＋ Ekipte yokum, beni ekle
            </button>
          )}

          <div className="login__divider">veya</div>

          <button type="button" className="btn login__sso" disabled title="Henüz bağlanmadı">
            Kurumsal hesapla giriş yap (SSO)
          </button>

          <p className="login__note">
            Bu ekran kimlik <strong>doğrulaması yapmaz</strong>; yalnızca bu tarayıcıda kimin
            çalıştığını belirler. Güvenlik yönergesi sıfırdan özel kimlik doğrulama yazmayı
            yasakladığı için parola alanı bilerek konmadı — gerçek doğrulama kurumsal SSO
            (Keycloak / Azure AD) bağlandığında devreye girer.
          </p>
        </div>
      </main>
    </div>
  );
}
