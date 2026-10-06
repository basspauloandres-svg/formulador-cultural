# Especificación maestra · Formulador Cultural

## Principio de producto
Front simple, didáctico y orientador. Lógica interna estructurada, rigurosa y trazable. Una pantalla debe pedir una decisión principal. El detalle metodológico queda disponible bajo “Ver detalle técnico”.

## Cadena metodológica
Contexto y evidencia → situaciones observables → Vester y revisión de relaciones → problema central → causas y efectos → árbol de problemas → árbol de objetivos → objetivos → alternativas → resultados → actividades → indicadores y metas → cronograma → recursos y presupuesto → riesgos → coherencia → resultados y gráficas → documento final.

Ningún componente posterior debe aparecer sin antecedente lógico. Ningún componente previo relevante debe quedar sin traducción operativa.

## Ruta visible
1. Entender la situación: S01–S05.
2. Encontrar el problema principal: S06–S08.
3. Definir qué queremos cambiar: S09.
4. Diseñar qué vamos a hacer: S10–S15.
5. Revisar y entregar: S16.

Cada subsección muestra Completa / En curso / Falta y permite navegación directa. Se conservan Anterior, Guardar y Siguiente.

## Reglas metodológicas
- No inventar evidencia, población, línea base, meta, costo, fecha, duración, responsable, riesgo ni fuente.
- Los vacíos se conservan como [POR VERIFICAR].
- Evidencia ≠ dato derivado ≠ cálculo ≠ interpretación ≠ hipótesis ≠ recomendación ≠ decisión humana.
- Vester orienta; no demuestra causalidad.
- Las propuestas automáticas requieren aprobación explícita.
- Un problema ya existe; un riesgo todavía podría ocurrir.

## Trazabilidad de objetos
evidence_id → problem_id → objective_id → result_id → activity_id → schedule_item_id → budget_item_id → indicator_id → target_id → risk_id → verification_source_id.

## Operación
- Resultados, actividades e indicadores se proponen desde la cadena ya aprobada y se editan/aceptan.
- El cronograma se construye actividad por actividad con fecha, duración, dependencias y responsable.
- El presupuesto nace de actividades y recursos; calcula cantidad × frecuencia × costo unitario.
- Cada actividad debe indicar costo, aporte en especie o sin costo adicional.
- Riesgos se revisan desde causas, resultados y actividades; los riesgos altos requieren respuesta y responsable.
- Una respuesta preventiva puede convertirse en actividad únicamente por decisión explícita.

## Coherencia
Revisar de forma incremental:
- vertical: problema → objetivos → resultados → actividades;
- horizontal: indicador → línea base → meta → medio → responsable;
- temporal: actividad → duración → secuencia → dependencias;
- financiera: actividad → recurso → cantidad → costo;
- evidencial: afirmación → evidencia → fuente;
- poblacional/territorial;
- riesgos: objetivo/resultado/actividad → riesgo → respuesta → responsable.

## Salidas
- Árbol de problemas y árbol de objetivos: SVG y PDF, fondo limpio y tarjetas conectadas.
- Excel: respaldo técnico, sin depender de él como formato visual de los árboles.
- Documento final: DOCX editable, PDF formal y HTML universal.
- S16: resultados y gráficas funcionales de avance, coherencia, cobertura, evidencia, presupuesto y riesgos.

## Persistencia
- Supabase conserva S01–S16 en sections.data.
- Los estados estructurados viven dentro del JSON de cada sección.
- El proyecto con actividad de sección más reciente tiene prioridad al recuperar.
- Una copia local vacía no puede ocultar datos remotos válidos.
- Mantener compatibilidad con proyectos existentes.

## Criterio de finalización
El proyecto puede marcarse “Listo para presentar” cuando la cadena principal esté conectada, no existan componentes huérfanos relevantes, cronograma y tratamiento financiero cubran las actividades, indicadores y metas estén definidos o explícitamente pendientes, y los riesgos altos tengan respuesta. Los datos [POR VERIFICAR] no bloquean la exportación, pero deben quedar advertidos.

## Validación antes de publicar
1. pytest backend;
2. node --check de todos los módulos públicos;
3. smoke test del front;
4. recuperación de datos y navegación S01–S16;
5. ausencia de bloques duplicados;
6. persistencia local/Supabase;
7. exportaciones;
8. GitHub Pages con test y deploy en success.
