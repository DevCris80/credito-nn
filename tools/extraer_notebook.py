# Extrae del notebook RedNeuronal_Credito.ipynb los datos del entrenamiento a data/entrenamiento.js:
#  - historial por época (celda 17, salida de model.fit con verbose=2)
#  - matriz de confusión y curva ROC (celda 21; el notebook solo guarda la ROC como imagen,
#    así que se digitaliza la curva a partir de los píxeles del PNG)
# Uso: python extraer_notebook.py "<carpeta proyecto deep learning>" <salida entrenamiento.js>
import base64, io, json, re, sys
import numpy as np
from PIL import Image

carpeta, salida = sys.argv[1], sys.argv[2]
nb = json.load(open(f'{carpeta}/RedNeuronal_Credito.ipynb', encoding='utf-8'))

# --- historial de entrenamiento ---
txt = ''.join(''.join(o.get('text', '')) for o in nb['cells'][17]['outputs'])
filas = re.findall(r'accuracy: ([\d.]+) - auc: ([\d.]+) - loss: ([\d.]+) - val_accuracy: ([\d.]+) '
                   r'- val_auc: ([\d.]+) - val_loss: ([\d.]+) - learning_rate: ([\d.e-]+)', txt)
assert len(filas) == 30, len(filas)
hist = {k: [float(f[i]) for f in filas] for i, k in enumerate(['acc', 'auc', 'loss', 'val_acc', 'val_auc', 'val_loss', 'lr'])}

# --- ROC digitizada (panel izquierdo de la figura de la celda 21) ---
png = next(o['data']['image/png'] for o in nb['cells'][21]['outputs'] if 'image/png' in o.get('data', {}))
im = np.array(Image.open(io.BytesIO(base64.b64decode(png))).convert('RGB')).astype(int)
azul = (abs(im[..., 0] - 31) < 25) & (abs(im[..., 1] - 119) < 25) & (abs(im[..., 2] - 180) < 25)
azul[:100, :330] = False          # recuadro de la leyenda (su muestra de línea es del mismo color)
azul[:, 600:] = False             # panel derecho
ys, xs = np.nonzero(azul)
x0, x1, yb, yt = xs.min(), xs.max(), ys.max(), ys.min()   # la ROC va de (0,0) a (1,1)
col = {x: ys[xs == x] for x in np.unique(xs)}
fpr = np.array([(x - x0) / (x1 - x0) for x in col])
tpr = np.array([(yb - col[x].mean()) / (yb - yt) for x in col])
tpr = np.maximum.accumulate(tpr)                          # una ROC es monótona
auc = float(np.trapezoid(tpr, fpr))
print('AUC de la ROC digitizada:', round(auc, 4), '(notebook: 0.7459)')
assert abs(auc - 0.7459) < 0.005
idx = np.unique(np.linspace(0, len(fpr) - 1, 90).astype(int))
roc = [[round(float(fpr[i]), 4), round(float(tpr[i]), 4)] for i in idx]

# matriz de confusión leída de la figura: filas = real (no apto, apto), columnas = predicción
cm = [[3389, 1576], [1582, 3383]]

datos = {'hist': hist, 'roc': roc, 'cm': cm, 'auc': 0.7459, 'parametros': 4353}
with open(salida, 'w', encoding='utf-8') as f:
    f.write('// Generado por tools/extraer_notebook.py desde RedNeuronal_Credito.ipynb\n')
    f.write('window.ENTRENAMIENTO = ' + json.dumps(datos) + ';\n')
print('épocas:', len(hist['loss']), '| puntos ROC:', len(roc))
