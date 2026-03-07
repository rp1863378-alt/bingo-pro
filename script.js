// =======================
// BLOQUE 1 - CONFIGURACIÓN Y FIREBASE
// =======================

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROJECT.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID",
    measurementId: "TU_MEASUREMENT_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =======================
// VARIABLES GLOBALES
// =======================
let numerosCantados = new Set();
let cartones = [];
let jugadores = [];
let pozo = {
    principal: "0",
    linea: "0",
    bingo: "0"
};
let lineaActiva = true;
let bingoActivo = true;
let autoMode = false;
let intervalId = null;

// =======================
// ELEMENTOS DEL DOM
// =======================
const numeroActualEl = document.getElementById("numeroActual");
const bolillasCantadasEl = document.getElementById("bolillasCantadas");
const btnCantarNumero = document.getElementById("btnCantarNumero");

const pozoPrincipalEl = document.getElementById("pozoPrincipal");
const premioLineaEl = document.getElementById("premioLinea");
const premioBingoEl = document.getElementById("premioBingo");

const cardsContainerEl = document.getElementById("cartonesContainer");

// Chat
const chatContainerEl = document.getElementById("chatMensajes");
const chatInputEl = document.getElementById("chatInput");
const enviarMensajeBtn = document.getElementById("enviarMensaje");

// =======================
// FUNCIONES DE UTILIDAD
// =======================

// Generar número aleatorio entre 1 y 75
function generarNumero() {
    if (numerosCantados.size >= 75) return null;
    let num;
    do {
        num = Math.floor(Math.random() * 75) + 1;
    } while (numerosCantados.has(num));
    numerosCantados.add(num);
    return num;
}

// Actualizar la UI del número actual
function actualizarNumeroActual(num) {
    numeroActualEl.textContent = num;
    const span = document.createElement("span");
    span.classList.add("bola");
    span.textContent = num;
    bolillasCantadasEl.appendChild(span);
    // Guardar en Firebase
    db.collection("numeros").add({
        numero: num,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Actualizar pozo
function actualizarPozo() {
    pozoPrincipalEl.textContent = pozo.principal;
    premioLineaEl.textContent = pozo.linea;
    premioBingoEl.textContent = pozo.bingo;
}

// =======================
// EVENTOS
// =======================
btnCantarNumero.addEventListener("click", () => {
    const num = generarNumero();
    if (num !== null) actualizarNumeroActual(num);
});

// =======================
// CHAT
// =======================
function agregarMensaje(usuario, mensaje) {
    const div = document.createElement("div");
    div.classList.add("mensaje");
    div.innerHTML = `<strong>${usuario}:</strong> ${mensaje}`;
    chatContainerEl.appendChild(div);
    chatContainerEl.scrollTop = chatContainerEl.scrollHeight;
    // Guardar en Firebase
    db.collection("chat").add({
        usuario,
        mensaje,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

enviarMensajeBtn.addEventListener("click", () => {
    const texto = chatInputEl.value.trim();
    if (!texto) return;
    agregarMensaje("Jugador", texto);
    chatInputEl.value = "";
});
// =======================
// BLOQUE 2 - CARTONES Y JUEGO
// =======================

// Función para generar un cartón de bingo
function generarCarton() {
    const carton = [];
    const columnas = [
        {inicio: 1, fin: 15},
        {inicio: 16, fin: 30},
        {inicio: 31, fin: 45},
        {inicio: 46, fin: 60},
        {inicio: 61, fin: 75}
    ];

    for (let c = 0; c < 5; c++) {
        let nums = [];
        while (nums.length < 5) {
            const num = Math.floor(Math.random() * (columnas[c].fin - columnas[c].inicio + 1)) + columnas[c].inicio;
            if (!nums.includes(num)) nums.push(num);
        }
        carton.push(nums);
    }

    // Colocar FREE en la columna N, fila 3
    carton[2][2] = "FREE";

    return carton;
}

// Renderizar cartón en HTML
function renderCarton(carton, id) {
    const div = document.createElement("div");
    div.classList.add("carton");
    div.dataset.id = id;

    for (let fila = 0; fila < 5; fila++) {
        const filaDiv = document.createElement("div");
        filaDiv.classList.add("fila");
        for (let col = 0; col < 5; col++) {
            const span = document.createElement("span");
            span.textContent = carton[col][fila];
            filaDiv.appendChild(span);
        }
        div.appendChild(filaDiv);
    }
    cardsContainerEl.appendChild(div);
}

// Comprar nuevo cartón
function comprarCarton() {
    const id = `carton-${Date.now()}`;
    const carton = generarCarton();
    cartones.push({id, carton});
    renderCarton(carton, id);
    // Guardar en Firebase
    db.collection("cartones").doc(id).set({carton});
}

// Activar/Desactivar línea
function toggleLinea() {
    lineaActiva = !lineaActiva;
    db.collection("config").doc("linea").set({activa: lineaActiva});
}

// Activar/Desactivar bingo
function toggleBingo() {
    bingoActivo = !bingoActivo;
    db.collection("config").doc("bingo").set({activa: bingoActivo});
}

// Escuchar cambios de configuración en Firebase
db.collection("config").doc("linea").onSnapshot(doc => {
    if (doc.exists) lineaActiva = doc.data().activa;
});

db.collection("config").doc("bingo").onSnapshot(doc => {
    if (doc.exists) bingoActivo = doc.data().activa;
});

// Evento de botón para pedir cartón
const requestCardBtn = document.getElementById("requestCard");
if (requestCardBtn) {
    requestCardBtn.addEventListener("click", comprarCarton);
}

// Función para marcar número cantado en los cartones
function marcarNumeroCartones(num) {
    cartones.forEach(c => {
        const cartonDiv = document.querySelector(`.carton[data-id="${c.id}"]`);
        if (!cartonDiv) return;
        const spans = cartonDiv.querySelectorAll("span");
        spans.forEach(span => {
            if (span.textContent == num) span.classList.add("marcado");
        });
    });
}

// Actualizar cartones cuando se canta un número
btnCantarNumero.addEventListener("click", () => {
    const num = generarNumero();
    if (num !== null) {
        actualizarNumeroActual(num);
        marcarNumeroCartones(num);
    }
});
// =======================
// BLOQUE 3 - POZO, TEMPORIZADOR Y GANADORES
// =======================

let pozoActual = "$0";
let temporizador = 10;
let intervaloAutomatico = null;

// Elementos del DOM
const jackpotAmountEl = document.getElementById("jackpotAmount");
const countdownTimerEl = document.getElementById("countdownTimer");
const btnNextBall = document.getElementById("nextBall");
const btnAutoMode = document.getElementById("autoMode");
const btnSetJackpot = document.getElementById("setJackpot");

// =======================
// FUNCIONES DE POZO
// =======================

function actualizarPozo(valor) {
    pozoActual = valor;
    jackpotAmountEl.textContent = pozoActual;
    db.collection("config").doc("pozo").set({valor: pozoActual});
}

// Escuchar cambios en Firebase
db.collection("config").doc("pozo").onSnapshot(doc => {
    if (doc.exists) {
        pozoActual = doc.data().valor;
        jackpotAmountEl.textContent = pozoActual;
    }
});

// Evento para actualizar pozo
btnSetJackpot.addEventListener("click", () => {
    const valor = document.getElementById("jackpotInput").value;
    if (valor) actualizarPozo(valor);
});

// =======================
// TEMPORIZADOR
// =======================

function iniciarTemporizador() {
    countdownTimerEl.textContent = temporizador;
    const interval = setInterval(() => {
        temporizador--;
        countdownTimerEl.textContent = temporizador;
        if (temporizador <= 0) {
            clearInterval(interval);
            sacarBolaAutomaticamente();
        }
    }, 1000);
}

// =======================
// MODO AUTOMÁTICO
// =======================

btnAutoMode.addEventListener("click", () => {
    if (intervaloAutomatico) {
        clearInterval(intervaloAutomatico);
        intervaloAutomatico = null;
        btnAutoMode.textContent = "Modo automático";
    } else {
        intervaloAutomatico = setInterval(() => {
            sacarBolaAutomaticamente();
        }, temporizador * 1000);
        btnAutoMode.textContent = "Detener automático";
    }
});

// =======================
// SACAR BOLA
// =======================

function generarNumero() {
    let numero;
    do {
        numero = Math.floor(Math.random() * 75) + 1;
    } while (numerosCantados.includes(numero));
    numerosCantados.push(numero);
    db.collection("numeros").add({numero, timestamp: Date.now()});
    return numero;
}

function actualizarNumeroActual(num) {
    const currentNumberEl = document.getElementById("currentNumber");
    if (currentNumberEl) currentNumberEl.textContent = num;
    marcarNumeroCartones(num);
    agregarHistorial(num);
}

// Extraer bola automáticamente
function sacarBolaAutomaticamente() {
    const num = generarNumero();
    if (num !== null) actualizarNumeroActual(num);
}

// =======================
// GANADOR DE LÍNEA O BINGO
// =======================

function declararGanador(tipo, jugador, premio) {
    const pantallaGanadorEl = document.querySelector(".pantallaGanador");
    if (!pantallaGanadorEl) return;
    pantallaGanadorEl.querySelector("#nombreGanador").textContent = jugador;
    pantallaGanadorEl.querySelector(".premioGanador").textContent = `Premio: ${premio}`;
    pantallaGanadorEl.style.display = "block";

    // Guardar en Firebase
    db.collection("ganadores").add({
        jugador,
        tipo,
        premio,
        fecha: Date.now()
    });
}

// Cerrar pantalla de ganador
document.getElementById("cerrarPantallaGanador")?.addEventListener("click", () => {
    document.querySelector(".pantallaGanador").style.display = "none";
});
// =======================
// BLOQUE 4 - CHAT, AMIGOS, INVITACIONES Y MODERACIÓN
// =======================

// Elementos del DOM
const chatInputEl = document.getElementById("chatInput");
const enviarMensajeBtn = document.getElementById("enviarMensaje");
const chatMensajesEl = document.getElementById("chatMensajes");
const amigosContainerEl = document.querySelector(".amigosContainer");
const invitacionesContainerEl = document.querySelector(".invitacionesContainer");
const moderacionBtns = document.querySelectorAll(".btnModeracion");

// =======================
// CHAT EN TIEMPO REAL
// =======================

function agregarMensajeChat(usuario, mensaje) {
    const mensajeDiv = document.createElement("div");
    mensajeDiv.classList.add("mensaje");
    mensajeDiv.innerHTML = `<strong>${usuario}:</strong> ${mensaje}`;
    chatMensajesEl.appendChild(mensajeDiv);
    chatMensajesEl.scrollTop = chatMensajesEl.scrollHeight;
}

// Escuchar cambios en Firebase
db.collection("chat").orderBy("timestamp").onSnapshot(snapshot => {
    chatMensajesEl.innerHTML = ""; // Limpiar para no duplicar
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        agregarMensajeChat(data.usuario, data.mensaje);
    });
});

// Enviar mensaje
enviarMensajeBtn.addEventListener("click", () => {
    const mensaje = chatInputEl.value.trim();
    if (!mensaje) return;
    const usuario = document.getElementById("playerName")?.value || "Anon";
    db.collection("chat").add({
        usuario,
        mensaje,
        timestamp: Date.now()
    });
    chatInputEl.value = "";
});

// =======================
// AMIGOS E INVITACIONES
// =======================

function agregarAmigo(nombre) {
    const amigoDiv = document.createElement("div");
    amigoDiv.classList.add("amigoItem");
    amigoDiv.innerHTML = `<span>${nombre}</span><button>Invitar</button>`;
    amigosContainerEl.appendChild(amigoDiv);
}

function agregarInvitacion(mensaje) {
    const invDiv = document.createElement("div");
    invDiv.classList.add("invitacionItem");
    invDiv.innerHTML = `<p>${mensaje}</p>
                        <button>Aceptar</button>
                        <button>Rechazar</button>`;
    invitacionesContainerEl.appendChild(invDiv);
}

// Escuchar cambios de amigos y invitaciones en Firebase
db.collection("amigos").onSnapshot(snapshot => {
    amigosContainerEl.innerHTML = "";
    snapshot.docs.forEach(doc => agregarAmigo(doc.data().nombre));
});

db.collection("invitaciones").onSnapshot(snapshot => {
    invitacionesContainerEl.innerHTML = "";
    snapshot.docs.forEach(doc => agregarInvitacion(doc.data().mensaje));
});

// =======================
// MODERACIÓN
// =======================

moderacionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const accion = btn.textContent.toLowerCase();
        const usuario = prompt("Nombre del jugador:");
        if (!usuario) return;

        db.collection("moderacion").add({
            usuario,
            accion,
            timestamp: Date.now()
        });

        alert(`Acción ${accion} aplicada a ${usuario}`);
    });
});

// =======================
// VALIDACIÓN DE DUPLICADOS
// =======================

function validarDuplicados(collectionName, valor, campo="nombre") {
    return db.collection(collectionName)
        .where(campo, "==", valor)
        .get()
        .then(snapshot => snapshot.empty);
}
// =======================
// BLOQUE 5 - HISTORIAL, RANKING Y ESTADÍSTICAS
// =======================

// Elementos del DOM
const historialNumerosEl = document.getElementById("historialNumeros");
const tablaRankingEl = document.getElementById("tablaRanking").querySelector("tbody");
const numerosCantadosEl = document.getElementById("numerosCantados");
const cartonesActivosEl = document.getElementById("cartonesActivos");
const tiempoPartidaEl = document.getElementById("tiempoPartida");

let tiempoSegundos = 0;
let timerInterval = null;

// =======================
// HISTORIAL DE NÚMEROS
// =======================

function agregarNumeroHistorial(numero) {
    const span = document.createElement("span");
    span.classList.add("historialNumero");
    span.textContent = numero;
    historialNumerosEl.appendChild(span);

    // Guardar en Firebase
    db.collection("numerosHistorial").add({
        numero,
        timestamp: Date.now()
    });
}

// Escuchar cambios en Firebase
db.collection("numerosHistorial").orderBy("timestamp").onSnapshot(snapshot => {
    historialNumerosEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const span = document.createElement("span");
        span.classList.add("historialNumero");
        span.textContent = data.numero;
        historialNumerosEl.appendChild(span);
    });
    numerosCantadosEl.textContent = snapshot.size;
});

// =======================
// RANKING DE GANADORES
// =======================

function actualizarRanking() {
    db.collection("ranking").orderBy("victorias", "desc").limit(10).onSnapshot(snapshot => {
        tablaRankingEl.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${data.jugador}</td>
                            <td>${data.victorias}</td>
                            <td>${data.premios}</td>`;
            tablaRankingEl.appendChild(tr);
        });
    });
}

actualizarRanking();

// =======================
// ESTADÍSTICAS AVANZADAS
// =======================

function actualizarEstadisticas() {
    db.collection("partidas").doc("estadisticas").onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        cartonesActivosEl.textContent = data.cartonesActivos || 0;
        tiempoPartidaEl.textContent = formatTiempo(data.tiempoPartida || 0);
    });
}

// Formatear tiempo a MM:SS
function formatTiempo(segundos) {
    const min = Math.floor(segundos / 60).toString().padStart(2, "0");
    const seg = (segundos % 60).toString().padStart(2, "0");
    return `${min}:${seg}`;
}

// =======================
// CONTADOR DE PARTIDA
// =======================

function iniciarTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        tiempoSegundos++;
        tiempoPartidaEl.textContent = formatTiempo(tiempoSegundos);

        // Guardar en Firebase
        db.collection("partidas").doc("estadisticas").set({
            tiempoPartida: tiempoSegundos
        }, { merge: true });

    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    tiempoSegundos = 0;
    tiempoPartidaEl.textContent = formatTiempo(tiempoSegundos);
    db.collection("partidas").doc("estadisticas").set({
        tiempoPartida: 0
    }, { merge: true });
}
// =======================
// BLOQUE 6 - PREMIOS, GANADOR Y NOTIFICACIONES
// =======================

// Elementos del DOM
const premioLineaValorEl = document.getElementById("premioLineaValor");
const premioBingoValorEl = document.getElementById("premioBingoValor");
const pozoAcumuladoValorEl = document.getElementById("pozoAcumuladoValor");
const pantallaGanadorEl = document.querySelector(".pantallaGanador");
const nombreGanadorEl = document.getElementById("nombreGanador");
const cerrarPantallaGanadorBtn = document.getElementById("cerrarPantallaGanador");
const feedActividadEl = document.querySelector(".feedActividad");

// =======================
// ACTUALIZAR PREMIOS EN TIEMPO REAL
// =======================

function actualizarPremios() {
    db.collection("premios").doc("valores").onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        premioLineaValorEl.textContent = data.premioLinea || "$0";
        premioBingoValorEl.textContent = data.premioBingo || "$0";
        pozoAcumuladoValorEl.textContent = data.pozoAcumulado || "$0";
    });
}

// Función para modificar premios desde el admin
function setPremios(linea, bingo, pozo) {
    db.collection("premios").doc("valores").set({
        premioLinea: linea,
        premioBingo: bingo,
        pozoAcumulado: pozo
    }, { merge: true });
}

// =======================
// MOSTRAR GANADOR
// =======================

function mostrarGanador(nombre, premio) {
    nombreGanadorEl.textContent = nombre;
    pantallaGanadorEl.querySelector(".premioGanador").textContent = `Premio: ${premio}`;
    pantallaGanadorEl.style.display = "block";

    // Guardar en historial de partidas
    db.collection("historialPartidas").add({
        ganador: nombre,
        premio: premio,
        timestamp: Date.now()
    });

    // Notificación automática
    agregarNotificacion(`${nombre} ganó ${premio}`);
}

cerrarPantallaGanadorBtn.addEventListener("click", () => {
    pantallaGanadorEl.style.display = "none";
});

// =======================
// SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
// =======================

function agregarNotificacion(texto) {
    const div = document.createElement("div");
    div.classList.add("evento");
    div.textContent = texto;
    feedActividadEl.prepend(div);

    // Guardar notificación en Firebase
    db.collection("notificaciones").add({
        mensaje: texto,
        timestamp: Date.now()
    });
}

// Escuchar cambios en Firebase para notificaciones
db.collection("notificaciones").orderBy("timestamp", "desc").limit(10)
  .onSnapshot(snapshot => {
      feedActividadEl.innerHTML = "";
      snapshot.docs.forEach(doc => {
          const data = doc.data();
          const div = document.createElement("div");
          div.classList.add("evento");
          div.textContent = data.mensaje;
          feedActividadEl.appendChild(div);
      });
});

// =======================
// EJEMPLO DE USO
// =======================

// Actualizar premios en la sala al iniciar
actualizarPremios();

// Mostrar ganador manual (admin puede elegir)
document.getElementById("btnCantarNumero").addEventListener("click", () => {
    // Demo: elige un ganador al azar
    const jugadores = ["Jugador1", "Jugador2", "Jugador3"];
    const ganador = jugadores[Math.floor(Math.random() * jugadores.length)];
    const premio = "$500"; // Puede ser personalizado por admin
    mostrarGanador(ganador, premio);
    setPremios("$50", "$500", "$1000"); // Ejemplo de actualización de premios
});
// =======================
// BLOQUE 7 - CHAT, AMIGOS E INVITACIONES
// =======================

// CHAT EN TIEMPO REAL
const chatInput = document.getElementById("chatInput");
const enviarMensajeBtn = document.getElementById("enviarMensaje");
const chatMensajesEl = document.getElementById("chatMensajes");

// Enviar mensaje al chat
enviarMensajeBtn.addEventListener("click", () => {
    const mensaje = chatInput.value.trim();
    if (!mensaje) return;

    // Guardar en Firebase
    db.collection("chat").add({
        usuario: "JugadorActual", // reemplazar por nombre real
        mensaje: mensaje,
        timestamp: Date.now()
    });

    chatInput.value = "";
});

// Mostrar mensajes en tiempo real
db.collection("chat").orderBy("timestamp", "asc").onSnapshot(snapshot => {
    chatMensajesEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.classList.add("mensaje");
        div.innerHTML = `<strong>${data.usuario}:</strong> ${data.mensaje}`;
        chatMensajesEl.appendChild(div);
        chatMensajesEl.scrollTop = chatMensajesEl.scrollHeight;
    });
});

// =======================
// SISTEMA DE AMIGOS
// =======================
const amigosContainer = document.querySelector(".amigosContainer");

// Mostrar amigos y botones de invitación
function cargarAmigos() {
    db.collection("jugadores").doc("JugadorActual").collection("amigos").onSnapshot(snapshot => {
        amigosContainer.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const amigo = doc.data();
            const div = document.createElement("div");
            div.classList.add("amigoItem");
            div.innerHTML = `<span>${amigo.nombre}</span> <button>Invitar</button>`;
            amigosContainer.appendChild(div);

            // Enviar invitación
            div.querySelector("button").addEventListener("click", () => {
                db.collection("invitaciones").add({
                    de: "JugadorActual",
                    para: amigo.nombre,
                    tipo: "sala",
                    timestamp: Date.now()
                });
                agregarNotificacion(`Invitación enviada a ${amigo.nombre}`);
            });
        });
    });
}

// =======================
// SISTEMA DE INVITACIONES
// =======================
const invitacionesContainer = document.querySelector(".invitacionesContainer");

function cargarInvitaciones() {
    db.collection("invitaciones").where("para", "==", "JugadorActual")
      .onSnapshot(snapshot => {
        invitacionesContainer.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const invit = doc.data();
            const div = document.createElement("div");
            div.classList.add("invitacionItem");
            div.innerHTML = `<p>${invit.de} te invitó a una ${invit.tipo}</p>
                             <button>Aceptar</button>
                             <button>Rechazar</button>`;
            invitacionesContainer.appendChild(div);

            // Aceptar invitación
            div.querySelector("button:first-of-type").addEventListener("click", () => {
                agregarNotificacion(`Aceptaste invitación de ${invit.de}`);
                doc.ref.delete();
            });

            // Rechazar invitación
            div.querySelector("button:last-of-type").addEventListener("click", () => {
                agregarNotificacion(`Rechazaste invitación de ${invit.de}`);
                doc.ref.delete();
            });
        });
      });
}

// =======================
// LOBBY DE SALAS
// =======================
const salasContainer = document.querySelector(".salasContainer");

function cargarSalas() {
    const salas = [
        {nombre: "Sala Rápida", jugadores: "12 / 30"},
        {nombre: "Sala Clásica", jugadores: "20 / 50"},
        {nombre: "Sala VIP", jugadores: "5 / 20"}
    ];

    salasContainer.innerHTML = "";
    salas.forEach(sala => {
        const div = document.createElement("div");
        div.classList.add("salaItem");
        div.innerHTML = `<h3>${sala.nombre}</h3>
                         <p>Jugadores: ${sala.jugadores}</p>
                         <button>Entrar</button>`;
        salasContainer.appendChild(div);

        div.querySelector("button").addEventListener("click", () => {
            agregarNotificacion(`Entraste a ${sala.nombre}`);
        });
    });
}

// =======================
// INICIALIZAR BLOQUE 7
// =======================
cargarAmigos();
cargarInvitaciones();
cargarSalas();
// =======================
// BLOQUE 8 - ESTADÍSTICAS, RANKING, PROMOCIONES Y CONFIGURACIÓN
// =======================

// ESTADÍSTICAS AVANZADAS
const numerosCantadosEl = document.getElementById("numerosCantados");
const cartonesActivosEl = document.getElementById("cartonesActivos");
const tiempoPartidaEl = document.getElementById("tiempoPartida");

function actualizarEstadisticas() {
    db.collection("estadisticas").doc("actual").onSnapshot(doc => {
        const data = doc.data();
        numerosCantadosEl.textContent = data.numerosCantados || 0;
        cartonesActivosEl.textContent = data.cartonesActivos || 0;
        tiempoPartidaEl.textContent = data.tiempoPartida || "00:00";
    });
}

// =======================
// RANKING SEMANAL
// =======================
const rankingListaEl = document.querySelector(".rankingLista");

function cargarRankingSemanal() {
    db.collection("rankingSemanal").orderBy("premios", "desc").onSnapshot(snapshot => {
        rankingListaEl.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const jugador = doc.data();
            const li = document.createElement("li");
            li.textContent = `${jugador.nombre} - $${jugador.premios}`;
            rankingListaEl.appendChild(li);
        });
    });
}

// =======================
// PROMOCIONES / PUBLICIDAD
// =======================
const promoContainerEl = document.querySelector(".promoContainer");

function cargarPromociones() {
    db.collection("promociones").onSnapshot(snapshot => {
        promoContainerEl.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const promo = doc.data();
            const div = document.createElement("div");
            div.classList.add("promoItem");
            div.textContent = promo.descripcion;
            promoContainerEl.appendChild(div);
        });
    });
}

// =======================
// CONFIGURACIÓN DE SALA
// =======================
const configSalaForm = document.getElementById("configSalaForm");

configSalaForm.addEventListener("submit", e => {
    e.preventDefault();

    const precioCarton = configSalaForm.querySelector("input[type=number]:nth-of-type(1)").value;
    const pozoInicial = configSalaForm.querySelector("input[type=number]:nth-of-type(2)").value;
    const tiempoEntreNumeros = configSalaForm.querySelector("input[type=number]:nth-of-type(3)").value;

    db.collection("configuracionSala").doc("actual").set({
        precioCarton,
        pozoInicial,
        tiempoEntreNumeros
    });

    agregarNotificacion("Configuración de sala actualizada");
});

// =======================
// INICIALIZAR BLOQUE 8
// =======================
actualizarEstadisticas();
cargarRankingSemanal();
cargarPromociones();
// =======================
// BLOQUE 9 - PREMIOS, HISTORIAL Y COMPRA DE CARTONES
// =======================

// PANEL DE PREMIOS
const premioLineaValorEl = document.getElementById("premioLineaValor");
const premioBingoValorEl = document.getElementById("premioBingoValor");
const pozoAcumuladoValorEl = document.getElementById("pozoAcumuladoValor");

function actualizarPremios() {
    db.collection("premios").doc("actual").onSnapshot(doc => {
        const data = doc.data();
        premioLineaValorEl.textContent = data.premioLinea || "$0";
        premioBingoValorEl.textContent = data.premioBingo || "$0";
        pozoAcumuladoValorEl.textContent = data.pozoAcumulado || "$0";
    });
}

// HISTORIAL DE PARTIDAS
const tablaHistorialEl = document.querySelector(".tablaHistorial tbody");

function cargarHistorial() {
    db.collection("historialPartidas").orderBy("fecha", "desc").onSnapshot(snapshot => {
        tablaHistorialEl.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const partida = doc.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${partida.id}</td>
                <td>${partida.ganador}</td>
                <td>${partida.premio}</td>
                <td>${partida.fecha}</td>
            `;
            tablaHistorialEl.appendChild(tr);
        });
    });
}

// COMPRA DE CARTONES
const btnComprarCartones = document.querySelectorAll(".btnComprarCarton");

btnComprarCartones.forEach((btn, index) => {
    btn.addEventListener("click", () => {
        const cartonId = `carton-${101 + index}`; // ID dinámico
        db.collection("cartonesComprados").add({
            jugador: jugadorActual.nombre,
            cartonId,
            fecha: new Date(),
        }).then(() => {
            agregarNotificacion(`Compraste el cartón #${101 + index}`);
        });
    });
});

// =======================
// INICIALIZAR BLOQUE 9
// =======================
actualizarPremios();
cargarHistorial();
// =======================
// BLOQUE 10 - CHAT, AMIGOS, INVITACIONES Y LOBBY
// =======================

// CHAT EN TIEMPO REAL
const chatInputEl = document.getElementById("chatInput");
const chatMensajesEl = document.getElementById("chatMensajes");
const enviarMensajeBtn = document.getElementById("enviarMensaje");

enviarMensajeBtn.addEventListener("click", () => {
    const mensaje = chatInputEl.value.trim();
    if (!mensaje) return;

    db.collection("chat").add({
        jugador: jugadorActual.nombre,
        mensaje,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    chatInputEl.value = "";
});

db.collection("chat").orderBy("timestamp").onSnapshot(snapshot => {
    chatMensajesEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const div = document.createElement("div");
        div.classList.add("mensaje");
        div.innerHTML = `<strong>${data.jugador}:</strong> ${data.mensaje}`;
        chatMensajesEl.appendChild(div);
        chatMensajesEl.scrollTop = chatMensajesEl.scrollHeight;
    });
});

// AMIGOS Y INVITACIONES
const amigosContainerEl = document.querySelector(".amigosContainer");
const invitacionesContainerEl = document.querySelector(".invitacionesContainer");

// Cargar amigos
db.collection("jugadores").doc(jugadorActual.id).collection("amigos")
.onSnapshot(snapshot => {
    amigosContainerEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const amigo = doc.data();
        const div = document.createElement("div");
        div.classList.add("amigoItem");
        div.innerHTML = `<span>${amigo.nombre}</span><button>Invitar</button>`;
        amigosContainerEl.appendChild(div);
    });
});

// Cargar invitaciones
db.collection("jugadores").doc(jugadorActual.id).collection("invitaciones")
.onSnapshot(snapshot => {
    invitacionesContainerEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const invitacion = doc.data();
        const div = document.createElement("div");
        div.classList.add("invitacionItem");
        div.innerHTML = `
            <p>${invitacion.remitente} te invitó a ${invitacion.tipo}</p>
            <button>Aceptar</button>
            <button>Rechazar</button>
        `;
        invitacionesContainerEl.appendChild(div);
    });
});

// LOBBY DE SALAS
const salasContainerEl = document.querySelector(".salasContainer");

db.collection("salas").onSnapshot(snapshot => {
    salasContainerEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const sala = doc.data();
        const div = document.createElement("div");
        div.classList.add("salaItem");
        div.innerHTML = `
            <h3>${sala.nombre}</h3>
            <p>Jugadores: ${sala.jugadores.length} / ${sala.maxJugadores}</p>
            <button>Entrar</button>
        `;
        salasContainerEl.appendChild(div);

        const entrarBtn = div.querySelector("button");
        entrarBtn.addEventListener("click", () => {
            // Función para unirse a la sala
            unirASala(doc.id);
        });
    });
});

function unirASala(salaId) {
    const salaRef = db.collection("salas").doc(salaId);
    salaRef.update({
        jugadores: firebase.firestore.FieldValue.arrayUnion(jugadorActual.nombre)
    });
}
// =======================
// BLOQUE 11 - ESTADÍSTICAS AVANZADAS, RANKING SEMANAL Y PROMOCIONES
// =======================

// ESTADÍSTICAS AVANZADAS
const numerosCantadosEl = document.getElementById("numerosCantados");
const cartonesActivosEl = document.getElementById("cartonesActivos");
const tiempoPartidaEl = document.getElementById("tiempoPartida");

// Actualizar estadísticas desde Firebase
db.collection("partidaActual").doc("stats").onSnapshot(doc => {
    const data = doc.data();
    numerosCantadosEl.textContent = data.numerosCantados || 0;
    cartonesActivosEl.textContent = data.cartonesActivos || 0;
    tiempoPartidaEl.textContent = data.tiempoPartida || "00:00";
});

// RANKING SEMANAL
const rankingListaEl = document.querySelector(".rankingLista");

db.collection("rankingSemanal").orderBy("premios", "desc").onSnapshot(snapshot => {
    rankingListaEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const jugador = doc.data();
        const li = document.createElement("li");
        li.textContent = `${jugador.nombre} - $${jugador.premios}`;
        rankingListaEl.appendChild(li);
    });
});

// PROMOCIONES / PUBLICIDAD
const promoContainerEl = document.querySelector(".promoContainer");

db.collection("promociones").onSnapshot(snapshot => {
    promoContainerEl.innerHTML = "";
    snapshot.docs.forEach(doc => {
        const promo = doc.data();
        const div = document.createElement("div");
        div.classList.add("promoItem");
        div.textContent = promo.texto;
        promoContainerEl.appendChild(div);
    });
});
// =======================
// BLOQUE 12 - CONFIGURACIÓN DE SALA, PANTALLA DE ESPERA Y PANEL DE PREMIOS
// =======================

// CONFIGURACIÓN DE SALA
const configSalaForm = document.getElementById("configSalaForm");

configSalaForm.addEventListener("submit", e => {
    e.preventDefault();
    const precioCarton = configSalaForm.querySelector('input[type="number"][value]').value;
    const pozoInicial = configSalaForm.querySelectorAll('input[type="number"]')[1].value;
    const tiempoEntreNumeros = configSalaForm.querySelectorAll('input[type="number"]')[2].value;

    db.collection("configSala").doc("actual").set({
        precioCarton,
        pozoInicial,
        tiempoEntreNumeros
    }).then(() => console.log("Configuración de sala actualizada."));
});

// PANTALLA DE ESPERA
const contadorPartidaEl = document.getElementById("contadorPartida");

db.collection("partidaActual").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    contadorPartidaEl.textContent = data.segundosParaInicio || 30;
});

// PANEL DE PREMIOS
const premioLineaValorEl = document.getElementById("premioLineaValor");
const premioBingoValorEl = document.getElementById("premioBingoValor");
const pozoAcumuladoValorEl = document.getElementById("pozoAcumuladoValor");

db.collection("pozoActual").doc("premios").onSnapshot(doc => {
    const data = doc.data();
    premioLineaValorEl.textContent = data.linea || "$0";
    premioBingoValorEl.textContent = data.bingo || "$0";
    pozoAcumuladoValorEl.textContent = data.pozo || "$0";
});

// Funciones para actualizar manualmente premios desde admin
function actualizarPremios(linea, bingo, pozo) {
    db.collection("pozoActual").doc("premios").set({
        linea,
        bingo,
        pozo
    });
}
// =======================
// BLOQUE 13 - CHAT, AMIGOS E INVITACIONES
// =======================

// CHAT EN TIEMPO REAL
const chatInput = document.getElementById("chatInput");
const enviarMensajeBtn = document.getElementById("enviarMensaje");
const chatMensajesEl = document.getElementById("chatMensajes");

// Escucha nuevos mensajes
db.collection("chatSala").orderBy("timestamp").onSnapshot(snapshot => {
    chatMensajesEl.innerHTML = "";
    snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement("div");
        div.classList.add("mensaje");
        div.innerHTML = `<strong>${msg.usuario}:</strong> ${msg.texto}`;
        chatMensajesEl.appendChild(div);
        chatMensajesEl.scrollTop = chatMensajesEl.scrollHeight;
    });
});

// Enviar mensaje
enviarMensajeBtn.addEventListener("click", () => {
    const texto = chatInput.value.trim();
    if (!texto) return;
    db.collection("chatSala").add({
        usuario: usuarioActual, // definir usuarioActual en login
        texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    chatInput.value = "";
});

// SISTEMA DE AMIGOS
const amigosContainer = document.querySelector(".amigosContainer");

db.collection("usuarios").doc(usuarioActual).collection("amigos").onSnapshot(snapshot => {
    amigosContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const amigo = doc.data();
        const div = document.createElement("div");
        div.classList.add("amigoItem");
        div.innerHTML = `<span>${amigo.nombre}</span>
                         <button onclick="invitarAmigo('${amigo.id}')">Invitar</button>`;
        amigosContainer.appendChild(div);
    });
});

function invitarAmigo(amigoId) {
    db.collection("invitaciones").add({
        de: usuarioActual,
        para: amigoId,
        tipo: "sala",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// INVITACIONES
const invitacionesContainer = document.querySelector(".invitacionesContainer");

db.collection("invitaciones").where("para", "==", usuarioActual)
.onSnapshot(snapshot => {
    invitacionesContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const inv = doc.data();
        const div = document.createElement("div");
        div.classList.add("invitacionItem");
        div.innerHTML = `<p>${inv.de} te invitó a una ${inv.tipo}</p>
                         <button onclick="aceptarInvitacion('${doc.id}')">Aceptar</button>
                         <button onclick="rechazarInvitacion('${doc.id}')">Rechazar</button>`;
        invitacionesContainer.appendChild(div);
    });
});

function aceptarInvitacion(invId) {
    db.collection("invitaciones").doc(invId).update({ estado: "aceptada" });
}

function rechazarInvitacion(invId) {
    db.collection("invitaciones").doc(invId).update({ estado: "rechazada" });
}
// =======================
// BLOQUE 14 - LOBBY DE SALAS Y CONTROL DE BOTS
// =======================

// LOBBY DE SALAS
const salasContainer = document.querySelector(".salasContainer");

db.collection("salas").onSnapshot(snapshot => {
    salasContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const sala = doc.data();
        const div = document.createElement("div");
        div.classList.add("salaItem");
        div.innerHTML = `<h3>${sala.nombre}</h3>
                         <p>Jugadores: ${sala.jugadores.length} / ${sala.maxJugadores}</p>
                         <button onclick="entrarSala('${doc.id}')">Entrar</button>`;
        salasContainer.appendChild(div);
    });
});

function entrarSala(salaId) {
    const salaRef = db.collection("salas").doc(salaId);
    salaRef.update({
        jugadores: firebase.firestore.FieldValue.arrayUnion(usuarioActual)
    });
    // Redirigir o mostrar pantalla de sala
    mostrarSala(salaId);
}

// CONTROL DE BOTS
const activarBotsBtn = document.getElementById("activarBots");
const desactivarBotsBtn = document.getElementById("desactivarBots");

activarBotsBtn.addEventListener("click", () => {
    db.collection("bots").doc("estado").set({ activo: true });
    iniciarBots();
});

desactivarBotsBtn.addEventListener("click", () => {
    db.collection("bots").doc("estado").set({ activo: false });
    detenerBots();
});

function iniciarBots() {
    db.collection("bots").doc("estado").get().then(doc => {
        if(doc.exists && doc.data().activo) {
            // Ejemplo: generar mensajes automáticos de bots
            setInterval(() => {
                const texto = `Bot dice: ${Math.floor(Math.random() * 100)}`;
                db.collection("chatSala").add({
                    usuario: "BOT",
                    texto,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }, 10000);
        }
    });
}

function detenerBots() {
    // Para simplificar, reiniciamos la página para detener intervalos
    location.reload();
}
// =======================
// BLOQUE 15 - ESTADÍSTICAS AVANZADAS Y RANKING SEMANAL
// =======================

// ESTADÍSTICAS AVANZADAS
const numerosCantadosSpan = document.getElementById("numerosCantados");
const cartonesActivosSpan = document.getElementById("cartonesActivos");
const tiempoPartidaSpan = document.getElementById("tiempoPartida");

db.collection("estadisticas").doc("avance").onSnapshot(doc => {
    if(doc.exists) {
        const data = doc.data();
        numerosCantadosSpan.textContent = data.numerosCantados || 0;
        cartonesActivosSpan.textContent = data.cartonesActivos || 0;
        tiempoPartidaSpan.textContent = data.tiempoPartida || "00:00";
    }
});

// RANKING SEMANAL
const rankingLista = document.querySelector(".rankingLista");

db.collection("rankingSemanal").orderBy("premios", "desc").onSnapshot(snapshot => {
    rankingLista.innerHTML = "";
    snapshot.forEach(doc => {
        const jugador = doc.data();
        const li = document.createElement("li");
        li.textContent = `${jugador.nombre} - $${jugador.premios}`;
        rankingLista.appendChild(li);
    });
});
// =======================
// BLOQUE 16 - PUBLICIDAD / PROMOCIONES Y CONFIGURACIÓN DE SALA
// =======================

// PUBLICIDAD / PROMOCIONES
const promoContainer = document.querySelector(".promoContainer");

db.collection("promociones").onSnapshot(snapshot => {
    promoContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const promo = doc.data();
        const div = document.createElement("div");
        div.classList.add("promoItem");
        div.textContent = promo.texto;
        promoContainer.appendChild(div);
    });
});

// CONFIGURACIÓN DE SALA
const configSalaForm = document.getElementById("configSalaForm");

configSalaForm.addEventListener("submit", e => {
    e.preventDefault();
    const precioCarton = configSalaForm.querySelector('input[type="number"][value]').value;
    const pozoInicial = configSalaForm.querySelectorAll('input[type="number"]')[1].value;
    const tiempoEntreNumeros = configSalaForm.querySelectorAll('input[type="number"]')[2].value;

    db.collection("configSala").doc("actual").set({
        precioCarton,
        pozoInicial,
        tiempoEntreNumeros
    }).then(() => console.log("Configuración de sala actualizada."));
});
// =======================
// BLOQUE 17 - PANTALLA DE PREMIOS Y PANEL FINANCIERO
// =======================

// PANTALLA DE PREMIOS
const premioLineaEl = document.getElementById("premioLineaValor");
const premioBingoEl = document.getElementById("premioBingoValor");
const pozoAcumuladoEl = document.getElementById("pozoAcumuladoValor");

db.collection("pozoActual").doc("premios").onSnapshot(doc => {
    const data = doc.data();
    premioLineaEl.textContent = data.linea || "$0";
    premioBingoEl.textContent = data.bingo || "$0";
    pozoAcumuladoEl.textContent = data.pozo || "$0";
});

function actualizarPremios(linea, bingo, pozo) {
    db.collection("pozoActual").doc("premios").set({
        linea,
        bingo,
        pozo
    });
}

// PANEL FINANCIERO ADMIN
const recaudadoTotalEl = document.getElementById("recaudadoTotal");
const pagadoTotalEl = document.getElementById("pagadoTotal");
const gananciaTotalEl = document.getElementById("gananciaTotal");

db.collection("finanzas").doc("totales").onSnapshot(doc => {
    const data = doc.data();
    recaudadoTotalEl.textContent = data.recaudado || "$0";
    pagadoTotalEl.textContent = data.pagado || "$0";
    gananciaTotalEl.textContent = data.ganancia || "$0";
});

// Funciones para actualizar manualmente valores financieros desde admin
function actualizarFinanzas(recaudado, pagado, ganancia) {
    db.collection("finanzas").doc("totales").set({
        recaudado,
        pagado,
        ganancia
    });
}
// =======================
// BLOQUE 18 - ANIMACIÓN DEL BOLILLERO Y PANTALLA DE GANADOR
// =======================

// ANIMACIÓN DEL BOLILLERO
const bolilleroAnimado = document.querySelector(".bolilleroAnimado");
const bolaAnimadas = document.querySelectorAll(".bolaAnimada");

db.collection("bolillero").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    const numeroActual = data.numeroActual || "--";
    bolaAnimadas.forEach((bola, idx) => {
        bola.textContent = data.bolas[idx] || "--";
    });
    // Actualizamos número principal
    document.getElementById("numeroActual").textContent = numeroActual;
});

// CANTAR NÚMERO MANUAL (ADMIN)
const btnCantarNumero = document.getElementById("btnCantarNumero");
btnCantarNumero.addEventListener("click", () => {
    const numero = prompt("Ingrese el número a cantar:");
    if(numero) {
        db.collection("bolillero").doc("estado").update({
            numeroActual: numero
        });
    }
});

// PANTALLA DE GANADOR
const pantallaGanador = document.querySelector(".pantallaGanador");
const nombreGanadorEl = document.getElementById("nombreGanador");
const cerrarPantallaGanadorBtn = document.getElementById("cerrarPantallaGanador");

db.collection("ganadorActual").doc("info").onSnapshot(doc => {
    const data = doc.data();
    if(data && data.nombre) {
        nombreGanadorEl.textContent = data.nombre;
        pantallaGanador.style.display = "block";
        document.querySelector(".premioGanador").textContent = `Premio: ${data.premio || "$0"}`;
    }
});

// Cerrar pantalla de ganador
cerrarPantallaGanadorBtn.addEventListener("click", () => {
    pantallaGanador.style.display = "none";
});
// =======================
// BLOQUE 19 - SISTEMA DE NOTIFICACIONES Y SOPORTE
// =======================

// SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
const feedActividad = document.querySelector(".feedActividad");

db.collection("notificaciones").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    feedActividad.innerHTML = "";
    snapshot.forEach(doc => {
        const evento = doc.data();
        const div = document.createElement("div");
        div.classList.add("evento");
        div.textContent = evento.texto;
        feedActividad.appendChild(div);
    });
});

// AGREGAR NOTIFICACIÓN (Ejemplo: cuando alguien compra un cartón)
function agregarNotificacion(texto) {
    db.collection("notificaciones").add({
        texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// SOPORTE / FORMULARIO DE TICKETS
const formSoporte = document.getElementById("formSoporte");

formSoporte.addEventListener("submit", e => {
    e.preventDefault();
    const asunto = formSoporte.querySelector('input[type="text"]').value;
    const mensaje = formSoporte.querySelector('textarea').value;

    if(asunto && mensaje) {
        db.collection("soporte").add({
            usuario: usuarioActual,
            asunto,
            mensaje,
            estado: "pendiente",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Ticket enviado correctamente");
            formSoporte.reset();
        });
    }
});
// =======================
// BLOQUE 20 - PERFIL DEL JUGADOR Y LOGROS
// =======================

const perfilNombreEl = document.getElementById("perfilNombre");
const perfilCartonesEl = document.getElementById("perfilCartones");
const perfilVictoriasEl = document.getElementById("perfilVictorias");
const perfilPremiosEl = document.getElementById("perfilPremios");
const logrosContainer = document.querySelector(".logrosContainer");

// ACTUALIZAR PERFIL EN TIEMPO REAL
db.collection("usuarios").doc(usuarioActual).onSnapshot(doc => {
    const data = doc.data();
    perfilNombreEl.textContent = data.nombre || "Jugador";
    perfilCartonesEl.textContent = data.cartonesComprados || 0;
    perfilVictoriasEl.textContent = data.victorias || 0;
    perfilPremiosEl.textContent = `$${data.premiosGanados || 0}`;

    // ACTUALIZAR LOGROS
    logrosContainer.innerHTML = "";
    if(data.logros && data.logros.length > 0){
        data.logros.forEach(logro => {
            const div = document.createElement("div");
            div.classList.add("logroItem");
            div.textContent = logro.emoji + " " + logro.texto;
            logrosContainer.appendChild(div);
        });
    }
});

// FUNCIONES PARA AGREGAR LOGROS
function agregarLogro(usuarioId, emoji, texto){
    const ref = db.collection("usuarios").doc(usuarioId);
    ref.update({
        logros: firebase.firestore.FieldValue.arrayUnion({emoji, texto})
    });
}

// EJEMPLO: añadir logro de primer bingo
// agregarLogro(usuarioActual, "🏆", "Primer Bingo");
// =======================
// BLOQUE 21 - TIENDA DE CARTONES Y MODERACIÓN
// =======================

// TIENDA DE CARTONES
const tiendaContainer = document.querySelector(".tiendaContainer");

db.collection("tiendaCartones").onSnapshot(snapshot => {
    tiendaContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const pack = doc.data();
        const div = document.createElement("div");
        div.classList.add("packFichas");
        div.innerHTML = `<p>${pack.cantidad} cartones</p>
                         <p>$${pack.precio}</p>
                         <button onclick="comprarCarton('${doc.id}', ${pack.precio}, ${pack.cantidad})">Comprar</button>`;
        tiendaContainer.appendChild(div);
    });
});

function comprarCarton(packId, precio, cantidad) {
    // Actualiza finanzas
    db.collection("finanzas").doc("totales").get().then(doc => {
        const data = doc.data();
        const nuevoRecaudado = (parseFloat(data.recaudado || 0) + parseFloat(precio)).toFixed(2);
        db.collection("finanzas").doc("totales").update({ recaudado: nuevoRecaudado });
    });

    // Añadir cartones al jugador
    db.collection("usuarios").doc(usuarioActual).update({
        cartonesComprados: firebase.firestore.FieldValue.increment(cantidad)
    });

    // Notificación automática
    db.collection("notificaciones").add({
        texto: `${usuarioActual} compró ${cantidad} cartones`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// PANEL DE MODERACIÓN
const btnSilenciar = document.querySelector(".btnModeracion:nth-child(1)");
const btnExpulsar = document.querySelector(".btnModeracion:nth-child(2)");
const btnBloquearChat = document.querySelector(".btnModeracion:nth-child(3)");
const btnReactivarChat = document.querySelector(".btnModeracion:nth-child(4)");

btnSilenciar.addEventListener("click", () => {
    const jugador = prompt("Ingrese el nombre del jugador a silenciar:");
    if(jugador) db.collection("moderacion").doc(jugador).set({ silenciado: true });
});

btnExpulsar.addEventListener("click", () => {
    const jugador = prompt("Ingrese el nombre del jugador a expulsar:");
    if(jugador) db.collection("moderacion").doc(jugador).set({ expulsado: true });
});

btnBloquearChat.addEventListener("click", () => {
    db.collection("moderacion").doc("chat").set({ bloqueado: true });
});

btnReactivarChat.addEventListener("click", () => {
    db.collection("moderacion").doc("chat").set({ bloqueado: false });
});
// =======================
// BLOQUE 22 - ESTADÍSTICAS AVANZADAS, INVITACIONES Y LOBBY
// =======================

// ESTADÍSTICAS AVANZADAS FINALES
const numerosCantadosEl = document.getElementById("numerosCantados");
const cartonesActivosEl = document.getElementById("cartonesActivos");
const tiempoPartidaEl = document.getElementById("tiempoPartida");

db.collection("estadisticas").doc("avance").onSnapshot(doc => {
    if(doc.exists){
        const data = doc.data();
        numerosCantadosEl.textContent = data.numerosCantados || 0;
        cartonesActivosEl.textContent = data.cartonesActivos || 0;
        tiempoPartidaEl.textContent = data.tiempoPartida || "00:00";
    }
});

// SISTEMA DE INVITACIONES
const invitacionesContainer = document.querySelector(".invitacionesContainer");

db.collection("invitaciones").where("destinatario", "==", usuarioActual)
  .onSnapshot(snapshot => {
      invitacionesContainer.innerHTML = "";
      snapshot.forEach(doc => {
          const inv = doc.data();
          const div = document.createElement("div");
          div.classList.add("invitacionItem");
          div.innerHTML = `<p>${inv.remitente} te invitó a ${inv.tipo}</p>
                           <button onclick="aceptarInvitacion('${doc.id}')">Aceptar</button>
                           <button onclick="rechazarInvitacion('${doc.id}')">Rechazar</button>`;
          invitacionesContainer.appendChild(div);
      });
  });

function aceptarInvitacion(id){
    db.collection("invitaciones").doc(id).update({ estado: "aceptada" });
}

function rechazarInvitacion(id){
    db.collection("invitaciones").doc(id).update({ estado: "rechazada" });
}

// LOBBY PRINCIPAL
const salasContainer = document.querySelector(".salasContainer");

db.collection("salas").onSnapshot(snapshot => {
    salasContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const sala = doc.data();
        const div = document.createElement("div");
        div.classList.add("salaItem");
        div.innerHTML = `<h3>${sala.nombre}</h3>
                         <p>Jugadores: ${sala.jugadores.length} / ${sala.maxJugadores}</p>
                         <button onclick="entrarSala('${doc.id}')">Entrar</button>`;
        salasContainer.appendChild(div);
    });
});

function entrarSala(salaId){
    db.collection("salas").doc(salaId).update({
        jugadores: firebase.firestore.FieldValue.arrayUnion(usuarioActual)
    });
    mostrarSala(salaId);
}
// =======================
// BLOQUE 23 - PANTALLA DE ESPERA Y PANEL DE PREMIOS
// =======================

// PANTALLA DE ESPERA
const contadorPartidaEl = document.getElementById("contadorPartida");

db.collection("partida").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    if(data && data.tiempoEspera !== undefined){
        contadorPartidaEl.textContent = data.tiempoEspera;
    }
});

// INICIAR Y REINICIAR PARTIDA (ADMIN)
const iniciarJuegoBtn = document.getElementById("iniciarJuego");
const reiniciarJuegoBtn = document.getElementById("reiniciarJuego");

iniciarJuegoBtn.addEventListener("click", () => {
    const pozoLinea = prompt("Ingrese el premio para Línea:");
    const pozoBingo = prompt("Ingrese el premio para Bingo:");
    const pozoAcumulado = prompt("Ingrese el pozo acumulado:");

    db.collection("pozoActual").doc("premios").set({
        linea: pozoLinea || "$0",
        bingo: pozoBingo || "$0",
        pozo: pozoAcumulado || "$0"
    });

    db.collection("partida").doc("estado").set({
        enCurso: true,
        tiempoEspera: 0
    });

    agregarNotificacion("La partida ha comenzado");
});

reiniciarJuegoBtn.addEventListener("click", () => {
    db.collection("partida").doc("estado").set({
        enCurso: false,
        tiempoEspera: 30
    });
    agregarNotificacion("La partida ha sido reiniciada");
});

// PANEL DE PREMIOS
const premioLineaEl = document.getElementById("premioLineaValor");
const premioBingoEl = document.getElementById("premioBingoValor");
const pozoAcumuladoEl = document.getElementById("pozoAcumuladoValor");

db.collection("pozoActual").doc("premios").onSnapshot(doc => {
    const data = doc.data();
    premioLineaEl.textContent = data.linea || "$0";
    premioBingoEl.textContent = data.bingo || "$0";
    pozoAcumuladoEl.textContent = data.pozo || "$0";
});
// =======================
// BLOQUE 24 - CONTROL DE BOTS Y MÚSICA DE SALA
// =======================

// CONTROL DE BOTS
const activarBotsBtn = document.getElementById("activarBots");
const desactivarBotsBtn = document.getElementById("desactivarBots");

activarBotsBtn.addEventListener("click", () => {
    db.collection("bots").doc("estado").set({ activos: true });
    agregarNotificacion("Bots activados por el admin");
});

desactivarBotsBtn.addEventListener("click", () => {
    db.collection("bots").doc("estado").set({ activos: false });
    agregarNotificacion("Bots desactivados por el admin");
});

// SINCRONIZACIÓN DE BOTS EN TIEMPO REAL
db.collection("bots").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    console.log("Estado de bots:", data.activos ? "Activos" : "Desactivados");
});

// MÚSICA DE SALA
const bgMusic = document.getElementById("bgMusic");
const playMusicBtn = document.getElementById("playMusic");
const pauseMusicBtn = document.getElementById("pauseMusic");
const stopMusicBtn = document.getElementById("stopMusic");

playMusicBtn.addEventListener("click", () => bgMusic.play());
pauseMusicBtn.addEventListener("click", () => bgMusic.pause());
stopMusicBtn.addEventListener("click", () => {
    bgMusic.pause();
    bgMusic.currentTime = 0;
});

// OPCIONAL: Sincronización de música entre jugadores (solo admin controla)
db.collection("musica").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    if(data.playing){
        bgMusic.play();
    } else {
        bgMusic.pause();
    }
});
// =======================
// BLOQUE 25 - RANKING SEMANAL Y HISTORIAL DE PARTIDAS
// =======================

// RANKING SEMANAL
const rankingLista = document.querySelector(".rankingLista");

db.collection("rankingSemanal").orderBy("premio", "desc").onSnapshot(snapshot => {
    rankingLista.innerHTML = "";
    snapshot.forEach(doc => {
        const jugador = doc.data();
        const li = document.createElement("li");
        li.textContent = `${jugador.nombre} - $${jugador.premio}`;
        rankingLista.appendChild(li);
    });
});

// HISTORIAL DE PARTIDAS
const tablaHistorial = document.querySelector(".tablaHistorial tbody");

db.collection("historialPartidas").orderBy("fecha", "desc").onSnapshot(snapshot => {
    tablaHistorial.innerHTML = "";
    snapshot.forEach(doc => {
        const partida = doc.data();
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${partida.id}</td>
                        <td>${partida.ganador}</td>
                        <td>$${partida.premio}</td>
                        <td>${partida.fecha}</td>`;
        tablaHistorial.appendChild(tr);
    });
});

// FUNCIONES PARA ACTUALIZAR RANKING Y HISTORIAL
function agregarPartida(id, ganador, premio, fecha){
    db.collection("historialPartidas").doc(id.toString()).set({
        id,
        ganador,
        premio,
        fecha
    });

    // Actualizar ranking semanal
    const refJugador = db.collection("rankingSemanal").doc(ganador);
    refJugador.get().then(doc => {
        if(doc.exists){
            refJugador.update({
                premio: firebase.firestore.FieldValue.increment(premio)
            });
        } else {
            refJugador.set({
                nombre: ganador,
                premio: premio
            });
        }
    });
}
// =======================
// BLOQUE 26 - PUBLICIDAD Y PROMOCIONES
// =======================

const promoContainer = document.querySelector(".promoContainer");

db.collection("promociones").orderBy("fechaInicio", "desc").onSnapshot(snapshot => {
    promoContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const promo = doc.data();
        const div = document.createElement("div");
        div.classList.add("promoItem");
        div.textContent = promo.texto;
        promoContainer.appendChild(div);
    });
});

// FUNCIONES PARA AGREGAR O REMOVER PROMOCIONES
function agregarPromocion(texto, fechaInicio, fechaFin){
    db.collection("promociones").add({
        texto,
        fechaInicio,
        fechaFin
    });
}

function removerPromocion(id){
    db.collection("promociones").doc(id).delete();
}
// =======================
// BLOQUE 27 - CONFIGURACIÓN DE SALA Y PANTALLA DE ESPERA
// =======================

// CONFIGURACIÓN DE SALA
const configSalaForm = document.getElementById("configSalaForm");

configSalaForm.addEventListener("submit", e => {
    e.preventDefault();
    const precioCarton = parseFloat(configSalaForm.querySelector('input[type="number"]:nth-child(2)').value);
    const pozoInicial = parseFloat(configSalaForm.querySelector('input[type="number"]:nth-child(4)').value);
    const tiempoEntreNumeros = parseInt(configSalaForm.querySelector('input[type="number"]:nth-child(6)').value);

    db.collection("configuracionSala").doc("parametros").set({
        precioCarton,
        pozoInicial,
        tiempoEntreNumeros
    });

    agregarNotificacion("Configuración de sala actualizada");
});

// PANTALLA DE ESPERA
const contadorPartida = document.getElementById("contadorPartida");

db.collection("partida").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    if(data && data.tiempoEspera !== undefined){
        contadorPartida.textContent = data.tiempoEspera;
    }
});

// FUNCION PARA INICIAR CONTADOR
function iniciarContador(segundos){
    let tiempo = segundos;
    const intervalo = setInterval(() => {
        if(tiempo <= 0){
            clearInterval(intervalo);
        } else {
            tiempo--;
            contadorPartida.textContent = tiempo;
        }
    }, 1000);
}
// =======================
// BLOQUE 28 - PANEL DE PREMIOS DISPONIBLES
// =======================

const premioLineaEl = document.getElementById("premioLineaValor");
const premioBingoEl = document.getElementById("premioBingoValor");
const pozoAcumuladoEl = document.getElementById("pozoAcumuladoValor");

// SINCRONIZACIÓN EN TIEMPO REAL
db.collection("pozoActual").doc("premios").onSnapshot(doc => {
    const data = doc.data();
    premioLineaEl.textContent = data.linea || "$0";
    premioBingoEl.textContent = data.bingo || "$0";
    pozoAcumuladoEl.textContent = data.pozo || "$0";
});

// FUNCIONES PARA EDITAR PREMIOS MANUALMENTE
function editarPremioLinea(valor){
    db.collection("pozoActual").doc("premios").update({ linea: valor });
    agregarNotificacion(`Premio Línea actualizado a ${valor}`);
}

function editarPremioBingo(valor){
    db.collection("pozoActual").doc("premios").update({ bingo: valor });
    agregarNotificacion(`Premio Bingo actualizado a ${valor}`);
}

function editarPozoAcumulado(valor){
    db.collection("pozoActual").doc("premios").update({ pozo: valor });
    agregarNotificacion(`Pozo Acumulado actualizado a ${valor}`);
}
// =======================
// BLOQUE 29 - HISTORIAL DE CHAT Y SISTEMA DE AMIGOS
// =======================

// HISTORIAL DEL CHAT
const chatHistorialContainer = document.querySelector(".chatHistorialContainer");

db.collection("chat").orderBy("timestamp").onSnapshot(snapshot => {
    chatHistorialContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement("div");
        div.classList.add("chatLinea");
        div.innerHTML = `<span class="usuarioChat">${msg.usuario}:</span>
                         <span class="mensajeChat">${msg.mensaje}</span>`;
        chatHistorialContainer.appendChild(div);
    });
});

// ENVIAR MENSAJE
function enviarMensaje(mensaje){
    db.collection("chat").add({
        usuario: usuarioActual,
        mensaje,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// SISTEMA DE AMIGOS
const amigosContainer = document.querySelector(".amigosContainer");

db.collection("usuarios").onSnapshot(snapshot => {
    amigosContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const user = doc.data();
        if(user.nombre !== usuarioActual){
            const div = document.createElement("div");
            div.classList.add("amigoItem");
            div.innerHTML = `<span>${user.nombre}</span>
                             <button onclick="invitarAmigo('${user.nombre}')">Invitar</button>`;
            amigosContainer.appendChild(div);
        }
    });
});

// FUNCIONES PARA INVITACIONES
function invitarAmigo(nombreAmigo){
    db.collection("invitaciones").add({
        remitente: usuarioActual,
        destinatario: nombreAmigo,
        tipo: "partida",
        estado: "pendiente",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}
// =======================
// BLOQUE 30 - PANTALLA DE GANADOR Y NOTIFICACIONES
// =======================

const pantallaGanadorEl = document.querySelector(".pantallaGanador");
const nombreGanadorEl = document.getElementById("nombreGanador");
const premioGanadorEl = document.querySelector(".premioGanador");
const cerrarPantallaGanadorBtn = document.getElementById("cerrarPantallaGanador");

// MUESTRA GANADOR EN TIEMPO REAL
db.collection("partida").doc("ultimoGanador").onSnapshot(doc => {
    const data = doc.data();
    if(data && data.ganador){
        nombreGanadorEl.textContent = data.ganador;
        premioGanadorEl.textContent = `Premio: ${data.premio}`;
        pantallaGanadorEl.style.display = "block";
        agregarNotificacion(`${data.ganador} ganó ${data.premio}`);
    }
});

// CERRAR PANTALLA DE GANADOR
cerrarPantallaGanadorBtn.addEventListener("click", () => {
    pantallaGanadorEl.style.display = "none";
});

// SISTEMA DE NOTIFICACIONES DE ACTIVIDAD
const feedActividad = document.querySelector(".feedActividad");

db.collection("notificaciones").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    feedActividad.innerHTML = "";
    snapshot.forEach(doc => {
        const notif = doc.data();
        const div = document.createElement("div");
        div.classList.add("evento");
        div.textContent = notif.texto;
        feedActividad.appendChild(div);
    });
});

// FUNCION PARA AGREGAR NOTIFICACIÓN
function agregarNotificacion(texto){
    db.collection("notificaciones").add({
        texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}
// =======================
// BLOQUE 31 - SOPORTE Y PERFIL DE JUGADOR
// =======================

// FORMULARIO DE SOPORTE
const formSoporte = document.getElementById("formSoporte");

formSoporte.addEventListener("submit", e => {
    e.preventDefault();
    const asunto = formSoporte.querySelector('input[type="text"]').value;
    const mensaje = formSoporte.querySelector('textarea').value;

    if(asunto && mensaje){
        db.collection("soporte").add({
            usuario: usuarioActual,
            asunto,
            mensaje,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            estado: "pendiente"
        });

        alert("Su mensaje ha sido enviado al soporte.");
        formSoporte.reset();
    }
});

// PERFIL DE JUGADOR
const perfilNombreEl = document.getElementById("perfilNombre");
const perfilCartonesEl = document.getElementById("perfilCartones");
const perfilVictoriasEl = document.getElementById("perfilVictorias");
const perfilPremiosEl = document.getElementById("perfilPremios");

db.collection("usuarios").doc(usuarioActual).onSnapshot(doc => {
    const data = doc.data();
    perfilNombreEl.textContent = data.nombre || "Jugador";
    perfilCartonesEl.textContent = data.cartonesComprados || 0;
    perfilVictoriasEl.textContent = data.victorias || 0;
    perfilPremiosEl.textContent = `$${data.premiosGanados || 0}`;
});

// FUNCIONES PARA ACTUALIZAR PERFIL
function actualizarPerfil(campos){
    db.collection("usuarios").doc(usuarioActual).update(campos);
}
// =======================
// BLOQUE 32 - LOGROS Y TIENDA DE CARTONES
// =======================

// LOGROS
const logrosContainer = document.querySelector(".logrosContainer");

db.collection("usuarios").doc(usuarioActual).collection("logros").onSnapshot(snapshot => {
    logrosContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const logro = doc.data();
        const div = document.createElement("div");
        div.classList.add("logroItem");
        div.textContent = `${logro.icono} ${logro.nombre}`;
        logrosContainer.appendChild(div);
    });
});

// FUNCION PARA AÑADIR LOGRO
function agregarLogro(nombre, icono){
    db.collection("usuarios").doc(usuarioActual).collection("logros").add({
        nombre,
        icono,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// TIENDA DE CARTONES
const tiendaContainer = document.querySelector(".tiendaContainer");

db.collection("tiendaCartones").onSnapshot(snapshot => {
    tiendaContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const pack = doc.data();
        const div = document.createElement("div");
        div.classList.add("packFichas");
        div.innerHTML = `<p>${pack.cantidad} cartones</p>
                         <p>$${pack.precio}</p>
                         <button onclick="comprarCarton('${doc.id}', ${pack.precio}, ${pack.cantidad})">Comprar</button>`;
        tiendaContainer.appendChild(div);
    });
});

// FUNCION PARA COMPRAR CARTON
function comprarCarton(packId, precio, cantidad){
    db.collection("finanzas").doc("totales").get().then(doc => {
        const data = doc.data();
        const nuevoRecaudado = (parseFloat(data.recaudado || 0) + parseFloat(precio)).toFixed(2);
        db.collection("finanzas").doc("totales").update({ recaudado: nuevoRecaudado });
    });

    db.collection("usuarios").doc(usuarioActual).update({
        cartonesComprados: firebase.firestore.FieldValue.increment(cantidad)
    });

    agregarNotificacion(`${usuarioActual} compró ${cantidad} cartones`);
}
// =======================
// BLOQUE 33 - MODERACIÓN Y CONTROL DE BOTS
// =======================

const btnSilenciar = document.querySelector(".btnModeracion:nth-child(1)");
const btnExpulsar = document.querySelector(".btnModeracion:nth-child(2)");
const btnBloquearChat = document.querySelector(".btnModeracion:nth-child(3)");
const btnReactivarChat = document.querySelector(".btnModeracion:nth-child(4)");

// SILENCIAR JUGADOR
btnSilenciar.addEventListener("click", () => {
    const jugador = prompt("Ingrese el nombre del jugador a silenciar:");
    if(jugador){
        db.collection("usuarios").doc(jugador).update({ silenciado: true });
        agregarNotificacion(`Jugador ${jugador} ha sido silenciado`);
    }
});

// EXPULSAR JUGADOR
btnExpulsar.addEventListener("click", () => {
    const jugador = prompt("Ingrese el nombre del jugador a expulsar:");
    if(jugador){
        db.collection("salas").get().then(snapshot => {
            snapshot.forEach(doc => {
                db.collection("salas").doc(doc.id).update({
                    jugadores: firebase.firestore.FieldValue.arrayRemove(jugador)
                });
            });
        });
        agregarNotificacion(`Jugador ${jugador} ha sido expulsado de la sala`);
    }
});

// BLOQUEAR Y REACTIVAR CHAT
btnBloquearChat.addEventListener("click", () => {
    db.collection("chat").doc("estado").set({ bloqueado: true });
    agregarNotificacion("Chat bloqueado por el admin");
});

btnReactivarChat.addEventListener("click", () => {
    db.collection("chat").doc("estado").set({ bloqueado: false });
    agregarNotificacion("Chat reactivado por el admin");
});

// CONTROL DE BOTS
const activarBotsBtn = document.getElementById("activarBots");
const desactivarBotsBtn = document.getElementById("desactivarBots");

activarBotsBtn.addEventListener("click", () => {
    db.collection("bots").doc("estado").set({ activos: true });
    agregarNotificacion("Bots activados por el admin");
});

desactivarBotsBtn.addEventListener("click", () => {
    db.collection("bots").doc("estado").set({ activos: false });
    agregarNotificacion("Bots desactivados por el admin");
});
// =======================
// BLOQUE 34 - ESTADÍSTICAS AVANZADAS Y NOTIFICACIONES DE SALA
// =======================

const numerosCantadosEl = document.getElementById("numerosCantados");
const cartonesActivosEl = document.getElementById("cartonesActivos");
const tiempoPartidaEl = document.getElementById("tiempoPartida");
const feedActividad = document.querySelector(".feedActividad");

// ESTADÍSTICAS EN TIEMPO REAL
db.collection("estadisticas").doc("partidaActual").onSnapshot(doc => {
    const data = doc.data();
    numerosCantadosEl.textContent = data.numerosCantados || 0;
    cartonesActivosEl.textContent = data.cartonesActivos || 0;
    tiempoPartidaEl.textContent = data.tiempoPartida || "00:00";
});

// NOTIFICACIONES DE ACTIVIDAD EN SALA
db.collection("notificaciones").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    feedActividad.innerHTML = "";
    snapshot.forEach(doc => {
        const notif = doc.data();
        const div = document.createElement("div");
        div.classList.add("evento");
        div.textContent = notif.texto;
        feedActividad.appendChild(div);
    });
});

// FUNCIONES PARA ACTUALIZAR ESTADÍSTICAS
function actualizarNumerosCantados(n){
    db.collection("estadisticas").doc("partidaActual").update({
        numerosCantados: firebase.firestore.FieldValue.increment(n)
    });
}

function actualizarCartonesActivos(n){
    db.collection("estadisticas").doc("partidaActual").update({
        cartonesActivos: n
    });
}

function actualizarTiempoPartida(minutos, segundos){
    const tiempo = `${minutos.toString().padStart(2,'0')}:${segundos.toString().padStart(2,'0')}`;
    db.collection("estadisticas").doc("partidaActual").update({ tiempoPartida: tiempo });
}
// =======================
// BLOQUE 35 - LOBBY PRINCIPAL Y SISTEMA DE INVITACIONES
// =======================

const salasContainer = document.querySelector(".salasContainer");
const invitacionesContainer = document.querySelector(".invitacionesContainer");

// CARGAR SALAS EN TIEMPO REAL
db.collection("salas").onSnapshot(snapshot => {
    salasContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const sala = doc.data();
        const div = document.createElement("div");
        div.classList.add("salaItem");
        div.innerHTML = `<h3>${sala.nombre}</h3>
                         <p>Jugadores: ${sala.jugadores.length} / ${sala.maxJugadores}</p>
                         <button onclick="entrarSala('${doc.id}')">Entrar</button>`;
        salasContainer.appendChild(div);
    });
});

// FUNCIONES PARA ENTRAR EN SALA
function entrarSala(salaId){
    const salaRef = db.collection("salas").doc(salaId);
    salaRef.update({
        jugadores: firebase.firestore.FieldValue.arrayUnion(usuarioActual)
    });
    agregarNotificacion(`${usuarioActual} ha entrado a ${salaId}`);
}

// SISTEMA DE INVITACIONES
db.collection("invitaciones").where("destinatario","==",usuarioActual).onSnapshot(snapshot => {
    invitacionesContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const inv = doc.data();
        const div = document.createElement("div");
        div.classList.add("invitacionItem");
        div.innerHTML = `<p>${inv.remitente} te invitó a ${inv.tipo}</p>
                         <button onclick="aceptarInvitacion('${doc.id}')">Aceptar</button>
                         <button onclick="rechazarInvitacion('${doc.id}')">Rechazar</button>`;
        invitacionesContainer.appendChild(div);
    });
});

function aceptarInvitacion(id){
    db.collection("invitaciones").doc(id).update({ estado: "aceptada" });
    agregarNotificacion(`${usuarioActual} aceptó una invitación`);
}

function rechazarInvitacion(id){
    db.collection("invitaciones").doc(id).update({ estado: "rechazada" });
    agregarNotificacion(`${usuarioActual} rechazó una invitación`);
}
// =======================
// BLOQUE 36 - ANIMACIÓN BOLILLERO Y NÚMEROS CANTADOS
// =======================

const bolilleroAnimado = document.querySelector(".bolilleroAnimado");
const bolaAnimadas = document.querySelectorAll(".bolaAnimada");
const numerosCantadosEl = document.getElementById("numerosCantados");

// FUNCION PARA CANTAR NUMERO
function cantarNumero(numero){
    db.collection("partida").doc("numerosCantados").update({
        lista: firebase.firestore.FieldValue.arrayUnion(numero)
    });

    db.collection("estadisticas").doc("partidaActual").update({
        numerosCantados: firebase.firestore.FieldValue.increment(1)
    });

    agregarNotificacion(`Número cantado: ${numero}`);
}

// SINCRONIZACIÓN EN TIEMPO REAL DE NÚMEROS
db.collection("partida").doc("numerosCantados").onSnapshot(doc => {
    const data = doc.data();
    if(data && data.lista){
        numerosCantadosEl.textContent = data.lista.length;

        // ANIMACIÓN DE BOLILLAS
        bolilleroAnimado.innerHTML = "";
        data.lista.slice(-5).forEach(num => {
            const div = document.createElement("div");
            div.classList.add("bolaAnimada");
            div.textContent = num;
            bolilleroAnimado.appendChild(div);
        });
    }
});
// =======================
// BLOQUE 37 - GANADOR DE LÍNEA Y BINGO
// =======================

const premioLineaValor = document.getElementById("premioLineaValor");
const premioBingoValor = document.getElementById("premioBingoValor");

// ACTIVAR/DESACTIVAR PREMIOS
let lineaActiva = true;
let bingoActivo = true;

function activarDesactivarLinea(valor){
    lineaActiva = valor;
    agregarNotificacion(`Premio Línea ${valor ? "activado" : "desactivado"}`);
}

function activarDesactivarBingo(valor){
    bingoActivo = valor;
    agregarNotificacion(`Premio Bingo ${valor ? "activado" : "desactivado"}`);
}

// ELEGIR GANADOR MANUAL
function elegirGanador(tipo, jugador, premio){
    if((tipo === "linea" && !lineaActiva) || (tipo === "bingo" && !bingoActivo)){
        alert("Este premio está desactivado.");
        return;
    }

    db.collection("partida").doc("ultimoGanador").set({
        ganador: jugador,
        premio,
        tipo,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Actualizar estadísticas y finanzas
    if(tipo === "linea"){
        db.collection("pozoActual").doc("premios").update({ linea: premio });
    } else if(tipo === "bingo"){
        db.collection("pozoActual").doc("premios").update({ bingo: premio });
    }

    db.collection("usuarios").doc(jugador).update({
        premiosGanados: firebase.firestore.FieldValue.increment(premio),
        victorias: firebase.firestore.FieldValue.increment(1)
    });

    agregarNotificacion(`${jugador} ganó el ${tipo} con $${premio}`);
}
// =======================
// BLOQUE 38 - POZO ACUMULADO Y CONTROL DE CARTONES
// =======================

const pozoAcumuladoEl = document.getElementById("pozoAcumuladoValor");

// EDITAR POZO ACUMULADO MANUALMENTE
function editarPozoAcumulado(valor){
    db.collection("pozoActual").doc("premios").update({ pozo: valor });
    agregarNotificacion(`Pozo acumulado actualizado a $${valor}`);
}

// CONTROL DE CARTONES POR JUGADOR
function asignarCartones(jugador, cantidad){
    db.collection("usuarios").doc(jugador).update({
        cartonesComprados: firebase.firestore.FieldValue.increment(cantidad)
    });
    agregarNotificacion(`${jugador} recibió ${cantidad} cartones`);
}

// VERIFICAR CARTONES REPETIDOS (no se ejecutan duplicados)
function verificarYAgregarCarton(jugador, numeroCarton){
    const docRef = db.collection("usuarios").doc(jugador);
    docRef.get().then(doc => {
        const data = doc.data();
        if(!data.cartones || !data.cartones.includes(numeroCarton)){
            docRef.update({
                cartones: firebase.firestore.FieldValue.arrayUnion(numeroCarton)
            });
            agregarNotificacion(`Cartón ${numeroCarton} agregado a ${jugador}`);
        } else {
            console.log(`Cartón ${numeroCarton} ya existe para ${jugador}`);
        }
    });
}
// =======================
// BLOQUE 39 - RANKING SEMANAL Y PROMOCIONES
// =======================

const rankingListaEl = document.querySelector(".rankingLista");
const promoContainer = document.querySelector(".promoContainer");

// RANKING SEMANAL EN TIEMPO REAL
db.collection("usuarios").orderBy("premiosGanados", "desc").limit(10).onSnapshot(snapshot => {
    rankingListaEl.innerHTML = "";
    snapshot.forEach(doc => {
        const user = doc.data();
        const li = document.createElement("li");
        li.textContent = `${user.nombre} - $${user.premiosGanados}`;
        rankingListaEl.appendChild(li);
    });
});

// PROMOCIONES
db.collection("promociones").orderBy("fechaInicio", "desc").onSnapshot(snapshot => {
    promoContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const promo = doc.data();
        const div = document.createElement("div");
        div.classList.add("promoItem");
        div.textContent = promo.texto;
        promoContainer.appendChild(div);
    });
});

// FUNCIONES PARA AGREGAR O ELIMINAR PROMOCIONES
function agregarPromocion(texto, fechaInicio, fechaFin){
    db.collection("promociones").add({
        texto,
        fechaInicio,
        fechaFin
    });
    agregarNotificacion(`Nueva promoción agregada: ${texto}`);
}

function eliminarPromocion(id){
    db.collection("promociones").doc(id).delete();
    agregarNotificacion(`Promoción eliminada`);
}
// =======================
// BLOQUE 40 - CONFIGURACIÓN FINAL DE SALA Y TEMPORIZADOR
// =======================

const configSalaForm = document.getElementById("configSalaForm");
const contadorPartidaEl = document.getElementById("contadorPartida");

// SINCRONIZAR CONFIGURACIÓN DE SALA
db.collection("configuracionSala").doc("parametros").onSnapshot(doc => {
    const data = doc.data();
    if(data){
        configSalaForm.querySelector('input[type="number"]:nth-child(2)').value = data.precioCarton || 1;
        configSalaForm.querySelector('input[type="number"]:nth-child(4)').value = data.pozoInicial || 100;
        configSalaForm.querySelector('input[type="number"]:nth-child(6)').value = data.tiempoEntreNumeros || 5;
    }
});

// ACTUALIZAR CONFIGURACIÓN DE SALA
configSalaForm.addEventListener("submit", e => {
    e.preventDefault();
    const precioCarton = parseFloat(configSalaForm.querySelector('input[type="number"]:nth-child(2)').value);
    const pozoInicial = parseFloat(configSalaForm.querySelector('input[type="number"]:nth-child(4)').value);
    const tiempoEntreNumeros = parseInt(configSalaForm.querySelector('input[type="number"]:nth-child(6)').value);

    db.collection("configuracionSala").doc("parametros").set({
        precioCarton,
        pozoInicial,
        tiempoEntreNumeros
    });

    agregarNotificacion("Configuración de sala actualizada");
});

// TEMPORIZADOR DE PARTIDA
db.collection("partida").doc("estado").onSnapshot(doc => {
    const data = doc.data();
    if(data && data.tiempoEspera !== undefined){
        contadorPartidaEl.textContent = data.tiempoEspera;
    }
});

function iniciarContador(segundos){
    let tiempo = segundos;
    const intervalo = setInterval(() => {
        if(tiempo <= 0){
            clearInterval(intervalo);
            agregarNotificacion("Partida iniciada");
        } else {
            tiempo--;
            contadorPartidaEl.textContent = tiempo;
        }
    }, 1000);
}
