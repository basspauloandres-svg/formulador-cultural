const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function project() {
  const sections = Object.fromEntries(Array.from({length:16}, (_, i) =>
    ['S' + String(i+1).padStart(2,'0'), {}]));
  sections.S01 = { nombre_del_proyecto: 'PROYECTO QA SINTETICO' };
  sections.S04 = { evidencia_disponible: 'REGISTRO QA simulado', fuentes: 'FUENTE QA no primaria' };
  const indicator = (id, linkedType, linkedId) => ({
    id, linkedType, linkedId, confirmed:true, selected:true,
    indicator:'Indicador QA verificable', formula:'(realizados / previstos) x 100',
    unidad:'%', lineaBase:'0', meta:'100', medioVerificacion:'Acta QA',
    periodicidad:'Mensual', responsable:'Equipo QA', plazo:'Cierre'
  });
  return {
    sections,
    derived: {
      tree: { nodes: [
        {id:'P1', zone:'central', text:'PROBLEMA QA', origin:'S05'},
        {id:'C1', zone:'direct_cause', text:'CAUSA QA', parentId:'P1'},
        {id:'IC1', zone:'indirect_cause', text:'CAUSA INDIRECTA QA', parentId:'C1'}
      ]},
      objectives: { items: [
        {id:'P1', zone:'central', text:'OBJETIVO QA', sourceText:'PROBLEMA QA', confirmed:true},
        {id:'O1', zone:'direct_cause', text:'OBJETIVO ESPECIFICO QA', sourceText:'CAUSA QA', confirmed:true}
      ]},
      alternatives: [{id:'ALT1', text:'Alternativa QA', selected:true, confirmed:true}],
      results: [{id:'R1', objectiveId:'O1', text:'RESULTADO QA', confirmed:true}],
      activities: [{id:'A1', resultId:'R1', text:'ACTIVIDAD QA', confirmed:true}],
      indicators: [
        indicator('I-A1','Actividad','A1'),
        indicator('I-R1','Resultado','R1'),
        indicator('I-P1','Objetivo','P1')
      ],
      schedule: [{id:'S1',activityId:'A1',confirmed:true,activityText:'ACTIVIDAD QA'}],
      budget: [{id:'B1',activityId:'A1',confirmed:true,description:'PRESUPUESTO QA'}],
      budget_state: {activityStatus:{A1:'covered'}},
      risks: [{id:'K1',riskLevel:'Alto',confirmed:true,
        preventiveResponse:'Prevenir', contingencyResponse:'Contingencia',owner:'Equipo QA'}],
      risk_state: {targets:[{id:'A1'}],assessments:{A1:'covered'}}
    }
  };
}
let snapshot = project();
const context = {
  window:{
    fcGetProjectSnapshot: () => snapshot,
    fcGetScheduleIssuesSnapshot: () => []
  },
  document:{
    createElement:()=>({textContent:''}),
    head:{appendChild:()=>{}},
    querySelector:()=>null,
    body:{}
  },
  MutationObserver:class {observe(){}},
  console
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('coherence_engine.js','utf8'),context);
const report = () => context.window.fcGetCoherenceReport();
const check = label => {
  const item=report().checks.find(x=>x.label===label);
  assert(item, 'Falta regla de coherencia: ' + label);
  return item;
};
assert.strictEqual(report().score,100,'Caso sintético conectado debe superar reglas deductivas');
assert(report().checks.every(c=>c.status==='COHERENTE'),'Cadena válida no debe acumular falsos pendientes');

snapshot.derived.objectives.items[0].sourceText='OTRO PROBLEMA';
assert.strictEqual(check('Problema → objetivo general').status,'REQUIERE AJUSTE');
snapshot.derived.objectives.items[0].sourceText='PROBLEMA QA';

snapshot.derived.results[0].objectiveId='OBJETIVO INEXISTENTE';
assert.strictEqual(check('Objetivos → resultados').status,'REQUIERE AJUSTE');
snapshot.derived.results[0].objectiveId='O1';

snapshot.derived.activities[0].resultId='';
assert.strictEqual(check('Resultados → actividades').status,'REQUIERE AJUSTE');
snapshot.derived.activities[0].resultId='R1';

snapshot.derived.indicators=snapshot.derived.indicators.filter(x=>x.linkedType!=='Actividad');
assert.strictEqual(check('Actividades → indicadores').status,'REQUIERE AJUSTE');
snapshot.derived.indicators=project().derived.indicators;

snapshot.derived.schedule[0].confirmed=false;
assert.strictEqual(check('Actividades → cronograma').status,'REQUIERE AJUSTE');
snapshot.derived.schedule[0].confirmed=true;

snapshot.derived.budget_state.activityStatus={};
assert.strictEqual(check('Actividades → recursos y costos').status,'REQUIERE AJUSTE');
snapshot.derived.budget_state.activityStatus={A1:'covered'};

snapshot.derived.risks[0].preventiveResponse='[POR VERIFICAR]';
assert.strictEqual(check('Riesgos prioritarios con respuesta').status,'REQUIERE AJUSTE');
snapshot.derived.risks[0].preventiveResponse='Prevenir';

snapshot.sections.S04={};
assert.strictEqual(check('Existe información de respaldo').status,'INSUFFICIENT_EVIDENCE');
snapshot.sections.S04={evidencia_disponible:'REGISTRO QA simulado'};

assert.strictEqual(report().score,100,'Regresar a conexiones válidas debe restaurar coherencia');
console.log('PASS coherencia sintética: cadena válida + 8 perturbaciones dirigidas + recuperación del diagnóstico');
