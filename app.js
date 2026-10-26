(function () {
  const { predecir, cfg } = window.Modelo;
  const EJ = window.EJEMPLOS;
  const R = window.RESULTADOS;
  const $ = (s, el = document) => el.querySelector(s);
  const hayGsap = !!window.gsap;
  if (!hayGsap) document.documentElement.classList.remove('js');

  const fmtN = (n, d = 0) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  const anulables = new Set(cfg.cols_indicador);
  const PESOS = window.MODELO.pesos;

  /* ——— definición del formulario ——— */
  const CAMPOS = [
    { grupo: 'Solicitud' },
    { k: 'monto_solicitado', et: 'Monto solicitado', min: 10000, max: 1500000, paso: 5000 },
    { k: 'plazo_meses', et: 'Plazo (meses)', min: 6, max: 72, paso: 1 },
    { k: 'tasa_interes_ea', et: 'Tasa de interés EA (%)', min: 10, max: 150, paso: 0.01 },
    { k: 'linea_negocio', et: 'Línea de negocio', opciones: { 'Cash loans': 'Crédito de consumo', 'Revolving loans': 'Crédito rotativo' } },
    { grupo: 'Perfil' },
    { k: 'edad', et: 'Edad', min: 18, max: 85, paso: 0.1 },
    { k: 'tipo_contrato', et: 'Tipo de contrato', opciones: { Working: 'Empleado', 'Commercial associate': 'Socio comercial', Pensioner: 'Pensionado', 'State servant': 'Funcionario público', Unemployed: 'Desempleado', 'Maternity leave': 'Licencia de maternidad', Student: 'Estudiante', Businessman: 'Empresario' } },
    { k: 'antiguedad_laboral_anios', et: 'Antigüedad laboral (años)', min: 0, max: 40, paso: 0.01 },
    { k: 'patrimonio_indice', et: 'Índice de patrimonio', min: 1, max: 5, paso: 1 },
    { grupo: 'Historial' },
    { k: 'score_crediticio', et: 'Score crediticio', min: 0, max: 900, paso: 1 },
    { k: 'nivel_endeudamiento_pct', et: 'Endeudamiento (%)', min: 0, max: 100, paso: 0.01 },
    { k: 'numero_creditos_activos', et: 'Créditos activos', min: 0, max: 15, paso: 1 },
    { k: 'saldo_total_creditos', et: 'Saldo total de créditos', min: 0, max: 3000000, paso: 10000 },
    { k: 'dias_maximo_mora', et: 'Días máximo de mora', min: 0, max: 365, paso: 1 },
    { k: 'porcentaje_pagos_oportunos', et: 'Pagos oportunos (%)', min: 0, max: 100, paso: 0.01 },
    { k: 'antiguedad_cliente_anios', et: 'Antigüedad como cliente (años)', min: 0, max: 20, paso: 0.01 },
  ];

  let fila = { ...EJ[4] };
  const refs = {}; // k -> {campo, rango, num, sel, tog}

  function construirFormulario() {
    const form = $('#form');
    for (const c of CAMPOS) {
      if (c.grupo) {
        const g = document.createElement('div');
        g.className = 'fgroup'; g.textContent = c.grupo;
        form.append(g);
        continue;
      }
      const el = document.createElement('div');
      el.className = 'field';
      const id = 'f_' + c.k;
      const r = { campo: el };
      if (c.opciones) {
        el.innerHTML = `<div class="field-top"><label for="${id}">${c.et}</label></div>
          <select id="${id}">${Object.entries(c.opciones).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
        r.sel = $('select', el);
        r.sel.addEventListener('change', () => cambiar(c.k, r.sel.value));
      } else {
        el.innerHTML = `<div class="field-top"><label for="${id}">${c.et}</label>
          ${anulables.has(c.k) ? `<button type="button" class="nulltog" aria-pressed="false">Sin dato</button>` : ''}</div>
          <input id="${id}" type="number" step="any" inputmode="decimal">
          <input type="range" min="${c.min}" max="${c.max}" step="${c.paso}" aria-label="${c.et}">`;
        r.num = $('input[type=number]', el);
        r.rango = $('input[type=range]', el);
        r.tog = $('.nulltog', el);
        r.rango.addEventListener('input', () => cambiar(c.k, Number(r.rango.value), 'rango'));
        r.num.addEventListener('input', () => cambiar(c.k, r.num.value === '' ? null : Number(r.num.value), 'num'));
        if (r.tog) r.tog.addEventListener('click', () => {
          const apagar = fila[c.k] !== null;
          cambiar(c.k, apagar ? null : Number(r.rango.value));
        });
      }
      refs[c.k] = r;
      form.append(el);
    }
  }

  function pintarCampo(k) {
    const r = refs[k], v = fila[k];
    if (r.sel) { r.sel.value = v; return; }
    const nulo = v === null || v === undefined;
    r.campo.classList.toggle('off', nulo);
    if (r.tog) r.tog.setAttribute('aria-pressed', String(nulo));
    r.rango.disabled = nulo;
    if (nulo) { r.num.value = ''; r.num.placeholder = 'sin dato'; return; }
    r.num.value = v;
    r.rango.value = v;
  }

  function cambiar(k, v, origen) {
    fila[k] = v;
    // el campo que se está editando no se reescribe; el otro control se sincroniza
    const r = refs[k];
    if (origen === 'rango') r.num.value = v;
    else if (origen === 'num') { if (v !== null) r.rango.value = v; else pintarCampo(k); }
    else pintarCampo(k);
    marcarChip(-1);
    evaluar();
  }

  /* ——— resultado ——— */
  let ultimaDecision = null;
  const L = 282.74;
  const vista = { p: 0, pr: 0 };
  const resEl = $('#result');

  function dibujar() {
    $('#gFill').style.strokeDashoffset = L * (1 - vista.p);
    $('#gNum').textContent = Math.round(vista.p * 100);
    $('#bPf').style.width = vista.p * 100 + '%';
    $('#bRf').style.width = vista.pr * 100 + '%';
    $('#bP').textContent = (vista.p * 100).toFixed(1) + '%';
    $('#bR').textContent = (vista.pr * 100).toFixed(1) + '%';
  }

  function evaluar() {
    const r = predecir(fila);
    const apto = r.decision === 'APTO';
    resEl.dataset.verdict = apto ? 'apto' : 'no';
    $('#verdict').textContent = r.decision;
    $('#resTag').textContent = r.decision;
    ultimaDecision = r.decision; colorSalidaRed();
    if (hayGsap) gsap.to(vista, { p: r.p, pr: r.pReal, duration: 0.7, ease: 'expo.out', overwrite: true, onUpdate: dibujar });
    else { vista.p = r.p; vista.pr = r.pReal; dibujar(); }
  }

  /* ——— chips y casos ——— */
  const predEj = EJ.map((f) => predecir(f));

  function marcarChip(i) {
    document.querySelectorAll('.chip').forEach((c, j) => c.setAttribute('aria-pressed', String(i === j)));
  }

  function cargar(f, i = -1) {
    fila = { ...f };
    for (const k of Object.keys(refs)) pintarCampo(k);
    marcarChip(i);
    evaluar();
  }

  function construirEjemplos() {
    $('#chips').innerHTML = EJ.map((f, i) =>
      `<button type="button" class="chip" aria-pressed="false"><i class="${predEj[i].decision === 'APTO' ? 'ok' : 'no'}"></i>Caso ${i + 1}</button>`).join('');
    document.querySelectorAll('.chip').forEach((c, i) => c.addEventListener('click', () => cargar(EJ[i], i)));

    $('#cases').innerHTML = EJ.map((f, i) => {
      const r = predEj[i], apto = r.decision === 'APTO';
      return `<li><button type="button" class="case" data-i="${i}">
        <span class="case-n">0${i + 1}</span>
        <span class="case-main"><span class="case-t">Score ${f.score_crediticio} · ${nombreContrato(f.tipo_contrato)}</span><br>
        <span class="case-s">Monto ${fmtN(f.monto_solicitado)} · ${f.plazo_meses} meses · tasa ${f.tasa_interes_ea}%</span></span>
        <span class="case-v ${apto ? 'v-apto' : 'v-no'}">${r.decision} · ${pct(r.p)}</span>
      </button></li>`;
    }).join('');
    document.querySelectorAll('.case').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.i);
      cargar(EJ[i], i);
      $('#demo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
  }

  const nombreContrato = (v) => (CAMPOS.find((c) => c.k === 'tipo_contrato').opciones[v] || v);

  /* ——— lote (CSV) ——— */
  let lote = { nombre: 'solicitantes_ejemplo.csv', cabecera: cfg.variables, filas: [], crudas: [], preds: [] };

  function parseCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/, 1)[0] || '';
    const sep = !primera.includes(',') && primera.includes(';') ? ';' : ',';
    const filas = []; let fila_ = [], campo = '', q = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (q) {
        if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { fila_.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && texto[i + 1] === '\n') i++;
        fila_.push(campo); campo = '';
        if (fila_.some((c) => c !== '')) filas.push(fila_);
        fila_ = [];
      } else campo += ch;
    }
    fila_.push(campo);
    if (fila_.some((c) => c !== '')) filas.push(fila_);
    return filas;
  }

  function aFilas(texto) {
    const tabla = parseCSV(texto);
    if (tabla.length < 2) throw new Error('El archivo no tiene filas de datos.');
    const cab = tabla[0].map((c) => c.trim());
    const faltan = cfg.variables.filter((c) => !cab.includes(c));
    if (faltan.length) throw new Error('Faltan columnas: ' + faltan.join(', '));
    const idx = Object.fromEntries(cab.map((c, i) => [c, i]));
    const filas = tabla.slice(1).map((cols, n) => {
      const f = {};
      for (const c of cfg.variables) {
        const crudo = (cols[idx[c]] ?? '').trim();
        if (cfg.numericas.includes(c)) {
          if (crudo === '') f[c] = null;
          else {
            const v = Number(crudo);
            if (Number.isNaN(v)) throw new Error(`Fila ${n + 1}: "${crudo}" no es un número en la columna ${c}.`);
            f[c] = v;
          }
        } else f[c] = crudo;
      }
      return f;
    });
    return { cabecera: cab, filas, crudas: tabla.slice(1) };
  }

  function cargarLote(l) {
    lote = { ...lote, ...l };
    lote.preds = lote.filas.map((f) => predecir(f));
    const MAX = 200;
    $('#tbl tbody').innerHTML = lote.filas.slice(0, MAX).map((f, i) => {
      const r = lote.preds[i], apto = r.decision === 'APTO';
      return `<tr class="row" data-i="${i}"><td class="num">${i + 1}</td><td>${f.score_crediticio ?? '—'}</td><td>${f.monto_solicitado === null ? '—' : fmtN(f.monto_solicitado)}</td>
        <td>${nombreContrato(f.tipo_contrato)}</td><td>${pct(r.p, 1)}</td><td><span class="case-v ${apto ? 'v-apto' : 'v-no'}">${r.decision}</span></td></tr>`;
    }).join('');
    $('#mockTitle').textContent = lote.nombre;
    const n = lote.filas.length, nAptos = lote.preds.filter((r) => r.decision === 'APTO').length;
    $('#floatTag').textContent = `${n} evaluados · ${nAptos} aptos`;
    document.querySelectorAll('#tbl .row').forEach((tr) => tr.addEventListener('click', () => {
      cargar(lote.filas[Number(tr.dataset.i)]);
      $('#demo').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  function esc(v) { return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  function descargar() {
    const cab = [...lote.cabecera, 'prob_apto_50_50', 'prob_apto_real', 'decision'];
    const lineas = lote.crudas.map((cols, i) => {
      const r = lote.preds[i];
      const base = lote.cabecera.map((_, j) => esc(cols[j] ?? ''));
      return [...base, r.p, r.pReal, r.decision].join(',');
    });
    const blob = new Blob(['﻿' + [cab.join(','), ...lineas].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'resultados_prediccion.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }

  function iniciarLote() {
    // el lote inicial son los 5 ejemplos, con las columnas crudas tal como en el CSV de ejemplo
    const crudas = EJ.map((f) => cfg.variables.map((c) => (f[c] === null ? '' : String(f[c]))));
    cargarLote({ nombre: 'solicitantes_ejemplo.csv', cabecera: cfg.variables, filas: EJ, crudas });
    $('#csvIn').addEventListener('change', async (e) => {
      const archivo = e.target.files[0];
      if (!archivo) return;
      const err = $('#csvErr');
      try {
        const l = aFilas(await archivo.text());
        err.hidden = true;
        cargarLote({ nombre: archivo.name, ...l });
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
      e.target.value = '';
    });
    $('#csvOut').addEventListener('click', descargar);
  }

  /* ——— resultados ——— */
  function pintarResultados() {
    const max = R.importancia[0][1];
    $('#imp').innerHTML = R.importancia.map(([n, v]) =>
      `<li><span class="nm">${n}</span><span class="tr"><i data-w="${Math.max(v / max * 100, 1.2)}"></i></span><span class="pc">${v.toFixed(1)}%</span></li>`).join('');

    $('#met').innerHTML = R.metricas.map(([n, a, b]) => {
      const f = (x) => (n === 'AUC-ROC' ? x.toFixed(3) : (x * 100).toFixed(1) + '%');
      return `<div class="met-row"><span>${n}</span><b>${f(a)}</b><b class="${Math.abs(a - b) > 0.05 ? 'diff' : ''}">${f(b)}</b></div>`;
    }).join('');

    // AUC de validación según número de variables (puntos y línea, eje recortado a propósito y rotulado)
    const pts = [...R.seleccion].reverse(); // 7 -> 23
    const lo = 0.730, hi = 0.749, W = 400, x0 = 30, x1 = 370, yT = 36, yB = 140;
    const X = (i) => x0 + (x1 - x0) * i / (pts.length - 1);
    const Y = (v) => yB - (yB - yT) * (v - lo) / (hi - lo);
    const linea = pts.map(([, v], i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join(' ');
    $('#sel').innerHTML = `
      <line x1="${x0 - 10}" x2="${x1 + 10}" y1="${yB + 14}" y2="${yB + 14}" stroke="#e4e4e7"/>
      <path d="${linea}" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linejoin="round"/>
      ${pts.map(([n, v], i) => {
        const f = n === R.finalVariables;
        return `<circle cx="${X(i)}" cy="${Y(v)}" r="${f ? 8 : 5}" fill="${f ? '#059669' : '#18181b'}"/>
          <text x="${X(i)}" y="${Y(v) - (f ? 16 : 13)}" text-anchor="middle" font-size="12" font-weight="600" fill="#18181b">${v.toFixed(4)}</text>
          <text x="${X(i)}" y="${yB + 34}" text-anchor="middle" font-size="12" fill="${f ? '#059669' : '#71717a'}" font-weight="${f ? 700 : 500}">${n}${f ? ' ●' : ''}</text>`;
      }).join('')}
      <text x="${W / 2}" y="${yB + 52}" text-anchor="middle" font-size="10" letter-spacing="2" fill="#a1a1aa">NÚMERO DE VARIABLES · EJE RECORTADO</text>`;
  }

  /* ——— entrenamiento ——— */
  const E = window.ENTRENAMIENTO;
  let metricaCurva = 'loss';

  function pintarStats() {
    const s = [
      [E.hist.loss.length, 'épocas hasta la parada'],
      [fmtN(E.parametros), 'parámetros · 26-64-32-16-1'],
      ['0.7456 <small>vs 0.7438</small>', 'AUC de validación · LeakyReLU vs ReLU'],
      ['15 → 26', 'variables → entradas de la red'],
    ];
    $('#tstats').innerHTML = s.map(([n, d]) => `<div class="stat glass"><div class="stat-n">${n}</div><div class="stat-d">${d}</div></div>`).join('');
  }

  function pintarCurvas() {
    const m = metricaCurva, H = E.hist, a = H[m], b = H['val_' + m], n = a.length;
    const el = $('#curves');
    const W = Math.min(560, Math.max(300, el.clientWidth || 560)), Ht = W < 450 ? 260 : 300, l = 48, r = 14, t = 14, bm = 34;
    el.setAttribute('viewBox', `0 0 ${W} ${Ht}`);
    const todo = [...a, ...b];
    let lo = Math.min(...todo), hi = Math.max(...todo);
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const X = (i) => l + (W - l - r) * i / (n - 1);
    const Y = (v) => t + (Ht - t - bm) * (1 - (v - lo) / (hi - lo));
    const ruta = (s) => s.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const mejor = H.val_loss.indexOf(Math.min(...H.val_loss));      // época que restaura la parada anticipada
    const bajaLr = H.lr.findIndex((v) => v < H.lr[0]);              // primera época con la tasa reducida
    const ticks = [0, 1, 2, 3, 4].map((k) => lo + (hi - lo) * k / 4);
    $('#curves').innerHTML = `
      ${ticks.map((v) => `<line class="grid" x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l - 8}" y="${Y(v) + 3}" text-anchor="end">${v.toFixed(3)}</text>`).join('')}
      ${[0, 9, 19, 29].filter((i) => i < n).map((i) => `<text x="${X(i)}" y="${Ht - 12}" text-anchor="middle">${i + 1}</text>`).join('')}
      <text x="${(l + W - r) / 2}" y="${Ht + 2}" text-anchor="middle" font-size="9" letter-spacing="2">ÉPOCA</text>
      ${bajaLr > 0 ? `<line x1="${X(bajaLr)}" x2="${X(bajaLr)}" y1="${t}" y2="${Ht - bm}" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 4"/>
        <text x="${X(bajaLr) + 5}" y="${t + 10}">tasa de aprendizaje ÷10</text>` : ''}
      <path class="ln ln-tr" pathLength="1" stroke-dasharray="1" d="${ruta(a)}"/>
      <path class="ln ln-va" pathLength="1" stroke-dasharray="1" d="${ruta(b)}"/>
      <circle cx="${X(mejor)}" cy="${Y(b[mejor])}" r="5" fill="#34d399" stroke="#000" stroke-width="2"/>
      <text x="${X(mejor)}" y="${Y(b[mejor]) + (m === 'loss' ? -12 : 20)}" text-anchor="middle" style="fill:#34d399;font-weight:600">mejor · época ${mejor + 1}</text>`;
  }

  function dibujarCurvas() {
    const ls = document.querySelectorAll('#curves .ln');
    if (hayGsap) gsap.fromTo(ls, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12 });
    else ls.forEach((p) => (p.style.strokeDashoffset = 0));
  }

  function pintarRoc() {
    const l = 34, r = 286, t = 8, b = 212, P = E.roc;
    const X = (v) => l + (r - l) * v, Y = (v) => b - (b - t) * v;
    const linea = P.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
    $('#roc').innerHTML = `
      ${[0, 0.5, 1].map((v) => `<line class="grid" x1="${l}" x2="${r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${l - 6}" y="${Y(v) + 3}" text-anchor="end">${v}</text>
        <text x="${X(v)}" y="${b + 14}" text-anchor="middle">${v}</text>`).join('')}
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}" stroke="rgba(255,255,255,.3)" stroke-dasharray="4 4"/>
      <path d="${linea} L${X(1)} ${Y(0)} L${X(0)} ${Y(0)} Z" fill="rgba(52,211,153,.10)"/>
      <path class="ln ln-va" pathLength="1" stroke-dasharray="1" d="${linea}"/>
      <text x="${(l + r) / 2}" y="${b + 32}" text-anchor="middle" font-size="9" letter-spacing="2">TASA DE FALSOS POSITIVOS</text>`;
  }

  function pintarMatriz() {
    const [[tn, fp], [fn, tp]] = E.cm;
    const celda = (v, tot, ok, real) => {
      const f = v / tot, c = ok ? '52,211,153' : '251,113,133';
      return `<div class="cm-c" style="background:rgba(${c},${(0.08 + f * 0.35).toFixed(2)});border-color:rgba(${c},.35)"><b>${fmtN(v)}</b><span>${(f * 100).toFixed(1)}% de los ${real} reales</span></div>`;
    };
    $('#cm').innerHTML = `
      <span></span><span class="cm-l">Pred. no apto</span><span class="cm-l">Pred. apto</span>
      <span class="cm-l row">Real no apto</span>${celda(tn, tn + fp, true, 'no aptos')}${celda(fp, tn + fp, false, 'no aptos')}
      <span class="cm-l row">Real apto</span>${celda(fn, fn + tp, false, 'aptos')}${celda(tp, fn + tp, true, 'aptos')}
      <span class="cm-axis">9 930 solicitantes de prueba · 50 / 50</span>`;
  }

  /* ——— arquitectura ——— */
  function colorSalidaRed() {
    const o = $('#nnOut'), l = $('#nnOutLbl');
    if (!o || !ultimaDecision) return;
    const apto = ultimaDecision === 'APTO';
    o.style.fill = apto ? 'var(--emerald)' : 'var(--rose)';
    l.textContent = ultimaDecision;
    l.style.fill = apto ? 'var(--emerald)' : 'var(--rose)';
  }

  function pintarRed() {
    const el = $('#nn');
    const W = Math.min(1000, Math.max(320, el.clientWidth || 1000)), H = 440, estrecho = W < 600;
    el.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const capas = [
      { n: 26, show: 8, t: 'Entrada', a: '' }, { n: 64, show: 10, t: 'Oculta 1', a: 'LeakyReLU' },
      { n: 32, show: 8, t: 'Oculta 2', a: 'LeakyReLU' }, { n: 16, show: 6, t: 'Oculta 3', a: 'LeakyReLU' },
      { n: 1, show: 1, t: 'Salida', a: 'sigmoide' },
    ];
    const padX = estrecho ? 30 : 90, paso = 34, cy = 180;
    const nodos = capas.map((c, i) => ({
      x: padX + (W - 2 * padX) * i / (capas.length - 1),
      pts: Array.from({ length: c.show }, (_, k) => ({
        y: cy + (k - (c.show - 1) / 2) * paso,
        i: c.show === 1 ? 0 : Math.round(k * (c.n - 1) / (c.show - 1)),    // neurona real que representa
      })),
    }));
    let aristas = '';
    for (let l = 0; l < capas.length - 1; l++) {
      const ws = [];
      for (const a of nodos[l].pts) for (const b of nodos[l + 1].pts) ws.push([a, b, PESOS[l].kernel[a.i][b.i]]);
      const max = Math.max(...ws.map(([, , w]) => Math.abs(w)));
      aristas += ws.map(([a, b, w]) => {
        const op = 0.08 + 0.6 * Math.pow(Math.abs(w) / max, 0.8);
        return `<line class="nn-e" x1="${nodos[l].x}" y1="${a.y}" x2="${nodos[l + 1].x}" y2="${b.y}" stroke="rgba(${w >= 0 ? '52,211,153' : '251,113,133'},${op.toFixed(2)})"/>`;
      }).join('');
    }
    const circulos = nodos.map((nd, l) => nd.pts.map((p) =>
      `<circle class="nn-n ${l === 0 ? 'in' : l === capas.length - 1 ? 'out' : 'hid'}" ${l === capas.length - 1 ? 'id="nnOut"' : ''} cx="${nd.x}" cy="${p.y}" r="${l === capas.length - 1 ? 10 : 7.5}"/>`).join('')).join('');
    const rotulos = capas.map((c, l) => {
      const x = nodos[l].x, anc = l === 0 && estrecho ? 'start' : l === capas.length - 1 && estrecho ? 'end' : 'middle';
      return `<text class="nn-t" x="${x}" y="${H - 62}" text-anchor="${anc}" ${estrecho ? 'style="font-size:10px"' : ''}>${estrecho ? c.t.replace('Oculta', 'Oc.') : c.t}</text>
        <text class="nn-s" x="${x}" y="${H - 46}" text-anchor="${anc}">${estrecho ? c.n : `${c.n} ${c.n === 1 ? 'neurona' : 'neuronas'}`}</text>
        ${!estrecho && c.a ? `<text class="nn-s" x="${x}" y="${H - 32}" text-anchor="${anc}">${c.a}</text>` : ''}`;
    }).join('');
    el.innerHTML = `${aristas}${circulos}${rotulos}
      <text id="nnOutLbl" class="nn-t" x="${nodos[4].x}" y="${cy - 24}" text-anchor="${estrecho ? 'end' : 'middle'}"></text>`;
    colorSalidaRed();
  }

  function iniciarEntrenamiento() {
    pintarRed();
    pintarStats(); pintarCurvas(); pintarRoc(); pintarMatriz();
    let anchoPrevio = $('#curves').clientWidth;
    window.addEventListener('resize', () => {
      const w = $('#curves').clientWidth;
      if (Math.abs(w - anchoPrevio) > 40) { anchoPrevio = w; pintarRed(); pintarCurvas(); document.querySelectorAll('#curves .ln').forEach((p) => (p.style.strokeDashoffset = 0)); }
    });
    document.querySelectorAll('.seg button').forEach((bt) => bt.addEventListener('click', () => {
      metricaCurva = bt.dataset.m;
      document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === bt)));
      pintarCurvas(); dibujarCurvas();
    }));
  }

  /* ——— animaciones ——— */
  function animar() {
    if (!hayGsap) {
      document.querySelectorAll('#imp i').forEach((i) => (i.style.width = i.dataset.w + '%'));
      document.querySelectorAll('.chart .ln').forEach((p) => (p.style.strokeDashoffset = 0));
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

    gsap.to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1, delay: 0.1 });
    ScrollTrigger.batch('[data-reveal]:not(.hero [data-reveal])', {
      start: 'top 92%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.1 }),
    });

    ScrollTrigger.create({
      trigger: '#imp', start: 'top 85%', once: true,
      onEnter: () => gsap.to('#imp i', { width: (_, el) => el.dataset.w + '%', duration: 1, ease: 'expo.out', stagger: 0.05 }),
    });

    ScrollTrigger.create({
      trigger: '#nn', start: 'top 85%', once: true,
      onEnter: () => {
        gsap.from('#nn .nn-e', { opacity: 0, duration: 1, ease: 'power2.out', stagger: { amount: 1.2, from: 'start' } });
        gsap.from('#nn .nn-n', { scale: 0, duration: 0.7, ease: 'back.out(2)', stagger: { amount: 1, from: 'start' } });
      },
    });
    ScrollTrigger.create({ trigger: '#curves', start: 'top 85%', once: true, onEnter: dibujarCurvas });
    ScrollTrigger.create({
      trigger: '#roc', start: 'top 85%', once: true,
      onEnter: () => gsap.fromTo('#roc .ln', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'expo.out' }),
    });

    if (!reducido) {
      const pista = $('#tickerTrack');
      const recorrido = () => Math.max(0, pista.scrollWidth - window.innerWidth);
      gsap.to(pista, {
        x: () => -recorrido(), ease: 'none',
        scrollTrigger: { trigger: '#ticker', start: 'top top', end: () => '+=' + recorrido(), pin: true, scrub: 0.8, invalidateOnRefresh: true },
      });
      const refrescar = () => ScrollTrigger.refresh();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);
      window.addEventListener('load', refrescar);
    }
  }

  /* ——— arranque ——— */
  construirFormulario();
  construirEjemplos();
  iniciarLote();
  pintarResultados();
  iniciarEntrenamiento();
  cargar(EJ[4], 4);
  animar();
})();
