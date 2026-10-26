// Compara modelo.js con las salidas de Keras guardadas en referencia.json.
// Uso: node tools/verificar.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const dir = new URL('..', import.meta.url);
const ctx = { Math, Number, Object, Error };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['model-data.js', 'modelo.js']) vm.runInContext(readFileSync(new URL(f, dir), 'utf8'), ctx);

const ref = JSON.parse(readFileSync(new URL('tools/referencia.json', dir), 'utf8'));
let maxDif = 0, maxDifReal = 0, malas = 0;
ref.filas.forEach((fila, i) => {
  const r = ctx.Modelo.predecir(fila);
  maxDif = Math.max(maxDif, Math.abs(r.p - ref.p[i]));
  maxDifReal = Math.max(maxDifReal, Math.abs(r.pReal - ref.p_real[i]));
  if (r.decision !== ref.decision[i]) malas++;
});
console.log(`filas: ${ref.filas.length}  dif max p: ${maxDif.toExponential(2)}  dif max p_real: ${maxDifReal.toExponential(2)}  decisiones distintas: ${malas}`);
if (maxDif > 1e-4 || maxDifReal > 1e-4 || malas) { console.error('FALLA'); process.exit(1); }
console.log('OK');
