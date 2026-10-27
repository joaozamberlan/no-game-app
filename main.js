import { MuscleMap } from 'js-rich-body-highlighter';

// Volume semanal: a mesma peça da tela de fichas do app (VolumeSemanal +
// MapaCorpo), com dados fictícios. O placar da semana já vem pronto no HTML;
// aqui entram o corpo, as alternâncias e o destaque ligado entre linha e músculo.

const COR = '#BA281A'; // --brand, o vermelho do tema claro do app
// 4 tons: a intensidade é a opacidade da camada vermelha sobre a ilustração
const TONS = [28, 46, 66, 88];

const DADOS = {
  ficha: {
    contexto: (n) => `em ${n} grupos musculares · Treino A`,
    linhas: [['Peito', 4], ['Ombros', 3], ['Costas', 2], ['Tríceps', 2]],
  },
  semana: {
    contexto: (n) => `em ${n} grupos musculares · as 3 fichas da semana`,
    linhas: [
      ['Costas', 10], ['Quadríceps', 9], ['Peito', 8], ['Isquiotibiais', 6], ['Ombros', 6],
      ['Glúteos', 5], ['Bíceps', 4], ['Panturrilha', 4], ['Tríceps', 4], ['Abdômen', 3],
    ],
  },
};

// Grupo muscular → regiões da ilustração (o mesmo mapa de utils/musculos.ts)
const REGIOES = {
  peito: ['chest'],
  costas: ['lats', 'upper_back', 'lower_back'],
  ombros: ['shoulders'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  antebraco: ['forearms'],
  abdomen: ['abs', 'obliques'],
  gluteos: ['glutes'],
  quadriceps: ['quads'],
  isquiotibiais: ['hamstrings'],
  panturrilha: ['calves'],
};
const normalizar = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const regioesDoGrupo = (grupo) => REGIOES[normalizar(grupo)] ?? [];

const raiz = document.querySelector('[data-vol]');
if (raiz) iniciar(raiz);

function iniciar(raiz) {
  const lista = raiz.querySelector('[data-vol-lista]');
  const total = raiz.querySelector('[data-vol-total]');
  const contexto = raiz.querySelector('[data-vol-contexto]');
  const segmentado = raiz.querySelector('[data-vol-visao]');
  const seletorSexo = raiz.querySelector('[data-vol-sexo]');

  const estado = { visao: 'semana', sexo: 'male', foco: null };

  const regiaoParaGrupo = new Map();
  for (const { linhas } of Object.values(DADOS)) {
    for (const [grupo] of linhas) for (const r of regioesDoGrupo(grupo)) regiaoParaGrupo.set(r, grupo);
  }

  const comum = () => ({
    gender: estado.sexo,
    theme: 'light',
    color: COR,
    width: '100%',
    hoverHighlight: false,
    highlights: destaques(),
    onMuscleEnter: (m) => focar(regiaoParaGrupo.get(m.group) ?? null),
    onMuscleLeave: () => focar(null),
    onMuscleClick: (m) => focar(regiaoParaGrupo.get(m.group) ?? null),
  });

  function destaques() {
    const linhas = DADOS[estado.visao].linhas;
    const maior = Math.max(...linhas.map(([, n]) => n), 1);
    const out = [];
    for (const [grupo, series] of linhas) {
      const tom = TONS[Math.min(TONS.length - 1, Math.ceil((series / maior) * TONS.length) - 1)];
      // Com um grupo em foco, ele vai ao máximo e os outros recuam
      const intensidade = estado.foco ? (estado.foco === grupo ? 100 : Math.round(tom * 0.35)) : tom;
      for (const regiao of regioesDoGrupo(grupo)) out.push({ group: regiao, intensity: intensidade, color: COR });
    }
    return out;
  }

  const mapas = ['front', 'back'].map(
    (view) => new MuscleMap(raiz.querySelector(`[data-vista="${view}"]`), { ...comum(), view }),
  );
  const atualizarCorpo = () => mapas.forEach((m) => m.update(comum()));

  function focar(grupo) {
    if (estado.foco === grupo) return;
    estado.foco = grupo;
    lista.querySelectorAll('.vol-linha').forEach((li) => li.classList.toggle('em-foco', li.dataset.grupo === grupo));
    atualizarCorpo();
  }

  function ligarLinhas() {
    lista.querySelectorAll('.vol-linha').forEach((li) => {
      li.addEventListener('mouseenter', () => focar(li.dataset.grupo));
      li.addEventListener('mouseleave', () => focar(null));
      li.addEventListener('focus', () => focar(li.dataset.grupo));
      li.addEventListener('blur', () => focar(null));
    });
  }

  function desenharPlacar() {
    const { linhas, contexto: textoContexto } = DADOS[estado.visao];
    // Pelo menos 10 casas por linha: com poucas séries a escala ainda fica legível
    const casas = Math.max(linhas[0][1], 10);
    const soma = linhas.reduce((acc, [, n]) => acc + n, 0);
    total.textContent = soma;
    contexto.textContent = `séries ${textoContexto(linhas.length)}`;
    lista.innerHTML = linhas
      .map(([grupo, n]) => {
        const blocos = Array.from({ length: casas }, (_, i) =>
          i < n ? `<span class="vol-bloco cheio" style="animation-delay:${Math.min(i, 12) * 14}ms"></span>` : '<span class="vol-bloco"></span>',
        ).join('');
        return `<li class="vol-linha" data-grupo="${grupo}"><span class="vol-grupo">${grupo}</span><span class="vol-blocos" aria-hidden="true">${blocos}</span><span class="vol-valor">${n}<span class="sr-only"> séries</span></span></li>`;
      })
      .join('');
    lista.classList.add('acende');
    ligarLinhas();
  }

  segmentado.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-visao-btn]');
    if (!botao || botao.dataset.visaoBtn === estado.visao) return;
    estado.visao = botao.dataset.visaoBtn;
    estado.foco = null;
    segmentado.dataset.visao = estado.visao;
    segmentado.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
    desenharPlacar();
    atualizarCorpo();
  });

  seletorSexo.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-sexo]');
    if (!botao || botao.dataset.sexo === estado.sexo) return;
    estado.sexo = botao.dataset.sexo;
    seletorSexo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
    atualizarCorpo();
  });

  // Os controles só aparecem quando há script para fazê-los funcionar
  segmentado.hidden = false;
  seletorSexo.hidden = false;
  ligarLinhas();
}

// Notebook da seção do treinador: as abas acima dele, o menu lateral e a linha
// do João Vitor trocam a tela. O notebook é aria-hidden; quem usa leitor de
// tela recebe a troca pela legenda da figura.
const abasDisp = document.querySelector('[data-disp-abas]');
if (abasDisp) iniciarNotebook(abasDisp);

function iniciarNotebook(abas) {
  const figura = abas.nextElementSibling;
  const paineis = figura.querySelectorAll('[data-painel]');
  const legendas = figura.querySelectorAll('[data-legenda]');
  const trilho = figura.querySelectorAll('.ui-trilho [data-ir]');

  function mostrar(tela) {
    paineis.forEach((p) => { p.hidden = p.dataset.painel !== tela; });
    legendas.forEach((l) => { l.hidden = l.dataset.legenda !== tela; });
    abas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tela === tela)));
    // A ficha do aluno fica dentro de Alunos, como no app
    const itemAtivo = tela === 'biblioteca' ? 'biblioteca' : 'alunos';
    trilho.forEach((i) => i.classList.toggle('ativo', i.dataset.ir === itemAtivo));
  }

  abas.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-tela]');
    if (botao) mostrar(botao.dataset.tela);
  });
  figura.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-ir]');
    if (alvo) mostrar(alvo.dataset.ir);
  });

  iniciarFicha(figura.querySelector('[data-painel="ficha"]'));
  iniciarBiblioteca(figura.querySelector('[data-painel="biblioteca"]'));
  abas.hidden = false;
}

// Montagem da ficha: "+ Exercício" abre a prescrição já preenchida e
// "Adicionar" põe a rosca no fim da lista, uma vez só
function iniciarFicha(painel) {
  const modal = painel.querySelector('[data-modal]');
  const abrir = painel.querySelector('[data-modal-abrir]');
  const pilha = painel.querySelector('[data-pilha]');
  const modelo = painel.querySelector('[data-novo-bloco]');
  let adicionado = false;

  painel.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-abrir]')) {
      abrir.classList.remove('chama');
      modal.hidden = false;
    } else if (e.target.closest('[data-modal-adicionar]')) {
      modal.hidden = true;
      if (adicionado) return;
      adicionado = true;
      const bloco = modelo.content.firstElementChild.cloneNode(true);
      bloco.classList.add('novo');
      pilha.append(bloco);
    } else if (e.target.closest('[data-modal-fechar]') || e.target === modal) {
      modal.hidden = true;
    }
  });
}

const BIBLIOTECA = {
  exercicios: { sobre: 'BIBLIOTECA // 115 EXERCÍCIOS', botao: '+ Novo exercício', busca: 'articulado supino' },
  grupos: { sobre: 'BIBLIOTECA // 12 GRUPOS', botao: '+ Novo grupo', busca: '' },
  tecnicas: { sobre: 'BIBLIOTECA // 8 TÉCNICAS', botao: '+ Nova técnica', busca: '' },
  instrucoes: { sobre: 'BIBLIOTECA // 6 INSTRUÇÕES', botao: '+ Nova instrução', busca: '' },
};
// Vista do corpo em que cada grupo aparece na miniatura
const VISTA_DE_COSTAS = new Set(['costas', 'triceps', 'gluteos', 'isquiotibiais', 'panturrilha']);

function iniciarBiblioteca(painel) {
  const sobre = painel.querySelector('[data-bib-sobre]');
  const botao = painel.querySelector('[data-bib-btn]');
  const busca = painel.querySelector('[data-bib-busca]');
  const filtro = painel.querySelector('[data-bib-filtro]');
  let miniaturas = false;

  painel.addEventListener('click', (e) => {
    const aba = e.target.closest('[data-bib]');
    if (!aba) return;
    const chave = aba.dataset.bib;
    painel.querySelectorAll('[data-bib]').forEach((a) => a.classList.toggle('ativa', a === aba));
    painel.querySelectorAll('[data-bib-painel]').forEach((t) => { t.hidden = t.dataset.bibPainel !== chave; });
    sobre.textContent = BIBLIOTECA[chave].sobre;
    botao.textContent = BIBLIOTECA[chave].botao;
    busca.textContent = BIBLIOTECA[chave].busca;
    // O filtro de grupo só existe na aba Exercícios
    filtro.hidden = chave !== 'exercicios';
    if (chave === 'grupos' && !miniaturas) {
      miniaturas = true;
      desenharMiniaturas(painel);
    }
  });
}

// Só desenha quando a aba Grupos abre: são sete ilustrações do corpo
function desenharMiniaturas(painel) {
  painel.querySelectorAll('[data-mini]').forEach((el) => {
    const grupo = el.dataset.mini;
    new MuscleMap(el, {
      gender: 'male',
      theme: 'light',
      color: COR,
      width: '100%',
      hoverHighlight: false,
      view: VISTA_DE_COSTAS.has(grupo) ? 'back' : 'front',
      highlights: regioesDoGrupo(grupo).map((r) => ({ group: r, intensity: 100, color: COR })),
    });
  });
}
