// ============================================================
//  DEEJAY ACADEMY — script.js con Firebase Firestore + Auth
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCSrMuYRkMAZrp5v0AafK45xqFwdkBquqY",
  authDomain:        "deejya-academy-base-alumnos.firebaseapp.com",
  projectId:         "deejya-academy-base-alumnos",
  storageBucket:     "deejya-academy-base-alumnos.firebasestorage.app",
  messagingSenderId: "1092925669565",
  appId:             "1:1092925669565:web:8f30089783c52947d777d4"
};

const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);
const auth  = getAuth(fbApp);
var rolActual = null;

async function fbAdd(col, data) { const r = await addDoc(collection(db, col), {...data, _ts: serverTimestamp()}); return r.id; }
async function fbUpd(col, id, data) { await updateDoc(doc(db, col, id), {...data, _ts: serverTimestamp()}); }
async function fbSet(col, id, data) { await setDoc(doc(db, col, id), {...data, _ts: serverTimestamp()}, {merge:true}); }
async function fbDel(col, id) { await deleteDoc(doc(db, col, id)); }

var DB = { alumnos:[], pagos:[], cuotas:[], asistencias:[], cursos:[], horario_grupos:[], egresos:[], cat_egreso:[], cat_pag_for:[], cat_pag_est:[], cat_pag_form:[], cat_pag_cur:[], colaboradores:[], calendario_plan:[], calendario_plan_fs:[], caja_movimientos:[], prospectos:[], embudo_etapas:[], leads:[], plantillas:[], whatsapp_mensajes:[], inbox_archivados:[] };

function listenCol(col, key, cb) {
  const q = query(collection(db, col), orderBy("_ts", "desc"));
  onSnapshot(q, snap => {
    DB[key] = snap.docs.map(d => ({id: d.id, ...d.data()}));
    if (cb) cb();
  }, err => console.warn("Firestore ["+col+"]:", err));
}

// ── LOGIN ──────────────────────────────────────────────────
function mostrarLogin(error) {
  var ov = document.getElementById('_login');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_login';
    ov.style.cssText = 'position:fixed;inset:0;background:#000000;display:flex;align-items:center;justify-content:center;z-index:99999';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;padding:36px 32px;width:320px;text-align:center">'
      + '<div style="font-size:22px;font-weight:800;color:#000000;margin-bottom:4px">&#11041; DEEJAY ACADEMY</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:24px">Sistema de gestion</div>'
      + '<input id="_lemail" type="email" placeholder="Correo electronico" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;margin-bottom:10px">'
      + '<input id="_lpwd" type="password" placeholder="Contrasena" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;margin-bottom:12px">'
      + '<div id="_lerr" style="color:#b91c1c;font-size:12px;min-height:18px;margin-bottom:8px"></div>'
      + '<button onclick="doLogin()" style="width:100%;padding:11px;background:#c0392b;color:#000000;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Entrar</button>'
      + '</div>';
    document.body.appendChild(ov);
    document.getElementById('_lpwd').addEventListener('keydown', function(e){ if(e.key==='Enter') window.doLogin(); });
  }
  if (error) document.getElementById('_lerr').textContent = error;
  document.getElementById('_lemail').focus();
}

window.doLogin = async function() {
  var email = document.getElementById('_lemail').value.trim();
  var pwd = document.getElementById('_lpwd').value;
  if (!email || !pwd) { document.getElementById('_lerr').textContent = 'Ingresa email y contrasena.'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, pwd);
  } catch(e) {
    document.getElementById('_lerr').textContent = 'Email o contrasena incorrectos.';
    document.getElementById('_lpwd').value = '';
  }
};

window.doLogout = async function() { await signOut(auth); };

async function obtenerRol(email) {
  try { var s = await getDoc(doc(db, 'roles', email)); return s.exists() ? s.data().rol : 'asistente'; }
  catch(e) { return 'asistente'; }
}

function aplicarRol(rol) {
  rolActual = rol;
  // Ocultar menús solo-admin: reporte, exportar (pagos/ingresos visible para todos)
  ['reporte','exportar'].forEach(function(id) {
    var el = document.querySelector('.ni[onclick*=\"\''+id+'\'\"]');
    if (el) el.style.display = rol === 'admin' ? '' : 'none';
  });
  // Ocultar stats financieros en dashboard para asistente
  var sMes = document.getElementById('s-mes');
  var sPen = document.getElementById('s-pen');
  if (sMes) sMes.closest('.sc').style.display = rol === 'admin' ? '' : 'none';
  if (sPen) sPen.closest('.sc').style.display = rol === 'admin' ? '' : 'none';
  // Ocultar total de ingresos (Valor y Neto) para asistente
  var pagTot=document.getElementById('pag-total');
  if(pagTot) pagTot.style.display=rol==='admin'?'':'none';
  var pagTotNeto=document.getElementById('pag-total-neto');
  if(pagTotNeto) pagTotNeto.style.display=rol==='admin'?'':'none';
  // Total Comisión visible para ambos perfiles (no se oculta)
  // Cambiar gráfico dashboard según rol
  var chartTitle = document.getElementById('chart-title');
  if (chartTitle) chartTitle.textContent = rol === 'admin' ? 'Ingresos 6 meses' : 'Egresos 6 meses';
  // Forzar render del gráfico correcto
  var now=new Date(),mo=now.getMonth(),y=now.getFullYear();
  var meses=[];for(var ii=5;ii>=0;ii--){var dd=new Date(y,mo-ii,1);meses.push({lbl:dd.toLocaleString('es-CO',{month:'short'}),m:dd.getMonth(),y:dd.getFullYear()})}
  var tots2;
  if(rol==='admin'){
    tots2=meses.map(function(x){return DB.pagos.filter(function(p){if(!p.fecha||p.estado!=='Pagado')return false;var d=new Date(p.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,p){return s+p.monto},0)});
  } else {
    tots2=meses.map(function(x){return DB.egresos.filter(function(e){if(!e.fecha)return false;var d=new Date(e.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,e){return s+(parseFloat(e.valor)||0)},0)});
  }
  var mx2=Math.max.apply(null,tots2.concat([1]));
  var chartEl2=document.getElementById('chart');
  if(chartEl2) chartEl2.innerHTML=tots2.every(function(t){return t===0})?'<div style="color:#aaa;font-size:13px;text-align:center;padding:20px">Sin registros</div>':'<div class="cbw">'+meses.map(function(x,i){return'<div class="cbc"><div class="cbv">'+(tots2[i]?'$'+Math.round(tots2[i]/1000)+'k':'')+'</div><div class="cb" style="height:'+Math.max(4,Math.round(tots2[i]/mx2*90))+'px"></div><div class="cbl">'+x.lbl+'</div></div>'}).join('')+'</div>';
  // Botón logout
  if (!document.getElementById('_logout_btn')) {
    var btn = document.createElement('button');
    btn.id = '_logout_btn'; btn.className = 'btn bo bsm';
    btn.textContent = 'Cerrar sesion'; btn.onclick = window.doLogout;
    document.getElementById('topbar-acts').appendChild(btn);
  }
}

// ── POBLAR SELECTS ────────────────────────────────────────
function poblarSelects(){
  var fCur=document.getElementById('f-cur');
  if(fCur){var pv=fCur.value;fCur.innerHTML='<option value="">Todos los cursos</option>';DB.cursos.forEach(function(c){fCur.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});fCur.value=pv;}
  var qAl=document.getElementById('q-asist-al');
  if(qAl){var pv2=qAl.value;qAl.innerHTML='<option value="">Todos</option>';DB.alumnos.forEach(function(a){qAl.innerHTML+='<option value="'+a.id+'">'+a.nombre+'</option>'});qAl.value=pv2;}
  var rAl=document.getElementById('r-al');
  if(rAl){var pv3=rAl.value;rAl.innerHTML='<option value="">Todos los alumnos</option>';DB.alumnos.forEach(function(a){rAl.innerHTML+='<option value="'+a.id+'">'+a.nombre+'</option>'});rAl.value=pv3;}
  var rCur=document.getElementById('r-cur');
  if(rCur){var pv4=rCur.value;rCur.innerHTML='<option value="">Todos los cursos</option>';DB.cursos.forEach(function(c){rCur.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});rCur.value=pv4;}
  // Select categorías egreso en formulario
  poblarCatEgreso('me-cat');
  poblarCatEgreso('fe-cat');
  poblarSelectsPag();
}

function poblarCatEgreso(sid){
  var s=document.getElementById(sid);if(!s)return;
  var pv=s.value;
  s.innerHTML='<option value="">Seleccionar categoría...</option>';
  DB.cat_egreso.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).forEach(function(c){
    s.innerHTML+='<option value="'+c.nombre+'">'+c.nombre+'</option>';
  });
  if(pv)s.value=pv;
}

// ── INIT APP ──────────────────────────────────────────────
function initApp() {
  listenCol("cursos", "cursos", function() {
    if (DB.cursos.length === 0) {
      fbSet("cursos","djpro",{nombre:"Mezclas DJ Pro",niveles:["Essential","Pro","DJ Master Pro"],desc:"Modulo de mezcla DJ profesional",inicio:"",fin:""});
      fbSet("cursos","prod", {nombre:"Produccion Musical",niveles:["Nivel 1","Nivel 2","Nivel 3","Nivel 4"],desc:"Produccion con Ableton Live",inicio:"",fin:""});
    }
    poblarSelects(); renderDash();
  });
  listenCol("alumnos",        "alumnos",        function(){ poblarSelects(); renderDash(); if(document.getElementById('page-alumnos').classList.contains('active')) renderAlumnos(); });
  listenCol("pagos",          "pagos",          function(){ poblarSelectsPag(); renderDash(); renderChartPorRol(rolActual||'admin'); if(document.getElementById('page-pagos').classList.contains('active')) renderPagos(); if(eAid) renderHistP(eAid); });
  listenCol("cuotas",         "cuotas",         function(){ renderDash(); updBadge(); if(eAid) renderCuotas(); });
  listenCol("asistencias",    "asistencias",    function(){ if(document.getElementById('page-asistencia').classList.contains('active')) renderAsistencia(); });
  listenCol("horario_grupos", "horario_grupos", function(){ if(document.getElementById('page-horarios_aulas').classList.contains('active')) window.renderHorariosPage(); });
  listenCol("egresos",        "egresos",        function(){ if(document.getElementById('page-egresos').classList.contains('active')) renderEgresos(); renderDash(); renderChartPorRol(rolActual||'admin'); });
  listenCol("cat_egreso",     "cat_egreso",     function(){ poblarSelects(); if(document.getElementById('page-egresos').classList.contains('active')) renderEgresos(); });
  listenCol("colaboradores",  "colaboradores", function(){ if(document.getElementById('page-colaboradores').classList.contains('active')) renderColaboradores(); });
  listenCol("calendario_plan","calendario_plan",function(){ if(document.getElementById('page-calendario').classList.contains('active')) renderCalPlan(); });
  listenCol("calendario_plan_fs","calendario_plan_fs",function(){ if(document.getElementById('page-calendario').classList.contains('active')) renderCalPlanFS(); });
  listenCol("caja_movimientos","caja_movimientos",function(){ if(document.getElementById('page-caja').classList.contains('active')) renderCaja(); });
  listenCol("cat_pag_cur",    "cat_pag_cur",    function(){ poblarSelectsPag(); if(document.getElementById('page-pagos').classList.contains('active')) renderPagos(); });
  listenCol("cat_pag_for",    "cat_pag_for",    function(){ poblarSelectsPag(); if(document.getElementById('page-pagos').classList.contains('active')) renderPagos(); });
  listenCol("cat_pag_est",    "cat_pag_est",    function(){ poblarSelectsPag(); if(document.getElementById('page-pagos').classList.contains('active')) renderPagos(); });
  listenCol("cat_pag_form",   "cat_pag_form",   function(){ poblarSelectsPag(); if(document.getElementById('page-pagos').classList.contains('active')) renderPagos(); });
  listenCol('embudo_etapas', 'embudo_etapas', function(){ initEtapasDefault(); if(document.getElementById('page-embudo').classList.contains('active')) renderEmbudo(); });
  listenCol('prospectos',    'prospectos',    function(){ if(document.getElementById('page-embudo').classList.contains('active')) renderEmbudo(); });
  listenCol('leads',         'leads',         function(){ if(document.getElementById('page-leads').classList.contains('active')) renderLeads(); });
  listenCol('plantillas',    'plantillas',    function(){ poblarSelectPlantillasInbox(); if(document.getElementById('page-plantillas').classList.contains('active')) renderPlantillas(); });
  listenCol('whatsapp_mensajes','whatsapp_mensajes', function(){
    renderInboxBadge();
    DB.whatsapp_mensajes.filter(function(m){ return m.direccion==='entrante'; }).forEach(function(m){
      autoCrearProspectoSiNuevo(m);
      if(m.telefono && estaArchivada(m.telefono)) window.reabrirConversacion(m.telefono);
    });
    if(document.getElementById('page-inbox').classList.contains('active')) renderInbox();
  });
  listenCol('inbox_archivados','inbox_archivados', function(){
    if(document.getElementById('page-inbox').classList.contains('active')) renderInbox();
  });
}

window.addEventListener("DOMContentLoaded", function() {
  onAuthStateChanged(auth, async function(user) {
    if (user) {
      var ov = document.getElementById('_login'); if (ov) ov.remove();
      var rol = await obtenerRol(user.email);
      aplicarRol(rol);
      // Mostrar usuario logueado
      var userLabel = document.getElementById('_user_label');
      if (!userLabel) {
        userLabel = document.createElement('span');
        userLabel.id = '_user_label';
        userLabel.style.cssText = 'font-size:12px;color:#888;padding:6px 10px;border-radius:8px;background:#f0f0f0;font-weight:500';
        document.getElementById('topbar-acts').appendChild(userLabel);
      }
      var shortEmail = user.email.replace(/@gmail\.com$/,'').replace(/@.*$/,'');
      userLabel.textContent = '👤 ' + shortEmail;
      initApp();
    } else {
      var btn = document.getElementById('_logout_btn'); if (btn) btn.remove();
      mostrarLogin();
    }
  });
});

// ── GLOBALS ───────────────────────────────────────────────
var eAid=null, ePid=null, eCid=null, eEid=null, foto=null;
var hMes=new Date().getMonth(), hCursoTab=null;
window.hMes=hMes; window.hCursoTab=hCursoTab;
var FRANJAS_H=["9-11 AM","11-1 PM","2-4 PM","4-6 PM","6-8 PM"];
var MESES_N=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
var HCOLORS=["#3b3210","#0f2d1a","#2d0f1f","#0a1f2d","#1a0f30","#2d1a08"];
var _selAlId=null, _selPagId=null, _selEgId=null;
var _pagSort={col:'fecha',dir:-1};
var _egSort={col:'fecha',dir:-1};
var _alSort={col:'nombre',dir:1};
var _astSort={col:'fecha',dir:-1};
var _colSort={col:'nombre',dir:1};

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function openM(id){document.getElementById(id).classList.add('show')}
function closeM(id){document.getElementById(id).classList.remove('show')}
window.closeM=closeM;

function gCN(mid,niv){var c=DB.cursos.find(function(x){return x.id===mid});if(!c)return'-';return niv?c.nombre+' - '+niv:c.nombre}
function alumnoEnCurso(a,cursoId){
  if(!a)return false;
  if(a.moduloId===cursoId)return true;
  var suCurso=DB.cursos.find(function(c){return c.id===a.moduloId});
  return !!(suCurso&&(suCurso.incluye||[]).indexOf(cursoId)>-1);
}
function gA(id){return DB.alumnos.find(function(x){return x.id===id})}
function gAN(id){if(!id)return'-';if(id.indexOf('txt:')===0)return id.slice(4);var a=gA(id);return a?a.nombre:'-'}
function gAC(id){if(!id||id.indexOf('txt:')===0)return'-';var a=gA(id);return a?gCN(a.moduloId,a.nivel):'-'}
function gAI(id){if(!id||id.indexOf('txt:')===0)return'-';var a=gA(id);return a?(a.ingreso||'-'):'-'}
function bdg(e){var m={Pagado:'bg',Pendiente:'by',Vencido:'br',Presente:'bg',Ausente:'br',Tardanza:'by'};return'<span class="bdg '+(m[e]||'bgr')+'">'+e+'</span>'}
function dR(f){if(!f)return null;return Math.ceil((new Date(f)-new Date())/864e5)}
function avEl(a,sz){sz=sz||30;if(a.foto)return'<img src="'+a.foto+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover">';var i=(a.nombre||'?').split(' ').slice(0,2).map(function(w){return w[0]}).join('').toUpperCase();return'<div class="avp" style="width:'+sz+'px;height:'+sz+'px;font-size:'+Math.floor(sz*.38)+'px">'+i+'</div>'}
function fmtF(d){if(!d)return'';var p=d.split('-');return p[2]+'/'+p[1]}
function updBadge(){var n=DB.cuotas.length;var b=document.getElementById('badge-al');if(b){if(n>0){b.textContent=n;b.style.display='inline'}else b.style.display='none'}}

function confirmDel(msg,cb){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999';
  ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;max-width:320px;width:90%;text-align:center">'
    +'<div style="font-size:14px;font-weight:500;margin-bottom:20px">'+msg+'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center">'
    +'<button id="_cdn" style="padding:8px 20px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:13px">Cancelar</button>'
    +'<button id="_cds" style="padding:8px 20px;border-radius:8px;border:none;background:#c0392b;color:#000000;cursor:pointer;font-size:13px;font-weight:600">Confirmar</button>'
    +'</div></div>';
  document.body.appendChild(ov);
  document.getElementById('_cdn').onclick=function(){ov.remove()};
  document.getElementById('_cds').onclick=function(){ov.remove();cb()};
}

function popCur(sid){var s=document.getElementById(sid);if(!s)return;var v=s.value;s.innerHTML='<option value="">Seleccionar...</option>';DB.cursos.forEach(function(c){s.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});s.value=v}
function popAl(sid){var s=document.getElementById(sid);if(!s)return;var v=s.value;s.innerHTML='<option value="">Seleccionar alumno...</option>';DB.alumnos.forEach(function(a){s.innerHTML+='<option value="'+a.id+'">'+a.nombre+'</option>'});s.value=v}

function popDatalistAlumnos(listId){
  var dl=document.getElementById(listId);if(!dl)return;
  dl.innerHTML=DB.alumnos.map(function(a){return'<option value="'+a.nombre.replace(/"/g,'&quot;')+'">'}).join('');
}
function popDatalistCursos(listId){
  var dl=document.getElementById(listId);if(!dl)return;
  dl.innerHTML=DB.cursos.map(function(c){return'<option value="'+c.nombre.replace(/"/g,'&quot;')+'">'}).join('');
}
// Convierte el texto escrito en el input de nombre a un alumnoId real si coincide, o "txt:Nombre" si es libre
function resolverAlumnoId(nombreTexto){
  var nombre=(nombreTexto||'').trim();
  if(!nombre)return'';
  var match=DB.alumnos.find(function(a){return a.nombre.toLowerCase()===nombre.toLowerCase()});
  return match?match.id:'txt:'+nombre;
}
function nombreDesdeAlumnoId(id){
  if(!id)return'';
  if(id.indexOf('txt:')===0)return id.slice(4);
  var a=gA(id);return a?a.nombre:'';
}

window.updNiv=function(sel){
  var c=DB.cursos.find(function(x){return x.id===document.getElementById('f-mod').value});
  var s=document.getElementById('f-niv');
  s.innerHTML='<option value="">Seleccionar...</option>';
  if(c)(c.niveles||[]).forEach(function(n){s.innerHTML+='<option value="'+n+'">'+n+'</option>'});
  if(sel)s.value=sel;
}

window.prevFoto=function(ev){
  var f=ev.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas'),w=img.width,h=img.height,mx=150;
      if(w>h){if(w>mx){h=h*mx/w;w=mx}}else{if(h>mx){w=w*mx/h;h=mx}}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      foto=c.toDataURL('image/jpeg',.7);
      var pi=document.getElementById('ph-img');pi.src=foto;pi.style.display='block';
      document.getElementById('ph-icon').style.display='none';
    };img.src=e.target.result;
  };r.readAsDataURL(f);
}

// ── NAVEGACIÓN ────────────────────────────────────────────
window.showPage=function(id,el){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active')});
  document.getElementById('page-'+id).classList.add('active');
  if(el)el.classList.add('active');
  var T={dashboard:'Dashboard',alertas:'Alertas',alumnos:'Alumnos',cursos:'Cursos',colaboradores:'Colaboradores',asistencia:'Asistencia',pagos:'Pagos',egresos:'Egresos',caja:'Efectivo / Caja',reporte:'Reportes',horarios_aulas:'Horarios por Cursos',calendario:'Calendario Académico',exportar:'Exportar Base',embudo:'Embudo de ventas',inbox:'Inbox WhatsApp',leads:'Contactos',plantillas:'Plantillas'};
  document.getElementById('page-title').textContent=T[id]||id;
  var ac=document.getElementById('topbar-acts');
  var logoutBtn=document.getElementById('_logout_btn');
  var userLbl=document.getElementById('_user_label');
  ac.innerHTML='';
  if(id==='alumnos')ac.innerHTML='<button class="btn bp bsm" onclick="openMAl()">+ Nuevo alumno</button>';
  if(id==='pagos')ac.innerHTML='<button class="btn bp bsm" onclick="openMPag()">+ Registrar pago</button>';
  if(id==='cursos')ac.innerHTML='<button class="btn bp bsm" onclick="openMCur()">+ Nuevo curso</button>';
  if(id==='egresos')ac.innerHTML='<button class="btn bp bsm" onclick="openMEg()">+ Nuevo egreso</button>';
  if(id==='colaboradores')ac.innerHTML='<button class="btn bp bsm" onclick="openMCol()">+ Nuevo colaborador</button>';
  if(id==='leads')ac.innerHTML='<button class="btn bp bsm" onclick="nuevoLead()">+ Nuevo contacto</button>';
  if(id==='plantillas')ac.innerHTML='<button class="btn bp bsm" onclick="nuevaPlantilla()">+ Nueva plantilla</button>';
  if(logoutBtn){ac.appendChild(logoutBtn)}
  else if(rolActual){
    var btn=document.createElement('button');btn.id='_logout_btn';btn.className='btn bo bsm';
    btn.textContent='Cerrar sesion';btn.onclick=window.doLogout;ac.appendChild(btn);
  }
  // Re-append user label
  if(userLbl){ac.appendChild(userLbl)}
  var fns={dashboard:renderDash,alertas:renderAlertas,alumnos:renderAlumnos,cursos:renderCursos,colaboradores:renderColaboradores,pagos:renderPagos,egresos:renderEgresos,caja:renderCaja,reporte:renderReporte,asistencia:renderAsistencia,horarios_aulas:window.initHorariosPage,calendario:function(){renderCalPlan();renderCalPlanFS();},exportar:function(){},embudo:renderEmbudo,inbox:function(){renderInbox();poblarSelectPlantillasInbox();},leads:renderLeads,plantillas:renderPlantillas};
  if(fns[id])fns[id]();
}

// ── DASHBOARD ─────────────────────────────────────────────
function renderDash(){
  var now=new Date(),m=now.getMonth(),y=now.getFullYear();
  var totM=DB.pagos.filter(function(p){if(!p.fecha)return false;var d=new Date(p.fecha);return d.getMonth()===m&&d.getFullYear()===y}).reduce(function(s,p){return s+(parseFloat(p.monto)||0)},0);
  document.getElementById('s-act').textContent=DB.alumnos.length;
  document.getElementById('s-mes').textContent='$'+totM.toLocaleString('es-CO');
  document.getElementById('s-pen').textContent=DB.cuotas.length;
  document.getElementById('s-cur').textContent=DB.cursos.length;
  var als=calcAlerts();
  document.getElementById('dash-al').innerHTML=!als.length?'<div style="color:#15803d;font-size:13px;text-align:center;padding:20px">Todos al dia!</div>':als.map(function(a){return'<div class="ai" style="background:#fee2e2;border-radius:6px;margin:4px 8px;padding:8px 10px"><span>!</span><span style="font-size:12px;color:#b91c1c;font-weight:600">'+a.t+'</span></div>'}).join('');
  document.getElementById('dash-rec').innerHTML=DB.alumnos.slice(0,4).map(function(a){return'<tr><td><div style="display:flex;align-items:center;gap:8px">'+avEl(a)+'<span>'+a.nombre+'</span></div></td><td>'+gCN(a.moduloId,a.nivel)+'</td><td>'+(a.ingreso||'-')+'</td><td>'+(a.fin||'-')+'</td></tr>'}).join('')||'<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Sin alumnos</td></tr>';
  updBadge();
  if(rolActual) aplicarRol(rolActual);
}

function renderChartPorRol(rol){
  var now=new Date(),m=now.getMonth(),y=now.getFullYear();
  var meses=[];for(var i=5;i>=0;i--){var d=new Date(y,m-i,1);meses.push({lbl:d.toLocaleString('es-CO',{month:'short'}),m:d.getMonth(),y:d.getFullYear()})}
  var tots;
  if(rol==='admin'){
    tots=meses.map(function(x){return DB.pagos.filter(function(p){if(!p.fecha||p.estado!=='Pagado')return false;var d=new Date(p.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,p){return s+p.monto},0)});
  } else {
    tots=meses.map(function(x){return DB.egresos.filter(function(e){if(!e.fecha)return false;var d=new Date(e.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,e){return s+(parseFloat(e.valor)||0)},0)});
  }
  var mx=Math.max.apply(null,tots.concat([1]));
  var chartEl=document.getElementById('chart');
  if(!chartEl)return;
  chartEl.innerHTML=tots.every(function(t){return t===0})
    ?'<div style="color:#aaa;font-size:13px;text-align:center;padding:20px">Sin registros</div>'
    :'<div class="cbw">'+meses.map(function(x,i){return'<div class="cbc"><div class="cbv">'+(tots[i]?'$'+Math.round(tots[i]/1000)+'k':'')+'</div><div class="cb" style="height:'+Math.max(4,Math.round(tots[i]/mx*90))+'px"></div><div class="cbl">'+x.lbl+'</div></div>'}).join('')+'</div>';
}

function calcAlerts(){
  var al=[];
  DB.cuotas.forEach(function(c){
    var a=gA(c.alumnoId);
    if(a){
      var dias=c.vencimiento?dR(c.vencimiento):null;
      var extra=dias!==null?(dias<=0?' - VENCIDA':dias<=7?' - vence en '+dias+' dias':''):'';
      al.push({t:a.nombre+' - $'+parseFloat(c.monto||0).toLocaleString('es-CO')+' ('+(c.descripcion||'Cuota')+')'+extra});
    }
  });
  return al;
}

function renderAlertas(){
  var als=calcAlerts();
  var el=document.getElementById('alertas-lista');
  if(!als.length){el.innerHTML='<div style="color:#15803d;font-size:14px;text-align:center;padding:30px">Todos al dia!</div>';return}
  el.innerHTML='<div style="padding:12px 14px;font-weight:600;font-size:13px;border-bottom:1px solid #f0f0f0">'+als.length+' alerta(s) pendientes</div>'+als.map(function(a){return'<div class="ai"><span style="color:#b91c1c;font-weight:500">'+a.t+'</span></div>'}).join('');
  updBadge();
}

// ── ALUMNOS ───────────────────────────────────────────────
window.openMAl=function(id){
  id=id||null;eAid=id;foto=null;
  document.getElementById('ph-img').style.display='none';document.getElementById('ph-icon').style.display='';
  document.getElementById('m-al-tit').textContent=id?'Editar alumno':'Nuevo alumno';
  popCur('f-mod');
  ['f-nom','f-ced','f-tel','f-ema','f-edad','f-ing','f-ini','f-fin','f-dir','f-ref','f-not'].forEach(function(k){var e=document.getElementById(k);if(e)e.value=''});
  document.getElementById('f-rh').value='';document.getElementById('f-niv').innerHTML='<option value="">Seleccionar...</option>';
  ['p2-per','p2-mon','p2-not'].forEach(function(k){document.getElementById(k).value=''});
  document.getElementById('p2-for').value='Efectivo';document.getElementById('p2-fec').value=new Date().toISOString().split('T')[0];
  document.getElementById('p2-hist').innerHTML='';document.getElementById('cuotas-lista').innerHTML='<div style="color:#aaa;font-size:12px;padding:6px">Sin cuotas pendientes.</div>';
  var now=new Date(),nm=now.toLocaleString('es-CO',{month:'long'});
  document.getElementById('p2-per').value=nm.charAt(0).toUpperCase()+nm.slice(1)+' '+now.getFullYear();
  if(id){
    var a=DB.alumnos.find(function(x){return x.id===id});
    if(a){
      var map={nom:'nombre',ced:'cedula',tel:'telefono',ema:'email',edad:'edad',rh:'rh',ing:'ingreso',ini:'inicio',fin:'fin',dir:'direccion',ref:'referencia',not:'notas'};
      Object.keys(map).forEach(function(k){var e=document.getElementById('f-'+k);if(e&&a[map[k]]!=null)e.value=a[map[k]]});
      document.getElementById('f-mod').value=a.moduloId||'';window.updNiv(a.nivel);
      if(a.foto){foto=a.foto;var img=document.getElementById('ph-img');img.src=foto;img.style.display='block';document.getElementById('ph-icon').style.display='none'}
      renderHistP(id);renderCuotas();
    }
  } else document.getElementById('f-ing').value=new Date().toISOString().split('T')[0];
  openM('m-alumno');
}

window.saveAlumno=async function(){
  var nom=document.getElementById('f-nom').value.trim(),tel=document.getElementById('f-tel').value.trim(),ced=document.getElementById('f-ced').value.trim();
  if(!nom||!tel||!ced){alert('Nombre, Cedula y Telefono son obligatorios.');return}
  var data={nombre:nom,cedula:ced,telefono:tel,email:document.getElementById('f-ema').value.trim(),edad:document.getElementById('f-edad').value,rh:document.getElementById('f-rh').value,ingreso:document.getElementById('f-ing').value,inicio:document.getElementById('f-ini').value,fin:document.getElementById('f-fin').value,moduloId:document.getElementById('f-mod').value,nivel:document.getElementById('f-niv').value,direccion:document.getElementById('f-dir').value.trim(),referencia:document.getElementById('f-ref').value.trim(),notas:document.getElementById('f-not').value.trim(),foto:foto||null};
  if(eAid){ await fbUpd('alumnos',eAid,data); }
  else { data.creado=new Date().toISOString().split('T')[0]; eAid=await fbAdd('alumnos',data); }
  var mon=parseFloat(document.getElementById('p2-mon').value);
  if(mon&&eAid){ await fbAdd('pagos',{alumnoId:eAid,periodo:document.getElementById('p2-per').value.trim(),forma:document.getElementById('p2-for').value,monto:mon,estado:'Pagado',fecha:document.getElementById('p2-fec').value,notas:document.getElementById('p2-not').value.trim(),creado:new Date().toISOString().split('T')[0]}); }
  closeM('m-alumno');
}

window.sortAlumnos=function(col){
  if(_alSort.col===col){_alSort.dir*=-1;}else{_alSort.col=col;_alSort.dir=1;}
  ['nombre','telefono','moduloId','ingreso','inicio','fin'].forEach(function(c){
    var el=document.getElementById('sah-'+c);
    if(el) el.textContent=c===_alSort.col?(_alSort.dir===1?'↑':'↓'):'↕';
  });
  renderAlumnos();
}

window.renderAlumnos=function renderAlumnos(){
  var q=(document.getElementById('q-al').value||'').toLowerCase(),fc=document.getElementById('f-cur').value;
  var list=DB.alumnos.filter(function(a){if(q&&!a.nombre.toLowerCase().includes(q)&&!(a.cedula||'').includes(q))return false;if(fc&&a.moduloId!==fc)return false;return true});
  list.sort(function(a,b){
    var va=(a[_alSort.col]||''), vb=(b[_alSort.col]||'');
    if(_alSort.col==='moduloId'){va=gCN(a.moduloId,a.nivel);vb=gCN(b.moduloId,b.nivel);}
    return va<vb?-_alSort.dir:va>vb?_alSort.dir:0;
  });
  var tb=document.getElementById('t-al');
  if(!list.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#aaa;padding:24px">Sin registros</td></tr>';return}
  tb.innerHTML=list.map(function(a){return'<tr style="cursor:pointer" onclick="selAlumno(\''+a.id+'\',\''+a.nombre.replace(/'/g,'')+'\')">'+'<td>'+avEl(a)+'</td>'+'<td><div style="font-weight:500">'+a.nombre+'</div><div style="font-size:11px;color:#888">CC: '+(a.cedula||'-')+'</div></td>'+'<td>'+(a.telefono||'-')+'</td>'+'<td>'+gCN(a.moduloId,a.nivel)+'</td>'+'<td style="font-size:12px">'+(a.ingreso||'-')+'</td>'+'<td style="font-size:12px">'+(a.inicio||'-')+'</td>'+'<td style="font-size:12px">'+(a.fin?'<span class="bdg '+(dR(a.fin)<=14?'br':'bgr')+'">'+a.fin+'</span>':'-')+'</td>'+'<td><span style="font-size:11px;color:#aaa">Acciones</span></td></tr>'}).join('');
}

window.selAlumno=function(aid,nom){_selAlId=aid;document.getElementById('al-panel-info').textContent=nom;document.getElementById('al-panel').style.display='block'}
window.closeAlPanel=function(){_selAlId=null;document.getElementById('al-panel').style.display='none'}
window.doAlVer=function(){var id=_selAlId;closeAlPanel();if(id)verAl(id)}
window.doAlEdit=function(){var id=_selAlId;closeAlPanel();if(id)openMAl(id)}
window.doAlDel=function(){
  if(!_selAlId)return;var aid=_selAlId;closeAlPanel();
  confirmDel('Eliminar este alumno y todos sus datos?',async function(){
    await fbDel('alumnos',aid);
    for(var p of DB.pagos.filter(function(x){return x.alumnoId===aid})) await fbDel('pagos',p.id);
    for(var c of DB.cuotas.filter(function(x){return x.alumnoId===aid})) await fbDel('cuotas',c.id);
  });
}

function verAl(id){
  var a=DB.alumnos.find(function(x){return x.id===id});if(!a)return;
  var pagos=DB.pagos.filter(function(p){return p.alumnoId===id}),cuotas=DB.cuotas.filter(function(c){return c.alumnoId===id});
  var tot=pagos.reduce(function(s,p){return s+p.monto},0),pen=cuotas.reduce(function(s,c){return s+(parseFloat(c.monto)||0)},0);
  var avatarHtml=a.foto
    ?'<img src="'+a.foto+'" onclick="window.zoomFoto(\''+a.foto+'\')" style="width:64px;height:64px;border-radius:50%;object-fit:cover;cursor:zoom-in;transition:transform .2s;box-shadow:0 2px 8px rgba(0,0,0,.15)" onmouseover="this.style.transform=\'scale(1.12)\'" onmouseout="this.style.transform=\'scale(1)\'">'
    :avEl(a,64);
  document.getElementById('m-ver-body').innerHTML='<div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">'+avatarHtml+'<div><div style="font-size:17px;font-weight:600">'+a.nombre+'</div><div style="font-size:13px;color:#888">'+gCN(a.moduloId,a.nivel)+'</div></div></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:16px"><div><span style="color:#888">Cedula:</span> '+(a.cedula||'-')+'</div><div><span style="color:#888">Tel:</span> '+(a.telefono||'-')+'</div><div><span style="color:#888">Edad:</span> '+(a.edad?a.edad+' anos':'-')+'</div><div><span style="color:#888">RH:</span> '+(a.rh||'-')+'</div><div><span style="color:#888">Ingreso:</span> '+(a.ingreso||'-')+'</div><div><span style="color:#888">Email:</span> '+(a.email||'-')+'</div><div><span style="color:#888">Inicio:</span> '+(a.inicio||'-')+'</div><div><span style="color:#888">Fin:</span> '+(a.fin||'-')+'</div><div style="grid-column:1/-1"><span style="color:#888">Ref:</span> '+(a.referencia||'-')+'</div><div style="grid-column:1/-1"><span style="color:#888">Direccion:</span> '+(a.direccion||'-')+'</div>'+(a.notas?'<div style="grid-column:1/-1"><span style="color:#888">Notas:</span> '+a.notas+'</div>':'')+'</div>'
  +'<div style="display:flex;gap:10px;margin-bottom:10px"><div style="flex:1;background:#f0fdf4;border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#15803d;font-weight:600">PAGADO</div><div style="font-size:16px;font-weight:700;color:#15803d">$'+tot.toLocaleString('es-CO')+'</div></div><div style="flex:1;background:#fee2e2;border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#b91c1c;font-weight:600">PENDIENTE</div><div style="font-size:16px;font-weight:700;color:#b91c1c">$'+pen.toLocaleString('es-CO')+'</div></div></div>'
  +(pagos.length?'<div style="max-height:140px;overflow-y:auto;border:.5px solid #f0f0f0;border-radius:8px">'+pagos.map(function(p){return'<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:.5px solid #f5f5f5;font-size:12px"><div style="flex:1">'+(p.periodo||'-')+'</div><div style="font-weight:600">$'+(p.monto||0).toLocaleString('es-CO')+'</div>'+bdg(p.estado)+'<div style="color:#aaa">'+(p.fecha||'-')+'</div></div>'}).join('')+'</div>':'');
  openM('m-ver');
}

window.zoomFoto=function(src){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:99999;cursor:zoom-out;animation:fadeIn .2s ease';
  ov.innerHTML='<img src="'+src+'" style="max-width:88vw;max-height:88vh;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.6);object-fit:contain;animation:scaleIn .2s ease">';
  ov.onclick=function(){ov.style.opacity='0';ov.style.transition='opacity .15s';setTimeout(function(){ov.remove()},150)};
  if(!document.getElementById('_zoom_styles')){
    var st=document.createElement('style');st.id='_zoom_styles';
    st.textContent='@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(st);
  }
  document.body.appendChild(ov);
}

window.regPagAl=async function(){
  if(!eAid){alert('Guarda el alumno primero.');return}
  var mon=parseFloat(document.getElementById('p2-mon').value);if(!mon){alert('Ingresa el monto.');return}
  await fbAdd('pagos',{alumnoId:eAid,periodo:document.getElementById('p2-per').value.trim(),forma:document.getElementById('p2-for').value,monto:mon,estado:'Pagado',fecha:document.getElementById('p2-fec').value,notas:document.getElementById('p2-not').value.trim(),creado:new Date().toISOString().split('T')[0]});
  document.getElementById('p2-mon').value='';renderHistP(eAid);
}

function renderHistP(aid){
  var el=document.getElementById('p2-hist');if(!el)return;
  var pagos=DB.pagos.filter(function(p){return p.alumnoId===aid}),tot=pagos.reduce(function(s,p){return s+p.monto},0);
  var cuotas=DB.cuotas.filter(function(c){return c.alumnoId===aid}),pen=cuotas.reduce(function(s,c){return s+(parseFloat(c.monto)||0)},0);
  if(!pagos.length&&!cuotas.length){el.innerHTML='';return}
  el.innerHTML='<div style="display:flex;gap:10px;margin-bottom:10px"><div style="flex:1;background:#f0fdf4;border-radius:8px;padding:7px;text-align:center"><div style="font-size:10px;color:#15803d;font-weight:600">PAGADO</div><div style="font-size:14px;font-weight:700;color:#15803d">$'+tot.toLocaleString('es-CO')+'</div></div><div style="flex:1;background:#fee2e2;border-radius:8px;padding:7px;text-align:center"><div style="font-size:10px;color:#b91c1c;font-weight:600">PENDIENTE</div><div style="font-size:14px;font-weight:700;color:#b91c1c">$'+pen.toLocaleString('es-CO')+'</div></div></div>'
  +'<div style="max-height:180px;overflow-y:auto;border:.5px solid #f0f0f0;border-radius:8px">'+pagos.map(function(p){return'<div style="display:flex;align-items:center;gap:6px;padding:7px 10px;border-bottom:.5px solid #f5f5f5;font-size:12px"><div style="flex:1;font-weight:500">'+(p.periodo||'-')+'</div><div style="font-weight:600">$'+(p.monto||0).toLocaleString('es-CO')+'</div>'+bdg(p.estado)+'<button class="btn bd bsm" style="padding:3px 7px" onclick="delPagoHist(\''+p.id+'\')">X</button></div>'}).join('')+'</div>';
}

window.delPagoHist=function(id){confirmDel('Eliminar este abono?',async function(){await fbDel('pagos',id);if(eAid)renderHistP(eAid);})}
window.delPagoM=function(){if(!ePid)return;var pid=ePid;confirmDel('Eliminar este pago?',async function(){await fbDel('pagos',pid);closeM('m-pago');})}

var _nuevaCuota=null;
window.addCuota=function(){
  if(!eAid){alert('Guarda el alumno primero.');return}
  _nuevaCuota={descripcion:'',monto:'',vencimiento:'',forma:'Efectivo'};
  renderCuotas();
}

window.generarCuota=async function(){
  var desc=document.getElementById('_nc_desc').value.trim();
  var mon=parseFloat(document.getElementById('_nc_mon').value);
  var fec=document.getElementById('_nc_fec').value;
  var forma=document.getElementById('_nc_for').value;
  if(!desc){alert('Ingresa el concepto.');return}
  if(!mon){alert('Ingresa el monto.');return}
  if(!fec){alert('Ingresa la fecha de vencimiento.');return}
  await fbAdd('cuotas',{alumnoId:eAid,descripcion:desc,monto:mon,vencimiento:fec,forma:forma,creado:new Date().toISOString().split('T')[0]});
  _nuevaCuota=null; renderCuotas(); renderHistP(eAid);
}

function renderCuotas(){
  var el=document.getElementById('cuotas-lista');if(!el)return;
  var cuotas=eAid?DB.cuotas.filter(function(c){return c.alumnoId===eAid}):[];
  var html='';
  if(_nuevaCuota){
    html+='<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:10px;margin-bottom:8px">';
    html+='<div style="font-size:11px;font-weight:600;color:#15803d;margin-bottom:8px">Nueva cuota pendiente</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 100px;gap:6px;margin-bottom:6px">';
    html+='<input id="_nc_desc" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Concepto / Descripcion">';
    html+='<input id="_nc_mon" type="number" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Monto">';
    html+='</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">';
    html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Fecha vencimiento</div>';
    html+='<input id="_nc_fec" type="date" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%"></div>';
    html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Forma de cobro</div>';
    html+='<select id="_nc_for" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%">';
    html+='<option value="Efectivo">Efectivo</option><option value="Llave">Llave</option><option value="Tarjeta">Tarjeta</option>';
    html+='</select></div></div>';
    html+='<div style="display:flex;gap:6px;justify-content:flex-end">';
    html+='<button class="btn bo bsm" onclick="_nuevaCuota=null;renderCuotas()">Cancelar</button>';
    html+='<button class="btn bp bsm" onclick="generarCuota()">Generar alerta</button>';
    html+='</div></div>';
  }
  if(!cuotas.length&&!_nuevaCuota){ html+='<div style="color:#aaa;font-size:12px;padding:6px">Sin cuotas pendientes.</div>'; }
  cuotas.forEach(function(c){
    var dias=c.vencimiento?dR(c.vencimiento):null;
    var colV=dias===null?'#888':dias<=0?'#b91c1c':dias<=7?'#a16207':'#15803d';
    var txtV=dias===null?'Sin fecha':dias<=0?'VENCIDA hace '+Math.abs(dias)+' dia(s)':'Vence en '+dias+' dia(s)';
    html+='<div style="background:#fffdf0;border:1px solid #fde68a;border-radius:8px;padding:10px;margin-bottom:8px">';
    html+='<div style="display:grid;grid-template-columns:1fr 100px;gap:6px;margin-bottom:6px">';
    html+='<input id="_ec_desc_'+c.id+'" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Concepto" value="'+(c.descripcion||'').replace(/"/g,'&quot;')+'">';
    html+='<input id="_ec_mon_'+c.id+'" type="number" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Monto" value="'+(c.monto||'')+'">';
    html+='</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">';
    html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Fecha vencimiento</div>';
    html+='<input id="_ec_fec_'+c.id+'" type="date" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%" value="'+(c.vencimiento||'')+'"></div>';
    html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Forma de cobro</div>';
    html+='<select id="_ec_for_'+c.id+'" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%">';
    html+='<option value="Efectivo" '+(c.forma==='Efectivo'?'selected':'')+'>Efectivo</option>';
    html+='<option value="Llave" '+(c.forma==='Llave'?'selected':'')+'>Llave</option>';
    html+='<option value="Tarjeta" '+(c.forma==='Tarjeta'?'selected':'')+'>Tarjeta</option>';
    html+='</select></div></div>';
    html+='<div style="display:flex;align-items:center;justify-content:space-between">';
    html+='<span style="font-size:11px;font-weight:600;color:'+colV+'">'+txtV+'</span>';
    html+='<div style="display:flex;gap:6px">';
    html+='<button class="btn bp bsm" data-cid="'+c.id+'" onclick="guardarCuotaEdit(this.dataset.cid)">Guardar</button>';
    html+='<button class="btn bs bsm" data-cid="'+c.id+'" onclick="cobrarCuota(this.dataset.cid)">Cobrar</button>';
    html+='<button class="btn bd bsm" data-cid="'+c.id+'" onclick="delCuota(this.dataset.cid)">Eliminar</button>';
    html+='</div></div></div>';
  });
  el.innerHTML=html;
}

window.updCuota=async function(id,f,v){await fbUpd('cuotas',id,{[f]:v})}
window.guardarCuotaEdit=async function(id){
  var desc=document.getElementById('_ec_desc_'+id).value.trim();
  var mon=parseFloat(document.getElementById('_ec_mon_'+id).value);
  var fec=document.getElementById('_ec_fec_'+id).value;
  var forma=document.getElementById('_ec_for_'+id).value;
  if(!desc){alert('Ingresa el concepto.');return}
  if(!mon){alert('Ingresa el monto.');return}
  await fbUpd('cuotas',id,{descripcion:desc,monto:mon,vencimiento:fec,forma:forma});
  renderCuotas(); renderHistP(eAid);
}
window.delCuota=function(id){confirmDel('Eliminar esta cuota pendiente?',async function(){await fbDel('cuotas',id);if(eAid)renderHistP(eAid);})}
window.cobrarCuota=function(id){
  var c=DB.cuotas.find(function(x){return x.id===id});if(!c)return;
  if(!parseFloat(c.monto)){alert('Ingresa el monto antes de cobrar.');return}
  var desc=c.descripcion||'Cuota';var m=parseFloat(c.monto).toLocaleString('es-CO');
  confirmDel('Confirmar cobro de $'+m+' por: '+desc,async function(){
    var hoy=new Date().toISOString().split('T')[0];
    await fbAdd('pagos',{alumnoId:c.alumnoId,periodo:desc,forma:c.forma||'Efectivo',monto:parseFloat(c.monto),estado:'Pagado',fecha:hoy,creado:hoy});
    await fbDel('cuotas',id);
    if(c.alumnoId)renderHistP(c.alumnoId);
  });
}

// ── CURSOS ────────────────────────────────────────────────
var ctab='lista';
window.swCT=function(tab,el){ctab=tab;document.querySelectorAll('#page-cursos .tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('ct-lista').style.display=tab==='lista'?'block':'none';document.getElementById('ct-gantt').style.display=tab==='gantt'?'block':'none';if(tab==='gantt')renderGantt();else renderCursos()}

window.openMCur=function(id){
  id=id||null;eCid=id;
  document.getElementById('mc-tit').textContent=id?'Editar curso':'Nuevo curso';
  ['mc-nom','mc-niv','mc-des','mc-ini','mc-fin'].forEach(function(k){document.getElementById(k).value=''});
  var incluyeActuales=[];
  if(id){var c=DB.cursos.find(function(x){return x.id===id});if(c){document.getElementById('mc-nom').value=c.nombre||'';document.getElementById('mc-niv').value=(c.niveles||[]).join(', ');document.getElementById('mc-des').value=c.desc||'';document.getElementById('mc-ini').value=c.inicio||'';document.getElementById('mc-fin').value=c.fin||'';incluyeActuales=c.incluye||[]}}
  var box=document.getElementById('mc-incluye-box');
  var otros=DB.cursos.filter(function(c){return c.id!==id});
  if(!otros.length){
    box.innerHTML='<div style="font-size:12px;color:#aaa">Crea otros cursos primero para poder combinarlos aqui.</div>';
  } else {
    box.innerHTML=otros.map(function(c){
      return '<label style="display:flex;align-items:center;gap:7px;font-size:13px;padding:4px 0;cursor:pointer">'
        +'<input type="checkbox" value="'+c.id+'" '+(incluyeActuales.indexOf(c.id)>-1?'checked':'')+' style="width:auto">'
        +c.nombre+'</label>';
    }).join('');
  }
  document.getElementById('mc-btn').onclick=id?function(){updCurso(id)}:saveCurso;
  openM('m-curso');
}
function leerIncluyeSeleccionado(){
  return Array.from(document.querySelectorAll('#mc-incluye-box input[type=checkbox]:checked')).map(function(el){return el.value});
}
window.saveCurso=async function(){
  var nom=document.getElementById('mc-nom').value.trim();if(!nom){alert('Nombre requerido.');return}
  var niv=document.getElementById('mc-niv').value.trim();
  await fbAdd('cursos',{nombre:nom,niveles:niv?niv.split(',').map(function(n){return n.trim()}).filter(Boolean):[],desc:document.getElementById('mc-des').value.trim(),inicio:document.getElementById('mc-ini').value,fin:document.getElementById('mc-fin').value,incluye:leerIncluyeSeleccionado()});
  closeM('m-curso');
}
async function updCurso(id){
  var nom=document.getElementById('mc-nom').value.trim();if(!nom){alert('Nombre requerido.');return}
  var niv=document.getElementById('mc-niv').value.trim();
  await fbUpd('cursos',id,{nombre:nom,niveles:niv?niv.split(',').map(function(n){return n.trim()}).filter(Boolean):[],desc:document.getElementById('mc-des').value.trim(),inicio:document.getElementById('mc-ini').value,fin:document.getElementById('mc-fin').value,incluye:leerIncluyeSeleccionado()});
  closeM('m-curso');
}
window.delCurso=function(id){confirmDel('Eliminar este curso?',async function(){await fbDel('cursos',id)})}
function renderCursos(){var el=document.getElementById('cursos-lista');if(!el)return;if(!DB.cursos.length){el.innerHTML='<p style="color:#aaa;padding:20px">Sin cursos.</p>';return}el.innerHTML=DB.cursos.map(function(c){var cnt=DB.alumnos.filter(function(a){return a.moduloId===c.id}).length;var incluyeNoms=(c.incluye||[]).map(function(cid){var cc=DB.cursos.find(function(x){return x.id===cid});return cc?cc.nombre:null}).filter(Boolean);return'<div class="cc"><div style="display:flex;justify-content:space-between;gap:10px"><div><h4 style="margin-bottom:4px">'+c.nombre+'</h4>'+(c.desc?'<div style="font-size:12px;color:#888;margin-bottom:6px">'+c.desc+'</div>':'')+'<div class="ll">'+(c.niveles||[]).map(function(n){return'<span class="bdg bb">'+n+'</span>'}).join('')+'</div>'+(incluyeNoms.length?'<div style="font-size:11px;color:#7c3aed;margin-top:6px">&#128279; Incluye: '+incluyeNoms.join(', ')+'</div>':'')+'<div style="font-size:11px;color:#888;margin-top:6px">'+cnt+' alumno(s)</div></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="btn bo bsm" onclick="openMCur(\''+c.id+'\')">Editar</button><button class="btn bd bsm" onclick="delCurso(\''+c.id+'\')">X</button></div></div></div>'}).join('')}
function renderGantt(){var el=document.getElementById('gantt-c');var cf=DB.cursos.filter(function(c){return c.inicio&&c.fin});if(!cf.length){el.innerHTML='<div style="color:#aaa;padding:20px;text-align:center">Agrega fechas a los cursos.</div>';return}var minD=new Date(Math.min.apply(null,cf.map(function(c){return new Date(c.inicio)}))),maxD=new Date(Math.max.apply(null,cf.map(function(c){return new Date(c.fin)})));var total=maxD-minD||1;el.innerHTML=cf.map(function(c){var s=(new Date(c.inicio)-minD)/total*100,w=(new Date(c.fin)-new Date(c.inicio))/total*100;return'<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:500;margin-bottom:4px">'+c.nombre+'</div><div style="background:#f0f0f0;border-radius:4px;height:24px;position:relative"><div style="position:absolute;left:'+s+'%;width:'+Math.max(w,2)+'%;background:#c0392b;height:100%;border-radius:4px;display:flex;align-items:center;padding:0 6px;font-size:11px;font-weight:600;color:#000000;overflow:hidden;white-space:nowrap">'+c.nombre+'</div></div></div>'}).join('')}

// ── PAGOS / INGRESOS ──────────────────────────────────────

function poblarSelectsPag(){
  // Forma de pago en modal
  var selFor=document.getElementById('mp-for');
  if(selFor){var pv=selFor.value;selFor.innerHTML='<option value="">Seleccionar...</option>';DB.cat_pag_for.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).forEach(function(c){selFor.innerHTML+='<option value="'+c.nombre+'">'+c.nombre+'</option>'});selFor.value=pv;}
  // Estado/cuotas en modal
  var selEst=document.getElementById('mp-est');
  if(selEst){var pv2=selEst.value;selEst.innerHTML='<option value="">Seleccionar...</option>';DB.cat_pag_est.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).forEach(function(c){selEst.innerHTML+='<option value="'+c.nombre+'">'+c.nombre+'</option>'});selEst.value=pv2;}
  // Formulario/contrato en modal
  var selForm=document.getElementById('mp-form');
  if(selForm){var pv3=selForm.value;selForm.innerHTML='<option value="">Seleccionar...</option>';DB.cat_pag_form.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).forEach(function(c){selForm.innerHTML+='<option value="'+c.nombre+'">'+c.nombre+'</option>'});selForm.value=pv3;}
  // Filtro estado en página
  var fEpag=document.getElementById('f-epag');
  if(fEpag){var pv4=fEpag.value;fEpag.innerHTML='<option value="">Todos los estados</option>';DB.cat_pag_est.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).forEach(function(c){fEpag.innerHTML+='<option value="'+c.nombre+'">'+c.nombre+'</option>'});fEpag.value=pv4;}
  // Curso en modal pagos
  var selCur=document.getElementById('mp-cur');
  if(selCur){var pv5=selCur.value;selCur.innerHTML='<option value="">Seleccionar...</option>';DB.cursos.forEach(function(c){selCur.innerHTML+='<option value="'+c.nombre+'">'+c.nombre+'</option>'});selCur.value=pv5;}
  // Renderizar listas categorías si modal abierto
  renderCatPagListas();
}

function renderCatPagListas(){
  var tipos={cur:'cat-pag-cur-lista',for:'cat-pag-for-lista',est:'cat-pag-est-lista',form:'cat-pag-form-lista'};
  var cols={cur:DB.cat_pag_cur,for:DB.cat_pag_for,est:DB.cat_pag_est,form:DB.cat_pag_form};
  Object.keys(tipos).forEach(function(t){
    var el=document.getElementById(tipos[t]);if(!el)return;
    var cats=cols[t].slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')});
    if(!cats.length){el.innerHTML='<div style="color:#aaa;font-size:12px;padding:10px">Sin categorías.</div>';return;}
    el.innerHTML=cats.map(function(c){
      return'<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #f0f0f0">'
        +'<span style="font-size:13px">'+c.nombre+'</span>'
        +'<button class="btn bd bsm" onclick="delCatPag(\''+t+'\',\''+c.id+'\')">'+'X</button>'
        +'</div>';
    }).join('');
  });
}

window.openMCatPag=function(){poblarSelectsPag();openM('m-cat-pag');}

window.addCatPag=async function(tipo){
  var inp=document.getElementById('cat-pag-'+tipo+'-nueva');
  var nom=inp.value.trim();if(!nom){alert('Ingresa el nombre.');return}
  var col='cat_pag_'+tipo;
  if(DB[col].find(function(c){return c.nombre.toLowerCase()===nom.toLowerCase()})){alert('Ya existe.');return}
  await fbAdd(col,{nombre:nom});
  inp.value='';
}

window.delCatPag=function(tipo,id){
  confirmDel('Eliminar esta categoría?',async function(){await fbDel('cat_pag_'+tipo,id);renderCatPagListas();});
}

window.openMPag=function(id){
  id=id||null;ePid=id;
  popDatalistAlumnos('mp-al-list');
  popDatalistCursos('mp-cur-list');
  poblarSelectsPag();
  document.getElementById('mp-tit').textContent=id?'Editar ingreso':'Nuevo ingreso';
  document.getElementById('mp-fec').value=new Date().toISOString().split('T')[0];
  ['mp-mon','mp-net','mp-com','mp-not','mp-al'].forEach(function(k){document.getElementById(k).value=''});
  document.getElementById('mp-cur').value='';
  document.getElementById('mp-for').value='';
  document.getElementById('mp-est').value='';
  document.getElementById('mp-form').value='';
  document.getElementById('mp-del').style.display='none';
  if(id){
    var p=DB.pagos.find(function(x){return x.id===id});
    if(p){
      document.getElementById('mp-al').value=nombreDesdeAlumnoId(p.alumnoId);
      document.getElementById('mp-cur').value=p.curso||'';
      document.getElementById('mp-mon').value=p.monto||'';
      document.getElementById('mp-net').value=p.neto||'';
      document.getElementById('mp-fec').value=p.fecha||'';
      document.getElementById('mp-for').value=p.forma||'';
      document.getElementById('mp-est').value=p.estado||'';
      document.getElementById('mp-com').value=p.comision||'';
      document.getElementById('mp-form').value=p.formulario||'';
      document.getElementById('mp-not').value=p.notas||'';
      document.getElementById('mp-del').style.display='inline-block';
    }
  }
  openM('m-pago');
}

window.savePago=async function(){
  var nombreTexto=document.getElementById('mp-al').value.trim();
  var mon=parseFloat(document.getElementById('mp-mon').value);
  if(!nombreTexto){alert('Ingresa o selecciona un alumno.');return}
  if(!mon){alert('Ingresa el valor.');return}
  var aid=resolverAlumnoId(nombreTexto);
  var data={
    alumnoId:aid,
    curso:document.getElementById('mp-cur').value.trim(),
    monto:mon,
    neto:parseFloat(document.getElementById('mp-net').value)||0,
    fecha:document.getElementById('mp-fec').value,
    forma:document.getElementById('mp-for').value,
    estado:document.getElementById('mp-est').value,
    comision:parseFloat(document.getElementById('mp-com').value)||0,
    formulario:document.getElementById('mp-form').value,
    notas:document.getElementById('mp-not').value.trim(),
    periodo:document.getElementById('mp-cur').value.trim()
  };
  if(ePid){await fbUpd('pagos',ePid,data)}
  else{data.creado=new Date().toISOString().split('T')[0];await fbAdd('pagos',data)}
  closeM('m-pago');
}

window.selPago=function(pid,nom){_selPagId=pid;document.getElementById('pag-panel-info').textContent=nom;document.getElementById('pag-panel').style.display='block'}
window.closePagPanel=function(){_selPagId=null;document.getElementById('pag-panel').style.display='none'}
window.doPagEdit=function(){var id=_selPagId;closePagPanel();if(id)openMPag(id)}
window.doPagDel=function(){if(!_selPagId)return;var pid=_selPagId;closePagPanel();confirmDel('Eliminar este ingreso?',async function(){await fbDel('pagos',pid)})}

window.sortPagos=function(col){
  if(_pagSort.col===col){_pagSort.dir*=-1;}else{_pagSort.col=col;_pagSort.dir=-1;}
  // Update arrows
  ['nombre','curso','monto','neto','fecha','forma','estado','comision','formulario','notas'].forEach(function(c){
    var el=document.getElementById('sph-'+c);
    if(el) el.textContent=c===_pagSort.col?(_pagSort.dir===-1?'↓':'↑'):'↕';
  });
  renderPagos();
}

window.renderPagos=function renderPagos(){
  var q=(document.getElementById('q-pag').value||'').toLowerCase();
  var fe=document.getElementById('f-epag').value;
  var fm=document.getElementById('fp-mes').value;
  var list=DB.pagos.filter(function(p){
    if(fe&&p.estado!==fe)return false;
    if(fm&&p.fecha&&p.fecha.slice(0,7)!==fm)return false;
    if(q){var nom=gAN(p.alumnoId).toLowerCase();if(!nom.includes(q)&&!(p.curso||'').toLowerCase().includes(q)&&!(p.notas||'').toLowerCase().includes(q))return false}
    return true;
  });
  // Ordenar
  list.sort(function(a,b){
    var va=a[_pagSort.col]||'', vb=b[_pagSort.col]||'';
    if(_pagSort.col==='monto'||_pagSort.col==='neto'||_pagSort.col==='comision'){va=parseFloat(va)||0;vb=parseFloat(vb)||0;}
    return va<vb?-_pagSort.dir:va>vb?_pagSort.dir:0;
  });
  var tot=list.reduce(function(s,p){return s+(parseFloat(p.monto)||0)},0);
  var totNeto=list.reduce(function(s,p){return s+(parseFloat(p.neto)||0)},0);
  var totCom=list.reduce(function(s,p){return s+(parseFloat(p.comision)||0)},0);
  var totEl=document.getElementById('pag-total');
  if(totEl)totEl.textContent='Total Valor: $'+tot.toLocaleString('es-CO');
  var totNetoEl=document.getElementById('pag-total-neto');
  if(totNetoEl)totNetoEl.textContent='Total Neto: $'+totNeto.toLocaleString('es-CO');
  var totComEl=document.getElementById('pag-total-com');
  if(totComEl)totComEl.textContent='Total Comisión: $'+totCom.toLocaleString('es-CO');
  document.getElementById('t-pag').innerHTML=list.map(function(p){
    return'<tr style="cursor:pointer" onclick="selPago(\''+p.id+'\',\''+gAN(p.alumnoId).replace(/'/g,'')+'\')">'+
      '<td style="font-weight:500">'+gAN(p.alumnoId)+'</td>'+
      '<td><span class="bdg" style="background:'+colorCategoria(p.curso,'curso').bg+';color:'+colorCategoria(p.curso,'curso').fg+';font-size:11px">'+(p.curso||'-')+'</span></td>'+
      '<td style="font-weight:600;color:#15803d">$'+(parseFloat(p.monto)||0).toLocaleString('es-CO')+'</td>'+
      '<td style="color:#555">$'+(parseFloat(p.neto)||0).toLocaleString('es-CO')+'</td>'+
      '<td style="font-size:12px">'+(p.fecha||'-')+'</td>'+
      '<td><span class="bdg" style="background:'+colorCategoria(p.forma,'forma').bg+';color:'+colorCategoria(p.forma,'forma').fg+';font-size:11px">'+(p.forma||'-')+'</span></td>'+
      '<td><span class="bdg" style="background:'+colorCategoria(p.estado,'estado').bg+';color:'+colorCategoria(p.estado,'estado').fg+';font-size:11px">'+(p.estado||'-')+'</span></td>'+
      '<td style="color:#a16207;font-size:12px">'+(p.comision?'$'+parseFloat(p.comision).toLocaleString('es-CO'):'-')+'</td>'+
      '<td><span class="bdg" style="background:#fef9c3;color:#854d0e;font-size:11px">'+(p.formulario||'-')+'</span></td>'+
      '<td style="font-size:11px;color:#666;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(p.notas||'-')+'</td>'+
      '<td><span style="font-size:11px;color:#aaa">ver</span></td>'+
    '</tr>';
  }).join('')||'<tr><td colspan="11" style="text-align:center;color:#aaa;padding:24px">Sin registros</td></tr>';
}

// ── EGRESOS ───────────────────────────────────────────────
window.openMEg=function(id){
  id=id||null; eEid=id;
  document.getElementById('me-tit').textContent=id?'Editar egreso':'Nuevo egreso';
  poblarCatEgreso('me-cat');
  document.getElementById('me-fec').value=new Date().toISOString().split('T')[0];
  ['me-con','me-val','me-not'].forEach(function(k){document.getElementById(k).value=''});
  document.getElementById('me-cat').value='';
  document.getElementById('me-del').style.display='none';
  if(id){
    var e=DB.egresos.find(function(x){return x.id===id});
    if(e){
      document.getElementById('me-con').value=e.concepto||'';
      document.getElementById('me-cat').value=e.categoria||'';
      document.getElementById('me-val').value=e.valor||'';
      document.getElementById('me-fec').value=e.fecha||'';
      document.getElementById('me-not').value=e.notas||'';
      document.getElementById('me-del').style.display='inline-block';
    }
  }
  openM('m-egreso');
}

window.saveEgreso=async function(){
  var con=document.getElementById('me-con').value.trim();
  var val=parseFloat(document.getElementById('me-val').value);
  var fec=document.getElementById('me-fec').value;
  if(!con){alert('Ingresa el concepto.');return}
  if(!val){alert('Ingresa el valor.');return}
  if(!fec){alert('Ingresa la fecha.');return}
  var data={concepto:con,categoria:document.getElementById('me-cat').value,valor:val,fecha:fec,notas:document.getElementById('me-not').value.trim()};
  if(eEid){await fbUpd('egresos',eEid,data)}
  else{data.creado=new Date().toISOString().split('T')[0];await fbAdd('egresos',data)}
  closeM('m-egreso');
}

window.delEgresoM=function(){
  if(!eEid)return;var id=eEid;
  confirmDel('Eliminar este egreso?',async function(){await fbDel('egresos',id);closeM('m-egreso');});
}

window.selEgreso=function(id){
  _selEgId=id;
  var e=DB.egresos.find(function(x){return x.id===id});if(!e)return;
  document.getElementById('eg-panel-info').textContent=e.concepto;
  document.getElementById('eg-panel').style.display='block';
}
window.closeEgPanel=function(){_selEgId=null;document.getElementById('eg-panel').style.display='none'}
window.doEgEdit=function(){var id=_selEgId;closeEgPanel();if(id)openMEg(id)}
window.doEgDel=function(){
  if(!_selEgId)return;var id=_selEgId;closeEgPanel();
  confirmDel('Eliminar este egreso?',async function(){await fbDel('egresos',id)});
}

var _catColorMaps={};
var _catColorPalette=[
  {bg:'#dbeafe',fg:'#1e40af'}, // azul
  {bg:'#fef9c3',fg:'#854d0e'}, // amarillo
  {bg:'#dcfce7',fg:'#166534'}, // verde
  {bg:'#fce7f3',fg:'#9d174d'}, // rosa
  {bg:'#e0e7ff',fg:'#3730a3'}, // indigo
  {bg:'#ffedd5',fg:'#9a3412'}, // naranja
  {bg:'#cffafe',fg:'#155e75'}, // cyan
  {bg:'#fee2e2',fg:'#991b1b'}, // rojo
  {bg:'#ede9fe',fg:'#5b21b6'}, // morado
  {bg:'#d1fae5',fg:'#065f46'}, // esmeralda
  {bg:'#fae8ff',fg:'#86198f'}, // fucsia
  {bg:'#f3f4f6',fg:'#374151'}  // gris (sin categoría)
];
function colorCategoria(nombre,ns){
  ns=ns||'default';
  if(!_catColorMaps[ns])_catColorMaps[ns]={};
  var map=_catColorMaps[ns];
  var key=nombre||'Sin categoría';
  if(map[key])return map[key];
  var idx=Object.keys(map).length%_catColorPalette.length;
  var c=_catColorPalette[idx];
  map[key]=c;
  return c;
}

function renderEgresos(){
  var q=(document.getElementById('q-eg').value||'').toLowerCase();
  var fc=document.getElementById('fe-cat').value;
  var fm=document.getElementById('fe-mes').value;
  var list=DB.egresos.filter(function(e){
    if(q&&!(e.concepto||'').toLowerCase().includes(q))return false;
    if(fc&&e.categoria!==fc)return false;
    if(fm&&e.fecha&&e.fecha.slice(0,7)!==fm)return false;
    return true;
  });
  // Ordenar
  list.sort(function(a,b){
    var va=a[_egSort.col]||'', vb=b[_egSort.col]||'';
    if(_egSort.col==='valor'){va=parseFloat(va)||0;vb=parseFloat(vb)||0;}
    return va<vb?-_egSort.dir:va>vb?_egSort.dir:0;
  });
  var tot=list.reduce(function(s,e){return s+(parseFloat(e.valor)||0)},0);
  var totEl=document.getElementById('eg-total');
  if(totEl)totEl.textContent='Total: $'+tot.toLocaleString('es-CO');
  var tb=document.getElementById('t-eg');
  if(!tb)return;
  tb.innerHTML=list.map(function(e){
    return'<tr style="cursor:pointer" onclick="selEgreso(\''+e.id+'\')">'
      +'<td>'+(e.fecha||'-')+'</td>'
      +'<td style="font-weight:500">'+(e.concepto||'-')+'</td>'
      +'<td><span class="bdg" style="background:'+colorCategoria(e.categoria,'egreso').bg+';color:'+colorCategoria(e.categoria,'egreso').fg+';font-size:11px">'+(e.categoria||'Sin categoría')+'</span></td>'
      +'<td style="font-weight:600;color:#b91c1c">$'+(parseFloat(e.valor)||0).toLocaleString('es-CO')+'</td>'
      +'<td style="font-size:11px;color:#aaa">'+(e.notas||'-')+'</td>'
      +'<td><span style="font-size:11px;color:#aaa">Acciones</span></td>'
      +'</tr>';
  }).join('')||'<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Sin registros</td></tr>';
}
window.sortEgresos=function(col){
  if(_egSort.col===col){_egSort.dir*=-1;}else{_egSort.col=col;_egSort.dir=-1;}
  // Update arrows
  ['fecha','concepto','categoria','valor'].forEach(function(c){
    var el=document.getElementById('seh-'+c);
    if(el) el.textContent=c===_egSort.col?(_egSort.dir===-1?'↓':'↑'):'↕';
  });
  renderEgresos();
}
window.renderEgresos=renderEgresos;

// ── CATEGORÍAS EGRESO ─────────────────────────────────────
window.openMCatEg=function(){
  renderCatEgresoAdmin();
  openM('m-cat-eg');
}

function renderCatEgresoAdmin(){
  var el=document.getElementById('cat-eg-lista');if(!el)return;
  var cats=DB.cat_egreso.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')});
  if(!cats.length){el.innerHTML='<div style="color:#aaa;font-size:13px;padding:12px">Sin categorías. Agrega una abajo.</div>';return}
  el.innerHTML=cats.map(function(c){
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f0f0f0">'
      +'<span style="font-size:13px">'+c.nombre+'</span>'
      +'<button class="btn bd bsm" onclick="delCatEg(\''+c.id+'\')">X</button>'
      +'</div>';
  }).join('');
}

window.addCatEg=async function(){
  var inp=document.getElementById('cat-eg-nueva');
  var nom=inp.value.trim();if(!nom){alert('Ingresa el nombre.');return}
  if(DB.cat_egreso.find(function(c){return c.nombre.toLowerCase()===nom.toLowerCase()})){alert('Ya existe esa categoría.');return}
  await fbAdd('cat_egreso',{nombre:nom});
  inp.value='';
}

window.delCatEg=function(id){
  confirmDel('Eliminar esta categoría?',async function(){await fbDel('cat_egreso',id);renderCatEgresoAdmin();});
}

// ── ASISTENCIA ────────────────────────────────────────────
window.openMAsist=function(){popAl('ma-al');document.getElementById('ma-fec').value=new Date().toISOString().split('T')[0];document.getElementById('ma-not').value='';openM('m-asist')}
window.saveAsist=async function(){
  var aid=document.getElementById('ma-al').value;if(!aid){alert('Selecciona un alumno.');return}
  await fbAdd('asistencias',{alumnoId:aid,fecha:document.getElementById('ma-fec').value,estado:document.getElementById('ma-est').value,notes:document.getElementById('ma-not').value.trim()});
  closeM('m-asist');renderAsistencia();
}
window.delAsist=function(id){confirmDel('Eliminar este registro de asistencia?',async function(){await fbDel('asistencias',id);renderAsistencia();})}
window.sortAsist=function(col){
  if(_astSort.col===col){_astSort.dir*=-1;}else{_astSort.col=col;_astSort.dir=-1;}
  ['alumnoId','curso','ingreso','fecha','estado'].forEach(function(c){
    var el=document.getElementById('sasth-'+c);
    if(el) el.textContent=c===_astSort.col?(_astSort.dir===-1?'↓':'↑'):'↕';
  });
  renderAsistencia();
}

window.renderAsistencia=function renderAsistencia(){
  var fAl=document.getElementById('q-asist-al').value,fF=document.getElementById('q-asist-f').value;
  var list=DB.asistencias.filter(function(x){if(fAl&&x.alumnoId!==fAl)return false;if(fF&&x.fecha!==fF)return false;return true});
  list.sort(function(a,b){
    var va,vb;
    if(_astSort.col==='alumnoId'){va=gAN(a.alumnoId);vb=gAN(b.alumnoId);}
    else if(_astSort.col==='curso'){va=gAC(a.alumnoId);vb=gAC(b.alumnoId);}
    else if(_astSort.col==='ingreso'){va=gAI(a.alumnoId);vb=gAI(b.alumnoId);}
    else{va=a[_astSort.col]||'';vb=b[_astSort.col]||'';}
    return va<vb?-_astSort.dir:va>vb?_astSort.dir:0;
  });
  document.getElementById('t-asist').innerHTML=list.map(function(x){return'<tr><td>'+gAN(x.alumnoId)+'</td><td>'+gAC(x.alumnoId)+'</td><td>'+gAI(x.alumnoId)+'</td><td>'+(x.fecha||'-')+'</td><td>'+bdg(x.estado)+'</td><td>'+(x.notes||'-')+'</td><td><button class="btn bd bsm" onclick="delAsist(\''+x.id+'\')">X</button></td></tr>'}).join('')||'<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">Sin registros</td></tr>';
}

// ── REPORTES ──────────────────────────────────────────────
window.renderReporte=function renderReporte(){
  var fAl=document.getElementById('r-al').value,fCur=document.getElementById('r-cur').value,fEst=document.getElementById('r-est').value,fMes=document.getElementById('r-mes').value;
  var list=DB.pagos.filter(function(p){if(fAl&&p.alumnoId!==fAl)return false;if(fCur){var a=gA(p.alumnoId);if(!a||a.moduloId!==fCur)return false}if(fEst&&p.estado!==fEst)return false;if(fMes&&p.fecha&&p.fecha.slice(0,7)!==fMes)return false;return true});
  var ingresos=list.reduce(function(s,p){return s+(parseFloat(p.monto)||0)},0);
  var ingresosNeto=list.reduce(function(s,p){return s+(parseFloat(p.neto)||0)},0);
  var ingresosCom=list.reduce(function(s,p){return s+(parseFloat(p.comision)||0)},0);
  var pen=DB.cuotas.reduce(function(s,c){return s+parseFloat(c.monto||0)},0);
  // Egresos del mismo mes filtrado
  var egList=DB.egresos.filter(function(e){if(fMes&&e.fecha&&e.fecha.slice(0,7)!==fMes)return false;return true});
  var egresos=egList.reduce(function(s,e){return s+(parseFloat(e.valor)||0)},0);
  var utilidad=ingresos-egresos;
  document.getElementById('r-tot').textContent='$'+ingresos.toLocaleString('es-CO');
  var rTotNetoEl=document.getElementById('r-tot-neto');
  if(rTotNetoEl)rTotNetoEl.textContent='$'+ingresosNeto.toLocaleString('es-CO');
  var rTotComEl=document.getElementById('r-tot-com');
  if(rTotComEl)rTotComEl.textContent='$'+ingresosCom.toLocaleString('es-CO');
  document.getElementById('r-pen').textContent='$'+pen.toLocaleString('es-CO');
  document.getElementById('r-cnt').textContent=list.length;
  // Utilidad neta
  var uEl=document.getElementById('r-utilidad');
  if(uEl){
    uEl.textContent='$'+utilidad.toLocaleString('es-CO');
    uEl.style.color=utilidad>=0?'#15803d':'#b91c1c';
  }
  var uEgEl=document.getElementById('r-egresos');
  if(uEgEl)uEgEl.textContent='$'+egresos.toLocaleString('es-CO');
  document.getElementById('t-rep').innerHTML=list.map(function(p){return'<tr><td>'+gAN(p.alumnoId)+'</td><td>'+gAC(p.alumnoId)+'</td><td>'+(p.periodo||'-')+'</td><td>'+(p.forma||'-')+'</td><td>$'+(p.monto||0).toLocaleString('es-CO')+'</td><td>'+bdg(p.estado)+'</td><td>'+(p.fecha||'-')+'</td></tr>'}).join('')||'<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">Sin registros</td></tr>';
  renderRepChart();
}

function renderRepChart(){
  var el=document.getElementById('rep-chart');if(!el)return;
  var now=new Date(),m=now.getMonth(),y=now.getFullYear();
  var meses=[];
  for(var i=5;i>=0;i--){var d=new Date(y,m-i,1);meses.push({lbl:d.toLocaleString('es-CO',{month:'short'}),m:d.getMonth(),y:d.getFullYear()})}
  var ingresos=meses.map(function(x){
    return DB.pagos.filter(function(p){if(!p.fecha)return false;var d=new Date(p.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,p){return s+(parseFloat(p.monto)||0)},0);
  });
  var egresos=meses.map(function(x){
    return DB.egresos.filter(function(e){if(!e.fecha)return false;var d=new Date(e.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,e){return s+(parseFloat(e.valor)||0)},0);
  });
  var mx=Math.max.apply(null,ingresos.concat(egresos).concat([1]));
  el.innerHTML=meses.map(function(x,i){
    var hi=Math.max(4,Math.round(ingresos[i]/mx*180));
    var he=Math.max(4,Math.round(egresos[i]/mx*180));
    var li=ingresos[i]?'$'+Math.round(ingresos[i]/1000)+'k':'';
    var le=egresos[i]?'$'+Math.round(egresos[i]/1000)+'k':'';
    return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">'
      +'<div style="display:flex;align-items:flex-end;gap:3px;height:180px">'
        +'<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end">'
          +'<span style="font-size:10px;color:#c0392b;font-weight:700;margin-bottom:4px">'+li+'</span>'
          +'<div style="width:36px;background:linear-gradient(180deg,#e74c3c,#c0392b);border-radius:6px 6px 0 0;height:'+hi+'px;box-shadow:0 4px 12px rgba(192,57,43,.45)"></div>'
        +'</div>'
        +'<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end">'
          +'<span style="font-size:10px;color:#374151;font-weight:700;margin-bottom:4px">'+le+'</span>'
          +'<div style="width:36px;background:linear-gradient(180deg,#4b5563,#1f2937);border-radius:6px 6px 0 0;height:'+he+'px;box-shadow:0 4px 12px rgba(31,41,55,.45)"></div>'
        +'</div>'
      +'</div>'
      +'<div style="font-size:11px;color:#888;margin-top:4px">'+x.lbl+'</div>'
    +'</div>';
  }).join('');
}
window.printRep=function(){var t=document.getElementById('rep-wrap');var w=window.open('','_blank');w.document.write('<!DOCTYPE html><html><head><title>Reporte</title><style>body{font-family:system-ui;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd;text-align:left}th{background:#f0f0f0}</style></head><body><h2>Reporte Financiero - Deejay Academy</h2>'+t.innerHTML+'</body></html>');w.document.close();w.print()}

// ── HORARIOS ──────────────────────────────────────────────
window.initHorariosPage=function(){
  if(!window.hCursoTab&&DB.cursos.length) window.hCursoTab=DB.cursos[0].id;
  window.renderHorariosPage();
}
window.renderHorariosPage=function(){
  if(!window.hCursoTab&&DB.cursos.length) window.hCursoTab=DB.cursos[0].id;
  var mesAct=window.hMes, cursoAct=window.hCursoTab;
  var curso=DB.cursos.find(function(c){return c.id===cursoAct});
  var niveles=curso?(curso.niveles||[]):[];
  var fIni=curso&&curso['fechas_mes_'+mesAct+'_inicio']||'';
  var fFin=curso&&curso['fechas_mes_'+mesAct+'_fin']||'';
  var mesOpts=MESES_N.map(function(m,i){return'<option value="'+i+'" '+(i==mesAct?'selected':'')+'>'+m.toUpperCase()+'</option>'}).join('');
  var tabs='<select onchange="window.hCursoTab=this.value;window.renderHorariosPage()" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;outline:none;min-width:240px">'
    +DB.cursos.map(function(c){var act=c.id===cursoAct;return'<option value="'+c.id+'" '+(act?'selected':'')+'>'+c.nombre+'</option>'}).join('')
    +'</select>';
  var gridHtml='';
  if(!niveles.length){
    gridHtml='<div style="color:#6b7280;text-align:center;padding:40px">Este curso no tiene niveles.</div>';
  } else {
    var ths=niveles.map(function(n,i){return'<th style="min-width:160px;padding:0 4px 8px 4px"><div style="background:'+HCOLORS[i%HCOLORS.length]+';border-radius:10px;padding:10px 8px;text-align:center;font-size:15px;font-weight:800;color:#fff">'+n+'</div></th>'}).join('');
    var rows=FRANJAS_H.map(function(fr){
      var tds=niveles.map(function(n,ni){
        var bg=HCOLORS[ni%HCOLORS.length];
        var grupos=DB.horario_grupos.filter(function(g){return g.franja===fr&&g.cursoId===cursoAct&&g.nivel===n&&String(g.mes)===String(mesAct)});
        var cards=grupos.map(function(g){
          var noms=(g.alumnos||[]).map(function(aid){return gAN(aid)}).filter(function(x){return x&&x!=='-'}).join('<br>');
          return'<div draggable="true" ondragstart="window.dragGrupoStart(event,\''+g.id+'\')" onclick="window.editGrupo(\''+g.id+'\')" style="border-radius:10px;padding:8px 10px;margin-bottom:6px;position:relative;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.15);cursor:grab">'
            +'<button onclick="event.stopPropagation();window.delGrupo(\''+g.id+'\')" style="position:absolute;top:4px;right:4px;background:#c0392b;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;color:#fff;line-height:18px;text-align:center;padding:0">x</button>'
            +(g.instructor?'<div style="font-size:11px;font-weight:700;color:#c0392b;background:rgba(0,0,0,.3);border-radius:5px;padding:2px 7px;display:inline-block;margin-bottom:5px">'+g.instructor+'</div>':'')
            +'<div style="color:#e5e7eb;font-size:12px;line-height:1.7">'+(noms||'<span style="color:#6b7280;font-size:11px">Sin alumnos</span>')+'</div>'
            +(g.fechaIni&&g.fechaFin?'<div style="font-size:10px;font-weight:700;color:#f87171;margin-top:5px">'+fmtF(g.fechaIni)+' - '+fmtF(g.fechaFin)+'</div>':'')
            +'</div>';
        }).join('');
        return'<td ondragover="event.preventDefault()" ondrop="window.dragGrupoDrop(event,\''+cursoAct+'\',\''+n+'\',\''+fr+'\',\''+mesAct+'\')" style="background:'+bg+';border-radius:10px;padding:7px;vertical-align:top;min-height:90px">'+cards+'<div onclick="window.openGrupoModal(\''+cursoAct+'\',\''+n+'\',\''+fr+'\')" style="border:1.5px dashed rgba(255,255,255,.25);border-radius:8px;padding:7px;text-align:center;cursor:pointer;font-size:12px;color:rgba(255,255,255,.35);margin-top:3px">+ grupo</div></td>';
      }).join('');
      return'<tr><td style="color:#9ca3af;font-size:12px;font-weight:600;vertical-align:top;padding:12px 10px 0 2px;white-space:nowrap;width:75px">'+fr+'</td>'+tds+'</tr>';
    }).join('');
    gridHtml='<div style="color:#c0392b;font-size:13px;font-weight:700;margin-bottom:10px;letter-spacing:1px">'+MESES_N[mesAct].toUpperCase()+'</div>'
      +'<div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:5px;width:100%"><thead><tr><th style="width:75px"></th>'+ths+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  document.getElementById('horarios-root').innerHTML=
    '<div style="background:#000000;border-radius:14px;padding:16px;min-height:500px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    +'<select onchange="window.hMes=parseInt(this.value);window.renderHorariosPage()" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:6px 12px;font-size:13px;outline:none;font-family:inherit">'+mesOpts+'</select>'
    +'<span style="color:#9ca3af;font-size:12px;margin-left:6px">inicia</span>'
    +'<input type="date" value="'+fIni+'" onchange="window.setCursoFecha(\'inicio\',this.value)" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:6px 10px;font-size:13px;outline:none;width:140px">'
    +'<span style="color:#9ca3af;font-size:12px">termina</span>'
    +'<input type="date" value="'+fFin+'" onchange="window.setCursoFecha(\'fin\',this.value)" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:6px 10px;font-size:13px;outline:none;width:140px">'
    +'</div>'
    +'<div style="margin-bottom:14px">'+tabs+'</div>'
    +gridHtml+'</div>';
}
window.setCursoFecha=async function(campo,val){
  if(!window.hCursoTab)return;
  await fbUpd('cursos',window.hCursoTab,{['fechas_mes_'+window.hMes+'_'+campo]:val});
}
window.openGrupoModal=function(cursoId,nivel,franja){
  var tmp=document.getElementById('_hm');if(tmp)tmp.remove();
  var curso=DB.cursos.find(function(c){return c.id===cursoId});
  var alOpts=DB.alumnos.filter(function(a){return alumnoEnCurso(a,cursoId)}).map(function(a){return'<option value="'+a.id+'">'+a.nombre+'</option>'}).join('');
  var ov=document.createElement('div');ov.className='ov show';ov.id='_hm';
  ov.innerHTML='<div class="modal" style="max-width:420px"><div class="mh"><h3>'+nivel+' - '+franja+'</h3><button class="btn bo bsm" onclick="document.getElementById(\'_hm\').remove()">X</button></div><div class="mb"><div class="fg" style="grid-template-columns:1fr"><div class="fgp"><label>Instructor</label><input id="_hi" placeholder="Nombre del instructor"></div><div class="fgp"><label>Alumnos (Ctrl+clic para varios)</label><select id="_has" multiple style="min-height:90px">'+(alOpts||'<option disabled>Sin alumnos en este curso</option>')+'</select></div><div class="fg" style="grid-template-columns:1fr 1fr"><div class="fgp"><label>Fecha inicio</label><input type="date" id="_hfi" value="'+(curso&&curso.inicio||'')+'"></div><div class="fgp"><label>Fecha fin</label><input type="date" id="_hff" value="'+(curso&&curso.fin||'')+'"></div></div></div></div><div class="mf"><button class="btn bo" onclick="document.getElementById(\'_hm\').remove()">Cancelar</button><button class="btn bp" onclick="window.saveGrupo(\''+cursoId+'\',\''+nivel+'\',\''+franja+'\')">Guardar</button></div></div>';
  document.body.appendChild(ov);
}
window.saveGrupo=async function(cursoId,nivel,franja){
  var inst=document.getElementById('_hi').value.trim();
  var sel=document.getElementById('_has');
  var als=sel?Array.from(sel.selectedOptions).map(function(o){return o.value}):[];
  var fi2=document.getElementById('_hfi').value,ff=document.getElementById('_hff').value;
  await fbAdd('horario_grupos',{cursoId:cursoId,nivel:nivel,franja:franja,mes:window.hMes,instructor:inst,alumnos:als,fechaIni:fi2,fechaFin:ff});
  var t=document.getElementById('_hm');if(t)t.remove();window.renderHorariosPage();
}
var _dragGrupoId=null;
window.dragGrupoStart=function(ev,grupoId){
  _dragGrupoId=grupoId;
  ev.dataTransfer.effectAllowed='copy';
}

window.dragGrupoDrop=async function(ev,cursoId,nivelDestino,franjaDestino,mesDestino){
  ev.preventDefault();
  if(!_dragGrupoId)return;
  var origen=DB.horario_grupos.find(function(g){return g.id===_dragGrupoId});
  if(!origen){_dragGrupoId=null;return;}
  // Si el destino es exactamente el mismo casillero de origen, no hacer nada
  if(origen.cursoId===cursoId&&origen.nivel===nivelDestino&&origen.franja===franjaDestino&&String(origen.mes)===String(mesDestino)){
    _dragGrupoId=null;return;
  }
  var existente=DB.horario_grupos.find(function(g){return g.cursoId===cursoId&&g.nivel===nivelDestino&&g.franja===franjaDestino&&String(g.mes)===String(mesDestino)});
  var copiar=async function(){
    var data={cursoId:cursoId,nivel:nivelDestino,franja:franjaDestino,mes:parseInt(mesDestino),instructor:origen.instructor||'',alumnos:(origen.alumnos||[]).slice(),fechaIni:origen.fechaIni||'',fechaFin:origen.fechaFin||''};
    if(existente){await fbUpd('horario_grupos',existente.id,data)}
    else{await fbAdd('horario_grupos',data)}
    _dragGrupoId=null;
    window.renderHorariosPage();
  };
  if(existente){
    confirmDel('Este casillero ya tiene un grupo. Reemplazarlo con los alumnos copiados?',copiar);
  } else {
    copiar();
  }
}

window.delGrupo=function(id){confirmDel('Eliminar este grupo y todos sus alumnos asignados?',async function(){await fbDel('horario_grupos',id);window.renderHorariosPage();})}
window.editGrupo=function(id){
  var g=DB.horario_grupos.find(function(x){return x.id===id});if(!g)return;
  var tmp=document.getElementById('_hm');if(tmp)tmp.remove();
  var alOpts=DB.alumnos.filter(function(a){return alumnoEnCurso(a,g.cursoId)}).map(function(a){return'<option value="'+a.id+'" '+((g.alumnos||[]).indexOf(a.id)>=0?'selected':'')+'>'+a.nombre+'</option>'}).join('');
  var ov=document.createElement('div');ov.className='ov show';ov.id='_hm';
  ov.innerHTML='<div class="modal" style="max-width:420px"><div class="mh"><h3>'+g.nivel+' - '+g.franja+'</h3><button class="btn bo bsm" onclick="document.getElementById(\'_hm\').remove()">X</button></div><div class="mb"><div class="fg" style="grid-template-columns:1fr"><div class="fgp"><label>Instructor</label><input id="_hi" value="'+(g.instructor||'')+'"></div><div class="fgp"><label>Alumnos</label><select id="_has" multiple style="min-height:90px">'+(alOpts||'<option disabled>Sin alumnos</option>')+'</select></div><div class="fg" style="grid-template-columns:1fr 1fr"><div class="fgp"><label>Fecha inicio</label><input type="date" id="_hfi" value="'+(g.fechaIni||'')+'"></div><div class="fgp"><label>Fecha fin</label><input type="date" id="_hff" value="'+(g.fechaFin||'')+'"></div></div></div></div><div class="mf"><button class="btn bd" onclick="window.delGrupo(\''+id+'\');document.getElementById(\'_hm\').remove()" style="margin-right:auto">Eliminar</button><button class="btn bo" onclick="document.getElementById(\'_hm\').remove()">Cancelar</button><button class="btn bp" onclick="window.updGrupo(\''+id+'\')">Guardar</button></div></div>';
  document.body.appendChild(ov);
}
window.updGrupo=async function(id){
  var sel=document.getElementById('_has');
  await fbUpd('horario_grupos',id,{instructor:document.getElementById('_hi').value.trim(),alumnos:sel?Array.from(sel.selectedOptions).map(function(o){return o.value}):[],fechaIni:document.getElementById('_hfi').value,fechaFin:document.getElementById('_hff').value});
  var t=document.getElementById('_hm');if(t)t.remove();window.renderHorariosPage();
}


// ── COLABORADORES ─────────────────────────────────────────
var _selColId=null, _fotoCol=null, _editColId=null;

window.prevFotoCol=function(ev){
  var f=ev.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas'),w=img.width,h=img.height,mx=200;
      if(w>h){if(w>mx){h=h*mx/w;w=mx}}else{if(h>mx){w=w*mx/h;h=mx}}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      _fotoCol=c.toDataURL('image/jpeg',.7);
      var pi=document.getElementById('col-ph-img');pi.src=_fotoCol;pi.style.display='block';
      document.getElementById('col-ph-icon').style.display='none';
    };img.src=e.target.result;
  };r.readAsDataURL(f);
}

window.openMCol=function(id){
  id=id||null;_editColId=id;_fotoCol=null;
  document.getElementById('col-ph-img').style.display='none';
  document.getElementById('col-ph-icon').style.display='';
  document.getElementById('m-col-tit').textContent=id?'Editar colaborador':'Nuevo colaborador';
  document.getElementById('col-del-btn').style.display=id?'inline-block':'none';
  ['col-nom','col-cargo','col-rh','col-cel','col-mail','col-ini','col-fin','col-dir','col-ref','col-obs'].forEach(function(k){
    var el=document.getElementById(k);if(el)el.value='';
  });
  if(id){
    var c=DB.colaboradores.find(function(x){return x.id===id});
    if(c){
      var map={nom:'nombre',cargo:'cargo',rh:'rh',cel:'celular',mail:'email',ini:'ingreso',fin:'egreso',dir:'direccion',ref:'referencia',obs:'observaciones'};
      Object.keys(map).forEach(function(k){var el=document.getElementById('col-'+k);if(el&&c[map[k]]!=null)el.value=c[map[k]]});
      if(c.foto){_fotoCol=c.foto;var img=document.getElementById('col-ph-img');img.src=_fotoCol;img.style.display='block';document.getElementById('col-ph-icon').style.display='none';}
    }
  } else {
    document.getElementById('col-ini').value=new Date().toISOString().split('T')[0];
  }
  openM('m-col');
}

window.saveColaborador=async function(){
  var nom=document.getElementById('col-nom').value.trim();
  if(!nom){alert('Nombre requerido.');return}
  var data={
    nombre:nom,
    cargo:document.getElementById('col-cargo').value.trim(),
    rh:document.getElementById('col-rh').value.trim(),
    celular:document.getElementById('col-cel').value.trim(),
    email:document.getElementById('col-mail').value.trim(),
    ingreso:document.getElementById('col-ini').value,
    egreso:document.getElementById('col-fin').value,
    direccion:document.getElementById('col-dir').value.trim(),
    referencia:document.getElementById('col-ref').value.trim(),
    observaciones:document.getElementById('col-obs').value.trim(),
    foto:_fotoCol||null
  };
  if(_editColId){await fbUpd('colaboradores',_editColId,data)}
  else{data.creado=new Date().toISOString().split('T')[0];await fbAdd('colaboradores',data)}
  closeM('m-col');
}

window.delColaboradorM=function(){
  if(!_editColId)return;var id=_editColId;
  confirmDel('Eliminar este colaborador?',async function(){await fbDel('colaboradores',id);closeM('m-col');});
}

window.sortCol=function(col){
  if(_colSort.col===col){_colSort.dir*=-1;}else{_colSort.col=col;_colSort.dir=1;}
  ['nombre','cargo','celular','email','ingreso'].forEach(function(c){
    var el=document.getElementById('sch-'+c);
    if(el) el.textContent=c===_colSort.col?(_colSort.dir===1?'↑':'↓'):'↕';
  });
  renderColaboradores();
}

window.renderColaboradores=function(){
  var q=(document.getElementById('q-col').value||'').toLowerCase();
  var fc=document.getElementById('f-col-cargo').value;
  // Poblar filtro cargos
  var fCargo=document.getElementById('f-col-cargo');
  if(fCargo){
    var pv=fCargo.value;
    var cargos=[...new Set(DB.colaboradores.map(function(c){return c.cargo||''}).filter(Boolean))].sort();
    fCargo.innerHTML='<option value="">Todos los cargos</option>';
    cargos.forEach(function(c){fCargo.innerHTML+='<option value="'+c+'">'+c+'</option>'});
    fCargo.value=pv;
  }
  var list=DB.colaboradores.filter(function(c){
    if(q&&!c.nombre.toLowerCase().includes(q)&&!(c.cargo||'').toLowerCase().includes(q))return false;
    if(fc&&c.cargo!==fc)return false;
    return true;
  });
  list.sort(function(a,b){
    var va=(a[_colSort.col]||''), vb=(b[_colSort.col]||'');
    return va<vb?-_colSort.dir:va>vb?_colSort.dir:0;
  });
  var tb=document.getElementById('t-col');
  if(!tb)return;
  tb.innerHTML=list.map(function(c){
    return'<tr style="cursor:pointer" onclick="selColaborador(\''+c.id+'\',\''+c.nombre.replace(/'/g,'')+'\')">'
      +'<td>'+avEl(c)+'</td>'
      +'<td><div style="font-weight:500">'+c.nombre+'</div></td>'
      +'<td><span class="bdg" style="background:#dbeafe;color:#1e40af;font-size:11px">'+(c.cargo||'-')+'</span></td>'
      +'<td>'+(c.celular||'-')+'</td>'
      +'<td style="font-size:12px;color:#666">'+(c.email||'-')+'</td>'
      +'<td style="font-size:12px">'+(c.ingreso||'-')+'</td>'
      +'<td><span style="font-size:11px;color:#aaa">Acciones</span></td>'
      +'</tr>';
  }).join('')||'<tr><td colspan="7" style="text-align:center;color:#aaa;padding:24px">Sin colaboradores</td></tr>';
}

window.selColaborador=function(id,nom){
  _selColId=id;
  document.getElementById('col-panel-info').textContent=nom;
  document.getElementById('col-panel').style.display='block';
}
window.closeColPanel=function(){_selColId=null;document.getElementById('col-panel').style.display='none';}
window.doColEdit=function(){var id=_selColId;closeColPanel();if(id)openMCol(id);}
window.doColDel=function(){
  if(!_selColId)return;var id=_selColId;closeColPanel();
  confirmDel('Eliminar este colaborador?',async function(){await fbDel('colaboradores',id);});
}
window.doColVer=function(){
  var id=_selColId;closeColPanel();if(!id)return;
  var c=DB.colaboradores.find(function(x){return x.id===id});if(!c)return;
  var avatarHtml=c.foto
    ?'<img src="'+c.foto+'" onclick="window.zoomFoto(\''+c.foto+'\')" style="width:72px;height:72px;border-radius:50%;object-fit:cover;cursor:zoom-in;transition:transform .2s" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'">'
    :avEl(c,72);
  document.getElementById('m-col-ver-body').innerHTML=
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">'+avatarHtml
    +'<div><div style="font-size:17px;font-weight:600">'+c.nombre+'</div>'
    +'<div style="font-size:13px;color:#888">'+(c.cargo||'Sin cargo')+'</div></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">'
    +'<div><span style="color:#888">Celular:</span> '+(c.celular||'-')+'</div>'
    +'<div><span style="color:#888">Email:</span> '+(c.email||'-')+'</div>'
    +'<div><span style="color:#888">RH:</span> '+(c.rh||'-')+'</div>'
    +'<div><span style="color:#888">Ingreso:</span> '+(c.ingreso||'-')+'</div>'
    +'<div><span style="color:#888">Egreso:</span> '+(c.egreso||'-')+'</div>'
    +'<div style="grid-column:1/-1"><span style="color:#888">Dirección:</span> '+(c.direccion||'-')+'</div>'
    +'<div style="grid-column:1/-1"><span style="color:#888">Referencia:</span> '+(c.referencia||'-')+'</div>'
    +(c.observaciones?'<div style="grid-column:1/-1"><span style="color:#888">Observaciones:</span> '+c.observaciones+'</div>':'')
    +'</div>';
  openM('m-col-ver');
}

// ── CALENDARIO ACADÉMICO (planificación por curso, entre semana / fines de semana) ────────
function poblarCalpCurso(selectId){
  var sel=document.getElementById(selectId);if(!sel)return;
  var pv=sel.value;
  sel.innerHTML='';
  DB.cursos.forEach(function(c){sel.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});
  if(pv&&DB.cursos.find(function(c){return c.id===pv}))sel.value=pv;
}

var MESES_CALP=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var CAMPOS_CALP=['n1i','n1f','n2i','n2f','n3i','n3f','n4i','n4f'];

function renderCalpTabla(opts){
  poblarCalpCurso(opts.selCurso);
  var cursoId=document.getElementById(opts.selCurso).value;
  var anioInp=document.getElementById(opts.selAnio);
  if(!anioInp.value)anioInp.value=new Date().getFullYear();
  var anio=anioInp.value;
  var tb=document.getElementById(opts.tbodyId);if(!tb)return;
  if(!cursoId){tb.innerHTML='<tr><td colspan="9" style="text-align:center;color:#aaa;padding:20px">Selecciona un curso</td></tr>';return;}
  var docId=cursoId+'_'+anio;
  var datos=DB[opts.coleccion].find(function(d){return d.id===docId});
  tb.innerHTML=MESES_CALP.map(function(mes,mi){
    var fila=(datos&&datos.meses&&datos.meses[mi])||{};
    return'<tr style="border-bottom:1px solid #222">'
      +'<td style="background:'+(opts.colorMes||'#1d4ed8')+';color:#fff;font-weight:600;padding:8px;text-align:center">'+mes+'</td>'
      +CAMPOS_CALP.map(function(campo){
        var val=fila[campo]||'';
        return'<td style="padding:4px;text-align:center;background:#0a0a0a"><input type="date" value="'+val+'" onchange="saveCalpCelda(\''+opts.coleccion+'\',\''+cursoId+'\','+anio+','+mi+',\''+campo+'\',this.value)" style="border:1px solid #333;background:#1a1a1a;color:#fff;border-radius:6px;padding:4px 6px;font-size:12px;width:100%;color-scheme:dark"></td>';
      }).join('')
      +'</tr>';
  }).join('');
}

window.renderCalPlan=function(){
  renderCalpTabla({selCurso:'calp-curso',selAnio:'calp-anio',tbodyId:'calp-body',coleccion:'calendario_plan',colorMes:'#dc2626'});
}
window.renderCalPlanFS=function(){
  renderCalpTabla({selCurso:'calp-curso-fs',selAnio:'calp-anio-fs',tbodyId:'calp-body-fs',coleccion:'calendario_plan_fs',colorMes:'#1d4ed8'});
}

window.saveCalpCelda=async function(coleccion,cursoId,anio,mesIdx,campo,valor){
  var docId=cursoId+'_'+anio;
  var existing=DB[coleccion].find(function(d){return d.id===docId});
  var meses=existing&&existing.meses?existing.meses.slice():new Array(12).fill(null).map(function(){return{}});
  if(!meses[mesIdx])meses[mesIdx]={};
  meses[mesIdx][campo]=valor;
  await fbSet(coleccion,docId,{cursoId:cursoId,anio:parseInt(anio),meses:meses});
}

// ── EFECTIVO / CAJA ────────────────────────────────────────
window.renderCaja=function(){
  var mesFiltro=document.getElementById('caja-mes').value;
  var ingresos=DB.caja_movimientos.filter(function(m){return m.tipo==='ingreso'&&(!mesFiltro||(m.fecha||'').slice(0,7)===mesFiltro)}).sort(function(a,b){return(a.fecha||'')<(b.fecha||'')?-1:1});
  var egresos=DB.caja_movimientos.filter(function(m){return m.tipo==='egreso'&&(!mesFiltro||(m.fecha||'').slice(0,7)===mesFiltro)}).sort(function(a,b){return(a.fecha||'')<(b.fecha||'')?-1:1});

  document.getElementById('caja-ing-body').innerHTML=ingresos.map(function(m){
    return'<tr>'
      +'<td style="padding:4px"><input type="date" value="'+(m.fecha||'')+'" onchange="updCajaFila(\''+m.id+'\',\'fecha\',this.value)" style="font-size:11px;border:1px solid #e0e0e0;border-radius:4px;padding:3px;width:100%"></td>'
      +'<td style="padding:4px"><input value="'+(m.concepto||'').replace(/"/g,'&quot;')+'" onchange="updCajaFila(\''+m.id+'\',\'concepto\',this.value)" placeholder="Concepto" style="font-size:12px;border:1px solid #e0e0e0;border-radius:4px;padding:3px 6px;width:100%"></td>'
      +'<td style="padding:4px"><input type="number" value="'+(m.valor||'')+'" onchange="updCajaFila(\''+m.id+'\',\'valor\',this.value)" placeholder="0" style="font-size:12px;border:1px solid #e0e0e0;border-radius:4px;padding:3px 6px;width:100%"></td>'
      +'<td style="text-align:center"><button onclick="delCajaFila(\''+m.id+'\')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:14px">×</button></td>'
      +'</tr>';
  }).join('')||'<tr><td colspan="4" style="text-align:center;color:#aaa;padding:14px;font-size:12px">Sin movimientos</td></tr>';

  document.getElementById('caja-eg-body').innerHTML=egresos.map(function(m){
    return'<tr>'
      +'<td style="padding:4px"><input type="date" value="'+(m.fecha||'')+'" onchange="updCajaFila(\''+m.id+'\',\'fecha\',this.value)" style="font-size:11px;border:1px solid #e0e0e0;border-radius:4px;padding:3px;width:100%"></td>'
      +'<td style="padding:4px"><input value="'+(m.concepto||'').replace(/"/g,'&quot;')+'" onchange="updCajaFila(\''+m.id+'\',\'concepto\',this.value)" placeholder="Concepto" style="font-size:12px;border:1px solid #e0e0e0;border-radius:4px;padding:3px 6px;width:100%"></td>'
      +'<td style="padding:4px"><input type="number" value="'+(m.valor||'')+'" onchange="updCajaFila(\''+m.id+'\',\'valor\',this.value)" placeholder="0" style="font-size:12px;border:1px solid #e0e0e0;border-radius:4px;padding:3px 6px;width:100%"></td>'
      +'<td style="text-align:center"><button onclick="delCajaFila(\''+m.id+'\')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:14px">×</button></td>'
      +'</tr>';
  }).join('')||'<tr><td colspan="4" style="text-align:center;color:#aaa;padding:14px;font-size:12px">Sin movimientos</td></tr>';

  var totIng=ingresos.reduce(function(s,m){return s+(parseFloat(m.valor)||0)},0);
  var totEg=egresos.reduce(function(s,m){return s+(parseFloat(m.valor)||0)},0);
  document.getElementById('caja-tot-ing').textContent='$'+totIng.toLocaleString('es-CO');
  document.getElementById('caja-tot-eg').textContent='$'+totEg.toLocaleString('es-CO');
  document.getElementById('caja-tot-cash').textContent='$'+(totIng-totEg).toLocaleString('es-CO');
}

window.addCajaFila=async function(tipo){
  await fbAdd('caja_movimientos',{tipo:tipo,fecha:new Date().toISOString().split('T')[0],concepto:'',valor:0});
}

window.updCajaFila=async function(id,campo,valor){
  var data={};
  data[campo]=campo==='valor'?(parseFloat(valor)||0):valor;
  await fbUpd('caja_movimientos',id,data);
}

window.delCajaFila=function(id){
  confirmDel('Eliminar este movimiento?',async function(){await fbDel('caja_movimientos',id);});
}


// ── EXPORTAR ──────────────────────────────────────────────
function toCSV(r,h){var e=function(v){return'"'+String(v||'').replace(/"/g,'""')+'"'};return[h.map(e).join(',')].concat(r.map(function(x){return h.map(function(k){return e(x[k])}).join(',')})).join('\n')}
function dlCSV(c,f){var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(c);a.download=f;a.click()}
window.expAlCSV=function(){dlCSV(toCSV(DB.alumnos.map(function(a){return{Nombre:a.nombre,Cedula:a.cedula,Celular:a.telefono,Programa:gCN(a.moduloId,a.nivel),Fecha_Ingreso:a.ingreso}}),['Nombre','Cedula','Celular','Programa','Fecha_Ingreso']),'Base_Alumnos_Deejay_Academy.csv')}
window.expPagCSV=function(){dlCSV(toCSV(DB.pagos.map(function(p){return{Alumno:gAN(p.alumnoId),Curso:gAC(p.alumnoId),Periodo:p.periodo,Forma:p.forma,Monto:p.monto,Estado:p.estado,Fecha:p.fecha}}),['Alumno','Curso','Periodo','Forma','Monto','Estado','Fecha']),'Reporte_Flujo_Caja.csv')}
window.expEgCSV=function(){dlCSV(toCSV(DB.egresos.map(function(e){return{Fecha:e.fecha,Concepto:e.concepto,Categoria:e.categoria,Valor:e.valor,Notas:e.notas}}),['Fecha','Concepto','Categoria','Valor','Notas']),'Egresos_Deejay_Academy.csv')}

window.expJSON=function(){
  var backup={_version:1,_fecha:new Date().toISOString(),alumnos:DB.alumnos,pagos:DB.pagos,cuotas:DB.cuotas,asistencias:DB.asistencias,cursos:DB.cursos,horario_grupos:DB.horario_grupos,egresos:DB.egresos,cat_egreso:DB.cat_egreso};
  var blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='DJA_Backup_'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
}
window.impJSON=function(){
  var input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var data=JSON.parse(ev.target.result);
        if(!data.alumnos&&!data.cursos){alert('Archivo no valido.');return}
        var total=(data.alumnos||[]).length+(data.pagos||[]).length+(data.cuotas||[]).length+(data.asistencias||[]).length+(data.cursos||[]).length+(data.horario_grupos||[]).length+(data.egresos||[]).length+(data.cat_egreso||[]).length;
        if(!confirm('Importar '+total+' registros? Los existentes NO se eliminan.'))return;
        importarJSON(data);
      }catch(err){alert('Error: '+err.message);}
    };reader.readAsText(file);
  };input.click();
}
async function importarJSON(data){
  var el=document.getElementById('_imp_status');if(el)el.textContent='Importando...';
  var cols=['cursos','alumnos','pagos','cuotas','asistencias','horario_grupos','egresos','cat_egreso'];
  var total=0,done=0;
  cols.forEach(function(c){total+=(data[c]||[]).length});
  for(var ci=0;ci<cols.length;ci++){
    var col=cols[ci],rows=data[col]||[];
    for(var i=0;i<rows.length;i++){
      var row=Object.assign({},rows[i]),id=row.id;delete row.id;delete row._ts;
      try{if(id)await fbSet(col,id,row);else await fbAdd(col,row);}catch(err){console.warn('Error importando '+col,err);}
      done++;if(el)el.textContent='Importando... '+done+'/'+total;
    }
  }
  if(el)el.innerHTML='<span style="color:#15803d;font-weight:600">OK - '+done+' registros importados</span>';
}

// ══════════════════════════════════════════════════════════════
// MÓDULO: EMBUDO DE VENTAS
// ══════════════════════════════════════════════════════════════

var _embudoDragId  = null;
var _etapaEditId   = null;
var _prospEditId   = null;
var _etapaColorSel = '#6b7280';

var ETAPAS_DEFAULT = [
  { nombre:'Nuevo contacto', color:'#6b7280', orden:0 },
  { nombre:'Contactado',     color:'#2563eb', orden:1 },
  { nombre:'Interesado',     color:'#ca8a04', orden:2 },
  { nombre:'Propuesta',      color:'#7c3aed', orden:3 },
  { nombre:'Matriculado',    color:'#16a34a', orden:4 }
];

async function initEtapasDefault() {
  if (DB.embudo_etapas.length === 0) {
    for (var i = 0; i < ETAPAS_DEFAULT.length; i++) {
      await fbAdd('embudo_etapas', ETAPAS_DEFAULT[i]);
    }
  }
}

function renderEmbudo() {
  var board = document.getElementById('embudo-board');
  if (!board) return;
  var etapas = DB.embudo_etapas.slice().sort(function(a,b){ return (a.orden||0)-(b.orden||0); });
  var totalVal = DB.prospectos.reduce(function(s,p){ return s+(parseFloat(p.valor)||0); }, 0);
  var cntEl = document.getElementById('embudo-count');
  var totEl = document.getElementById('embudo-total');
  if (cntEl) cntEl.textContent = DB.prospectos.length + ' prospecto' + (DB.prospectos.length===1?'':'s');
  if (totEl) totEl.textContent = '$' + totalVal.toLocaleString('es-CO');

  if (!etapas.length) {
    board.innerHTML = '<div style="color:#aaa;font-size:13px;padding:24px">Crea tu primera etapa con el botón "Gestionar etapas".</div>';
    return;
  }

  board.innerHTML = etapas.map(function(etapa) {
    var cards = DB.prospectos.filter(function(p){ return p.etapaId === etapa.id; });
    var etapaVal = cards.reduce(function(s,p){ return s+(parseFloat(p.valor)||0); }, 0);
    return '<div class="embudo-col" data-etapa="'+etapa.id+'" '
      + 'ondragover="embudoDragOver(event)" '
      + 'ondrop="embudoDrop(event,\''+etapa.id+'\')" '
      + 'ondragleave="this.classList.remove(\'drag-over\')">'
      + '<div class="embudo-col-head" style="border-top:3px solid '+etapa.color+'">'
        + '<div style="display:flex;align-items:center;gap:6px">'
          + '<span style="font-weight:600;font-size:13px">'+etapa.nombre+'</span>'
          + '<span style="background:#f0f0f0;border-radius:10px;padding:1px 8px;font-size:11px;color:#666">'+cards.length+'</span>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:4px">'
          + (etapaVal ? '<span style="font-size:11px;color:#888">$'+Math.round(etapaVal/1000)+'k</span>' : '')
          + '<button class="btn bo bsm" onclick="editEtapa(\''+etapa.id+'\')" '
          + 'style="padding:2px 5px;font-size:10px;line-height:1">&#9998;</button>'
        + '</div>'
      + '</div>'
      + '<div class="embudo-cards" id="cards-'+etapa.id+'">'
        + (cards.length ? cards.map(function(p){ return renderEmbudoCard(p); }).join('') : '<div style="font-size:11px;color:#ccc;text-align:center;padding:8px">Sin prospectos</div>')
      + '</div>'
      + '<button class="btn bo" onclick="nuevoProspecto(\''+etapa.id+'\')" '
      + 'style="width:100%;margin-top:8px;font-size:12px;color:#bbb;border-style:dashed;padding:5px">+ Agregar</button>'
      + '</div>';
  }).join('')
  + '<div style="padding-top:38px">'
    + '<button class="btn bo" onclick="nuevaEtapa()" '
    + 'style="writing-mode:vertical-lr;height:90px;font-size:11px;color:#ccc;border-style:dashed;padding:6px 5px">+ Nueva etapa</button>'
  + '</div>';
}

function renderEmbudoCard(p) {
  return '<div class="embudo-card" draggable="true" '
    + 'ondragstart="embudoDragStart(event,\''+p.id+'\')" '
    + 'onclick="verProspecto(\''+p.id+'\')">'
    + '<div style="font-weight:600;font-size:13px;margin-bottom:3px">'+(p.nombre||'Sin nombre')+'</div>'
    + (p.telefono ? '<div style="font-size:11px;color:#777;margin-bottom:1px">&#128241; '+p.telefono+'</div>' : '')
    + (p.curso    ? '<div style="font-size:11px;color:#777;margin-bottom:1px">&#127891; '+p.curso+'</div>' : '')
    + (p.valor    ? '<div style="font-size:12px;color:#16a34a;font-weight:600;margin-top:3px">$'+parseFloat(p.valor).toLocaleString('es-CO')+'</div>' : '')
    + (p.fecha    ? '<div style="font-size:10px;color:#ccc;margin-top:3px">'+p.fecha+'</div>' : '')
    + '</div>';
}

// ─── DRAG & DROP ──────────────────────────────────────────────
window.embudoDragStart = function(e, id) {
  _embudoDragId = id;
  e.dataTransfer.effectAllowed = 'move';
};
window.embudoDragOver = function(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
};
window.embudoDrop = async function(e, etapaId) {
  e.preventDefault();
  document.querySelectorAll('.embudo-col').forEach(function(c){ c.classList.remove('drag-over'); });
  if (!_embudoDragId) return;
  await fbUpd('prospectos', _embudoDragId, { etapaId: etapaId });
  _embudoDragId = null;
};

// ─── CRUD PROSPECTOS ──────────────────────────────────────────
window.nuevoProspecto = function(etapaId) {
  _prospEditId = null;
  document.getElementById('mp-tit').textContent = 'Nuevo prospecto';
  document.getElementById('mp-nom').value   = '';
  document.getElementById('mp-tel').value   = '';
  document.getElementById('mp-curso').value = '';
  document.getElementById('mp-valor').value = '';
  document.getElementById('mp-notas').value = '';
  document.getElementById('mp-fecha').value = new Date().toISOString().split('T')[0];
  var etapas = DB.embudo_etapas.slice().sort(function(a,b){ return (a.orden||0)-(b.orden||0); });
  var sel = document.getElementById('mp-etapa');
  sel.innerHTML = etapas.map(function(e){ return '<option value="'+e.id+'">'+e.nombre+'</option>'; }).join('');
  if (etapaId) sel.value = etapaId;
  document.getElementById('mp-del').style.display       = 'none';
  document.getElementById('mp-convertir').style.display = 'none';
  openM('m-prospecto');
};

window.verProspecto = function(id) {
  var p = DB.prospectos.find(function(x){ return x.id === id; });
  if (!p) return;
  _prospEditId = id;
  document.getElementById('mp-tit').textContent  = 'Editar prospecto';
  document.getElementById('mp-nom').value   = p.nombre   || '';
  document.getElementById('mp-tel').value   = p.telefono || '';
  document.getElementById('mp-curso').value = p.curso    || '';
  document.getElementById('mp-valor').value = p.valor    || '';
  document.getElementById('mp-notas').value = p.notas    || '';
  document.getElementById('mp-fecha').value = p.fecha    || '';
  var etapas = DB.embudo_etapas.slice().sort(function(a,b){ return (a.orden||0)-(b.orden||0); });
  var sel = document.getElementById('mp-etapa');
  sel.innerHTML = etapas.map(function(e){ return '<option value="'+e.id+'">'+e.nombre+'</option>'; }).join('');
  sel.value = p.etapaId || '';
  document.getElementById('mp-del').style.display = '';
  var ultima = etapas[etapas.length - 1];
  document.getElementById('mp-convertir').style.display = (ultima && p.etapaId === ultima.id) ? '' : 'none';
  openM('m-prospecto');
};

window.saveProspecto = async function() {
  var nom = document.getElementById('mp-nom').value.trim();
  if (!nom) { alert('El nombre es requerido'); return; }
  var data = {
    nombre:   nom,
    telefono: document.getElementById('mp-tel').value.trim(),
    curso:    document.getElementById('mp-curso').value.trim(),
    valor:    parseFloat(document.getElementById('mp-valor').value) || 0,
    notas:    document.getElementById('mp-notas').value.trim(),
    fecha:    document.getElementById('mp-fecha').value,
    etapaId:  document.getElementById('mp-etapa').value
  };
  if (_prospEditId) { await fbUpd('prospectos', _prospEditId, data); }
  else              { await fbAdd('prospectos', data); }
  closeM('m-prospecto');
};

window.delProspecto = function() {
  if (!_prospEditId) return;
  var pid = _prospEditId;
  confirmDel('Eliminar este prospecto?', async function() {
    await fbDel('prospectos', pid);
  });
  closeM('m-prospecto');
};

window.convertirEnAlumno = function() {
  var p = DB.prospectos.find(function(x){ return x.id === _prospEditId; });
  if (!p) return;
  closeM('m-prospecto');
  setTimeout(function() {
    showPage('alumnos');
    setTimeout(function() {
      window.openMAl();
      setTimeout(function() {
        var nomEl = document.getElementById('f-nom');
        var telEl = document.getElementById('f-tel');
        if (nomEl) nomEl.value = p.nombre   || '';
        if (telEl) telEl.value = p.telefono || '';
      }, 150);
    }, 200);
  }, 100);
};

// ─── CRUD ETAPAS ──────────────────────────────────────────────
window.selEtapaColor = function(color, el) {
  _etapaColorSel = color;
  document.getElementById('met-color').value = color;
  document.querySelectorAll('.met-col-opt').forEach(function(d){ d.style.border = '2px solid transparent'; });
  if (el) el.style.border = '2px solid #1a1a1a';
};

window.nuevaEtapa = function() {
  _etapaEditId   = null;
  _etapaColorSel = '#6b7280';
  document.getElementById('met-tit').textContent = 'Nueva etapa';
  document.getElementById('met-nom').value       = '';
  document.getElementById('met-color').value     = '#6b7280';
  document.querySelectorAll('.met-col-opt').forEach(function(d){ d.style.border = '2px solid transparent'; });
  var def = document.querySelector('.met-col-opt[data-c="#6b7280"]');
  if (def) def.style.border = '2px solid #1a1a1a';
  document.getElementById('met-del').style.display = 'none';
  openM('m-etapa');
};

window.editEtapa = function(id) {
  var e = DB.embudo_etapas.find(function(x){ return x.id === id; });
  if (!e) return;
  _etapaEditId   = id;
  _etapaColorSel = e.color || '#6b7280';
  document.getElementById('met-tit').textContent = 'Editar etapa';
  document.getElementById('met-nom').value       = e.nombre || '';
  document.getElementById('met-color').value     = e.color  || '#6b7280';
  document.querySelectorAll('.met-col-opt').forEach(function(d){
    d.style.border = d.getAttribute('data-c') === e.color ? '2px solid #1a1a1a' : '2px solid transparent';
  });
  document.getElementById('met-del').style.display = '';
  openM('m-etapa');
};

window.saveEtapa = async function() {
  var nom = document.getElementById('met-nom').value.trim();
  if (!nom) { alert('El nombre es requerido'); return; }
  var data = {
    nombre: nom,
    color:  document.getElementById('met-color').value || _etapaColorSel,
    orden:  _etapaEditId
      ? ((DB.embudo_etapas.find(function(e){ return e.id === _etapaEditId; }) || {}).orden || 0)
      : DB.embudo_etapas.length
  };
  if (_etapaEditId) { await fbUpd('embudo_etapas', _etapaEditId, data); }
  else              { await fbAdd('embudo_etapas', data); }
  closeM('m-etapa');
};

window.delEtapa = function() {
  if (!_etapaEditId) return;
  var enUso = DB.prospectos.filter(function(p){ return p.etapaId === _etapaEditId; }).length;
  if (enUso > 0) {
    alert('Esta etapa tiene ' + enUso + ' prospecto(s). Muevelos a otra etapa primero.');
    return;
  }
  var eid = _etapaEditId;
  confirmDel('Eliminar esta etapa?', async function() {
    await fbDel('embudo_etapas', eid);
  });
  closeM('m-etapa');
};
// ── FIN MÓDULO EMBUDO DE VENTAS ──────────────────────────────

// ══════════════════════════════════════════════════════════════
// HELPER COMPARTIDO: timestamp Firestore -> milisegundos
// ══════════════════════════════════════════════════════════════
function getTsMs(x){
  if (!x || !x._ts) return 0;
  if (typeof x._ts.toMillis === 'function') return x._ts.toMillis();
  if (x._ts.seconds) return x._ts.seconds*1000;
  return 0;
}

function fmtFechaHoraInbox(x){
  var ms=getTsMs(x); if(!ms) return '';
  var d=new Date(ms), hoy=new Date();
  var horaStr=d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
  var esHoy=d.toDateString()===hoy.toDateString();
  if(esHoy) return horaStr;
  var ayer=new Date(hoy); ayer.setDate(hoy.getDate()-1);
  if(d.toDateString()===ayer.toDateString()) return 'Ayer '+horaStr;
  return d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit'})+' '+horaStr;
}

// ══════════════════════════════════════════════════════════════
// AUTOMATIZACIÓN: crear prospecto en "Nuevo contacto" cuando
// entra un mensaje de WhatsApp de un teléfono nuevo
// ══════════════════════════════════════════════════════════════
var _prospectosEnProceso = new Set();

async function autoCrearProspectoSiNuevo(mensaje){
  if (mensaje.direccion !== 'entrante' || !mensaje.telefono) return;
  var tel = mensaje.telefono;
  var yaExiste = DB.prospectos.some(function(p){ return p.telefono === tel; });
  if (yaExiste || _prospectosEnProceso.has(tel)) return;
  _prospectosEnProceso.add(tel);
  var etapas = DB.embudo_etapas.slice().sort(function(a,b){ return (a.orden||0)-(b.orden||0); });
  var primera = etapas.find(function(e){ return (e.nombre||'').trim().toLowerCase()==='nuevo contacto'; }) || etapas[0];
  if (!primera) { _prospectosEnProceso.delete(tel); return; }
  try {
    await fbAdd('prospectos', {
      nombre: mensaje.nombre || tel,
      telefono: tel,
      curso: '',
      valor: 0,
      notas: 'Creado automáticamente desde WhatsApp',
      fecha: new Date().toISOString().split('T')[0],
      etapaId: primera.id
    });
  } finally {
    _prospectosEnProceso.delete(tel);
  }
}

// ══════════════════════════════════════════════════════════════
// MÓDULO: CONTACTOS (LEADS ENTRANTES DE WHATSAPP)
// ══════════════════════════════════════════════════════════════
var _leadEditId = null;
var LEAD_ESTADOS = { nuevo:{lbl:'Nuevo',cls:'br'}, contactado:{lbl:'Contactado',cls:'by'}, archivado:{lbl:'Archivado',cls:'bgr'} };

window.renderLeads = function renderLeads(){
  var el=document.getElementById('leads-lista'); if(!el) return;
  var filtro=(document.getElementById('leads-filtro')||{}).value||'';
  var busq=((document.getElementById('leads-busq')||{}).value||'').toLowerCase().trim();
  var arr=DB.leads.slice().sort(function(a,b){ return getTsMs(b)-getTsMs(a); });
  if(filtro) arr=arr.filter(function(l){ return (l.estado||'nuevo')===filtro; });
  if(busq) arr=arr.filter(function(l){ return (l.nombre||'').toLowerCase().indexOf(busq)>-1 || (l.telefono||'').indexOf(busq)>-1; });
  var cntEl=document.getElementById('leads-count'); if(cntEl) cntEl.textContent=arr.length+' contacto'+(arr.length===1?'':'s');
  if(!arr.length){ el.innerHTML='<p style="color:#aaa;padding:20px">Sin contactos todavia.</p>'; return; }
  el.innerHTML=arr.map(function(l){
    var est=LEAD_ESTADOS[l.estado||'nuevo'];
    return '<div class="cc" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
      +'<div style="flex:1;min-width:180px">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px"><b style="font-size:14px">'+(l.nombre||'Sin nombre')+'</b><span class="bdg '+est.cls+'">'+est.lbl+'</span></div>'
        +'<div style="font-size:12px;color:#888">&#128241; '+(l.telefono||'-')+(l.origen?' &middot; '+l.origen:'')+'</div>'
        +(l.mensaje?'<div style="font-size:12px;color:#666;margin-top:4px;max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">&ldquo;'+l.mensaje+'&rdquo;</div>':'')
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-shrink:0">'
        +(l.telefono?'<button class="btn bo bsm" onclick="abrirChatDesdeLead(\''+l.telefono+'\')">&#128172; Chat</button>':'')
        +'<button class="btn bs bsm" onclick="convertirLeadProspecto(\''+l.id+'\')">&#10003; A prospecto</button>'
        +'<button class="btn bo bsm" onclick="editLead(\''+l.id+'\')">Editar</button>'
        +'<button class="btn bd bsm" onclick="delLead(\''+l.id+'\')">X</button>'
      +'</div>'
    +'</div>';
  }).join('');
};

window.nuevoLead=function(){
  _leadEditId=null;
  document.getElementById('ml-tit').textContent='Nuevo contacto';
  ['ml-nom','ml-tel','ml-msg','ml-notas'].forEach(function(id){document.getElementById(id).value=''});
  document.getElementById('ml-estado').value='nuevo';
  document.getElementById('ml-del').style.display='none';
  openM('m-lead');
};
window.editLead=function(id){
  var l=DB.leads.find(function(x){return x.id===id}); if(!l) return;
  _leadEditId=id;
  document.getElementById('ml-tit').textContent='Editar contacto';
  document.getElementById('ml-nom').value=l.nombre||'';
  document.getElementById('ml-tel').value=l.telefono||'';
  document.getElementById('ml-msg').value=l.mensaje||'';
  document.getElementById('ml-notas').value=l.notas||'';
  document.getElementById('ml-estado').value=l.estado||'nuevo';
  document.getElementById('ml-del').style.display='';
  openM('m-lead');
};
window.saveLead=async function(){
  var nom=document.getElementById('ml-nom').value.trim();
  var tel=document.getElementById('ml-tel').value.trim();
  if(!nom && !tel){ alert('Ingresa al menos nombre o telefono'); return; }
  var data={
    nombre:nom, telefono:tel,
    mensaje:document.getElementById('ml-msg').value.trim(),
    notas:document.getElementById('ml-notas').value.trim(),
    estado:document.getElementById('ml-estado').value
  };
  if(_leadEditId){ await fbUpd('leads',_leadEditId,data); }
  else { data.origen='manual'; await fbAdd('leads',data); }
  closeM('m-lead');
};
window.delLead=function(id){
  var lid=id||_leadEditId; if(!lid) return;
  confirmDel('Eliminar este contacto?', async function(){ await fbDel('leads',lid); });
  closeM('m-lead');
};
window.convertirLeadProspecto=async function(id){
  var l=DB.leads.find(function(x){return x.id===id}); if(!l) return;
  var etapas=DB.embudo_etapas.slice().sort(function(a,b){return (a.orden||0)-(b.orden||0)});
  var primera=etapas[0];
  await fbAdd('prospectos',{ nombre:l.nombre||l.telefono||'Sin nombre', telefono:l.telefono||'', curso:'', valor:0, notas:l.mensaje||'', fecha:new Date().toISOString().split('T')[0], etapaId: primera?primera.id:'' });
  await fbUpd('leads', id, { estado:'contactado' });
  alert('Contacto agregado al Embudo de ventas ✓');
};
// ── FIN MÓDULO CONTACTOS ──────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// MÓDULO: PLANTILLAS DE MENSAJES (respuestas rapidas)
// ══════════════════════════════════════════════════════════════
var _tplEditId=null;

window.renderPlantillas = function renderPlantillas(){
  var el=document.getElementById('tpl-lista'); if(!el) return;
  var busq=((document.getElementById('tpl-busq')||{}).value||'').toLowerCase().trim();
  var arr=DB.plantillas.slice().sort(function(a,b){ return (a.categoria||'').localeCompare(b.categoria||'') || (a.titulo||'').localeCompare(b.titulo||''); });
  if(busq) arr=arr.filter(function(t){ return (t.titulo||'').toLowerCase().indexOf(busq)>-1 || (t.texto||'').toLowerCase().indexOf(busq)>-1 || (t.categoria||'').toLowerCase().indexOf(busq)>-1; });
  var cntEl=document.getElementById('tpl-count'); if(cntEl) cntEl.textContent=arr.length+' plantilla'+(arr.length===1?'':'s');
  if(!arr.length){ el.innerHTML='<p style="color:#aaa;padding:20px">Sin plantillas. Crea la primera.</p>'; return; }
  var grupos={};
  arr.forEach(function(t){ var c=t.categoria||'Sin categoria'; (grupos[c]=grupos[c]||[]).push(t); });
  el.innerHTML=Object.keys(grupos).sort().map(function(cat){
    return '<div style="margin-bottom:18px"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">'+cat+'</div>'
      +grupos[cat].map(function(t){
        return '<div class="cc" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">'
          +'<div style="flex:1;min-width:0"><b style="font-size:13px">'+t.titulo+'</b>'
          +'<div style="font-size:12px;color:#666;margin-top:4px;white-space:pre-wrap">'+t.texto+'</div></div>'
          +'<div style="display:flex;gap:6px;flex-shrink:0">'
            +'<button class="btn bo bsm" onclick="copiarPlantilla(\''+t.id+'\',this)">&#128203; Copiar</button>'
            +'<button class="btn bo bsm" onclick="editPlantilla(\''+t.id+'\')">Editar</button>'
            +'<button class="btn bd bsm" onclick="delPlantilla(\''+t.id+'\')">X</button>'
          +'</div>'
        +'</div>';
      }).join('')
    +'</div>';
  }).join('');
};

window.nuevaPlantilla=function(){
  _tplEditId=null;
  document.getElementById('mt-tit').textContent='Nueva plantilla';
  ['mt-titulo','mt-cat','mt-texto'].forEach(function(id){document.getElementById(id).value=''});
  document.getElementById('mt-del').style.display='none';
  openM('m-plantilla');
};
window.editPlantilla=function(id){
  var t=DB.plantillas.find(function(x){return x.id===id}); if(!t) return;
  _tplEditId=id;
  document.getElementById('mt-tit').textContent='Editar plantilla';
  document.getElementById('mt-titulo').value=t.titulo||'';
  document.getElementById('mt-cat').value=t.categoria||'';
  document.getElementById('mt-texto').value=t.texto||'';
  document.getElementById('mt-del').style.display='';
  openM('m-plantilla');
};
window.savePlantilla=async function(){
  var tit=document.getElementById('mt-titulo').value.trim();
  var txt=document.getElementById('mt-texto').value.trim();
  if(!tit||!txt){ alert('Titulo y texto son requeridos'); return; }
  var data={ titulo:tit, categoria:document.getElementById('mt-cat').value.trim()||'General', texto:txt };
  if(_tplEditId){ await fbUpd('plantillas',_tplEditId,data); } else { await fbAdd('plantillas',data); }
  closeM('m-plantilla');
};
window.delPlantilla=function(id){
  var tid=id||_tplEditId; if(!tid) return;
  confirmDel('Eliminar esta plantilla?', async function(){ await fbDel('plantillas',tid); });
  closeM('m-plantilla');
};
window.copiarPlantilla=function(id, btn){
  var t=DB.plantillas.find(function(x){return x.id===id}); if(!t) return;
  navigator.clipboard.writeText(t.texto).then(function(){
    if(!btn) return;
    var orig=btn.innerHTML; btn.innerHTML='&#10003; Copiado'; setTimeout(function(){btn.innerHTML=orig},1200);
  });
};
function poblarSelectPlantillasInbox(){
  var sel=document.getElementById('inbox-tpl-sel'); if(!sel) return;
  var pv=sel.value;
  sel.innerHTML='<option value="">Usar plantilla...</option>'+DB.plantillas.slice().sort(function(a,b){return (a.titulo||'').localeCompare(b.titulo||'')}).map(function(t){return '<option value="'+t.id+'">'+t.titulo+'</option>'}).join('');
  sel.value=pv;
  var dl=document.getElementById('dl-cat-tpl');
  if(dl){ var cats=Array.from(new Set(DB.plantillas.map(function(t){return t.categoria}).filter(Boolean))); dl.innerHTML=cats.map(function(c){return '<option value="'+c+'">'}).join(''); }
}
window.usarPlantillaEnChat=function(){
  var sel=document.getElementById('inbox-tpl-sel');
  var id=sel.value; if(!id) return;
  var t=DB.plantillas.find(function(x){return x.id===id}); if(!t) return;
  document.getElementById('inbox-input').value=t.texto;
  sel.value='';
  document.getElementById('inbox-input').focus();
};
// ── FIN MÓDULO PLANTILLAS ─────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// MÓDULO: INBOX DE WHATSAPP
// ══════════════════════════════════════════════════════════════
var _inboxTelActivo=null;
var _inboxSearchQ='';
var _inboxFavoritos={};
var _inboxFijados={};

function inboxConversaciones(){
  var byTel={};
  DB.whatsapp_mensajes.forEach(function(m){
    if(!m.telefono) return;
    if(!byTel[m.telefono]) byTel[m.telefono]={telefono:m.telefono, nombre:m.nombre||'', ultimo:m, noLeidos:0};
    if(getTsMs(m) > getTsMs(byTel[m.telefono].ultimo)) byTel[m.telefono].ultimo=m;
    if(m.nombre && !byTel[m.telefono].nombre) byTel[m.telefono].nombre=m.nombre;
    if(m.direccion==='entrante' && !m.leido) byTel[m.telefono].noLeidos++;
  });
  return Object.keys(byTel).map(function(k){return byTel[k]}).sort(function(a,b){
    var fa=_inboxFijados[a.telefono]?1:0, fb=_inboxFijados[b.telefono]?1:0;
    if(fa!==fb) return fb-fa;
    return getTsMs(b.ultimo)-getTsMs(a.ultimo);
  });
}

window.renderInboxBadge = function renderInboxBadge(){
  var n=DB.whatsapp_mensajes.filter(function(m){return m.direccion==='entrante' && !m.leido}).length;
  var b=document.getElementById('badge-inbox');
  if(b){ if(n>0){b.textContent=n;b.style.display='inline'} else b.style.display='none' }
};

function ensureInboxSearchBox(){
  if(document.getElementById('inbox-search-box')) return;
  var listEl=document.getElementById('inbox-lista');
  if(!listEl||!listEl.parentNode) return;
  var box=document.createElement('div');
  box.id='inbox-search-box';
  box.style.cssText='padding:10px 10px 8px 10px';
  box.innerHTML=
    '<input id="inbox-search-input" placeholder="Buscar por nombre, numero o mensaje..." '
    +'style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #6b5d45;background:#4a4030;color:#f5efdc;font-size:13px;outline:none;box-sizing:border-box">'
    +'<div style="display:flex;gap:6px;margin-top:8px">'
      +'<button id="inbox-filtro-todos" class="inbox-filtro-btn" style="flex:1;padding:5px;border-radius:7px;border:1px solid #333;background:#222;color:#eee;font-size:11px;cursor:pointer">Todos</button>'
      +'<button id="inbox-filtro-fav" class="inbox-filtro-btn" style="flex:1;padding:5px;border-radius:7px;border:1px solid #333;background:transparent;color:#aaa;font-size:11px;cursor:pointer">&#9733; Favoritos</button>'
      +'<button id="inbox-filtro-fij" class="inbox-filtro-btn" style="flex:1;padding:5px;border-radius:7px;border:1px solid #333;background:transparent;color:#aaa;font-size:11px;cursor:pointer">&#128204; Fijados</button>'
      +'<button id="inbox-filtro-arch" class="inbox-filtro-btn" style="flex:1;padding:5px;border-radius:7px;border:1px solid #333;background:transparent;color:#aaa;font-size:11px;cursor:pointer">&#128230; Cerrados</button>'
    +'</div>';
  listEl.parentNode.insertBefore(box, listEl);
  document.getElementById('inbox-search-input').addEventListener('input', function(e){
    _inboxSearchQ=e.target.value.toLowerCase().trim();
    renderInbox();
  });
  ['inbox-filtro-todos','inbox-filtro-fav','inbox-filtro-fij','inbox-filtro-arch'].forEach(function(id){
    document.getElementById(id).addEventListener('click', function(){
      window._inboxFiltroActivo = id;
      ['inbox-filtro-todos','inbox-filtro-fav','inbox-filtro-fij','inbox-filtro-arch'].forEach(function(bid){
        var b=document.getElementById(bid);
        b.style.background = bid===id ? '#e8c547' : 'transparent';
        b.style.color = bid===id ? '#1a1a2e' : '#aaa';
      });
      renderInbox();
    });
  });
}
window._inboxFiltroActivo='inbox-filtro-todos';

window.toggleFavoritoChat=function(tel,ev){
  if(ev) ev.stopPropagation();
  _inboxFavoritos[tel]=!_inboxFavoritos[tel];
  renderInbox();
};
window.toggleFijarChat=function(tel,ev){
  if(ev) ev.stopPropagation();
  _inboxFijados[tel]=!_inboxFijados[tel];
  renderInbox();
};

function estaArchivada(tel){
  var doc=DB.inbox_archivados.find(function(a){ return a.id===tel; });
  return !!(doc && doc.archivada);
}
window.cerrarConversacion=async function(tel){
  if(!tel) return;
  await fbSet('inbox_archivados', tel, { archivada:true, fecha:new Date().toISOString() });
};
window.reabrirConversacion=async function(tel){
  if(!tel) return;
  await fbSet('inbox_archivados', tel, { archivada:false, fecha:new Date().toISOString() });
};

var EMOJIS_INBOX=['😀','😂','😍','👍','🙏','🎉','🔥','❤️','😊','🙌','✅','📅','🎵','🎧','💰','📍','⏰','😅','🤔','👏','🎧','🕺','💬','📞'];
var MAX_ARCHIVO_BYTES = 10 * 1024 * 1024; // 10 MB

function ensureEmojiPicker(){
  var wrap=document.getElementById('inbox-reply-wrap');
  if(!wrap||document.getElementById('inbox-emoji-btn')) return;
  wrap.style.position=wrap.style.position||'relative';
  var btn=document.createElement('button');
  btn.id='inbox-emoji-btn'; btn.type='button'; btn.textContent='😊';
  btn.style.cssText='font-size:18px;background:none;border:none;cursor:pointer;padding:0 8px;flex-shrink:0';
  btn.onclick=function(e){ e.stopPropagation(); var p=document.getElementById('inbox-emoji-panel'); p.style.display=p.style.display==='none'?'grid':'none'; };
  wrap.insertBefore(btn, wrap.firstChild);
  var panel=document.createElement('div');
  panel.id='inbox-emoji-panel';
  panel.style.cssText='display:none;position:absolute;bottom:56px;left:0;background:#1e1e1e;border:1px solid #333;border-radius:10px;padding:8px;grid-template-columns:repeat(8,1fr);gap:2px;z-index:60;box-shadow:0 4px 16px rgba(0,0,0,.4)';
  panel.innerHTML=EMOJIS_INBOX.map(function(em){return '<span onclick="window.insertEmoji(\''+em+'\')" style="cursor:pointer;font-size:19px;padding:4px;text-align:center;border-radius:6px">'+em+'</span>';}).join('');
  wrap.appendChild(panel);
  document.addEventListener('click', function(ev){
    if(panel.style.display!=='none' && ev.target!==btn && !panel.contains(ev.target)) panel.style.display='none';
  });

  // Botón de adjuntar archivos
  var abtn=document.createElement('button');
  abtn.id='inbox-attach-btn'; abtn.type='button'; abtn.textContent='📎';
  abtn.title='Adjuntar imagen, video o PDF (máx 10MB)';
  abtn.style.cssText='font-size:18px;background:none;border:none;cursor:pointer;padding:0 8px;flex-shrink:0';
  wrap.insertBefore(abtn, btn.nextSibling);
  var finput=document.createElement('input');
  finput.type='file'; finput.id='inbox-file-input'; finput.style.display='none';
  finput.accept='image/*,video/*,application/pdf';
  wrap.appendChild(finput);
  abtn.onclick=function(e){ e.stopPropagation(); finput.value=''; finput.click(); };
  finput.onchange=function(e){
    var f=e.target.files[0]; if(!f) return;
    window.enviarArchivoInboxMsg(f);
  };
}
window.insertEmoji=function(em){
  var ta=document.getElementById('inbox-input'); if(!ta) return;
  var start=ta.selectionStart||ta.value.length, end=ta.selectionEnd||ta.value.length;
  ta.value=ta.value.slice(0,start)+em+ta.value.slice(end);
  ta.focus(); ta.selectionStart=ta.selectionEnd=start+em.length;
  var panel=document.getElementById('inbox-emoji-panel'); if(panel) panel.style.display='none';
};

function tipoArchivoWA(mime){
  if(mime.indexOf('image/')===0) return 'image';
  if(mime.indexOf('video/')===0) return 'video';
  return 'document';
}

window.enviarArchivoInboxMsg=async function(file){
  if(!_inboxTelActivo){ alert('Selecciona una conversacion primero.'); return; }
  if(file.size > MAX_ARCHIVO_BYTES){
    alert('El archivo pesa '+(file.size/1024/1024).toFixed(1)+' MB. El maximo permitido es 10 MB.');
    return;
  }
  var tipo=tipoArchivoWA(file.type);
  var statusId=null;
  try{
    statusId = await fbAdd('whatsapp_mensajes', {
      telefono:_inboxTelActivo, direccion:'saliente', texto:'Subiendo archivo...',
      tipo:'subiendo', estado:'subiendo', leido:true
    });
    var fd=new FormData();
    fd.append('archivo', file);
    fd.append('telefono', _inboxTelActivo);
    var resp=await fetch('https://api.djacademy.com.co/upload-media', { method:'POST', body:fd });
    var data=await resp.json();
    if(!data.ok) throw new Error(data.error || 'Error subiendo el archivo');
    await fbUpd('whatsapp_mensajes', statusId, {
      texto:'', tipo:tipo, archivoUrl:data.url, archivoNombre:file.name, estado:'pendiente'
    });
  }catch(err){
    console.error('Error subiendo archivo:', err);
    if(statusId) await fbUpd('whatsapp_mensajes', statusId, {texto:'Error al subir el archivo', estado:'error'});
    alert('No se pudo subir el archivo: '+err.message);
  }
};

window.renderInbox = function renderInbox(){
  var listEl=document.getElementById('inbox-lista'); if(!listEl) return;
  ensureInboxSearchBox();
  ensureEmojiPicker();
  var convs=inboxConversaciones();

  if(_inboxSearchQ){
    convs=convs.filter(function(c){
      if((c.nombre||'').toLowerCase().indexOf(_inboxSearchQ)>-1) return true;
      if((c.telefono||'').toLowerCase().indexOf(_inboxSearchQ)>-1) return true;
      var msgs=DB.whatsapp_mensajes.filter(function(m){return m.telefono===c.telefono});
      return msgs.some(function(m){ return (m.texto||'').toLowerCase().indexOf(_inboxSearchQ)>-1; });
    });
  }
  if(window._inboxFiltroActivo==='inbox-filtro-fav') convs=convs.filter(function(c){return _inboxFavoritos[c.telefono];});
  else if(window._inboxFiltroActivo==='inbox-filtro-fij') convs=convs.filter(function(c){return _inboxFijados[c.telefono];});
  else if(window._inboxFiltroActivo==='inbox-filtro-arch') convs=convs.filter(function(c){return estaArchivada(c.telefono);});
  else convs=convs.filter(function(c){return !estaArchivada(c.telefono);});

  if(!convs.length){
    listEl.innerHTML='<div style="color:#aaa;font-size:13px;padding:20px;text-align:center">'+(_inboxSearchQ?'Sin resultados para tu busqueda.':'Aun no hay conversaciones.<br>Apareceran aqui cuando el agente reciba mensajes.')+'</div>';
  } else {
    listEl.innerHTML=convs.map(function(c){
      var activo=c.telefono===_inboxTelActivo;
      var previewMap={image:'📷 Foto', video:'🎥 Video', document:'📄 Documento', subiendo:'Subiendo archivo...'};
      var preview=previewMap[c.ultimo.tipo] || (c.ultimo.texto||'').slice(0,38);
      var esFav=!!_inboxFavoritos[c.telefono], esFij=!!_inboxFijados[c.telefono];
      return '<div class="inbox-item'+(activo?' active':'')+'" onclick="abrirChat(\''+c.telefono+'\')" style="position:relative">'
        +'<div class="avp" style="flex-shrink:0">'+(c.nombre?c.nombre[0].toUpperCase():'?')+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">'
            +'<b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(esFij?'&#128204; ':'')+(c.nombre||c.telefono)+'</b>'
            +'<span style="font-size:10px;color:#888;flex-shrink:0">'+fmtFechaHoraInbox(c.ultimo)+'</span>'
          +'</div>'
          +'<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">'
            +'<span style="font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(c.ultimo.direccion==='saliente'?'Tu: ':'')+preview+'</span>'
            +(c.noLeidos?'<span class="bdg br" style="flex-shrink:0">'+c.noLeidos+'</span>':'')
          +'</div>'
        +'</div>'
        +'<span onclick="window.toggleFavoritoChat(\''+c.telefono+'\',event)" title="Favorito" style="cursor:pointer;font-size:14px;color:'+(esFav?'#e8c547':'#444')+';flex-shrink:0">&#9733;</span>'
        +'<span onclick="window.toggleFijarChat(\''+c.telefono+'\',event)" title="Fijar" style="cursor:pointer;font-size:13px;color:'+(esFij?'#e8c547':'#444')+';flex-shrink:0">&#128204;</span>'
      +'</div>';
    }).join('');
  }
  if(_inboxTelActivo) renderChat(_inboxTelActivo);
  else {
    var chatEl=document.getElementById('inbox-chat'); if(chatEl) chatEl.innerHTML='<div style="color:#aaa;font-size:13px;padding:24px;text-align:center;margin:auto">Selecciona una conversacion</div>';
    var hEl=document.getElementById('inbox-chat-head'); if(hEl) hEl.innerHTML='';
    var rEl=document.getElementById('inbox-reply-wrap'); if(rEl) rEl.style.display='none';
  }
};

window.abrirChat=function(tel){
  _inboxTelActivo=tel;
  DB.whatsapp_mensajes.filter(function(m){return m.telefono===tel && m.direccion==='entrante' && !m.leido}).forEach(function(m){ fbUpd('whatsapp_mensajes', m.id, {leido:true}); });
  renderInbox();
};
window.abrirChatDesdeLead=function(tel){
  showPage('inbox');
  setTimeout(function(){ window.abrirChat(tel); }, 150);
};

function renderChat(tel){
  var wrap=document.getElementById('inbox-chat'); if(!wrap) return;
  var msgs=DB.whatsapp_mensajes.filter(function(m){return m.telefono===tel}).sort(function(a,b){return getTsMs(a)-getTsMs(b)});
  var conv=inboxConversaciones().find(function(c){return c.telefono===tel});
  var hEl=document.getElementById('inbox-chat-head');
  if(hEl){
    var cerrada=estaArchivada(tel);
    hEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;width:100%">'
      +'<div><b>'+(conv&&conv.nombre?conv.nombre:tel)+'</b><span style="color:#888;font-size:12px;margin-left:8px">'+tel+'</span>'+(cerrada?'<span style="margin-left:8px;font-size:11px;color:#e8c547">&#128230; Cerrada</span>':'')+'</div>'
      +(cerrada
        ? '<button onclick="window.reabrirConversacion(\''+tel+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid #333;background:#222;color:#e8c547;font-size:12px;cursor:pointer">Reabrir conversacion</button>'
        : '<button onclick="window.cerrarConversacion(\''+tel+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid #333;background:#222;color:#eee;font-size:12px;cursor:pointer">&#10003; Cerrar conversacion</button>')
      +'</div>';
  }
  wrap.innerHTML=msgs.map(function(m){
    var mine=m.direccion==='saliente';
    var estBadge = mine && m.estado==='pendiente' ? ' <span style="opacity:.6;font-size:10px">&#8226; enviando</span>' : (mine && (m.estado==='error') ? ' <span style="color:#b91c1c;font-size:10px">&#8226; error al enviar</span>' : (mine && m.estado==='subiendo' ? ' <span style="opacity:.6;font-size:10px">&#8226; subiendo...</span>' : ''));
    var hora='<div style="font-size:10px;opacity:.55;margin-top:3px;text-align:right">'+fmtFechaHoraInbox(m)+'</div>';
    var contenido;
    if(m.tipo==='image' && m.archivoUrl){
      contenido='<img src="'+m.archivoUrl+'" style="max-width:220px;border-radius:8px;display:block;cursor:zoom-in" onclick="window.zoomFoto(\''+m.archivoUrl+'\')">'+(m.texto?'<div style="margin-top:4px">'+m.texto+'</div>':'');
    } else if(m.tipo==='video' && m.archivoUrl){
      contenido='<video src="'+m.archivoUrl+'" controls style="max-width:220px;border-radius:8px;display:block"></video>'+(m.texto?'<div style="margin-top:4px">'+m.texto+'</div>':'');
    } else if(m.tipo==='document' && m.archivoUrl){
      contenido='<a href="'+m.archivoUrl+'" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;background:rgba(0,0,0,.08);border-radius:8px;padding:8px 10px"><span style="font-size:20px">&#128196;</span><span style="font-size:12px;word-break:break-all">'+(m.archivoNombre||'Documento')+'</span></a>';
    } else if(m.tipo==='subiendo'){
      contenido='<span style="opacity:.7;font-style:italic">Subiendo archivo...</span>';
    } else {
      contenido=m.texto;
    }
    return '<div style="display:flex;justify-content:'+(mine?'flex-end':'flex-start')+';margin-bottom:8px">'
      +'<div style="max-width:70%;padding:8px 12px;border-radius:12px;font-size:13px;white-space:pre-wrap;background:'+(mine?'#e8c547;color:#1a1a2e':'#f0f0f0;color:#222')+'">'+contenido+estBadge+hora+'</div>'
    +'</div>';
  }).join('');
  wrap.scrollTop=wrap.scrollHeight;
  var rEl=document.getElementById('inbox-reply-wrap'); if(rEl) rEl.style.display=tel?'flex':'none';
}

window.enviarInboxMsg=async function(){
  if(!_inboxTelActivo) return;
  var ta=document.getElementById('inbox-input');
  var txt=ta.value.trim();
  if(!txt) return;
  ta.value='';
  await fbAdd('whatsapp_mensajes', { telefono:_inboxTelActivo, direccion:'saliente', texto:txt, estado:'pendiente', leido:true });
};
window.inboxInputKey=function(e){
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); window.enviarInboxMsg(); }
};
// ── FIN MÓDULO INBOX ───────────────────────────────────────────
