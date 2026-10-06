(()=>{
function mount(){
 const c=document.querySelector('#counter')?.textContent||'';
 if(c.startsWith('S07')){
  const root=document.querySelector('#simpleTreeFlow')||document.querySelector('#treeWizard');if(root&&!document.querySelector('#treeExportBar')){const bar=document.createElement('div');bar.id='treeExportBar';bar.className='visual-export-bar';bar.innerHTML='<button id="viewProblemTree">Ver diagrama</button><button id="problemPdf">Exportar PDF</button><button id="problemSvg">Exportar SVG</button>';root.prepend(bar);bar.querySelector('#viewProblemTree').onclick=()=>window.fcOpenProblemTree?.();bar.querySelector('#problemPdf').onclick=()=>window.fcExportProblemTreePDF?.();bar.querySelector('#problemSvg').onclick=()=>window.fcExportProblemTreeSVG?.()}
 }
 if(c.startsWith('S09')){
  const root=document.querySelector('#objectivesWizard');if(root&&!document.querySelector('#objectiveExportBar')){const bar=document.createElement('div');bar.id='objectiveExportBar';bar.className='visual-export-bar';bar.innerHTML='<button id="viewObjectiveTree">Ver diagrama</button><button id="objectivePdf">Exportar PDF</button><button id="objectiveSvg">Exportar SVG</button>';root.prepend(bar);bar.querySelector('#viewObjectiveTree').onclick=()=>window.fcOpenObjectiveTree?.();bar.querySelector('#objectivePdf').onclick=()=>window.fcExportObjectiveTreePDF?.();bar.querySelector('#objectiveSvg').onclick=()=>window.fcExportObjectiveTreeSVG?.()}
 }
}
const st=document.createElement('style');st.textContent='.visual-export-bar{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin:0 0 12px}.visual-export-bar button{border:1px solid #aeb8c2;background:#fff;border-radius:9px;padding:9px 11px;font:inherit}.visual-export-bar button:first-child{background:var(--ink);color:#fff;border-color:var(--ink)}@media(max-width:650px){.visual-export-bar{display:grid}.visual-export-bar button{width:100%}}';document.head.appendChild(st);
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});mount();
})();