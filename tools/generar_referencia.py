# Genera tools/referencia.json: filas de prueba con la salida de predecir.py (Keras real).
# Uso: python generar_referencia.py "<carpeta proyecto deep learning>" <salida referencia.json>
import json, sys
import numpy as np
import pandas as pd

carpeta, salida = sys.argv[1], sys.argv[2]
sys.path.insert(0, carpeta)
import predecir as P

modelo, cfg = P.cargar(carpeta)
rng = np.random.default_rng(7)

ej = pd.read_csv(f'{carpeta}/solicitantes_ejemplo.csv', encoding='utf-8-sig')
n = 200
filas = {}
for c in cfg['numericas']:
    # rango en espacio original: media +- 2 desv; las de cola larga se muestrean en log y se deshacen
    z = rng.normal(cfg['media'][c], cfg['desv'][c], n)
    if c in cfg['cola_larga']:
        z = np.expm1(np.abs(z))
    filas[c] = np.round(z, 2)
df = pd.DataFrame(filas)
df['score_crediticio'] = df['score_crediticio'].clip(0, 900)
for c in cfg['cols_indicador']:
    df.loc[rng.random(n) < 0.25, c] = np.nan
for v, cats in cfg['categorias'].items():
    df[v] = rng.choice(cats, n)
df = pd.concat([ej, df], ignore_index=True)

res = P.predecir(df, modelo, cfg)
filas_json = [{k: (None if pd.isna(v) else v) for k, v in r.items()} for r in df.to_dict('records')]
with open(salida, 'w', encoding='utf-8') as f:
    json.dump({'filas': filas_json,
               'p': [float(x) for x in res['prob_apto_50_50']],
               'p_real': [float(x) for x in res['prob_apto_real']],
               'decision': list(res['decision'])}, f)
print(len(df), res['decision'].value_counts().to_dict())
print(res.head(5))
