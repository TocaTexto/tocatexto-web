/**
 * ============================================================================
 * TOCATEXTO — FRONT-END APPLICATION (web_v12_00_config_comercial_dinamica)
 * ============================================================================
 * Serviços de Síntese Disponíveis:
 * 1. XTTSv2 (Qualidade Estúdio): 44 vozes neurais realistas (18 PT-BR · 26 EN),
 *    cota gratuita inicial de 200.000 chars (~100 pág.) + PIX no excedente
 *    (`max(1.00, chars_cobraveis * 0.00005)`), prazo calibrado em CPU Kaggle.
 * 2. Edge TTS (Ultrarrápido e 100% Gratuito): 12 vozes (3 PT-BR · 9 EN),
 *    arquitetura paralela de múltiplas instâncias simultâneas (espelhada no
 *    Whispr Flow Like Plus: 6 instâncias em blocos de ~1.200 chars), custo R$ 0,00
 *    (não consome cota XTTSv2) e estimativa própria bem mais rápida.
 *
 * Modernizações (modern-web-guidance):
 * - Native <dialog> com showModal(), closedby="any" + fallback Safari,
 *   transição top-layer com @starting-style / allow-discrete + fallback exit.
 * - Element.replaceChildren(), AbortSignal.timeout(), URLSearchParams, .toSorted().
 * - Validação pós-interação (:user-invalid) sincronizada com aria-invalid,
 *   aria-describedby dinâmico (data-error) e live region centralizada.
 * ============================================================================
 */

(() => {
  "use strict";

  // Configuração do worker do PDF.js
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // Constantes alinhadas ao grupo `servico_comercial`, calibração CPU XTTSv2 e medições Edge TTS (WFLP)
  const CONFIG_COMERCIAL = {
    COM_VALOR_CARACTERE: 0.00005,
    COM_VALOR_MINIMO: 1.0,
    COM_COTA_GRATIS_ATIVA: true,
    COM_COTA_GRATIS_CHARS: 200000,
    COM_MIN_CHARS_PAGINA: 80,
    COM_CHARS_POR_PAGINA: 2000,
    COM_TEMPO_ATUACAO_MIN: 15,
    COM_MARGEM_SEGURANCA: 1.4,
    COM_MARGEM_AUTOCAL: 1.1,
    COM_LINK_DIAS_EXPIRA: 7,
    COM_LIMITE_ANEXO_MB: 15,
    COM_WHATSAPP_NUMERO_PUBLICO: "5519999999999",
    API_BASE_URL: "https://tocatexto-api.onrender.com",
    // [web_v07_02] Baseline autocalibrado pelos logs centrais do XTTSv2 (22 fatias / 60 itens CPU)
    // alinhado à frota CPU completa ociosa (9 contas × 5 fatias = 45 fatias / 135 workers: 3 tocatexto* + 3 audiobook* + 3 GPU-como-CPU)
    CPU_AUTOCALIBRADO: true,
    CPU_SETUP_SEG: 273.4,
    CPU_BASE_SEG: 150.0,
    CPU_S_POR_BYTE: 0.49343,
    CPU_WORKERS_POR_FATIA: 3,
    CPU_FATIAS_ATIVAS: 45,
    CPU_WORKERS_TOTAIS: 135,
    PARTICAO_PISO_BYTES: 3072,
    // [web_v07_00] Baseline medido do Edge TTS em paralelo (Whispr Flow Like Plus v03_01):
    // 6 instâncias simultâneas em blocos de ~1.200 chars, ~9.5s handshake + 0.0115s/char (~23.3s/onda de 6 blocos)
    EDGE_ALVO_BLOCO: 1200,
    EDGE_PARALELAS: 6,
    EDGE_HANDSHAKE_SEG: 9.5,
    EDGE_S_POR_CHAR: 0.0115,
    EDGE_OVERHEAD_BASE_SEG: 35,
    EDGE_OVERHEAD_POR_BLOCO_SEG: 0.45,
    EDGE_MARGEM_SEGURANCA: 1.25,
    EDGE_PISO_MIN: 2,
  };

  // [web_v09_00] Permite apontar a API FastAPI por meta tag ou query string (?api=http://127.0.0.1:8000)
  (function resolverApiBaseUrlInicial() {
    if (CONFIG_COMERCIAL.API_BASE_URL) return;
    try {
      const metaApi = document.querySelector('meta[name="tocatexto-api-url"]')?.getAttribute("content")?.trim() || "";
      const params = new URLSearchParams(window.location.search);
      const paramApi = (params.get("api") || "").trim();
      const candidata = paramApi || metaApi;
      if (!candidata) return;
      const parsed = new URL(candidata);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        CONFIG_COMERCIAL.API_BASE_URL = parsed.origin + parsed.pathname.replace(/\/+$/, "");
      }
    } catch (_err) {
      // Mantém API_BASE_URL vazia em caso de URL malformada
    }
  })();

  // Velocidades preferenciais com atração magnética no slider granular
  const SNAP_SPEEDS = [0.85, 1.0, 1.25];
  const SNAP_TOLERANCE = 0.022;

  // Catálogo oficial das 44 vozes XTTSv2 (18 PT-BR + 26 EN)
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

  // [web_v07_00] Catálogo oficial Edge TTS (alinhado ao Whispr Flow Like Plus e Audiobook_Edge_TTT)
  const VOZES_EDGE_CATALOGO = {
    pt: [
      { sigla: "thalita", nome: "Thalita", edgeVoiceId: "pt-BR-ThalitaMultilingualNeural", motor: "edge", idioma: "pt", genero: "F", categoria: "dinamica", cor1: "#06b6d4", cor2: "#0e7490", perfil: "Jovem, vibrante e ágil", frase: "Esta é a voz Thalita no modo rápido e gratuito do TocaTexto. A síntese é muito ágil para entregar seu áudio em poucos minutos." },
      { sigla: "antonio", nome: "Antônio", edgeVoiceId: "pt-BR-AntonioNeural", motor: "edge", idioma: "pt", genero: "M", categoria: "densa", cor1: "#3b82f6", cor2: "#1d4ed8", perfil: "Grave, séria e documental", frase: "Esta é a voz Antônio no serviço gratuito Edge TTS. Um pouco mais sintética que o estúdio, mas muito clara, ágil e excelente para ouvir apostilas e relatórios." },
      { sigla: "francisca", nome: "Francisca", edgeVoiceId: "pt-BR-FranciscaNeural", motor: "edge", idioma: "pt", genero: "F", categoria: "narrativa", cor1: "#14b8a6", cor2: "#0f766e", perfil: "Equilibrada, calma e objetiva", frase: "Esta é a voz Francisca no Edge TTS. Equilibrada e objetiva, converte seus documentos em MP3 com rapidez e custo zero." },
    ],
    en: [
      { sigla: "jenny", nome: "Jenny", edgeVoiceId: "en-US-JennyNeural", motor: "edge", idioma: "en", genero: "F", categoria: "narrativa", cor1: "#06b6d4", cor2: "#0e7490", perfil: "US · Clear & Versatile", frase: "This is Jenny on the fast and free Edge TTS engine. Multiple parallel instances convert your documents into MP3 audio in minutes." },
      { sigla: "aria", nome: "Aria", edgeVoiceId: "en-US-AriaNeural", motor: "edge", idioma: "en", genero: "F", categoria: "dinamica", cor1: "#ec4899", cor2: "#be185d", perfil: "US · Energetic & Crisp", frase: "This is Aria on Edge TTS. Slightly more synthetic than studio voices, yet crisp, responsive, and completely free to use." },
      { sigla: "michelle", nome: "Michelle", edgeVoiceId: "en-US-MichelleNeural", motor: "edge", idioma: "en", genero: "F", categoria: "densa", cor1: "#8b5cf6", cor2: "#5b21b6", perfil: "US · Executive & Authoritative", frase: "This is Michelle on Edge TTS. Clear and structured pacing built for rapid review of reports, papers, and technical manuals." },
      { sigla: "guy", nome: "Guy", edgeVoiceId: "en-US-GuyNeural", motor: "edge", idioma: "en", genero: "M", categoria: "densa", cor1: "#3b82f6", cor2: "#1d4ed8", perfil: "US · Neutral & News-style", frase: "This is Guy on Edge TTS. Neutral, direct narration generated rapidly across parallel instances at zero cost." },
      { sigla: "chris", nome: "Christopher", edgeVoiceId: "en-US-ChristopherNeural", motor: "edge", idioma: "en", genero: "M", categoria: "densa", cor1: "#6366f1", cor2: "#3730a3", perfil: "US · Deep & Documentary", frase: "This is Christopher on Edge TTS. Deep and steady delivery for long documents when you want fast, free audio synthesis." },
      { sigla: "eric", nome: "Eric", edgeVoiceId: "en-US-EricNeural", motor: "edge", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#10b981", cor2: "#047857", perfil: "US · Friendly & Agile", frase: "This is Eric on Edge TTS. Friendly and agile voice synthesis ready for quick listening on any device." },
      { sigla: "sonia", nome: "Sonia", edgeVoiceId: "en-GB-SoniaNeural", motor: "edge", idioma: "en", genero: "F", categoria: "narrativa", cor1: "#14b8a6", cor2: "#0f766e", perfil: "UK · Clear British RP", frase: "This is Sonia on Edge TTS with a clear British accent. Fast parallel synthesis with zero usage cost." },
      { sigla: "ryan", nome: "Ryan", edgeVoiceId: "en-GB-RyanNeural", motor: "edge", idioma: "en", genero: "M", categoria: "dinamica", cor1: "#0ea5e9", cor2: "#0369a1", perfil: "UK · Versatile British", frase: "This is Ryan on Edge TTS. Versatile British narration generated rapidly for study sessions and commuting." },
      { sigla: "libby", nome: "Libby", edgeVoiceId: "en-GB-LibbyNeural", motor: "edge", idioma: "en", genero: "F", categoria: "narrativa", cor1: "#a855f7", cor2: "#6b21a8", perfil: "UK · Smooth & Narrative", frase: "This is Libby on Edge TTS. Smooth British delivery that turns your readings into portable MP3 audio in minutes." },
    ],
  };

  // Estado reativo da sessão do cliente
  const state = {
    motorServico: "xttsv2", // "xttsv2" | "edge"
    arquivos: [], // Array de { id, file, nome, tamanhoBytes, caracteres, paginas, capitulos: [{numero, titulo}], idioma: 'pt'|'en'|null, idiomaDetectado }
    arquivo: null,
    nomeArquivo: "",
    tamanhoBytes: 0,
    totalCaracteres: 0,
    paginasEstimadas: 0,
    capitulosDetectados: [{ numero: 1, titulo: "Documento Completo" }],
    valorCalculado: 0,
    cotaTotalChars: CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS,
    cotaConsumidaChars: 0,
    cotaRestanteChars: CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS,
    charsCobertosCota: 0,
    charsCobraveis: 0,
    pedidoGratuito: true,
    idioma: "pt",
    validacaoIdiomaTentada: false,
    filtroVoz: "todas",
    velocidade: 1.0,
    modoVoz: "unica",
    subModoVoz: "escolher", // "escolher" | "aleatoria"
    vozId: "borges",
    vozIdPorMotor: {
      xttsv2: { pt: "borges", en: "adam" },
      edge: { pt: "thalita", en: "jenny" },
    },
    vozesCapitulos: {},
    formatoSaida: "unico",
    janelaWhatsappAtiva: false,
    vozTocandoSigla: null,
    vozTocandoIdioma: null,
    vozTocandoMotor: null,
    carregandoPreviewVoz: false,
    ultimaVozAleatoriaVel: null,
    etapaAtiva: 1,
    heartbeatOnline: true,
    heartbeatEpoch: Math.floor(Date.now() / 1000),
    calibracaoCpu: null,
    calibracaoEdge: null,
    filaPedidosFrente: 0,
    filaMinutosFrente: 0,
    filaPedidosFrenteEdge: 0,
    filaMinutosFrenteEdge: 0,
    prazoEstimadoMinutos: 0,
    horarioEntregaFormatado: "--:--",
    previsaoEntregaRotulo: "Aguardando documento...",
    previsaoEntregaRotuloModal: "--",
    ultimoPedidoCriado: null,
  };

  // Referências DOM
  const el = {};

  // ==========================================================================
  // 0. HELPERS DE TOP-LAYER (<dialog>) E ANÚNCIO ACESSÍVEL (modern-web-guidance)
  // ==========================================================================
  let _supportsDisplayTransition;
  function canTransitionDisplay() {
    if (_supportsDisplayTransition !== undefined) return _supportsDisplayTransition;
    if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
      return false;
    }
    const probe = document.createElement("div");
    probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
    document.body.appendChild(probe);
    window.getComputedStyle(probe).display;
    probe.style.display = "none";
    _supportsDisplayTransition = window.getComputedStyle(probe).display === "block";
    probe.remove();
    return _supportsDisplayTransition;
  }

  function supportsTopLayerExit() {
    return Boolean(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay());
  }

  async function closeTopLayerDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (!supportsTopLayerExit()) {
      dialog.setAttribute("data-closing", "");
      const animations = typeof dialog.getAnimations === "function"
        ? dialog.getAnimations({ subtree: true })
        : [];
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 400)),
        ]);
      }
      if (!dialog.hasAttribute("data-closing")) return;
      dialog.removeAttribute("data-closing");
    }
    dialog.close();
  }

  function configurarFallbackLightDismissDialog(dialog) {
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener("pointerdown", (e) => {
      pressedOutside = dialog.open && isOutside(e);
    });
    dialog.addEventListener("pointerup", (e) => {
      if (pressedOutside && dialog.open && isOutside(e)) {
        closeTopLayerDialog(dialog);
      }
      pressedOutside = false;
    });
  }

  // Ponte acessível :user-invalid <-> aria-invalid + aria-describedby + live region única
  let _ariaAnnouncer = null;
  let _announceTimer = null;
  let _announcedField = null;
  const _ariaFlagged = new WeakSet();
  const _ariaAnnounced = new WeakSet();
  const _fallbackDirty = new WeakMap();

  function garantirLiveAnnouncer() {
    if (_ariaAnnouncer) return _ariaAnnouncer;
    const node = document.createElement("div");
    node.setAttribute("aria-live", "polite");
    node.className = "visually-hidden";
    document.body.append(node);
    _ariaAnnouncer = node;
    return node;
  }

  function linkErrorDescribedBy(control, shown) {
    const errorId = control?.dataset?.error;
    if (!errorId) return;
    const ids = (control.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
    else control.removeAttribute("aria-describedby");
  }

  function spokenText(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => {
      n.replaceWith(`${n.getAttribute("aria-label")}: `);
    });
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  function anunciarErroCampo(control) {
    const errorEl = control?.dataset?.error ? document.getElementById(control.dataset.error) : null;
    if (!errorEl) return;
    const announcer = garantirLiveAnnouncer();
    const labelPrefix = control.labels?.[0] ? `${spokenText(control.labels[0])}: ` : "";
    clearTimeout(_announceTimer);
    announcer.textContent = "";
    _announcedField = control;
    _announceTimer = setTimeout(() => {
      announcer.textContent = labelPrefix + spokenText(errorEl);
    }, 500);
  }

  function syncFieldAria(control, announce = false, forceCheck = false) {
    if (!control?.matches?.("input, select, textarea")) return;
    const supportsUserInvalid = Boolean(window.CSS?.supports?.("selector(:user-invalid)"));
    let invalid = false;
    if (forceCheck) {
      invalid = !control.validity.valid;
      if (!supportsUserInvalid) {
        control.classList.toggle("user-invalid-fallback", invalid);
      }
    } else if (supportsUserInvalid) {
      invalid = control.matches(":user-invalid");
    } else {
      invalid = control.classList.contains("user-invalid-fallback");
    }

    if (invalid) {
      if (announce && !_ariaAnnounced.has(control)) {
        anunciarErroCampo(control);
        _ariaAnnounced.add(control);
      }
      control.setAttribute("aria-invalid", "true");
      linkErrorDescribedBy(control, true);
      _ariaFlagged.add(control);
    } else if (_ariaFlagged.has(control) || control.getAttribute("aria-invalid") !== "true") {
      control.setAttribute("aria-invalid", "false");
      linkErrorDescribedBy(control, false);
      _ariaFlagged.delete(control);
      _ariaAnnounced.delete(control);
      if (_announcedField === control && _ariaAnnouncer) {
        clearTimeout(_announceTimer);
        _ariaAnnouncer.textContent = "";
      }
    }
  }

  function inicializarValidacaoAcessivelFormulario(form) {
    if (!form) return;
    garantirLiveAnnouncer();
    const supportsUserInvalid = Boolean(window.CSS?.supports?.("selector(:user-invalid)"));

    form.querySelectorAll("input, select, textarea").forEach((ctrl) => {
      if (ctrl.type !== "radio" && ctrl.type !== "hidden") {
        ctrl.setAttribute("aria-invalid", "false");
      }
    });

    if (!supportsUserInvalid) {
      const updateFallback = (ctrl) => {
        if (!ctrl.checkValidity) return;
        const ok = ctrl.validity.valid;
        ctrl.classList.toggle("user-invalid-fallback", !ok);
        syncFieldAria(ctrl, true, false);
      };
      form.addEventListener("blur", (e) => {
        const st = _fallbackDirty.get(e.target) || { interacted: false, blurred: false };
        st.blurred = true;
        _fallbackDirty.set(e.target, st);
        if (st.interacted) updateFallback(e.target);
      }, true);
      form.addEventListener("input", (e) => {
        const st = _fallbackDirty.get(e.target) || { interacted: false, blurred: false };
        st.interacted = true;
        _fallbackDirty.set(e.target, st);
        if (st.blurred) updateFallback(e.target);
      });
      form.addEventListener("change", (e) => {
        const st = _fallbackDirty.get(e.target) || { interacted: false, blurred: false };
        st.interacted = true;
        st.blurred = true;
        _fallbackDirty.set(e.target, st);
        updateFallback(e.target);
      }, true);
    } else {
      form.addEventListener("blur", (e) => syncFieldAria(e.target, true), true);
      form.addEventListener("input", (e) => {
        if (e.target?.hasAttribute?.("aria-invalid")) syncFieldAria(e.target, false);
      });
      form.addEventListener("change", (e) => syncFieldAria(e.target, true), true);
    }

    form.addEventListener("invalid", (e) => {
      _ariaAnnounced.add(e.target);
      syncFieldAria(e.target, false, true);
    }, true);
  }

  // ==========================================================================
  // 1. UTILITÁRIOS DE FORMATAÇÃO, PREÇO, MOTOR E DETECÇÃO DE IDIOMA
  // ==========================================================================
  function ehEdgeTts() {
    return state.motorServico === "edge";
  }

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

  function velocidadeParaRateEdge(vel) {
    const pct = Math.round((Number(vel || 1.0) - 1.0) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}%`;
  }

  const STORAGE_COTA_PREFIX = "tocatexto_cota_v1_";

  function normalizarEmailCota(email) {
    const bruto = String(email || "").trim().toLowerCase();
    if (!bruto || !bruto.includes("@")) return "";
    const [local, dominio] = bruto.split("@", 2);
    if ((dominio === "gmail.com" || dominio === "googlemail.com") && local.includes("+")) {
      return `${local.split("+", 1)[0]}@${dominio}`;
    }
    return `${local}@${dominio}`;
  }

  function lerConsumidoCotaLocal(emailNormalizado) {
    if (!CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA || !emailNormalizado) return 0;
    try {
      const bruto = window.localStorage.getItem(`${STORAGE_COTA_PREFIX}${emailNormalizado}`);
      if (!bruto) return 0;
      const obj = JSON.parse(bruto);
      return Math.max(0, Math.min(CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS, Number(obj?.chars_consumidos || 0)));
    } catch (_err) {
      return 0;
    }
  }

  function debitarCotaLocal(email, charsCobertos) {
    const emailNorm = normalizarEmailCota(email);
    const delta = Math.max(0, Math.round(Number(charsCobertos || 0)));
    if (!emailNorm || delta <= 0) return;
    const total = CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS;
    const atual = lerConsumidoCotaLocal(emailNorm);
    const novoConsumido = Math.min(total, atual + delta);
    try {
      window.localStorage.setItem(
        `${STORAGE_COTA_PREFIX}${emailNorm}`,
        JSON.stringify({
          chars_consumidos: novoConsumido,
          atualizado_em: new Date().toISOString(),
        })
      );
    } catch (_err) {
      // Silencioso se localStorage estiver bloqueado
    }
    state.cotaConsumidaChars = novoConsumido;
    state.cotaRestanteChars = Math.max(0, total - novoConsumido);
  }

  function criarSignalTimeout(ms) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return { signal: AbortSignal.timeout(ms), cleanup: () => {} };
    }
    if (typeof AbortController === "function") {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ms);
      return { signal: ctrl.signal, cleanup: () => clearTimeout(timer) };
    }
    return { signal: undefined, cleanup: () => {} };
  }

  // [web_v12_00] Atualiza textos comerciais estáticos da interface a partir de CONFIG_COMERCIAL
  function formatarTagCotaCurta(totalChars) {
    const n = Math.max(0, Math.round(Number(totalChars) || 0));
    if (n <= 0) return "PIX";
    if (n >= 1000) {
      const k = n / 1000;
      const kFmt = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(".", ",");
      return `${kFmt}k grátis`;
    }
    return `${formatarInteiro(n)} ch grátis`;
  }

  function atualizarTextosComerciaisNaUI() {
    const ativa = Boolean(CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA);
    const total = ativa ? Math.max(0, Math.round(Number(CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS) || 0)) : 0;
    const charsPorPag = Math.max(100, Math.round(Number(CONFIG_COMERCIAL.COM_CHARS_POR_PAGINA) || 2000));
    const pags = Math.max(0, Math.round(total / charsPorPag));
    const totalFmt = formatarInteiro(total);
    const precoMil = formatarBRL((Number(CONFIG_COMERCIAL.COM_VALOR_CARACTERE) || 0.00005) * 1000);
    const minBrl = formatarBRL(Number(CONFIG_COMERCIAL.COM_VALOR_MINIMO) || 1.0);
    const diasExpira = Math.max(1, Math.round(Number(CONFIG_COMERCIAL.COM_LINK_DIAS_EXPIRA) || 7));

    const heroQuota = document.getElementById("heroXttsQuotaBadge");
    if (heroQuota) {
      heroQuota.textContent =
        ativa && total > 0
          ? `🎁 XTTSv2 Estúdio: ${pags} pág. grátis (${totalFmt} chars) no 1º uso`
          : "🎙️ XTTSv2 Estúdio: sob demanda via PIX";
    }
    const heroPrice = document.getElementById("heroXttsPriceBadge");
    if (heroPrice) {
      heroPrice.textContent = `💰 Excedente XTTSv2: ${precoMil} / 1.000 chars (mín. ${minBrl})`;
    }
    const engineTag = document.getElementById("engineXttsQuotaTag");
    if (engineTag) {
      engineTag.textContent = ativa && total > 0 ? formatarTagCotaCurta(total) : "Sob demanda";
    }
    const engineInline = document.getElementById("engineXttsQuotaInline");
    if (engineInline) {
      engineInline.textContent =
        ativa && total > 0
          ? `As primeiras ${pags} páginas (${totalFmt} chars) são grátis; excedente cobrado via PIX.`
          : `Cobrança sob demanda via PIX (${precoMil} / 1.000 chars, mín. ${minBrl}).`;
    }
    const termsDias = document.getElementById("termsLinkDias");
    if (termsDias) termsDias.textContent = String(diasExpira);
    const termsQuota = document.getElementById("termsQuotaChars");
    if (termsQuota) termsQuota.textContent = totalFmt;
  }

  function aplicarConfigComercialRemota(cfgRemota) {
    if (!cfgRemota || typeof cfgRemota !== "object") return false;
    let alterou = false;
    if (typeof cfgRemota.COM_COTA_GRATIS_ATIVA === "boolean") {
      if (CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA !== cfgRemota.COM_COTA_GRATIS_ATIVA) alterou = true;
      CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA = cfgRemota.COM_COTA_GRATIS_ATIVA;
    }
    const numKeys = [
      ["COM_COTA_GRATIS_CHARS", 0],
      ["COM_VALOR_CARACTERE", 0.000001],
      ["COM_VALOR_MINIMO", 0],
      ["COM_MIN_CHARS_PAGINA", 1],
      ["COM_CHARS_POR_PAGINA", 100],
      ["COM_LINK_DIAS_EXPIRA", 1],
    ];
    for (const [k, minVal] of numKeys) {
      if (typeof cfgRemota[k] === "number" && Number.isFinite(cfgRemota[k]) && cfgRemota[k] >= minVal) {
        if (CONFIG_COMERCIAL[k] !== cfgRemota[k]) alterou = true;
        CONFIG_COMERCIAL[k] = cfgRemota[k];
      }
    }
    const novoTotal = CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA ? CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS : 0;
    state.cotaTotalChars = novoTotal;
    state.cotaRestanteChars = Math.max(0, novoTotal - state.cotaConsumidaChars);
    atualizarTextosComerciaisNaUI();
    recalcularAgregadosDocumentos();
    atualizarCardsComparacaoMotores();
    atualizarResumoPedido();
    return alterou;
  }

  async function atualizarSaldoCotaPorEmail(consultarApi = false) {
    let total = CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA ? CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS : 0;
    const emailNorm = normalizarEmailCota(el.clientEmail?.value || "");
    let consumido = lerConsumidoCotaLocal(emailNorm);

    if (consultarApi && emailNorm && CONFIG_COMERCIAL.API_BASE_URL) {
      const { signal, cleanup } = criarSignalTimeout(3000);
      try {
        const endpoint = new URL("/api/cota", CONFIG_COMERCIAL.API_BASE_URL);
        endpoint.searchParams.set("email", emailNorm);
        const resp = await fetch(endpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
        });
        if (resp.ok) {
          const data = await resp.json();
          if (typeof data?.cota_ativa === "boolean") {
            CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA = data.cota_ativa;
          }
          if (typeof data?.cota_total_chars === "number" && data.cota_total_chars >= 0) {
            CONFIG_COMERCIAL.COM_COTA_GRATIS_CHARS = data.cota_total_chars;
            total = CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA ? data.cota_total_chars : 0;
            atualizarTextosComerciaisNaUI();
          }
          if (typeof data?.chars_consumidos === "number") {
            consumido = Math.max(0, Math.min(total, data.chars_consumidos));
          }
        }
      } catch (_err) {
        // Fallback silencioso para saldo local quando API não responder
      } finally {
        cleanup();
      }
    }

    state.cotaTotalChars = total;
    state.cotaConsumidaChars = consumido;
    state.cotaRestanteChars = Math.max(0, total - consumido);
    recalcularAgregadosDocumentos();
    atualizarCardsComparacaoMotores();
    atualizarResumoPedido();
    if (state.arquivos.length > 0) {
      atualizarFluxoEtapas(state.etapaAtiva, true);
    }
  }

  async function sincronizarStatusMotor() {
    if (!CONFIG_COMERCIAL.API_BASE_URL) return;
    const { signal, cleanup } = criarSignalTimeout(5000);
    try {
      const endpoint = new URL("/api/status", CONFIG_COMERCIAL.API_BASE_URL);
      const resp = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.config_comercial && typeof data.config_comercial === "object") {
        aplicarConfigComercialRemota(data.config_comercial);
      }
      const hb = data?.heartbeat || data;
      if (hb && typeof hb === "object") {
        if (typeof hb.timestamp_epoch === "number") {
          state.heartbeatEpoch = hb.timestamp_epoch;
          const idadeSeg = Math.max(0, Math.floor(Date.now() / 1000) - hb.timestamp_epoch);
          state.heartbeatOnline = hb.status === "online" && idadeSeg <= 360;
        }
        if (hb.calibracao_cpu && typeof hb.calibracao_cpu === "object") {
          state.calibracaoCpu = hb.calibracao_cpu;
        }
        if (hb.calibracao_edge && typeof hb.calibracao_edge === "object") {
          state.calibracaoEdge = hb.calibracao_edge;
        }
        const fila = data?.fila || hb.fila;
        if (fila && typeof fila === "object") {
          state.filaPedidosFrente = Math.max(0, Number(fila.pedidos_pendentes || 0));
          state.filaMinutosFrente = Math.max(0, Number(fila.minutos_estimados || 0));
          state.filaPedidosFrenteEdge = Math.max(0, Number(fila.pedidos_pendentes_edge || 0));
          state.filaMinutosFrenteEdge = Math.max(0, Number(fila.minutos_estimados_edge || 0));
        }
        if (el.heartbeatDot && el.heartbeatText) {
          el.heartbeatDot.className = state.heartbeatOnline
            ? "h-2.5 w-2.5 rounded-full bg-emerald-400 motion-pulse"
            : "h-2.5 w-2.5 rounded-full bg-amber-400";
          el.heartbeatText.textContent = state.heartbeatOnline
            ? "Motor online · XTTSv2 & Edge TTS prontos"
            : "Motor em espera (janela programada)";
        }
        atualizarResumoPedido();
      }
    } catch (err) {
      if (err?.name !== "TimeoutError" && err?.name !== "AbortError") {
        // Fallback silencioso para constantes locais calibradas
      }
    } finally {
      cleanup();
    }
  }

  function calcularPrecoXttsParaCaracteres(totalChars) {
    const cotaRestante = CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA ? Math.max(0, state.cotaRestanteChars) : 0;
    if (!totalChars || totalChars <= 0) {
      return {
        preco: cotaRestante > 0 ? 0 : CONFIG_COMERCIAL.COM_VALOR_MINIMO,
        charsCobertos: 0,
        charsCobraveis: 0,
        gratuito: cotaRestante > 0,
      };
    }
    const charsCobertos = Math.min(totalChars, cotaRestante);
    const charsCobraveis = Math.max(0, totalChars - charsCobertos);
    if (charsCobraveis === 0) {
      return { preco: 0, charsCobertos, charsCobraveis: 0, gratuito: true };
    }
    const bruto = charsCobraveis * CONFIG_COMERCIAL.COM_VALOR_CARACTERE;
    const preco = Math.round(Math.max(CONFIG_COMERCIAL.COM_VALOR_MINIMO, bruto) * 100) / 100;
    return { preco, charsCobertos, charsCobraveis, gratuito: false };
  }

  function calcularPrecoPorCaracteres(totalChars) {
    // [web_v07_00] Edge TTS é sempre 100% gratuito e não consome a cota XTTSv2
    if (ehEdgeTts()) {
      state.charsCobertosCota = 0;
      state.charsCobraveis = 0;
      state.pedidoGratuito = true;
      return 0;
    }

    const res = calcularPrecoXttsParaCaracteres(totalChars);
    state.charsCobertosCota = res.charsCobertos;
    state.charsCobraveis = res.charsCobraveis;
    state.pedidoGratuito = res.gratuito;
    return res.preco;
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
    const todosIdiomasDefinidos =
      temDoc && state.arquivos.every((a) => a.idioma === "pt" || a.idioma === "en");

    if (!apenasVisualStepper) {
      [el.stepCard01, el.stepCard02, el.stepCard03].forEach((card, idx) => {
        if (!card) return;
        const num = idx + 1;
        card.classList.remove("step-card-active", "step-card-completed");
        if (num === etapaAtiva) {
          card.classList.add("step-card-active");
        } else if ((num === 1 && todosIdiomasDefinidos) || (num < etapaAtiva && (num !== 1 || todosIdiomasDefinidos))) {
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

    const valorCurto = state.valorCalculado <= 0 ? "GRÁTIS" : formatarBRL(state.valorCalculado);
    const motorCurto = ehEdgeTts() ? "Edge TTS" : "XTTSv2";

    itensStepper.forEach(({ pill, badge, stateTxt, num }) => {
      if (!pill || !badge || !stateTxt) return;
      const concluido =
        (num === 1 && todosIdiomasDefinidos && etapaAtiva > 1) ||
        (num === 2 && todosIdiomasDefinidos && etapaAtiva === 3);
      const ativo = num === etapaAtiva;

      if (ativo) {
        pill.setAttribute("aria-current", "step");
      } else {
        pill.removeAttribute("aria-current");
      }

      pill.className = "stepper-pill flex items-center justify-between rounded-xl border px-4 py-2.5 transition ";
      if (ativo) {
        pill.className += "border-amber-400/70 bg-amber-500/15 shadow";
        badge.className = "flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 font-mono text-xs font-extrabold text-slate-950";
        badge.textContent = `0${num}`;
        stateTxt.className = "step-arrow-cue text-xs font-bold text-amber-300";
        stateTxt.textContent = num === 1 && temDoc && !todosIdiomasDefinidos ? "Escolha o idioma ↓" : "Etapa atual ↓";
      } else if (concluido) {
        pill.className += "border-emerald-500/45 bg-emerald-950/25";
        badge.className = "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 font-mono text-xs font-extrabold text-slate-950";
        badge.textContent = "✓";
        stateTxt.className = "text-xs font-semibold text-emerald-300";
        stateTxt.textContent = num === 1 ? `${state.arquivos.length} arq. · ${valorCurto}` : `${motorCurto} · ${state.vozId}`;
      } else {
        pill.className += "border-slate-800 bg-slate-950/60 hover:border-slate-700";
        badge.className = "flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 font-mono text-xs font-bold text-slate-300";
        badge.textContent = `0${num}`;
        stateTxt.className =
          num === 1 && temDoc && !todosIdiomasDefinidos
            ? "text-xs font-semibold text-amber-300"
            : "text-xs font-medium text-slate-400";
        stateTxt.textContent =
          num === 1 && temDoc && !todosIdiomasDefinidos
            ? "Idioma pendente"
            : num === 2
            ? `${motorCurto} →`
            : "E-mail & WhatsApp";
      }
    });

    if (el.connector01to02) {
      el.connector01to02.classList.toggle("step-connector-active", todosIdiomasDefinidos);
    }
    if (el.connector01Text) {
      el.connector01Text.textContent = !temDoc
        ? "Próximo passo: escolha o motor (XTTSv2 ou Edge TTS), narrador e velocidade"
        : todosIdiomasDefinidos
        ? `✓ ${state.arquivos.length} documento(s) validado(s) (${valorCurto}) — Agora escolha o serviço, voz e velocidade no Passo 02`
        : "Escolha o idioma obrigatório de cada documento acima antes de prosseguir";
    }
    if (el.connector02to03) {
      el.connector02to03.classList.toggle("step-connector-active", etapaAtiva >= 2 && todosIdiomasDefinidos);
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
  // 3. SELEÇÃO DE SERVIÇO DE ÁUDIO (XTTSv2 ESTÚDIO vs EDGE TTS RÁPIDO/GRÁTIS)
  // ==========================================================================
  function selecionarMotorServico(novoMotor, animarPreco = false) {
    if (novoMotor !== "xttsv2" && novoMotor !== "edge") return;
    if (state.motorServico === novoMotor) return;

    // Salva a voz atual do motor anterior para restaurar depois
    if (state.vozIdPorMotor[state.motorServico]) {
      state.vozIdPorMotor[state.motorServico][state.idioma] = state.vozId;
    }

    pararPreviewVoz();
    state.motorServico = novoMotor;
    state.ultimaVozAleatoriaVel = null;

    // Restaura voz preferida do motor recém-escolhido
    const listaNova = obterListaVozesIdiomaAtual();
    const salva = state.vozIdPorMotor[novoMotor]?.[state.idioma];
    state.vozId = listaNova.some((v) => v.sigla === salva) ? salva : listaNova[0]?.sigla || "borges";
    state.vozesCapitulos = {};

    // Reseta filtro se o filtro atual não retornar nenhuma voz no novo motor
    if (obterVozesFiltradas().length === 0) {
      state.filtroVoz = "todas";
      atualizarUiFiltrosVoz();
    }

    atualizarUiSeletorMotor();
    renderizarCatalogoVozes({ preservarScroll: false, animarEntrada: true });
    renderizarMapeadorCapitulos();
    recalcularAgregadosDocumentos();
    atualizarResumoPedido();
    atualizarFluxoEtapas(state.etapaAtiva, true);

    if (animarPreco && state.totalCaracteres > 0) {
      dispararFlashPreco();
    }
  }

  function atualizarUiSeletorMotor() {
    const isEdge = ehEdgeTts();
    // [web_v08_00] Sincroniza a temperatura de cor da Aurora Sonora com o motor selecionado
    if (document.body) {
      document.body.dataset.engine = isEdge ? "edge" : "xttsv2";
    }
    if (el.engineRadioXtts) el.engineRadioXtts.checked = !isEdge;
    if (el.engineRadioEdge) el.engineRadioEdge.checked = isEdge;
    if (el.engineCardXtts) el.engineCardXtts.classList.toggle("engine-active", !isEdge);
    if (el.engineCardEdge) el.engineCardEdge.classList.toggle("engine-active", isEdge);

    if (el.catalogEnginePill) {
      if (isEdge) {
        el.catalogEnginePill.textContent = "⚡ Edge TTS · 100% Grátis";
        el.catalogEnginePill.className = "rounded-lg border border-cyan-400/45 bg-cyan-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-300";
      } else {
        el.catalogEnginePill.textContent = "🎙️ XTTSv2 Estúdio";
        el.catalogEnginePill.className = "rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300";
      }
    }

    if (el.audioSourceStatusText && !state.vozTocandoSigla) {
      el.audioSourceStatusText.textContent = isEdge
        ? "⚡ Amostras reais do Edge TTS (voz mais robótica, porém muito clara e ágil — controle de velocidade ativo em tempo real)."
        : "🔊 Amostras reais das vozes neurais XTTSv2 (qualidade de estúdio — controle de velocidade com preservação de tom ativa).";
    }
  }

  function atualizarCardsComparacaoMotores() {
    const temDoc = state.totalCaracteres > 0;
    const minXtts = temDoc ? calcularMinutosXttsLocal(state.totalCaracteres) : 0;
    const minEdge = temDoc ? calcularMinutosEdgeLocal(state.totalCaracteres) : 0;
    const xttsPreco = calcularPrecoXttsParaCaracteres(state.totalCaracteres);

    if (el.engineXttsEtaBadge) {
      el.engineXttsEtaBadge.textContent = temDoc
        ? `⏱️ ~${formatarDuracaoHorasMinutos(minXtts)} (CPU nuvem)`
        : "⏱️ Ex.: ~1h20 para 100 pág.";
    }

    if (el.engineXttsPriceBadge) {
      if (!temDoc) {
        const precoMil = formatarBRL((Number(CONFIG_COMERCIAL.COM_VALOR_CARACTERE) || 0.00005) * 1000);
        el.engineXttsPriceBadge.textContent = state.cotaRestanteChars > 0
          ? `💰 Grátis até ${formatarInteiro(state.cotaRestanteChars)} ch`
          : `💰 ${precoMil} / 1.000 chars`;
      } else {
        el.engineXttsPriceBadge.textContent = xttsPreco.preco <= 0
          ? "💰 GRÁTIS (usa cota)"
          : `💰 ${formatarBRL(xttsPreco.preco)} (PIX)`;
      }
    }

    if (el.engineEdgeEtaBadge) {
      el.engineEdgeEtaBadge.textContent = temDoc
        ? `⚡ ~${formatarDuracaoHorasMinutos(minEdge)}`
        : "⚡ Ex.: ~16 min para 100 pág.";
    }

    if (el.engineEdgePriceBadge) {
      el.engineEdgePriceBadge.textContent = "🆓 R$ 0,00 (Grátis ilimitado)";
    }

    // Card de comparativo rápido no Resumo Sticky
    if (el.estEngineCompareBox && el.estEngineCompareHint && el.quickSwitchEngineBtn) {
      if (!temDoc) {
        el.estEngineCompareBox.classList.add("hidden");
      } else {
        if (ehEdgeTts()) {
          // [web_v08_01] Em Edge TTS, o atalho sugere XTTSv2 na cor âmbar/laranja temática
          el.estEngineCompareBox.className = "mt-3 rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-2 text-[11px] text-slate-300 compare-target-xtts";
          el.quickSwitchEngineBtn.className = "shrink-0 rounded-lg border border-amber-400/55 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition";
          const precoTxt = xttsPreco.preco <= 0 ? "grátis na cota" : formatarBRL(xttsPreco.preco);
          el.estEngineCompareHint.textContent = `Prefere voz mais natural (estúdio)? XTTSv2: ~${formatarDuracaoHorasMinutos(minXtts)} (${precoTxt}).`;
          el.quickSwitchEngineBtn.textContent = "Usar XTTSv2";
        } else {
          // Em XTTSv2, o atalho sugere Edge TTS na cor ciano temática
          el.estEngineCompareBox.className = "mt-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-[11px] text-slate-300 compare-target-edge";
          el.quickSwitchEngineBtn.className = "shrink-0 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 transition";
          const economiaTxt = xttsPreco.preco > 0 ? ` e economize ${formatarBRL(xttsPreco.preco)}` : " e preserve sua cota";
          el.estEngineCompareHint.textContent = `Quer bem mais rápido e grátis? Edge TTS: ~${formatarDuracaoHorasMinutos(minEdge)}${economiaTxt}.`;
          el.quickSwitchEngineBtn.textContent = "Usar Edge TTS";
        }
      }
    }
  }

  // ==========================================================================
  // 4. GERAÇÃO DE AVATARES ILUSTRADOS E VITRINE DE VOZES (XTTSv2 & EDGE TTS)
  // ==========================================================================
  function criarAvatarSvg(voz) {
    const iniciais = voz.nome.slice(0, 2).toUpperCase();
    const prefixoMotor = voz.motor === "edge" ? "edge" : "xtts";
    const idGrad = `grad_${prefixoMotor}_${voz.idioma}_${voz.sigla}`;
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
        <span class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-slate-950 text-[10px] font-bold text-amber-300 shadow" title="${voz.genero === "F" ? "Voz Feminina" : "Voz Masculina"}" aria-hidden="true">
          ${iconeGenero}
        </span>
      </div>
    `;
  }

  function obterListaVozesIdiomaAtual() {
    const catalogo = ehEdgeTts() ? VOZES_EDGE_CATALOGO : VOZES_CATALOGO;
    return catalogo[state.idioma] || catalogo.pt;
  }

  function obterVozesFiltradas() {
    const lista = obterListaVozesIdiomaAtual();
    if (state.filtroVoz === "todas") return lista;
    if (state.filtroVoz === "F" || state.filtroVoz === "M") {
      return lista.filter((v) => v.genero === state.filtroVoz);
    }
    return lista.filter((v) => v.categoria === state.filtroVoz);
  }

  function atualizarUiFiltrosVoz() {
    el.voiceFilterBtns.forEach((b) => {
      const f = b.getAttribute("data-voice-filter") || "todas";
      const ativo = f === state.filtroVoz;
      b.setAttribute("aria-pressed", ativo ? "true" : "false");
      b.className = ativo
        ? "voice-filter-btn active-filter rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 transition"
        : "voice-filter-btn rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs font-medium text-slate-300 hover:border-slate-700 transition";
    });
  }

  function atualizarBotoesCarrosselVozes() {
    if (!el.voicesGrid || !el.voicesCarouselNavBtns) return;
    const maxScroll = Math.max(0, el.voicesGrid.scrollWidth - el.voicesGrid.clientWidth);
    const atual = el.voicesGrid.scrollLeft;
    const noInicio = atual <= 6;
    const noFim = atual >= maxScroll - 6 || maxScroll <= 6;

    el.voicesCarouselNavBtns.forEach((btn) => {
      const dir = Number(btn.getAttribute("data-carousel-dir") || 0);
      btn.disabled = dir < 0 ? noInicio : noFim;
    });
  }

  function rolarCarrosselVozes(direcao) {
    if (!el.voicesGrid) return;
    const passo = Math.max(260, Math.round(el.voicesGrid.clientWidth * 0.8));
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.voicesGrid.scrollBy({
      left: direcao * passo,
      behavior: reduzido ? "auto" : "smooth",
    });
  }

  function renderizarCatalogoVozes(opcoes = {}) {
    if (!el.voicesGrid) return;
    const { preservarScroll = true, animarEntrada = false } = opcoes;
    const prevScrollLeft = preservarScroll ? el.voicesGrid.scrollLeft : 0;

    const isEdge = ehEdgeTts();
    const todasIdioma = obterListaVozesIdiomaAtual();
    const filtradas = obterVozesFiltradas();

    if (el.catalogLangCounter) {
      el.catalogLangCounter.textContent =
        state.idioma === "en"
          ? `${filtradas.length}/${todasIdioma.length} vozes EN`
          : `${filtradas.length}/${todasIdioma.length} vozes PT-BR`;
    }

    const vozSelecionadaObj =
      todasIdioma.find((v) => v.sigla === state.vozId) || todasIdioma[0];
    if (vozSelecionadaObj && state.vozId !== vozSelecionadaObj.sigla) {
      state.vozId = vozSelecionadaObj.sigla;
    }
    if (el.selectedVoiceBadge && vozSelecionadaObj) {
      if (state.modoVoz === "unica" && state.subModoVoz === "aleatoria") {
        el.selectedVoiceBadge.textContent = "Modo: 🎲 Voz única aleatória";
      } else if (state.modoVoz === "por_capitulo" && state.subModoVoz === "aleatoria") {
        el.selectedVoiceBadge.textContent = isEdge ? "Modo: 🎲 Rodízio automático por capítulo" : "Modo: 🎲 Aleatórias por capítulo";
      } else if (state.modoVoz === "por_capitulo") {
        el.selectedVoiceBadge.textContent = "Modo: Voz por capítulo (manual)";
      } else {
        el.selectedVoiceBadge.textContent = `Voz ativa: ${vozSelecionadaObj.nome} (${vozSelecionadaObj.sigla})`;
      }
    }

    if (!filtradas.length) {
      const vazio = document.createElement("div");
      vazio.className = "rounded-xl border border-slate-800 bg-slate-950/75 px-4 py-6 text-xs text-slate-400";
      vazio.textContent = "Nenhuma voz encontrada para este filtro.";
      el.voicesGrid.replaceChildren(vazio);
      el.voicesGrid.scrollLeft = 0;
      atualizarBotoesCarrosselVozes();
      return;
    }

    const modoVozUnicaManual = state.modoVoz === "unica" && state.subModoVoz === "escolher";
    const cards = [];

    filtradas.forEach((voz, index) => {
      const selecionada = modoVozUnicaManual && state.vozId === voz.sigla;
      const tocando =
        state.vozTocandoSigla === voz.sigla &&
        state.vozTocandoIdioma === voz.idioma &&
        state.vozTocandoMotor === (voz.motor || "xttsv2");

      const card = document.createElement("div");
      if (animarEntrada) {
        card.style.animationDelay = `${Math.min(index * 18, 220)}ms`;
      }
      const selectedClass = isEdge
        ? "selected-voice-edge border-cyan-400 bg-cyan-500/10"
        : "selected-voice border-amber-400 bg-amber-500/10";
      card.className = `voice-card ${animarEntrada ? "voice-card-enter" : ""} rounded-2xl border p-4 cursor-pointer flex flex-col justify-between ${
        tocando
          ? "playing-voice"
          : selecionada
          ? selectedClass
          : "border-slate-800 bg-slate-950/75 hover:border-slate-700"
      }`;

      const tagCategoria =
        voz.categoria === "densa"
          ? "⚖️ Densa / Técnica"
          : voz.categoria === "dinamica"
          ? "⚡ Dinâmica / Ágil"
          : "📖 Narrativa / Fluida";

      const badgeAtiva = isEdge
        ? `<span class="rounded bg-cyan-400 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-slate-950">Ativa</span>`
        : `<span class="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase text-slate-950">Ativa</span>`;

      const langAttr = voz.idioma === "en" ? "en" : "pt-BR";
      const playAriaLabel = tocando
        ? `Parar amostra de voz ${voz.nome}`
        : `Ouvir amostra de voz ${voz.nome} em ${state.velocidade.toFixed(2)}x`;

      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              ${criarAvatarSvg(voz)}
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h4 class="text-sm font-extrabold text-white truncate">${voz.nome}</h4>
                  ${selecionada ? badgeAtiva : ""}
                </div>
                <span class="block text-[11px] font-medium ${isEdge ? "text-cyan-300/95" : "text-amber-300/90"} truncate">${voz.perfil}</span>
                <span class="mt-0.5 inline-block rounded border border-slate-800 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  ${tagCategoria}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-play-voice="${voz.sigla}"
              data-play-lang="${voz.idioma}"
              aria-label="${playAriaLabel}"
              class="play-voice-btn shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition shadow ${
                tocando
                  ? "bg-emerald-400 text-slate-950 shadow-emerald-500/25"
                  : "bg-slate-800 text-slate-100 hover:bg-amber-400 hover:text-slate-950"
              }"
              title="Ouvir amostra real em ${state.velocidade.toFixed(2)}x"
            >
              ${
                tocando
                  ? `<span class="eq-bars" aria-hidden="true"><span></span><span></span><span></span><span></span></span><span>Parar</span>`
                  : `<span aria-hidden="true">▶</span><span>Ouvir</span>`
              }
            </button>
          </div>

          <p lang="${langAttr}" class="mt-3 text-xs text-slate-300 leading-relaxed line-clamp-2 italic">
            "${voz.frase}"
          </p>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
          <span class="font-mono text-slate-400">ID: <strong class="text-slate-200">${voz.sigla}</strong> · ${isEdge ? "EDGE" : "XTTS"} · ${voz.idioma.toUpperCase()}</span>
          <span class="font-semibold ${selecionada ? (isEdge ? "text-cyan-300" : "text-amber-300") : "text-slate-400"}">
            ${selecionada ? "✓ Selecionada" : "Clique p/ escolher"}
          </span>
        </div>

        <div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-900 ${tocando ? "" : "hidden"}" data-progress-wrap="${voz.sigla}">
          <div class="h-full bg-emerald-400 transition-all duration-100" style="width: 0%" data-progress-bar="${voz.sigla}"></div>
        </div>
      `;

      card.addEventListener("click", (ev) => {
        const playBtn = ev.target.closest("[data-play-voice]");
        if (playBtn) {
          ev.stopPropagation();
          alternarPreviewVoz(voz, { selecionarVoz: state.modoVoz === "unica" && state.subModoVoz === "escolher", motivo: "manual" });
          return;
        }
        state.vozId = voz.sigla;
        if (state.vozIdPorMotor[state.motorServico]) {
          state.vozIdPorMotor[state.motorServico][state.idioma] = voz.sigla;
        }
        if (state.modoVoz !== "unica" || state.subModoVoz !== "escolher") {
          state.modoVoz = "unica";
          state.subModoVoz = "escolher";
          atualizarUiModoVoz();
        }
        if (state.etapaAtiva === 1 && state.totalCaracteres > 0) {
          atualizarFluxoEtapas(2);
        }
        renderizarCatalogoVozes();
        renderizarMapeadorCapitulos();
        atualizarResumoPedido();
      });

      cards.push(card);
    });

    el.voicesGrid.replaceChildren(...cards);
    el.voicesGrid.scrollLeft = preservarScroll ? prevScrollLeft : 0;
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(atualizarBotoesCarrosselVozes);
    } else {
      atualizarBotoesCarrosselVozes();
    }
  }

  function renderizarMapeadorCapitulos() {
    if (!el.chapterVoiceMapper || !el.chapterVoiceList) return;
    if (state.modoVoz !== "por_capitulo" || state.subModoVoz !== "escolher") {
      el.chapterVoiceMapper.classList.add("hidden");
      return;
    }
    el.chapterVoiceMapper.classList.remove("hidden");

    const vozesIdioma = obterListaVozesIdiomaAtual();
    const caps = state.capitulosDetectados.length
      ? state.capitulosDetectados
      : [{ numero: 1, titulo: "Capítulo 1 (Documento Completo)" }];

    const rows = [];
    caps.forEach((cap, idx) => {
      const capKey = String(cap.numero || idx + 1);
      const existenteValida = vozesIdioma.some((v) => v.sigla === state.vozesCapitulos[capKey]);
      const siglaPadrao = existenteValida
        ? state.vozesCapitulos[capKey]
        : vozesIdioma[idx % vozesIdioma.length].sigla;
      state.vozesCapitulos[capKey] = siglaPadrao;

      const row = document.createElement("div");
      row.className =
        "flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs";

      const labelSpan = document.createElement("span");
      labelSpan.className = "truncate text-slate-200 font-medium";
      labelSpan.title = cap.titulo;
      const numStrong = document.createElement("strong");
      numStrong.className = "font-mono text-amber-300";
      numStrong.textContent = `#${capKey}`;
      labelSpan.append(numStrong, ` ${cap.titulo}`);

      const selectEl = document.createElement("select");
      selectEl.setAttribute("data-chapter-key", capKey);
      selectEl.setAttribute("aria-label", `Narrador do capítulo ${capKey}: ${cap.titulo}`);
      selectEl.className = "rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white";

      vozesIdioma.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.sigla;
        opt.textContent = `${v.nome} (${v.genero}) — ${v.perfil}`;
        if (v.sigla === siglaPadrao) opt.selected = true;
        selectEl.appendChild(opt);
      });

      selectEl.addEventListener("change", (e) => {
        state.vozesCapitulos[capKey] = e.target.value;
        atualizarResumoPedido();
      });

      row.append(labelSpan, selectEl);
      rows.push(row);
    });

    el.chapterVoiceList.replaceChildren(...rows);
  }

  // ==========================================================================
  // 5. REPRODUÇÃO 100% EM CIMA DOS ARQUIVOS MP3 REAIS + VELOCIDADE EM TEMPO REAL
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
    state.carregandoPreviewVoz = false;
    state.vozTocandoSigla = null;
    state.vozTocandoIdioma = null;
    state.vozTocandoMotor = null;
    renderizarCatalogoVozes();
  }

  function construirCandidatosMp3Voz(voz) {
    const id = voz.idioma;
    const s = voz.sigla;
    if (voz.motor === "edge" || ehEdgeTts()) {
      return [
        `amostras_vozes/edge/${id}/${s}.mp3`,
        `./amostras_vozes/edge/${id}/${s}.mp3`,
        `/amostras_vozes/edge/${id}/${s}.mp3`,
      ];
    }
    const sUp = s.toUpperCase();
    const sufixoEn = id === "en" ? "_en" : "";
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

  function alternarPreviewVoz(voz, opcoes = {}) {
    const { selecionarVoz = true, motivo = "manual" } = opcoes;
    const motorVoz = voz.motor || "xttsv2";
    if (
      motivo === "manual" &&
      state.vozTocandoSigla === voz.sigla &&
      state.vozTocandoIdioma === voz.idioma &&
      state.vozTocandoMotor === motorVoz
    ) {
      pararPreviewVoz();
      return;
    }

    const audio = el.voicePreviewAudio;
    if (!audio) return;

    audio.pause();
    state.carregandoPreviewVoz = true;
    state.vozTocandoSigla = voz.sigla;
    state.vozTocandoIdioma = voz.idioma;
    state.vozTocandoMotor = motorVoz;
    if (selecionarVoz) {
      state.vozId = voz.sigla;
      if (state.vozIdPorMotor[state.motorServico]) {
        state.vozIdPorMotor[state.motorServico][state.idioma] = voz.sigla;
      }
    }
    renderizarCatalogoVozes();
    atualizarResumoPedido();

    const candidatosUrl = construirCandidatosMp3Voz(voz);
    let idxTentativa = 0;

    const tentarProximoMp3 = () => {
      if (
        state.vozTocandoSigla !== voz.sigla ||
        state.vozTocandoIdioma !== voz.idioma ||
        state.vozTocandoMotor !== motorVoz
      ) {
        return;
      }
      if (idxTentativa >= candidatosUrl.length) {
        state.carregandoPreviewVoz = false;
        state.vozTocandoSigla = null;
        state.vozTocandoIdioma = null;
        state.vozTocandoMotor = null;
        renderizarCatalogoVozes();
        if (el.audioSourceStatusText) {
          const caminhoEsperado = motorVoz === "edge"
            ? `web/amostras_vozes/edge/${voz.idioma}/${voz.sigla}.mp3`
            : `web/amostras_vozes/${voz.idioma}/${voz.sigla}.mp3`;
          el.audioSourceStatusText.textContent = `⚠️ Amostra MP3 de ${voz.nome} não encontrada em ${caminhoEsperado}.`;
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
            state.carregandoPreviewVoz = false;
            aplicarVelocidadeNoAudioAtivo(state.velocidade);
            if (el.audioSourceStatusText) {
              const origemTipo = motorVoz === "edge"
                ? "Amostra real Edge TTS (rápido e gratuito)"
                : url.includes("amostras_vozes")
                ? "Amostra XTTSv2 Estúdio"
                : "Voz original do banco_vozes";
              const prefixoMotivo =
                motivo === "velocidade" ? "🎲 Teste de velocidade:" : "🔊 Tocando agora:";
              el.audioSourceStatusText.innerHTML =
                `${prefixoMotivo} <strong class="text-emerald-300">${voz.nome} (${voz.idioma.toUpperCase()})</strong> em <strong class="font-mono text-amber-300">${state.velocidade.toFixed(2)}x</strong> (${origemTipo}). Arraste o controle de velocidade acima para testar em tempo real!`;
            }
          })
          .catch(() => {
            tentarProximoMp3();
          });
      } else {
        state.carregandoPreviewVoz = false;
      }
    };

    audio.onended = () => {
      state.carregandoPreviewVoz = false;
      state.vozTocandoSigla = null;
      state.vozTocandoIdioma = null;
      state.vozTocandoMotor = null;
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

  function sortearVozDoIdiomaAtual(excluirSigla = null) {
    const lista = obterListaVozesIdiomaAtual();
    if (!lista.length) return null;
    const candidatas =
      excluirSigla && lista.length > 1
        ? lista.filter((v) => v.sigla !== excluirSigla)
        : lista;
    return candidatas[Math.floor(Math.random() * candidatas.length)];
  }

  function tocarVozAleatoriaParaVelocidade() {
    const voz = sortearVozDoIdiomaAtual(state.ultimaVozAleatoriaVel);
    if (!voz) return;
    state.ultimaVozAleatoriaVel = voz.sigla;
    alternarPreviewVoz(voz, { selecionarVoz: false, motivo: "velocidade" });
  }

  // ==========================================================================
  // 6. SELETOR GRANULAR DE VELOCIDADE (COM ATRAÇÃO MAGNÉTICA EM 0.85x, 1.0x, 1.25x)
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

  function atualizarVelocidade(novoValor, aplicarIma = true, acionarAudio = false) {
    const vel = normalizarVelocidadeComIma(novoValor, aplicarIma);
    state.velocidade = vel;

    if (el.speedSlider) el.speedSlider.value = vel.toFixed(2);
    if (el.speedDisplayBadge) el.speedDisplayBadge.textContent = `${vel.toFixed(2)}x`;

    el.speedPresetBtns.forEach((btn) => {
      const preset = parseFloat(btn.getAttribute("data-speed-preset"));
      const ativo = Math.abs(vel - preset) < 0.005;
      btn.setAttribute("aria-pressed", ativo ? "true" : "false");
      btn.classList.toggle("active-preset", ativo);
      btn.classList.toggle("border-amber-400/60", ativo);
      btn.classList.toggle("bg-amber-500/10", ativo);
      btn.classList.toggle("border-slate-800", !ativo);
      btn.classList.toggle("bg-slate-900/90", !ativo);
      const spans = btn.querySelectorAll("span");
      if (spans[0]) {
        spans[0].classList.toggle("text-amber-300", ativo);
        spans[0].classList.toggle("text-white", !ativo);
      }
      if (spans[1]) {
        spans[1].classList.toggle("text-slate-300", ativo);
        spans[1].classList.toggle("text-slate-400", !ativo);
      }
    });

    let rotuloRitmo = "Personalizada";
    if (Math.abs(vel - 0.85) < 0.005) rotuloRitmo = "Lenta — Ideal p/ leis e textos densos";
    else if (Math.abs(vel - 1.0) < 0.005) rotuloRitmo = "Normal — Cadência natural fluida";
    else if (Math.abs(vel - 1.25) < 0.005) rotuloRitmo = "Rápida — Revisão e ganho de tempo";

    if (el.speedHintText) {
      el.speedHintText.innerHTML = `Ritmo selecionado: <strong class="text-amber-300">${vel.toFixed(2)}x (${rotuloRitmo})</strong> — Este valor exato será aplicado na síntese (${ehEdgeTts() ? `Edge rate ${velocidadeParaRateEdge(vel)}` : "XTTSv2"}) e no áudio em reprodução.`;
    }

    aplicarVelocidadeNoAudioAtivo(vel);
    atualizarResumoPedido();

    if (acionarAudio) {
      const audio = el.voicePreviewAudio;
      const jaTocando = Boolean(
        audio && state.vozTocandoSigla && (state.carregandoPreviewVoz || (!audio.paused && !audio.ended))
      );
      if (!jaTocando) {
        tocarVozAleatoriaParaVelocidade();
      }
    }
  }

  function atualizarUiModoVoz() {
    const ehUnica = state.modoVoz === "unica";
    const grupos = [
      { box: el.voiceModeGroupUnica, panel: el.subModeUnicaPanel, ativo: ehUnica },
      { box: el.voiceModeGroupCapitulo, panel: el.subModeCapituloPanel, ativo: !ehUnica },
    ];

    grupos.forEach(({ box, panel, ativo }) => {
      if (box) {
        box.classList.toggle("active-mode", ativo);
        box.classList.toggle("border-amber-400", ativo);
        box.classList.toggle("bg-amber-500/10", ativo);
        box.classList.toggle("border-slate-800", !ativo);
        box.classList.toggle("bg-slate-900/70", !ativo);
      }
      if (panel) {
        panel.classList.toggle("hidden", !ativo);
        panel.classList.toggle("grid", ativo);
      }
    });

    if (el.voiceModeBtns) {
      el.voiceModeBtns.forEach((btn) => {
        const modo = btn.getAttribute("data-voice-mode") || "unica";
        const ativo = modo === state.modoVoz;
        btn.classList.toggle("active-mode", ativo);
        btn.setAttribute("aria-pressed", ativo ? "true" : "false");
      });
    }

    if (el.voiceSubmodeBtns) {
      el.voiceSubmodeBtns.forEach((btn) => {
        const parent = btn.getAttribute("data-voice-parent");
        const sub = btn.getAttribute("data-voice-submode");
        const ativo = parent === state.modoVoz && sub === state.subModoVoz;
        btn.setAttribute("aria-pressed", ativo ? "true" : "false");
        btn.classList.toggle("active-submode", ativo);
        btn.classList.toggle("border-amber-400", ativo);
        btn.classList.toggle("bg-amber-400/20", ativo);
        btn.classList.toggle("border-slate-700/80", !ativo);
        btn.classList.toggle("bg-slate-900/70", !ativo);
      });
    }
  }

  function alternarIdiomaCatalogo(novoIdioma, _origemAuto = false) {
    if (novoIdioma !== "pt" && novoIdioma !== "en") return;
    if (state.vozTocandoSigla && state.vozTocandoIdioma !== novoIdioma) {
      pararPreviewVoz();
    }
    state.idioma = novoIdioma;

    const lista = obterListaVozesIdiomaAtual();
    const salva = state.vozIdPorMotor[state.motorServico]?.[novoIdioma];
    if (salva && lista.some((v) => v.sigla === salva)) {
      state.vozId = salva;
    } else if (!lista.some((v) => v.sigla === state.vozId)) {
      state.vozId = lista[0].sigla;
    }

    renderizarCatalogoVozes({ preservarScroll: false, animarEntrada: true });
    renderizarMapeadorCapitulos();
    atualizarResumoPedido();
  }

  // ==========================================================================
  // 7. EXTRAÇÃO DE TEXTO E DETECÇÃO ESTRUTURAL DE CAPÍTULOS (.PDF, .DOCX, .TXT, .MD)
  // ==========================================================================
  function atualizarBarraLeitura(percent, textoStatus) {
    if (!el.readingProgressBox) return;
    const pct = Math.min(100, Math.max(0, Math.round(percent)));
    el.readingProgressBox.classList.remove("hidden");
    if (el.readingStatusText && textoStatus) el.readingStatusText.textContent = textoStatus;
    if (el.readingPercentText) el.readingPercentText.textContent = `${pct}%`;
    if (el.readingProgressBar) el.readingProgressBar.value = pct;
  }

  function ehLinhaTituloCapitulo(limpa) {
    if (!limpa || limpa.length < 3 || limpa.length > 120) return false;
    if (/\.{4,}\s*\d+$/.test(limpa)) return false;
    if (/^\d+$/.test(limpa)) return false;

    const padraoExplicito =
      /^(?:#{1,4}\s+.+|(?:cap[íi]tulo|chapter|se[çc][ãa]o|section|parte|part|unidade|unit|m[óo]dulo|module|aula|lesson|livro|book|t[íi]tulo|title|anexo|appendix|introdu[çc][ãa]o|introduction|conclus[ãa]o|conclusion|pref[áa]cio|preface|resumo|abstract)\b[\s\dIVXLCDM.:—–-]*.*)$/i;
    if (padraoExplicito.test(limpa)) return true;

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

    const cmpFrag = (a, b) => (Math.abs(b.y - a.y) > 3.5 ? b.y - a.y : a.x - b.x);
    const ordenados = typeof fragmentos.toSorted === "function"
      ? fragmentos.toSorted(cmpFrag)
      : [...fragmentos].sort(cmpFrag);

    const linhas = [];
    let linhaAtual = null;
    for (const f of ordenados) {
      if (!linhaAtual || Math.abs(f.y - linhaAtual.y) > 3.5) {
        if (linhaAtual) linhas.push(linhaAtual);
        linhaAtual = { y: f.y, textos: [f.str], maxAlt: f.alt };
      } else {
        linhaAtual.textos.push(f.str);
        if (f.alt > linhaAtual.maxAlt) linhaAtual.maxAlt = f.alt;
      }
    }
    if (linhaAtual) linhas.push(linhaAtual);

    const alturasRaw = linhas.map((l) => l.maxAlt);
    const alturasOrd = typeof alturasRaw.toSorted === "function"
      ? alturasRaw.toSorted((a, b) => a - b)
      : [...alturasRaw].sort((a, b) => a - b);
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

    const paginasLinhas = [];
    const imagensPorPagina = [];
    const pdfOps = (window.pdfjsLib && window.pdfjsLib.OPS) || {};
    const opsImagem = new Set(
      [
        pdfOps.paintImageXObject,
        pdfOps.paintInlineImageXObject,
        pdfOps.paintImageXObjectRepeat,
        pdfOps.paintJpegXObject,
      ].filter((v) => typeof v === "number")
    );

    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const { textoPagina, candidatosTitulo } = reconstruirLinhasPaginaPdf(content.items || []);
      textoAcumulado += textoPagina + "\n\n";
      const linhasPag = (textoPagina || "")
        .split(/\r?\n/)
        .map((l) => l.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      paginasLinhas.push(linhasPag);

      let qtdImgs = 0;
      const charsBrutosPag = linhasPag.join(" ").length;
      if (charsBrutosPag < 500 && opsImagem.size > 0 && typeof page.getOperatorList === "function") {
        try {
          const opList = await page.getOperatorList();
          const fns = (opList && opList.fnArray) || [];
          for (let k = 0; k < fns.length; k++) {
            if (opsImagem.has(fns[k])) qtdImgs++;
          }
        } catch (_) {}
      }
      imagensPorPagina.push(qtdImgs);

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
      paginasLinhas,
      imagensPorPagina,
    };
  }

  // [web_v12_01] Detecta PDFs híbridos (cabeçalho/rodapé em texto + miolo em imagem/print)
  function avaliarPdfHibridoAntiOcr(resultado, minCharsPagina) {
    const linhasPorPag = Array.isArray(resultado && resultado.paginasLinhas) ? resultado.paginasLinhas : [];
    const imgsPorPag = Array.isArray(resultado && resultado.imagensPorPagina) ? resultado.imagensPorPagina : [];
    const numPages = Math.max(1, linhasPorPag.length || (resultado && resultado.paginas) || 1);
    if (!linhasPorPag.length) return { bloqueado: false };

    const minChars = Math.max(1, Number(minCharsPagina) || 80);
    const limiarComImagem = Math.max(150, Math.round(minChars * 1.85));

    const repetidas = new Set();
    if (numPages >= 3) {
      const freq = new Map();
      for (const ls of linhasPorPag) {
        const chaves = new Set(ls.map((l) => l.toLowerCase().replace(/\d+/g, "#").trim()));
        for (const k of chaves) {
          if (k.length >= 4) freq.set(k, (freq.get(k) || 0) + 1);
        }
      }
      const corte = Math.max(2, Math.ceil(numPages * 0.5));
      for (const [k, c] of freq.entries()) {
        if (c >= corte) repetidas.add(k);
      }
    }

    const charsUteisPorPag = linhasPorPag.map((ls) => {
      const filtradas = ls.filter((l) => !repetidas.has(l.toLowerCase().replace(/\d+/g, "#").trim()));
      return filtradas.join(" ").replace(/\s+/g, " ").trim().length;
    });
    const mediaUteis = charsUteisPorPag.reduce((acc, n) => acc + n, 0) / numPages;

    let pagsPobres = 0;
    for (let i = 0; i < charsUteisPorPag.length; i++) {
      const u = charsUteisPorPag[i];
      const nImgs = imgsPorPag[i] || 0;
      if (u < minChars || (u < limiarComImagem && nImgs >= 1)) {
        pagsPobres++;
      }
    }

    if (numPages >= 3 && mediaUteis < minChars) {
      return {
        bloqueado: true,
        motivo: `Texto útil insuficiente após descontar cabeçalhos/rodapés repetidos (média útil de ${Math.round(
          mediaUteis
        )} chars/pág., mínimo exigido: ${minChars}). Parece conter conteúdo em imagem/print sem OCR.`,
      };
    }
    if (numPages >= 2 && pagsPobres / numPages >= 0.5) {
      return {
        bloqueado: true,
        motivo: `O PDF parece ter conteúdo majoritariamente em imagem/print (${pagsPobres} de ${numPages} páginas sem texto selecionável suficiente; média útil de ${Math.round(
          mediaUteis
        )} chars/pág.). Converta com OCR antes de enviar.`,
      };
    }
    return { bloqueado: false };
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

  function recalcularAgregadosDocumentos() {
    if (!state.arquivos.length) {
      state.arquivo = null;
      state.nomeArquivo = "";
      state.tamanhoBytes = 0;
      state.totalCaracteres = 0;
      state.paginasEstimadas = 0;
      state.capitulosDetectados = [{ numero: 1, titulo: "Documento Completo" }];
      state.valorCalculado = calcularPrecoPorCaracteres(0);
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

  function obterResumoIdiomasDocumentos() {
    const total = state.arquivos.length;
    const qtdPt = state.arquivos.filter((a) => a.idioma === "pt").length;
    const qtdEn = state.arquivos.filter((a) => a.idioma === "en").length;
    const pendentes = state.arquivos.filter((a) => a.idioma !== "pt" && a.idioma !== "en");
    return { total, qtdPt, qtdEn, pendentes };
  }

  function atualizarStatusIdiomaDocumentos() {
    const { total, qtdPt, qtdEn, pendentes } = obterResumoIdiomasDocumentos();
    if (el.docDetectedLangBadge && total > 0) {
      if (pendentes.length > 0) {
        el.docDetectedLangBadge.className =
          "rounded-full border border-amber-400/60 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300";
        el.docDetectedLangBadge.textContent =
          pendentes.length === 1 && total === 1
            ? "⚠️ Obrigatório: escolha o idioma do arquivo"
            : `⚠️ Idioma pendente em ${pendentes.length} de ${total} documento(s)`;
      } else if (qtdPt > 0 && qtdEn > 0) {
        el.docDetectedLangBadge.className =
          "rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300";
        el.docDetectedLangBadge.textContent = `🌐 Idiomas: PT-BR (${qtdPt}) · EN (${qtdEn})`;
      } else if (qtdEn > 0) {
        el.docDetectedLangBadge.className =
          "rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300";
        el.docDetectedLangBadge.textContent = "🇺🇸 Idioma: Inglês";
      } else {
        el.docDetectedLangBadge.className =
          "rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300";
        el.docDetectedLangBadge.textContent = "🇧🇷 Idioma: Português (PT-BR)";
      }
    }

    if (el.docLangValidationError) {
      if (pendentes.length === 0) {
        el.docLangValidationError.classList.add("hidden");
        el.docLangValidationError.textContent = "";
      } else if (state.validacaoIdiomaTentada) {
        const nomesPend = pendentes.map((a) => `"${a.nome}"`).join(", ");
        el.docLangValidationError.textContent = `Campo obrigatório: selecione o idioma (PT-BR ou EN) para ${nomesPend} antes de continuar.`;
        el.docLangValidationError.classList.remove("hidden");
      }
    }
  }

  function renderizarListaArquivosAnexados() {
    if (!el.attachedFilesList) return;
    const rows = [];

    state.arquivos.forEach((item, index) => {
      const qtdCaps = item.capitulos ? item.capitulos.length : 1;
      const idiomaDefinido = item.idioma === "pt" || item.idioma === "en";
      const faltaComErro = state.validacaoIdiomaTentada && !idiomaDefinido;
      const isPt = item.idioma === "pt";
      const isEn = item.idioma === "en";

      const row = document.createElement("div");
      row.setAttribute("data-file-row-id", item.id);
      row.className = `flex flex-wrap items-center justify-between gap-2.5 rounded-lg border px-3 py-2 text-xs transition ${
        faltaComErro
          ? "doc-row-lang-missing border-red-500/80 bg-red-950/25"
          : "border-slate-800 bg-slate-950/80"
      }`;
      row.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/20 font-mono text-[10px] font-bold text-amber-300">${index + 1}</span>
          <span class="font-semibold text-white truncate" data-file-name-label></span>
          <span class="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">${formatarBytes(item.tamanhoBytes)}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="font-mono text-[11px] text-slate-300">${formatarInteiro(item.caracteres)} chars · ${item.paginas} pág. · <strong class="text-amber-300">${qtdCaps} cap./seç.</strong></span>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider ${
              faltaComErro ? "text-red-300" : idiomaDefinido ? "text-emerald-300" : "text-amber-300"
            }">
              ${faltaComErro ? "Escolha o idioma *" : idiomaDefinido ? "Idioma:" : "Idioma *"}
            </span>
            <div
              role="group"
              data-lang-group
              class="doc-lang-toggle ${
                faltaComErro
                  ? "doc-lang-toggle-pending doc-lang-toggle-error border-red-400/80 bg-red-950/40"
                  : idiomaDefinido
                  ? "border-emerald-500/45 bg-slate-900"
                  : "doc-lang-toggle-pending border-amber-400/60 bg-slate-900"
              } inline-flex items-center gap-1 rounded-lg border p-0.5"
            >
              <button
                type="button"
                data-doc-lang="pt"
                data-file-id="${item.id}"
                aria-pressed="${isPt ? "true" : "false"}"
                class="doc-lang-btn ${isPt ? "active-doc-lang" : !idiomaDefinido ? "doc-lang-btn-pending" : ""} rounded-md px-2 py-0.5 text-[11px] font-bold transition"
                title="Definir Português (PT-BR) para este documento"
              >
                🇧🇷 PT
              </button>
              <button
                type="button"
                data-doc-lang="en"
                data-file-id="${item.id}"
                aria-pressed="${isEn ? "true" : "false"}"
                class="doc-lang-btn ${isEn ? "active-doc-lang" : !idiomaDefinido ? "doc-lang-btn-pending" : ""} rounded-md px-2 py-0.5 text-[11px] font-bold transition"
                title="Definir Inglês (EN) para este documento"
              >
                🇺🇸 EN
              </button>
            </div>
          </div>
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

      // Define nome do arquivo via textContent (seguro contra HTML/XSS em nomes de arquivo)
      const nameNode = row.querySelector("[data-file-name-label]");
      if (nameNode) {
        nameNode.textContent = item.nome;
        nameNode.title = item.nome;
      }
      const langGroup = row.querySelector("[data-lang-group]");
      if (langGroup) {
        langGroup.setAttribute("aria-label", `Idioma obrigatório de ${item.nome}`);
      }

      row.querySelectorAll("[data-doc-lang]").forEach((langBtn) => {
        langBtn.addEventListener("click", () => {
          const escolhido = langBtn.getAttribute("data-doc-lang");
          if (escolhido !== "pt" && escolhido !== "en") return;
          item.idioma = escolhido;
          const aindaPendente = state.arquivos.some((a) => a.idioma !== "pt" && a.idioma !== "en");
          if (!aindaPendente) {
            state.validacaoIdiomaTentada = false;
            if (el.formValidationError && el.formValidationError.dataset.langOnly === "true") {
              el.formValidationError.classList.add("hidden");
              delete el.formValidationError.dataset.langOnly;
            }
          }
          alternarIdiomaCatalogo(escolhido, false);
          atualizarCardsResumoDocumentos();
          atualizarFluxoEtapas(state.etapaAtiva);
        });
      });

      const btnRem = row.querySelector("[data-remove-file-id]");
      btnRem.setAttribute("aria-label", `Remover arquivo ${item.nome}`);
      btnRem.addEventListener("click", () => {
        removerArquivoAnexado(item.id);
      });

      rows.push(row);
    });

    el.attachedFilesList.replaceChildren(...rows);
  }

  function atualizarCardsResumoDocumentos(animarPreco = false) {
    if (!state.arquivos.length) {
      state.validacaoIdiomaTentada = false;
      if (el.docLangValidationError) el.docLangValidationError.classList.add("hidden");
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
    atualizarStatusIdiomaDocumentos();
    renderizarListaArquivosAnexados();
    if (el.docSummaryCard) el.docSummaryCard.classList.remove("hidden");
    if (animarPreco) {
      dispararFlashPreco();
    }
    renderizarMapeadorCapitulos();
    atualizarResumoPedido();
  }

  function removerArquivoAnexado(idArquivo) {
    state.arquivos = state.arquivos.filter((a) => a.id !== idArquivo);
    recalcularAgregadosDocumentos();
    const idiomasRestantes = Array.from(
      new Set(state.arquivos.map((a) => a.idioma).filter((id) => id === "pt" || id === "en"))
    );
    if (idiomasRestantes.length === 1 && idiomasRestantes[0] !== state.idioma) {
      alternarIdiomaCatalogo(idiomasRestantes[0], false);
    }
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
    let arquivosProcessados = 0;

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

        if (ext === ".pdf") {
          const checkHibrido = avaliarPdfHibridoAntiOcr(resultado, CONFIG_COMERCIAL.COM_MIN_CHARS_PAGINA);
          if (checkHibrido.bloqueado) {
            errosOcr.push(`"${nome}": ${checkHibrido.motivo}`);
            continue;
          }
        }

        const idiomaDetectado = detectarIdiomaTexto(resultado.texto, nome);

        const idxExistente = state.arquivos.findIndex(
          (a) => a.nome === nome && a.tamanhoBytes === file.size
        );
        const idiomaExistente =
          idxExistente >= 0 && (state.arquivos[idxExistente].idioma === "pt" || state.arquivos[idxExistente].idioma === "en")
            ? state.arquivos[idxExistente].idioma
            : null;
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
          idioma: idiomaExistente,
          idiomaDetectado,
        };

        if (idxExistente >= 0) {
          state.arquivos[idxExistente] = novoItem;
        } else {
          state.arquivos.push(novoItem);
        }
        arquivosProcessados++;
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

    const todosIdiomasDefinidos =
      state.arquivos.length > 0 &&
      state.arquivos.every((a) => a.idioma === "pt" || a.idioma === "en");

    atualizarCardsResumoDocumentos(arquivosProcessados > 0);
    if (state.arquivos.length > 0) {
      atualizarFluxoEtapas(todosIdiomasDefinidos ? 2 : 1);
    }
  }

  // ==========================================================================
  // 8. ESTIMATIVA DINÂMICA DE TEMPO (XTTSv2 CPU E EDGE TTS PARALELO) & RESUMO
  // ==========================================================================
  function calcularMinutosXttsLocal(totalChars) {
    const chars = Number(totalChars || 0);
    if (!Number.isFinite(chars) || chars <= 0) {
      return 0;
    }
    const cal = state.calibracaoCpu || {};
    const setupSeg = Number(cal.setup_seg) > 0 ? Number(cal.setup_seg) : CONFIG_COMERCIAL.CPU_SETUP_SEG;
    const baseSeg = Number(cal.base_seg) > 0 ? Number(cal.base_seg) : CONFIG_COMERCIAL.CPU_BASE_SEG;
    const sByte = Number(cal.s_byte) > 0 ? Number(cal.s_byte) : CONFIG_COMERCIAL.CPU_S_POR_BYTE;
    const workersPorFatia = Math.max(
      1,
      Number(cal.workers_por_fatia) || CONFIG_COMERCIAL.CPU_WORKERS_POR_FATIA || 3
    );
    const fatiasAtivas = Math.max(1, Number(cal.fatias_ativas) || CONFIG_COMERCIAL.CPU_FATIAS_ATIVAS || 45);
    const workersTotais = Math.max(
      1,
      Number(cal.workers_totais) || fatiasAtivas * workersPorFatia || CONFIG_COMERCIAL.CPU_WORKERS_TOTAIS
    );
    const autocal =
      typeof cal.autocalibrado === "boolean" ? cal.autocalibrado : Boolean(CONFIG_COMERCIAL.CPU_AUTOCALIBRADO);
    const pisoMin =
      cal.piso_min !== undefined && cal.piso_min !== null && Number.isFinite(Number(cal.piso_min))
        ? Math.max(0, Number(cal.piso_min))
        : Number(CONFIG_COMERCIAL.COM_TEMPO_ATUACAO_MIN ?? 15);
    const margem = autocal
      ? Number(CONFIG_COMERCIAL.COM_MARGEM_AUTOCAL || 1.1)
      : Number(cal.margem_seguranca) > 0
      ? Number(cal.margem_seguranca)
      : CONFIG_COMERCIAL.COM_MARGEM_SEGURANCA;

    const bytesEst = Math.max(1, Math.round(chars));
    const numPartes = Math.min(
      workersTotais,
      Math.max(1, Math.floor(bytesEst / CONFIG_COMERCIAL.PARTICAO_PISO_BYTES))
    );
    const tamParte = Math.ceil(bytesEst / numPartes);
    const maxPartesNaFatia = Math.ceil(numPartes / fatiasAtivas);
    const baldesNaFatia = Math.ceil(maxPartesNaFatia / workersPorFatia);

    const segSintese = setupSeg + baldesNaFatia * (baseSeg + sByte * tamParte);
    const segOverhead = 120 + 2 * numPartes;

    const minutosBrutos = (segSintese + segOverhead) / 60.0;
    const minutosComMargem = Math.ceil(minutosBrutos * margem);
    return Math.max(pisoMin, minutosComMargem);
  }

  // [web_v07_00] Estimativa calibrada para Edge TTS em paralelo (Whispr Flow Like Plus: 6 instâncias × blocos 1.200 chars)
  function calcularMinutosEdgeLocal(totalChars) {
    const chars = Number(totalChars || 0);
    if (!Number.isFinite(chars) || chars <= 0) {
      return 0;
    }
    const cal = state.calibracaoEdge || {};
    const alvoBloco = Math.max(300, Number(cal.alvo_bloco) || CONFIG_COMERCIAL.EDGE_ALVO_BLOCO);
    const paralelas = Math.max(1, Number(cal.paralelas) || CONFIG_COMERCIAL.EDGE_PARALELAS);
    const handshakeSeg = Number(cal.handshake_seg) > 0 ? Number(cal.handshake_seg) : CONFIG_COMERCIAL.EDGE_HANDSHAKE_SEG;
    const sPorChar = Number(cal.s_por_char) > 0 ? Number(cal.s_por_char) : CONFIG_COMERCIAL.EDGE_S_POR_CHAR;
    const overheadBase = Number(cal.overhead_base_seg) >= 0 ? Number(cal.overhead_base_seg) : CONFIG_COMERCIAL.EDGE_OVERHEAD_BASE_SEG;
    const overheadBloco = Number(cal.overhead_bloco_seg) >= 0 ? Number(cal.overhead_bloco_seg) : CONFIG_COMERCIAL.EDGE_OVERHEAD_POR_BLOCO_SEG;
    const margem = Number(cal.margem_seguranca) > 0 ? Number(cal.margem_seguranca) : CONFIG_COMERCIAL.EDGE_MARGEM_SEGURANCA;
    const pisoMin =
      cal.piso_min !== undefined && cal.piso_min !== null && Number.isFinite(Number(cal.piso_min))
        ? Math.max(1, Number(cal.piso_min))
        : Number(CONFIG_COMERCIAL.EDGE_PISO_MIN ?? 2);

    const numBlocos = Math.max(1, Math.ceil(chars / alvoBloco));
    const ondas = Math.ceil(numBlocos / paralelas);
    const tamMedioBloco = Math.min(alvoBloco, chars / numBlocos);

    const segPorOnda = handshakeSeg + sPorChar * tamMedioBloco;
    const segSintese = ondas * segPorOnda;
    const segOverhead = overheadBase + overheadBloco * numBlocos;

    const minutosBrutos = (segSintese + segOverhead) / 60.0;
    const minutosComMargem = Math.ceil(minutosBrutos * margem);
    return Math.max(pisoMin, minutosComMargem);
  }

  function calcularMinutosConversaoLocal(totalChars, motor = state.motorServico) {
    return motor === "edge"
      ? calcularMinutosEdgeLocal(totalChars)
      : calcularMinutosXttsLocal(totalChars);
  }

  function atualizarExibicaoCotaEPreco(preco) {
    const isEdge = ehEdgeTts();
    const temDoc = state.totalCaracteres > 0;
    const cotaTotal = state.cotaTotalChars;
    const cotaRest = state.cotaRestanteChars;
    const cobertos = state.charsCobertosCota;
    const cobraveis = state.charsCobraveis;
    const gratis = state.pedidoGratuito;
    const valorFmt = preco <= 0 ? "GRÁTIS" : formatarBRL(preco);

    if (el.priceDisplay) el.priceDisplay.textContent = valorFmt;
    if (el.docPriceCount) el.docPriceCount.textContent = valorFmt;

    if (el.docPriceLabel) {
      el.docPriceLabel.textContent = isEdge
        ? "Valor (Edge TTS · Grátis)"
        : preco <= 0
        ? "Valor Estimado (Cota Grátis)"
        : "Valor PIX Calculado";
    }
    if (el.summaryPriceLabel) {
      el.summaryPriceLabel.textContent = isEdge
        ? "Serviço Edge TTS"
        : preco <= 0
        ? "Valor do Pedido"
        : "Valor Total PIX";
    }

    const pagsCotaTotal = Math.max(
      0,
      Math.round(cotaTotal / Math.max(100, Number(CONFIG_COMERCIAL.COM_CHARS_POR_PAGINA) || 2000))
    );
    const precoMilFmt = formatarBRL((Number(CONFIG_COMERCIAL.COM_VALOR_CARACTERE) || 0.00005) * 1000);
    const valorMinFmt = formatarBRL(Number(CONFIG_COMERCIAL.COM_VALOR_MINIMO) || 1.0);

    if (el.quotaStatusTitle) {
      el.quotaStatusTitle.textContent = isEdge
        ? "⚡ Edge TTS Ativo (100% Gratuito · Cota XTTSv2 intacta)"
        : cotaTotal > 0
        ? `🎁 Cota Gratuita XTTSv2 (${pagsCotaTotal} páginas / ${formatarInteiro(cotaTotal)} chars)`
        : "🎙️ XTTSv2 Sob Demanda (sem cota gratuita ativa)";
    }
    if (el.quotaBalanceBadge) {
      el.quotaBalanceBadge.textContent = isEdge
        ? `Sem consumo · ${formatarInteiro(cotaRest)} ch XTTSv2 intactos`
        : `${formatarInteiro(cotaRest)} chars disponíveis`;
    }
    if (el.quotaBalanceBar) {
      const pctRest = cotaTotal > 0 ? Math.max(0, Math.min(100, (cotaRest / cotaTotal) * 100)) : 0;
      el.quotaBalanceBar.style.width = `${pctRest}%`;
    }
    if (el.quotaStatusHint) {
      if (isEdge) {
        el.quotaStatusHint.textContent = `O serviço Edge TTS é 100% gratuito e sem limite de caracteres. Sua cota gratuita do XTTSv2 (${formatarInteiro(
          cotaTotal
        )} chars) permanece preservada para quando você quiser qualidade de estúdio.`;
      } else if (cotaRest <= 0) {
        el.quotaStatusHint.textContent =
          cotaTotal > 0
            ? `Cota gratuita inicial de ${formatarInteiro(
                cotaTotal
              )} caracteres do XTTSv2 já consumida para este e-mail. Cobrança padrão de ${precoMilFmt} / 1.000 chars (mín. ${valorMinFmt}) — ou troque para Edge TTS no Passo 02 para converter grátis.`
            : `Cobrança padrão de ${precoMilFmt} / 1.000 chars (mín. ${valorMinFmt}) no XTTSv2 — ou troque para Edge TTS no Passo 02 para converter grátis.`;
      } else if (temDoc && cobraveis > 0) {
        el.quotaStatusHint.textContent = `Este pedido XTTSv2 consome seus últimos ${formatarInteiro(
          cobertos
        )} chars grátis e cobra apenas o excedente de ${formatarInteiro(cobraveis)} chars via PIX.`;
      } else if (temDoc) {
        const apos = Math.max(0, cotaRest - cobertos);
        el.quotaStatusHint.textContent = `Este pedido XTTSv2 usa ${formatarInteiro(
          cobertos
        )} chars da sua cota gratuita. Após confirmar, ainda restarão ${formatarInteiro(apos)} chars grátis.`;
      } else {
        el.quotaStatusHint.textContent =
          "O saldo gratuito do XTTSv2 é vinculado ao seu e-mail. No modo Edge TTS, a conversão é sempre 100% gratuita e não consome esta cota.";
      }
    }

    if (el.summaryQuotaLabel) {
      el.summaryQuotaLabel.textContent = isEdge
        ? "• Cota XTTSv2:"
        : `• Cota grátis XTTSv2 (${pagsCotaTotal} pág.):`;
    }
    if (el.summaryQuotaStatus) {
      if (isEdge) {
        el.summaryQuotaStatus.textContent = `Preservada (${formatarInteiro(cotaRest)} ch intactos)`;
      } else if (!temDoc) {
        el.summaryQuotaStatus.textContent = `${formatarInteiro(cotaRest)} de ${formatarInteiro(cotaTotal)} chars`;
      } else if (cobertos > 0) {
        const apos = Math.max(0, cotaRest - cobertos);
        el.summaryQuotaStatus.textContent = `-${formatarInteiro(cobertos)} chars (restam ${formatarInteiro(apos)})`;
      } else {
        el.summaryQuotaStatus.textContent = "Esgotada (0 chars restantes)";
      }
    }

    let notaFormula = "";
    if (isEdge) {
      notaFormula = "100% gratuito no Edge TTS";
    } else if (!temDoc) {
      notaFormula =
        cotaRest > 0
          ? `Grátis até ${formatarInteiro(cotaRest)} chars (~${Math.floor(
              cotaRest / CONFIG_COMERCIAL.COM_CHARS_POR_PAGINA
            )} pág.)`
          : "Mín. R$ 1,00 (até 20.000 chars)";
    } else if (gratis) {
      notaFormula = `100% coberto pela cota grátis (${formatarInteiro(cobertos)} chars)`;
    } else {
      const bruto = cobraveis * CONFIG_COMERCIAL.COM_VALOR_CARACTERE;
      const prefixo = cobertos > 0 ? `Excedente ${formatarInteiro(cobraveis)} ch · ` : "";
      notaFormula =
        bruto < CONFIG_COMERCIAL.COM_VALOR_MINIMO
          ? `${prefixo}Bruto ${formatarBRL(bruto)} → Piso R$ 1,00`
          : `${prefixo}${formatarInteiro(cobraveis)} × R$ 0,00005 = ${formatarBRL(preco)}`;
    }

    if (el.priceFormulaHint) el.priceFormulaHint.textContent = notaFormula;
    if (el.docPriceFormulaNote) el.docPriceFormulaNote.textContent = notaFormula;

    if (el.generatePixBtn) {
      if (isEdge) {
        el.generatePixBtn.textContent = "⚡ Iniciar Conversão Gratuita e Rápida (Edge TTS)";
        el.generatePixBtn.className =
          "w-full rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
      } else {
        el.generatePixBtn.textContent =
          preco <= 0
            ? "✓ Iniciar Conversão Gratuita XTTSv2 (Usa Cota Inicial)"
            : `Gerar QR Code PIX (${formatarBRL(preco)}) e Iniciar Conversão XTTSv2`;
        el.generatePixBtn.className =
          "w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
      }
    }
  }

  function formatarDuracaoHorasMinutos(totalMinutos) {
    const m = Math.max(0, Math.round(Number(totalMinutos) || 0));
    if (m < 60) {
      return `${m} min`;
    }
    const h = Math.floor(m / 60);
    const resto = m % 60;
    const hLabel = h === 1 ? "hora" : "horas";
    if (resto === 0) {
      return `${h} ${hLabel}`;
    }
    const mLabel = resto === 1 ? "minuto" : "minutos";
    return `${h} ${hLabel} e ${resto} ${mLabel}`;
  }

  function formatarPrazoExtenso(totalMinutos) {
    const m = Math.max(1, Math.round(Number(totalMinutos) || 0));
    if (m === 1) {
      return "1 minuto";
    }
    if (m < 60) {
      return `${m} minutos`;
    }
    const h = Math.floor(m / 60);
    const resto = m % 60;
    const hLabel = h === 1 ? "hora" : "horas";
    if (resto === 0) {
      return `${h} ${hLabel}`;
    }
    const mLabel = resto === 1 ? "minuto" : "minutos";
    return `${h} ${hLabel} e ${resto} ${mLabel}`;
  }

  function validarConfirmacaoEmail() {
    if (!el.clientEmailConfirm) return true;
    const emailRaw = (el.clientEmail?.value || "").trim();
    const confirmRaw = (el.clientEmailConfirm.value || "").trim();
    const emailNorm = normalizarEmailCota(emailRaw);
    const confirmNorm = normalizarEmailCota(confirmRaw);

    let divergente = false;
    if (!confirmRaw) {
      el.clientEmailConfirm.setCustomValidity("");
      if (el.clientEmailConfirmErrorText) {
        el.clientEmailConfirmErrorText.textContent = "Digite o mesmo e-mail novamente para confirmar.";
      }
    } else if (emailNorm && confirmNorm !== emailNorm) {
      divergente = true;
      el.clientEmailConfirm.setCustomValidity("Os endereços de e-mail não coincidem.");
      if (el.clientEmailConfirmErrorText) {
        el.clientEmailConfirmErrorText.textContent =
          "Os e-mails digitados não coincidem. Verifique se há algum erro de digitação.";
      }
    } else {
      el.clientEmailConfirm.setCustomValidity("");
      if (el.clientEmailConfirmErrorText) {
        el.clientEmailConfirmErrorText.textContent = el.clientEmailConfirm.validity.typeMismatch
          ? "Digite um endereço de e-mail válido no formato nome@dominio.com."
          : "Digite o mesmo e-mail novamente para confirmar.";
      }
    }

    const matchValido = Boolean(
      emailNorm &&
        confirmNorm &&
        emailNorm === confirmNorm &&
        el.clientEmail?.validity?.valid &&
        el.clientEmailConfirm.validity.valid
    );
    if (el.clientEmailConfirmMatch) {
      el.clientEmailConfirmMatch.classList.toggle("hidden", !matchValido);
      el.clientEmailConfirmMatch.classList.toggle("flex", matchValido);
    }
    return !divergente && Boolean(confirmRaw) && el.clientEmailConfirm.validity.valid;
  }

  function formatarRotuloEntrega(agora, entregaDate, minuscula = false) {
    const hh = String(entregaDate.getHours()).padStart(2, "0");
    const mm = String(entregaDate.getMinutes()).padStart(2, "0");
    const hora = `${hh}:${mm}`;

    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioEntrega = new Date(entregaDate.getFullYear(), entregaDate.getMonth(), entregaDate.getDate());
    const diffDias = Math.round((inicioEntrega.getTime() - inicioHoje.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDias <= 0) {
      return `${minuscula ? "hoje" : "Hoje"} às ${hora}`;
    }
    if (diffDias === 1) {
      return `${minuscula ? "amanhã" : "Amanhã"} às ${hora}`;
    }
    const dd = String(entregaDate.getDate()).padStart(2, "0");
    const mes = String(entregaDate.getMonth() + 1).padStart(2, "0");
    return `${minuscula ? "dia" : "Dia"} ${dd}/${mes} às ${hora}`;
  }

  function atualizarResumoPedido() {
    const isEdge = ehEdgeTts();
    const preco = calcularPrecoPorCaracteres(state.totalCaracteres);
    state.valorCalculado = preco;

    const temDoc = state.totalCaracteres > 0;
    const filaMin = isEdge ? state.filaMinutosFrenteEdge : state.filaMinutosFrente;
    const filaPed = isEdge ? state.filaPedidosFrenteEdge : state.filaPedidosFrente;
    const minProprio = temDoc ? calcularMinutosConversaoLocal(state.totalCaracteres) : 0;
    const minTotais = temDoc ? filaMin + minProprio : 0;
    state.prazoEstimadoMinutos = minTotais;

    if (temDoc) {
      const agora = new Date();
      const entregaDate = new Date(agora.getTime() + minTotais * 60 * 1000);
      const hh = String(entregaDate.getHours()).padStart(2, "0");
      const mm = String(entregaDate.getMinutes()).padStart(2, "0");
      state.horarioEntregaFormatado = `${hh}:${mm}`;
      state.previsaoEntregaRotulo = formatarRotuloEntrega(agora, entregaDate, false);
      state.previsaoEntregaRotuloModal = formatarRotuloEntrega(agora, entregaDate, true);
    } else {
      state.horarioEntregaFormatado = "--:--";
      state.previsaoEntregaRotulo = "Aguardando documento...";
      state.previsaoEntregaRotuloModal = "--";
    }

    if (el.estEngineSummary) {
      el.estEngineSummary.textContent = isEdge
        ? "⚡ Edge TTS (Rápido · Gratuito)"
        : "🎙️ XTTSv2 (Qualidade Estúdio)";
      el.estEngineSummary.className = isEdge
        ? "font-mono font-bold text-cyan-300"
        : "font-mono font-bold text-amber-300";
    }

    if (el.summaryDocStatus) {
      el.summaryDocStatus.textContent =
        temDoc
          ? `${state.arquivos.length} arq. · ${formatarInteiro(state.totalCaracteres)} chars (${state.capitulosDetectados.length} cap.)`
          : "Aguardando arquivo...";
      el.summaryDocStatus.className =
        temDoc
          ? "font-mono font-semibold text-white"
          : "font-mono font-semibold text-slate-400";
    }

    atualizarExibicaoCotaEPreco(preco);
    atualizarCardsComparacaoMotores();

    if (el.estConversionTime) {
      el.estConversionTime.textContent = temDoc ? `~${formatarDuracaoHorasMinutos(minProprio)}` : "--";
    }

    if (el.estQueueStatus) {
      if (filaPed <= 0) {
        el.estQueueStatus.textContent = isEdge
          ? "Livre (processamento imediato)"
          : "Livre (0 pedidos na frente)";
        el.estQueueStatus.className = "font-mono font-semibold text-emerald-300";
      } else {
        el.estQueueStatus.textContent = `${filaPed} pedido(s) (+${filaMin} min)`;
        el.estQueueStatus.className = "font-mono font-semibold text-amber-300";
      }
    }

    let modoLabel = `Voz: ${state.vozId}`;
    if (state.modoVoz === "unica" && state.subModoVoz === "aleatoria") {
      modoLabel = "Voz única aleatória";
    } else if (state.modoVoz === "por_capitulo" && state.subModoVoz === "aleatoria") {
      modoLabel = isEdge ? "Rodízio p/ capítulo" : "Aleatórias p/ capítulo";
    } else if (state.modoVoz === "por_capitulo") {
      modoLabel = "Vozes p/ capítulo";
    }
    const fmtLabel = state.formatoSaida === "capitulos" ? ".zip (capítulos)" : ".mp3 único";
    const langLabel = state.idioma === "en" ? "EN" : "PT-BR";
    const motorLabel = isEdge ? "Edge TTS" : "XTTSv2";

    if (el.estConfigSummary) {
      el.estConfigSummary.textContent = `${motorLabel} · ${langLabel} · ${modoLabel} · ${state.velocidade.toFixed(2)}x · ${fmtLabel}`;
      el.estConfigSummary.className = isEdge
        ? "font-mono text-right text-cyan-300"
        : "font-mono text-right text-amber-300";
    }

    if (el.estDeliveryClock) {
      el.estDeliveryClock.textContent = temDoc
        ? `${state.previsaoEntregaRotulo} (~${formatarDuracaoHorasMinutos(minTotais)})`
        : "Aguardando documento...";
    }
    if (el.estDeliveryBox && el.estDeliveryLabel) {
      el.estDeliveryBox.className = isEdge
        ? "mt-5 rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-4 text-center"
        : "mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center";
      el.estDeliveryLabel.className = isEdge
        ? "text-[11px] font-semibold uppercase tracking-wider text-cyan-300"
        : "text-[11px] font-semibold uppercase tracking-wider text-amber-300";
      el.estDeliveryLabel.textContent = isEdge
        ? "⚡ Síntese rápida Edge TTS — entregue até"
        : "🚀 Seu áudio será entregue até";
    }
  }

  // ==========================================================================
  // 9. INTEGRAÇÃO CLICK-TO-CHAT WHATSAPP (JANELA DE 24H META CLOUD API)
  // ==========================================================================
  function atualizarLinkWhatsappClickToChat() {
    const numPublico = CONFIG_COMERCIAL.COM_WHATSAPP_NUMERO_PUBLICO.replace(/\D/g, "");
    const nome = (el.clientName?.value || "").trim();
    const saudacao = nome
      ? `Oi! Aqui é ${nome}. Quero receber meu audiobook do TocaTexto pelo WhatsApp.`
      : `Oi! Quero receber meu audiobook do TocaTexto pelo WhatsApp.`;
    const waUrl = new URL(`https://wa.me/${numPublico}`);
    waUrl.searchParams.set("text", saudacao);
    if (el.waClickToChatBtn) el.waClickToChatBtn.href = waUrl.toString();
    if (el.modalWaClickToChatBtn) el.modalWaClickToChatBtn.href = waUrl.toString();
  }

  // ==========================================================================
  // 10. CONSTRUÇÃO DO CONTRATO `pedido.json` E CHECKOUT PIX / GRATUITO (<dialog>)
  // ==========================================================================
  function construirContratoPedidoJson() {
    const agora = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(
      agora.getHours()
    )}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`;
    const idPedido = `PED-${ts}`;
    const isEdge = ehEdgeTts();

    const arquivosMeta = state.arquivos.map((a) => ({
      arquivo: a.nome,
      tamanho_bytes: a.tamanhoBytes,
      total_caracteres: a.caracteres,
      paginas_estimadas: a.paginas,
      capitulos_estimados: a.capitulos ? a.capitulos.length : 1,
      idioma: a.idioma || state.idioma,
      idioma_detectado: a.idiomaDetectado,
    }));

    const idiomasEscolhidos = Array.from(
      new Set(state.arquivos.map((a) => a.idioma).filter((id) => id === "pt" || id === "en"))
    );
    const idiomaPedido = idiomasEscolhidos.length === 1 ? idiomasEscolhidos[0] : state.idioma;

    let modoVozContrato = state.modoVoz;
    let vozIdContrato = state.vozId;
    let vozesCapitulosContrato = {};
    const vozAleatoria = state.subModoVoz === "aleatoria";

    if (state.modoVoz === "unica" && vozAleatoria) {
      const sorteada = sortearVozDoIdiomaAtual();
      vozIdContrato = sorteada ? sorteada.sigla : state.vozId;
      modoVozContrato = "unica";
    } else if (state.modoVoz === "por_capitulo" && vozAleatoria) {
      modoVozContrato = "aleatoria";
    } else if (state.modoVoz === "por_capitulo") {
      modoVozContrato = "por_capitulo";
      vozesCapitulosContrato = state.vozesCapitulos;
    }

    const listaVozesAtual = obterListaVozesIdiomaAtual();
    const vozObjContrato = listaVozesAtual.find((v) => v.sigla === vozIdContrato) || listaVozesAtual[0];

    const configuracoes = {
      motor_tts: state.motorServico,
      motor_tts_rotulo: isEdge ? "Edge TTS (Paralelo · Gratuito)" : "XTTSv2 (Qualidade Estúdio)",
      idioma: idiomaPedido,
      modo_voz: modoVozContrato,
      voz_aleatoria: vozAleatoria,
      voz_id: vozIdContrato,
      vozes_capitulos: vozesCapitulosContrato,
      velocidade: state.velocidade,
      formato_saida: state.formatoSaida,
      nivel_titulo: 1,
    };

    if (isEdge) {
      configuracoes.voz_edge_id = vozObjContrato?.edgeVoiceId || "pt-BR-ThalitaMultilingualNeural";
      configuracoes.velocidade_edge = velocidadeParaRateEdge(state.velocidade);
      configuracoes.paralelismo_edge = CONFIG_COMERCIAL.EDGE_PARALELAS;
      configuracoes.alvo_bloco_edge = CONFIG_COMERCIAL.EDGE_ALVO_BLOCO;
    }

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
      cota: {
        cota_ativa: CONFIG_COMERCIAL.COM_COTA_GRATIS_ATIVA,
        cota_total_chars: state.cotaTotalChars,
        cota_restante_antes: state.cotaRestanteChars,
        chars_cobertos_cota: state.charsCobertosCota,
        chars_cobraveis: state.charsCobraveis,
        pedido_gratuito: Boolean(state.pedidoGratuito),
        motivo_gratuidade: isEdge
          ? "edge_tts_gratuito"
          : state.pedidoGratuito
          ? "cota_inicial_xttsv2"
          : null,
      },
      configuracoes,
      prazos: {
        prazo_estimado_minutos: state.prazoEstimadoMinutos,
        horario_estimado_entrega: state.horarioEntregaFormatado,
        previsao_entrega_rotulo: state.previsaoEntregaRotuloModal,
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

  let pixPollingTimerId = null;
  let pixPollingAbortController = null;

  function criarSignalComDeadline(userSignal, timeoutMs) {
    if (
      typeof AbortSignal !== "undefined" &&
      typeof AbortSignal.timeout === "function" &&
      typeof AbortSignal.any === "function"
    ) {
      const timeoutSig = AbortSignal.timeout(timeoutMs);
      return {
        signal: userSignal ? AbortSignal.any([userSignal, timeoutSig]) : timeoutSig,
        cleanup: () => {},
      };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const onUserAbort = () => ctrl.abort();
    if (userSignal) {
      if (userSignal.aborted) ctrl.abort();
      else userSignal.addEventListener("abort", onUserAbort, { once: true });
    }
    return {
      signal: ctrl.signal,
      cleanup: () => {
        clearTimeout(timer);
        if (userSignal) userSignal.removeEventListener("abort", onUserAbort);
      },
    };
  }

  function pararPollingPix() {
    if (pixPollingTimerId !== null) {
      clearTimeout(pixPollingTimerId);
      pixPollingTimerId = null;
    }
    if (pixPollingAbortController) {
      pixPollingAbortController.abort();
      pixPollingAbortController = null;
    }
  }

  async function enviarPedidoParaApi(pedidoRascunho) {
    const endpoint = new URL("/api/pedidos", CONFIG_COMERCIAL.API_BASE_URL);
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(pedidoRascunho));
    for (const item of state.arquivos) {
      if (item?.file) {
        formData.append("files", item.file, item.nome);
      }
    }

    const { signal, cleanup } = criarSignalComDeadline(null, 45000);
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
        signal,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const detalhe = data?.detail || `Erro HTTP ${resp.status} ao enviar o pedido.`;
        throw new Error(detalhe);
      }
      return data;
    } catch (err) {
      if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error("Tempo limite excedido ao enviar os arquivos para o servidor. Tente novamente.", { cause: err });
      }
      throw new Error(err?.message || "Falha de comunicação com a API do TocaTexto.", { cause: err });
    } finally {
      cleanup();
    }
  }

  function iniciarPollingPix(idPedido) {
    pararPollingPix();
    if (!CONFIG_COMERCIAL.API_BASE_URL || !idPedido) return;

    pixPollingAbortController = new AbortController();
    const userSignal = pixPollingAbortController.signal;
    const statusEl = document.getElementById("pixPollingStatus");

    const checar = async () => {
      if (userSignal.aborted) return;
      const { signal, cleanup } = criarSignalComDeadline(userSignal, 5000);
      try {
        const endpoint = new URL(`/api/pedidos/${encodeURIComponent(idPedido)}`, CONFIG_COMERCIAL.API_BASE_URL);
        const resp = await fetch(endpoint, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.status === "na_fila" || data?.status === "em_processamento" || data?.status === "concluido") {
            pararPollingPix();
            if (statusEl) statusEl.textContent = "Pagamento confirmado!";
            confirmarPixNoModal(false);
            atualizarSaldoCotaPorEmail(true);
            return;
          }
        }
      } catch (err) {
        if (userSignal.aborted) return;
        if (err?.name !== "TimeoutError" && err?.name !== "AbortError") {
          // Mantém tentativa silenciosa no próximo ciclo
        }
      } finally {
        cleanup();
      }
      if (!userSignal.aborted) {
        pixPollingTimerId = setTimeout(checar, 4000);
      }
    };

    pixPollingTimerId = setTimeout(checar, 3500);
  }

  async function confirmarPixSimuladoNaApi(idPedido) {
    if (!CONFIG_COMERCIAL.API_BASE_URL || !idPedido) {
      confirmarPixNoModal(false);
      return;
    }
    const { signal, cleanup } = criarSignalComDeadline(null, 15000);
    try {
      const endpoint = new URL(
        `/api/pedidos/${encodeURIComponent(idPedido)}/confirmar-simulado`,
        CONFIG_COMERCIAL.API_BASE_URL
      );
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.detail || `Erro HTTP ${resp.status}`);
      }
      pararPollingPix();
      confirmarPixNoModal(false);
      atualizarSaldoCotaPorEmail(true);
    } catch (err) {
      const statusEl = document.getElementById("pixPollingStatus");
      if (statusEl) statusEl.textContent = err?.message || "Erro ao confirmar PIX simulado.";
    } finally {
      cleanup();
    }
  }

  function abrirModalPix(pedido, respostaApi = null) {
    pararPollingPix();
    const pedidoFinal = respostaApi?.pedido || pedido;
    state.ultimoPedidoCriado = pedidoFinal;
    state.ultimoPixInfo = respostaApi?.pix || null;

    if (typeof respostaApi?.cota?.cota_restante_apos === "number") {
      state.cotaRestanteChars = Math.max(0, respostaApi.cota.cota_restante_apos);
      state.cotaConsumidaChars = Math.max(0, state.cotaTotalChars - state.cotaRestanteChars);
      atualizarResumoPedido();
    }

    const ehGratuito =
      respostaApi?.status === "na_fila" ||
      respostaApi?.pedido_gratuito === true ||
      Number(pedidoFinal.documento.valor_pago || 0) <= 0;
    const ehEdge = pedidoFinal.configuracoes?.motor_tts === "edge";

    if (el.pixModalOrderId) el.pixModalOrderId.textContent = pedidoFinal.id_pedido;

    if (ehGratuito) {
      if (el.pixModalTitle) {
        el.pixModalTitle.textContent = "Pedido confirmado!";
      }
      confirmarPixNoModal(true);
    } else {
      if (el.pixModalTitle) el.pixModalTitle.textContent = "Pagamento Instantâneo via PIX";
      const pixApi = respostaApi?.pix || null;
      const codigoPix = pixApi?.qr_code || gerarPayloadPixSimulado(pedidoFinal);
      const valorFinal =
        typeof respostaApi?.valor_pago === "number" ? respostaApi.valor_pago : pedidoFinal.documento.valor_pago;
      if (el.pixModalAmount) el.pixModalAmount.textContent = formatarBRL(valorFinal);
      if (el.pixCopyPasteInput) el.pixCopyPasteInput.value = codigoPix;

      if (el.pixQrImage) {
        if (pixApi?.qr_code_base64) {
          el.pixQrImage.src = `data:image/png;base64,${pixApi.qr_code_base64}`;
        } else {
          const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
          qrUrl.searchParams.set("size", "220x220");
          qrUrl.searchParams.set("data", codigoPix);
          el.pixQrImage.src = qrUrl.toString();
        }
      }

      const modoProducaoPix = Boolean(CONFIG_COMERCIAL.API_BASE_URL && pixApi && pixApi.modo_simulado === false);
      if (el.localSimulationActions) {
        el.localSimulationActions.classList.toggle("hidden", modoProducaoPix);
      }
      if (el.simulatePixApprovedBtn) {
        el.simulatePixApprovedBtn.classList.toggle("hidden", modoProducaoPix);
      }

      const statusEl = document.getElementById("pixPollingStatus");
      if (statusEl) {
        statusEl.textContent = CONFIG_COMERCIAL.API_BASE_URL
          ? "Aguardando confirmação automática..."
          : "Aguardando confirmação...";
      }

      if (el.pixPendingStage) el.pixPendingStage.classList.remove("hidden");
      if (el.pixApprovedStage) el.pixApprovedStage.classList.add("hidden");

      if (CONFIG_COMERCIAL.API_BASE_URL && respostaApi?.status === "aguardando_pix") {
        iniciarPollingPix(pedidoFinal.id_pedido);
      }
    }

    if (el.pixModal && !el.pixModal.open) {
      el.pixModal.removeAttribute("data-closing");
      el.pixModal.showModal();
    }
    if (ehGratuito && el.approvedCloseBtn) {
      requestAnimationFrame(() => {
        if (el.pixModal?.open) el.approvedCloseBtn.focus();
      });
    }
  }

  function fecharModalPix() {
    pararPollingPix();
    if (!el.pixModal || !el.pixModal.open) return;
    closeTopLayerDialog(el.pixModal);
  }

  function confirmarPixNoModal(ehGratuitoDireto = false) {
    const ped = state.ultimoPedidoCriado;
    if (!ped) return;
    const gratuito = ehGratuitoDireto === true || Number(ped.documento?.valor_pago || 0) <= 0;
    const ehEdge = ped.configuracoes?.motor_tts === "edge";
    const charsCobertos = Number(ped.cota?.chars_cobertos_cota || 0);

    if (!ped._cotaDebitadaLocal && charsCobertos > 0 && !ehEdge) {
      ped._cotaDebitadaLocal = true;
      debitarCotaLocal(ped.cliente?.email || "", charsCobertos);
      atualizarResumoPedido();
    }

    if (el.pixPendingStage) el.pixPendingStage.classList.add("hidden");
    if (el.pixApprovedStage) el.pixApprovedStage.classList.remove("hidden");
    if (el.pixModalTitle) {
      el.pixModalTitle.textContent = gratuito ? "Pedido confirmado!" : "Pagamento confirmado!";
    }
    if (el.approvedEngineLabel) {
      el.approvedEngineLabel.textContent = ehEdge
        ? "⚡ Edge TTS · Rápido e Gratuito"
        : "🎙️ XTTSv2 · Qualidade Estúdio";
    }

    const prazoMin = Number(ped.prazos?.prazo_estimado_minutos || state.prazoEstimadoMinutos || (ehEdge ? 2 : 15));
    if (el.approvedWaitDuration) {
      el.approvedWaitDuration.textContent = formatarPrazoExtenso(prazoMin);
    }
    if (el.approvedEtaText) {
      const rotulo =
        ped.prazos?.previsao_entrega_rotulo ||
        (ped.prazos?.horario_estimado_entrega ? `hoje às ${ped.prazos.horario_estimado_entrega}` : "--");
      el.approvedEtaText.textContent = rotulo;
    }
    if (el.approvedEmailDisplay) {
      el.approvedEmailDisplay.textContent = ped.cliente?.email || (el.clientEmail?.value || "").trim() || "--";
    }

    if (el.approvedQuotaSummary) {
      if (ehEdge) {
        el.approvedQuotaSummary.textContent = `Sua cota gratuita XTTSv2 (${formatarInteiro(state.cotaRestanteChars)} chars) permanece intacta.`;
        el.approvedQuotaSummary.classList.remove("hidden");
      } else if (charsCobertos > 0) {
        el.approvedQuotaSummary.textContent = `Cota gratuita XTTSv2: ${formatarInteiro(
          charsCobertos
        )} chars usados · restam ${formatarInteiro(state.cotaRestanteChars)} chars.`;
        el.approvedQuotaSummary.classList.remove("hidden");
      } else {
        el.approvedQuotaSummary.classList.add("hidden");
      }
    }

    const temWhatsapp = Boolean((ped.cliente?.whatsapp || "").trim());
    const waAtivado = Boolean(ped.cliente?.janela_whatsapp_ativa || state.janelaWhatsappAtiva);
    if (el.approvedWhatsappNotice) {
      el.approvedWhatsappNotice.classList.toggle("hidden", !temWhatsapp);
    }
    if (el.approvedWhatsappPending) {
      el.approvedWhatsappPending.classList.toggle("hidden", !temWhatsapp || waAtivado);
    }
    if (el.approvedWhatsappDone) {
      el.approvedWhatsappDone.classList.toggle("hidden", !temWhatsapp || !waAtivado);
    }

    if (el.localApprovedActions) {
      el.localApprovedActions.classList.toggle("hidden", Boolean(CONFIG_COMERCIAL.API_BASE_URL) || !gratuito);
    }

    if (el.pixModal?.open && el.approvedCloseBtn) {
      requestAnimationFrame(() => {
        if (el.pixModal?.open) el.approvedCloseBtn.focus();
      });
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
  // 11. EVENT LISTENERS E INICIALIZAÇÃO
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

    if (el.addMoreFilesBtn) {
      el.addMoreFilesBtn.addEventListener("click", abrirSeletorArquivos);
    }

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
      el.dropzone.addEventListener("click", (e) => {
        if (e.target === el.fileInput) return;
        abrirSeletorArquivos(e);
      });

      el.dropzone.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          abrirSeletorArquivos(e);
        } else if (e.key === " ") {
          e.preventDefault();
        }
      });

      el.dropzone.addEventListener("keyup", (e) => {
        if (e.key === " ") {
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

    // Seletor nativo de serviço de áudio (XTTSv2 vs Edge TTS)
    [el.engineRadioXtts, el.engineRadioEdge].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          selecionarMotorServico(radio.value, true);
        }
      });
    });

    if (el.quickSwitchEngineBtn) {
      el.quickSwitchEngineBtn.addEventListener("click", () => {
        selecionarMotorServico(ehEdgeTts() ? "xttsv2" : "edge", true);
      });
    }

    // Filtros do catálogo de vozes
    el.voiceFilterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.filtroVoz = btn.getAttribute("data-voice-filter") || "todas";
        atualizarUiFiltrosVoz();
        renderizarCatalogoVozes({ preservarScroll: false, animarEntrada: true });
      });
    });

    // Controles de navegação horizontal do carrossel de vozes
    if (el.voicesCarouselNavBtns) {
      el.voicesCarouselNavBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const dir = Number(btn.getAttribute("data-carousel-dir") || 1);
          rolarCarrosselVozes(dir);
        });
      });
    }

    if (el.voicesGrid) {
      el.voicesGrid.addEventListener("scroll", atualizarBotoesCarrosselVozes, { passive: true });
      el.voicesGrid.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          rolarCarrosselVozes(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          rolarCarrosselVozes(-1);
        }
      });
    }

    window.addEventListener("resize", atualizarBotoesCarrosselVozes, { passive: true });

    // Slider granular de velocidade em tempo real
    if (el.speedSlider) {
      el.speedSlider.addEventListener("input", (e) => {
        atualizarVelocidade(e.target.value, true, true);
      });
    }

    if (el.speedMinusBtn) {
      el.speedMinusBtn.addEventListener("click", () => {
        atualizarVelocidade(state.velocidade - 0.05, false, true);
      });
    }

    if (el.speedPlusBtn) {
      el.speedPlusBtn.addEventListener("click", () => {
        atualizarVelocidade(state.velocidade + 0.05, false, true);
      });
    }

    el.speedPresetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = parseFloat(btn.getAttribute("data-speed-preset"));
        atualizarVelocidade(preset, false, true);
      });
    });

    // Modos de voz (unica / por_capitulo) e submodos (escolher / aleatoria)
    el.voiceModeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const modo = btn.getAttribute("data-voice-mode") || "unica";
        state.modoVoz = modo;
        atualizarUiModoVoz();
        renderizarCatalogoVozes();
        renderizarMapeadorCapitulos();
        atualizarResumoPedido();
      });
    });

    el.voiceSubmodeBtns.forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const parent = btn.getAttribute("data-voice-parent");
        const sub = btn.getAttribute("data-voice-submode") || "escolher";
        if (parent) state.modoVoz = parent;
        state.subModoVoz = sub;
        atualizarUiModoVoz();
        renderizarCatalogoVozes();
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
          b.setAttribute("aria-pressed", ativo ? "true" : "false");
          b.classList.toggle("active-format", ativo);
          b.classList.toggle("border-amber-400", ativo);
          b.classList.toggle("bg-amber-500/10", ativo);
          b.classList.toggle("border-slate-800", !ativo);
          b.classList.toggle("bg-slate-900/70", !ativo);
        });

        atualizarResumoPedido();
      });
    });

    if (el.clientName) {
      el.clientName.addEventListener("input", () => {
        el.clientName.classList.remove("field-validation-error");
        atualizarLinkWhatsappClickToChat();
      });
    }

    if (el.clientEmail) {
      el.clientEmail.addEventListener("input", () => {
        el.clientEmail.classList.remove("field-validation-error");
        atualizarSaldoCotaPorEmail(false);
        validarConfirmacaoEmail();
        if (el.clientEmailConfirm && el.clientEmailConfirm.value.trim()) {
          syncFieldAria(el.clientEmailConfirm, false);
        }
      });
      el.clientEmail.addEventListener("blur", () => {
        atualizarSaldoCotaPorEmail(true);
        validarConfirmacaoEmail();
        if (el.clientEmailConfirm && el.clientEmailConfirm.value.trim()) {
          syncFieldAria(el.clientEmailConfirm, true);
        }
      });
    }

    if (el.clientEmailConfirm) {
      el.clientEmailConfirm.addEventListener("input", () => {
        el.clientEmailConfirm.classList.remove("field-validation-error");
        validarConfirmacaoEmail();
        syncFieldAria(el.clientEmailConfirm, false);
      });
      el.clientEmailConfirm.addEventListener("blur", () => {
        validarConfirmacaoEmail();
        syncFieldAria(el.clientEmailConfirm, true);
      });
    }

    if (el.termsCheckbox) {
      el.termsCheckbox.addEventListener("change", () => {
        if (el.termsCheckbox.checked && el.termsBox) {
          el.termsBox.classList.remove("field-validation-error");
        }
      });
    }

    if (el.waClickToChatBtn) {
      el.waClickToChatBtn.addEventListener("click", () => {
        state.janelaWhatsappAtiva = true;
        if (el.waActivatedBadge) el.waActivatedBadge.classList.remove("hidden");
      });
    }

    if (el.modalWaClickToChatBtn) {
      el.modalWaClickToChatBtn.addEventListener("click", () => {
        state.janelaWhatsappAtiva = true;
        if (el.waActivatedBadge) el.waActivatedBadge.classList.remove("hidden");
        if (el.approvedWhatsappPending) el.approvedWhatsappPending.classList.add("hidden");
        if (el.approvedWhatsappDone) el.approvedWhatsappDone.classList.remove("hidden");
      });
    }

    // Submissão do formulário e abertura do <dialog> nativo
    if (el.orderForm) {
      inicializarValidacaoAcessivelFormulario(el.orderForm);

      el.orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (el.formValidationError) {
          el.formValidationError.classList.add("hidden");
          delete el.formValidationError.dataset.langOnly;
        }
        el.clientName?.classList.remove("field-validation-error");
        el.clientEmail?.classList.remove("field-validation-error");
        el.clientEmailConfirm?.classList.remove("field-validation-error");
        el.termsBox?.classList.remove("field-validation-error");

        validarConfirmacaoEmail();

        const semArquivo = !state.arquivos.length || state.totalCaracteres <= 0;
        const arquivosSemIdioma = semArquivo
          ? []
          : state.arquivos.filter((a) => a.idioma !== "pt" && a.idioma !== "en");
        const nome = (el.clientName?.value || "").trim();
        const email = (el.clientEmail?.value || "").trim();
        const emailConfirm = (el.clientEmailConfirm?.value || "").trim();
        const nomeInvalido = !nome;
        const emailInvalido = !email || !email.includes("@") || (el.clientEmail && !el.clientEmail.validity.valid);
        const emailConfirmVazio = !emailConfirm;
        const emailConfirmDivergente = Boolean(
          email && emailConfirm && normalizarEmailCota(email) !== normalizarEmailCota(emailConfirm)
        );
        const emailConfirmInvalido =
          emailConfirmVazio ||
          emailConfirmDivergente ||
          (el.clientEmailConfirm && !el.clientEmailConfirm.validity.valid);
        const termosNaoAceitos = !el.termsCheckbox?.checked;

        const pendencias = [];
        if (semArquivo) {
          pendencias.push("enviar ao menos um documento válido (.PDF, .DOCX, .TXT ou .MD) no Passo 01");
        }
        if (arquivosSemIdioma.length > 0) {
          state.validacaoIdiomaTentada = true;
          atualizarStatusIdiomaDocumentos();
          renderizarListaArquivosAnexados();
          pendencias.push(
            `escolher o idioma obrigatório de cada documento no Passo 01 (${arquivosSemIdioma
              .map((a) => `"${a.nome}"`)
              .join(", ")})`
          );
        }
        if (nomeInvalido) {
          el.clientName?.classList.add("field-validation-error");
          if (el.clientName) syncFieldAria(el.clientName, false, true);
          pendencias.push("informar seu nome");
        }
        if (emailInvalido) {
          el.clientEmail?.classList.add("field-validation-error");
          if (el.clientEmail) syncFieldAria(el.clientEmail, false, true);
          pendencias.push("informar um e-mail válido");
        }
        if (emailConfirmInvalido) {
          el.clientEmailConfirm?.classList.add("field-validation-error");
          if (el.clientEmailConfirm) syncFieldAria(el.clientEmailConfirm, false, true);
          pendencias.push(
            emailConfirmDivergente
              ? "corrigir a confirmação de e-mail (os dois campos precisam ser idênticos)"
              : "confirmar seu e-mail"
          );
        }
        if (termosNaoAceitos) {
          el.termsBox?.classList.add("field-validation-error");
          if (el.termsCheckbox) syncFieldAria(el.termsCheckbox, false, true);
          pendencias.push("aceitar os Termos e Condições de Uso");
        }

        if (pendencias.length > 0) {
          if (el.formValidationError) {
            el.formValidationError.textContent = `Preencha os campos obrigatórios antes de continuar: ${pendencias.join("; ")}.`;
            el.formValidationError.classList.remove("hidden");
            if (
              !semArquivo &&
              arquivosSemIdioma.length > 0 &&
              !nomeInvalido &&
              !emailInvalido &&
              !emailConfirmInvalido &&
              !termosNaoAceitos
            ) {
              el.formValidationError.dataset.langOnly = "true";
            }
          }
          const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          if (semArquivo || arquivosSemIdioma.length > 0) {
            atualizarFluxoEtapas(1);
            (el.docSummaryCard && !el.docSummaryCard.classList.contains("hidden")
              ? el.docSummaryCard
              : el.stepCard01
            )?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "center" });
          } else if (nomeInvalido) {
            el.clientName?.focus();
          } else if (emailInvalido) {
            el.clientEmail?.focus();
          } else if (emailConfirmInvalido) {
            el.clientEmailConfirm?.focus();
          } else if (termosNaoAceitos) {
            el.termsCheckbox?.focus();
          }
          return;
        }

        pararPreviewVoz();
        const pedido = construirContratoPedidoJson();

        if (!CONFIG_COMERCIAL.API_BASE_URL) {
          abrirModalPix(pedido, null);
          return;
        }

        const textoOriginalBtn = el.generatePixBtn?.textContent || "";
        if (el.generatePixBtn) {
          el.generatePixBtn.disabled = true;
          el.generatePixBtn.textContent = "Enviando e validando documentos...";
        }
        try {
          const respostaApi = await enviarPedidoParaApi(pedido);
          abrirModalPix(pedido, respostaApi);
        } catch (err) {
          if (el.formValidationError) {
            el.formValidationError.textContent = err?.message || "Não foi possível enviar o pedido. Tente novamente.";
            el.formValidationError.classList.remove("hidden");
          }
        } finally {
          if (el.generatePixBtn) {
            el.generatePixBtn.disabled = false;
            el.generatePixBtn.textContent = textoOriginalBtn;
          }
        }
      });
    }

    // Eventos nativos do <dialog> (<dialog closedby="any"> + fallback Safari + exit animation)
    if (el.pixModal) {
      configurarFallbackLightDismissDialog(el.pixModal);

      el.pixModal.addEventListener("cancel", (event) => {
        if (!supportsTopLayerExit()) {
          event.preventDefault();
          closeTopLayerDialog(el.pixModal);
        }
      });

      el.pixModal.addEventListener("close", () => {
        pararPollingPix();
        el.pixModal.removeAttribute("data-closing");
        el.pixModal.returnValue = "";
      });
    }

    if (el.closePixModalBtn) {
      el.closePixModalBtn.addEventListener("click", fecharModalPix);
    }

    if (el.approvedCloseBtn) {
      el.approvedCloseBtn.addEventListener("click", fecharModalPix);
    }

    if (el.copyPixCodeBtn) {
      el.copyPixCodeBtn.addEventListener("click", () => {
        if (!el.pixCopyPasteInput) return;
        navigator.clipboard?.writeText(el.pixCopyPasteInput.value).then(() => {
          el.copyPixCodeBtn.textContent = "Copiado!";
          setTimeout(() => {
            el.copyPixCodeBtn.textContent = "Copiar";
          }, 1800);
        });
      });
    }

    if (el.simulatePixApprovedBtn) {
      el.simulatePixApprovedBtn.addEventListener("click", () => {
        if (CONFIG_COMERCIAL.API_BASE_URL && state.ultimoPedidoCriado?.id_pedido) {
          confirmarPixSimuladoNaApi(state.ultimoPedidoCriado.id_pedido);
        } else {
          confirmarPixNoModal(false);
        }
      });
    }

    if (el.downloadOrderJsonBtn) {
      el.downloadOrderJsonBtn.addEventListener("click", baixarPedidoJsonLocal);
    }

    if (el.approvedDownloadOrderJsonBtn) {
      el.approvedDownloadOrderJsonBtn.addEventListener("click", baixarPedidoJsonLocal);
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
    el.docLangValidationError = document.getElementById("docLangValidationError");
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
    el.docPriceLabel = document.getElementById("docPriceLabel");
    el.docPriceCount = document.getElementById("docPriceCount");
    el.docPriceFormulaNote = document.getElementById("docPriceFormulaNote");
    el.clearFileBtn = document.getElementById("clearFileBtn");
    el.engineRadioXtts = document.getElementById("engineRadioXtts");
    el.engineRadioEdge = document.getElementById("engineRadioEdge");
    el.engineCardXtts = document.getElementById("engineCardXtts");
    el.engineCardEdge = document.getElementById("engineCardEdge");
    el.engineXttsEtaBadge = document.getElementById("engineXttsEtaBadge");
    el.engineXttsPriceBadge = document.getElementById("engineXttsPriceBadge");
    el.engineEdgeEtaBadge = document.getElementById("engineEdgeEtaBadge");
    el.engineEdgePriceBadge = document.getElementById("engineEdgePriceBadge");
    el.catalogEnginePill = document.getElementById("catalogEnginePill");
    el.speedSlider = document.getElementById("speedSlider");
    el.speedDisplayBadge = document.getElementById("speedDisplayBadge");
    el.speedMinusBtn = document.getElementById("speedMinusBtn");
    el.speedPlusBtn = document.getElementById("speedPlusBtn");
    el.speedHintText = document.getElementById("speedHintText");
    el.speedPresetBtns = document.querySelectorAll(".speed-preset-btn");
    el.voiceModeGroupUnica = document.getElementById("voiceModeGroupUnica");
    el.voiceModeGroupCapitulo = document.getElementById("voiceModeGroupCapitulo");
    el.subModeUnicaPanel = document.getElementById("subModeUnicaPanel");
    el.subModeCapituloPanel = document.getElementById("subModeCapituloPanel");
    el.voiceModeBtns = document.querySelectorAll(".voice-mode-btn");
    el.voiceSubmodeBtns = document.querySelectorAll(".voice-submode-btn");
    el.outputFormatBtns = document.querySelectorAll(".output-format-btn");
    el.voiceFilterBtns = document.querySelectorAll(".voice-filter-btn");
    el.chapterVoiceMapper = document.getElementById("chapterVoiceMapper");
    el.chapterVoiceList = document.getElementById("chapterVoiceList");
    el.catalogLangCounter = document.getElementById("catalogLangCounter");
    el.selectedVoiceBadge = document.getElementById("selectedVoiceBadge");
    el.voicesGrid = document.getElementById("voicesGrid");
    el.voicesCarouselNavBtns = document.querySelectorAll(".voices-carousel-nav");
    el.audioSourceStatusText = document.getElementById("audioSourceStatusText");
    el.orderForm = document.getElementById("orderForm");
    el.clientName = document.getElementById("clientName");
    el.clientEmail = document.getElementById("clientEmail");
    el.clientEmailConfirm = document.getElementById("clientEmailConfirm");
    el.clientEmailConfirmErrorText = document.getElementById("clientEmailConfirmErrorText");
    el.clientEmailConfirmMatch = document.getElementById("clientEmailConfirmMatch");
    el.quotaStatusBox = document.getElementById("quotaStatusBox");
    el.quotaStatusTitle = document.getElementById("quotaStatusTitle");
    el.quotaBalanceBadge = document.getElementById("quotaBalanceBadge");
    el.quotaBalanceBar = document.getElementById("quotaBalanceBar");
    el.quotaStatusHint = document.getElementById("quotaStatusHint");
    el.clientWhatsapp = document.getElementById("clientWhatsapp");
    el.waClickToChatBtn = document.getElementById("waClickToChatBtn");
    el.waActivatedBadge = document.getElementById("waActivatedBadge");
    el.termsBox = document.getElementById("termsBox");
    el.termsCheckbox = document.getElementById("termsCheckbox");
    el.formValidationError = document.getElementById("formValidationError");
    el.generatePixBtn = document.getElementById("generatePixBtn");
    el.summaryPriceLabel = document.getElementById("summaryPriceLabel");
    el.priceDisplay = document.getElementById("priceDisplay");
    el.estEngineSummary = document.getElementById("estEngineSummary");
    el.summaryDocStatus = document.getElementById("summaryDocStatus");
    el.summaryQuotaLabel = document.getElementById("summaryQuotaLabel");
    el.summaryQuotaStatus = document.getElementById("summaryQuotaStatus");
    el.priceFormulaHint = document.getElementById("priceFormulaHint");
    el.estConversionTime = document.getElementById("estConversionTime");
    el.estQueueStatus = document.getElementById("estQueueStatus");
    el.estConfigSummary = document.getElementById("estConfigSummary");
    el.estEngineCompareBox = document.getElementById("estEngineCompareBox");
    el.estEngineCompareHint = document.getElementById("estEngineCompareHint");
    el.quickSwitchEngineBtn = document.getElementById("quickSwitchEngineBtn");
    el.estDeliveryBox = document.getElementById("estDeliveryBox");
    el.estDeliveryLabel = document.getElementById("estDeliveryLabel");
    el.estDeliveryClock = document.getElementById("estDeliveryClock");
    el.estDeliverySubtext = document.getElementById("estDeliverySubtext");
    el.heartbeatBadge = document.getElementById("heartbeatBadge");
    el.heartbeatDot = document.getElementById("heartbeatDot");
    el.heartbeatText = document.getElementById("heartbeatText");
    el.pixModal = document.getElementById("pixModal");
    el.closePixModalBtn = document.getElementById("closePixModalBtn");
    el.pixModalOrderId = document.getElementById("pixModalOrderId");
    el.pixModalTitle = document.getElementById("pixModalTitle");
    el.pixPendingStage = document.getElementById("pixPendingStage");
    el.pixApprovedStage = document.getElementById("pixApprovedStage");
    el.pixQrImage = document.getElementById("pixQrImage");
    el.pixCopyPasteInput = document.getElementById("pixCopyPasteInput");
    el.copyPixCodeBtn = document.getElementById("copyPixCodeBtn");
    el.pixModalAmount = document.getElementById("pixModalAmount");
    el.localSimulationActions = document.getElementById("localSimulationActions");
    el.simulatePixApprovedBtn = document.getElementById("simulatePixApprovedBtn");
    el.downloadOrderJsonBtn = document.getElementById("downloadOrderJsonBtn");
    el.approvedEngineLabel = document.getElementById("approvedEngineLabel");
    el.approvedWaitDuration = document.getElementById("approvedWaitDuration");
    el.approvedEtaText = document.getElementById("approvedEtaText");
    el.approvedEmailDisplay = document.getElementById("approvedEmailDisplay");
    el.approvedQuotaSummary = document.getElementById("approvedQuotaSummary");
    el.approvedWhatsappNotice = document.getElementById("approvedWhatsappNotice");
    el.approvedWhatsappPending = document.getElementById("approvedWhatsappPending");
    el.approvedWhatsappDone = document.getElementById("approvedWhatsappDone");
    el.localApprovedActions = document.getElementById("localApprovedActions");
    el.approvedDownloadOrderJsonBtn = document.getElementById("approvedDownloadOrderJsonBtn");
    el.approvedCloseBtn = document.getElementById("approvedCloseBtn");
    el.modalWaClickToChatBtn = document.getElementById("modalWaClickToChatBtn");
    el.voicePreviewAudio = document.getElementById("voicePreviewAudio");
  }

  let _initialized = false;
  function init() {
    if (_initialized) return;
    revalidarReferenciasDom();
    if (!el.dropzone || !el.fileInput) return;
    _initialized = true;
    atualizarUiSeletorMotor();
    renderizarCatalogoVozes({ preservarScroll: false, animarEntrada: true });
    atualizarUiModoVoz();
    atualizarVelocidade(1.0, false, false);
    atualizarLinkWhatsappClickToChat();
    atualizarFluxoEtapas(1);
    atualizarTextosComerciaisNaUI();
    atualizarSaldoCotaPorEmail(false);
    sincronizarStatusMotor();
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
