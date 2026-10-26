# predecir.py - Prediccion con la red neuronal de credito, fuera de Colab.
#
# Uso:   python predecir.py solicitantes.csv [resultados.csv]
# Requiere en la misma carpeta: modelo_credito_mlp.keras y preprocesador.json
# Instalar: pip install tensorflow pandas numpy
import json, os, sys
import numpy as np
import pandas as pd

CARPETA = os.path.dirname(os.path.abspath(__file__))


def cargar(carpeta=CARPETA):
    from tensorflow import keras
    with open(os.path.join(carpeta, 'preprocesador.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    modelo = keras.models.load_model(os.path.join(carpeta, 'modelo_credito_mlp.keras'))
    return modelo, cfg


def transformar(df, cfg):
    # Aplica exactamente el mismo preprocesamiento del notebook con los valores aprendidos en el entrenamiento
    faltan = [c for c in cfg['variables'] if c not in df.columns]
    if faltan:
        raise ValueError(f'Faltan columnas en el archivo de entrada: {faltan}')
    num = cfg['numericas']
    Xn = df[num].astype(float).copy()
    indic = Xn[cfg['cols_indicador']].isna().astype(float).values
    if cfg['transformacion'] == 'log':
        cols = cfg['cola_larga']
        Xn[cols] = np.sign(Xn[cols]) * np.log1p(Xn[cols].abs())
    elif cfg['transformacion'] == 'recorte':
        Xn = Xn.clip(pd.Series(cfg['p01'])[num], pd.Series(cfg['p99'])[num], axis=1)
    Xn = Xn.fillna(pd.Series(cfg['relleno'])[num])
    Xn = ((Xn - pd.Series(cfg['media'])[num]) / pd.Series(cfg['desv'])[num]).values
    partes = [Xn, indic]
    if cfg['categorias']:
        partes.append(np.column_stack([(df[v].values == c).astype(float)
                                       for v, cats in cfg['categorias'].items() for c in cats[1:]]))
    X = np.hstack(partes).astype('float32')
    assert X.shape[1] == len(cfg['nombres_entradas'])
    return X


def probabilidad_real(p, prevalencia):
    a, b = (1 - prevalencia) / 0.5, prevalencia / 0.5
    return p * a / (p * a + (1 - p) * b)


def predecir(df, modelo=None, cfg=None):
    if modelo is None or cfg is None:
        modelo, cfg = cargar()
    p = modelo.predict(transformar(df, cfg), verbose=0).ravel()
    return pd.DataFrame({
        'prob_apto_50_50': p,
        'prob_apto_real': probabilidad_real(p, cfg['prevalencia_incumplimiento']),
        'decision': np.where(p >= cfg['umbral'], 'APTO', 'NO APTO'),
    }, index=df.index)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__ or 'Uso: python predecir.py solicitantes.csv [resultados.csv]')
        sys.exit(1)
    entrada = pd.read_csv(sys.argv[1], encoding='utf-8-sig')
    resultado = pd.concat([entrada, predecir(entrada)], axis=1)
    salida = sys.argv[2] if len(sys.argv) > 2 else 'resultados_prediccion.csv'
    resultado.to_csv(salida, index=False, encoding='utf-8-sig')
    print(f'{len(resultado)} solicitantes evaluados -> {salida}')
    print(resultado['decision'].value_counts().to_string())
