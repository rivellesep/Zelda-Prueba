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
            if (d[`eliminat_per_${user.uid}`]) return;
            const altreUid = d.id_emissor === user.uid ? d.id_receptor : d.id_emissor;
            const key = altreUid + '_' + (d.anunci_referencia || 'general');
            const ts = d.data_enviament?.toMillis?.() || 0;
            if (!convMap[key] || ts > convMap[key].ts) {
                convMap[key] = {
                    altreUid, anunciId: d.anunci_referencia, lastMsg: d.contingut, ts,
                    noLlegit: (!d.llegit && d.id_receptor === user.uid) ? 1 : 0
                };
            }
        });

        const convList = Object.values(convMap).sort((a, b) => b.ts - a.ts);

        if (!convList.length) {
            listEl.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-muted)">No tens missatges encara.</p>';
            return;
        }

        listEl.innerHTML = '';
        for (const conv of convList) {
            let nom = 'Usuari', ini = '?', titolProducte = 'Producte';
            try {
                const [uDoc, aDoc] = await Promise.all([
                    db.collection('usuaris').doc(conv.altreUid).get(),
                    conv.anunciId ? db.collection('anuncis').doc(conv.anunciId).get() : Promise.resolve(null)
                ]);
                if (uDoc.exists) {
                    const ud = uDoc.data();
                    nom = ((ud.nom || '') + ' ' + (ud.cognom || '')).trim();
                    ini = ud.foto
                        ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                        : (ud.nom || '?').slice(0, 2).toUpperCase();
                }
                if (aDoc && aDoc.exists) titolProducte = aDoc.data().titol || 'Producte';
            } catch (e) { }

            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `
                <div class="avatar-sm">${ini}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${titolProducte}</div>
                    <div class="chat-item-msg">${conv.lastMsg || ''}</div>
                </div>
                ${conv.noLlegit ? `<div class="chat-unread">${conv.noLlegit}</div>` : ''}
                <button class="btn-delete-chat" onclick="event.stopPropagation();eliminarChat('${conv.altreUid}','${conv.anunciId}')" title="Eliminar conversa">
                    <img src="./images/eliminar.png" alt="Eliminar">
                </button>`;
            item.onclick = () => {
                document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                obrirConversacio(conv.altreUid, nom, ini, conv.anunciId);
            };
            listEl.appendChild(item);
        }
    } catch (e) {
        listEl.innerHTML = '<p style="padding:16px;font-size:13px;color:var(--text-muted)">Error carregant missatges.</p>';
        console.error(e);
    }
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

    unsubChat = db.collection('missatges')
        .where('anunci_referencia', '==', anunciId)
        .orderBy('data_enviament', 'asc')
        .onSnapshot(async snap => {
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
                                <button class="btn btn-primary btn-sm" onclick="acceptarProposta('${m.anunci_referencia}','${m.oferta_id}','${m.id_emissor}')">Acceptar</button>
                                <button class="btn btn-outline btn-sm" onclick="rebutjarProposta('${m.anunci_referencia}','${m.oferta_id}','${m.id_emissor}')">Rebutjar</button>
                            </div>` : `<div style="font-size:12px;margin-top:6px;color:var(--text-muted)">${estatLabel}</div>`}
                    </div>`;
                }

                return `<div class="msg ${sent ? 'msg-sent' : 'msg-recv'}">
                    <div class="msg-text">${m.contingut}</div>
                    <div class="msg-time">${hora}${sent ? (m.llegit ? ' ✓✓' : ' ✓') : ''}</div>
                </div>`;
            }).join('');

            el.scrollTop = el.scrollHeight;

            const noLlegits = snap.docs.filter(doc => doc.data().id_receptor === user.uid && !doc.data().llegit);
            if (noLlegits.length > 0) {
                await Promise.all(noLlegits.map(doc => doc.ref.update({ llegit: true })));
            }
        });
}

async function sendMsg() {
    const user = auth.currentUser;
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text || !user || !chatActual) return;
    input.value = '';
    input.style.height = 'auto';
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

async function iniciarXat(anunciId, propietariUid) {
    const user = auth.currentUser; if (!user) return navigate('login');
    if (user.uid === propietariUid) return alert('No et pots enviar missatges a tu mateix.');
    navigate('chats', false);
    await carregarChats();
    let nom = 'Usuari', ini = '?';
    try {
        const uDoc = await db.collection('usuaris').doc(propietariUid).get();
        if (uDoc.exists) {
            const ud = uDoc.data();
            nom = ((ud.nom || '') + ' ' + (ud.cognom || '')).trim();
            ini = ud.foto
                ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : (ud.nom || '?').slice(0, 2).toUpperCase();
        }
    } catch (e) { }
    obrirConversacio(propietariUid, nom, ini, anunciId);
}

async function iniciarXatDirecte(uid) {
    navigate('chats', false);
    await carregarChats();
    let nom = 'Usuari', ini = '?';
    try {
        const uDoc = await db.collection('usuaris').doc(uid).get();
        if (uDoc.exists) {
            const ud = uDoc.data();
            nom = ((ud.nom || '') + ' ' + (ud.cognom || '')).trim();
            ini = ud.foto
                ? `<img src="${ud.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : (ud.nom || '?').slice(0, 2).toUpperCase();
        }
    } catch (e) { }
    obrirConversacio(uid, nom, ini, 'general_' + uid);
}

async function eliminarChat(altreUid, anunciId) {
    const user = auth.currentUser; if (!user) return;
    if (!confirm('Segur que vols eliminar aquesta conversa?')) return;
    try {
        const [emisSnap, recSnap] = await Promise.all([
            db.collection('missatges').where('id_emissor', '==', user.uid).where('id_receptor', '==', altreUid).where('anunci_referencia', '==', anunciId).get(),
            db.collection('missatges').where('id_emissor', '==', altreUid).where('id_receptor', '==', user.uid).where('anunci_referencia', '==', anunciId).get()
        ]);

        const batch = db.batch();
        [...emisSnap.docs, ...recSnap.docs].forEach(doc => {
            batch.update(doc.ref, { [`eliminat_per_${user.uid}`]: true });
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
    } catch (e) { alert('Error eliminant el xat: ' + e.message); }
}