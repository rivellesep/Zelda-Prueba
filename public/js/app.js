// ═══════════════════════════════════════════════════════
//  FIREBASE INIT
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  NAVEGACIÓ
// ═══════════════════════════════════════════════════════
const PAGES = ['landing', 'login', 'explorar', 'perfil', 'chats', 'contacte', 'detall'];

function navigate(page) {
    PAGES.forEach(p => document.getElementById('page-' + p)?.classList.add('hidden'));
    document.getElementById('page-' + page)?.classList.remove('hidden');
    ['explorar', 'chats', 'contacte'].forEach(p =>
        document.getElementById('nav-' + p)?.classList.toggle('active', p === page)
    );
    window.scrollTo(0, 0);
    if (page === 'chats') carregarChats();
    if (page === 'perfil') { carregarMeusAnuncis(); carregarHistorial(); }
}

// ═══════════════════════════════════════════════════════
//  AUTH STATE 
// ═══════════════════════════════════════════════════════
auth.onAuthStateChanged(user => {
    if (user) {

        // UI logat
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('navbar-guest').classList.add('hidden');
        document.getElementById('footer').classList.remove('hidden');

        // 🔥 LISTENER EN TEMPS REAL (PUNTS I PERFIL)
        db.collection('usuaris').doc(user.uid).onSnapshot(doc => {
            if (doc.exists) {
                const d = doc.data();

                const ini = (d.nom || user.email || '?').slice(0, 2).toUpperCase();

                // Avatar
                const avatarEl = document.getElementById('perfil-avatar');
const navAvatarEl = document.getElementById('nav-avatar-btn');
if (!avatarEl.querySelector('img')) {
  navAvatarEl.textContent = ini;
  avatarEl.textContent = ini;
}

                // Nom i email
                document.getElementById('perfil-nom').textContent =
                    (d.nom || '') + ' ' + (d.cognom || '');
                document.getElementById('perfil-email').textContent = user.email;

                // ✅ PUNTS (AIXÒ ÉS EL QUE VOLIES)
                document.getElementById('nav-points').textContent = d.punts || 0;
                document.getElementById('perfil-points').textContent = d.punts || 0;

                // Altres dades
                document.getElementById('perfil-intercanvis').textContent =
                    d.intercanvis_real || 0;
                document.getElementById('perfil-valoracio').textContent =
                    d.valoracio_mitjana || '—';

                // Inputs
                document.getElementById('perfil-input-nom').value = d.nom || '';
                document.getElementById('perfil-input-cognom').value = d.cognom || '';
                if (d.foto) {
                    document.getElementById('perfil-avatar').innerHTML = `<img src="${d.foto}" alt="foto">`;
                    document.getElementById('nav-avatar-btn').innerHTML = `<img src="${d.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                }
            }
        });
        // Badge missatges no llegits
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
        navigate('explorar');

    } else {

        // UI no logat
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('navbar-guest').classList.remove('hidden');
        document.getElementById('footer').classList.add('hidden');

        navigate('landing');
    }
});
// ═══════════════════════════════════════════════════════
//  AUTH FUNCIONS
// ═══════════════════════════════════════════════════════
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

    // Validacions bàsiques
    if (!email || !pass || !nom || !cognom || !localitat)
        return showAlert('Omple tots els camps obligatoris (*).');
    if (pass.length < 6)
        return showAlert('La contrasenya ha de tenir mínim 6 caràcters.');
    if (telefon && !/^\d{9}$/.test(telefon))
        return showAlert('El telèfon ha de tenir exactament 9 dígits.');

    // ✅ NOU: Comprovar telèfon duplicat a Firestore
    if (telefon) {
        try {
            const telSnap = await db.collection('usuaris')
                .where('telefon', '==', telefon)
                .limit(1)
                .get();
            if (!telSnap.empty)
                return showAlert('Aquest telèfon ja està registrat a Zelva.');
        } catch (e) {
            return showAlert('Error comprovant el telèfon. Torna-ho a intentar.');
        }
    }

    // ✅ Crear el compte (l'email duplicat ja el gestiona Firebase Auth)
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await Promise.all([
            db.collection('usuaris').doc(cred.user.uid).set({
                nom, cognom, localitat, telefon: telefon || null, foto: '',
                data_creacio: TS(), punts: 200,
                intercanvis_real: 0, valoracio_mitjana: null
            }),
            cred.user.updateProfile({ displayName: nom })
        ]);
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
    const msgs = {
        'auth/user-not-found': 'Usuari no trobat.', 'auth/wrong-password': 'Contrasenya incorrecta.',
        'auth/invalid-credential': 'Credencials incorrectes.', 'auth/email-already-in-use': 'Aquest correu ja està registrat.',
        'auth/invalid-email': 'Correu no vàlid.', 'auth/weak-password': 'Contrasenya massa feble.',
        'auth/popup-closed-by-user': 'Popup tancat.'
    };
    return msgs[code] || 'Error inesperat.';
}

// ═══════════════════════════════════════════════════════
//  GUARDAR PERFIL
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  ANUNCIS
// ═══════════════════════════════════════════════════════
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
                if (uDoc.exists) { const ud = uDoc.data(); totsAnuncis = totsAnuncis.map(a => a.usuari_id === uid ? { ...a, _nom: ud.nom, _loc: ud.localitat, _ini: (ud.nom || '?').slice(0, 2).toUpperCase() } : a); }
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
    const modLabel = { intercanvi: 'Intercanvi', donacio: 'Donació', punts: 'Punts' };
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
                <div class="avatar-sm">${a._ini || '?'}</div>
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

// ═══════════════════════════════════════════════════════
//  DETALL ANUNCI
// ═══════════════════════════════════════════════════════
async function veureDeta(anunciId) {
    navigate('detall');
    const content = document.getElementById('detall-content');
    content.innerHTML = '<div class="loading"><span class="spinner"></span>Carregant...</div>';
    try {
        const [anunciDoc, valsSnap] = await Promise.all([
            db.collection('anuncis').doc(anunciId).get(),
            db.collection('valoracions').where('id_anunci', '==', anunciId).get()
        ]);
        if (!anunciDoc.exists) { content.innerHTML = '<p>Anunci no trobat.</p>'; return; }
        const a = { id: anunciDoc.id, ...anunciDoc.data() };
        const modLabel = { intercanvi: 'Intercanvi', donacio: 'Donació', punts: 'Punts' };
        const user = auth.currentUser;

        let nomProp = 'Usuari', locProp = '', iniProp = '?';
        try {
            const uDoc = await db.collection('usuaris').doc(a.usuari_id).get();
            if (uDoc.exists) { const ud = uDoc.data(); nomProp = (ud.nom || '') + ' ' + (ud.cognom || ''); locProp = ud.localitat || ''; iniProp = (ud.nom || '?').slice(0, 2).toUpperCase(); }
        } catch (e) { }

        // Comprova si l'usuari actual ha comprat aquest anunci (estat reservat)
        let yaHaComprat = false;
        if (user && a.comprador_id === user.uid) yaHaComprat = true;

        const valsHtml = valsSnap.empty
            ? '<p style="color:var(--text-muted);font-size:14px">Encara no hi ha valoracions.</p>'
            : valsSnap.docs.map(v => { const vd = v.data(); return `<div class="valoracio-card"><div class="stars">${'★'.repeat(vd.estrelles || 0)}${'☆'.repeat(5 - (vd.estrelles || 0))}</div><p style="font-size:14px;margin-top:6px">${vd.comentari || ''}</p></div>`; }).join('');

        const esProp = user && user.uid === a.usuari_id;
        const esLogat = !!user;
        const puntsLabel = a.modalitat === 'punts' ? (a.ecopoints || 0) + ' pts' : a.modalitat === 'donacio' ? 'Gratis' : 'Intercanvi';

        // Banner d'estat si reservat o completat
        let estatBanner = '';
        if (a.estat_anunci === 'reservat') estatBanner = `<div class="estat-banner estat-banner-reservat">⏳ Aquest anunci està reservat i pendent de confirmació d'entrega.</div>`;
        if (a.estat_anunci === 'completat') estatBanner = `<div class="estat-banner estat-banner-completat">✅ Aquest intercanvi s'ha completat correctament.</div>`;

        // Botó de compra amb EcoPoints (només si modalitat=punts, disponible, i no és el propietari)
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
        // Botó reservar (per intercanvi/donació)
        let reservarBtn = '';
        if ((a.modalitat === 'intercanvi' || a.modalitat === 'donacio') && a.estat_anunci === 'disponible' && esLogat && !esProp) {
            reservarBtn = `<button class="btn btn-warning" onclick="reservarAnunci('${a.id}','${a.usuari_id}')">📌 Sol·licitar reserva</button>`;
        }
        // Botó confirmar entrega (propietari, anunci reservat)
        let entregaBtn = '';
        if (esProp && a.estat_anunci === 'reservat') {
            entregaBtn = `<button class="btn btn-primary" onclick="obrirModalEntrega('${a.id}','${a.comprador_id || ''}')">📦 Confirmar entrega</button>`;
        }
        // Botó cancel·lar reserva (comprador o propietari)
        let cancelBtn = '';
        if (a.estat_anunci === 'reservat' && user && (user.uid === a.comprador_id || esProp)) {
            cancelBtn = `<button class="btn btn-outline" onclick="cancellarReserva('${a.id}')">✕ Cancel·lar reserva</button>`;
        }

        content.innerHTML = `
          <div class="detall-card">
            <div class="detall-img">${(a.imatge && a.imatge[0]) ? `<img src="${a.imatge[0]}" alt="${a.titol}">` : '📦'}</div>
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
                <div class="avatar-lg" style="width:44px;height:44px;font-size:16px">${iniProp}</div>
                <div><div class="detall-user-name">${nomProp}</div><div class="detall-user-loc">📍 ${locProp}</div></div>
              </div>
              ${compraBox}
              <div class="detall-actions">
                ${reservarBtn}
                ${entregaBtn}
                ${cancelBtn}
                ${esLogat && !esProp && a.estat_anunci !== 'completat' ? `<button class="btn btn-outline" onclick="iniciarXat('${a.id}','${a.usuari_id}')">✉ Enviar missatge</button>` : ''}
${esLogat && !esProp && a.estat_anunci === 'completat' && !a.valorat ? `<button class="btn btn-outline" onclick="obrirModalValoracio('${a.id}','${a.usuari_id}')">⭐ Valorar</button>` : ''}
${esLogat && !esProp && a.estat_anunci === 'completat' && a.valorat ? `<button class="btn btn-outline" disabled>⭐ Valorat</button>` : ''}                ${esProp && a.estat_anunci === 'disponible' ? `<button class="btn btn-danger btn-sm" onclick="eliminarAnunci('${a.id}')">Eliminar anunci</button>` : ''}
              </div>
              <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Valoracions (${valsSnap.size})</h3>
              ${valsHtml}
            </div>
          </div>`;

        // Mostrar saldo en viu
        if (user) {
            db.collection('usuaris').doc(user.uid).get().then(d => {
                const el = document.getElementById('saldo-live');
                if (el) el.textContent = d.exists ? (d.data().punts || 0) : '—';
            });
        }
    } catch (e) { content.innerHTML = '<p style="color:var(--text-muted)">Error carregant l\'anunci.</p>'; console.error(e); }
}

async function eliminarAnunci(id) {
    if (!confirm('Segur que vols eliminar aquest anunci?')) return;
    try { await db.collection('anuncis').doc(id).update({ estat_anunci: 'completat' }); navigate('explorar'); renderAnuncis(); }
    catch (e) { alert('Error: ' + e.message); }
}

// ═══════════════════════════════════════════════════════
//  ★ SISTEMA DE COMPRA AMB ECOPOINTS ★
// ═══════════════════════════════════════════════════════
let compraPendent = null; // guarda dades de la compra pendent de confirmar

async function obrirModalCompra(anunciId, titol, preu, venedorId) {
    const user = auth.currentUser; if (!user) return navigate('login');
    compraPendent = { anunciId, titol, preu, venedorId };

    const alertEl = document.getElementById('compra-alert');
    alertEl.classList.add('hidden');
    document.getElementById('btn-confirmar-compra').disabled = false;

    // Obtenir saldo actual
    const uDoc = await db.collection('usuaris').doc(user.uid).get();
    const saldo = uDoc.exists ? (uDoc.data().punts || 0) : 0;
    const saldoFinal = saldo - preu;
    const tensSuficients = saldo >= preu;

    document.getElementById('compra-resum').innerHTML = `
        <div class="modal-compra-row"><span class="label">Producte</span><span class="valor">${titol}</span></div>
        <div class="modal-compra-row"><span class="label">Preu</span><span class="valor negatiu">-${preu} pts</span></div>
        <hr class="modal-compra-divider">
        <div class="modal-compra-row"><span class="label">Saldo actual</span><span class="valor">${saldo} pts</span></div>
        <div class="modal-compra-row"><span class="label">Saldo després</span><span class="valor ${tensSuficients ? 'final' : 'negatiu'}">${saldoFinal} pts</span></div>
      `;

    if (!tensSuficients) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = `No tens prou EcoPoints. Necessites ${preu} pts però tens ${saldo} pts.`;
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
        // Transacció atòmica: descomptar punts, marcar anunci reservat, notificar venedor
        const batch = db.batch();



        // 2. Marcar anunci com a reservat + guardar qui ha comprat
        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'reservat',
            comprador_id: user.uid,
            data_reserva: TS()
        });

        await batch.commit();

        // 3. Missatge automàtic al xat notificant la compra
        await db.collection('missatges').add({
            contingut: `🛒 He comprat "${titol}" per ${preu} EcoPoints. Estem pendents que confirmis l'entrega!`,
            anunci_referencia: anunciId,
            id_emissor: user.uid,
            id_receptor: venedorId,
            entregat: true, llegit: false,
            data_enviament: TS(),
            tipus: 'sistema'
        });

        // 4. Registrar la transacció a l'historial
        await db.collection('transaccions').add({
            usuari_id: user.uid,
            tipus: 'compra',
            anunci_id: anunciId,
            anunci_titol: titol,
            punts: -preu,
            contrapart_id: venedorId,
            data: TS()
        });

        document.getElementById('modal-compra').classList.add('hidden');
        btn.textContent = '✓ Confirmar compra'; btn.disabled = false;
        compraPendent = null;

        // Actualitzar saldo a la navbar
        const uDocNou = await db.collection('usuaris').doc(user.uid).get();
        if (uDocNou.exists) document.getElementById('nav-points').textContent = uDocNou.data().punts || 0;

        alert(`✅ Compra realitzada! S'han descomptat ${preu} EcoPoints del teu saldo. El venedor ha rebut un missatge.`);
        veureDeta(anunciId); // refrescar detall
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error processant la compra: ' + e.message;
        alertEl.classList.remove('hidden');
        btn.textContent = '✓ Confirmar compra'; btn.disabled = false;
        console.error(e);
    }
}

// ═══════════════════════════════════════════════════════
//  ★ RESERVAR (intercanvi/donació) ★
// ═══════════════════════════════════════════════════════
async function reservarAnunci(anunciId, venedorId) {
    const user = auth.currentUser; if (!user) return navigate('login');
    if (!confirm('Vols sol·licitar la reserva d\'aquest anunci? El venedor rebrà un missatge.')) return;
    try {
        const snap = await db.collection('anuncis').doc(anunciId).get();
        const a = snap.data();
        await db.collection('anuncis').doc(anunciId).update({
            estat_anunci: 'reservat', comprador_id: user.uid, data_reserva: TS()
        });
        await db.collection('missatges').add({
            contingut: `📌 He sol·licitat la reserva de "${a.titol}". Podem quedar per fer l'intercanvi!`,
            anunci_referencia: anunciId, id_emissor: user.uid, id_receptor: venedorId,
            entregat: true, llegit: false, data_enviament: TS(), tipus: 'sistema'
        });
        alert('✅ Reserva sol·licitada! El venedor ha rebut un missatge.');
        veureDeta(anunciId);
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══════════════════════════════════════════════════════
//  ★ CONFIRMAR ENTREGA (propietari) ★
// ═══════════════════════════════════════════════════════
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

        // 1. Marcar anunci com a completat
        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'completat', data_completat: TS()
        });

        // 2. Si era modalitat punts: transferir els EcoPoints al venedor
        if (a.modalitat === 'punts' && a.ecopoints > 0) {
            batch.update(db.collection('usuaris').doc(user.uid), {
                punts: INC(a.ecopoints), intercanvis_real: INC(1)
            });
            // Descomptar els punts al comprador ara
            if (compradorId) {
                batch.update(db.collection('usuaris').doc(compradorId), { punts: INC(-a.ecopoints) });
            }
        } else {
            // Per intercanvi/donació: incrementar comptador d'intercanvis
            batch.update(db.collection('usuaris').doc(user.uid), { intercanvis_real: INC(1) });
        }

        // 3. Incrementar intercanvis del comprador
        if (compradorId) {
            batch.update(db.collection('usuaris').doc(compradorId), { intercanvis_real: INC(1) });
        }

        await batch.commit();

        // 4. Registrar la transacció a l'historial del venedor
        if (a.modalitat === 'punts' && a.ecopoints > 0) {
            await db.collection('transaccions').add({
                usuari_id: user.uid, tipus: 'venda',
                anunci_id: anunciId, anunci_titol: a.titol || 'Anunci',
                punts: a.ecopoints, contrapart_id: compradorId, data: TS()
            });
        }

        // 5. Missatge de confirmació al xat
        await db.collection('missatges').add({
            contingut: `✅ L'entrega ha estat confirmada! L'intercanvi s'ha completat correctament. Gràcies!`,
            anunci_referencia: anunciId, id_emissor: user.uid, id_receptor: compradorId || user.uid,
            entregat: true, llegit: false, data_enviament: TS(), tipus: 'sistema'
        });

        document.getElementById('modal-entrega').classList.add('hidden');
        btn.textContent = '✓ Sí, he entregat'; btn.disabled = false;

        // Actualitzar punts navbar
        const uDocNou = await db.collection('usuaris').doc(user.uid).get();
        if (uDocNou.exists) {
            document.getElementById('nav-points').textContent = uDocNou.data().punts || 0;
            document.getElementById('perfil-points').textContent = uDocNou.data().punts || 0;
            document.getElementById('perfil-intercanvis').textContent = uDocNou.data().intercanvis_real || 0;
        }

        alert('✅ Entrega confirmada! L\'intercanvi s\'ha completat.');
        veureDeta(anunciId);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
        btn.textContent = '✓ Sí, he entregat'; btn.disabled = false;
        console.error(e);
    }
}

// ═══════════════════════════════════════════════════════
//  ★ CANCEL·LAR RESERVA ★
// ═══════════════════════════════════════════════════════
async function cancellarReserva(anunciId) {
    const user = auth.currentUser; if (!user) return;
    if (!confirm('Segur que vols cancel·lar la reserva?')) return;
    try {
        const anunciDoc = await db.collection('anuncis').doc(anunciId).get();
        const a = anunciDoc.data();
        const batch = db.batch();

        // Tornar a disponible
        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'disponible',
            comprador_id: firebase.firestore.FieldValue.delete(),
            data_reserva: firebase.firestore.FieldValue.delete()
        });

        await batch.commit();

        // Actualitzar punts si ets el comprador
        if (a.comprador_id === user.uid) {
            const uDocNou = await db.collection('usuaris').doc(user.uid).get();
            if (uDocNou.exists) document.getElementById('nav-points').textContent = uDocNou.data().punts || 0;
        }

        alert('La reserva ha estat cancel·lada.');
        veureDeta(anunciId);
    } catch (e) { alert('Error: ' + e.message); }
}

// ═══════════════════════════════════════════════════════
//  HISTORIAL TRANSACCIONS
// ═══════════════════════════════════════════════════════
async function carregarHistorial() {
    const user = auth.currentUser; if (!user) return;
    const grid = document.getElementById('historial-grid');
    grid.innerHTML = '<div class="loading"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('transaccions')
            .where('usuari_id', '==', user.uid)
            .orderBy('data', 'desc').limit(20).get();
        if (snap.empty) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Encara no tens transaccions.</p>'; return; }
        grid.innerHTML = snap.docs.map(d => {
            const t = d.data();
            const esCompra = t.tipus === 'compra';
            const data = t.data?.toDate?.()?.toLocaleDateString('ca', { day: '2-digit', month: '2-digit', year: 'numeric' }) || '—';
            return `<div class="compra-item">
            <div style="font-size:24px">${esCompra ? '🛒' : '💰'}</div>
            <div class="compra-item-info">
              <div class="compra-item-titol">${esCompra ? 'Compra' : 'Venda'}: ${t.anunci_titol || '—'}</div>
              <div class="compra-item-sub">${data}</div>
            </div>
            <div class="compra-item-punts ${esCompra ? 'gastat' : 'guanyat'}">${esCompra ? '' : '+'}${t.punts || 0} pts</div>
          </div>`;
        }).join('');
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Error carregant historial.</p>';
        console.error(e);
    }
}

// ═══════════════════════════════════════════════════════
//  PUBLICAR ANUNCI
// ═══════════════════════════════════════════════════════
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
    const punts = parseInt(document.getElementById('anunci-punts').value) || 0;
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

// ═══════════════════════════════════════════════════════
//  ELS MEUS ANUNCIS (perfil)
// ═══════════════════════════════════════════════════════
async function carregarMeusAnuncis() {
    const user = auth.currentUser; if (!user) return;
    const grid = document.getElementById('meus-anuncis-grid');
    grid.innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('anuncis').where('usuari_id', '==', user.uid).orderBy('data_creacio', 'desc').get();
        if (snap.empty) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;grid-column:1/-1">Encara no has publicat cap anunci.</p>'; return; }
        const modLabel = { intercanvi: 'Intercanvi', donacio: 'Donació', punts: 'Punts' };
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

// ═══════════════════════════════════════════════════════
//  MISSATGERIA
// ═══════════════════════════════════════════════════════
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
            const key = altreUid + '_' + d.anunci_referencia;
            const ts = d.data_enviament?.toMillis?.() || 0;
            if (!convMap[key] || ts > convMap[key].ts) convMap[key] = { altreUid, anunciId: d.anunci_referencia, lastMsg: d.contingut, ts, noLlegit: (!d.llegit && d.id_receptor === user.uid) ? 1 : 0 };
        });
        const convList = Object.values(convMap).sort((a, b) => b.ts - a.ts);
        if (!convList.length) { listEl.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-muted)">No tens missatges encara.</p>'; return; }
        listEl.innerHTML = '';
        for (const conv of convList) {
            let nom = 'Usuari', ini = '?';
            try { const uDoc = await db.collection('usuaris').doc(conv.altreUid).get(); if (uDoc.exists) { const ud = uDoc.data(); nom = (ud.nom || '') + ' ' + (ud.cognom || ''); ini = (ud.nom || '?').slice(0, 2).toUpperCase(); } } catch (e) { }
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `
            <div class="avatar-sm">${ini}</div>
            <div class="chat-item-info">
              <div class="chat-item-name">${nom}</div>
              <div class="chat-item-msg">${conv.lastMsg || ''}</div>
            </div>
            ${conv.noLlegit ? `<div class="chat-unread">${conv.noLlegit}</div>` : ''}`;
            item.onclick = () => { document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active')); item.classList.add('active'); obrirConversacio(conv.altreUid, nom, ini, conv.anunciId); };
            listEl.appendChild(item);
        }
    } catch (e) { listEl.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-muted)">Error carregant missatges.</p>'; console.error(e); }
}

function obrirConversacio(altreUid, nom, ini, anunciId) {
    const user = auth.currentUser; if (!user) return;
    document.getElementById('chat-header').classList.remove('hidden');
    document.getElementById('chat-input-area').classList.remove('hidden');
    document.getElementById('chat-name').textContent = nom;
    document.getElementById('chat-avatar').textContent = ini;
    document.getElementById('chat-anunci').textContent = anunciId || '';
    chatActual = { altreUid, anunciId };
    if (unsubChat) unsubChat();
    const msgsEl = document.getElementById('chat-messages');
    msgsEl.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
    unsubChat = db.collection('missatges').where('anunci_referencia', '==', anunciId).orderBy('data_enviament', 'asc').onSnapshot(async snap => {
        const el = document.getElementById('chat-messages');
        const msgs = snap.docs.map(d => d.data()).filter(d => (d.id_emissor === user.uid && d.id_receptor === altreUid) || (d.id_emissor === altreUid && d.id_receptor === user.uid));
        if (!msgs.length) { el.innerHTML = '<div class="chat-empty">Comença la conversa!</div>'; return; }
        el.innerHTML = msgs.map(m => {
            const sent = m.id_emissor === user.uid;
            const hora = m.data_enviament?.toDate?.()?.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' }) || '';
            const isSistema = m.tipus === 'sistema';
            if (isSistema) return `<div class="msg msg-system"><div class="msg-text">${m.contingut}</div></div>`;
            return `<div class="msg ${sent ? 'msg-sent' : 'msg-recv'}"><div class="msg-text">${m.contingut}</div><div class="msg-time">${hora}${sent ? (m.llegit ? ' ✓✓' : ' ✓') : ''}</div></div>`;
        }).join('');
        el.scrollTop = el.scrollHeight;
        const noLlegits = snap.docs.filter(doc => doc.data().id_receptor === user.uid && !doc.data().llegit);
        if (noLlegits.length > 0) {
            await Promise.all(noLlegits.map(doc => doc.ref.update({ llegit: true })));
        }
    });
}

async function iniciarXat(anunciId, propietariUid) {
    const user = auth.currentUser; if (!user) return navigate('login');
    if (user.uid === propietariUid) return alert('No et pots enviar missatges a tu mateix.');
    navigate('chats'); await carregarChats();
    let nom = 'Usuari', ini = '?';
    try { const uDoc = await db.collection('usuaris').doc(propietariUid).get(); if (uDoc.exists) { const ud = uDoc.data(); nom = (ud.nom || '') + ' ' + (ud.cognom || ''); ini = (ud.nom || '?').slice(0, 2).toUpperCase(); } } catch (e) { }
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

// ═══════════════════════════════════════════════════════
//  VALORACIONS
// ═══════════════════════════════════════════════════════
function obrirModalValoracio(anunciId, valoratUid) {
    if (!auth.currentUser) return navigate('login');
    document.getElementById('val-anunci-id').value = anunciId;
    document.getElementById('val-valorat-id').value = valoratUid;
    document.getElementById('val-alert').classList.add('hidden');
    document.getElementById('modal-valoracio').classList.remove('hidden');
}

async function enviarValoracio() {
    const user = auth.currentUser;
    const estrelles = parseInt(document.getElementById('val-estrelles').value) || 0;
    const comentari = document.getElementById('val-comentari').value.trim();
    const anunciId = document.getElementById('val-anunci-id').value;
    const valoratId = document.getElementById('val-valorat-id').value;
    const alertEl = document.getElementById('val-alert');
    if (estrelles < 0 || estrelles > 5) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Les estrelles han de ser entre 0 i 5.'; alertEl.classList.remove('hidden'); return; }
    try {
        await db.collection('valoracions').add({ id_valorat: valoratId, id_redactor: user.uid, comentari: comentari || null, estrelles, id_anunci: anunciId });
        const vSnap = await db.collection('valoracions').where('id_valorat', '==', valoratId).get();
        const mitja = (vSnap.docs.reduce((acc, d) => acc + (d.data().estrelles || 0), 0) / vSnap.size).toFixed(1);
        await db.collection('usuaris').doc(valoratId).update({ valoracio_mitjana: mitja });
        document.getElementById('modal-valoracio').classList.add('hidden');
        alert('Valoració enviada!');
        veureDeta(anunciId);
    } catch (e) { alertEl.className = 'alert alert-error'; alertEl.textContent = 'Error: ' + e.message; alertEl.classList.remove('hidden'); }
}

// ═══════════════════════════════════════════════════════
//  EMAILJS — CONTACTE
// ═══════════════════════════════════════════════════════
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
// ═══ IMGBB ═══
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
carregarEstadistiques();

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