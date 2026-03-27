// ── ESTAT AUTH ──────────────────────────────────────────────
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('navbar-guest').classList.add('hidden');
        document.getElementById('footer').classList.remove('hidden');

        db.collection('usuaris').doc(user.uid).onSnapshot(doc => {
            if (!doc.exists) return;
            const d = doc.data();
            const ini = (d.nom || user.email || '?').slice(0, 2).toUpperCase();
            const avatarEl = document.getElementById('perfil-avatar');
            const navAvatarEl = document.getElementById('nav-avatar-btn');

            if (!avatarEl.querySelector('img')) {
                navAvatarEl.textContent = ini;
                avatarEl.textContent = ini;
            }

            document.getElementById('perfil-nom').textContent = (d.nom || '') + ' ' + (d.cognom || '');
            document.getElementById('perfil-email').textContent = user.email;

            const disponibles = (d.punts || 0) - (d.punts_bloquejats || 0);
            document.getElementById('nav-points').textContent = disponibles;
            document.getElementById('perfil-points').textContent = disponibles;
            document.getElementById('perfil-intercanvis').textContent = d.intercanvis_real || 0;
            document.getElementById('perfil-valoracio').textContent = d.valoracio_mitjana || '—';

            document.getElementById('perfil-input-nom').value = d.nom || '';
            document.getElementById('perfil-input-cognom').value = d.cognom || '';
            document.getElementById('perfil-input-telefon').value = d.telefon || '';
            document.getElementById('perfil-input-localitat').value = d.localitat || '';

            if (d.foto) {
                document.getElementById('perfil-avatar').innerHTML = `<img src="${d.foto}" alt="foto">`;
                document.getElementById('nav-avatar-btn').innerHTML = `<img src="${d.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            }
        });

        // Badge missatges no llegits
        db.collection('missatges')
            .where('id_receptor', '==', user.uid)
            .where('llegit', '==', false)
            .onSnapshot(snap => {
                const badge = document.getElementById('nav-msg-badge');
                if (!badge) return;
                if (snap.size > 0) {
                    badge.textContent = snap.size > 99 ? '99+' : snap.size;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            });

        carregarStatsLanding();
        renderAnuncis();
        historialNavegacio = [];
        navigate('explorar', false);

    } else {
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('navbar-guest').classList.remove('hidden');
        document.getElementById('footer').classList.add('hidden');
        historialNavegacio = [];
        carregarStatsLanding();
        navigate('landing', false);
    }
});

// ── STATS LANDING ────────────────────────────────────────────
async function carregarStatsLanding() {
    try {
        const [usuarisSnap, anuncisSnap, transSnap] = await Promise.all([
            db.collection('usuaris').get(),
            db.collection('anuncis').where('estat_anunci', 'in', ['disponible', 'reservat']).get(),
            db.collection('transaccions').get()
        ]);
        const elU = document.getElementById('stat-usuaris');
        const elA = document.getElementById('stat-anuncis');
        const elI = document.getElementById('stat-intercanvis');
        if (elU) elU.textContent = usuarisSnap.size;
        if (elA) elA.textContent = anuncisSnap.size;
        if (elI) elI.textContent = transSnap.size;
    } catch (e) {
        console.warn('Error carregant stats landing:', e);
    }
}

// ── LOGIN / REGISTRE ─────────────────────────────────────────
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

function hideAlert() {
    document.getElementById('auth-alert').classList.add('hidden');
}

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

        // ✅ CORRECCIÓ: aquesta línia faltava a l'original
        const cred = await auth.createUserWithEmailAndPassword(email, pass);

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
    const errors = {
        'auth/user-not-found': 'Aquest usuari no existeix.',
        'auth/wrong-password': 'Contrasenya incorrecta.',
        'auth/email-already-in-use': 'Aquest correu electrònic ja està registrat.',
        'auth/invalid-email': 'El format del correu no és vàlid.',
        'auth/weak-password': 'La contrasenya és massa feble.',
        'auth/network-request-failed': 'Error de connexió a internet.',
        'auth/popup-closed-by-user': "S'ha tancat la finestra de Google.",
        'auth/invalid-credential': 'Correu o contrasenya incorrectes.'
    };
    return errors[code] || "S'ha produït un error: " + code;
}

// ── PERFIL ───────────────────────────────────────────────────
async function guardarPerfil() {
    const user = auth.currentUser; if (!user) return;
    const nom = document.getElementById('perfil-input-nom').value.trim();
    const cognom = document.getElementById('perfil-input-cognom').value.trim();
    const telefon = document.getElementById('perfil-input-telefon').value.trim();
    const localitat = document.getElementById('perfil-input-localitat').value.trim();
    const alertEl = document.getElementById('perfil-alert');

    if (!nom || !localitat) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Nom i localitat són obligatoris.';
        alertEl.classList.remove('hidden');
        return;
    }
    try {
        await db.collection('usuaris').doc(user.uid).update({ nom, cognom, localitat, telefon: telefon || null });
        await user.updateProfile({ displayName: nom });
        document.getElementById('perfil-nom').textContent = nom + ' ' + cognom;
        const ini = nom.slice(0, 2).toUpperCase();
        if (!document.getElementById('perfil-avatar').querySelector('img')) {
            document.getElementById('nav-avatar-btn').textContent = ini;
            document.getElementById('perfil-avatar').textContent = ini;
        }
        alertEl.className = 'alert alert-success';
        alertEl.textContent = 'Perfil actualitzat!';
        alertEl.classList.remove('hidden');
        setTimeout(() => alertEl.classList.add('hidden'), 3000);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
    }
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
        document.getElementById('perfil-avatar').innerHTML = `<img src="${url}" alt="foto perfil">`;
        document.getElementById('nav-avatar-btn').innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        alertEl.className = 'alert alert-success';
        alertEl.textContent = 'Foto actualitzada!';
        setTimeout(() => alertEl.classList.add('hidden'), 3000);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
    }
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

    const anuncisSnap = await db.collection('anuncis')
        .where('usuari_id', '==', uid)
        .where('estat_anunci', '==', 'disponible')
        .get();

    const anuncisHtml = anuncisSnap.empty
        ? '<p style="color:var(--text-muted);font-size:14px">Cap anunci actiu.</p>'
        : anuncisSnap.docs.map(d => {
            const a = d.data();
            return `<div class="card" onclick="veureDeta('${d.id}')">
                <div class="card-img">${(a.imatge && a.imatge[0]) ? `<img src="${a.imatge[0]}" onerror="this.parentElement.innerHTML='📦'">` : '📦'}</div>
                <div class="card-body"><div class="card-title">${a.titol}</div><div class="card-desc">${a.descripcio}</div></div>
            </div>`;
        }).join('');

    content.innerHTML = `
        <div class="perfil-header">
            <div style="width:72px;height:72px;border-radius:50%;background:var(--green-dark);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0">
                ${u.foto ? `<img src="${u.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : ini}
            </div>
            <div class="perfil-info">
                <h2>${(u.nom || '') + ' ' + (u.cognom || '')}</h2>
                <p>📍 ${u.localitat || '—'}</p>
                <div class="perfil-stats">
                    <div><div class="perfil-stat-num">${u.intercanvis_real || 0}</div><div class="perfil-stat-label">Intercanvis</div></div>
                    <div><div class="perfil-stat-num">${u.valoracio_mitjana || '—'}</div><div class="perfil-stat-label">Valoració</div></div>
                </div>
            </div>
        </div>
        ${auth.currentUser && auth.currentUser.uid !== uid
            ? `<button class="btn btn-outline" style="margin-top:12px;margin-bottom:16px" onclick="iniciarXatDirecte('${uid}')">✉ Enviar missatge</button>`
            : ''}
        <div class="perfil-form-card">
            <h3>Anuncis actius</h3>
            <div class="grid-3">${anuncisHtml}</div>
        </div>`;
}