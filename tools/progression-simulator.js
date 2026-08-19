"use strict";
const PERSONAS={
  casual:{label:"Casual", weekly:{force:220,agility:70,constitution:70,intelligence:80,determination:55,charisma:0}},
  medium:{label:"Médio", weekly:{force:360,agility:110,constitution:220,intelligence:200,determination:130,charisma:0}},
  dedicated:{label:"Dedicado", weekly:{force:620,agility:210,constitution:360,intelligence:300,determination:230,charisma:0}}
};
function req(l){return l>=50?Infinity:Math.ceil(BALANCE.levelCurve.base*Math.pow(l,BALANCE.levelCurve.exponent));}
function simulate(p,weeks){const a={};Object.keys(p.weekly).forEach(k=>a[k]={level:1,xp:0});for(let w=0;w<weeks;w++){for(const [k,gain] of Object.entries(p.weekly)){const x=a[k];x.xp+=gain;while(x.level<50&&x.xp>=req(x.level)){x.xp-=req(x.level);x.level++;}}}const levels=Object.values(a).map(x=>x.level);return {global:Math.ceil(levels.reduce((s,n)=>s+n,0)/levels.length),attributes:a};}
const cards=document.getElementById("cards"),rows=document.getElementById("rows");for(const p of Object.values(PERSONAS)){const s12=simulate(p,12),s26=simulate(p,26),s52=simulate(p,52),weekly=Object.values(p.weekly).reduce((a,b)=>a+b,0);cards.insertAdjacentHTML("beforeend",`<div class="card"><strong>${p.label}</strong><div class="big">Global ${s52.global}</div><small>após 52 semanas no modelo-base</small></div>`);rows.insertAdjacentHTML("beforeend",`<tr><td>${p.label}</td><td>${weekly}</td><td>${s12.global}</td><td>${s26.global}</td><td>${s52.global}</td></tr>`);}document.getElementById("warning").innerHTML="Modelo A: o começo é deliberadamente mais rápido e a progressão desacelera conforme o custo dos níveis cresce. Não existe cap semanal de XP: o jogador dedicado continua avançando mais que o médio, enquanto repetições da mesma categoria no mesmo dia têm retorno decrescente.";
