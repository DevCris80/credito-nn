// Inferencia del MLP de crédito en JS. Port de predecir.py (transformar + forward).
(function (global) {
  const { pesos, cfg } = global.MODELO;
  const PENDIENTE = 0.2; // negative_slope de leaky_relu en Keras 3

  const logCola = (x) => Math.sign(x) * Math.log1p(Math.abs(x));
  const vacio = (v) => v === null || v === undefined || v === '' || Number.isNaN(Number(v));

  // fila: objeto con las 15 columnas crudas -> vector de 26 entradas
  function transformar(fila) {
    const faltan = cfg.variables.filter((c) => !(c in fila));
    if (faltan.length) throw new Error('Faltan columnas: ' + faltan.join(', '));
    const num = cfg.numericas;
    const crudo = num.map((c) => (vacio(fila[c]) ? NaN : Number(fila[c])));
    const indic = cfg.cols_indicador.map((c) => (Number.isNaN(crudo[num.indexOf(c)]) ? 1 : 0));
    const x = num.map((c, i) => {
      let v = crudo[i];
      if (cfg.transformacion === 'log' && cfg.cola_larga.includes(c)) v = logCola(v);
      if (Number.isNaN(v)) v = cfg.relleno[c];
      return (v - cfg.media[c]) / cfg.desv[c];
    });
    const cat = [];
    for (const [v, cats] of Object.entries(cfg.categorias)) {
      for (const c of cats.slice(1)) cat.push(fila[v] === c ? 1 : 0);
    }
    return [...x, ...indic, ...cat];
  }

  function forward(entrada) {
    let a = entrada;
    for (const { kernel, bias, activacion } of pesos) {
      const sal = bias.slice();
      for (let i = 0; i < a.length; i++) {
        const ai = a[i];
        if (ai === 0) continue;
        const fila = kernel[i];
        for (let j = 0; j < sal.length; j++) sal[j] += ai * fila[j];
      }
      a = activacion === 'sigmoid'
        ? sal.map((z) => 1 / (1 + Math.exp(-z)))
        : sal.map((z) => (z >= 0 ? z : PENDIENTE * z));
    }
    return a[0];
  }

  function probabilidadReal(p, prevalencia) {
    const a = (1 - prevalencia) / 0.5;
    const b = prevalencia / 0.5;
    return (p * a) / (p * a + (1 - p) * b);
  }

  function predecir(fila) {
    const p = forward(transformar(fila));
    return {
      p,
      pReal: probabilidadReal(p, cfg.prevalencia_incumplimiento),
      decision: p >= cfg.umbral ? 'APTO' : 'NO APTO',
    };
  }

  global.Modelo = { cfg, transformar, forward, predecir, probabilidadReal };
})(typeof window !== 'undefined' ? window : globalThis);
