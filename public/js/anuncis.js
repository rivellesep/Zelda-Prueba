let filtreActiu = 'tots', cercaActiva = '', totsAnuncis = [];

// ── LLISTAR ──────────────────────────────────────────────────
async function renderAnuncis() {
    const grid = document.getElementById('anuncis-grid'); if (!grid) return;
    grid.innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('anuncis')
            .where('estat_anunci', 'in', ['disponible', 'reservat'])
            .orderBy('data_creacio', 'desc')
            .get();

        totsAnuncis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const uids = [...new Set(totsAnuncis.map(a => a.usuari_id).filter(Boolean))];

        await Promise.all(uids.map(async uid => {
            try {
                const uDoc = await db.collection('usuaris').doc(uid).get();
                if (uDoc.exists) {
                    const ud = uDoc.data();
                    totsAnuncis = totsAnuncis.map(a => a.usuari_id === uid
                        ? { ...a, _nom: ud.nom, _loc: ud.localitat, _ini: (ud.nom || '?').slice(0, 2).toUpperCase(), _foto: ud.foto || '' }
                        : a);
                }
            } catch (e) { }
        }));

        mostrarAnuncis();
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;grid-column:1/-1">Error carregant anuncis.</p>';
        console.error(e);
    }
}

function mostrarAnuncis() {
    const grid = document.getElementById('anuncis-grid'); if (!grid) return;
    const modLabel = { intercanvi: 'Intercanvi', punts: 'Punts' };
    let llista = [...totsAnuncis];

    if (filtreActiu !== 'tots')
        llista = llista.filter(a => a.categoria === filtreActiu || a.modalitat === filtreActiu);
    if (cercaActiva) {
        const q = cercaActiva.toLowerCase();
        llista = llista.filter(a =>
            (a.titol || '').toLowerCase().includes(q) ||
            (a.descripcio || '').toLowerCase().includes(q));
    }

    document.getElementById('anuncis-count').textContent =
        llista.length + ' anunci' + (llista.length !== 1 ? 's' : '') +
        ' disponible' + (llista.length !== 1 ? 's' : '');

    if (!llista.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:20px;grid-column:1/-1">No s\'han trobat anuncis.</p>';
        return;
    }

    const getPuntsLabel = a => a.modalitat === 'punts'
        ? (a.ecopoints || 0) + ' pts'
        : a.modalitat === 'donacio' ? 'Gratis' : 'Intercanvi';

    grid.innerHTML = llista.map(a => `
        <div class="card" onclick="veureDeta('${a.id}')">
            <div class="card-img" style="position:relative">
                ${(a.imatge && a.imatge[0])
                    ? `<img src="${a.imatge[0]}" alt="${a.titol}" onerror="this.parentElement.innerHTML='📦'">`
                    : '📦'}
                ${a.estat_anunci === 'reservat'
                    ? `<div style="position:absolute;top:8px;right:8px;background:#E65100;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:.5px">⏳ Reservat</div>`
                    : ''}
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
                        <div class="avatar-sm">${a._foto
                            ? `<img src="${a._foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                            : (a._ini || '?')}</div>
                        <span style="font-size:12px;color:var(--text-muted)">${a._nom || 'Usuari'}</span>
                    </div>
                    <span class="card-points">${getPuntsLabel(a)}</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:6px">📍 ${a._loc || ''}</div>
            </div>
        </div>`).join('');
}

function cercarAnuncis() {
    cercaActiva = document.getElementById('search-input').value.trim();
    mostrarAnuncis();
}

document.getElementById('search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') cercarAnuncis();
});

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filtreActiu = chip.dataset.filter || 'tots';
        mostrarAnuncis();
    });
});

// ── DETALL ───────────────────────────────────────────────────
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

        let nomProp = 'Usuari', locProp = '', iniProp = '?';
        try {
            const uDoc = await db.collection('usuaris').doc(a.usuari_id).get();
            if (uDoc.exists) {
                const ud = uDoc.data();
                nomProp = (ud.nom || '') + ' ' + (ud.cognom || '');
                locProp = ud.localitat || '';
                iniProp = ud.foto
                    ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                    : (ud.nom || '?').slice(0, 2).toUpperCase();
            }
        } catch (e) { }

        const esProp = user && user.uid === a.usuari_id;
        const esLogat = !!user;
        const puntsLabel = a.modalitat === 'punts' ? (a.ecopoints || 0) + ' pts' : 'Intercanvi';

        let potValorar = false;
        if (user && a.estat_anunci === 'completat') {
            if (user.uid === a.comprador_id || user.uid === a.usuari_id) potValorar = true;
        }

        const valsHtml = valsSnap.empty
            ? '<p style="color:var(--text-muted);font-size:14px">Encara no hi ha valoracions.</p>'
            : valsSnap.docs.map(v => {
                const vd = v.data();
                return `<div class="valoracio-card">
                    <div class="stars">${'★'.repeat(vd.estrelles || 0)}${'☆'.repeat(5 - (vd.estrelles || 0))}</div>
                    <p style="font-size:14px;margin-top:6px">${vd.comentari || ''}</p>
                </div>`;
            }).join('');

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
                    <button class="btn btn-primary" onclick="obrirModalCompra('${a.id}','${a.titol.replace(/'/g, "\\'")}',${a.ecopoints || 0},'${a.usuari_id}')">🛒 Comprar ara</button>
                </div>
            </div>`;
        }

        const reservarBtn = (a.modalitat === 'intercanvi' && a.estat_anunci === 'disponible' && esLogat && !esProp)
            ? `<button class="btn btn-warning" onclick="seleccionarOferta('${a.id}','${a.usuari_id}')">🔁 Proposar intercanvi</button>`
            : '';
        const entregaBtn = (esProp && a.estat_anunci === 'reservat')
            ? `<button class="btn btn-primary" onclick="obrirModalEntrega('${a.id}','${a.comprador_id || ''}')">📦 Confirmar entrega</button>`
            : '';
        const cancelBtn = (a.estat_anunci === 'reservat' && user && (user.uid === a.comprador_id || esProp))
            ? `<button class="btn btn-outline" onclick="cancellarReserva('${a.id}')">✕ Cancel·lar reserva</button>`
            : '';

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
                    <div class="avatar-lg" style="width:44px;height:44px;font-size:16px;cursor:pointer"
                        onclick="${esProp ? 'navegarAPerfil()' : `veurePerfil('${a.usuari_id}')`}">${iniProp}</div>
                    <div>
                        <div class="detall-user-name" style="cursor:pointer"
                            onclick="${esProp ? 'navegarAPerfil()' : `veurePerfil('${a.usuari_id}')`}">${nomProp}</div>
                        <div class="detall-user-loc">📍 ${locProp}</div>
                    </div>
                </div>
                ${compraBox}
                <div class="detall-actions">
                    ${reservarBtn}
                    ${entregaBtn}
                    ${cancelBtn}
                    ${esLogat && !esProp && a.estat_anunci !== 'completat'
                        ? `<button class="btn btn-outline" onclick="iniciarXat('${a.id}','${a.usuari_id}')">✉ Enviar missatge</button>`
                        : ''}
                    ${potValorar
                        ? `<button class="btn btn-outline" onclick="obrirModalValoracio('${a.id}','${a.usuari_id}')">⭐ Valorar</button>`
                        : ''}
                    ${esProp && a.estat_anunci === 'disponible' ? `
                        <button class="btn btn-outline btn-sm" onclick="obrirModalEditar('${a.id}')">✏ Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarAnunci('${a.id}')">Eliminar anunci</button>`
                        : ''}
                </div>
                <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Valoracions (${valsSnap.size})</h3>
                ${valsHtml}
            </div>
        </div>`;

        // Saldo en temps real
        if (user) {
            db.collection('usuaris').doc(user.uid).get().then(d => {
                const el = document.getElementById('saldo-live');
                if (el && d.exists) {
                    const data = d.data();
                    el.textContent = (data.punts || 0) - (data.punts_bloquejats || 0);
                }
            });
        }

        indexCarrusel = 0;
    } catch (e) {
        content.innerHTML = '<p style="color:var(--text-muted)">Error carregant l\'anunci.</p>';
        console.error(e);
    }
}

async function eliminarAnunci(id) {
    if (!confirm('Segur que vols eliminar aquest anunci?')) return;
    try {
        await db.collection('anuncis').doc(id).update({ estat_anunci: 'completat' });
        renderAnuncis();
        historialNavegacio = [];
        navigate('explorar', false);
    } catch (e) { alert('Error: ' + e.message); }
}

// ── PUBLICAR ─────────────────────────────────────────────────
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
    if (modalitat === 'intercanvi') punts = 0;
    const estatProd = document.getElementById('anunci-estat-prod').value;
    const alertEl = document.getElementById('modal-alert');
    const btn = document.getElementById('btn-publicar');

    if (!titol || !desc) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'El títol i la descripció són obligatoris.';
        alertEl.classList.remove('hidden');
        return;
    }
    if (punts < 0) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Els ecopoints no poden ser negatius.';
        alertEl.classList.remove('hidden');
        return;
    }

    btn.textContent = 'Publicant...'; btn.disabled = true;

    const urls = [];
    for (const file of imatgesModal) {
        try { urls.push(await pujarImgBB(file)); } catch (e) { console.warn('Error pujant imatge:', e); }
    }

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
        imatgesModal = [];
        document.getElementById('preview-grid-modal').innerHTML = '';
        document.getElementById('anunci-imatges-modal').value = '';
        renderAnuncis();
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
    }

    btn.textContent = 'Publicar'; btn.disabled = false;
}

// ── EDITAR ───────────────────────────────────────────────────
let imatgesEditar = [];
let imatgesEditarExistents = [];

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
            titol, descripcio: desc,
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

// ── IMATGES ──────────────────────────────────────────────────
let imatgesModal = [];

function previewImatgesModal(input) {
    // ✅ CORRECCIÓ: accepta tant un input real com un array directe
    imatgesModal = [...(input.files || input)].slice(0, 5);
    const grid = document.getElementById('preview-grid-modal');
    grid.innerHTML = '';
    imatgesModal.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        grid.innerHTML += `<div class="img-preview-item"><img src="${url}"><button class="remove-img" onclick="eliminarPreviewModal(${i})">✕</button></div>`;
    });
}

function eliminarPreviewModal(i) {
    imatgesModal.splice(i, 1);
    const grid = document.getElementById('preview-grid-modal');
    grid.innerHTML = '';
    imatgesModal.forEach((file, j) => {
        const url = URL.createObjectURL(file);
        grid.innerHTML += `<div class="img-preview-item"><img src="${url}"><button class="remove-img" onclick="eliminarPreviewModal(${j})">✕</button></div>`;
    });
}

function previewImatgesEditar(input) {
    imatgesEditar = [...(input.files || input)].slice(0, 5 - imatgesEditarExistents.length);
    const grid = document.getElementById('editar-preview-grid');
    grid.innerHTML = '';
    imatgesEditar.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        grid.innerHTML += `<div class="img-preview-item"><img src="${url}"><button class="remove-img" onclick="eliminarPreviewEditar(${i})">✕</button></div>`;
    });
}

function eliminarPreviewEditar(i) {
    imatgesEditar.splice(i, 1);
    previewImatgesEditar(imatgesEditar);
}

function eliminarImatgeExistent(i) {
    imatgesEditarExistents.splice(i, 1);
    renderImatgesExistents();
}

function renderImatgesExistents() {
    document.getElementById('editar-imatges-actuals').innerHTML =
        imatgesEditarExistents.map((url, i) => `
        <div class="img-preview-item">
            <img src="${url}">
            <button class="remove-img" onclick="eliminarImatgeExistent(${i})">✕</button>
        </div>`).join('');
}

// ── CARRUSEL ─────────────────────────────────────────────────
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

// ── MEUS ANUNCIS (perfil) ────────────────────────────────────
async function carregarMeusAnuncis() {
    const user = auth.currentUser; if (!user) return;
    const grid = document.getElementById('meus-anuncis-grid');
    grid.innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>Carregant...</div>';
    try {
        const snap = await db.collection('anuncis')
            .where('usuari_id', '==', user.uid)
            .orderBy('data_creacio', 'desc')
            .get();

        if (snap.empty) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px;grid-column:1/-1">Encara no has publicat cap anunci.</p>';
            return;
        }

        const modLabel = { intercanvi: 'Intercanvi', punts: 'Punts' };
        grid.innerHTML = snap.docs.map(d => {
            const a = d.data();
            const estatClass = a.estat_anunci === 'reservat' ? 'tag-reservat'
                : a.estat_anunci === 'completat' ? 'tag-completat' : 'tag-estat';
            return `<div class="card" onclick="veureDeta('${d.id}')">
                <div class="card-img">
                    ${(a.imatge && a.imatge[0])
                        ? `<img src="${a.imatge[0]}" alt="${a.titol}" onerror="this.parentElement.innerHTML='📦'">`
                        : '📦'}
                    ${a.estat_anunci === 'reservat' ? '<div class="card-img-badge">Reservat</div>' : ''}
                </div>
                <div class="card-body">
                    <div style="display:flex;gap:6px;margin-bottom:8px">
                        <span class="tag tag-${a.modalitat}">${modLabel[a.modalitat] || a.modalitat}</span>
                        <span class="tag ${estatClass}">${a.estat_anunci}</span>
                    </div>
                    <div class="card-title">${a.titol}</div>
                    <div class="card-desc">${a.descripcio}</div>
                    ${a.estat_anunci === 'reservat'
                        ? `<div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();obrirModalEntrega('${d.id}','${a.comprador_id || ''}')">📦 Confirmar entrega</button></div>`
                        : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:14px">Error carregant.</p>';
    }
}