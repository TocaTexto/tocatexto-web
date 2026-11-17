/**
 * ============================================================================
 * TOCATEXTO — FRONT-END APPLICATION (FASE 2 · v02_03)
 * ============================================================================
 * Regras de Negócio & UX:
 * 1. Leitura no navegador de 1 ou MÚLTIPLOS documentos (.PDF via PDF.js,
 *    .DOCX via Mammoth.js, .TXT e .MD), com botão "+ Anexar mais arquivos"
 *    exclusivamente no Card 01 (cabeçalho e resumo), remoção individual e autodetecção do idioma
 *    (Português PT-BR ou Inglês EN).
 * 2. Detecção estrutural de Capítulos / Seções:
 *    - PDF: lê o sumário nativo (`pdf.getOutline()`) e, na falta dele, reconstrói
 *      as linhas da página pela coordenada vertical (eixo Y) e altura da fonte,
 *      detectando títulos (`Capítulo`, `Chapter`, `Seção`, `Parte`, numeração
 *      `1.`, `1.1`, `I -`, cabeçalhos em destaque tipográfico).
 *    - DOCX: usa `mammoth.convertToHtml()` para extrair `<h1>..<h4>` e parágrafos
 *      em negrito de abertura de seção, além do texto limpo.
 *    - TXT/MD: detecta headings Markdown (`# ..`) e padrões de capítulos.
 * 3. Bloqueio Anti-OCR imediato se média < 80 caracteres/página.
 * 4. Preço linear por caractere somando todos os arquivos anexados:
 *    `max(1.00, total_caracteres * 0.00005)`, com exibição simultânea no Card 01,
 *    no Resumo e no botão PIX.
 * 5. Vitrine expandida em largura total com 44 vozes reais do XTTSv2 (18 PT + 26 EN),
 *    reproduzindo `amostras_vozes/<id>/<sigla>.mp3` com fallback automático para
 *    o nome bruto do XTTSv2 (`amostra_<id>_<sigla>[_en]_<SIGLA>.mp3`) e para
 *    `../../Audiobook TTS/banco_vozes/<id>/<sigla>.mp3`.
 * 6. Barra de jornada guiada (`#flowStepper`) congelada no topo durante a rolagem
 *    com atualização automática da etapa visível via IntersectionObserver / scroll.
 * ============================================================================
 */

(() => {
  "use strict";

  // Configuração do worker do PDF.js
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // Constantes alinhadas ao grupo `servico_comercial` de config_orquestrador_xttsv2
  const CONFIG_COMERCIAL = {
    COM_VALOR_CARACTERE: 0.00005,
    COM_VALOR_MINIMO: 1.0,
    COM_MIN_CHARS_PAGINA: 80,
    COM_CHARS_POR_PAGINA: 2000,
    COM_MARGEM_SEGURANCA: 1.4,
    COM_LINK_DIAS_EXPIRA: 7,
    COM_LIMITE_ANEXO_MB: 15,
    COM_WHATSAPP_NUMERO_PUBLICO: "5519999999999",
    API_BASE_URL: "",
    CPU_SETUP_SEG: 330,
    CPU_BASE_SEG: 300,
    CPU_S_POR_BYTE: 0.38,
    CPU_ORQ_POS_SEG: 300,
    CPU_WORKERS_TOTAIS: 45,
    PARTICAO_PISO_BYTES: 3072,
  };

  // Velocidades preferenciais com atração magnética no slider granular
  const SNAP_SPEEDS = [0.85, 1.0, 1.25];
  const SNAP_TOLERANCE = 0.022;

  // Catálogo oficial das 18 vozes PT-BR (banco_vozes/pt/) e 26 vozes EN (banco_vozes/en/)
  const VOZES_CATALOGO = {
    pt: [
      { sigla: "borges", nome: "Borges", idioma: "pt", genero: "M", categoria: "densa", cor1: "#f59e0b", cor2: "#b45309", perfil: "Grave, firme e didático", frase: "A leitura pausada e articulada facilita a absorção de conteúdos densos e legislação." },
      { sigla: "ana", nome: "Ana", idioma: "pt", genero: "F", categoria: "narrativa", cor1: "#ec4899", cor2: "#be185d", perfil: "Clara, serena e natural", frase: "Transforme apostilas e artigos científicos em audiobooks fluidos para ouvir onde quiser." },
      { sigla: "renato", nome: "Renato", idioma: "pt", genero: "M", categoria: "dinamica", cor1: "#3b82f6", cor2: "#1d4ed8", perfil: "Dinâmico e objetivo", frase: "Cada capítulo é higienizado automaticamente para eliminar cabeçalhos, rodapés e ruídos." },
      { sigla: "helena", nome: "Helena", idioma: "pt", genero: "F", categoria: "narrativa", cor1: "#a855f7", cor2: "#6b21a8", perfil: "Expressiva e acolhedora", frase: "Estude no trânsito, na caminhada ou na academia com a posse definitiva do seu arquivo MP3." },
      { sigla: "carolina", nome: "Carolina", idioma: "pt", genero: "F", categoria: "densa", cor1: "#14b8a6", cor2: "#0f766e", perfil: "Fluida e editorial", frase: "As siglas, numerais romanos e artigos de lei são pronunciados por extenso com precisão." },
      { sigla: "cassio", nome: "Cássio", idioma: "pt", genero: "M", categoria: "densa", cor1: "#6366f1", cor2: "#3730a3", perfil: "Barítono técnico", frase: "Você escolhe se prefere um arquivo MP3 contínuo ou um pacote ZIP dividido por capítulos." },
      { sigla: "evelin", nome: "Evelin", idioma: "pt", genero: "F", categoria: "narrativa", cor1: "#f43f5e", cor2: "#9f1239", perfil: "Suave e cadenciada", frase: "Arraste o seletor de velocidade acima para testar a locução no ritmo ideal para o seu estudo." },
      { sigla: "gabriel", nome: "Gabriel", idioma: "pt", genero: "M", categoria: "dinamica", cor1: "#06b6d4", cor2: "#0e7490", perfil: "Jovem e articulado", frase: "Sem mensalidades ou aplicativos presos: você paga apenas pelos caracteres do documento." },
      { sigla: "joel", nome: "Joel", idioma: "pt", genero: "M", categoria: "narrativa", cor1: "#eab308", cor2: "#a16207", perfil: "Maduro e narrativo", frase: "Livros extensos e dissertações ganham ritmo de audiolivro profissional revisado contra chiados." },
      { sigla: "lendario", nome: "Lendário", idioma: "pt", genero: "M", categoria: "narrativa", cor1: "#f97316", cor2: "#9a3412", perfil: "Imponente e profundo", frase: "No modo de vozes aleatórias, cada novo capítulo recebe um narrador diferente sem repetição." },
      { sigla: "mariana", nome: "Mariana", idioma: "pt", genero: "F", categoria: "dinamica", cor1: "#10b981", cor2: "#047857", perfil: "Ágil e cristalina", frase: "A revisão de véspera de prova rende muito mais quando você acompanha o texto pelo áudio." },
      { sigla: "mateus", nome: "Mateus", idioma: "pt", genero: "M", categoria: "densa", cor1: "#0ea5e9", cor2: "#0369a1", perfil: "Equilibrado e acadêmico", frase: "Relatórios técnicos, teses e manuais são convertidos preservando toda a estrutura de tópicos." },
      { sigla: "max", nome: "Max", idioma: "pt", genero: "M", categoria: "dinamica", cor1: "#ef4444", cor2: "#991b1b", perfil: "Direto e energético", frase: "Dê o play e ajuste a velocidade em tempo real para encontrar a sua cadência favorita." },
      { sigla: "rita", nome: "Rita", idioma: "pt", genero: "F", categoria: "densa", cor1: "#8b5cf6", cor2: "#5b21b6", perfil: "Pausada e detalhista", frase: "Ideal para memorização de conceitos complexos, jurisprudência e normas regulamentadoras." },
      { sigla: "roberta", nome: "Roberta", idioma: "pt", genero: "F", categoria: "dinamica", cor1: "#d946ef", cor2: "#86198f", perfil: "Firme e executiva", frase: "Receba o seu audiobook completo tanto no seu e-mail quanto diretamente pelo WhatsApp." },
      { sigla: "scheila", nome: "Scheila", idioma: "pt", genero: "F", categoria: "narrativa", cor1: "#fb923c", cor2: "#c2410c", perfil: "Calorosa e natural", frase: "Uma experiência de audição limpa, contínua e livre de interrupções de formatação." },
      { sigla: "yasmin", nome: "Yasmin", idioma: "pt", genero: "F", categoria: "narrativa", cor1: "#2dd4bf", cor2: "#115e59", perfil: "Leve e compassada", frase: "Acompanhe seus capítulos favoritos no celular, no computador ou no som do carro offline." },
      { sigla: "yuri", nome: "Yuri", idioma: "pt", genero: "M", categoria: "densa", cor1: "#38bdf8", cor2: "#1e40af", perfil: "Preciso e documental", frase: "Você envia o texto, escolhe a voz e a gente cuida de toda a engenharia do seu audiobook." },
    ],
    en: [
      { sigla: "adam", nome: "Adam", idioma: "en", genero: "M", categoria: "narrativa", cor1: "#f59e0b", cor2: "#b45309", perfil: "Deep & Authoritative", frase: "Turn your research papers, technical manuals, and books into crystal-clear MP3 audiobooks." },
      { sigla: "adrian", nome: "Adrian", idioma: "en", genero: "M", categoria: "densa", cor1: "#3b82f6", cor2: "#1d4ed8", perfil: "Clear & Academic", frase: "Every chapter is automatically cleaned to remove headers, footers, and formatting noise." },
      { sigla: "alexander", nome: "Alexander", idioma: "en", genero: "M", categoria: "densa", cor1: "#6366f1", cor2: "#3730a3", perfil: "Measured & Formal", frase: "Listen offline on your commute, during workouts, or while reviewing complex academic material." },
      { sigla: "brad", nome: "Brad", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#10b981", cor2: "#047857", perfil: "Direct & Engaging", frase: "Adjust the playback speed in real time to match your ideal study and comprehension pace." },
      { sigla: "brian", nome: "Brian", idioma: "en", genero: "M", categoria: "narrativa", cor1: "#06b6d4", cor2: "#0e7490", perfil: "Smooth & Steady", frase: "Choose a single narrator for the entire book or assign a distinct voice to each chapter." },
      { sigla: "daniel", nome: "Daniel", idioma: "en", genero: "M", categoria: "densa", cor1: "#0ea5e9", cor2: "#0369a1", perfil: "Articulate & Precise", frase: "Numbers, dates, equations, and technical units are smoothly expanded into natural speech." },
      { sigla: "drew", nome: "Drew", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#f97316", cor2: "#9a3412", perfil: "Crisp & Modern", frase: "No monthly subscriptions or locked apps: you own your final MP3 or chapter ZIP forever." },
      { sigla: "elise", nome: "Elise", idioma: "en", genero: "F", categoria: "narrativa", cor1: "#ec4899", cor2: "#be185d", perfil: "Warm & Expressive", frase: "Warm and expressive narration designed for long reading sessions and literature review." },
      { sigla: "flint", nome: "Flint", idioma: "en", genero: "M", categoria: "densa", cor1: "#eab308", cor2: "#a16207", perfil: "Resonant Baritone", frase: "Deep, steady delivery that keeps technical documentation and executive reports engaging." },
      { sigla: "hope", nome: "Hope", idioma: "en", genero: "F", categoria: "dinamica", cor1: "#14b8a6", cor2: "#0f766e", perfil: "Bright & Natural", frase: "Clear and natural articulation that makes studying foreign language papers effortless." },
      { sigla: "hugh", nome: "Hugh", idioma: "en", genero: "M", categoria: "narrativa", cor1: "#8b5cf6", cor2: "#5b21b6", perfil: "Classic & Editorial", frase: "Structured chapters are preserved with complete ID3 metadata tags for your favorite player." },
      { sigla: "jamal", nome: "Jamal", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#ef4444", cor2: "#991b1b", perfil: "Dynamic & Confident", frase: "Dynamic and modern cadence, ideal for productivity articles, essays, and case studies." },
      { sigla: "jessa", nome: "Jessa", idioma: "en", genero: "F", categoria: "dinamica", cor1: "#f43f5e", cor2: "#9f1239", perfil: "Agile & Friendly", frase: "Switch seamlessly between slow, natural, and fast presets with our magnetic speed slider." },
      { sigla: "jessica", nome: "Jessica", idioma: "en", genero: "F", categoria: "densa", cor1: "#a855f7", cor2: "#6b21a8", perfil: "Polished & Executive", frase: "Every audio block is verified by our anti-hiss filter to ensure clean, studio-grade output." },
      { sigla: "jon", nome: "Jon", idioma: "en", genero: "M", categoria: "densa", cor1: "#38bdf8", cor2: "#1e40af", perfil: "Balanced & Objective", frase: "Balanced and objective tone built for scientific literature, thesis chapters, and textbooks." },
      { sigla: "josh", nome: "Josh", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#22c55e", cor2: "#15803d", perfil: "Conversational & Clear", frase: "Upload your PDF, Word, or Markdown document and preview the exact character count instantly." },
      { sigla: "lucan", nome: "Lucan", idioma: "en", genero: "M", categoria: "densa", cor1: "#64748b", cor2: "#334155", perfil: "Focused & Analytical", frase: "Focused and articulate narration that brings clarity to dense theoretical frameworks." },
      { sigla: "michael", nome: "Michael", idioma: "en", genero: "M", categoria: "densa", cor1: "#f59e0b", cor2: "#92400e", perfil: "Measured & Documentary", frase: "Authoritative and measured voice, well suited for legal texts, standards, and guidelines." },
      { sigla: "shelley", nome: "Shelley", idioma: "en", genero: "F", categoria: "narrativa", cor1: "#d946ef", cor2: "#86198f", perfil: "Serene Storyteller", frase: "Smooth storytelling flow that keeps your attention from the introduction to the conclusion." },
      { sigla: "sully", nome: "Sully", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#fb923c", cor2: "#c2410c", perfil: "Energetic & Fast-Paced", frase: "Crisp and energetic delivery for rapid review before exams and technical presentations." },
      { sigla: "tom", nome: "Tom", idioma: "en", genero: "M", categoria: "narrativa", cor1: "#2dd4bf", cor2: "#115e59", perfil: "Grounded & Reliable", frase: "Direct and reliable narration that turns hundreds of pages into portable audio lessons." },
      { sigla: "tyler", nome: "Tyler", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#3b82f6", cor2: "#1e3a8a", perfil: "Upbeat & Articulate", frase: "In random voice mode, each new section automatically rotates to a fresh narrator." },
      { sigla: "victoria", nome: "Victoria", idioma: "en", genero: "F", categoria: "densa", cor1: "#ec4899", cor2: "#9d174d", perfil: "Refined & Academic", frase: "Refined and polished diction tailored for academic journals and international reports." },
      { sigla: "viraj", nome: "Viraj", idioma: "en", genero: "M", categoria: "densa", cor1: "#14b8a6", cor2: "#134e4a", perfil: "Technical & Exact", frase: "Precise pronunciation for engineering, computing, and quantitative research documents." },
      { sigla: "will", nome: "Will", idioma: "en", genero: "M", categoria: "narrativa", cor1: "#8b5cf6", cor2: "#4c1d95", perfil: "Warm & Natural", frase: "Receive your completed audiobook directly in your email inbox and on WhatsApp." },
      { sigla: "wiseman", nome: "Wiseman", idioma: "en", genero: "M", categoria: "narrativa", cor1: "#eab308", cor2: "#713f12", perfil: "Deep & Reflective", frase: "You send the text, pick your favorite voice, and we press play on your study routine." },
    ],
  };

  // Estado reativo da sessão do cliente (agora suporta múltiplos documentos simultâneos)
  const state = {
    arquivos: [], // Array de { id, file, nome, tamanhoBytes, caracteres, paginas, capitulos: [{numero, titulo}], idiomaDetectado }
    arquivo: null, // Mantido p/ retrocompatibilidade (aponta para o primeiro arquivo)
    nomeArquivo: "",
    tamanhoBytes: 0,
    totalCaracteres: 0,
    paginasEstimadas: 0,
    capitulosDetectados: [{ numero: 1, titulo: "Documento Completo" }],
    valorCalculado: CONFIG_COMERCIAL.COM_VALOR_MINIMO,
    idioma: "pt",
    filtroVoz: "todas",
    velocidade: 1.0,
    modoVoz: "unica",
    vozId: "borges",
    vozesCapitulos: {},
    formatoSaida: "unico",
    janelaWhatsappAtiva: false,
    vozTocandoSigla: null,
    vozTocandoIdioma: null,
    etapaAtiva: 1,
    heartbeatOnline: true,
    heartbeatEpoch: Math.floor(Date.now() / 1000),
    filaPedidosFrente: 0,
    filaMinutosFrente: 0,
    prazoEstimadoMinutos: 25,
    horarioEntregaFormatado: "--:--",
    ultimoPedidoCriado: null,
  };

  // Referências DOM
  const el = {
    flowStepper: document.getElementById("flowStepper"),
    stepperItem01: document.getElementById("stepperItem01"),
    stepperItem02: document.getElementById("stepperItem02"),
    stepperItem03: document.getElementById("stepperItem03"),
    stepperBadge01: document.getElementById("stepperBadge01"),
    stepperBadge02: document.getElementById("stepperBadge02"),
    stepperBadge03: document.getElementById("stepperBadge03"),
    stepperState01: document.getElementById("stepperState01"),
    stepperState02: document.getElementById("stepperState02"),
    stepperState03: document.getElementById("stepperState03"),
    stepCard01: document.getElementById("stepCard01"),
    stepCard02: document.getElementById("stepCard02"),
    stepCard03: document.getElementById("stepCard03"),
    step01LivePill: document.getElementById("step01LivePill"),
    step02LivePill: document.getElementById("step02LivePill"),
    step03LivePill: document.getElementById("step03LivePill"),
    connector01to02: document.getElementById("connector01to02"),
    connector01Text: document.getElementById("connector01Text"),
    connector02to03: document.getElementById("connector02to03"),
    connector02Text: document.getElementById("connector02Text"),
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("fileInput"),
    addMoreFilesBtn: document.getElementById("addMoreFilesBtn"),
    attachedFilesList: document.getElementById("attachedFilesList"),
    readingProgressBox: document.getElementById("readingProgressBox"),
    readingStatusText: document.getElementById("readingStatusText"),
    readingPercentText: document.getElementById("readingPercentText"),
    readingProgressBar: document.getElementById("readingProgressBar"),
    ocrErrorAlert: document.getElementById("ocrErrorAlert"),
    ocrErrorDetail: document.getElementById("ocrErrorDetail"),
    docSummaryCard: document.getElementById("docSummaryCard"),
    docFileName: document.getElementById("docFileName"),
    docDetectedLangBadge: document.getElementById("docDetectedLangBadge"),
    docQualityBadge: document.getElementById("docQualityBadge"),
    docCharsCount: document.getElementById("docCharsCount"),
    docPagesCount: document.getElementById("docPagesCount"),
    docChaptersCount: document.getElementById("docChaptersCount"),
    docChaptersSubnote: document.getElementById("docChaptersSubnote"),
    docPriceBox: document.getElementById("docPriceBox"),
    docPriceCount: document.getElementById("docPriceCount"),
    docPriceFormulaNote: document.getElementById("docPriceFormulaNote"),
    clearFileBtn: document.getElementById("clearFileBtn"),
    langBtnPt: document.getElementById("langBtnPt"),
    langBtnEn: document.getElementById("langBtnEn"),
    speedSlider: document.getElementById("speedSlider"),
    speedDisplayBadge: document.getElementById("speedDisplayBadge"),
    speedMinusBtn: document.getElementById("speedMinusBtn"),
    speedPlusBtn: document.getElementById("speedPlusBtn"),
    speedHintText: document.getElementById("speedHintText"),
    speedPresetBtns: document.querySelectorAll(".speed-preset-btn"),
    voiceModeBtns: document.querySelectorAll(".voice-mode-btn"),
    outputFormatBtns: document.querySelectorAll(".output-format-btn"),
    voiceFilterBtns: document.querySelectorAll(".voice-filter-btn"),
    chapterVoiceMapper: document.getElementById("chapterVoiceMapper"),
    chapterVoiceList: document.getElementById("chapterVoiceList"),
    catalogLangCounter: document.getElementById("catalogLangCounter"),
    selectedVoiceBadge: document.getElementById("selectedVoiceBadge"),
    voicesGrid: document.getElementById("voicesGrid"),
    audioSourceStatusText: document.getElementById("audioSourceStatusText"),
    orderForm: document.getElementById("orderForm"),
    clientName: document.getElementById("clientName"),
    clientEmail: document.getElementById("clientEmail"),
    clientWhatsapp: document.getElementById("clientWhatsapp"),
    waClickToChatBtn: document.getElementById("waClickToChatBtn"),
    waActivatedBadge: document.getElementById("waActivatedBadge"),
    termsCheckbox: document.getElementById("termsCheckbox"),
    formValidationError: document.getElementById("formValidationError"),
    generatePixBtn: document.getElementById("generatePixBtn"),
    priceDisplay: document.getElementById("priceDisplay"),
    summaryDocStatus: document.getElementById("summaryDocStatus"),
    priceFormulaHint: document.getElementById("priceFormulaHint"),
    estConversionTime: document.getElementById("estConversionTime"),
    estQueueStatus: document.getElementById("estQueueStatus"),
    estConfigSummary: document.getElementById("estConfigSummary"),
    estDeliveryClock: document.getElementById("estDeliveryClock"),
    estDeliverySubtext: document.getElementById("estDeliverySubtext"),
    heartbeatBadge: document.getElementById("heartbeatBadge"),
    heartbeatDot: document.getElementById("heartbeatDot"),
    heartbeatText: document.getElementById("heartbeatText"),
    pixModal: document.getElementById("pixModal"),
    closePixModalBtn: document.getElementById("closePixModalBtn"),
    pixModalOrderId: document.getElementById("pixModalOrderId"),
    pixPendingStage: document.getElementById("pixPendingStage"),
    pixApprovedStage: document.getElementById("pixApprovedStage"),
    pixQrImage: document.getElementById("pixQrImage"),
    pixCopyPasteInput: document.getElementById("pixCopyPasteInput"),
    copyPixCodeBtn: document.getElementById("copyPixCodeBtn"),
    pixModalAmount: document.getElementById("pixModalAmount"),
    simulatePixApprovedBtn: document.getElementById("simulatePixApprovedBtn"),
    downloadOrderJsonBtn: document.getElementById("downloadOrderJsonBtn"),
    approvedOrderIdText: document.getElementById("approvedOrderIdText"),
    approvedEtaText: document.getElementById("approvedEtaText"),
    modalWaClickToChatBtn: document.getElementById("modalWaClickToChatBtn"),
    voicePreviewAudio: document.getElementById("voicePreviewAudio"),
  };

  // ==========================================================================
  // 1. UTILITÁRIOS DE FORMATAÇÃO, PREÇO E DETECÇÃO DE IDIOMA
  // ==========================================================================
  function formatarBRL(valor) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  function formatarInteiro(num) {
    return Math.round(num).toLocaleString("pt-BR");
  }

  function formatarBytes(bytes) {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
    }
    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${bytes} B`;
  }

  function calcularPrecoPorCaracteres(totalChars) {
    if (!totalChars || totalChars <= 0) {
      return CONFIG_COMERCIAL.COM_VALOR_MINIMO;
    }
    const bruto = totalChars * CONFIG_COMERCIAL.COM_VALOR_CARACTERE;
    return Math.round(Math.max(CONFIG_COMERCIAL.COM_VALOR_MINIMO, bruto) * 100) / 100;
  }

  function detectarIdiomaTexto(texto, nomeArquivo) {
    const stem = (nomeArquivo || "").replace(/\.[^.]+$/, "").toLowerCase();
    if (stem.endsWith("_en") || stem.endsWith("-en")) {
      return "en";
    }
    const amostra = (texto || "").slice(0, 12000).toLowerCase();
    const palavrasPt = (amostra.match(/\b(de|da|do|para|com|não|uma|os|as|que|por|mais|como|são|artigo|capítulo|lei)\b/g) || []).length;
    const palavrasEn = (amostra.match(/\b(the|and|of|to|in|that|is|for|with|as|on|be|this|by|from|chapter|section)\b/g) || []).length;
    if (palavrasEn > palavrasPt * 1.25 && palavrasEn >= 8) {
      return "en";
    }
    return "pt";
  }

  function dispararFlashPreco() {
    [el.priceDisplay, el.docPriceCount].forEach((node) => {
      if (!node) return;
      node.classList.remove("price-updated-flash");
      void node.offsetWidth;
      node.classList.add("price-updated-flash");
    });
  }

  // ==========================================================================
  // 2. FLUXO VISUAL GUIADO (STEPPER 01 -> 02 -> 03 + SCROLL SPY)
  // ==========================================================================
  function atualizarFluxoEtapas(etapaAtiva, apenasVisualStepper = false) {
    state.etapaAtiva = etapaAtiva;
    const temDoc = state.totalCaracteres > 0 && state.arquivos.length > 0;

    if (!apenasVisualStepper) {
      [el.stepCard01, el.stepCard02, el.stepCard03].forEach((card, idx) => {
        if (!card) return;
        const num = idx + 1;
        card.classList.remove("step-card-active", "step-card-completed");
        if (num === etapaAtiva) {
          card.classList.add("step-card-active");
        } else if ((num === 1 && temDoc) || num < etapaAtiva) {
          card.classList.add("step-card-completed");
        }
      });

      if (el.step01LivePill) el.step01LivePill.classList.toggle("hidden", etapaAtiva !== 1);
      if (el.step02LivePill) el.step02LivePill.classList.toggle("hidden", etapaAtiva !== 2);
      if (el.step03LivePill) el.step03LivePill.classList.toggle("hidden", etapaAtiva !== 3);
    }

    const itensStepper = [
      { pill: el.stepperItem01, badge: el.stepperBadge01, stateTxt: el.stepperState01, num: 1 },
      { pill: el.stepperItem02, badge: el.stepperBadge02, stateTxt: el.stepperState02, num: 2 },
      { pill: el.stepperItem03, badge: el.stepperBadge03, stateTxt: el.stepperState03, num: 3 },
    ];

    itensStepper.forEach(({ pill, badge, stateTxt, num }) => {
      if (!pill || !badge || !stateTxt) return;
      const concluido = (num === 1 && temDoc && etapaAtiva > 1) || (num === 2 && temDoc && etapaAtiva === 3);
      const ativo = num === etapaAtiva;

      pill.className = "stepper-pill flex items-center justify-between rounded-xl border px-4 py-2.5 transition ";
      if (ativo) {
        pill.className += "border-amber-400/70 bg-amber-500/15 shadow";
        badge.className = "flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 font-mono text-xs font-extrabold text-slate-950";
        badge.textContent = `0${num}`;
        stateTxt.className = "step-arrow-cue text-xs font-bold text-amber-300";
        stateTxt.textContent = "Etapa atual ↓";
      } else if (concluido) {
        pill.className += "border-emerald-500/45 bg-emerald-950/25";
        badge.className = "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 font-mono text-xs font-extrabold text-slate-950";
        badge.textContent = "✓";
        stateTxt.className = "text-xs font-semibold text-emerald-300";
        stateTxt.textContent = num === 1 ? `${state.arquivos.length} arq. · ${formatarBRL(state.valorCalculado)}` : `Voz: ${state.vozId}`;
      } else {
        pill.className += "border-slate-800 bg-slate-950/60 hover:border-slate-700";
        badge.className = "flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 font-mono text-xs font-bold text-slate-300";
        badge.textContent = `0${num}`;
        stateTxt.className = "text-xs font-medium text-slate-400";
        stateTxt.textContent = num === 2 ? "44 vozes →" : "E-mail & WhatsApp";
      }
    });

    if (el.connector01to02) {
      el.connector01to02.classList.toggle("step-connector-active", temDoc);
    }
    if (el.connector01Text) {
      el.connector01Text.textContent = temDoc
        ? `✓ ${state.arquivos.length} documento(s) validado(s) (${formatarBRL(state.valorCalculado)}) — Agora escolha a voz e a velocidade no Passo 02`
        : "Próximo passo: escolha o idioma, o narrador e a velocidade";
    }
    if (el.connector02to03) {
      el.connector02to03.classList.toggle("step-connector-active", etapaAtiva >= 2 && temDoc);
    }
  }

  function configurarScrollSpyStepper() {
    const secoes = [
      { num: 1, node: el.stepCard01 },
      { num: 2, node: el.stepCard02 },
      { num: 3, node: el.stepCard03 },
    ].filter((s) => s.node);

    if (!secoes.length) return;

    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const refY = window.innerHeight * 0.34;
          let melhorEtapa = state.etapaAtiva;
          for (const s of secoes) {
            const rect = s.node.getBoundingClientRect();
            if (rect.top <= refY && rect.bottom >= 120) {
              melhorEtapa = s.num;
              break;
            }
          }
          if (melhorEtapa !== state.etapaAtiva) {
            atualizarFluxoEtapas(melhorEtapa);
          }
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  // ==========================================================================
  // 3. GERAÇÃO DE AVATARES ILUSTRADOS E VITRINE DAS 44 VOZES (PT-BR & EN)
  // ==========================================================================
  function criarAvatarSvg(voz) {
    const iniciais = voz.nome.slice(0, 2).toUpperCase();
    const idGrad = `grad_${voz.idioma}_${voz.sigla}`;
    const iconeGenero = voz.genero === "F" ? "♀" : "♂";
    return `
      <div class="voice-avatar-wrap relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md" style="background: linear-gradient(135deg, ${voz.cor1}, ${voz.cor2});">
        <svg class="h-12 w-12 rounded-full" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="${idGrad}" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="${voz.cor1}" />
              <stop offset="100%" stop-color="${voz.cor2}" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="23" fill="url(#${idGrad})" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" />
          <circle cx="24" cy="18" r="7.5" fill="rgba(255,255,255,0.22)" />
          <path d="M11 40c2.2-6.5 7.2-10 13-10s10.8 3.5 13 10" fill="rgba(255,255,255,0.20)" />
          <text x="24" y="28" text-anchor="middle" fill="#ffffff" font-family="Inter, sans-serif" font-weight="800" font-size="13" letter-spacing="0.5">${iniciais}</text>
        </svg>
        <span class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-slate-950 text-[10px] font-bold text-amber-300 shadow" title="${voz.genero === "F" ? "Voz Feminina" : "Voz Masculina"}">
          ${iconeGenero}
        </span>
      </div>
    `;
  }

  function obterListaVozesIdiomaAtual() {
    return VOZES_CATALOGO[state.idioma] || VOZES_CATALOGO.pt;
  }

  function obterVozesFiltradas() {
    const lista = obterListaVozesIdiomaAtual();
    if (state.filtroVoz === "todas") return lista;
    if (state.filtroVoz === "F" || state.filtroVoz === "M") {
      return lista.filter((v) => v.genero === state.filtroVoz);
    }
    return lista.filter((v) => v.categoria === state.filtroVoz);
  }

  function renderizarCatalogoVozes() {
    if (!el.voicesGrid) return;
    el.voicesGrid.innerHTML = "";

    const todasIdioma = obterListaVozesIdiomaAtual();
    const filtradas = obterVozesFiltradas();

    if (el.catalogLangCounter) {
      el.catalogLangCounter.textContent =
        state.idioma === "en"
          ? `${filtradas.length}/${todasIdioma.length} vozes EN (Inglês)`
          : `${filtradas.length}/${todasIdioma.length} vozes PT-BR`;
    }

    const vozSelecionadaObj =
      todasIdioma.find((v) => v.sigla === state.vozId) || todasIdioma[0];
    if (vozSelecionadaObj && state.vozId !== vozSelecionadaObj.sigla) {
      state.vozId = vozSelecionadaObj.sigla;
    }
    if (el.selectedVoiceBadge && vozSelecionadaObj) {
      el.selectedVoiceBadge.textContent = `Voz ativa: ${vozSelecionadaObj.nome} (${vozSelecionadaObj.sigla})`;
    }

    filtradas.forEach((voz, index) => {
      const selecionada = state.vozId === voz.sigla;
      const tocando =
        state.vozTocandoSigla === voz.sigla && state.vozTocandoIdioma === voz.idioma;

      const card = document.createElement("div");
      card.style.animationDelay = `${Math.min(index * 18, 220)}ms`;
      card.className = `voice-card rounded-2xl border p-4 cursor-pointer flex flex-col justify-between ${
        tocando
          ? "playing-voice"
          : selecionada
          ? "selected-voice border-amber-400 bg-amber-500/10"
          : "border-slate-800 bg-slate-950/75 hover:border-slate-700"
      }`;

      const tagCategoria =
        voz.categoria === "densa"
          ? "⚖️ Densa / Técnica"
          : voz.categoria === "dinamica"
          ? "⚡ Dinâmica / Ágil"
          : "📖 Narrativa / Fluida";

      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              ${criarAvatarSvg(voz)}
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h4 class="text-sm font-extrabold text-white truncate">${voz.nome}</h4>
                  ${
                    selecionada
                      ? `<span class="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-slate-950">Ativa</span>`
                      : ""
                  }
                </div>
                <span class="block text-[11px] font-medium text-amber-300/90 truncate">${voz.perfil}</span>
                <span class="mt-0.5 inline-block rounded border border-slate-800 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  ${tagCategoria}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-play-voice="${voz.sigla}"
              data-play-lang="${voz.idioma}"
              class="play-voice-btn shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition shadow ${
                tocando
                  ? "bg-emerald-400 text-slate-950 shadow-emerald-500/25"
                  : "bg-slate-800 text-slate-100 hover:bg-amber-400 hover:text-slate-950"
              }"
              title="Ouvir amostra real em ${state.velocidade.toFixed(2)}x"
            >
              ${
                tocando
                  ? `<span class="eq-bars"><span></span><span></span><span></span><span></span></span><span>Parar</span>`
                  : `<span>▶</span><span>Ouvir</span>`
              }
            </button>
          </div>

          <p class="mt-3 text-xs text-slate-300 leading-relaxed line-clamp-2 italic">
            "${voz.frase}"
          </p>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
          <span class="font-mono text-slate-400">ID: <strong class="text-slate-200">${voz.sigla}</strong> · ${voz.idioma.toUpperCase()}</span>
          <span class="font-semibold ${selecionada ? "text-amber-300" : "text-slate-400"}">
            ${selecionada ? "✓ Selecionada p/ o pedido" : "Clique p/ escolher"}
          </span>
        </div>

        <!-- Barra de progresso de áudio ao vivo -->
        <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-900 ${tocando ? "" : "hidden"}" data-progress-wrap="${voz.sigla}">
          <div class="h-full bg-emerald-400 transition-all duration-100" style="width: 0%" data-progress-bar="${voz.sigla}"></div>
        </div>
      `;

      card.addEventListener("click", (ev) => {
        const playBtn = ev.target.closest("[data-play-voice]");
        if (playBtn) {
          ev.stopPropagation();
          alternarPreviewVoz(voz);
          return;
        }
        state.vozId = voz.sigla;
        if (state.etapaAtiva === 1 && state.totalCaracteres > 0) {
          atualizarFluxoEtapas(2);
        }
        renderizarCatalogoVozes();
        atualizarResumoPedido();
      });

      el.voicesGrid.appendChild(card);
    });
  }

  function renderizarMapeadorCapitulos() {
    if (!el.chapterVoiceMapper || !el.chapterVoiceList) return;
    if (state.modoVoz !== "por_capitulo") {
      el.chapterVoiceMapper.classList.add("hidden");
      return;
    }
    el.chapterVoiceMapper.classList.remove("hidden");
    el.chapterVoiceList.innerHTML = "";

    const vozesIdioma = obterListaVozesIdiomaAtual();
    const caps = state.capitulosDetectados.length
      ? state.capitulosDetectados
      : [{ numero: 1, titulo: "Capítulo 1 (Documento Completo)" }];

    caps.forEach((cap, idx) => {
      const capKey = String(cap.numero || idx + 1);
      const siglaPadrao =
        state.vozesCapitulos[capKey] ||
        vozesIdioma[idx % vozesIdioma.length].sigla;
      state.vozesCapitulos[capKey] = siglaPadrao;

      const row = document.createElement("div");
      row.className =
        "flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs";

      const opcoesHtml = vozesIdioma
        .map(
          (v) =>
            `<option value="${v.sigla}" ${
              v.sigla === siglaPadrao ? "selected" : ""
            }>${v.nome} (${v.genero}) — ${v.perfil}</option>`
        )
        .join("");

      row.innerHTML = `
        <span class="truncate text-slate-200 font-medium" title="${cap.titulo}">
          <strong class="font-mono text-amber-300">#${capKey}</strong> ${cap.titulo}
        </span>
        <select data-chapter-key="${capKey}" class="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-amber-400 focus:outline-none">
          ${opcoesHtml}
        </select>
      `;

      const selectEl = row.querySelector("select");
      selectEl.addEventListener("change", (e) => {
        state.vozesCapitulos[capKey] = e.target.value;
        atualizarResumoPedido();
      });

      el.chapterVoiceList.appendChild(row);
    });
  }

  // ==========================================================================
  // 4. REPRODUÇÃO 100% EM CIMA DOS ARQUIVOS MP3 REAIS + VELOCIDADE EM TEMPO REAL
  // ==========================================================================
  function aplicarVelocidadeNoAudioAtivo(novaVelocidade) {
    const audio = el.voicePreviewAudio;
    if (!audio) return;
    audio.defaultPlaybackRate = novaVelocidade;
    audio.playbackRate = novaVelocidade;
    if ("preservesPitch" in audio) audio.preservesPitch = true;
    if ("mozPreservesPitch" in audio) audio.mozPreservesPitch = true;
    if ("webkitPreservesPitch" in audio) audio.webkitPreservesPitch = true;
  }

  function pararPreviewVoz() {
    const audio = el.voicePreviewAudio;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch (_) {}
    }
    state.vozTocandoSigla = null;
    state.vozTocandoIdioma = null;
    renderizarCatalogoVozes();
  }

  function construirCandidatosMp3Voz(voz) {
    const id = voz.idioma;
    const s = voz.sigla;
    const sUp = s.toUpperCase();
    const sufixoEn = id === "en" ? "_en" : "";
    // [v02_01] Tenta primeiro o nome canônico `<sigla>.mp3`, depois o nome bruto do XTTSv2
    // caso o usuário tenha movido manualmente sem renomear, e por fim o banco_vozes original.
    return [
      `amostras_vozes/${id}/${s}.mp3`,
      `./amostras_vozes/${id}/${s}.mp3`,
      `amostras_vozes/${id}/amostra_${id}_${s}${sufixoEn}_${sUp}.mp3`,
      `./amostras_vozes/${id}/amostra_${id}_${s}${sufixoEn}_${sUp}.mp3`,
      `../../Audiobook%20TTS/banco_vozes/${id}/${s}.mp3`,
      `../../Audiobook TTS/banco_vozes/${id}/${s}.mp3`,
      `/amostras_vozes/${id}/${s}.mp3`,
    ];
  }

  function alternarPreviewVoz(voz) {
    if (
      state.vozTocandoSigla === voz.sigla &&
      state.vozTocandoIdioma === voz.idioma
    ) {
      pararPreviewVoz();
      return;
    }

    const audio = el.voicePreviewAudio;
    if (!audio) return;

    audio.pause();
    state.vozTocandoSigla = voz.sigla;
    state.vozTocandoIdioma = voz.idioma;
    state.vozId = voz.sigla;
    renderizarCatalogoVozes();
    atualizarResumoPedido();

    const candidatosUrl = construirCandidatosMp3Voz(voz);
    let idxTentativa = 0;

    const tentarProximoMp3 = () => {
      if (
        state.vozTocandoSigla !== voz.sigla ||
        state.vozTocandoIdioma !== voz.idioma
      ) {
        return;
      }
      if (idxTentativa >= candidatosUrl.length) {
        state.vozTocandoSigla = null;
        state.vozTocandoIdioma = null;
        renderizarCatalogoVozes();
        if (el.audioSourceStatusText) {
          el.audioSourceStatusText.innerHTML =
            `<span class="text-amber-300">⚠️ Amostra MP3 de <strong>${voz.nome}</strong> não encontrada em <code>web/amostras_vozes/${voz.idioma}/${voz.sigla}.mp3</code>. Rode a opção <strong>[A]</strong> no <code>processar_pedidos.py</code>.</span>`;
        }
        return;
      }

      const url = candidatosUrl[idxTentativa++];
      audio.src = url;
      aplicarVelocidadeNoAudioAtivo(state.velocidade);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            aplicarVelocidadeNoAudioAtivo(state.velocidade);
            if (el.audioSourceStatusText) {
              const origemTipo = url.includes("amostras_vozes")
                ? "Amostra XTTSv2 da vitrine"
                : "Voz original do banco_vozes";
              el.audioSourceStatusText.innerHTML =
                `🔊 Tocando agora: <strong class="text-emerald-300">${voz.nome} (${voz.idioma.toUpperCase()})</strong> em <strong class="font-mono text-amber-300">${state.velocidade.toFixed(2)}x</strong> (${origemTipo}). Arraste o controle de velocidade acima para testar em tempo real!`;
            }
          })
          .catch(() => {
            tentarProximoMp3();
          });
      }
    };

    audio.onended = () => {
      state.vozTocandoSigla = null;
      state.vozTocandoIdioma = null;
      renderizarCatalogoVozes();
    };

    audio.ontimeupdate = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
      const bar = document.querySelector(`[data-progress-bar="${voz.sigla}"]`);
      if (bar) bar.style.width = `${pct}%`;
    };

    tentarProximoMp3();
  }

  // ==========================================================================
  // 5. SELETOR GRANULAR DE VELOCIDADE (COM ATRAÇÃO MAGNÉTICA EM 0.85x, 1.0x, 1.25x)
  // ==========================================================================
  function normalizarVelocidadeComIma(valorBruto, aplicarIma = true) {
    let val = parseFloat(valorBruto);
    if (isNaN(val)) val = 1.0;
    val = Math.max(0.5, Math.min(2.0, val));

    if (aplicarIma) {
      for (const snap of SNAP_SPEEDS) {
        if (Math.abs(val - snap) <= SNAP_TOLERANCE) {
          val = snap;
          break;
        }
      }
    }
    return Math.round(val * 100) / 100;
  }

  function atualizarVelocidade(novoValor, aplicarIma = true) {
    const vel = normalizarVelocidadeComIma(novoValor, aplicarIma);
    state.velocidade = vel;

    if (el.speedSlider) el.speedSlider.value = vel.toFixed(2);
    if (el.speedDisplayBadge) el.speedDisplayBadge.textContent = `${vel.toFixed(2)}x`;

    el.speedPresetBtns.forEach((btn) => {
      const preset = parseFloat(btn.getAttribute("data-speed-preset"));
      const ativo = Math.abs(vel - preset) < 0.005;
      btn.classList.toggle("border-amber-400/60", ativo);
      btn.classList.toggle("bg-amber-500/10", ativo);
      btn.classList.toggle("border-slate-800", !ativo);
    });

    let rotuloRitmo = "Personalizada";
    if (Math.abs(vel - 0.85) < 0.005) rotuloRitmo = "Lenta — Ideal p/ leis e textos densos";
    else if (Math.abs(vel - 1.0) < 0.005) rotuloRitmo = "Normal — Cadência natural fluida";
    else if (Math.abs(vel - 1.25) < 0.005) rotuloRitmo = "Rápida — Revisão e ganho de tempo";

    if (el.speedHintText) {
      el.speedHintText.innerHTML = `Ritmo selecionado: <strong class="text-amber-300">${vel.toFixed(2)}x (${rotuloRitmo})</strong> — Este valor exato será aplicado na síntese neural e no áudio que você está ouvindo agora.`;
    }

    aplicarVelocidadeNoAudioAtivo(vel);
    atualizarResumoPedido();
  }

  function alternarIdiomaCatalogo(novoIdioma, origemAuto = false) {
    if (novoIdioma !== "pt" && novoIdioma !== "en") return;
    if (state.vozTocandoSigla) {
      pararPreviewVoz();
    }
    state.idioma = novoIdioma;

    const lista = VOZES_CATALOGO[novoIdioma] || VOZES_CATALOGO.pt;
    if (!lista.some((v) => v.sigla === state.vozId)) {
      state.vozId = lista[0].sigla;
    }

    if (el.langBtnPt && el.langBtnEn) {
      const isPt = novoIdioma === "pt";
      el.langBtnPt.className = isPt
        ? "lang-tab-btn active-lang inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow transition"
        : "lang-tab-btn inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition";
      el.langBtnEn.className = !isPt
        ? "lang-tab-btn active-lang inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow transition"
        : "lang-tab-btn inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition";
    }

    if (el.docDetectedLangBadge && state.totalCaracteres > 0) {
      el.docDetectedLangBadge.textContent =
        novoIdioma === "en"
          ? `🇺🇸 Idioma: Inglês${origemAuto ? " (Autodetectado)" : ""}`
          : `🇧🇷 Idioma: Português${origemAuto ? " (Autodetectado)" : ""}`;
    }

    renderizarCatalogoVozes();
    renderizarMapeadorCapitulos();
    atualizarResumoPedido();
  }

  // ==========================================================================
  // 6. EXTRAÇÃO DE TEXTO E DETECÇÃO ESTRUTURAL DE CAPÍTULOS (.PDF, .DOCX, .TXT, .MD)
  // ==========================================================================
  function atualizarBarraLeitura(percent, textoStatus) {
    if (!el.readingProgressBox) return;
    el.readingProgressBox.classList.remove("hidden");
    if (el.readingStatusText && textoStatus) el.readingStatusText.textContent = textoStatus;
    if (el.readingPercentText) el.readingPercentText.textContent = `${Math.round(percent)}%`;
    if (el.readingProgressBar) el.readingProgressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  // Verifica se uma linha reconstruída tem padrão de título de capítulo/seção
  function ehLinhaTituloCapitulo(limpa) {
    if (!limpa || limpa.length < 3 || limpa.length > 120) return false;
    // Ignora linhas de sumário com pontilhados "Capítulo 1 ....... 12"
    if (/\.{4,}\s*\d+$/.test(limpa)) return false;
    // Ignora linhas puramente numéricas (números de página)
    if (/^\d+$/.test(limpa)) return false;

    const padraoExplicito =
      /^(?:#{1,4}\s+.+|(?:cap[íi]tulo|chapter|se[çc][ãa]o|section|parte|part|unidade|unit|m[óo]dulo|module|aula|lesson|livro|book|t[íi]tulo|title|anexo|appendix|introdu[çc][ãa]o|introduction|conclus[ãa]o|conclusion|pref[áa]cio|preface|resumo|abstract)\b[\s\dIVXLCDM.:—–-]*.*)$/i;
    if (padraoExplicito.test(limpa)) return true;

    // Numeração estrutural no início da linha: "1. Introdução", "1.1 Conceitos", "I - Fundamentos"
    const padraoNumerado =
      /^(?:\d{1,2}(?:\.\d{1,2}){0,2}(?:\s*[-–—.)]|\s+)\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n]{2,90}|[IVXLCDM]{1,5}\s*[-–—.]\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n]{2,90})$/;
    if (padraoNumerado.test(limpa)) return true;

    return false;
  }

  function detectarCapitulosNoTexto(textoCompleto, nomeFallback = "Documento Completo") {
    const linhas = (textoCompleto || "").split(/\r?\n/);
    const encontrados = [];
    const vistos = new Set();

    for (const linha of linhas) {
      const limpa = linha.trim().replace(/\s+/g, " ");
      if (!ehLinhaTituloCapitulo(limpa)) continue;
      const tituloLimpo = limpa.replace(/^#{1,6}\s*/, "").slice(0, 90);
      const chaveNorm = tituloLimpo.toLowerCase();
      if (vistos.has(chaveNorm)) continue;
      vistos.add(chaveNorm);
      encontrados.push({
        numero: encontrados.length + 1,
        titulo: tituloLimpo,
      });
      if (encontrados.length >= 60) break;
    }

    if (encontrados.length === 0) {
      return [{ numero: 1, titulo: nomeFallback }];
    }
    return encontrados;
  }

  // Reconstrói as linhas reais de uma página do PDF agrupando os fragmentos pelo eixo Y (`transform[5]`)
  function reconstruirLinhasPaginaPdf(items) {
    if (!items || !items.length) return { textoPagina: "", candidatosTitulo: [] };
    const fragmentos = [];

    for (const it of items) {
      const str = (it.str || "").trim();
      if (!str) continue;
      const tr = it.transform || [1, 0, 0, 1, 0, 0];
      const x = typeof tr[4] === "number" ? tr[4] : 0;
      const y = typeof tr[5] === "number" ? tr[5] : 0;
      const alt = Math.max(Math.abs(tr[0] || 0), Math.abs(tr[3] || 0), it.height || 10);
      fragmentos.push({ str, x, y, alt });
    }

    if (!fragmentos.length) return { textoPagina: "", candidatosTitulo: [] };

    // Ordena de cima para baixo (Y decrescente no sistema de coordenadas do PDF) e da esquerda para a direita (X crescente)
    fragmentos.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3.5) return b.y - a.y;
      return a.x - b.x;
    });

    const linhas = [];
    let linhaAtual = null;
    for (const f of fragmentos) {
      if (!linhaAtual || Math.abs(f.y - linhaAtual.y) > 3.5) {
        if (linhaAtual) linhas.push(linhaAtual);
        linhaAtual = { y: f.y, textos: [f.str], maxAlt: f.alt };
      } else {
        linhaAtual.textos.push(f.str);
        if (f.alt > linhaAtual.maxAlt) linhaAtual.maxAlt = f.alt;
      }
    }
    if (linhaAtual) linhas.push(linhaAtual);

    // Calcula a altura mediana da fonte na página para detectar cabeçalhos tipográficos maiores
    const alturasOrd = linhas.map((l) => l.maxAlt).sort((a, b) => a - b);
    const medianaAlt = alturasOrd[Math.floor(alturasOrd.length / 2)] || 10;

    const linhasTexto = [];
    const candidatosTitulo = [];

    for (const l of linhas) {
      const txt = l.textos.join(" ").replace(/\s+/g, " ").trim();
      if (!txt) continue;
      linhasTexto.push(txt);

      if (ehLinhaTituloCapitulo(txt)) {
        candidatosTitulo.push(txt);
      } else if (
        l.maxAlt >= medianaAlt * 1.22 &&
        txt.length >= 4 &&
        txt.length <= 85 &&
        !/[.!?;,:]$/.test(txt) &&
        !/^\d+$/.test(txt) &&
        !/\.{4,}/.test(txt)
      ) {
        candidatosTitulo.push(txt);
      }
    }

    return {
      textoPagina: linhasTexto.join("\n"),
      candidatosTitulo,
    };
  }

  async function extrairPdfNoNavegador(file) {
    if (!window.pdfjsLib) {
      throw new Error("Biblioteca PDF.js não carregada. Verifique sua conexão com a internet.");
    }
    atualizarBarraLeitura(10, `Abrindo PDF (${file.name})...`);
    const buffer = await file.arrayBuffer();
    const bytesPrincipais = new Uint8Array(buffer);
    let pdf;
    try {
      // Se estiver rodando localmente via file://, desativa o WebWorker externo para evitar bloqueio CORS e transferir o ArrayBuffer
      const isFileProtocol = window.location.protocol === "file:";
      pdf = await window.pdfjsLib.getDocument({
        data: bytesPrincipais.slice(0),
        disableWorker: isFileProtocol,
      }).promise;
    } catch (_workerErr) {
      pdf = await window.pdfjsLib.getDocument({
        data: bytesPrincipais.slice(0),
        disableWorker: true,
      }).promise;
    }
    const numPages = pdf.numPages || 1;
    let textoAcumulado = "";
    const titulosPorLayout = [];

    // 1. Tenta ler o sumário/bookmarks nativos do PDF (getOutline)
    let capitulosOutline = [];
    try {
      const outline = await pdf.getOutline();
      if (Array.isArray(outline) && outline.length > 0) {
        const vistosOut = new Set();
        const varrerOutline = (itens, nivel = 1) => {
          for (const item of itens || []) {
            const t = (item.title || "").trim().replace(/\s+/g, " ");
            if (t && t.length >= 2 && !vistosOut.has(t.toLowerCase())) {
              vistosOut.add(t.toLowerCase());
              capitulosOutline.push({
                numero: capitulosOutline.length + 1,
                titulo: t.slice(0, 90),
              });
            }
            if (nivel < 2 && Array.isArray(item.items) && item.items.length > 0 && capitulosOutline.length < 60) {
              varrerOutline(item.items, nivel + 1);
            }
          }
        };
        varrerOutline(outline, 1);
      }
    } catch (_) {}

    // 2. Extrai o texto página a página reconstruindo quebras de linha e cabeçalhos tipográficos
    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const { textoPagina, candidatosTitulo } = reconstruirLinhasPaginaPdf(content.items || []);
      textoAcumulado += textoPagina + "\n\n";
      for (const cand of candidatosTitulo) {
        titulosPorLayout.push(cand);
      }
      if (p % 3 === 0 || p === numPages) {
        atualizarBarraLeitura((p / numPages) * 100, `Lendo página ${p} de ${numPages} (${file.name})...`);
      }
    }

    let capitulos = [];
    if (capitulosOutline.length >= 1) {
      capitulos = capitulosOutline.slice(0, 60);
    } else if (titulosPorLayout.length >= 1) {
      const vistos = new Set();
      for (const t of titulosPorLayout) {
        const limpo = t.replace(/^#{1,6}\s*/, "").trim().slice(0, 90);
        const k = limpo.toLowerCase();
        if (!limpo || vistos.has(k)) continue;
        vistos.add(k);
        capitulos.push({ numero: capitulos.length + 1, titulo: limpo });
        if (capitulos.length >= 60) break;
      }
    }

    if (capitulos.length === 0) {
      capitulos = detectarCapitulosNoTexto(textoAcumulado, file.name);
    }

    return {
      texto: textoAcumulado.trim(),
      paginas: numPages,
      capitulos,
    };
  }

  async function extrairDocxNoNavegador(file) {
    if (!window.mammoth) {
      throw new Error("Biblioteca Mammoth.js não carregada. Verifique sua conexão com a internet.");
    }
    atualizarBarraLeitura(35, `Extraindo texto e títulos do Word (${file.name})...`);
    const buffer = await file.arrayBuffer();
    const bufferCopiaHtml = buffer.slice(0);

    const rawRes = await window.mammoth.extractRawText({ arrayBuffer: buffer });
    let htmlRes = { value: "" };
    try {
      htmlRes = await window.mammoth.convertToHtml({ arrayBuffer: bufferCopiaHtml });
    } catch (_) {}

    const texto = (rawRes.value || "").trim();
    const paginas = Math.max(1, Math.ceil(texto.length / CONFIG_COMERCIAL.COM_CHARS_POR_PAGINA));

    // Extrai capítulos reais das tags <h1>..<h4> e parágrafos curtos em negrito do HTML gerado pelo Mammoth
    const capitulosHtml = [];
    if (htmlRes && htmlRes.value) {
      try {
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(htmlRes.value, "text/html");
        const vistos = new Set();

        const headings = docHtml.querySelectorAll("h1, h2, h3, h4");
        headings.forEach((h) => {
          const t = (h.textContent || "").trim().replace(/\s+/g, " ");
          if (t && t.length >= 2 && t.length <= 110 && !vistos.has(t.toLowerCase())) {
            vistos.add(t.toLowerCase());
            capitulosHtml.push({
              numero: capitulosHtml.length + 1,
              titulo: t.slice(0, 90),
            });
          }
        });

        // Se o DOCX não usou estilos Heading formais, inspeciona parágrafos com padrão de título ou <strong> isolado
        if (capitulosHtml.length === 0) {
          const paragrafos = docHtml.querySelectorAll("p");
          paragrafos.forEach((p) => {
            const t = (p.textContent || "").trim().replace(/\s+/g, " ");
            if (!t || t.length < 3 || t.length > 100) return;
            const strongFilho = p.querySelector("strong, b");
            const tudoNegrito =
              strongFilho &&
              (strongFilho.textContent || "").trim().replace(/\s+/g, " ").length >= t.length * 0.85;
            if (ehLinhaTituloCapitulo(t) || (tudoNegrito && !/[.!?;,:]$/.test(t) && t.length <= 75)) {
              const k = t.toLowerCase();
              if (!vistos.has(k)) {
                vistos.add(k);
                capitulosHtml.push({
                  numero: capitulosHtml.length + 1,
                  titulo: t.slice(0, 90),
                });
              }
            }
          });
        }
      } catch (_) {}
    }

    atualizarBarraLeitura(100, "Documento DOCX processado.");
    const capitulos =
      capitulosHtml.length > 0
        ? capitulosHtml.slice(0, 60)
        : detectarCapitulosNoTexto(texto, file.name);

    return { texto, paginas, capitulos };
  }

  async function extrairTxtOuMdNoNavegador(file) {
    atualizarBarraLeitura(50, `Lendo arquivo de texto (${file.name})...`);
    const texto = (await file.text()).trim();
    atualizarBarraLeitura(100, "Texto carregado.");
    const paginas = Math.max(1, Math.ceil(texto.length / CONFIG_COMERCIAL.COM_CHARS_POR_PAGINA));
    const capitulos = detectarCapitulosNoTexto(texto, file.name);
    return { texto, paginas, capitulos };
  }

  // Recalcula todos os totais agregados a partir de `state.arquivos`
  function recalcularAgregadosDocumentos() {
    if (!state.arquivos.length) {
      state.arquivo = null;
      state.nomeArquivo = "";
      state.tamanhoBytes = 0;
      state.totalCaracteres = 0;
      state.paginasEstimadas = 0;
      state.capitulosDetectados = [{ numero: 1, titulo: "Documento Completo" }];
      state.valorCalculado = CONFIG_COMERCIAL.COM_VALOR_MINIMO;
      return;
    }

    state.arquivo = state.arquivos[0].file;
    state.nomeArquivo =
      state.arquivos.length === 1
        ? state.arquivos[0].nome
        : `${state.arquivos.length} documentos anexados (${state.arquivos.map((a) => a.nome).join(", ")})`;

    state.tamanhoBytes = state.arquivos.reduce((acc, a) => acc + a.tamanhoBytes, 0);
    state.totalCaracteres = state.arquivos.reduce((acc, a) => acc + a.caracteres, 0);
    state.paginasEstimadas = state.arquivos.reduce((acc, a) => acc + a.paginas, 0);

    const capsAgregados = [];
    const multiArq = state.arquivos.length > 1;
    for (const arqItem of state.arquivos) {
      const capsDoc = arqItem.capitulos && arqItem.capitulos.length
        ? arqItem.capitulos
        : [{ numero: 1, titulo: arqItem.nome }];
      for (const c of capsDoc) {
        const numGlobal = capsAgregados.length + 1;
        const rotulo = multiArq ? `[${arqItem.nome}] ${c.titulo}` : c.titulo;
        capsAgregados.push({
          numero: numGlobal,
          titulo: rotulo,
        });
      }
    }

    state.capitulosDetectados = capsAgregados.length
      ? capsAgregados
      : [{ numero: 1, titulo: "Documento Completo" }];
    state.valorCalculado = calcularPrecoPorCaracteres(state.totalCaracteres);
  }

  function renderizarListaArquivosAnexados() {
    if (!el.attachedFilesList) return;
    el.attachedFilesList.innerHTML = "";

    state.arquivos.forEach((item, index) => {
      const qtdCaps = item.capitulos ? item.capitulos.length : 1;
      const row = document.createElement("div");
      row.className =
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs";
      row.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20 font-mono text-[10px] font-bold text-amber-300">${index + 1}</span>
          <span class="font-semibold text-white truncate" title="${item.nome}">${item.nome}</span>
          <span class="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">${formatarBytes(item.tamanhoBytes)}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-mono text-[11px] text-slate-300">${formatarInteiro(item.caracteres)} chars · ${item.paginas} pág. · <strong class="text-amber-300">${qtdCaps} cap./seç.</strong></span>
          <button
            type="button"
            data-remove-file-id="${item.id}"
            class="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-slate-300 hover:border-red-400 hover:text-red-300 transition"
            title="Remover este arquivo do pedido"
          >
            ✕ Remover
          </button>
        </div>
      `;

      const btnRem = row.querySelector("[data-remove-file-id]");
      btnRem.addEventListener("click", () => {
        removerArquivoAnexado(item.id);
      });

      el.attachedFilesList.appendChild(row);
    });
  }

  function atualizarCardsResumoDocumentos() {
    if (!state.arquivos.length) {
      if (el.docSummaryCard) el.docSummaryCard.classList.add("hidden");
      atualizarFluxoEtapas(1);
      renderizarMapeadorCapitulos();
      atualizarResumoPedido();
      return;
    }

    if (el.docFileName) {
      el.docFileName.textContent =
        state.arquivos.length === 1
          ? `${state.arquivos[0].nome} (${formatarBytes(state.tamanhoBytes)})`
          : `${state.arquivos.length} documentos no pedido (${formatarBytes(state.tamanhoBytes)} no total)`;
    }

    if (el.docQualityBadge) {
      const mediaCharsPag = Math.round(state.totalCaracteres / Math.max(1, state.paginasEstimadas));
      el.docQualityBadge.textContent = `Camada de texto validada (~${formatarInteiro(mediaCharsPag)} caracteres/página · ${state.capitulosDetectados.length} seção/capítulo(s) identificado(s))`;
    }

    if (el.docCharsCount) el.docCharsCount.textContent = formatarInteiro(state.totalCaracteres);
    if (el.docPagesCount) el.docPagesCount.textContent = formatarInteiro(state.paginasEstimadas);
    if (el.docChaptersCount) el.docChaptersCount.textContent = formatarInteiro(state.capitulosDetectados.length);
    if (el.docChaptersSubnote) {
      el.docChaptersSubnote.textContent =
        state.arquivos.length > 1
          ? `Soma dos ${state.arquivos.length} arquivos`
          : state.capitulosDetectados.length > 1
          ? "Títulos/seções detectados"
          : "Seção única contínua";
    }
    if (el.docPriceCount) el.docPriceCount.textContent = formatarBRL(state.valorCalculado);

    const bruto = state.totalCaracteres * CONFIG_COMERCIAL.COM_VALOR_CARACTERE;
    if (el.docPriceFormulaNote) {
      el.docPriceFormulaNote.textContent =
        bruto < CONFIG_COMERCIAL.COM_VALOR_MINIMO
          ? `Bruto ${formatarBRL(bruto)} → Piso R$ 1,00`
          : `${formatarInteiro(state.totalCaracteres)} × R$ 0,00005`;
    }

    renderizarListaArquivosAnexados();
    if (el.docSummaryCard) el.docSummaryCard.classList.remove("hidden");
    dispararFlashPreco();
    renderizarMapeadorCapitulos();
    atualizarResumoPedido();
  }

  function removerArquivoAnexado(idArquivo) {
    state.arquivos = state.arquivos.filter((a) => a.id !== idArquivo);
    recalcularAgregadosDocumentos();
    atualizarCardsResumoDocumentos();
  }

  async function processarArquivosSelecionados(fileList, acrescentar = true) {
    revalidarReferenciasDom();
    const lista = Array.from(fileList || []);
    if (!lista.length) return;

    if (el.ocrErrorAlert) el.ocrErrorAlert.classList.add("hidden");
    atualizarBarraLeitura(5, `Carregando ${lista.length} arquivo(s)...`);

    if (!acrescentar) {
      state.arquivos = [];
    }

    const errosOcr = [];
    let ultimoIdiomaDetectado = null;

    for (let i = 0; i < lista.length; i++) {
      const file = lista[i];
      const nome = file.name || `documento_${i + 1}`;
      const ext = nome.includes(".") ? "." + nome.split(".").pop().toLowerCase() : "";

      if (![".pdf", ".docx", ".txt", ".md"].includes(ext)) {
        errosOcr.push(`"${nome}": Formato não suportado (${ext || "desconhecido"}). Use .PDF, .DOCX, .TXT ou .MD.`);
        continue;
      }

      try {
        let resultado;
        if (ext === ".pdf") {
          resultado = await extrairPdfNoNavegador(file);
        } else if (ext === ".docx") {
          resultado = await extrairDocxNoNavegador(file);
        } else {
          resultado = await extrairTxtOuMdNoNavegador(file);
        }

        const totalChars = (resultado.texto || "").length;
        const paginas = Math.max(1, resultado.paginas || 1);
        const mediaCharsPorPag = totalChars / paginas;

        // Regra Anti-OCR: barra PDFs escaneados ou arquivos vazios
        if (
          totalChars < CONFIG_COMERCIAL.COM_MIN_CHARS_PAGINA ||
          (ext === ".pdf" && mediaCharsPorPag < CONFIG_COMERCIAL.COM_MIN_CHARS_PAGINA)
        ) {
          errosOcr.push(
            `"${nome}": Apenas ${formatarInteiro(totalChars)} caracteres extraídos em ${paginas} página(s) (média de ${Math.round(
              mediaCharsPorPag
            )} chars/pág., mínimo exigido: ${CONFIG_COMERCIAL.COM_MIN_CHARS_PAGINA}). Parece ser um PDF escaneado (imagem sem texto selecionável).`
          );
          continue;
        }

        const idiomaDetectado = detectarIdiomaTexto(resultado.texto, nome);
        ultimoIdiomaDetectado = idiomaDetectado;

        // Se já existir arquivo com mesmo nome e tamanho na lista, substitui para evitar duplicata acidental
        const idxExistente = state.arquivos.findIndex(
          (a) => a.nome === nome && a.tamanhoBytes === file.size
        );
        const novoItem = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file,
          nome,
          tamanhoBytes: file.size || 0,
          caracteres: totalChars,
          paginas,
          capitulos:
            resultado.capitulos && resultado.capitulos.length
              ? resultado.capitulos
              : [{ numero: 1, titulo: nome }],
          idiomaDetectado,
        };

        if (idxExistente >= 0) {
          state.arquivos[idxExistente] = novoItem;
        } else {
          state.arquivos.push(novoItem);
        }
      } catch (err) {
        errosOcr.push(`"${nome}": Falha ao ler arquivo (${err.message || err}).`);
      }
    }

    if (el.readingProgressBox) el.readingProgressBox.classList.add("hidden");

    if (errosOcr.length > 0 && el.ocrErrorAlert && el.ocrErrorDetail) {
      el.ocrErrorDetail.textContent = errosOcr.join(" | ");
      el.ocrErrorAlert.classList.remove("hidden");
    }

    recalcularAgregadosDocumentos();

    if (ultimoIdiomaDetectado && state.arquivos.length > 0) {
      alternarIdiomaCatalogo(ultimoIdiomaDetectado, true);
    }

    atualizarCardsResumoDocumentos();
    if (state.arquivos.length > 0) {
      atualizarFluxoEtapas(2);
    }
  }

  // ==========================================================================
  // 7. ESTIMATIVA DINÂMICA DE TEMPO E RESUMO DO PEDIDO
  // ==========================================================================
  function calcularMinutosConversaoLocal(totalChars) {
    const bytesEst = Math.max(1500, totalChars);
    const numPartes = Math.min(
      CONFIG_COMERCIAL.CPU_WORKERS_TOTAIS,
      Math.max(1, Math.ceil(bytesEst / CONFIG_COMERCIAL.PARTICAO_PISO_BYTES))
    );
    const bytesNoWorkerMaisPesado = Math.ceil(bytesEst / numPartes);

    const segSetup = CONFIG_COMERCIAL.CPU_SETUP_SEG;
    const segSintese =
      CONFIG_COMERCIAL.CPU_BASE_SEG + CONFIG_COMERCIAL.CPU_S_POR_BYTE * bytesNoWorkerMaisPesado;
    const segPos = CONFIG_COMERCIAL.CPU_ORQ_POS_SEG;

    const minutosBrutos = (segSetup + segSintese + segPos) / 60.0;
    const minutosComMargem = Math.ceil(minutosBrutos * CONFIG_COMERCIAL.COM_MARGEM_SEGURANCA);
    return Math.max(20, minutosComMargem);
  }

  function atualizarResumoPedido() {
    const preco = calcularPrecoPorCaracteres(state.totalCaracteres);
    state.valorCalculado = preco;

    const minProprio = calcularMinutosConversaoLocal(state.totalCaracteres);
    const minTotais = state.filaMinutosFrente + minProprio;
    state.prazoEstimadoMinutos = minTotais;

    const agora = new Date();
    const entregaDate = new Date(agora.getTime() + minTotais * 60 * 1000);
    const hh = String(entregaDate.getHours()).padStart(2, "0");
    const mm = String(entregaDate.getMinutes()).padStart(2, "0");
    state.horarioEntregaFormatado = `${hh}:${mm}`;

    if (el.priceDisplay) el.priceDisplay.textContent = formatarBRL(preco);
    if (el.docPriceCount) el.docPriceCount.textContent = formatarBRL(preco);

    if (el.summaryDocStatus) {
      el.summaryDocStatus.textContent =
        state.totalCaracteres > 0
          ? `${state.arquivos.length} arq. · ${formatarInteiro(state.totalCaracteres)} chars (${state.capitulosDetectados.length} cap.)`
          : "Aguardando arquivo...";
      el.summaryDocStatus.className =
        state.totalCaracteres > 0
          ? "font-mono font-semibold text-white"
          : "font-mono font-semibold text-slate-400";
    }

    if (el.priceFormulaHint) {
      if (state.totalCaracteres <= 0) {
        el.priceFormulaHint.textContent = "Mín. R$ 1,00 (até 20.000 chars)";
      } else {
        const bruto = state.totalCaracteres * CONFIG_COMERCIAL.COM_VALOR_CARACTERE;
        el.priceFormulaHint.textContent =
          bruto < CONFIG_COMERCIAL.COM_VALOR_MINIMO
            ? `Bruto ${formatarBRL(bruto)} → Piso R$ 1,00`
            : `${formatarInteiro(state.totalCaracteres)} × R$ 0,00005 = ${formatarBRL(preco)}`;
      }
    }

    if (el.generatePixBtn) {
      el.generatePixBtn.textContent = `Gerar QR Code PIX (${formatarBRL(preco)}) e Iniciar Conversão`;
    }

    if (el.estConversionTime) {
      el.estConversionTime.textContent = `~${minProprio} min`;
    }

    if (el.estQueueStatus) {
      if (state.filaPedidosFrente <= 0) {
        el.estQueueStatus.textContent = "Livre (0 pedidos na frente)";
        el.estQueueStatus.className = "font-mono font-semibold text-emerald-300";
      } else {
        el.estQueueStatus.textContent = `${state.filaPedidosFrente} pedido(s) (+${state.filaMinutosFrente} min)`;
        el.estQueueStatus.className = "font-mono font-semibold text-amber-300";
      }
    }

    const modoLabel =
      state.modoVoz === "unica"
        ? `Voz: ${state.vozId}`
        : state.modoVoz === "por_capitulo"
        ? "Vozes p/ capítulo"
        : "Vozes aleatórias";
    const fmtLabel = state.formatoSaida === "capitulos" ? ".zip (capítulos)" : ".mp3 único";
    const langLabel = state.idioma === "en" ? "EN" : "PT-BR";

    if (el.estConfigSummary) {
      el.estConfigSummary.textContent = `${langLabel} · ${modoLabel} · ${state.velocidade.toFixed(2)}x · ${fmtLabel}`;
    }

    if (el.estDeliveryClock) {
      el.estDeliveryClock.textContent = `Hoje às ${state.horarioEntregaFormatado} (~${minTotais} min)`;
    }
  }

  // ==========================================================================
  // 8. INTEGRAÇÃO CLICK-TO-CHAT WHATSAPP (JANELA DE 24H META CLOUD API)
  // ==========================================================================
  function atualizarLinkWhatsappClickToChat() {
    const numPublico = CONFIG_COMERCIAL.COM_WHATSAPP_NUMERO_PUBLICO.replace(/\D/g, "");
    const nome = (el.clientName?.value || "").trim();
    const saudacao = nome
      ? `Oi! Aqui é ${nome}. Quero receber meu audiobook do TocaTexto pelo WhatsApp.`
      : `Oi! Quero receber meu audiobook do TocaTexto pelo WhatsApp.`;
    const url = `https://wa.me/${numPublico}?text=${encodeURIComponent(saudacao)}`;
    if (el.waClickToChatBtn) el.waClickToChatBtn.href = url;
    if (el.modalWaClickToChatBtn) el.modalWaClickToChatBtn.href = url;
  }

  // ==========================================================================
  // 9. CONSTRUÇÃO DO CONTRATO `pedido.json` E CHECKOUT PIX
  // ==========================================================================
  function construirContratoPedidoJson() {
    const agora = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(
      agora.getHours()
    )}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`;
    const idPedido = `PED-${ts}`;

    const arquivosMeta = state.arquivos.map((a) => ({
      arquivo: a.nome,
      tamanho_bytes: a.tamanhoBytes,
      total_caracteres: a.caracteres,
      paginas_estimadas: a.paginas,
      capitulos_estimados: a.capitulos ? a.capitulos.length : 1,
      idioma_detectado: a.idiomaDetectado,
    }));

    return {
      id_pedido: idPedido,
      data_hora: agora.toISOString(),
      cliente: {
        nome: (el.clientName?.value || "").trim(),
        email: (el.clientEmail?.value || "").trim(),
        whatsapp: (el.clientWhatsapp?.value || "").replace(/\D/g, ""),
        janela_whatsapp_ativa: Boolean(state.janelaWhatsappAtiva),
      },
      documento: {
        arquivo: state.arquivos[0]?.nome || "documento.txt",
        arquivos: arquivosMeta,
        quantidade_arquivos: state.arquivos.length,
        tamanho_bytes: state.tamanhoBytes,
        total_caracteres: state.totalCaracteres,
        paginas_estimadas: state.paginasEstimadas,
        capitulos_estimados: state.capitulosDetectados.length,
        valor_pago: state.valorCalculado,
      },
      configuracoes: {
        idioma: state.idioma,
        modo_voz: state.modoVoz,
        voz_id: state.vozId,
        vozes_capitulos: state.modoVoz === "por_capitulo" ? state.vozesCapitulos : {},
        velocidade: state.velocidade,
        formato_saida: state.formatoSaida,
        nivel_titulo: 1,
      },
      prazos: {
        prazo_estimado_minutos: state.prazoEstimadoMinutos,
        horario_estimado_entrega: state.horarioEntregaFormatado,
        link_dias_expira: CONFIG_COMERCIAL.COM_LINK_DIAS_EXPIRA,
      },
    };
  }

  function gerarPayloadPixSimulado(pedido) {
    const valorFmt = pedido.documento.valor_pago.toFixed(2);
    return `00020126580014BR.GOV.BCB.PIX0136tocatexto-pix-${pedido.id_pedido.toLowerCase()}520400005303986540${
      valorFmt.length
    }${valorFmt}5802BR5909TOCATEXTO6008CAMPINAS62070503***6304ABCD`;
  }

  function abrirModalPix(pedido) {
    state.ultimoPedidoCriado = pedido;
    const codigoPix = gerarPayloadPixSimulado(pedido);

    if (el.pixModalOrderId) el.pixModalOrderId.textContent = pedido.id_pedido;
    if (el.pixModalAmount) el.pixModalAmount.textContent = formatarBRL(pedido.documento.valor_pago);
    if (el.pixCopyPasteInput) el.pixCopyPasteInput.value = codigoPix;

    if (el.pixQrImage) {
      el.pixQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        codigoPix
      )}`;
    }

    if (el.pixPendingStage) el.pixPendingStage.classList.remove("hidden");
    if (el.pixApprovedStage) el.pixApprovedStage.classList.add("hidden");
    if (el.pixModal) {
      el.pixModal.classList.remove("hidden");
      el.pixModal.classList.add("flex");
    }
  }

  function fecharModalPix() {
    if (!el.pixModal) return;
    el.pixModal.classList.add("hidden");
    el.pixModal.classList.remove("flex");
  }

  function confirmarPixNoModal() {
    const ped = state.ultimoPedidoCriado;
    if (!ped) return;
    if (el.pixPendingStage) el.pixPendingStage.classList.add("hidden");
    if (el.pixApprovedStage) el.pixApprovedStage.classList.remove("hidden");
    if (el.approvedOrderIdText) el.approvedOrderIdText.textContent = ped.id_pedido;
    if (el.approvedEtaText) {
      el.approvedEtaText.textContent = `hoje às ${ped.prazos.horario_estimado_entrega} (~${ped.prazos.prazo_estimado_minutos} min)`;
    }
  }

  function baixarPedidoJsonLocal() {
    const ped = state.ultimoPedidoCriado || construirContratoPedidoJson();
    const blob = new Blob([JSON.stringify(ped, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedido.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // 10. EVENT LISTENERS E INICIALIZAÇÃO
  // ==========================================================================
  function registrarEventos() {
    const abrirSeletorArquivos = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const inp = el.fileInput || document.getElementById("fileInput");
      if (!inp) return;
      inp.value = "";
      try {
        if (typeof inp.showPicker === "function") {
          inp.showPicker();
          return;
        }
      } catch (_) {}
      inp.click();
    };

    if (el.fileInput) {
      el.fileInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      el.fileInput.addEventListener("change", async (e) => {
        const selecionados = e.target.files ? Array.from(e.target.files) : [];
        if (selecionados.length > 0) {
          await processarArquivosSelecionados(selecionados, true);
          e.target.value = "";
        }
      });
    }

    // Botão de "+ Anexar mais arquivos" no resumo do Card 01
    if (el.addMoreFilesBtn) {
      el.addMoreFilesBtn.addEventListener("click", abrirSeletorArquivos);
    }

    // Impede que o navegador abra o arquivo na aba caso o usuário solte na área da página
    ["dragover", "drop"].forEach((evtGlobal) => {
      window.addEventListener(
        evtGlobal,
        (e) => {
          if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files")) {
            e.preventDefault();
          }
        },
        false
      );
    });

    if (el.dropzone) {
      // Clique em qualquer ponto do dropzone abre o seletor de arquivos
      el.dropzone.addEventListener("click", (e) => {
        if (e.target === el.fileInput) return;
        abrirSeletorArquivos(e);
      });

      el.dropzone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          abrirSeletorArquivos(e);
        }
      });

      ["dragenter", "dragover"].forEach((evt) => {
        el.dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "copy";
          }
          el.dropzone.classList.add("drag-over");
        });
      });

      el.dropzone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!el.dropzone.contains(e.relatedTarget)) {
          el.dropzone.classList.remove("drag-over");
        }
      });

      el.dropzone.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.dropzone.classList.remove("drag-over");

        let listaDropped = [];
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          listaDropped = Array.from(e.dataTransfer.files);
        } else if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
          for (const item of Array.from(e.dataTransfer.items)) {
            if (item.kind === "file") {
              const f = item.getAsFile();
              if (f) listaDropped.push(f);
            }
          }
        }
        if (listaDropped.length > 0) {
          await processarArquivosSelecionados(listaDropped, true);
        }
      });
    }

    if (el.clearFileBtn) {
      el.clearFileBtn.addEventListener("click", () => {
        state.arquivos = [];
        recalcularAgregadosDocumentos();
        if (el.fileInput) el.fileInput.value = "";
        if (el.ocrErrorAlert) el.ocrErrorAlert.classList.add("hidden");
        atualizarCardsResumoDocumentos();
      });
    }

    // Abas de Idioma (PT-BR vs EN)
    if (el.langBtnPt) {
      el.langBtnPt.addEventListener("click", () => alternarIdiomaCatalogo("pt", false));
    }
    if (el.langBtnEn) {
      el.langBtnEn.addEventListener("click", () => alternarIdiomaCatalogo("en", false));
    }

    // Filtros do catálogo de vozes
    el.voiceFilterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.filtroVoz = btn.getAttribute("data-voice-filter") || "todas";
        el.voiceFilterBtns.forEach((b) => {
          const ativo = b === btn;
          b.className = ativo
            ? "voice-filter-btn active-filter rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 transition"
            : "voice-filter-btn rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs font-medium text-slate-300 hover:border-slate-700 transition";
        });
        renderizarCatalogoVozes();
      });
    });

    // Slider granular de velocidade em tempo real
    if (el.speedSlider) {
      el.speedSlider.addEventListener("input", (e) => {
        atualizarVelocidade(e.target.value, true);
      });
    }

    if (el.speedMinusBtn) {
      el.speedMinusBtn.addEventListener("click", () => {
        atualizarVelocidade(state.velocidade - 0.05, false);
      });
    }

    if (el.speedPlusBtn) {
      el.speedPlusBtn.addEventListener("click", () => {
        atualizarVelocidade(state.velocidade + 0.05, false);
      });
    }

    el.speedPresetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = parseFloat(btn.getAttribute("data-speed-preset"));
        atualizarVelocidade(preset, false);
      });
    });

    // Modos de voz (unica, por_capitulo, aleatoria)
    el.voiceModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const modo = btn.getAttribute("data-voice-mode") || "unica";
        state.modoVoz = modo;

        el.voiceModeBtns.forEach((b) => {
          const ativo = b === btn;
          b.classList.toggle("active-mode", ativo);
          b.classList.toggle("border-amber-400", ativo);
          b.classList.toggle("bg-amber-500/10", ativo);
          b.classList.toggle("border-slate-800", !ativo);
          b.classList.toggle("bg-slate-900/70", !ativo);
        });

        renderizarMapeadorCapitulos();
        atualizarResumoPedido();
      });
    });

    // Formato de saída (unico .mp3 vs capitulos .zip)
    el.outputFormatBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const fmt = btn.getAttribute("data-output-format") || "unico";
        state.formatoSaida = fmt;

        el.outputFormatBtns.forEach((b) => {
          const ativo = b === btn;
          b.classList.toggle("active-format", ativo);
          b.classList.toggle("border-amber-400", ativo);
          b.classList.toggle("bg-amber-500/10", ativo);
          b.classList.toggle("border-slate-800", !ativo);
          b.classList.toggle("bg-slate-900/70", !ativo);
        });

        atualizarResumoPedido();
      });
    });

    // Foco nos campos do Passo 03 ativa visualmente a Etapa 03
    [el.clientName, el.clientEmail, el.clientWhatsapp].forEach((inp) => {
      if (!inp) return;
      inp.addEventListener("focus", () => {
        if (state.totalCaracteres > 0) atualizarFluxoEtapas(3);
      });
    });

    if (el.clientName) {
      el.clientName.addEventListener("input", atualizarLinkWhatsappClickToChat);
    }

    if (el.waClickToChatBtn) {
      el.waClickToChatBtn.addEventListener("click", () => {
        state.janelaWhatsappAtiva = true;
        if (el.waActivatedBadge) el.waActivatedBadge.classList.remove("hidden");
      });
    }

    // Submissão do formulário e abertura do modal PIX
    if (el.orderForm) {
      el.orderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (el.formValidationError) el.formValidationError.classList.add("hidden");

        if (!state.arquivos.length || state.totalCaracteres <= 0) {
          if (el.formValidationError) {
            el.formValidationError.textContent =
              "Por favor, envie ao menos um documento válido (.PDF, .DOCX, .TXT ou .MD) no Passo 01 antes de gerar o PIX.";
            el.formValidationError.classList.remove("hidden");
          }
          atualizarFluxoEtapas(1);
          el.stepCard01?.scrollIntoView({ behavior: "smooth" });
          return;
        }

        const nome = (el.clientName?.value || "").trim();
        const email = (el.clientEmail?.value || "").trim();
        if (!nome || !email || !email.includes("@")) {
          if (el.formValidationError) {
            el.formValidationError.textContent =
              "Informe seu nome e um endereço de e-mail válido para receber o audiobook.";
            el.formValidationError.classList.remove("hidden");
          }
          return;
        }

        if (!el.termsCheckbox?.checked) {
          if (el.formValidationError) {
            el.formValidationError.textContent =
              "É obrigatório aceitar os Termos e Condições de Uso para iniciar a conversão.";
            el.formValidationError.classList.remove("hidden");
          }
          return;
        }

        pararPreviewVoz();
        const pedido = construirContratoPedidoJson();
        abrirModalPix(pedido);
      });
    }

    if (el.closePixModalBtn) {
      el.closePixModalBtn.addEventListener("click", fecharModalPix);
    }

    if (el.copyPixCodeBtn) {
      el.copyPixCodeBtn.addEventListener("click", () => {
        if (!el.pixCopyPasteInput) return;
        navigator.clipboard.writeText(el.pixCopyPasteInput.value).then(() => {
          el.copyPixCodeBtn.textContent = "Copiado!";
          setTimeout(() => {
            el.copyPixCodeBtn.textContent = "Copiar";
          }, 1800);
        });
      });
    }

    if (el.simulatePixApprovedBtn) {
      el.simulatePixApprovedBtn.addEventListener("click", confirmarPixNoModal);
    }

    if (el.downloadOrderJsonBtn) {
      el.downloadOrderJsonBtn.addEventListener("click", baixarPedidoJsonLocal);
    }
  }

  function revalidarReferenciasDom() {
    el.flowStepper = document.getElementById("flowStepper");
    el.stepperItem01 = document.getElementById("stepperItem01");
    el.stepperItem02 = document.getElementById("stepperItem02");
    el.stepperItem03 = document.getElementById("stepperItem03");
    el.stepperBadge01 = document.getElementById("stepperBadge01");
    el.stepperBadge02 = document.getElementById("stepperBadge02");
    el.stepperBadge03 = document.getElementById("stepperBadge03");
    el.stepperState01 = document.getElementById("stepperState01");
    el.stepperState02 = document.getElementById("stepperState02");
    el.stepperState03 = document.getElementById("stepperState03");
    el.stepCard01 = document.getElementById("stepCard01");
    el.stepCard02 = document.getElementById("stepCard02");
    el.stepCard03 = document.getElementById("stepCard03");
    el.step01LivePill = document.getElementById("step01LivePill");
    el.step02LivePill = document.getElementById("step02LivePill");
    el.step03LivePill = document.getElementById("step03LivePill");
    el.connector01to02 = document.getElementById("connector01to02");
    el.connector01Text = document.getElementById("connector01Text");
    el.connector02to03 = document.getElementById("connector02to03");
    el.connector02Text = document.getElementById("connector02Text");
    el.dropzone = document.getElementById("dropzone");
    el.fileInput = document.getElementById("fileInput");
    el.addMoreFilesBtn = document.getElementById("addMoreFilesBtn");
    el.attachedFilesList = document.getElementById("attachedFilesList");
    el.readingProgressBox = document.getElementById("readingProgressBox");
    el.readingStatusText = document.getElementById("readingStatusText");
    el.readingPercentText = document.getElementById("readingPercentText");
    el.readingProgressBar = document.getElementById("readingProgressBar");
    el.ocrErrorAlert = document.getElementById("ocrErrorAlert");
    el.ocrErrorDetail = document.getElementById("ocrErrorDetail");
    el.docSummaryCard = document.getElementById("docSummaryCard");
    el.docFileName = document.getElementById("docFileName");
    el.docDetectedLangBadge = document.getElementById("docDetectedLangBadge");
    el.docQualityBadge = document.getElementById("docQualityBadge");
    el.docCharsCount = document.getElementById("docCharsCount");
    el.docPagesCount = document.getElementById("docPagesCount");
    el.docChaptersCount = document.getElementById("docChaptersCount");
    el.docChaptersSubnote = document.getElementById("docChaptersSubnote");
    el.docPriceBox = document.getElementById("docPriceBox");
    el.docPriceCount = document.getElementById("docPriceCount");
    el.docPriceFormulaNote = document.getElementById("docPriceFormulaNote");
    el.clearFileBtn = document.getElementById("clearFileBtn");
    el.langBtnPt = document.getElementById("langBtnPt");
    el.langBtnEn = document.getElementById("langBtnEn");
    el.speedSlider = document.getElementById("speedSlider");
    el.speedDisplayBadge = document.getElementById("speedDisplayBadge");
    el.speedMinusBtn = document.getElementById("speedMinusBtn");
    el.speedPlusBtn = document.getElementById("speedPlusBtn");
    el.speedHintText = document.getElementById("speedHintText");
    el.speedPresetBtns = document.querySelectorAll(".speed-preset-btn");
    el.voiceModeBtns = document.querySelectorAll(".voice-mode-btn");
    el.outputFormatBtns = document.querySelectorAll(".output-format-btn");
    el.voiceFilterBtns = document.querySelectorAll(".voice-filter-btn");
    el.chapterVoiceMapper = document.getElementById("chapterVoiceMapper");
    el.chapterVoiceList = document.getElementById("chapterVoiceList");
    el.catalogLangCounter = document.getElementById("catalogLangCounter");
    el.selectedVoiceBadge = document.getElementById("selectedVoiceBadge");
    el.voicesGrid = document.getElementById("voicesGrid");
    el.audioSourceStatusText = document.getElementById("audioSourceStatusText");
    el.orderForm = document.getElementById("orderForm");
    el.clientName = document.getElementById("clientName");
    el.clientEmail = document.getElementById("clientEmail");
    el.clientWhatsapp = document.getElementById("clientWhatsapp");
    el.waClickToChatBtn = document.getElementById("waClickToChatBtn");
    el.waActivatedBadge = document.getElementById("waActivatedBadge");
    el.termsCheckbox = document.getElementById("termsCheckbox");
    el.formValidationError = document.getElementById("formValidationError");
    el.generatePixBtn = document.getElementById("generatePixBtn");
    el.priceDisplay = document.getElementById("priceDisplay");
    el.summaryDocStatus = document.getElementById("summaryDocStatus");
    el.priceFormulaHint = document.getElementById("priceFormulaHint");
    el.estConversionTime = document.getElementById("estConversionTime");
    el.estQueueStatus = document.getElementById("estQueueStatus");
    el.estConfigSummary = document.getElementById("estConfigSummary");
    el.estDeliveryClock = document.getElementById("estDeliveryClock");
    el.estDeliverySubtext = document.getElementById("estDeliverySubtext");
    el.heartbeatBadge = document.getElementById("heartbeatBadge");
    el.heartbeatDot = document.getElementById("heartbeatDot");
    el.heartbeatText = document.getElementById("heartbeatText");
    el.pixModal = document.getElementById("pixModal");
    el.closePixModalBtn = document.getElementById("closePixModalBtn");
    el.pixModalOrderId = document.getElementById("pixModalOrderId");
    el.pixPendingStage = document.getElementById("pixPendingStage");
    el.pixApprovedStage = document.getElementById("pixApprovedStage");
    el.pixQrImage = document.getElementById("pixQrImage");
    el.pixCopyPasteInput = document.getElementById("pixCopyPasteInput");
    el.copyPixCodeBtn = document.getElementById("copyPixCodeBtn");
    el.pixModalAmount = document.getElementById("pixModalAmount");
    el.simulatePixApprovedBtn = document.getElementById("simulatePixApprovedBtn");
    el.downloadOrderJsonBtn = document.getElementById("downloadOrderJsonBtn");
    el.approvedOrderIdText = document.getElementById("approvedOrderIdText");
    el.approvedEtaText = document.getElementById("approvedEtaText");
    el.modalWaClickToChatBtn = document.getElementById("modalWaClickToChatBtn");
    el.voicePreviewAudio = document.getElementById("voicePreviewAudio");
  }

  let _initialized = false;
  function init() {
    if (_initialized) return;
    revalidarReferenciasDom();
    if (!el.dropzone || !el.fileInput) return;
    _initialized = true;
    renderizarCatalogoVozes();
    atualizarVelocidade(1.0, false);
    atualizarLinkWhatsappClickToChat();
    atualizarFluxoEtapas(1);
    atualizarResumoPedido();
    registrarEventos();
    configurarScrollSpyStepper();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("load", init);
})();
