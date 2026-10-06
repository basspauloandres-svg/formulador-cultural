const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8').replace(/<script[\s\S]*?<\/script>/gi,'');
const dom=new JSDOM(html,{url:'https://example.test/formulador-cultural/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window,errors=[];
w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;w.requestAnimationFrame=cb=>setTimeout(cb,0);w.HTMLElement.prototype.scrollIntoView=()=>{};
w.addEventListener('error',e=>errors.push(e.error||e.message));
const chain=()=>{const o={select:()=>o,order:()=>o,limit:()=>Promise.resolve({data:[],error:null}),eq:()=>o,maybeSingle:()=>Promise.resolve({data:null,error:null}),single:()=>Promise.resolve({data:null,error:null}),insert:()=>o,update:()=>o,upsert:()=>Promise.resolve({data:null,error:null}),delete:()=>o};return o};
w.supabase={createClient:()=>({auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange:()=>{},signInWithPassword:()=>Promise.resolve({error:null}),signUp:()=>Promise.resolve({data:{},error:null}),signInWithOtp:()=>Promise.resolve({error:null}),updateUser:()=>Promise.resolve({error:null}),signOut:()=>Promise.resolve()},from:()=>chain()})};
w.XLSX={utils:{book_new:()=>({}),json_to_sheet:()=>({}),aoa_to_sheet:()=>({}),book_append_sheet:()=>{}},writeFile:()=>{}};
const scripts=[
'preboot.js','app.js','sections_extension.js','guidance.js','evidence.js','s05_preflight.js','vester.js','causal_validation.js','decision_guidance.js','simple_causal_ui.js','tree_validation_bridge.js','tree.js','synthesis.js','visualization.js','s07_front.js','simple_tree_ui.js','objectives.js','workflow.js','completion.js','planning.js','results_layer.js','coherence_engine.js','export_completion.js','deliverables.js','visual_exports_ui.js','review_dashboard.js','completion_bridge.js','guided_experience.js'];
for(const file of scripts){const s=w.document.createElement('script');s.textContent=fs.readFileSync(file,'utf8');w.document.body.appendChild(s)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await wait(100);
 if(errors.length)throw errors[0];
 if(w.document.querySelectorAll('#guidedJourney').length!==1)throw new Error('Debe existir un solo recorrido guiado');
 if(!w.document.querySelector('#title')?.textContent)throw new Error('La sección inicial no se renderizó');
 if(typeof w.fcNavigate!=='function')throw new Error('fcNavigate no está disponible');
 await w.fcNavigate('S13');await wait(50);
 if(!/Cronograma/.test(w.document.querySelector('#title')?.textContent||''))throw new Error('S13 no navega correctamente');
 if(!/cronograma/i.test(w.document.querySelector('#fields')?.textContent||''))throw new Error('S13 no renderiza su interfaz guiada');
 await w.fcNavigate('S16');await wait(50);
 if(!/Revisión/.test(w.document.querySelector('#title')?.textContent||''))throw new Error('S16 no navega correctamente');
 if(!w.document.querySelector('.review-dashboard'))throw new Error('S16 no renderiza el panel de revisión');
 if(errors.length)throw errors[0];
 console.log('Front smoke OK');w.close();process.exit(0);
})().catch(e=>{console.error(e);try{w.close()}catch{}process.exit(1)});