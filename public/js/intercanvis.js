let compraPendent = null;
let ofertaContext = null;

// ── COMPRA AMB PUNTS ─────────────────────────────────────────
async function obrirModalCompra(anunciId, titol, preu, venedorId) {
    const user = auth.currentUser; if (!user) return navigate('login');
    compraPendent = { anunciId, titol, preu, venedorId };

    document.getElementById('compra-alert').classList.add('hidden');
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
        <div class="modal-compra-row"><span class="label">Saldo després</span><span class="valor ${tensSuficients ? 'final' : 'negatiu'}">${saldoFinal} pts</span></div>`;

    if (!tensSuficients) {
        const alertEl = document.getElementById('compra-alert');
        alertEl.className = 'alert alert-error';
        alertEl.textContent = `No tens prou EcoPoints disponibles. Necessites ${preu} pts però tens ${disponibles} pts disponibles${bloquejats > 0 ? ` (${bloquejats} bloquejats en altres compres pendents)` : ''}.`;
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
        batch.update(db.collection('usuaris').doc(user.uid), { punts_bloquejats: INC(preu) });
        batch.update(db.collection('anuncis').doc(anunciId), {
            estat_anunci: 'reservat', comprador_id: user.uid, data_reserva: TS()
        });
        await batch.commit();

        await db.collection('missatges').add({
            contingut: `🛒 He comprat "${titol}" per ${preu} EcoPoints. Estem pendents que confirmis l'entrega!`,
            anunci_referencia: anunciId, id_emissor: user.uid, id_receptor: venedorId,
            entregat: true, llegit: false, data_enviament: TS(), tipus: 'sistema'
        });

        await db.collection('transaccions').add({
            usuari_id: user.uid, tipus: 'compra', estat: 'pendent',
            anunci_id: anunciId, anunci_titol: titol, punts: -preu,
            contrapart_id: venedorId, data: TS()
        });

        document.getElementById('modal-compra').classList.add('hidden');
        btn.textContent = '✓ Confirmar compra'; btn.disabled = false;
        compraPendent = null;

        const uDocNou = await db.collection('usuaris').doc(user.uid).get();
        if (uDocNou.exists) {
            const d = uDocNou.data();
            document.getElementById('nav-points').textContent = (d.punts || 0) - (d.punts_bloquejats || 0);
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

// ── INTERCANVI ───────────────────────────────────────────────
async function seleccionarOferta(anunciId, venedorId) {
    const user = auth.currentUser; if (!user) return navigate('login');
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
        <div class="card" id="oferta-card-${doc.id}" onclick="triarOferta('${doc.id}','${a.titol.replace(/'/g, "\\'")}')">
            <div class="card-img">${(a.imatge && a.imatge[0]) ? `<img src="${a.imatge[0]}">` : '📦'}</div>
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
    if (card) { card.style.borderColor = '#4CAF50'; card.style.background = 'rgba(26,92,82,0.15)'; }

    ofertaContext.ofertaId = ofertaId;
    ofertaContext.ofertaTitol = ofertaTitol;

    let confirmBtn = document.getElementById('btn-confirmar-oferta');
    if (!confirmBtn) {
        confirmBtn = document.createElement('button');
        confirmBtn.id = 'btn-confirmar-oferta';
        confirmBtn.className = 'btn btn-primary';
        document.getElementById('oferta-accions').prepend(confirmBtn);
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
    if (!ofertaContext) return alert('Error: no hi ha context d\'oferta.');
    const { anunciId, venedorId } = ofertaContext;
    if (!anunciId || !venedorId) return alert('Error: falten dades.');
    try {
        await crearIntercanvi(anunciId, venedorId, ofertaId, ofertaTitol);
        tancarModalOferta();
    } catch (e) {
        alert('Error enviant la proposta: ' + e.message);
    }
}

async function crearIntercanvi(anunciId, venedorId, ofertaId, ofertaTitol) {
    const user = auth.currentUser; if (!user) { navigate('login'); return; }
    const anunciDoc = await db.collection('anuncis').doc(anunciId).get();
    if (!anunciDoc.exists) { alert('Anunci no trobat.'); return; }
    const a = anunciDoc.data();

    await db.collection('propostes').add({
        anunci_id: anunciId, venedor_id: venedorId,
        comprador_id: user.uid, oferta_id: ofertaId,
        oferta_titol: ofertaTitol, estat: 'pendent', data: TS()
    });

    await db.collection('missatges').add({
        contingut: `🔁 Proposta d'intercanvi: "${ofertaTitol}" per "${a.titol}"`,
        anunci_referencia: anunciId, id_emissor: user.uid, id_receptor: venedorId,
        tipus: 'proposta', proposta_estat: 'pendent',
        oferta_id: ofertaId, data_enviament: TS(), llegit: false
    });

    alert('📨 Proposta enviada!');
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
        estat_anunci: 'reservat', comprador_id: compradorId, oferta_acceptada: ofertaId
    });
    batch.update(db.collection('anuncis').doc(ofertaId), {
        estat_anunci: 'completat', comprador_id: user.uid, data_completat: TS()
    });
    await batch.commit();

    await Promise.all([
        db.collection('transaccions').add({
            usuari_id: user.uid, tipus: 'intercanvi_acceptat',
            anunci_id: anunciId, anunci_titol: a.titol || 'Anunci',
            anunci_obtingut_id: ofertaId, anunci_obtingut_titol: ofertaTitol,
            punts: 0, contrapart_id: compradorId, data: TS()
        }),
        db.collection('transaccions').add({
            usuari_id: compradorId, tipus: 'intercanvi_acceptat',
            anunci_id: ofertaId, anunci_titol: ofertaTitol,
            anunci_obtingut_id: anunciId, anunci_obtingut_titol: a.titol || 'Anunci',
            punts: 0, contrapart_id: user.uid, data: TS()
        }),
        db.collection('missatges').add({
            contingut: '✅ Proposta acceptada! Parleu pel xat per quedar.',
            anunci_referencia: anunciId, id_emissor: user.uid, id_receptor: compradorId,
            tipus: 'sistema', data_enviament: TS(), llegit: false
        })
    ]);

    alert('Intercanvi acceptat!');
    veureDeta(anunciId);
}

async function rebutjarProposta(anunciId, ofertaId, compradorId) {
    const user = auth.currentUser;
    const snap = await db.collection('missatges')
        .where('anunci_referencia', '==', anunciId)
        .where('oferta_id', '==', ofertaId)
        .where('tipus', '==', 'proposta')
        .get();

    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { proposta_estat: 'rebutjada' }));
    await batch.commit();

    const propostes = await db.collection('propostes')
        .where('anunci_id', '==', anunciId)
        .where('oferta_id', '==', ofertaId)
        .get();
    const batch2 = db.batch();
    propostes.docs.forEach(doc => batch2.update(doc.ref, { estat: 'rebutjada' }));
    await batch2.commit();

    await db.collection('missatges').add({
        contingut: 'Proposta rebutjada.',
        anunci_referencia: anunciId, id_emissor: user.uid, id_receptor: compradorId,
        tipus: 'sistema', data_enviament: TS(), llegit: false
    });

    alert('Proposta rebutjada.');
}

// ── ENTREGA ──────────────────────────────────────────────────
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
                punts: INC(a.ecopoints), intercanvis_real: INC(1)
            });
            if (compradorId) {
                batch.update(db.collection('usuaris').doc(compradorId), {
                    punts: INC(-a.ecopoints), punts_bloquejats: INC(-a.ecopoints)
                });
            }
        } else {
            batch.update(db.collection('usuaris').doc(user.uid), { intercanvis_real: INC(1) });
        }

        if (compradorId) {
            batch.update(db.collection('usuaris').doc(compradorId), { intercanvis_real: INC(1) });
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
            contingut: "L'entrega ha estat confirmada! L'intercanvi s'ha completat correctament. Gràcies!",
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

        alert("Entrega confirmada! L'intercanvi s'ha completat.");
        veureDeta(anunciId);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
        btn.textContent = '✓ Sí, he entregat'; btn.disabled = false;
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
                document.getElementById('nav-points').textContent = (d.punts || 0) - (d.punts_bloquejats || 0);
            }
        }

        alert('La reserva ha estat cancel·lada.');
        veureDeta(anunciId);
    } catch (e) { alert('Error: ' + e.message); }
}

// ── VALORACIONS ──────────────────────────────────────────────
function obrirModalValoracio(anunciId, valoratUid) {
    if (!auth.currentUser) return navigate('login');
    document.getElementById('val-anunci-id').value = anunciId;
    document.getElementById('val-valorat-id').value = valoratUid;
    document.getElementById('val-alert').classList.add('hidden');
    document.getElementById('modal-valoracio').classList.remove('hidden');
}

async function enviarValoracio() {
    const user = auth.currentUser; if (!user) return;
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

        if (!existing.empty) { alert('Ja has valorat aquest intercanvi.'); return; }

        await db.collection('valoracions').add({
            id_valorat: valoratId, id_redactor: user.uid,
            comentari: comentari || '', estrelles, id_anunci: anunciId, data: TS()
        });

        const vSnap = await db.collection('valoracions').where('id_valorat', '==', valoratId).get();
        const mitja = (vSnap.docs.reduce((acc, d) => acc + (d.data().estrelles || 0), 0) / vSnap.size).toFixed(1);
        await db.collection('usuaris').doc(valoratId).update({ valoracio_mitjana: mitja });

        document.getElementById('modal-valoracio').classList.add('hidden');
        alert('✅ Valoració enviada!');
        veureDeta(anunciId);
    } catch (e) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Error: ' + e.message;
        alertEl.classList.remove('hidden');
    }
}

// ── HISTORIAL ────────────────────────────────────────────────
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
                    nomsMap[uid] = ((ud.nom || '') + ' ' + (ud.cognom || '')).trim();
                }
            } catch (e) { }
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
                <div class="filter-chip active" onclick="filtrarHistorial(this,'tots')">Tots</div>
                <div class="filter-chip" onclick="filtrarHistorial(this,'compra')">🛒 Compres</div>
                <div class="filter-chip" onclick="filtrarHistorial(this,'venda')">💰 Vendes</div>
                <div class="filter-chip" onclick="filtrarHistorial(this,'intercanvi_acceptat')">🔁 Intercanvis</div>
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
                    ${contrapartHtml}${obtingutHtml}
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