import jQuery from "jquery";
import materiasJSON from "./materias.json";
import "anychart";

function mostrarTabla(materias) {
  let tablaMaterias = document.getElementById("tablaMaterias");
  //ENCABEZADO DE TABLA
  let filaEncabezado = document.createElement("tr");

  for (const key in materias[0]) {
    let celdaEncabezado = document.createElement("th");
    celdaEncabezado.innerHTML = key
      .toUpperCase()
      .replace("-", " ")
      .replace("HORAS", "")
      .replace("CORRELATIVAS", "CORR. ");
    celdaEncabezado.className = "header";

    if (key == "correlativasCursadas") {
      $(celdaEncabezado).addClass("correlativa-cursada");
    }
    if (key == "correlativasAprobadas") {
      $(celdaEncabezado).addClass("correlativa-aprobada");
    }
    filaEncabezado.appendChild(celdaEncabezado);
  }

  tablaMaterias.appendChild(filaEncabezado);

  //CUERPO DE TABLA
  for (const materia of materiasJSON) {
    let filaTabla = document.createElement("tr");
    filaTabla.id = `fila${materia.id}`;

    for (const key of Object.keys(materia)) {
      let celda = document.createElement("td");
      celda.textContent = materia[key];

      if (key.includes("hora")) {
        $(celda).addClass("hora");
      }
      filaTabla.appendChild(celda);

      if (key == "estado") {
        celda.innerHTML = "";
      }
    }

    filaTabla.lastChild.appendChild(generarBotonera(filaTabla));
    tablaMaterias.appendChild(filaTabla);
  }
}

function generarBotonera(filaTabla) {
  let contenedorBotonesEstado = document.createElement("div");
  contenedorBotonesEstado.className = "contenedorBotonesEstado";

  let estados = ["aprobada", "debe-final", "en-curso", "bloqueada"];

  for (const estado of estados) {
    let botonEstado = document.createElement("button");
    botonEstado.textContent = `${estado.toUpperCase().replace("-", " ")}`;

    if (estado == "bloqueada") {
      botonEstado.disabled = true;
      botonEstado.id = `botonBloqueo${filaTabla.children[0].innerHTML}`;
    }

    botonEstado.className = `boton-${estado} botonEstado`;
    contenedorBotonesEstado.appendChild(botonEstado);
    botonEstado.addEventListener("click", (e) => {
      handleClickBotonEstado(e.target);
    });
  }

  return contenedorBotonesEstado;
}

function handleClickBotonEstado(boton) {
  const estado = $(boton).html().replace(" ", "-").toLowerCase();
  actualizarEstadoJSON(idMateriaSegunBoton(boton), estado);
  generarBloqueos();
  actualizarBotonera(boton);
  actualizarGrafo(getFuerzaInput());
}

function colorearFila(boton) {
  $(`#fila${idMateriaSegunBoton(boton)}`).addClass(
    $(boton).html().replace(" ", "-").toLowerCase()
  );
}

function actualizarBotonera(boton) {
  seleccionarBoton(boton);
  colorearFila(boton);
  for (const materia of materiasJSON) {
    if (materia.estado == "bloqueada") {
      bloquearBotonMateria(materia.id);
    } else {
      if (materia.estado == "puede-cursar") {
        desbloquearBotonMateria(materia.id);
      }
    }
  }
}

function seleccionarBoton(boton) {
  $(boton).toggleClass("botonEstadoSeleccionado");
  if ($(boton).hasClass("botonEstadoSeleccionado")) {
    $(boton).siblings().hide();
  } else {
    $(boton).siblings().not(".boton-bloqueada").show();
  }
}

function bloquearBotonMateria(idMateria) {
  $(`#botonBloqueo${idMateria}`)
    .addClass("botonEstadoSeleccionado")
    .show()
    .siblings()
    .removeClass("botonEstadoSeleccionado")
    .hide();
  $(`#fila${idMateria}`).removeClass();
}

function desbloquearBotonMateria(idMateria) {
  $(`#botonBloqueo${idMateria}`).removeClass("botonEstadoSeleccionado");
  $(`#botonBloqueo${idMateria}`).hide();
  $(`#botonBloqueo${idMateria}`).siblings().show();
  $(`#fila${idMateria}`).removeClass();
}

function generarBloqueos() {
  for (const materia of materiasJSON) {
    if (debeCorrelativas(materia.id)) {
      actualizarEstadoJSON(materia.id, "bloqueada");
    } else if (estadoMateria(materia.id) == "bloqueada") {
      actualizarEstadoJSON(materia.id, "puede-cursar");
    }
  }
}

function gestionarBloqueoInicial() {
  $(".boton-bloqueada").not(".botonEstadoSeleccionado").hide();
  for (const materia of materiasJSON) {
    if (debeCorrelativas(materia.id)) {
      actualizarEstadoJSON(materia.id, "bloqueada");
      bloquearBotonMateria(materia.id);
    }
  }
}

function debeCorrelativas(idMateria) {
  let materia = materiasJSON.find((mat) => mat.id == idMateria);
  let bloqueada = false;

  for (const idCorrelativa of materia.correlativasAprobadas) {
    if (estadoMateria(idCorrelativa) == "aprobada") {
      bloqueada ||= false;
    } else {
      bloqueada ||= true;
    }
  }

  for (const idCorrelativa of materia.correlativasCursadas) {
    if (
      estadoMateria(idCorrelativa) == "aprobada" ||
      estadoMateria(idCorrelativa) == "debe-final"
    ) {
      bloqueada ||= false;
    } else {
      bloqueada ||= true;
    }
  }

  return bloqueada;
}

function idMateriaSegunBoton(boton) {
  //Retorna el id de la materia correspondiente a la fila del botón presionado

  return parseInt(
    $(boton).parentsUntil("table").last().children().first().html()
  );
}

function actualizarEstadoJSON(idMateria, nuevoEstado) {
  const materiaActualizar = materiasJSON.find(
    (materia) => materia.id == idMateria
  );

  if (
    materiaActualizar.estado == nuevoEstado &&
    materiaActualizar.estado != "bloqueada"
  ) {
    materiaActualizar.estado = "puede-cursar";
  } else {
    materiaActualizar.estado = nuevoEstado;
  }
}

function estadoMateria(idMateria) {
  return materiasJSON.find((materia) => materia.id == idMateria).estado;
}

function formatearData(materias) {
  let nodos = [];
  let aristas = [];

  const estiloAristaCorrelativaCursada = {
    normal: { stroke: { color: "var(--correlativa-cursada)" } },
    hovered: { stroke: { color: "var(--correlativa-cursada)" } },
  };
  const estiloAristaCorrelativaAprobada = {
    normal: { stroke: { color: "var(--correlativa-aprobada)" } },
    hovered: { stroke: { color: "var(--correlativa-aprobada)" } },
  };

  for (const materia of materias) {
    // Formatea correlatividades de cursadas
    for (const correlativa of materia.correlativasCursadas) {
      const arista = {
        from: materia.id,
        to: correlativa,
        tipoCorrelativa: "Cursada",
        ...estiloAristaCorrelativaCursada,
      };
      if ($("#inputCorrelativasCursadas").is(":checked")) {
        aristas.push(arista);
      }
    }

    // Formatea correlatividades de aprobadas
    materia.correlativasAprobadas.forEach((correlativa) => {
      const arista = {
        from: materia.id,
        to: correlativa,
        tipoCorrelativa: "Aprobada",
        ...estiloAristaCorrelativaAprobada,
      };

      if ($("#inputCorrelativasAprobadas").is(":checked")) {
        aristas.push(arista);
      }
    });

    // Agrega estilos a los nodos
    const nodo = {
      ...materia,
      normal: {
        fill: `var(--${materia.estado})`,
        stroke: `var(--main-black)`,
      },
      hovered: {
        fill: `var(--${materia.estado})`,
        stroke: `2 var(--main-black)`,
      },
    };
    nodos.push(nodo);
  }

  $("#labelFuerzaGrafo").html(`Fuerza del grafo (${getFuerzaInput()})`);
  return { nodes: nodos, edges: aristas };
}

function crearGrafo(data) {
  let chart = anychart.graph(data);

  //chart.title("Digrafo correlatividades");
  chart.title().fontColor("var(--main-black)");
  chart.container("contenedorGrafo");
  chart.edges().arrows().enabled(true);
  chart.interactivity().zoomOnMouseWheel(false);
  chart.fit();

  // Tooltips arcos
  chart.edges().tooltip().format("{%tipoCorrelativa}");

  // Tooltips nodos
  chart.nodes().tooltip().useHtml(true);
  chart
    .nodes()
    .tooltip()
    .format(function () {
      return (
        //Capitaliza el estado
        this.getData("estado").charAt(0).toUpperCase() +
        this.getData("estado").replace("-", " ").slice(1)
      );
    });

  // Configuración de nodos
  chart.nodes().labels().enabled(true);
  chart.nodes().labels().format("{%nombre}");
  chart.nodes().labels().fontSize(12);
  chart.nodes().labels().fontColor("var(--main-black)");
  chart.nodes().labels().fontFamily("Berkeley Mono");

  chart.layout().iterationCount(getFuerzaInput());
  // Renderizado
  chart.draw();
  $(".anychart-credits").remove();
}

function actualizarGrafo() {
  $("#contenedorGrafo").children().remove();
  crearGrafo(formatearData(materiasJSON));
}

function getFuerzaInput() {
  return document.getElementById("inputFuerzaGrafo").value;
}

mostrarTabla(materiasJSON);
gestionarBloqueoInicial();
crearGrafo(formatearData(materiasJSON));

document.getElementById("inputFuerzaGrafo").addEventListener("input", (e) => {
  actualizarGrafo(getFuerzaInput());
});

$('input[type="checkbox"]').on("click", actualizarGrafo);
