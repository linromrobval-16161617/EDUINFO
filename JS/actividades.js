
const DB_NOMBRE = "EDUINFO";
const DB_VERSION = 1;
const ALMACEN = "actividades";

function abrirBD() {
    return new Promise((resolve, reject) => {
        const solicitud = indexedDB.open(DB_NOMBRE, DB_VERSION);

        solicitud.onupgradeneeded = () => {
            const db = solicitud.result;

            if (!db.objectStoreNames.contains(ALMACEN)) {
                db.createObjectStore(ALMACEN, {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);
    });
}

async function guardarActividad(datos) {
    const db = await abrirBD();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(ALMACEN, "readwrite");

        tx.objectStore(ALMACEN).add(datos);

        tx.oncomplete = () => {
            db.close();
            resolve();
        };

        tx.onerror = () => {
            db.close();
            reject(tx.error);
        };
    });
}

async function obtenerActividades() {
    const db = await abrirBD();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(ALMACEN, "readonly");
        const solicitud = tx.objectStore(ALMACEN).getAll();

        solicitud.onsuccess = () => resolve(solicitud.result);
        solicitud.onerror = () => reject(solicitud.error);

        tx.oncomplete = () => db.close();
    });
}

function crearTarjeta(datos) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "subject-card";

    const titulo = document.createElement("h3");
    titulo.textContent = "📚 " + datos.titulo;
    tarjeta.appendChild(titulo);

    const informacion = [
        ["Docente", datos.docente],
        ["Nivel", datos.grado],
        ["Materia", datos.materia],
        ["Descripción", datos.descripcion]
    ];

    informacion.forEach(([etiqueta, valor]) => {
        const p = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = etiqueta + ": ";
        p.appendChild(strong);
        p.appendChild(document.createTextNode(valor));

        tarjeta.appendChild(p);
    });

    if (datos.archivo) {
        const enlace = document.createElement("a");

        enlace.textContent = "📎 Descargar documento";
        enlace.href = URL.createObjectURL(datos.archivo);
        enlace.download = datos.archivoNombre;
        enlace.className = "btn";

        tarjeta.appendChild(enlace);
    }

    return tarjeta;
}

// PANEL DOCENTE
const formulario = document.getElementById("formActividad");

if (formulario) {
    const resultado = document.getElementById("resultado");
    const contenido = document.getElementById("contenidoActividad");

    async function cargarPublicaciones() {
        const actividades = await obtenerActividades();

        contenido.replaceChildren();

        actividades.forEach(datos => {
            contenido.appendChild(crearTarjeta(datos));
        });

        resultado.hidden = actividades.length === 0;
    }

    cargarPublicaciones().catch(console.error);

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const archivo = document.getElementById("archivo").files[0];

        if (archivo && archivo.size > 5 * 1024 * 1024) {
            alert("El archivo no puede superar los 5 MB.");
            return;
        }

        const datos = {
            docente: document.getElementById("docente").value.trim(),
            grado: document.getElementById("grado").value,
            materia: document.getElementById("materia").value,
            titulo: document.getElementById("titulo").value.trim(),
            descripcion: document.getElementById("descripcion").value.trim(),
            archivo: archivo || null,
            archivoNombre: archivo ? archivo.name : "",
            fecha: new Date().toLocaleDateString("es-CO")
        };

        try {
            await guardarActividad(datos);
            await cargarPublicaciones();

            formulario.reset();

            alert("¡Actividad publicada correctamente!");

            resultado.scrollIntoView({ behavior: "smooth" });

        } catch (error) {
            console.error(error);
            alert("No se pudo guardar la actividad.");
        }
    });
}

// PÁGINAS DE LAS MATERIAS
const paginaMateria = document.querySelector("[data-materia]");

if (paginaMateria) {
    const lista = document.getElementById("listaActividades");

    async function mostrarActividades() {
        try {
            const materia = paginaMateria.dataset.materia;
            const nivel = paginaMateria.dataset.nivel;

            const actividades = await obtenerActividades();

            const filtradas = actividades.filter(datos =>
                datos.materia === materia &&
                datos.grado === nivel
            );

            lista.replaceChildren();

            if (filtradas.length === 0) {
                const mensaje = document.createElement("p");
                mensaje.textContent =
                    "Todavía no hay actividades publicadas para esta materia.";

                lista.appendChild(mensaje);
                return;
            }

            filtradas.forEach(datos => {
                lista.appendChild(crearTarjeta(datos));
            });

        } catch (error) {
            console.error(error);
            lista.textContent = "No se pudieron cargar las actividades.";
        }
    }

    mostrarActividades();
}
