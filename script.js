document.addEventListener("DOMContentLoaded", function () {
  const optionsContainer = document.getElementById("options-container");
  const addOptionBtn = document.getElementById("add-option-btn");
  const analyzeBtn = document.getElementById("analyze-btn");
  const situationInput = document.getElementById("situation");
  const loadingContainer = document.querySelector(".loading-container");
  const analysisForm = document.querySelector(".analysis-form");
  const resultsSection = document.getElementById("results-section");

  const MAX_OPTIONS = 5;
  let optionCount = 0;

  function addOption(defaultValue = "") {
    if (optionCount >= MAX_OPTIONS) return;
    optionCount++;
    const row = document.createElement("div");
    row.className = "option-row";
    const label = document.createElement("div");
    label.className = "option-label";
    label.textContent = `Opción ${optionCount}`;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "option-input";
    input.placeholder = `Describe la opción ${optionCount}...`;
    input.value = "";
    row.append(label, input);
    if (optionCount > 2) {
      const btn = document.createElement("button");
      btn.className = "option-remove";
      btn.innerHTML = '<span class="material-icons">delete</span>';
      btn.onclick = () => {
        optionsContainer.removeChild(row);
        optionCount--;
        updateOrder();
        addOptionBtn.style.display = "flex";
      };
      row.appendChild(btn);
    }
    optionsContainer.appendChild(row);
    input.focus();
    if (optionCount === MAX_OPTIONS) addOptionBtn.style.display = "none";
  }

  function updateOrder() {
    const rows = optionsContainer.querySelectorAll(".option-row");
    let idx = 1;
    rows.forEach((r) => {
      r.querySelector(".option-label").textContent = `Opción ${idx}`;
      idx++;
    });
  }

  addOption();
  addOption();

  addOptionBtn.onclick = addOption;

  function buildPrompt(sit, opts) {
    let p = `Eres un experto en ayudar a tomar decisiones.`;
    p += `\nSituación: ${sit}`;
    p += `\nOpciones:`;
    opts.forEach((o, i) => (p += `\n${i + 1}. ${o}`));
    p += `\n\nIndica cuál es la mejor opción y explica claramente por qué es la más adecuad indicando las ventajas de la misma. Unicamente responde con la opción y la explicación. No des más información. Se rotundo en la respuesta indicando claramente la opción adecuada.`;
    return p;
  }

  async function analyze(sit, opts) {
    const prompt = buildPrompt(sit, opts);
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyClyQJHjB6Ghf4JJ81yKADrbawM5O2358g",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) throw new Error("Error en la API");
    const j = await res.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  analyzeBtn.onclick = async () => {
    const sit = situationInput.value.trim();
    const opts = [...optionsContainer.querySelectorAll(".option-input")]
      .map((i) => i.value.trim())
      .filter(Boolean);
    if (sit.length < 10 || opts.length < 2) {
      alert("Describe la situación y al menos 2 opciones.");
      return;
    }
    analysisForm.style.display = "none";
    loadingContainer.style.display = "block";
    try {
      const text = await analyze(sit, opts);
      loadingContainer.style.display = "none";
      showResult(text);
    } catch (e) {
      loadingContainer.style.display = "none";
      analysisForm.style.display = "block";
      alert(e.message);
    }
  };

  function showResult(text) {
    resultsSection.innerHTML = `
<h2 class="results-title">Resultado del Análisis</h2>
<div class="best-result">
  <h3><span class="material-icons">star</span>Mejor Opción</h3>
  <p>${formatResultText(cleanAsterisks(text))}</p>
</div>
<div class="result-footer">
  <p>Este análisis fue generado por nuestra IA basada en la información proporcionada.</p>
  <button class="try-again-btn" onclick="window.location.reload()">
      <span class="material-icons">autorenew</span>Realizar otro análisis
  </button>
</div>
`;
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }
  function cleanAsterisks(text) {
    return text.replace(/\*{1,2}(.*?)\*{1,2}/g, "$1");
  }

  function formatResultText(text) {
    let formatted = text.replace(/\n/g, "<br>");

    const keyPhrases = [
      "recomendamos",
      "sugerimos",
      "mejor opción",
      "ventajas",
      "beneficios",
    ];
    keyPhrases.forEach((phrase) => {
      const regex = new RegExp(`(${phrase})`, "gi");
      formatted = formatted.replace(regex, '<span class="highlight">$1</span>');
    });

    return formatted;
  }
});
