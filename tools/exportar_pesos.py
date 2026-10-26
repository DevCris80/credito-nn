# Exporta los pesos del modelo Keras y el preprocesador a model-data.js (window.MODELO).
# Uso: python exportar_pesos.py "<carpeta proyecto deep learning>" <salida model-data.js>
import io, json, sys, zipfile
import h5py

carpeta, salida = sys.argv[1], sys.argv[2]

with open(f'{carpeta}/preprocesador.json', encoding='utf-8') as f:
    cfg = json.load(f)

with zipfile.ZipFile(f'{carpeta}/modelo_credito_mlp.keras') as z:
    config = json.loads(z.read('config.json'))
    h5 = h5py.File(io.BytesIO(z.read('model.weights.h5')))

capas = [l for l in config['config']['layers'] if l['class_name'] == 'Dense']
activaciones = [l['config']['activation'] for l in capas]
assert activaciones == ['leaky_relu'] * 3 + ['sigmoid'], activaciones

pesos = []
for i, l in enumerate(capas):
    g = h5['layers/' + ('dense' if i == 0 else f'dense_{i}') + '/vars']
    k, b = g['0'][()], g['1'][()]
    assert k.shape[1] == l['config']['units']
    pesos.append({'activacion': l['config']['activation'],
                  'kernel': [[round(float(v), 8) for v in fila] for fila in k],
                  'bias': [round(float(v), 8) for v in b]})
assert pesos[0]['kernel'].__len__() == len(cfg['nombres_entradas']) == 26

print('formas:', [(len(p['kernel']), len(p['kernel'][0])) for p in pesos])
with open(salida, 'w', encoding='utf-8') as f:
    f.write('window.MODELO = ' + json.dumps({'pesos': pesos, 'cfg': cfg}, ensure_ascii=False) + ';\n')
