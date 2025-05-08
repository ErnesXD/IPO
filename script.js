document.addEventListener("DOMContentLoaded", function () {
  const analyzeBtn = document.getElementById("analyze-btn");
  const restartBtn = document.getElementById("restart-btn");
  const situationInput = document.getElementById("situation");
  const contextInput = document.getElementById("context");
  const loadingSection = document.querySelector(".loading");
  const resultsSection = document.querySelector(".results-section");
  const errorMessage = document.querySelector(".error-message");
  const inputSection = document.querySelector(".input-section");

  let history = [];
  let currentIteration = 0;
  let originalSituation = "";
  let isProcessing = false; // Variable para controlar si hay una solicitud en proceso

  const decisionAI = {
    buildPrompt: function (situation, context, history) {
      let promptText = `Como experto en toma de decisiones, analiza esta situación y contexto para generar 4 opciones de acción posibles. 
        El usuario ha realizado ${currentIteration} iteraciones previas.`;

      if (history.length > 0) {
        promptText += "\n\nHistorial de decisiones:";
        history.forEach((item, index) => {
          promptText += `\nIteración ${index + 1}: ${
            item.question
          }\nElección: ${item.selected}`;
        });
      }

      promptText += `\n\nNueva situación: ${situation}\nContexto: ${
        context || "Sin contexto adicional"
      }\n\nRequerimientos:

1. Formato numerado del 1 al 4
2. Primera línea: "1. [Título máximo 5 palabras]: [Descripción 2-3 oraciones]"
3. Las primeras 4 opciones deben ser específicas y variadas
4. Lenguaje claro y práctico
5. Considera todo el historial previo proporcionado`;

      return promptText;
    },

    generateOptions: async function (situation, context = "", history = []) {
      try {
        const prompt = {
          contents: [
            {
              parts: [
                {
                  text: this.buildPrompt(situation, context, history),
                },
              ],
            },
          ],
        };

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyClyQJHjB6Ghf4JJ81yKADrbawM5O2358g",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prompt),
          }
        );

        if (!response.ok) throw new Error("Error en la API de Gemini");
        const data = await response.json();
        const textResponse =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return this.parseOptions(textResponse);
      } catch (error) {
        console.error("Error:", error);
        throw "Error al analizar tu situación. Por favor, inténtalo de nuevo.";
      }
    },

    parseOptions: function (text) {
      const options = [];
      const lines = text.split("\n").filter((line) => line.trim());

      lines.forEach((line) => {
        const cleanedLine = line.replace(/\*\*/g, "").trim();
        const match = cleanedLine.match(/^\d+\.\s*(.+?):\s*(.+)$/);
        if (match) {
          options.push({
            title: match[1].trim(),
            description: match[2].trim(),
          });
        }
      });

      while (options.length < 4) {
        options.push({
          title: `Opción ${options.length + 1}`,
          description:
            "Analiza diferentes enfoques y considera tus prioridades personales.",
        });
      }

      return options.slice(0, 4);
    },
  };

  // Función para desactivar todas las tarjetas de opciones anteriores
  const disablePreviousCards = () => {
    const allOptionCards = document.querySelectorAll(".option-card");
    allOptionCards.forEach((card) => {
      if (!card.classList.contains("selected-option")) {
        card.classList.add("disabled");
      }
      card.style.cursor = "not-allowed";
      // Eliminar todos los eventos de clic existentes
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
    });
  };

  const showNewIteration = (options, question) => {
    // Desactivar todas las tarjetas anteriores
    disablePreviousCards();

    const iterationContainer = document.createElement("div");
    iterationContainer.className = "iteration-container";

    iterationContainer.innerHTML = `
      <div class="iteration-header">Iteración ${currentIteration} ${
      currentIteration > 1
        ? "- Desarrollo del análisis"
        : "- Opciones iniciales"
    }</div>
      <div class="options-grid"></div>
    `;

    const grid = iterationContainer.querySelector(".options-grid");

    options.forEach((option, index) => {
      const optionElement = document.createElement("div");
      optionElement.className = "option-card card";
      optionElement.innerHTML = `
        <h3 class="option-title">${option.title}</h3>
        <p class="option-description">${option.description}</p>
        <div class="option-hint" style="margin-top: 15px; font-size: 0.9em; color: var(--primary); opacity: 0.8;">
          <span class="material-icons icon" style="font-size: 1em; vertical-align: middle;">touch_app</span> 
          Click para explorar esta opción
        </div>
      `;

      optionElement.addEventListener("click", () => {
        // Verificar si ya hay una solicitud en proceso o si se alcanzó el límite
        if (isProcessing || currentIteration >= 10) {
          if (currentIteration >= 10) {
            alert("Has alcanzado el máximo de 10 iteraciones");
          }
          return;
        }

        // Activar el flag de procesamiento
        isProcessing = true;

        // Marcar la opción seleccionada con un estilo diferente
        optionElement.classList.add("selected-option");

        // Desactivar todas las tarjetas de la iteración actual
        const currentCards = grid.querySelectorAll(".option-card");
        currentCards.forEach((card) => {
          if (card !== optionElement) {
            // Reducir opacidad de las opciones no seleccionadas
            card.classList.add("not-selected");
          }
          card.classList.add("processing");
          card.style.cursor = "wait";
        });

        history.push({
          iteration: currentIteration,
          question: question,
          selected: option.title,
        });

        currentIteration++;
        updateIterationCounter();

        loadingSection.style.display = "block";
        iterationContainer.style.opacity = "0.5";

        decisionAI
          .generateOptions(originalSituation, "", history)
          .then((newOptions) => {
            loadingSection.style.display = "none";
            iterationContainer.style.opacity = "1";
            isProcessing = false; // Desactivar el flag de procesamiento
            showNewIteration(newOptions, option.description);
          })
          .catch((error) => {
            loadingSection.style.display = "none";
            iterationContainer.style.opacity = "1";
            isProcessing = false; // Desactivar el flag de procesamiento
            errorMessage.style.display = "block";
            errorMessage.textContent = error;
          });
      });

      grid.appendChild(optionElement);
    });

    resultsSection.insertBefore(
      iterationContainer,
      document.querySelector(".footer-container")
    );

    // Asegurarse de hacer scroll hasta la nueva iteración
    iterationContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const updateIterationCounter = () => {
    const counter = document.querySelector(".iteration-counter");
    if (counter) {
      counter.textContent = `Iteración ${currentIteration} de 10`;

      if (currentIteration >= 10) {
        counter.innerHTML = `<span style="color: var(--primary); font-weight: bold;">Iteración ${currentIteration} de 10</span><br><strong>Límite máximo alcanzado</strong>`;
      } else if (currentIteration >= 7) {
        counter.innerHTML = `<span style="color: var(--warning);">Iteración ${currentIteration} de 10</span>`;
      } else {
        counter.innerHTML = `<span>Iteración ${currentIteration} de 10</span>`;
      }
    }
  };

  const resetAnalysis = () => {
    currentIteration = 0;
    history = [];
    originalSituation = "";
    isProcessing = false; // Reiniciar el flag de procesamiento
    resultsSection.innerHTML = `
      <h2 class="results-header">Análisis de Decisiones</h2>
      <div class="iteration-counter"></div>
      <div class="history-timeline" style="display: none; margin: 20px 0; padding: 15px; background: rgba(74, 111, 255, 0.05); border-radius: 10px;">
        <h3 style="color: var(--primary); margin-bottom: 10px;">Historial de Decisiones</h3>
        <div class="timeline-content"></div>
      </div>
      <div class="footer-container" style="text-align: center; margin-top: 30px">
        <button id="restart-btn" class="restart-btn">
          <span class="material-icons icon">refresh</span>
          Nueva Consulta
        </button>
      </div>
    `;
  };

  analyzeBtn.addEventListener("click", function () {
    // Evitar múltiples clics mientras procesa
    if (isProcessing) return;

    const situation = situationInput.value.trim();
    const context = contextInput.value.trim();

    if (situation.length < 10) {
      alert(
        "Por favor, describe tu situación con más detalle (mínimo 10 caracteres)."
      );
      return;
    }

    isProcessing = true; // Activar flag de procesamiento
    originalSituation = situation;
    loadingSection.style.display = "block";
    resultsSection.style.display = "block";
    errorMessage.style.display = "none";
    inputSection.style.opacity = "0.5";
    analyzeBtn.disabled = true; // Deshabilitar el botón mientras procesa

    resetAnalysis();
    currentIteration = 1;

    decisionAI
      .generateOptions(situation, context)
      .then((options) => {
        loadingSection.style.display = "none";
        inputSection.style.opacity = "1";
        updateIterationCounter();
        showNewIteration(options, situation);
        isProcessing = false; // Desactivar flag de procesamiento
        analyzeBtn.disabled = false; // Habilitar el botón nuevamente
      })
      .catch((error) => {
        loadingSection.style.display = "none";
        inputSection.style.opacity = "1";
        errorMessage.style.display = "block";
        errorMessage.textContent = error;
        isProcessing = false; // Desactivar flag de procesamiento
        analyzeBtn.disabled = false; // Habilitar el botón nuevamente
      });
  });

  restartBtn.addEventListener("click", function () {
    // Evitar múltiples clics mientras procesa
    if (isProcessing) return;

    resetAnalysis();
    resultsSection.style.display = "none";
    situationInput.value = "";
    contextInput.value = "";
    situationInput.focus();
  });

  // Delegación de eventos para el botón de reinicio dinámico
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "restart-btn" && !isProcessing) {
      resetAnalysis();
      resultsSection.style.display = "none";
      situationInput.value = "";
      contextInput.value = "";
      situationInput.focus();
    }
  });

  // Agregar estilos CSS mejorados
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --primary: #4a6fff; /* Azul más vibrante */
      --primary-dark: #3f51b5; /* Azul índigo para gradientes */
      --secondary: #ff4081; /* Rosa vibrante */
      --accent: #00bcd4; /* Cian */
      --success: #4a6fff; /* Verde para opciones positivas */
      --warning: #ffc107; /* Amarillo para opciones intermedias */
      --info: #2196f3; /* Azul claro para información */
      --background: #f8f9fa; /* Fondo gris muy claro */
      --card-bg: #ffffff; /* Tarjetas blancas */
      --text: #333333; /* Texto oscuro */
      --text-secondary: #666666; /* Texto secundario */
      --shadow: rgba(0, 0, 0, 0.1);
      --border-radius: 12px;
    }
    
    .option-card.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .option-card.processing {
      opacity: 0.8;
      cursor: wait;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .option-card.selected-option {
      background-color: rgba(74, 111, 255, 0.1);
      border: 2px solid var(--primary);
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(74, 111, 255, 0.2);
      position: relative;
      opacity: 1 !important;
    }
    
    .option-card.selected-option::after {
      content: "✓";
      position: absolute;
      top: 15px;
      right: 15px;
      width: 25px;
      height: 25px;
      background: var(--primary);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
    }
    
    .option-card.not-selected {
      opacity: 0.6;
      transform: scale(0.98);
      transition: all 0.3s ease;
    }
    
    .iteration-container {
      margin: 2rem 0;
      padding-left: 1.5rem;
      position: relative;
      transition: all 0.3s ease;
    }
    
    .iteration-header {
      color: var(--primary);
      margin-bottom: 1rem;
      font-size: 1.2rem;
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    
    .iteration-header::before {
      content: "";
      width: 12px;
      height: 12px;
      background: var(--primary);
      border-radius: 50%;
      display: inline-block;
      margin-right: 10px;
      margin-left: -22px;
      border: 3px solid white;
      box-shadow: 0 0 0 1px var(--primary);
    }
    
    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    @media (max-width: 768px) {
      .options-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .option-title {
      font-weight: 700;
      font-size: 1.2rem;
      margin-bottom: 12px;
      color: var(--primary);
      border-bottom: 2px solid rgba(74, 111, 255, 0.1);
      padding-bottom: 8px;
      padding-right: 30px;
    }
    
    .option-description {
      font-size: 1rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    
    .iteration-counter {
      text-align: center;
      margin: 1.5rem 0;
      color: var(--text-secondary);
      font-size: 1rem;
      background: rgba(74, 111, 255, 0.05);
      padding: 10px;
      border-radius: 50px;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
    }
    
    /* Animaciones para las nuevas iteraciones */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .iteration-container {
      animation: fadeInUp 0.5s ease forwards;
    }
  `;
  document.head.appendChild(style);
});
