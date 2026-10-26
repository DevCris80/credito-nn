# Riesgo crediticio · red neuronal

Demostración web de un modelo de deep learning (MLP en Keras) que clasifica a un solicitante de crédito como **APTO** o **NO APTO**.

**Para verla:** abre `credito-demo.html` en el navegador. Es un solo archivo, y el modelo corre en el navegador, sin servidor. GSAP e Inter se cargan desde internet.

## Contenido

| Ruta | Qué es |
|---|---|
| `credito-demo.html` | La página completa en un archivo (generada). |
| `index.html`, `styles.css`, `app.js`, `modelo.js` | Fuente de la página. |
| `model-data.js` | Pesos y preprocesador exportados del modelo. |
| `data/` | Casos de ejemplo, resultados y datos del entrenamiento. |
| `modelo/` | Notebook de entrenamiento, modelo `.keras`, `predecir.py` y tablas de resultados. |
| `tools/` | Scripts para regenerar los datos de la página y verificarlos contra Keras. |

## Modelo

- 15 variables de entrada → 26 entradas de la red → Dense 64 → 32 → 16 → 1 (LeakyReLU y sigmoide), 4 353 parámetros.
- Prueba (50/50): AUC 0.746, exactitud 68 %.
- La inferencia en JavaScript (`modelo.js`) reproduce a Keras con una diferencia máxima de 8e-8.
- El conjunto de datos de entrenamiento no está incluido.

## Regenerar

```bash
python tools/exportar_pesos.py modelo model-data.js       # requiere h5py
python tools/extraer_notebook.py modelo data/entrenamiento.js   # requiere pillow, numpy
python tools/empaquetar.py                                 # genera credito-demo.html
node tools/verificar.mjs                                   # compara con Keras (tools/referencia.json)
```

`predecir.py` (en `modelo/`) hace la predicción por CSV desde la línea de comandos: `python predecir.py solicitantes.csv`.

> Apoyo al analista, no para decidir sola.
