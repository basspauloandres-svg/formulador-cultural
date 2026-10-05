(()=>{
if(typeof sections==='undefined'||typeof order==='undefined')return;
if(!sections.S09){sections.S09={title:'Árbol de objetivos',question:'¿Cómo transformar el árbol de problemas en estados positivos deseados?',meaning:'Convierte problema, causas y efectos en objetivo central, medios y fines manteniendo la trazabilidad con S07.',fields:[['objetivo_central','Objetivo central',1],['medios_directos','Medios directos'],['medios_indirectos','Medios indirectos'],['fines_directos','Fines directos'],['fines_indirectos','Fines indirectos']]}}
if(!order.includes('S09'))order.push('S09');
const boot=localStorage.getItem('fc_boot_target');
if(boot==='S09'){active='S09';localStorage.removeItem('fc_boot_target')}
if(typeof render==='function')render();
})();