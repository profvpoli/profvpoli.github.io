'use strict';
const values=[[12,18,15,20],[9,14,17,11],[21,16,13,19]];
const NROWS=3,NCOLS=4,$=id=>document.getElementById(id);
const flatten=values.flat();let position=-1,steps=[],timer=null,chosen=null,sourceCode='';
function grid(el,selected,completed=[],clickable=false){
  el.style.gridTemplateColumns=`minmax(70px,.86fr) repeat(${NCOLS},minmax(0,1fr))`;
  el.replaceChildren();
  const corner=document.createElement('div');corner.className='matrix-heading corner';corner.textContent='';el.append(corner);
  for(let c=0;c<NCOLS;c++){const h=document.createElement('div');h.className='matrix-heading';h.textContent=`Colonna ${c}`;el.append(h);}
  values.forEach((row,r)=>{
    const heading=document.createElement('div');heading.className='matrix-heading';heading.textContent=`Riga ${r}`;el.append(heading);
    row.forEach((v,c)=>{
      const d=document.createElement(clickable?'button':'div');d.className='cell';
      const key=`${r},${c}`;
      if(selected&&selected[0]===r&&selected[1]===c)d.classList.add('active');
      else if(completed.includes(key))d.classList.add('done');
      const index=document.createElement('small');index.className='cell-index';index.textContent=`[${r}][${c}]`;
      const value=document.createElement('span');value.className='cell-value';value.textContent=String(v);
      d.append(index,value);
      if(clickable){d.type='button';d.setAttribute('aria-label',`riga ${r}, colonna ${c}, valore ${v}`);
        d.onclick=()=>{chosen=[r,c];grid(el,chosen,[],true);$('introReadout').textContent=`matrice[${r}][${c}] = ${v}. È nella riga ${r}, colonna ${c} (indici da zero).`;};}
      el.append(d);
    });
  });
}
function calcSteps(){
 const scope=$('scope').value,metric=$('metric').value;
 let groups=[];
 if(scope==='all')groups=[Array.from({length:NROWS*NCOLS},(_,n)=>[Math.floor(n/NCOLS),n%NCOLS])];
 else if(scope==='row')groups=values.map((row,r)=>row.map((_,c)=>[r,c]));
 else groups=values[0].map((_,c)=>values.map((_,r)=>[r,c]));
 steps=[];
 groups.forEach((group,gi)=>{
  const [firstR,firstC]=group[0];let acc=(metric==='sum'||metric==='avg')?0:values[firstR][firstC];
  const label=scope==='all'?'intera matrice':scope==='row'?`riga ${gi}`:`colonna ${gi}`;
  steps.push({type:'init',r:firstR,c:firstC,acc,gi,label,text:`Inizializzo ${metric==='sum'||metric==='avg'?'somma':metric==='max'?'massimo':'minimo'} a ${acc} prima di elaborare ${label}.`});
  group.forEach(([r,c],idx)=>{
   const before=acc,val=values[r][c];
   if(metric==='sum'||metric==='avg')acc+=val;
   else if(metric==='max')acc=Math.max(acc,val);
   else acc=Math.min(acc,val);
   steps.push({type:'visit',r,c,value:val,acc,before,gi,idx,label});
  });
  const result=metric==='avg'?acc*1.0/group.length:acc;
  steps.push({type:'result',r:null,c:null,acc,gi,label,result,count:group.length,text:metric==='avg'?`Media di ${label}: ${acc} * 1.0 / ${group.length} = ${format(result)}.`:`Risultato di ${label}: ${format(result)}.`});
 });
 position=-1;render();
}
function format(x){return Number.isInteger(x)?String(x):x.toFixed(2).replace('.',',');}
function makeCode(){
 let scope=$('scope').value,metric=$('metric').value,lines=['#include <iostream>','using namespace std;','','int main() {','    int numeroRighe = 3;','    int numeroColonne = 4;','    int matrice[3][4];','','    // Caricamento dei dati','    for (int riga = 0; riga < numeroRighe; riga++) {','        for (int colonna = 0; colonna < numeroColonne; colonna++) {','            cin >> matrice[riga][colonna];','        }','    }',''];
 const grouped=scope!=='all',outer=scope==='col'?'colonna':'riga',inner=scope==='col'?'riga':'colonna';
 const name=metric==='sum'||metric==='avg'?'somma':metric==='max'?'massimo':'minimo';
 const init=metric==='sum'||metric==='avg'?'0':scope==='all'?'matrice[0][0]':scope==='row'?'matrice[riga][0]':'matrice[0][colonna]';
 const update=metric==='sum'||metric==='avg'?'somma += matrice[riga][colonna];':`if (matrice[riga][colonna] ${metric==='max'?'>':'<'} ${name}) ${name} = matrice[riga][colonna];`;
 const divisor=scope==='all'?'(numeroRighe * numeroColonne)':scope==='row'?'numeroColonne':'numeroRighe';
 if(!grouped)lines.push(`    int ${name} = ${init};`);
 lines.push(`    for (int ${outer} = 0; ${outer} < numero${outer==='riga'?'Righe':'Colonne'}; ${outer}++) {`);
 if(grouped)lines.push(`        int ${name} = ${init};`);
 lines.push(`        for (int ${inner} = 0; ${inner} < numero${inner==='riga'?'Righe':'Colonne'}; ${inner}++) {`);
 lines.push('            '+update,'        }');
 if(grouped){if(metric==='avg')lines.push(`        double media = somma * 1.0 / ${divisor};`);lines.push(`        cout << "${scope==='row'?'Riga':'Colonna'} " << ${outer} << ": " << ${metric==='avg'?'media':name} << endl;`);}
 lines.push('    }');
 if(!grouped){if(metric==='avg')lines.push(`    double media = somma * 1.0 / ${divisor};`);lines.push(`    cout << "Risultato: " << ${metric==='avg'?'media':name} << endl;`);}
 lines.push('    return 0;','}');sourceCode=lines.join('\n');return lines;
}
function drawCode(event){
 const lines=makeCode(),pre=$('codeView');pre.replaceChildren();
 lines.forEach((line,i)=>{
  const span=document.createElement('span');span.className='code-line';span.textContent=String(i+1).padStart(2,' ')+' │ '+line;
  if(event && ((event.type==='init' && /int (somma|massimo|minimo) =/.test(line)) || (event.type==='visit' && (/somma \+=/.test(line)||/if \(matrice/.test(line))) || (event.type==='result' && (line.includes('double media =') || (event && $('metric').value!=='avg'&&line.includes('cout <<'))))))span.classList.add('highlight');
  pre.append(span);
 });
}
function render(){
 const s=steps[position],seen=steps.slice(0,position+1),visited=seen.filter(t=>t.type==='visit').map(t=>`${t.r},${t.c}`);
 grid($('simMatrix'),s&&s.type==='visit'?[s.r,s.c]:null,visited);
 $('rigaValue').textContent=s&&s.type==='visit'?s.r:'—';$('colValue').textContent=s&&s.type==='visit'?s.c:'—';
 const metric=$('metric').value,name=metric==='sum'||metric==='avg'?'somma':metric==='max'?'massimo':'minimo';
 $('accName').textContent=name.charAt(0).toUpperCase()+name.slice(1);
 $('accValue').textContent=s?format(s.acc):'—';
 $('countValue').textContent=seen.filter(t=>t.type==='visit').length;
 $('progress').textContent=`Fase ${position+1} di ${steps.length}`;
 let explanation='Premi Avanti: inizieremo dall’inizializzazione della variabile.';
 if(s){if(s.type==='init')explanation=s.text;
 else if(s.type==='result')explanation=s.text;
 else explanation=`${s.label.toUpperCase()}: matrice[${s.r}][${s.c}] = ${s.value}. `+(metric==='sum'||metric==='avg'?`somma = ${s.before} + ${s.value} = ${s.acc}.`:`Confronto ${s.value} con ${s.before}: ${name} ${s.acc!==s.before?'diventa':'rimane'} ${s.acc}.`);
 }
 $('explain').textContent=explanation;drawCode(s);
 const panel=$('variablesPanel');panel.replaceChildren();
 [['numeroRighe','3'],['numeroColonne','4'],['riga',s&&s.type==='visit'?s.r:'—'],['colonna',s&&s.type==='visit'?s.c:'—'],[name,s?format(s.acc):'—'],...(metric==='avg'?[['media',s&&s.type==='result'?format(s.result):'—']]:[])].forEach(([title,value])=>{const box=document.createElement('div');box.className='stat';let small=document.createElement('small'),strong=document.createElement('strong');small.textContent=title;strong.textContent=value;box.append(small,strong);panel.append(box);});
 let results=seen.filter(t=>t.type==='result');$('resultsPanel').textContent=results.length?'Risultati completati: '+results.map(t=>`${t.label}: ${format(t.result)}`).join(' • '):'I risultati appariranno quando terminerà ciascuna elaborazione.';
 $('prev').disabled=position<0;$('next').disabled=position>=steps.length-1;
}
function advance(){if(position<steps.length-1){position++;render();}else stop();}function stop(){if(timer!==null){clearInterval(timer);timer=null;}$('play').textContent='▶ Esegui';}function restart(){stop();position=-1;render();}
$('scope').addEventListener('change',()=>{stop();calcSteps();});$('metric').addEventListener('change',()=>{stop();calcSteps();});$('speed').addEventListener('change',()=>{if(timer!==null){stop();$('play').click();}});$('prev').onclick=()=>{stop();position=Math.max(-1,position-1);render();};$('next').onclick=()=>{stop();advance();};$('reset').onclick=restart;$('play').onclick=()=>{if(timer!==null){stop();return;}if(position===steps.length-1)position=-1;advance();timer=setInterval(()=>{if(position===steps.length-1){stop();return;}advance();},Number($('speed').value));$('play').textContent='⏸ Pausa';};$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(sourceCode);$('copyCode').textContent='Copiato!';setTimeout(()=>$('copyCode').textContent='Copia codice C++',1200);}catch{const blob=new Blob([sourceCode],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='matrice.cpp';a.click();URL.revokeObjectURL(url);}};
const questions=[{q:'In una matrice int m[3][4], qual è l’ultimo indice valido di riga?',options:['3','2','4'],correct:1,why:'Tre righe hanno indici 0, 1 e 2.'},{q:'Per ottenere la somma separata di ogni colonna, quale ciclo è quello esterno?',options:['riga','colonna','non servono due cicli'],correct:1,why:'Il ciclo esterno deve fissare una colonna mentre quello interno percorre le righe.'},{q:'Dove si inizializza la somma di ciascuna riga?',options:['Prima di entrambi i cicli','Dentro il ciclo esterno, prima di quello interno','A ogni elemento nel ciclo interno'],correct:1,why:'La somma deve ripartire da zero a ogni nuova riga.'},{q:'Come inizializziamo il massimo per ciascuna colonna?',options:['int massimo = 0;','int massimo = matrice[0][colonna];','int massimo = matrice[colonna][0];'],correct:1,why:'Il primo valore della colonna corrente è matrice[0][colonna].'},{q:'Per la media di una singola riga in una matrice di 3 × 4, per cosa dividi la somma della riga?',options:['3','4','12'],correct:1,why:'Ogni riga contiene quattro elementi.'}];
questions.forEach((q,i)=>{let el=document.createElement('div');el.className='exercise';let head=document.createElement('p');head.innerHTML=`<b>${i+1}. ${q.q}</b>`;el.append(head);q.options.forEach((option,j)=>{let label=document.createElement('label'),inp=document.createElement('input');inp.type='radio';inp.name=`q${i}`;inp.value=j;label.append(inp,document.createTextNode(' '+option));el.append(label);});let feedback=document.createElement('p');feedback.id=`feedback${i}`;feedback.className='muted';el.append(feedback);$('quiz').append(el);});$('checkQuiz').onclick=()=>{let score=0;questions.forEach((q,i)=>{let picked=document.querySelector(`input[name="q${i}"]:checked`),ok=picked&&Number(picked.value)===q.correct;if(ok)score++;$(`feedback${i}`).textContent=(ok?'✓ Corretto. ':'✗ Da rivedere. ')+q.why;});$('quizResult').style.display='block';$('quizResult').textContent=`Hai risposto correttamente a ${score} domande su ${questions.length}.`;};
grid($('introMatrix'),null,[],true);calcSteps();

// Sezione: inizializzazione oppure acquisizione, con una simulazione visiva.
let fillMode='init', fillPosition=0;
const initCode=`int matrice[3][4] = {
    {12, 18, 15, 20},
    { 9, 14, 17, 11},
    {21, 16, 13, 19}
};`;
const inputCode=`int numeroRighe = 3;
int numeroColonne = 4;
int matrice[3][4];

for (int riga = 0; riga < numeroRighe; riga++) {
    for (int colonna = 0; colonna < numeroColonne; colonna++) {
        cin >> matrice[riga][colonna];
    }
}`;
function drawFill(){
 $('fillCode').textContent=fillMode==='init'?initCode:inputCode;
 $('fillTitle').textContent=fillMode==='init'?'Inizializzazione contestuale alla dichiarazione':'Caricamento con cin e cicli annidati';
 $('fillExplain').textContent=fillMode==='init'?'I valori sono elencati nel codice e raggruppati per riga. Premi «Valore successivo» per vedere la corrispondenza fra elenco e caselle.':'Ogni pressione simula un dato inserito con cin. Il programma attraversa le colonne di una riga prima di passare alla successiva.';
 const el=$('fillMatrix');el.replaceChildren();el.style.gridTemplateColumns=`minmax(70px,.86fr) repeat(${NCOLS},minmax(0,1fr))`;
 const corner=document.createElement('div');corner.className='matrix-heading corner';el.append(corner);
 for(let c=0;c<NCOLS;c++){const h=document.createElement('div');h.className='matrix-heading';h.textContent=`Colonna ${c}`;el.append(h);}
 values.forEach((row,r)=>{const h=document.createElement('div');h.className='matrix-heading';h.textContent=`Riga ${r}`;el.append(h);
 row.forEach((v,c)=>{const n=r*NCOLS+c,d=document.createElement('div');d.className='cell';if(n===fillPosition-1)d.classList.add('active');if(n<fillPosition)d.classList.add('done');const ix=document.createElement('small');ix.className='cell-index';ix.textContent=`[${r}][${c}]`;const value=document.createElement('span');value.className='cell-value';value.textContent=n<fillPosition?String(v):'?';d.append(ix,value);el.append(d);});
 });
 $('fillProgress').textContent=`${fillPosition} elementi su ${NROWS*NCOLS} mostrati. ${fillPosition===NROWS*NCOLS?'Matrice completa.':'Il simbolo ? indica una casella non ancora valorizzata nella simulazione.'}`;
 $('fillNext').disabled=fillPosition===NROWS*NCOLS;
}
$('chooseInit').onclick=()=>{fillMode='init';fillPosition=0;drawFill();};
$('chooseInput').onclick=()=>{fillMode='input';fillPosition=0;drawFill();};
$('fillNext').onclick=()=>{fillPosition=Math.min(NROWS*NCOLS,fillPosition+1);drawFill();};
$('fillReset').onclick=()=>{fillPosition=0;drawFill();};
for(const b of document.querySelectorAll('.launch-operation')){
 b.onclick=()=>{stop();$('scope').value=b.dataset.scope;$('metric').value=b.dataset.metric;calcSteps();document.getElementById('laboratorio').scrollIntoView({behavior:'smooth'});};
}
drawFill();
