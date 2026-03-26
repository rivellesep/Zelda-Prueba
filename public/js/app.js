firebase.initializeApp({
    apiKey: "AIzaSyD5nxim_X1c0cVXRji8-k4CkMSDPDH7v0k",
    authDomain: "zelva-c6143.firebaseapp.com",
    projectId: "zelva-c6143",
    storageBucket: "zelva-c6143.firebasestorage.app",
    messagingSenderId: "876429015791",
    appId: "1:876429015791:web:02770e67c5ce81c335391a"
});
const auth = firebase.auth();
const db = firebase.firestore();
const TS = () => firebase.firestore.FieldValue.serverTimestamp();
const INC = n => firebase.firestore.FieldValue.increment(n);
let historialNavegacio = ['explorar'];

const PAGES = ['landing', 'login', 'explorar', 'perfil', 'chats', 'contacte', 'detall', 'perfil-public'];

function navigate(page, guardar = true) {
    if (guardar) {
        const actual = PAGES.find(p => !document.getElementById('page-' + p)?.classList.contains('hidden'));
        if (actual && actual !== page && actual !== 'landing' && actual !== 'login') {
            historialNavegacio.push(actual);
            if (historialNavegacio.length > 10) historialNavegacio.shift();
        }
    }
    PAGES.forEach(p => document.getElementById('page-' + p)?.classList.add('hidden'));
    document.getElementById('page-' + page)?.classList.remove('hidden');
    ['explorar', 'chats', 'contacte'].forEach(p =>
        document.getElementById('nav-' + p)?.classList.toggle('active', p === page)
    );
    window.scrollTo(0, 0);
    if (page === 'chats') carregarChats();
    if (page === 'perfil') { carregarMeusAnuncis(); carregarHistorial(); }
}

function tornar() {
    const anterior = historialNavegacio.pop() || 'explorar';
    navigate(anterior, false);
}

auth.onAuthStateChanged(user => {
    if (user) {

        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('navbar-guest').classList.add('hidden');
        document.getElementById('footer').classList.remove('hidden');


        db.collection('usuaris').doc(user.uid).onSnapshot(doc => {
            if (doc.exists) {
                const d = doc.data();

                const ini = (d.nom || user.email || '?').slice(0, 2).toUpperCase();

      
                const avatarEl = document.getElementById('perfil-avatar');
                const navAvatarEl = document.getElementById('nav-avatar-btn');
                if (!avatarEl.querySelector('img')) {
                    navAvatarEl.textContent = ini;
                    avatarEl.textContent = ini;
                }

                document.getElementById('perfil-nom').textContent =
                    (d.nom || '') + ' ' + (d.cognom || '');
                document.getElementById('perfil-email').textContent = user.email;


              const disponibles = (d.punts || 0) - (d.punts_bloquejats || 0);
document.getElementById('nav-points').textContent = disponibles;
document.getElementById('perfil-points').textContent = disponibles;

                document.getElementById('perfil-intercanvis').textContent =
                    d.intercanvis_real || 0;
                document.getElementById('perfil-valoracio').textContent =
                    d.valoracio_mitjana || '—';

                
                document.getElementById('perfil-input-nom').value = d.nom || '';
                document.getElementById('perfil-input-cognom').value = d.cognom || '';
                if (d.foto) {
                    document.getElementById('perfil-avatar').innerHTML = `<img src="${d.foto}" alt="foto">`;
                    document.getElementById('nav-avatar-btn').innerHTML = `<img src="${d.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                }
            }
        });
        
        db.collection('missatges')
            .where('id_receptor', '==', user.uid)
            .where('llegit', '==', false)
            .onSnapshot(snap => {
                const badge = document.getElementById('nav-msg-badge');
                if (!badge) return;
                const count = snap.size;
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            });
        renderAnuncis();
        historialNavegacio = [];
        navigate('explorar', false);

    } else {
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('navbar-guest').classList.remove('hidden');
        document.getElementById('footer').classList.add('hidden');

        historialNavegacio = [];
        navigate('landing', false);
    }
});
function switchTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    hideAlert();
}
function showAlert(msg, type = 'error') {
    const el = document.getElementById('auth-alert');
    el.className = 'alert alert-' + type;
    el.textContent = msg;
    el.classList.remove('hidden');
}
function hideAlert() { document.getElementById('auth-alert').classList.add('hidden'); }

function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    if (!email || !pass) return showAlert('Omple tots els camps.');
    auth.signInWithEmailAndPassword(email, pass).catch(e => showAlert(tradError(e.code)));
}

async function doRegister() {
    const nom = document.getElementById('regNom').value.trim();
    const cognom = document.getElementById('regCognom').value.trim();
    const localitat = document.getElementById('regLocalitat').value.trim();
    const telefon = document.getElementById('regTelefon').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;

    if (!email || !pass || !nom || !cognom || !localitat)
        return showAlert('Omple tots els camps obligatoris (*).');
    if (pass.length < 6)
        return showAlert('La contrasenya ha de tenir mínim 6 caràcters.');
    if (telefon && !/^\d{9}$/.test(telefon))
        return showAlert('El telèfon ha de tenir exactament 9 dígits.');

    try {
        if (telefon) {
            const snap = await db.collection('telefonosRegistrados').doc(telefon).get();
            if (snap.exists) return showAlert('Aquest número de telèfon ja està registrat.');
        }

        await db.collection('usuaris').doc(cred.user.uid).set({
            nom, cognom, localitat, telefon: telefon || null, foto: '',
            data_creacio: TS(), punts: 200,
            intercanvis_real: 0, valoracio_mitjana: null
        });
        await cred.user.updateProfile({ displayName: nom });

        if (telefon) {
            await db.collection('telefonosRegistrados').doc(telefon).set({
                uid: cred.user.uid,
                createdAt: TS()
            });
        }

        showAlert('Compte creat! Tens 200 EcoPoints de benvinguda 🎉', 'success');
    } catch (e) {
        showAlert(tradError(e.code));
    }
}

function doGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            const uRef = db.collection('usuaris').doc(result.user.uid);
            uRef.get().then(doc => {
                if (!doc.exists) {
                    uRef.set({
                        nom: result.user.displayName || result.user.email.split('@')[0],
                        cognom: '', localitat: '', telefon: null,
                        foto: result.user.photoURL || '', data_creacio: TS(),
                        punts: 100, intercanvis_real: 0, valoracio_mitjana: null
                    });
                }
            });
        })
        .catch(e => showAlert(tradError(e.code)));
}

function doForgot() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return showAlert('Introdueix el teu correu primer.');
    auth.sendPasswordResetEmail(email)
        .then(() => showAlert('Correu de recuperació enviat!', 'success'))
        .catch(e => showAlert(tradError(e.code)));
}
function doLogout() { auth.signOut(); }

function tradError(code) {
    switch (code) {
        case 'auth/user-not-found': return 'Aquest usuari no existeix.';
        case 'auth/wrong-password': return 'Contrasenya incorrecta.';
        case 'auth/email-already-in-use': return 'Aquest correu electrònic ja està registrat.';
        case 'auth/invalid-email': return 'El format del correu no és vàlid.';
        case 'auth/weak-password': return 'La contrasenya és massa feble.';
        case 'auth/network-request-failed': return 'Error de connexió a internet.';
        case 'auth/popup-closed-by-user': return 'S\'ha tancat la finestra de Google.';
        default: return 'S\'ha produït un error: ' + code;
    }
}

async function guardarPerfil() {
    const user = auth.currentUser; if (!user) return;
    const nom = document.getElementById('perfil-input-nom').value.trim();
    const cognom = document.getElementById('perfil-input-cognom').value.trim();
    const telefon = document.getElementById('perfil-input-telefon').value.trim();
    const localitat = document.getElementById('perfil-input-localitat').value.trim();
    const alertEl = document.getElementById('perfil-alert');
    if (!nom || !localitat) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Nom i localitat són obligatoris.'; alertEl.classList.remove('hidden'); return; }
    try {
        await db.collection('usuaris').doc(user.uid).update({ nom, cognom, localitat, telefon: telefon || null });
        await user.updateProfile({ displayName: nom });
        document.getElementById('perfil-nom').textContent = nom + ' ' + cognom;
        const ini = nom.slice(0, 2).toUpperCase();
        if (!document.getElementById('perfil-avatar').querySelector('img')) {
            document.getElementById('nav-avatar-btn').textContent = ini;
            document.getElementById('perfil-avatar').textContent = ini;
        }
        alertEl.className = 'alert alert-success'; alertEl.textContent = 'Perfil actualitzat!'; alertEl.classList.remove('hidden');
        setTimeout(() => alertEl.classList.add('hidden'), 3000);
    } catch (e) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Error: ' + e.message; alertEl.classList.remove('hidden'); }
}


let filtreActiu = 'tots', cercaActiva = '', totsAnuncis = [];

async function renderAnuncis() {
    const grid = document.getElementById('anuncis-grid'); if (!grid) return;
    grid.innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('anuncis').where('estat_anunci', 'in', ['disponible', 'reservat']).orderBy('data_creacio', 'desc').get();
        totsAnuncis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const uids = [...new Set(totsAnuncis.map(a => a.usuari_id).filter(Boolean))];
        await Promise.all(uids.map(async uid => {
            try {
                const uDoc = await db.collection('usuaris').doc(uid).get();
                if (uDoc.exists) { const ud = uDoc.data(); totsAnuncis = totsAnuncis.map(a => a.usuari_id === uid ? { ...a, _nom: ud.nom, _loc: ud.localitat, _ini: (ud.nom || '?').slice(0, 2).toUpperCase(), _foto: ud.foto || '' } : a); }
            } catch (e) { }
        }));
        mostrarAnuncis();
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;grid-column:1/-1">Error carregant anuncis. Comprova les regles de Firestore.</p>';
        console.error(e);
    }
}

function mostrarAnuncis() {
    const grid = document.getElementById('anuncis-grid'); if (!grid) return;
    const modLabel = { intercanvi: 'Intercanvi', punts: 'Punts' };
    let llista = [...totsAnuncis];
    if (filtreActiu !== 'tots') llista = llista.filter(a => a.categoria === filtreActiu || a.modalitat === filtreActiu);
    if (cercaActiva) { const q = cercaActiva.toLowerCase(); llista = llista.filter(a => (a.titol || '').toLowerCase().includes(q) || (a.descripcio || '').toLowerCase().includes(q)); }
    document.getElementById('anuncis-count').textContent = llista.length + ' anunci' + (llista.length !== 1 ? 's' : '') + ' disponible' + (llista.length !== 1 ? 's' : '');
    if (!llista.length) { grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;grid-column:1/-1">No s\'han trobat anuncis.</p>'; return; }
    const getPuntsLabel = a => a.modalitat === 'punts' ? (a.ecopoints || 0) + ' pts' : a.modalitat === 'donacio' ? 'Gratis' : 'Intercanvi';
    grid.innerHTML = llista.map(a => `
        <div class="card" onclick="veureDeta('${a.id}')">
            <div class="card-img" style="position:relative">
                ${(a.imatge && a.imatge[0]) ? `<img src="${a.imatge[0]}" alt="${a.titol}" onerror="this.parentElement.innerHTML='📦'">` : '📦'}
                ${a.estat_anunci === 'reservat' ? `<div style="position:absolute;top:8px;right:8px;background:#E65100;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:.5px">⏳ Reservat</div>` : ''}
            </div>
          <div class="card-body">
            <div style="display:flex;gap:6px;margin-bottom:8px">
              <span class="tag tag-${a.modalitat}">${modLabel[a.modalitat] || a.modalitat}</span>
              ${a.estat_producte ? `<span class="tag tag-estat">${a.estat_producte === 'Per estrenar' ? 'Per estrenar' : 'Bon estat'}</span>` : ''}
            </div>
            <div class="card-title">${a.titol || 'Sense títol'}</div>
            <div class="card-desc">${a.descripcio || ''}</div>
            <div class="card-footer">
              <div style="display:flex;align-items:center;gap:6px">
                <div class="avatar-sm">${a._foto ? `<img src="${a._foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (a._ini || '?')}</div>
                <span style="font-size:12px;color:var(--text-muted)">${a._nom || 'Usuari'}</span>
              </div>
              <span class="card-points">${getPuntsLabel(a)}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">📍 ${a._loc || ''}</div>
          </div>
        </div>`).join('');
}

function cercarAnuncis() { cercaActiva = document.getElementById('search-input').value.trim(); mostrarAnuncis(); }
document.getElementById('search-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') cercarAnuncis(); });
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active'); filtreActiu = chip.dataset.filter || 'tots'; mostrarAnuncis();
    });
});


async function veureDeta(anunciId) {
    const actual = PAGES.find(p => !document.getElementById('page-' + p)?.classList.contains('hidden'));
    if (actual && actual !== 'detall') historialNavegacio.push(actual);
    navigate('detall', false);
    const content = document.getElementById('detall-content');
    content.innerHTML = '<div class="loading"><span class="spinner"></span>Carregant...</div>';
    try {
        const [anunciDoc, valsSnap] = await Promise.all([
            db.collection('anuncis').doc(anunciId).get(),
            db.collection('valoracions').where('id_anunci', '==', anunciId).get()
        ]);
        if (!anunciDoc.exists) { content.innerHTML = '<p>Anunci no trobat.</p>'; return; }
        const a = { id: anunciDoc.id, ...anunciDoc.data() };
        const modLabel = { intercanvi: 'Intercanvi', punts: 'Punts' };
        const user = auth.currentUser;
        let potValorar = false;

        if (user && a.estat_anunci === 'completat') {
            if (user.uid === a.comprador_id || user.uid === a.usuari_id) {
                potValorar = true;
            }
        }

        let nomProp = 'Usuari', locProp = '', iniProp = '?';
        try {
            const uDoc = await db.collection('usuaris').doc(a.usuari_id).get();
            if (uDoc.exists) { const ud = uDoc.data(); nomProp = (ud.nom || '') + ' ' + (ud.cognom || ''); locProp = ud.localitat || ''; iniProp = ud.foto ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (ud.nom || '?').slice(0, 2).toUpperCase(); }
        } catch (e) { }

        let yaHaComprat = false;
        if (user && a.comprador_id === user.uid) yaHaComprat = true;

        const valsHtml = valsSnap.empty
            ? '<p style="color:var(--text-muted);font-size:14px">Encara no hi ha valoracions.</p>'
            : valsSnap.docs.map(v => { const vd = v.data(); return `<div class="valoracio-card"><div class="stars">${'★'.repeat(vd.estrelles || 0)}${'☆'.repeat(5 - (vd.estrelles || 0))}</div><p style="font-size:14px;margin-top:6px">${vd.comentari || ''}</p></div>`; }).join('');

        const esProp = user && user.uid === a.usuari_id;
        const esLogat = !!user;
        const puntsLabel = a.modalitat === 'punts' ? (a.ecopoints || 0) + ' pts' : 'Intercanvi';

        let estatBanner = '';
        if (a.estat_anunci === 'reservat') estatBanner = `<div class="estat-banner estat-banner-reservat">⏳ Aquest anunci està reservat i pendent de confirmació d'entrega.</div>`;
        if (a.estat_anunci === 'completat') estatBanner = `<div class="estat-banner estat-banner-completat">✅ Aquest intercanvi s'ha completat correctament.</div>`;

        let compraBox = '';
        if (a.modalitat === 'punts' && a.estat_anunci === 'disponible' && esLogat && !esProp) {
            compraBox = `
            <div class="compra-box">
              <h4>💳 Comprar amb EcoPoints</h4>
              <div class="punts-info">
                <div>
                  <div class="punts-preu">${a.ecopoints || 0} pts</div>
                  <div style="font-size:12px;color:var(--text-muted)">Preu del producte</div>
                </div>
                <div style="text-align:right">
                  <div class="punts-saldo">El teu saldo: <span id="saldo-live">—</span> pts</div>
                </div>
              </div>
              <div class="compra-box confirmar-actions">
                <button class="btn btn-primary" onclick="obrirModalCompra('${a.id}','${a.titol}',${a.ecopoints || 0},'${a.usuari_id}')">🛒 Comprar ara</button>
              </div>
            </div>`;
        }
        let reservarBtn = '';
        if (a.modalitat === 'intercanvi' && a.estat_anunci === 'disponible' && esLogat && !esProp) {
            reservarBtn = `<button class="btn btn-warning" onclick="seleccionarOferta('${a.id}','${a.usuari_id}')">🔁 Proposar intercanvi</button>`;
        }
        let entregaBtn = '';
        if (esProp && a.estat_anunci === 'reservat') {
            entregaBtn = `<button class="btn btn-primary" onclick="obrirModalEntrega('${a.id}','${a.comprador_id || ''}')">📦 Confirmar entrega</button>`;
        }
        let cancelBtn = '';
        if (a.estat_anunci === 'reservat' && user && (user.uid === a.comprador_id || esProp)) {
            cancelBtn = `<button class="btn btn-outline" onclick="cancellarReserva('${a.id}')">✕ Cancel·lar reserva</button>`;
        }

        content.innerHTML = `
          <div class="detall-card">
            <div class="detall-img" style="position:relative;overflow:hidden;height:280px">
  ${(a.imatge && a.imatge.length) ? `
    <div id="carrusel-imgs" style="display:flex;transition:transform .3s ease;height:100%">
      ${a.imatge.map(url => `<img src="${url}" style="min-width:100%;height:280px;object-fit:cover">`).join('')}
    </div>
    ${a.imatge.length > 1 ? `
      <button onclick="canviarImatge(-1)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer">‹</button>
      <button onclick="canviarImatge(1)" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer">›</button>
      <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px">
        ${a.imatge.map((_, i) => `<div class="dot-carrusel" id="dot-${i}" style="width:8px;height:8px;border-radius:50%;background:${i === 0 ? '#fff' : 'rgba(255,255,255,0.4)'};cursor:pointer" onclick="anarAImatge(${i})"></div>`).join('')}
      </div>` : ''}
  ` : '📦'}
</div>
            <div class="detall-body">
              ${estatBanner}
              <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
                <span class="tag tag-${a.modalitat}">${modLabel[a.modalitat] || a.modalitat}</span>
                ${a.estat_producte ? `<span class="tag tag-estat">${a.estat_producte}</span>` : ''}
                ${a.estat_anunci === 'reservat' ? '<span class="tag tag-reservat">Reservat</span>' : ''}
                ${a.estat_anunci === 'completat' ? '<span class="tag tag-completat">Completat</span>' : ''}
              </div>
              <h1 class="detall-title">${a.titol || ''}</h1>
              <p class="detall-desc">${a.descripcio || ''}</p>
              <div class="detall-info-row">
                <div class="detall-info-item"><strong>${puntsLabel}</strong>Preu / Modalitat</div>
                <div class="detall-info-item"><strong>${a.categoria || '—'}</strong>Categoria</div>
              </div>
              <div class="detall-user">
                <div class="avatar-lg" style="width:44px;height:44px;font-size:16px;cursor:pointer" onclick="${user && user.uid === a.usuari_id ? `navegarAPerfil()` : `veurePerfil('${a.usuari_id}')`}">${iniProp}</div>
                <div><div class="detall-user-name" style="cursor:pointer" onclick="${user && user.uid === a.usuari_id ? `navegarAPerfil()` : `veurePerfil('${a.usuari_id}')`}">${nomProp}</div><div class="detall-user-loc">📍 ${locProp}</div></div>
              </div>
              ${compraBox}
              <div class="detall-actions">
                ${reservarBtn}
                ${entregaBtn}
                ${cancelBtn}
                ${esLogat && !esProp && a.estat_anunci !== 'completat' ? `<button class="btn btn-outline" onclick="iniciarXat('${a.id}','${a.usuari_id}')">✉ Enviar missatge</button>` : ''}
${potValorar
                ? `<button class="btn btn-outline" onclick="obrirModalValoracio('${a.id}','${a.usuari_id}')">⭐ Valorar</button>`
                : ''}          
  ${esProp && a.estat_anunci === 'disponible' ? `
    <button class="btn btn-outline btn-sm" onclick="obrirModalEditar('${a.id}')">✏ Editar</button>
    <button class="btn btn-danger btn-sm" onclick="eliminarAnunci('${a.id}')">Eliminar anunci</button>` : ''}
              </div>
              <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Valoracions (${valsSnap.size})</h3>
              ${valsHtml}
            </div>
          </div>`;

       if (user) {
    db.collection('usuaris').doc(user.uid).get().then(d => {
        const el = document.getElementById('saldo-live');
        if (el) {
            const data = d.exists ? d.data() : {};
            const disponibles = (data.punts || 0) - (data.punts_bloquejats || 0);
            el.textContent = disponibles;
        }
    });
}
    } catch (e) { content.innerHTML = '<p style="color:var(--text-muted)">Error carregant l\'anunci.</p>'; console.error(e); }
}

async function eliminarAnunci(id) {
    if (!confirm('Segur que vols eliminar aquest anunci?')) return;
    try {
        await db.collection('anuncis').doc(id).update({ estat_anunci: 'completat' }); renderAnuncis();
        historialNavegacio = [];
        navigate('explorar', false);
    }
    catch (e) { alert('Error: ' + e.message); }
}

async function obrirModalCompra(anunciId, titol, preu, venedorId) {
    const user = auth.currentUser; if (!user) return navigate('login');
    compraPendent = { anunciId, titol, preu, venedorId };

    const alertEl = document.getElementById('compra-alert');
    alertEl.classList.add('hidden');
    document.getElementById('btn-confirmar-compra').disabled = false;

    const uDoc = await db.collection('usuaris').doc(user.uid).get();
    const d = uDoc.exists ? uDoc.data() : {};
    const saldo = d.punts || 0;
    const bloquejats = d.punts_bloquejats || 0;
    const disponibles = saldo - bloquejats;
    const saldoFinal = disponibles - preu;
    const tensSuficients = disponibles >= preu;

    document.getElementById('compra-resum').innerHTML = `
        <div class="modal-compra-row"><span class="label">Producte</span><span class="valor">${titol}</span></div>
        <div class="modal-compra-row"><span class="label">Preu</span><span class="valor negatiu">-${preu} pts</span></div>
        <hr class="modal-compra-divider">
        <div class="modal-compra-row"><span class="label">Saldo total</span><span class="valor">${saldo} pts</span></div>
        ${bloquejats > 0 ? `<div class="modal-compra-row"><span class="label">Punts bloquejats</span><span class="valor negatiu">-${bloquejats} pts</span></div>` : ''}
        <div class="modal-compra-row"><span class="label">Saldo disponible</span><span class="valor">${disponibles} pts</span></div>
        <div class="modal-compra-row"><span class="label">Saldo després</span><span class="valor ${tensSuficients ? 'final' : 'negatiu'}">${saldoFinal} pts</span></div>
    `;

    if (!tensSuficients) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = `No tens prou EcoPoints disponibles. Necessites ${preu} pts però tens ${disponibles} pts disponibles (${bloquejats > 0 ? `${bloquejats} bloquejats en altres compres pendents` : ''}).`;
        alertEl.classList.remove('hidden');
        document.getElementById('btn-confirmar-compra').disabled = true;
    }

    document.getElementById('modal-compra').classList.remove('hidden');
}

async function confirmarCompra() {
    const user = auth.currentUser; if (!user || !compraPendent) return;
    const { anunciId, titol, preu, venedorId } = compraPendent;
    const btn = document.getElementById('btn-confirmar-compra');
    const alertEl = document.getElementById('compra-alert');
    btn.textContent = 'Processant...'; btn.disabled = true;

    try {
        const batch = db.batch();

        batch.update(db.collection('usuaris').doc(user.uid), {
            punts_bloquejats: INC(preu)
        });

        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'reservat',
            comprador_id: user.uid,
            data_reserva: TS()
        });

        await batch.commit();

        await db.collection('missatges').add({
            contingut: `🛒 He comprat "${titol}" per ${preu} EcoPoints. Estem pendents que confirmis l'entrega!`,
            anunci_referencia: anunciId,
            id_emissor: user.uid,
            id_receptor: venedorId,
            entregat: true, llegit: false,
            data_enviament: TS(),
            tipus: 'sistema'
        });

        await db.collection('transaccions').add({
            usuari_id: user.uid,
            tipus: 'compra',
            estat: 'pendent',
            anunci_id: anunciId,
            anunci_titol: titol,
            punts: -preu,
            contrapart_id: venedorId,
            data: TS()
        });

        document.getElementById('modal-compra').classList.add('hidden');
        btn.textContent = '✓ Confirmar compra'; btn.disabled = false;
        compraPendent = null;

        const uDocNou = await db.collection('usuaris').doc(user.uid).get();
        if (uDocNou.exists) {
            const d = uDocNou.data();
            const disponibles = (d.punts || 0) - (d.punts_bloquejats || 0);
            document.getElementById('nav-points').textContent = disponibles;
        }

        alert(`✅ Compra reservada! Els ${preu} EcoPoints quedaran bloquejats fins que el venedor confirmi l'entrega.`);
        veureDeta(anunciId);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error processant la compra: ' + e.message;
        alertEl.classList.remove('hidden');
        btn.textContent = '✓ Confirmar compra'; btn.disabled = false;
        console.error(e);
    }
}
let ofertaContext = null;

async function seleccionarOferta(anunciId, venedorId) {
    const user = auth.currentUser;
    if (!user) return navigate('login');

    ofertaContext = { anunciId, venedorId };

    const grid = document.getElementById('oferta-grid');
    grid.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
    document.getElementById('modal-oferta').classList.remove('hidden');

    const snap = await db.collection('anuncis')
        .where('usuari_id', '==', user.uid)
        .where('estat_anunci', '==', 'disponible')
        .get();

    if (snap.empty) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:20px">
                <p style="color:var(--text-muted);margin-bottom:16px">No tens cap anunci publicat per oferir.</p>
                <button class="btn btn-primary btn-sm" onclick="tancarModalOferta();obrirModalAnunci()">+ Publicar anunci primer</button>
            </div>`;
        return;
    }

    grid.innerHTML = snap.docs.map(doc => {
        const a = doc.data();
        return `
        <div class="card" id="oferta-card-${doc.id}" onclick="triarOferta('${doc.id}', '${a.titol.replace(/'/g, "\\'")}')">
            <div class="card-img">
                ${(a.imatge && a.imatge[0]) ? `<img src="${a.imatge[0]}">` : '📦'}
            </div>
            <div class="card-body">
                <div class="card-title">${a.titol}</div>
                <div class="card-desc">${a.descripcio || ''}</div>
            </div>
        </div>`;
    }).join('');
}
function triarOferta(ofertaId, ofertaTitol) {
    document.querySelectorAll('[id^="oferta-card-"]').forEach(c => {
        c.style.borderColor = 'rgba(255,255,255,0.06)';
        c.style.background = 'var(--surface)';
    });
    const card = document.getElementById('oferta-card-' + ofertaId);
    if (card) {
        card.style.borderColor = '#4CAF50';
        card.style.background = 'rgba(26,92,82,0.15)';
    }

    ofertaContext.ofertaId = ofertaId;
    ofertaContext.ofertaTitol = ofertaTitol;

    let confirmBtn = document.getElementById('btn-confirmar-oferta');
    if (!confirmBtn) {
        confirmBtn = document.createElement('button');
        confirmBtn.id = 'btn-confirmar-oferta';
        confirmBtn.className = 'btn btn-primary';
        const accions = document.getElementById('oferta-accions');
        accions.prepend(confirmBtn);
    }
    const label = ofertaTitol.length > 30 ? ofertaTitol.slice(0, 30) + '...' : ofertaTitol;
    confirmBtn.textContent = `✓ Oferir "${label}"`;
    confirmBtn.onclick = () => confirmarOferta(ofertaId, ofertaTitol);
}
function tancarModalOferta() {
    document.getElementById('modal-oferta').classList.add('hidden');
    const btn = document.getElementById('btn-confirmar-oferta');
    if (btn) btn.remove();
    ofertaContext = null;
}
async function confirmarOferta(ofertaId, ofertaTitol) {
    console.log('confirmarOferta cridat', ofertaId, ofertaTitol, ofertaContext);
    if (!ofertaContext) {
        alert('Error: no hi ha context d\'oferta.');
        return;
    }

    const { anunciId, venedorId } = ofertaContext;

    if (!anunciId || !venedorId) {
        alert('Error: falten dades (anunciId o venedorId).');
        return;
    }

    try {
        await crearIntercanvi(anunciId, venedorId, ofertaId, ofertaTitol);
        tancarModalOferta();
    } catch (e) {
        console.error('Error a confirmarOferta:', e);
        alert('Error enviant la proposta: ' + e.message);
    }
}

async function crearIntercanvi(anunciId, venedorId, ofertaId, ofertaTitol) {
    const user = auth.currentUser;
    if (!user) { navigate('login'); return; }

    console.log('crearIntercanvi', { anunciId, venedorId, ofertaId, ofertaTitol, uid: user.uid });

    const anunciDoc = await db.collection('anuncis').doc(anunciId).get();
    if (!anunciDoc.exists) { alert('Anunci no trobat.'); return; }
    const a = anunciDoc.data();

    await db.collection('propostes').add({
        anunci_id: anunciId,
        venedor_id: venedorId,
        comprador_id: user.uid,
        oferta_id: ofertaId,
        oferta_titol: ofertaTitol,
        estat: 'pendent',
        data: TS()
    });

    await db.collection('missatges').add({
        contingut: `🔁 Proposta d'intercanvi: "${ofertaTitol}" per "${a.titol}"`,
        anunci_referencia: anunciId,
        id_emissor: user.uid,
        id_receptor: venedorId,
        tipus: 'proposta',
        proposta_estat: 'pendent',
        oferta_id: ofertaId,
        data_enviament: TS(),
        llegit: false
    });

    alert('📨 Proposta enviada!');
}


function obrirModalEntrega(anunciId, compradorId) {
    document.getElementById('entrega-anunci-id').value = anunciId;
    document.getElementById('entrega-comprador-id').value = compradorId;
    document.getElementById('entrega-alert').classList.add('hidden');
    document.getElementById('btn-confirmar-entrega').disabled = false;
    document.getElementById('modal-entrega').classList.remove('hidden');
}

async function confirmarEntrega() {
    const user = auth.currentUser; if (!user) return;
    const anunciId = document.getElementById('entrega-anunci-id').value;
    const compradorId = document.getElementById('entrega-comprador-id').value;
    const btn = document.getElementById('btn-confirmar-entrega');
    const alertEl = document.getElementById('entrega-alert');
    btn.textContent = 'Processant...'; btn.disabled = true;

    try {
        const anunciDoc = await db.collection('anuncis').doc(anunciId).get();
        const a = anunciDoc.data();
        const batch = db.batch();

        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'completat', data_completat: TS()
        });

        if (a.modalitat === 'punts' && a.ecopoints > 0) {
            batch.update(db.collection('usuaris').doc(user.uid), {
                punts: INC(a.ecopoints),
                intercanvis_real: INC(1)
            });
            if (compradorId) {
                batch.update(db.collection('usuaris').doc(compradorId), {
                    punts: INC(-a.ecopoints),
                    punts_bloquejats: INC(-a.ecopoints)
                });
            }
        } else {
            batch.update(db.collection('usuaris').doc(user.uid), {
                intercanvis_real: INC(1)
            });
        }

        if (compradorId) {
            batch.update(db.collection('usuaris').doc(compradorId), {
                intercanvis_real: INC(1)
            });
        }

        await batch.commit();

        if (a.modalitat === 'punts' && a.ecopoints > 0) {
            await db.collection('transaccions').add({
                usuari_id: user.uid, tipus: 'venda',
                anunci_id: anunciId, anunci_titol: a.titol || 'Anunci',
                punts: a.ecopoints, contrapart_id: compradorId, data: TS()
            });
        }

        await db.collection('missatges').add({
            contingut: `L'entrega ha estat confirmada! L'intercanvi s'ha completat correctament. Gràcies!`,
            anunci_referencia: anunciId, id_emissor: user.uid,
            id_receptor: compradorId || user.uid,
            entregat: true, llegit: false, data_enviament: TS(), tipus: 'sistema'
        });

        document.getElementById('modal-entrega').classList.add('hidden');
        btn.textContent = '✓ Sí, he entregat'; btn.disabled = false;

        const uDocNou = await db.collection('usuaris').doc(user.uid).get();
        if (uDocNou.exists) {
            const d = uDocNou.data();
            const disponibles = (d.punts || 0) - (d.punts_bloquejats || 0);
            document.getElementById('nav-points').textContent = disponibles;
            document.getElementById('perfil-points').textContent = disponibles;
            document.getElementById('perfil-intercanvis').textContent = d.intercanvis_real || 0;
        }

        alert('Entrega confirmada! L\'intercanvi s\'ha completat.');
        veureDeta(anunciId);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
        btn.textContent = '✓ Sí, he entregat'; btn.disabled = false;
        console.error(e);
    }
}

async function cancellarReserva(anunciId) {
    const user = auth.currentUser; if (!user) return;
    if (!confirm('Segur que vols cancel·lar la reserva?')) return;
    try {
        const anunciDoc = await db.collection('anuncis').doc(anunciId).get();
        const a = anunciDoc.data();
        const batch = db.batch();

        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'disponible',
            comprador_id: firebase.firestore.FieldValue.delete(),
            data_reserva: firebase.firestore.FieldValue.delete()
        });

        if (a.modalitat === 'punts' && a.ecopoints > 0 && a.comprador_id) {
            batch.update(db.collection('usuaris').doc(a.comprador_id), {
                punts_bloquejats: INC(-a.ecopoints)
            });
        }

        await batch.commit();

        if (a.comprador_id === user.uid) {
            const uDocNou = await db.collection('usuaris').doc(user.uid).get();
            if (uDocNou.exists) {
                const d = uDocNou.data();
                const disponibles = (d.punts || 0) - (d.punts_bloquejats || 0);
                document.getElementById('nav-points').textContent = disponibles;
            }
        }

        alert('La reserva ha estat cancel·lada.');
        veureDeta(anunciId);
    } catch (e) { alert('Error: ' + e.message); }
}

async function carregarHistorial() {
    const user = auth.currentUser; if (!user) return;
    const grid = document.getElementById('historial-grid');
    grid.innerHTML = '<div class="loading"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('transaccions')
            .where('usuari_id', '==', user.uid)
            .orderBy('data', 'desc').limit(50).get();

        if (snap.empty) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Encara no tens transaccions.</p>';
            return;
        }

        const transaccions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const uids = [...new Set(transaccions.map(t => t.contrapart_id).filter(Boolean))];
        const nomsMap = {};
        await Promise.all(uids.map(async uid => {
            try {
                const uDoc = await db.collection('usuaris').doc(uid).get();
                if (uDoc.exists) {
                    const ud = uDoc.data();
                    nomsMap[uid] = (ud.nom || '') + ' ' + (ud.cognom || '').trim();
                }
            } catch (e) {}
        }));

        const totalGuanyat = transaccions.filter(t => t.tipus === 'venda').reduce((acc, t) => acc + (t.punts || 0), 0);
        const totalGastat = transaccions.filter(t => t.tipus === 'compra').reduce((acc, t) => acc + Math.abs(t.punts || 0), 0);
        const totalIntercanvis = transaccions.filter(t => t.tipus === 'intercanvi_acceptat').length;

        const resumHtml = `
            <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
                <div style="flex:1;min-width:120px;background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.2);border-radius:10px;padding:12px;text-align:center">
                    <div style="font-size:20px;font-weight:700;color:#4CAF50">+${totalGuanyat}</div>
                    <div style="font-size:12px;color:var(--text-muted)">pts guanyats</div>
                </div>
                <div style="flex:1;min-width:120px;background:rgba(229,57,53,0.1);border:1px solid rgba(229,57,53,0.2);border-radius:10px;padding:12px;text-align:center">
                    <div style="font-size:20px;font-weight:700;color:#e53935">-${totalGastat}</div>
                    <div style="font-size:12px;color:var(--text-muted)">pts gastats</div>
                </div>
                <div style="flex:1;min-width:120px;background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.2);border-radius:10px;padding:12px;text-align:center">
                    <div style="font-size:20px;font-weight:700;color:#2196F3">${totalIntercanvis}</div>
                    <div style="font-size:12px;color:var(--text-muted)">intercanvis</div>
                </div>
            </div>`;

        const filtreHtml = `
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap" id="historial-filtres">
                <div class="filter-chip active" data-hfil="tots" onclick="filtrarHistorial(this,'tots')">Tots</div>
                <div class="filter-chip" data-hfil="compra" onclick="filtrarHistorial(this,'compra')">🛒 Compres</div>
                <div class="filter-chip" data-hfil="venda" onclick="filtrarHistorial(this,'venda')">💰 Vendes</div>
                <div class="filter-chip" data-hfil="intercanvi_acceptat" onclick="filtrarHistorial(this,'intercanvi_acceptat')">🔁 Intercanvis</div>
            </div>`;
const itemsHtml = transaccions.map(t => {
    const esCompra = t.tipus === 'compra';
    const esIntercanvi = t.tipus === 'intercanvi_acceptat';
    const emoji = esCompra ? '🛒' : esIntercanvi ? '🔁' : '💰';
    const label = esCompra ? 'Compra' : esIntercanvi ? 'Intercanvi cedit' : 'Venda';
    const colorClass = esCompra ? 'gastat' : esIntercanvi ? 'neutre' : 'guanyat';
    const puntsText = esCompra ? `-${Math.abs(t.punts || 0)} pts` : esIntercanvi ? '—' : `+${t.punts || 0} pts`;
    const data = t.data?.toDate?.()?.toLocaleDateString('ca', { day: '2-digit', month: '2-digit', year: 'numeric' }) || '—';
    const contrapartNom = t.contrapart_id ? (nomsMap[t.contrapart_id] || 'Usuari desconegut') : null;
    const contrapartHtml = contrapartNom
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">👤 ${esCompra ? 'Venut per' : esIntercanvi ? 'Amb' : 'Comprat per'}: <strong>${contrapartNom}</strong></div>`
        : '';
    const obtingutHtml = (esIntercanvi && t.anunci_obtingut_titol)
        ? `<div style="font-size:11px;color:#4CAF50;margin-top:2px">📦 A canvi de: <strong>${t.anunci_obtingut_titol}</strong></div>`
        : '';
             return `<div class="compra-item" data-htipus="${t.tipus}">
        <div style="font-size:24px">${emoji}</div>
        <div class="compra-item-info" style="flex:1;min-width:0">
            <div class="compra-item-titol" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}: ${t.anunci_titol || '—'}</div>
            <div class="compra-item-sub">${data}</div>
            ${contrapartHtml}
            ${obtingutHtml}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <div class="compra-item-punts ${colorClass}">${puntsText}</div>
            ${t.anunci_id ? `<button class="btn btn-outline btn-sm" style="font-size:11px;padding:2px 8px" onclick="veureDeta('${t.anunci_id}')">Veure anunci</button>` : ''}
        </div>
    </div>`;
}).join('');

        grid.innerHTML = resumHtml + filtreHtml + `<div id="historial-items">${itemsHtml}</div>`;

    } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Error carregant historial.</p>';
        console.error(e);
    }
}

function filtrarHistorial(el, tipus) {
    document.querySelectorAll('#historial-filtres .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('#historial-items .compra-item').forEach(item => {
        item.style.display = (tipus === 'tots' || item.dataset.htipus === tipus) ? 'flex' : 'none';
    });
}
function obrirModalAnunci() {
    if (!auth.currentUser) return navigate('login');
    document.getElementById('modal-alert').classList.add('hidden');
    document.getElementById('modal-anunci').classList.remove('hidden');
}

async function publicarAnunci() {
    const user = auth.currentUser; if (!user) return navigate('login');
    const titol = document.getElementById('anunci-titol').value.trim();
    const desc = document.getElementById('anunci-desc').value.trim();
    const modalitat = document.getElementById('anunci-modalitat').value;
    const categoria = document.getElementById('anunci-categoria').value;
    let punts = parseInt(document.getElementById('anunci-punts').value) || 0;


    if (modalitat === 'intercanvi') {
        punts = 0;
    }
    const estatProd = document.getElementById('anunci-estat-prod').value;
    const alertEl = document.getElementById('modal-alert');
    const btn = document.getElementById('btn-publicar');
    const urls = [];
    for (const file of imatgesModal) {
        try { urls.push(await pujarImgBB(file)); } catch (e) { console.warn('Error pujant imatge:', e); }
    }
    if (!titol || !desc) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'El títol i la descripció són obligatoris.'; alertEl.classList.remove('hidden'); return; }
    if (punts < 0) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Els ecopoints no poden ser negatius.'; alertEl.classList.remove('hidden'); return; }
    btn.textContent = 'Publicant...'; btn.disabled = true;
    try {
        await db.collection('anuncis').add({
            usuari_id: user.uid, titol, descripcio: desc,
            imatge: urls, ecopoints: punts, estat_anunci: 'disponible',
            estat_producte: estatProd, data_creacio: TS(), categoria, modalitat
        });
        document.getElementById('modal-anunci').classList.add('hidden');
        document.getElementById('anunci-titol').value = '';
        document.getElementById('anunci-desc').value = '';
        document.getElementById('anunci-punts').value = '0';
        alertEl.classList.add('hidden');
        renderAnuncis();
        imatgesModal = [];
        document.getElementById('preview-grid-modal').innerHTML = '';
        document.getElementById('anunci-imatges-modal').value = '';
    } catch (e) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Error: ' + e.message; alertEl.classList.remove('hidden'); }
    btn.textContent = 'Publicar'; btn.disabled = false;
}

async function carregarMeusAnuncis() {
    const user = auth.currentUser; if (!user) return;
    const grid = document.getElementById('meus-anuncis-grid');
    grid.innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('anuncis').where('usuari_id', '==', user.uid).orderBy('data_creacio', 'desc').get();
        if (snap.empty) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;grid-column:1/-1">Encara no has publicat cap anunci.</p>'; return; }
        const modLabel = { intercanvi: 'Intercanvi', punts: 'Punts' };
        grid.innerHTML = snap.docs.map(d => {
            const a = d.data();
            const estatClass = a.estat_anunci === 'reservat' ? 'tag-reservat' : a.estat_anunci === 'completat' ? 'tag-completat' : 'tag-estat';
            return `<div class="card" onclick="veureDeta('${d.id}')">
            <div class="card-img">📦${a.estat_anunci === 'reservat' ? '<div class="card-img-badge">Reservat</div>' : ''}</div>
            <div class="card-body">
              <div style="display:flex;gap:6px;margin-bottom:8px">
                <span class="tag tag-${a.modalitat}">${modLabel[a.modalitat] || a.modalitat}</span>
                <span class="tag ${estatClass}">${a.estat_anunci}</span>
              </div>
              <div class="card-title">${a.titol}</div>
              <div class="card-desc">${a.descripcio}</div>
              ${a.estat_anunci === 'reservat' ? `<div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();obrirModalEntrega('${d.id}','${a.comprador_id || ''}')">📦 Confirmar entrega</button></div>` : ''}
            </div>
          </div>`;
        }).join('');
    } catch (e) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Error carregant.</p>'; }
}

async function eliminarChat(altreUid, anunciId) {
    const user = auth.currentUser; if (!user) return;
    if (!confirm('Segur que vols eliminar aquesta conversa? Els missatges desapareixeran només per a tu.')) return;
    try {
        const [emisSnap, recSnap] = await Promise.all([
            db.collection('missatges')
                .where('id_emissor', '==', user.uid)
                .where('id_receptor', '==', altreUid)
                .where('anunci_referencia', '==', anunciId)
                .get(),
            db.collection('missatges')
                .where('id_emissor', '==', altreUid)
                .where('id_receptor', '==', user.uid)
                .where('anunci_referencia', '==', anunciId)
                .get()
        ]);

        const batch = db.batch();
        [...emisSnap.docs, ...recSnap.docs].forEach(doc => {
            batch.update(doc.ref, {
                [`eliminat_per_${user.uid}`]: true
            });
        });
        await batch.commit();

        if (chatActual?.altreUid === altreUid && chatActual?.anunciId === anunciId) {
            if (unsubChat) unsubChat();
            chatActual = null;
            document.getElementById('chat-header').classList.add('hidden');
            document.getElementById('chat-input-area').classList.add('hidden');
            document.getElementById('chat-messages').innerHTML = '';
        }

        await carregarChats();
    } catch (e) { alert('Error eliminant el xat: ' + e.message); console.error(e); }
}

let chatActual = null, unsubChat = null;

async function carregarChats() {
    const user = auth.currentUser; if (!user) return;
    const listEl = document.getElementById('chat-list-items');
    listEl.innerHTML = '<div class="loading" style="padding:20px"><span class="spinner"></span>Carregant...</div>';
    try {
        const [emisSnap, recSnap] = await Promise.all([
            db.collection('missatges').where('id_emissor', '==', user.uid).orderBy('data_enviament', 'desc').get(),
            db.collection('missatges').where('id_receptor', '==', user.uid).orderBy('data_enviament', 'desc').get()
        ]);
        const convMap = {};
        [...emisSnap.docs, ...recSnap.docs].forEach(doc => {
            const d = doc.data();
            const altreUid = d.id_emissor === user.uid ? d.id_receptor : d.id_emissor;
            const key = altreUid;
            const ts = d.data_enviament?.toMillis?.() || 0;
            if (d[`eliminat_per_${user.uid}`]) return;
            if (!convMap[key] || ts > convMap[key].ts) convMap[key] = { altreUid, anunciId: d.anunci_referencia, lastMsg: d.contingut, ts, noLlegit: (!d.llegit && d.id_receptor === user.uid) ? 1 : 0 };
        });
        const convList = Object.values(convMap).sort((a, b) => b.ts - a.ts);
        if (!convList.length) { listEl.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-muted)">No tens missatges encara.</p>'; return; }
        listEl.innerHTML = '';
        for (const conv of convList) {
            let nom = 'Usuari', ini = '?';
            try {
                const uDoc = await db.collection('usuaris').doc(conv.altreUid).get();
                if (uDoc.exists) {
                    const ud = uDoc.data();
                    nom = (ud.nom || '') + ' ' + (ud.cognom || '');
                    ini = ud.foto
                        ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                        : (ud.nom || '?').slice(0, 2).toUpperCase();
                }
            } catch (e) { }
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `
  <div class="avatar-sm">${ini}</div>
  <div class="chat-item-info">
    <div class="chat-item-name">${nom}</div>
    <div class="chat-item-msg">${conv.lastMsg || ''}</div>
  </div>
  ${conv.noLlegit ? `<div class="chat-unread">${conv.noLlegit}</div>` : ''}
  <button class="btn-delete-chat" onclick="event.stopPropagation(); eliminarChat('${conv.altreUid}','${conv.anunciId}')" title="Eliminar conversa">
    <img src="./images/eliminar.png" alt="Eliminar">
  </button>`;
            item.onclick = () => { document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active')); item.classList.add('active'); obrirConversacio(conv.altreUid, nom, ini, conv.anunciId); };
            listEl.appendChild(item);
        }
    } catch (e) { listEl.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-muted)">Error carregant missatges.</p>'; console.error(e); }
}

function obrirConversacio(altreUid, nom, ini, anunciId) {
    const user = auth.currentUser; if (!user) return;
    document.getElementById('chat-header').classList.remove('hidden');
    document.getElementById('chat-input-area').classList.remove('hidden');
    document.getElementById('chat-name').innerHTML = `<span style="cursor:pointer" onclick="veurePerfil('${altreUid}')">${nom}</span>`;
    document.getElementById('chat-avatar').innerHTML = ini;
    document.getElementById('chat-anunci').textContent = '';
    chatActual = { altreUid, anunciId };
    if (unsubChat) unsubChat();
    const msgsEl = document.getElementById('chat-messages');
    msgsEl.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
    unsubChat = db.collection('missatges').where('anunci_referencia', '==', anunciId).orderBy('data_enviament', 'asc').onSnapshot(async snap => {
        const el = document.getElementById('chat-messages');
        const msgs = snap.docs.map(d => d.data()).filter(d =>
            ((d.id_emissor === user.uid && d.id_receptor === altreUid) ||
                (d.id_emissor === altreUid && d.id_receptor === user.uid)) &&
            !d[`eliminat_per_${user.uid}`]
        );
        if (!msgs.length) { el.innerHTML = '<div class="chat-empty">Comença la conversa!</div>'; return; }
        el.innerHTML = msgs.map(m => {
            const sent = m.id_emissor === user.uid;
            const hora = m.data_enviament?.toDate?.()?.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' }) || '';
            if (m.tipus === 'proposta') {
                const esMeu = m.id_receptor === user.uid;
                const estat = m.proposta_estat || 'pendent';
                const estatLabel = estat === 'acceptada' ? '✅ Acceptada' : estat === 'rebutjada' ? '❌ Rebutjada' : '⏳ Pendent';
                return `
    <div class="msg msg-system">
        <div class="msg-text">${m.contingut}</div>
        ${esMeu && estat === 'pendent' ? `
        <div style="margin-top:8px;display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" onclick="acceptarProposta('${m.anunci_referencia}', '${m.oferta_id}', '${m.id_emissor}')">Acceptar</button>
            <button class="btn btn-outline btn-sm" onclick="rebutjarProposta('${m.anunci_referencia}', '${m.oferta_id}', '${m.id_emissor}')">Rebutjar</button>
        </div>
        ` : `<div style="font-size:12px;margin-top:6px;color:var(--text-muted)">${estatLabel}</div>`}
    </div>`;
            }
            return `<div class="msg ${sent ? 'msg-sent' : 'msg-recv'}"><div class="msg-text">${m.contingut}</div><div class="msg-time">${hora}${sent ? (m.llegit ? ' ✓✓' : ' ✓') : ''}</div></div>`;
        }).join('');
        el.scrollTop = el.scrollHeight;
        const noLlegits = snap.docs.filter(doc => doc.data().id_receptor === user.uid && !doc.data().llegit);
        if (noLlegits.length > 0) {
            await Promise.all(noLlegits.map(doc => doc.ref.update({ llegit: true })));
        }
    });
}

async function acceptarProposta(anunciId, ofertaId, compradorId) {
    const user = auth.currentUser;

    const [anunciDoc, ofertaDoc] = await Promise.all([
        db.collection('anuncis').doc(anunciId).get(),
        db.collection('anuncis').doc(ofertaId).get()
    ]);

    const a = anunciDoc.data();
    const oferta = ofertaDoc.exists ? ofertaDoc.data() : null;
    const ofertaTitol = oferta ? oferta.titol : 'Anunci';

    const batch = db.batch();

    batch.update(db.collection('anuncis').doc(anunciId), {
        estat_anunci: 'reservat',
        comprador_id: compradorId,
        oferta_acceptada: ofertaId
    });

    batch.update(db.collection('anuncis').doc(ofertaId), {
        estat_anunci: 'completat',
        comprador_id: user.uid,
        data_completat: TS()
    });

    await batch.commit();

    await db.collection('transaccions').add({
        usuari_id: user.uid,
        tipus: 'intercanvi_acceptat',
        anunci_id: anunciId,
        anunci_titol: a.titol || 'Anunci',
        anunci_obtingut_id: ofertaId,
        anunci_obtingut_titol: ofertaTitol,
        punts: 0,
        contrapart_id: compradorId,
        data: TS()
    });

    await db.collection('transaccions').add({
        usuari_id: compradorId,
        tipus: 'intercanvi_acceptat',
        anunci_id: ofertaId,
        anunci_titol: ofertaTitol,
        anunci_obtingut_id: anunciId,
        anunci_obtingut_titol: a.titol || 'Anunci',
        punts: 0,
        contrapart_id: user.uid,
        data: TS()
    });

    await db.collection('missatges').add({
        contingut: '✅ Proposta acceptada! Parleu pel xat per quedar.',
        anunci_referencia: anunciId,
        id_emissor: user.uid,
        id_receptor: compradorId,
        tipus: 'sistema',
        data_enviament: TS(),
        llegit: false
    });

    alert('Intercanvi acceptat!');
    veureDeta(anunciId);
}
async function rebutjarProposta(anunciId, ofertaId, compradorId) {
    const user = auth.currentUser;


    const missatgesPropostes = await db.collection('missatges')
        .where('anunci_referencia', '==', anunciId)
        .where('oferta_id', '==', ofertaId)
        .where('tipus', '==', 'proposta')
        .get();

    const batch = db.batch();
    missatgesPropostes.docs.forEach(doc => {
        batch.update(doc.ref, { proposta_estat: 'rebutjada' });
    });
    await batch.commit();


    const propostes = await db.collection('propostes')
        .where('anunci_id', '==', anunciId)
        .where('oferta_id', '==', ofertaId)
        .get();
    const batch2 = db.batch();
    propostes.docs.forEach(doc => batch2.update(doc.ref, { estat: 'rebutjada' }));
    await batch2.commit();


    await db.collection('missatges').add({
        contingut: ' Proposta rebutjada.',
        anunci_referencia: anunciId,
        id_emissor: user.uid, id_receptor: compradorId,
        tipus: 'sistema', data_enviament: TS(), llegit: false
    });

    alert('Proposta rebutjada.');
}
async function iniciarXat(anunciId, propietariUid) {
    const user = auth.currentUser; if (!user) return navigate('login');
    if (user.uid === propietariUid) return alert('No et pots enviar missatges a tu mateix.');
    navigate('chats', false); await carregarChats();
    let nom = 'Usuari', ini = '?';
    try {
        const uDoc = await db.collection('usuaris').doc(propietariUid).get();
        if (uDoc.exists) {
            const ud = uDoc.data();
            nom = (ud.nom || '') + ' ' + (ud.cognom || '');
            ini = ud.foto
                ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : (ud.nom || '?').slice(0, 2).toUpperCase();
        }
    } catch (e) { }
    obrirConversacio(propietariUid, nom, ini, anunciId);
}

async function sendMsg() {
    const user = auth.currentUser;
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text || !user || !chatActual) return;
    input.value = '';
    try {
        await db.collection('missatges').add({
            contingut: text, anunci_referencia: chatActual.anunciId,
            id_emissor: user.uid, id_receptor: chatActual.altreUid,
            entregat: true, llegit: false, data_enviament: TS()
        });
    } catch (e) { console.error('Error enviant missatge:', e); }
}
const msgInput = document.getElementById('msg-input');
if (msgInput) {
    msgInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
    msgInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

function obrirModalValoracio(anunciId, valoratUid) {
    if (!auth.currentUser) return navigate('login');
    document.getElementById('val-anunci-id').value = anunciId;
    document.getElementById('val-valorat-id').value = valoratUid;
    document.getElementById('val-alert').classList.add('hidden');
    document.getElementById('modal-valoracio').classList.remove('hidden');
}

async function enviarValoracio() {
    const user = auth.currentUser;
    if (!user) return;

    const estrelles = parseInt(document.getElementById('val-estrelles').value) || 0;
    const comentari = document.getElementById('val-comentari').value.trim();
    const anunciId = document.getElementById('val-anunci-id').value;
    const valoratId = document.getElementById('val-valorat-id').value;
    const alertEl = document.getElementById('val-alert');

    if (estrelles < 1 || estrelles > 5) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Has de posar entre 1 i 5 estrelles.';
        alertEl.classList.remove('hidden');
        return;
    }

    try {
        const existing = await db.collection('valoracions')
            .where('id_anunci', '==', anunciId)
            .where('id_redactor', '==', user.uid)
            .get();

        if (!existing.empty) {
            alert('Ja has valorat aquest intercanvi.');
            return;
        }

        await db.collection('valoracions').add({
            id_valorat: valoratId,
            id_redactor: user.uid,
            comentari: comentari || '',
            estrelles,
            id_anunci: anunciId,
            data: TS()
        });

        const vSnap = await db.collection('valoracions')
            .where('id_valorat', '==', valoratId)
            .get();

        const mitja = (
            vSnap.docs.reduce((acc, d) => acc + (d.data().estrelles || 0), 0)
            / vSnap.size
        ).toFixed(1);

        await db.collection('usuaris').doc(valoratId).update({
            valoracio_mitjana: mitja
        });

        document.getElementById('modal-valoracio').classList.add('hidden');

        alert('✅ Valoració enviada!');
        veureDeta(anunciId);

    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
    }
}

emailjs.init('kiFREBpYUFWgQaOAz');

function enviarContacte() {
    const nom = document.getElementById('c-nom').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const assumpte = document.getElementById('c-assumpte').value;
    const missatge = document.getElementById('c-missatge').value.trim();
    const alertEl = document.getElementById('contacte-alert');
    const btn = document.getElementById('btn-contacte');
    if (!nom || !email || !missatge) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Omple tots els camps.'; alertEl.classList.remove('hidden'); return; }
    btn.textContent = 'Enviant...'; btn.disabled = true;
    emailjs.send('service_drvu5mg', 'template_qtkds4p', { name: nom, email, title: assumpte, message: missatge })
        .then(() => { alertEl.className = 'alert alert-success'; alertEl.textContent = 'Missatge enviat correctament! ✅'; alertEl.classList.remove('hidden'); document.getElementById('c-nom').value = ''; document.getElementById('c-email').value = ''; document.getElementById('c-missatge').value = ''; btn.textContent = 'Enviar missatge'; btn.disabled = false; })
        .catch(err => { console.error(err); alertEl.className = 'alert alert-error'; alertEl.textContent = 'Error enviant. Torna-ho a intentar.'; alertEl.classList.remove('hidden'); btn.textContent = 'Enviar missatge'; btn.disabled = false; });
}
const IMGBB_KEY = '944935afc5f7c9c0edc61c6eb5782e12';

async function pujarImgBB(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error('La imatge no pot superar 5MB.');
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error('Error pujant imatge: ' + (data.error?.message || 'desconegut'));
    return data.data.url;
}

async function pujarFotoPerfil(input) {
    const user = auth.currentUser;
    const file = input.files[0];
    if (!file || !user) return;
    const alertEl = document.getElementById('perfil-alert');
    alertEl.className = 'alert alert-info';
    alertEl.textContent = 'Pujant foto...';
    alertEl.classList.remove('hidden');
    try {
        const url = await pujarImgBB(file);
        await db.collection('usuaris').doc(user.uid).update({ foto: url });
        const avatar = document.getElementById('perfil-avatar');
        avatar.innerHTML = `<img src="${url}" alt="foto perfil">`;
        const navAvatar = document.getElementById('nav-avatar-btn');
        navAvatar.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        alertEl.className = 'alert alert-success';
        alertEl.textContent = 'Foto actualitzada!';
        setTimeout(() => alertEl.classList.add('hidden'), 3000);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
    }
}

let imatgesSeleccionades = [];

function previewImatges(input) {
    imatgesSeleccionades = [...input.files].slice(0, 5);
    const grid = document.getElementById('preview-grid');
    grid.innerHTML = '';
    imatgesSeleccionades.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        grid.innerHTML += `
          <div class="img-preview-item" id="preview-${i}">
            <img src="${url}" alt="preview">
            <button class="remove-img" onclick="eliminarPreview(${i})">✕</button>
          </div>`;
    });
}

function eliminarPreview(i) {
    imatgesSeleccionades.splice(i, 1);
    document.getElementById('preview-grid').innerHTML = '';
    imatgesSeleccionades.forEach((file, j) => {
        const url = URL.createObjectURL(file);
        document.getElementById('preview-grid').innerHTML += `
          <div class="img-preview-item" id="preview-${j}">  
            <img src="${url}" alt="preview">
            <button class="remove-img" onclick="eliminarPreview(${j})">✕</button>
          </div>`;
    });
}

let imatgesModal = [];

function previewImatgesModal(input) {
    imatgesModal = [...input.files].slice(0, 5);
    const grid = document.getElementById('preview-grid-modal');
    grid.innerHTML = '';
    imatgesModal.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        grid.innerHTML += `<div class="img-preview-item"><img src="${url}"><button class="remove-img" onclick="eliminarPreviewModal(${i})">✕</button></div>`;
    });
}

function eliminarPreviewModal(i) {
    imatgesModal.splice(i, 1);
    previewImatgesModal({ files: imatgesModal });
}

async function veurePerfil(uid) {
    const actual = PAGES.find(p => !document.getElementById('page-' + p)?.classList.contains('hidden'));
    if (actual && actual !== 'perfil-public') historialNavegacio.push(actual);
    navigate('perfil-public', false);
    const content = document.getElementById('perfil-public-content');
    content.innerHTML = '<div class="loading"><span class="spinner"></span>Carregant...</div>';
    const uDoc = await db.collection('usuaris').doc(uid).get();
    if (!uDoc.exists) { content.innerHTML = '<p>Usuari no trobat.</p>'; return; }
    const u = uDoc.data();
    const ini = (u.nom || '?').slice(0, 2).toUpperCase();
    const anuncisSnap = await db.collection('anuncis').where('usuari_id', '==', uid).where('estat_anunci', '==', 'disponible').get();
    const anuncisHtml = anuncisSnap.empty ? '<p style="color:var(--text-muted);font-size:14px">Cap anunci actiu.</p>'
        : anuncisSnap.docs.map(d => {
            const a = d.data();
            return `<div class="card" onclick="veureDeta('${d.id}')">
                <div class="card-img">${(a.imatge && a.imatge[0]) ? `<img src="${a.imatge[0]}" onerror="this.parentElement.innerHTML='📦'">` : '📦'}</div>
                <div class="card-body"><div class="card-title">${a.titol}</div><div class="card-desc">${a.descripcio}</div></div>
            </div>`;
        }).join('');
    content.innerHTML = `
        <div class="perfil-header">
            <div style="width:72px;height:72px;border-radius:50%;background:var(--green-dark);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0">${u.foto ? `<img src="${u.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : ini}</div>
            <div class="perfil-info">
                <h2>${(u.nom || '') + ' ' + (u.cognom || '')}</h2>
                <p>📍 ${u.localitat || '—'}</p>
                <div class="perfil-stats">
                    <div><div class="perfil-stat-num">${u.intercanvis_real || 0}</div><div class="perfil-stat-label">Intercanvis</div></div>
                    <div><div class="perfil-stat-num">${u.valoracio_mitjana || '—'}</div><div class="perfil-stat-label">Valoració</div></div>
                </div>
            </div>
        </div>
        ${auth.currentUser && auth.currentUser.uid !== uid ? `<button class="btn btn-outline" style="margin-top:12px;margin-bottom:16px" onclick="iniciarXatDirecte('${uid}')">✉ Enviar missatge</button>` : ''}
        <div class="perfil-form-card">
            <h3>Anuncis actius</h3>
            <div class="grid-3">${anuncisHtml}</div>
        </div>`;
}

async function iniciarXatDirecte(uid) {
    navigate('chats', false);
    await carregarChats();
    let nom = 'Usuari', ini = '?';
    try {
        const uDoc = await db.collection('usuaris').doc(uid).get();
        if (uDoc.exists) {
            const ud = uDoc.data();
            nom = (ud.nom || '') + ' ' + (ud.cognom || '');
            ini = ud.foto
                ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : (ud.nom || '?').slice(0, 2).toUpperCase();
        }
    } catch (e) { }
    obrirConversacio(uid, nom, ini, 'general_' + uid);
}

let imatgesEditar = [];
let imatgesEditarExistents = [];

function previewImatgesEditar(input) {
    imatgesEditar = [...input.files].slice(0, 5 - imatgesEditarExistents.length);
    const grid = document.getElementById('editar-preview-grid');
    grid.innerHTML = '';
    imatgesEditar.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        grid.innerHTML += `<div class="img-preview-item"><img src="${url}"><button class="remove-img" onclick="eliminarPreviewEditar(${i})">✕</button></div>`;
    });
}

function eliminarPreviewEditar(i) {
    imatgesEditar.splice(i, 1);
    previewImatgesEditar({ files: imatgesEditar });
}

function eliminarImatgeExistent(i) {
    imatgesEditarExistents.splice(i, 1);
    renderImatgesExistents();
}

function renderImatgesExistents() {
    const grid = document.getElementById('editar-imatges-actuals');
    grid.innerHTML = imatgesEditarExistents.map((url, i) => `
        <div class="img-preview-item">
            <img src="${url}">
            <button class="remove-img" onclick="eliminarImatgeExistent(${i})">✕</button>
        </div>`).join('');
}

async function obrirModalEditar(anunciId) {
    const doc = await db.collection('anuncis').doc(anunciId).get();
    if (!doc.exists) return;
    const a = doc.data();
    document.getElementById('editar-id').value = anunciId;
    document.getElementById('editar-titol').value = a.titol || '';
    document.getElementById('editar-desc').value = a.descripcio || '';
    document.getElementById('editar-modalitat').value = a.modalitat || 'intercanvi';
    document.getElementById('editar-categoria').value = a.categoria || 'Altres';
    document.getElementById('editar-punts').value = a.ecopoints || 0;
    document.getElementById('editar-estat-prod').value = a.estat_producte || 'bon-estat';
    imatgesEditarExistents = [...(a.imatge || [])];
    imatgesEditar = [];
    document.getElementById('editar-preview-grid').innerHTML = '';
    document.getElementById('editar-alert').classList.add('hidden');
    renderImatgesExistents();
    document.getElementById('modal-editar').classList.remove('hidden');
}

async function guardarEdicio() {
    const anunciId = document.getElementById('editar-id').value;
    const titol = document.getElementById('editar-titol').value.trim();
    const desc = document.getElementById('editar-desc').value.trim();
    const alertEl = document.getElementById('editar-alert');
    const btn = document.getElementById('btn-editar');
    if (!titol || !desc) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Títol i descripció són obligatoris.';
        alertEl.classList.remove('hidden');
        return;
    }
    btn.textContent = 'Guardant...'; btn.disabled = true;
    const novesUrls = [];
    for (const file of imatgesEditar) {
        try { novesUrls.push(await pujarImgBB(file)); } catch (e) { console.warn(e); }
    }
    const toutesImatges = [...imatgesEditarExistents, ...novesUrls].slice(0, 5);
    try {
        await db.collection('anuncis').doc(anunciId).update({
            titol,
            descripcio: desc,
            modalitat: document.getElementById('editar-modalitat').value,
            categoria: document.getElementById('editar-categoria').value,
            ecopoints: parseInt(document.getElementById('editar-punts').value) || 0,
            estat_producte: document.getElementById('editar-estat-prod').value,
            imatge: toutesImatges
        });
        document.getElementById('modal-editar').classList.add('hidden');
        veureDeta(anunciId);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
    } finally {
        btn.textContent = 'Guardar'; btn.disabled = false;
    }
}

let indexCarrusel = 0;

function canviarImatge(dir) {
    const imgs = document.querySelectorAll('#carrusel-imgs img');
    if (!imgs.length) return;
    indexCarrusel = (indexCarrusel + dir + imgs.length) % imgs.length;
    anarAImatge(indexCarrusel);
}

function anarAImatge(i) {
    indexCarrusel = i;
    const carrusel = document.getElementById('carrusel-imgs');
    if (carrusel) carrusel.style.transform = `translateX(-${i * 100}%)`;
    document.querySelectorAll('.dot-carrusel').forEach((dot, j) => {
        dot.style.background = j === i ? '#fff' : 'rgba(255,255,255,0.4)';
    });
}

function navegarAPerfil() {
    const actual = PAGES.find(p => !document.getElementById('page-' + p)?.classList.contains('hidden'));
    if (actual && actual !== 'perfil') historialNavegacio.push(actual);
    navigate('perfil', false);
}

function toggleEco(checkbox) {
    const root = document.documentElement;
    if (checkbox.checked) {
        root.setAttribute('data-theme', 'eco');
        localStorage.setItem('modoEco', 'true');
    } else {
        root.removeAttribute('data-theme');
        localStorage.setItem('modoEco', 'false');
    }
}

(function () {
    if (localStorage.getItem('modoEco') === 'true') {
        document.documentElement.setAttribute('data-theme', 'eco');
        const toggle = document.getElementById('eco-toggle');
        if (toggle) toggle.checked = true;
    }
})();