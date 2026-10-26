// Resultados del modelo final (15 variables, LeakyReLU). Fuente: importancia_variables.csv,
// metricas_prueba.csv y seleccion_eliminacion.csv de la carpeta "proyecto deep learning".
window.RESULTADOS = {
  importancia: [
    ['score_crediticio', 66.26], ['tasa_interes_ea', 6.55], ['plazo_meses', 3.45], ['antiguedad_cliente_anios', 3.18],
    ['monto_solicitado', 2.79], ['linea_negocio', 2.75], ['antiguedad_laboral_anios', 2.59], ['tipo_contrato', 2.28],
    ['numero_creditos_activos', 2.27], ['dias_maximo_mora', 1.84], ['porcentaje_pagos_oportunos', 1.75], ['edad', 1.4],
    ['patrimonio_indice', 1.34], ['nivel_endeudamiento_pct', 0.79], ['saldo_total_creditos', 0.78],
  ],
  // [métrica, balanceado, población real]
  metricas: [
    ['AUC-ROC', 0.7459, 0.7459],
    ['Exactitud', 0.682, 0.6815],
    ['Sensibilidad · apto', 0.6814, 0.6814],
    ['Sensibilidad · no apto', 0.6826, 0.6826],
    ['Precisión · apto', 0.6822, 0.9607],
    ['Precisión · no apto', 0.6818, 0.1583],
  ],
  // [variables, AUC de validación]
  seleccion: [[23, 0.7456], [19, 0.7455], [15, 0.7453], [11, 0.7431], [7, 0.7341]],
  finalVariables: 15,
};
