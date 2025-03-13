document.addEventListener("DOMContentLoaded", function () {
  const analyzeBtn = document.getElementById("analyze-btn");
  const restartBtn = document.getElementById("restart-btn");
  const situationInput = document.getElementById("situation");
  const contextInput = document.getElementById("context");
  const loadingSection = document.querySelector(".loading");
  const resultsSection = document.querySelector(".results-section");
  const situationSummary = document.querySelector(".situation-summary");
  const optionsContainer = document.querySelector(".options-container");
  const errorMessage = document.querySelector(".error-message");
  const inputSection = document.querySelector(".input-section");

  const decisionAI = {
    generateOptions: async function (situation, context = "") {
      try {
        const prompt = {
          contents: [
            {
              parts: [
                {
                  text: `Como experto en toma de decisiones, analiza esta situación y contexto para generar 5 opciones de acción posibles.

  Requerimientos:
  1. Formato numerado del 1 al 5
  2. Primera línea: "1. [Título máximo 5 palabras]: [Descripción 2-3 oraciones]"
  3. Las primeras 4 opciones deben ser específicas
  4. Quinta opción siempre: "5. Opción 5: Otro: [Sugerir combinar enfoques]"
  5. Lenguaje claro y práctico

  Situación: ${situation}
  Contexto: ${context || "Sin contexto adicional"}`,
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

        // Procesar la respuesta de la IA
        const options = this.parseOptions(textResponse);
        return this.assignProbabilities(options);
      } catch (error) {
        console.error("Error:", error);
        throw "Error al analizar tu situación. Por favor, inténtalo de nuevo.";
      }
    },

    parseOptions: function (text) {
      const options = [];
      const lines = text.split("\n").filter((line) => line.trim());

      lines.forEach((line) => {
        // Eliminar asteriscos y otros caracteres no deseados
        const cleanedLine = line.replace(/\*\*/g, "").trim();

        // Expresión regular para capturar el formato "1. Título: Descripción"
        const match = cleanedLine.match(/^\d+\.\s*(.+?):\s*(.+)$/);
        if (match) {
          options.push({
            title: match[1].trim(),
            description: match[2].trim(),
          });
        }
      });

      // Asegurar mínimo 5 opciones
      while (options.length < 5) {
        options.push({
          title: `Opción ${options.length + 1}: ${
            options.length === 4 ? "Otro" : "Alternativa"
          }`,
          description:
            "Analiza diferentes enfoques y considera tus prioridades personales.",
        });
      }

      return options.slice(0, 5);
    },

    assignProbabilities: function (options) {
      // Definir rangos de variación basados en la cantidad de opciones
      const length = options.length;
      let baseValue = Math.floor(100 / length); // Valor base para cada opción

      // Crear array con probabilidades iniciales
      let probabilities = [];
      let remaining = 100;

      // Asignar probabilidades con ligera variación, manteniéndolas relativamente equilibradas
      for (let i = 0; i < length - 1; i++) {
        // Añadir variación de -3 a +5 al valor base, pero asegurando que la probabilidad sea razonable
        const variation = Math.floor(Math.random() * 9) - 3;
        const probability = Math.max(baseValue + variation, 10); // Mínimo 10%

        // Asegurar que no tomamos demasiado del restante
        const safeProb = Math.min(
          probability,
          remaining - (length - i - 1) * 10
        );
        probabilities.push(safeProb);
        remaining -= safeProb;
      }

      // La última opción toma el resto para asegurar que suman 100
      probabilities.push(remaining);

      // Ordenar de mayor a menor
      probabilities.sort((a, b) => b - a);

      // Mapear a las opciones
      return options.map((option, index) => {
        return {
          title: option.title,
          description: option.description,
          probability: probabilities[index],
        };
      });
    },
  };

  // Evento para analizar la situación
  analyzeBtn.addEventListener("click", function () {
    const situation = situationInput.value.trim();
    const context = contextInput.value.trim();

    if (situation.length < 10) {
      alert(
        "Por favor, describe tu situación con más detalle (mínimo 10 caracteres)."
      );
      return;
    }

    // Mostrar sección de carga y ocultar otras secciones
    loadingSection.style.display = "block";
    resultsSection.style.display = "none";
    errorMessage.style.display = "none";
    inputSection.style.opacity = "0.5";

    // Generar opciones con el sistema de IA
    decisionAI
      .generateOptions(situation, context)
      .then((options) => {
        // Ocultar carga y mostrar resultados
        loadingSection.style.display = "none";
        resultsSection.style.display = "block";
        inputSection.style.opacity = "1";

        // Mostrar resumen de la situación
        situationSummary.textContent = situation;

        // Limpiar y mostrar opciones
        optionsContainer.innerHTML = "";

        // Mostrar cada opción con animación escalonada
        options.forEach((option, index) => {
          setTimeout(() => {
            const optionElement = document.createElement("div");
            optionElement.className = "option-card fade-in";

            // Determinar clase de color basada en probabilidad
            let probabilityClass = "";
            if (index === 4) {
              probabilityClass = "option-other";
            } else if (option.probability > 50) {
              probabilityClass = "option-high";
            } else if (option.probability > 30) {
              probabilityClass = "option-medium";
            } else {
              probabilityClass = "option-low";
            }

            optionElement.innerHTML = `
                    <div class="probability-badge">${option.probability}%</div>
                    <h3 class="option-title">${option.title}</h3>
                    <p class="option-description">${option.description}</p>
                  `;

            optionsContainer.appendChild(optionElement);
          }, index * 300); // Tiempo de animación escalonada
        });
      })
      .catch((error) => {
        // Mostrar mensaje de error
        loadingSection.style.display = "none";
        errorMessage.style.display = "block";
        inputSection.style.opacity = "1";
        errorMessage.textContent =
          typeof error === "string"
            ? error
            : "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.";
      });
  });

  // Evento para reiniciar el proceso
  restartBtn.addEventListener("click", function () {
    resultsSection.style.display = "none";
    situationInput.value = "";
    contextInput.value = "";
    situationInput.focus();
  });
});
