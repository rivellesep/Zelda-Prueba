// ── CONTACTE ─────────────────────────────────────────────────
emailjs.init('kiFREBpYUFWgQaOAz');

function enviarContacte() {
    const nom = document.getElementById('c-nom').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const assumpte = document.getElementById('c-assumpte').value;
    const missatge = document.getElementById('c-missatge').value.trim();
    const alertEl = document.getElementById('contacte-alert');
    const btn = document.getElementById('btn-contacte');

    if (!nom || !email || !missatge) {
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Omple tots els camps.';
        alertEl.classList.remove('hidden');
        return;
    }

    btn.textContent = 'Enviant...'; btn.disabled = true;
    emailjs.send('service_drvu5mg', 'service_venzcal', { name: nom, email, title: assumpte, message: missatge })
        .then(() => {
            alertEl.className = 'alert alert-success';
            alertEl.textContent = 'Missatge enviat correctament! ✅';
            alertEl.classList.remove('hidden');
            document.getElementById('c-nom').value = '';
            document.getElementById('c-email').value = '';
            document.getElementById('c-missatge').value = '';
            btn.textContent = 'Enviar missatge'; btn.disabled = false;
        })
        .catch(err => {
            console.error('EmailJS error:', err);
            alertEl.className = 'alert alert-error';
            alertEl.textContent = 'Error enviant. Torna-ho a intentar.';
            alertEl.classList.remove('hidden');
            btn.textContent = 'Enviar missatge'; btn.disabled = false;
        });
}

// ── MODAL LEGAL ──────────────────────────────────────────────
const LEGAL_CONTENT = {
    privacitat: {
        titol: 'Política de Privacitat',
        contingut: `
            <h4>1. Responsable del tractament</h4>
            <p>Zelva, S.L. és responsable del tractament de les dades personals dels usuaris de la plataforma.</p>

            <h4>2. Dades que recollim</h4>
            <p>Recollim les dades que tu mateix ens proporciones en registrar-te: nom, cognoms, correu electrònic, localitat i, opcionalment, telèfon i foto de perfil. També registrem l'activitat de la plataforma (anuncis publicats, intercanvis realitzats).</p>

            <h4>3. Finalitat del tractament</h4>
            <p>Les teves dades s'utilitzen exclusivament per gestionar el teu compte, facilitar els intercanvis entre usuaris i millorar el servei. No les venem ni les cedim a tercers amb fins comercials.</p>

            <h4>4. Base legal</h4>
            <p>El tractament es basa en el consentiment que ens dones en registrar-te i en l'execució del contracte de servei acceptat en crear el compte.</p>

            <h4>5. Conservació de dades</h4>
            <p>Les teves dades es conserven mentre mantinguis el compte actiu. Pots sol·licitar la supressió en qualsevol moment contactant-nos.</p>

            <h4>6. Drets de l'usuari</h4>
            <p>Tens dret a accedir, rectificar, suprimir, oposar-te i limitar el tractament de les teves dades. Exercita'ls escrivint a <strong>zelva.marketplace@gmail.com</strong>.</p>

            <h4>7. Seguretat</h4>
            <p>Utilitzem Firebase (Google) com a infraestructura, que compleix amb les normatives de seguretat i protecció de dades de la UE (RGPD).</p>

            <h4>8. Contacte</h4>
            <p>Per a qualsevol consulta sobre privacitat: <strong>zelva.marketplace@gmail.com</strong></p>
        `
    },
    termes: {
        titol: "Termes d'Ús",
        contingut: `
            <h4>1. Objecte</h4>
            <p>Zelva és una plataforma d'intercanvi sostenible que permet als usuaris donar, intercanviar o cedir objectes de segona mà. L'ús de la plataforma implica l'acceptació d'aquests termes.</p>

            <h4>2. Registre i compte</h4>
            <p>Per publicar anuncis o iniciar intercanvis cal registrar-se amb dades verídiques. Cada persona pot tenir un únic compte. Ets responsable de mantenir la confidencialitat de la teva contrasenya.</p>

            <h4>3. Ús acceptable</h4>
            <p>Queda prohibit publicar anuncis de productes il·legals, falsificar informació, assetjar altres usuaris o usar la plataforma amb fins comercials o lucratius.</p>

            <h4>4. EcoPoints</h4>
            <p>Els EcoPoints són una moneda virtual interna sense valor econòmic real. No es poden canviar per diners ni transferir fora de la plataforma. Zelva es reserva el dret de modificar-ne el funcionament.</p>

            <h4>5. Responsabilitat dels intercanvis</h4>
            <p>Zelva actua com a intermediari i no és responsable de l'estat dels productes intercanviats, ni de possibles incompliments entre usuaris. Els intercanvis es realitzen sota la responsabilitat de les parts implicades.</p>

            <h4>6. Contingut dels anuncis</h4>
            <p>Els usuaris són responsables del contingut que publiquen. Zelva es reserva el dret d'eliminar anuncis que incompleixin les normes de la comunitat.</p>

            <h4>7. Suspensió de comptes</h4>
            <p>Zelva pot suspendre o eliminar comptes que incompleixin aquests termes, sense necessitat de notificació prèvia en casos greus.</p>

            <h4>8. Modificacions</h4>
            <p>Zelva pot modificar aquests termes en qualsevol moment. Els canvis es notificaran als usuaris i l'ús continuat de la plataforma implica l'acceptació dels nous termes.</p>

            <h4>9. Legislació aplicable</h4>
            <p>Aquests termes es regeixen per la legislació espanyola i catalana vigent. Per a qualsevol disputa, les parts se sotmeten als jutjats i tribunals de Catalunya.</p>
        `
    }
};

function obrirModalLegal(tipus) {
    const contingut = LEGAL_CONTENT[tipus];
    if (!contingut) return;

    // Crea el modal si no existeix, o reutilitza'l
    let modal = document.getElementById('modal-legal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-legal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:620px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                    <h3 id="modal-legal-titol" style="margin-bottom:0"></h3>
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('modal-legal').classList.add('hidden')">✕ Tancar</button>
                </div>
                <div id="modal-legal-contingut" style="font-size:14px;color:var(--text-muted);line-height:1.8"></div>
            </div>`;
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.add('hidden');
        });
        document.body.appendChild(modal);

        // Estils per al contingut del modal legal
        const style = document.createElement('style');
        style.textContent = `
            #modal-legal-contingut h4 {
                color: var(--text);
                font-size: 14px;
                font-weight: 600;
                margin: 18px 0 6px;
            }
            #modal-legal-contingut h4:first-child { margin-top: 0; }
            #modal-legal-contingut p {
                margin-bottom: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    document.getElementById('modal-legal-titol').textContent = contingut.titol;
    document.getElementById('modal-legal-contingut').innerHTML = contingut.contingut;
    modal.classList.remove('hidden');
}