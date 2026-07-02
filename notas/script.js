// ============================================================
//  DEEJAY ACADEMY — SISTEMA DE NOTAS — script.js (Firebase)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔗 Mismo proyecto Firebase de la base de Alumnos: comparte alumnos y cursos.
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

// App secundaria: permite crear usuarios (profesores/alumnos) sin cerrar la sesión del admin.
const fbAppSec = initializeApp(firebaseConfig, "secundaria");
const authSec  = getAuth(fbAppSec);

async function fbAdd(col, data) { const r = await addDoc(collection(db, col), {...data, _ts: serverTimestamp()}); return r.id; }
async function fbUpd(col, id, data) { await updateDoc(doc(db, col, id), {...data, _ts: serverTimestamp()}); }
async function fbSet(col, id, data) { await setDoc(doc(db, col, id), {...data, _ts: serverTimestamp()}, {merge:true}); }
async function fbDel(col, id) { await deleteDoc(doc(db, col, id)); }

var DB = { alumnos:[], cursos:[], materias:[], notas:[], roles:[], pagos:[], cuotas:[], calendario_plan:[], calendario_plan_fs:[], eventos:[] };
var rolActual = null, rolData = null, currentUserEmail = null, rolesEscuchado = false;

function listenCol(col, key, cb, ordered) {
  ordered = ordered !== false;
  const ref = collection(db, col);
  const q = ordered ? query(ref, orderBy("_ts", "desc")) : ref;
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
      + '<div style="font-size:20px;font-weight:800;color:#000000;margin-bottom:2px">DEEJAY ACADEMY</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:24px">Sistema de Notas · Profesores y Alumnos</div>'
      + '<input id="_lemail" type="email" placeholder="Correo electronico" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;margin-bottom:10px">'
      + '<input id="_lpwd" type="password" placeholder="Contrasena" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;margin-bottom:12px">'
      + '<div id="_lerr" style="color:#b91c1c;font-size:12px;min-height:18px;margin-bottom:8px"></div>'
      + '<button onclick="doLogin()" style="width:100%;padding:11px;background:#c0392b;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Entrar</button>'
      + '</div>';
    document.body.appendChild(ov);
    document.getElementById('_lpwd').addEventListener('keydown', function(e){ if(e.key==='Enter') window.doLogin(); });
  }
  if (error) document.getElementById('_lerr').textContent = error;
  document.getElementById('_lemail').focus();
}

window.doLogin = async function() {
  var email = document.getElementById('_lemail').value.trim();
  var pwd = document.getElementById('_lpwd').value.trim();
  if (!email || !pwd) { document.getElementById('_lerr').textContent = 'Ingresa email y contrasena.'; return; }
  try { await signInWithEmailAndPassword(auth, email, pwd); }
  catch(e) {
    console.warn('Login error code:', e.code);
    document.getElementById('_lerr').textContent = 'Email o contrasena incorrectos. ('+e.code+')';
    document.getElementById('_lpwd').value = '';
  }
};

window.doLogout = async function() { await signOut(auth); };

async function obtenerRoleDoc(email) {
  try { var s = await getDoc(doc(db, 'roles', email.toLowerCase())); return s.exists() ? s.data() : null; }
  catch(e) { return null; }
}

// ── VISIBILIDAD POR ROL ─────────────────────────────────────
function applyRoleVisibility() {
  document.querySelectorAll('[data-roles]').forEach(function(el){
    var roles = el.getAttribute('data-roles').split(',');
    el.style.display = roles.indexOf(rolActual) > -1 ? '' : 'none';
  });
}

function setupTopbarUser(email) {
  var ac = document.getElementById('topbar-acts');
  if (!ac) return;
  var pill = document.getElementById('_role_pill');
  if (!pill) {
    pill = document.createElement('span'); pill.id='_role_pill'; pill.className='role-pill';
    ac.appendChild(pill);
  }
  var ROL_LBL = {admin:'Administrador', profesor:'Profesor', alumno:'Alumno'};
  pill.textContent = (ROL_LBL[rolActual]||rolActual) + ' · ' + email;
  if (!document.getElementById('_logout_btn')) {
    var btn = document.createElement('button');
    btn.id = '_logout_btn'; btn.className = 'btn bo bsm';
    btn.textContent = 'Cerrar sesión'; btn.onclick = window.doLogout;
    ac.appendChild(btn);
  }
}

// ── INIT APP ──────────────────────────────────────────────
function initApp() {
  listenCol("cursos",   "cursos",   function(){ poblarSelects(); rerenderActiva(); });
  listenCol("alumnos",  "alumnos",  function(){ poblarSelects(); rerenderActiva(); });
  listenCol("materias", "materias", function(){ poblarSelects(); rerenderActiva(); });
  listenCol("notas",    "notas",    function(){ rerenderActiva(); });
  if (rolActual === 'admin' && !rolesEscuchado) {
    rolesEscuchado = true;
    listenCol("roles", "roles", function(){ poblarSelects(); rerenderActiva(); }, false);
  }
  if (rolActual === 'admin' || rolActual === 'profesor') {
    listenCol("pagos",  "pagos",  function(){ rerenderActiva(); }, false);
    listenCol("cuotas", "cuotas", function(){ rerenderActiva(); }, false);
    listenCol("calendario_plan",    "calendario_plan",    function(){ rerenderActiva(); }, false);
    listenCol("calendario_plan_fs", "calendario_plan_fs", function(){ rerenderActiva(); }, false);
    listenCol("eventos", "eventos", function(){ rerenderActiva(); }, false);
  }
}

function rerenderActiva() {
  var p = document.querySelector('.page.active');
  if (!p) return;
  var id = p.id.replace('page-','');
  var fns = {dashboard:renderDash, calificar:function(){renderCalificar();renderBoletin();}, misnotas:renderMisNotas, materias:renderMaterias, accesos:renderAccesos, calendario:function(){renderCalNotas();renderCalNotasFS();renderEventos();}};
  if (fns[id]) fns[id]();
}

window.addEventListener("DOMContentLoaded", function() {
  onAuthStateChanged(auth, async function(user) {
    if (user) {
      currentUserEmail = user.email.toLowerCase();
      var ov = document.getElementById('_login'); if (ov) ov.remove();
      var roleDoc = await obtenerRoleDoc(currentUserEmail);
      if (!roleDoc || ['admin','profesor','alumno'].indexOf(roleDoc.rol) === -1) {
        openM('m-denegado');
        return;
      }
      closeM('m-denegado');
      rolActual = roleDoc.rol; rolData = roleDoc;
      applyRoleVisibility();
      setupTopbarUser(user.email);
      var dashNav = document.querySelector('.ni[data-page="dashboard"]');
      showPage('dashboard', dashNav);
      initApp();
    } else {
      ['_logout_btn','_role_pill','_user_label'].forEach(function(id){ var e=document.getElementById(id); if(e) e.remove(); });
      rolActual = null; rolData = null; rolesEscuchado = false;
      DB = { alumnos:[], cursos:[], materias:[], notas:[], roles:[], pagos:[], cuotas:[] };
      closeM('m-denegado');
      mostrarLogin();
    }
  });
});

// ── HELPERS ───────────────────────────────────────────────
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function openM(id){var e=document.getElementById(id); if(e) e.classList.add('show')}
function closeM(id){var e=document.getElementById(id); if(e) e.classList.remove('show')}
window.openM=openM; window.closeM=closeM;
function confirmDel(msg, cb){ if(confirm(msg)) cb(); }

function gA(id){return DB.alumnos.find(function(x){return x.id===id})}
function gC(id){return DB.cursos.find(function(x){return x.id===id})}
function gM(id){return DB.materias.find(function(x){return x.id===id})}
function gCN(id){var c=gC(id);return c?c.nombre:'-'}
function gNota(alId, matId){return DB.notas.find(function(n){return n.alumnoId===alId && n.materiaId===matId})}
function avEl(a,sz){sz=sz||30;if(a.foto)return'<img src="'+a.foto+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover">';var i=(a.nombre||'?').split(' ').slice(0,2).map(function(w){return w[0]}).join('').toUpperCase();return'<div class="avp" style="width:'+sz+'px;height:'+sz+'px;font-size:'+Math.floor(sz*.38)+'px">'+i+'</div>'}
function bdg(e){var m={Pagado:'bg',Pendiente:'by',Vencido:'br',Presente:'bg',Ausente:'br',Tardanza:'by'};return'<span class="bdg '+(m[e]||'bgr')+'">'+(e||'-')+'</span>'}

function definitivaDe(nota){
  if(!nota) return null;
  var vals=[nota.c1,nota.c2,nota.c3,nota.c4].filter(function(v){return v!==undefined&&v!==null&&v!==''}).map(parseFloat);
  if(!vals.length) return null;
  return Math.round((vals.reduce(function(a,b){return a+b},0)/vals.length)*10)/10;
}
function estadoNota(def){
  if(def===null) return {cls:'bgr',txt:'Pendiente'};
  if(def>=3) return {cls:'bg',txt:'Aprobado'};
  return {cls:'br',txt:'Reprobado'};
}
function fmtDef(def){ return def!==null ? def.toFixed(1) : '-'; }

function renderBarChart(containerId, items){
  var el=document.getElementById(containerId); if(!el) return;
  if(!items.length){ el.innerHTML='<div class="empty-state">Sin datos para mostrar.</div>'; return; }
  el.innerHTML='<div class="cbw">'+items.map(function(it){
    var h = it.val!==null ? Math.max(4, Math.round(it.val/5*110)) : 4;
    return '<div class="cbc"><div class="cbv">'+(it.val!==null?it.val.toFixed(1):'-')+'</div><div class="cb" style="height:'+h+'px"></div><div class="cbl">'+it.lbl+'</div></div>';
  }).join('')+'</div>';
}

// ── POBLAR SELECTS ──────────────────────────────────────────
function poblarSelects(){
  fillSelect('f-mat-cur', [{v:'',t:'Todos los cursos'}].concat(DB.cursos.map(function(c){return{v:c.id,t:c.nombre}})));
  fillSelect('mm-cur', [{v:'',t:'Seleccionar...'}].concat(DB.cursos.map(function(c){return{v:c.id,t:c.nombre}})));
  var profs = DB.roles.filter(function(r){return ['profesor','admin','asistente'].indexOf(r.rol) > -1});
  fillSelect('mm-prof', [{v:'',t:'Sin asignar'}].concat(profs.map(function(p){return{v:p.id,t:p.nombre||p.id}})));

  var materiasProf = rolActual==='profesor' ? DB.materias.filter(function(m){return m.profesorEmail===currentUserEmail}) : DB.materias;
  fillSelect('cal-materia', [{v:'',t:'Selecciona una materia...'}].concat(materiasProf.map(function(m){return{v:m.id,t:m.nombre+' · '+gCN(m.cursoId)}})));

  fillSelect('bol-alumno', [{v:'',t:'Selecciona un alumno...'}].concat(DB.alumnos.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).map(function(a){return{v:a.id,t:a.nombre}})));

  fillSelect('aa-al', [{v:'',t:'Seleccionar alumno...'}].concat(DB.alumnos.slice().sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')}).map(function(a){return{v:a.id,t:a.nombre}})));

  fillSelect('ev-materia', [{v:'',t:'Ninguna / General'}].concat(DB.materias.map(function(m){return{v:m.id,t:m.nombre+' · '+gCN(m.cursoId)}})));
}
function fillSelect(id, opts){
  var s=document.getElementById(id); if(!s) return;
  var pv=s.value;
  s.innerHTML=opts.map(function(o){return '<option value="'+o.v+'">'+o.t+'</option>'}).join('');
  if(pv && opts.some(function(o){return o.v===pv})) s.value=pv;
}

// ── NAVEGACIÓN ────────────────────────────────────────────
window.showPage=function(id,el){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active')});
  document.getElementById('page-'+id).classList.add('active');
  if(el)el.classList.add('active');
  var T={dashboard:'Dashboard',calificar:'Calificar',misnotas:'Mis Notas',materias:'Materias',accesos:'Accesos',calendario:'Calendario'};
  document.getElementById('page-title').textContent=T[id]||id;

  var ac=document.getElementById('topbar-acts');
  var pill=document.getElementById('_role_pill'), logoutBtn=document.getElementById('_logout_btn');
  ac.innerHTML='';
  if(id==='materias' && (rolActual==='admin' || rolActual==='profesor')) ac.innerHTML='<button class="btn bp bsm" onclick="openMMateria()">+ Nueva materia</button>';
  if(pill) ac.appendChild(pill);
  if(logoutBtn) ac.appendChild(logoutBtn);

  var fns={dashboard:renderDash, calificar:function(){renderCalificar();renderBoletin();}, misnotas:renderMisNotas, materias:renderMaterias, accesos:function(){listenRolesIfNeeded();renderAccesos();}, calendario:function(){renderCalNotas();renderCalNotasFS();renderEventos();}};
  if(fns[id]) fns[id]();
}
function listenRolesIfNeeded(){
  if(rolActual==='admin' && !rolesEscuchado){ rolesEscuchado=true; listenCol("roles","roles",function(){poblarSelects();rerenderActiva();}, false); }
}

window.swCalTab=function(tab,el){
  document.querySelectorAll('#page-calificar .tab').forEach(function(t){t.classList.remove('active')});
  el.classList.add('active');
  document.getElementById('cal-tab-ingresar').style.display = tab==='ingresar'?'':'none';
  document.getElementById('cal-tab-boletin').style.display = tab==='boletin'?'':'none';
}
window.swAccTab=function(tab,el){
  document.querySelectorAll('#page-accesos .tab').forEach(function(t){t.classList.remove('active')});
  el.classList.add('active');
  document.getElementById('acc-tab-prof').style.display = tab==='prof'?'':'none';
  document.getElementById('acc-tab-alu').style.display = tab==='alu'?'':'none';
}

window.swCalendarioTab=function(tab,el){
  document.querySelectorAll('#page-calendario .tab').forEach(function(t){t.classList.remove('active')});
  el.classList.add('active');
  document.getElementById('calt-plan').style.display = tab==='plan'?'':'none';
  document.getElementById('calt-eventos').style.display = tab==='eventos'?'':'none';
}

// ── DASHBOARD ─────────────────────────────────────────────
function renderDash(){
  var cards=[], chartItems=[], chartTitle='Promedio por materia';
  if(rolActual==='alumno'){
    var alumno = gA(rolData.alumnoId);
    var materias = alumno ? DB.materias.filter(function(m){return m.cursoId===alumno.moduloId}) : [];
    var defs = materias.map(function(m){return definitivaDe(gNota(alumno.id,m.id))});
    var defsOk = defs.filter(function(d){return d!==null});
    var prom = defsOk.length ? defsOk.reduce(function(a,b){return a+b},0)/defsOk.length : null;
    cards=[
      {lbl:'Promedio general', val: prom!==null?prom.toFixed(1):'-'},
      {lbl:'Materias aprobadas', val: defsOk.filter(function(d){return d>=3}).length},
      {lbl:'Materias en riesgo', val: defsOk.filter(function(d){return d<3}).length},
      {lbl:'Total materias', val: materias.length}
    ];
    chartTitle='Tu rendimiento por materia';
    chartItems = materias.map(function(m){return{lbl:m.nombre,val:definitivaDe(gNota(alumno.id,m.id))}});
  } else {
    var materiasProp = rolActual==='profesor' ? DB.materias.filter(function(m){return m.profesorEmail===currentUserEmail}) : DB.materias;
    var notasProp = DB.notas.filter(function(n){return materiasProp.some(function(m){return m.id===n.materiaId})});
    var defs2 = notasProp.map(definitivaDe).filter(function(d){return d!==null});
    var prom2 = defs2.length ? defs2.reduce(function(a,b){return a+b},0)/defs2.length : null;
    var alumnosEval = new Set(notasProp.filter(function(n){return definitivaDe(n)!==null}).map(function(n){return n.alumnoId})).size;
    var pendientes=0;
    materiasProp.forEach(function(m){
      DB.alumnos.filter(function(a){return a.moduloId===m.cursoId}).forEach(function(a){
        if(definitivaDe(gNota(a.id,m.id))===null) pendientes++;
      });
    });
    cards=[
      {lbl:'Materias activas', val: materiasProp.filter(function(m){return m.activa!==false}).length},
      {lbl:'Alumnos evaluados', val: alumnosEval},
      {lbl:'Promedio general', val: prom2!==null?prom2.toFixed(1):'-'},
      {lbl:'Notas pendientes', val: pendientes, danger: pendientes>0}
    ];
    chartItems = materiasProp.map(function(m){
      var matriculados = DB.alumnos.filter(function(a){return a.moduloId===m.cursoId});
      var ds = matriculados.map(function(a){return definitivaDe(gNota(a.id,m.id))}).filter(function(d){return d!==null});
      return {lbl:m.nombre, val: ds.length ? ds.reduce(function(a,b){return a+b},0)/ds.length : null};
    });
  }
  document.getElementById('dash-cards').innerHTML = cards.map(function(c){
    return '<div class="sc"><div class="lbl">'+c.lbl+'</div><div class="val" style="'+(c.danger?'color:#b91c1c':'')+'">'+c.val+'</div></div>';
  }).join('');
  document.getElementById('dash-chart-title').textContent = chartTitle;
  renderBarChart('dash-chart', chartItems);
}

// ── CALIFICAR ─────────────────────────────────────────────
window.renderCalificar=function(){
  var sel=document.getElementById('cal-materia'); if(!sel) return;
  var matId=sel.value, q=(document.getElementById('cal-q').value||'').toLowerCase();
  var tb=document.getElementById('t-cal');
  if(!matId){ tb.innerHTML='<tr><td colspan="10"><div class="empty-state">Selecciona una materia para empezar a calificar.</div></td></tr>'; return; }
  var materia=gM(matId);
  if(!materia){ tb.innerHTML=''; return; }
  var alumnos=DB.alumnos.filter(function(a){return a.moduloId===materia.cursoId && (a.nombre||'').toLowerCase().indexOf(q)>-1})
    .sort(function(a,b){return(a.nombre||'').localeCompare(b.nombre||'')});
  if(!alumnos.length){ tb.innerHTML='<tr><td colspan="10"><div class="empty-state">No hay alumnos matriculados en el curso de esta materia.</div></td></tr>'; return; }
  tb.innerHTML=alumnos.map(function(a){
    var nota=gNota(a.id,matId)||{};
    var def=definitivaDe(nota), est=estadoNota(def);
    function inp(campo){return '<input class="grade-input" type="number" min="0" max="5" step="0.1" value="'+(nota[campo]!=null?nota[campo]:'')+'" onchange="setNota(\''+a.id+'\',\''+matId+'\',\''+campo+'\',this.value)">'}
    return '<tr>'
      +'<td>'+avEl(a)+'</td>'
      +'<td>'+a.nombre+'</td>'
      +'<td class="grade-cell">'+inp('c1')+'</td>'
      +'<td class="grade-cell">'+inp('c2')+'</td>'
      +'<td class="grade-cell">'+inp('c3')+'</td>'
      +'<td class="grade-cell">'+inp('c4')+'</td>'
      +'<td class="grade-cell def-val">'+fmtDef(def)+'</td>'
      +'<td class="grade-cell"><span class="bdg '+est.cls+'">'+est.txt+'</span></td>'
      +'<td><button class="btn bo bsm" title="Ver perfil" onclick="verAl(\''+a.id+'\')">👤</button></td>'
      +'<td><button class="btn bo bsm" title="Comentario" onclick="comentarNota(\''+a.id+'\',\''+matId+'\')">💬</button></td>'
      +'</tr>';
  }).join('');
}

window.setNota=async function(alId,matId,campo,valor){
  var v = valor===''?null:parseFloat(valor);
  if(v!==null && (isNaN(v)||v<0||v>5)){ alert('La nota debe estar entre 0.0 y 5.0'); renderCalificar(); return; }
  var data={alumnoId:alId,materiaId:matId}; data[campo]=v;
  await fbSet('notas', alId+'_'+matId, data);
}

window.comentarNota=function(alId,matId){
  var nota=gNota(alId,matId)||{};
  var c=prompt('Comentario / observación para este alumno:', nota.comentario||'');
  if(c===null) return;
  fbSet('notas', alId+'_'+matId, {alumnoId:alId, materiaId:matId, comentario:c.trim()});
}

window.verAl=function(id){
  var a=gA(id); if(!a) return;
  var pagos=DB.pagos.filter(function(p){return p.alumnoId===id});
  var cuotas=DB.cuotas.filter(function(c){return c.alumnoId===id});
  var tot=pagos.reduce(function(s,p){return s+(p.monto||0)},0);
  var pen=cuotas.reduce(function(s,c){return s+(parseFloat(c.monto)||0)},0);
  document.getElementById('m-ver-body').innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">'+avEl(a,64)
    +'<div><div style="font-size:17px;font-weight:600">'+a.nombre+'</div><div style="font-size:13px;color:#888">'+gCN(a.moduloId)+(a.nivel?' · '+a.nivel:'')+'</div></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:16px">'
    +'<div><span style="color:#888">Cédula:</span> '+(a.cedula||'-')+'</div><div><span style="color:#888">Tel:</span> '+(a.telefono||'-')+'</div>'
    +'<div><span style="color:#888">Edad:</span> '+(a.edad?a.edad+' años':'-')+'</div><div><span style="color:#888">RH:</span> '+(a.rh||'-')+'</div>'
    +'<div><span style="color:#888">Ingreso:</span> '+(a.ingreso||'-')+'</div><div><span style="color:#888">Email:</span> '+(a.email||'-')+'</div>'
    +'<div><span style="color:#888">Inicio:</span> '+(a.inicio||'-')+'</div><div><span style="color:#888">Fin:</span> '+(a.fin||'-')+'</div>'
    +'<div style="grid-column:1/-1"><span style="color:#888">Ref:</span> '+(a.referencia||'-')+'</div>'
    +'<div style="grid-column:1/-1"><span style="color:#888">Dirección:</span> '+(a.direccion||'-')+'</div>'
    +(a.notas?'<div style="grid-column:1/-1"><span style="color:#888">Notas:</span> '+a.notas+'</div>':'')+'</div>'
    +'<div style="display:flex;gap:10px;margin-bottom:10px">'
    +'<div style="flex:1;background:#f0fdf4;border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#15803d;font-weight:600">PAGADO</div><div style="font-size:16px;font-weight:700;color:#15803d">$'+tot.toLocaleString('es-CO')+'</div></div>'
    +'<div style="flex:1;background:#fee2e2;border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#b91c1c;font-weight:600">PENDIENTE</div><div style="font-size:16px;font-weight:700;color:#b91c1c">$'+pen.toLocaleString('es-CO')+'</div></div></div>'
    +(pagos.length?'<div style="max-height:140px;overflow-y:auto;border:.5px solid #f0f0f0;border-radius:8px">'+pagos.map(function(p){
      return '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:.5px solid #f5f5f5;font-size:12px"><div style="flex:1">'+(p.periodo||'-')+'</div><div style="font-weight:600">$'+(p.monto||0).toLocaleString('es-CO')+'</div>'+bdg(p.estado)+'<div style="color:#aaa">'+(p.fecha||'-')+'</div></div>';
    }).join('')+'</div>':'');
  openM('m-ver');
}

// ── BOLETÍN (consulta admin/profesor) ────────────────────────
function filasBoletin(alumno){
  if(!alumno) return [];
  return DB.materias.filter(function(m){return m.cursoId===alumno.moduloId}).map(function(m){
    var nota=gNota(alumno.id,m.id), def=definitivaDe(nota), est=estadoNota(def);
    return {materia:m.nombre, c1:nota&&nota.c1!=null?nota.c1:'-', c2:nota&&nota.c2!=null?nota.c2:'-', c3:nota&&nota.c3!=null?nota.c3:'-', c4:nota&&nota.c4!=null?nota.c4:'-', def:def, est:est};
  });
}
function tablaBoletinHTML(filas){
  if(!filas.length) return '<div class="empty-state">Este alumno no tiene materias asignadas a su curso todavía.</div>';
  var defsOk=filas.map(function(f){return f.def}).filter(function(d){return d!==null});
  var prom=defsOk.length?defsOk.reduce(function(a,b){return a+b},0)/defsOk.length:null;
  return '<table><thead><tr><th>Materia</th><th class="grade-cell">Nota 1</th><th class="grade-cell">Nota 2</th><th class="grade-cell">Nota 3</th><th class="grade-cell">Nota 4</th><th class="grade-cell">Definitiva</th><th class="grade-cell">Estado</th></tr></thead><tbody>'
    + filas.map(function(f){return '<tr><td>'+f.materia+'</td><td class="grade-cell">'+f.c1+'</td><td class="grade-cell">'+f.c2+'</td><td class="grade-cell">'+f.c3+'</td><td class="grade-cell">'+f.c4+'</td><td class="grade-cell def-val">'+fmtDef(f.def)+'</td><td class="grade-cell"><span class="bdg '+f.est.cls+'">'+f.est.txt+'</span></td></tr>'}).join('')
    + '</tbody></table>'
    + '<div style="text-align:right;padding:14px 4px 0;font-size:14px"><b>Promedio general: '+(prom!==null?prom.toFixed(1):'-')+'</b></div>';
}
window.renderBoletin=function(){
  var id=document.getElementById('bol-alumno').value;
  var body=document.getElementById('bol-body');
  if(!id){ body.innerHTML='<div class="empty-state">Selecciona un alumno para ver su boletín.</div>'; return; }
  body.innerHTML = tablaBoletinHTML(filasBoletin(gA(id)));
}
window.imprimirBoletin=function(){
  var id=document.getElementById('bol-alumno').value;
  var alumno=gA(id);
  if(!alumno){ alert('Selecciona un alumno primero.'); return; }
  prepararEImprimir(alumno);
}
window.imprimirBoletinPropio=function(){
  prepararEImprimir(gA(rolData.alumnoId));
}
function prepararEImprimir(alumno){
  if(!alumno) return;
  var hoy=new Date().toLocaleDateString('es-CO');
  document.getElementById('boletin-print').innerHTML =
    '<div style="text-align:center;margin-bottom:20px">'
    +'<h2 style="margin-bottom:4px">DEEJAY ACADEMY</h2>'
    +'<div style="color:#666;font-size:13px">Boletín de calificaciones</div></div>'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px">'
    +'<div><b>Alumno:</b> '+alumno.nombre+'<br><b>Cédula:</b> '+(alumno.cedula||'-')+'</div>'
    +'<div><b>Curso:</b> '+gCN(alumno.moduloId)+(alumno.nivel?' - '+alumno.nivel:'')+'<br><b>Fecha:</b> '+hoy+'</div></div>'
    + tablaBoletinHTML(filasBoletin(alumno))
    +'<div style="margin-top:50px;display:flex;justify-content:space-between;font-size:12px;color:#666">'
    +'<div>_____________________<br>Firma Profesor</div><div>_____________________<br>Firma Coordinación Académica</div></div>';
  window.print();
}

// ── MIS NOTAS (alumno) ───────────────────────────────────────
window.renderMisNotas=function(){
  var alumno=gA(rolData.alumnoId);
  if(!alumno){ document.getElementById('t-mn').innerHTML='<tr><td colspan="7"><div class="empty-state">No encontramos tu registro de alumno. Contacta al administrador.</div></td></tr>'; return; }
  var filas=filasBoletin(alumno);
  var defsOk=filas.map(function(f){return f.def}).filter(function(d){return d!==null});
  var prom=defsOk.length?defsOk.reduce(function(a,b){return a+b},0)/defsOk.length:null;
  document.getElementById('mn-cards').innerHTML=[
    {lbl:'Promedio general', val: prom!==null?prom.toFixed(1):'-'},
    {lbl:'Materias aprobadas', val: defsOk.filter(function(d){return d>=3}).length},
    {lbl:'Materias en riesgo', val: defsOk.filter(function(d){return d<3}).length},
    {lbl:'Total materias', val: filas.length}
  ].map(function(c){return '<div class="sc"><div class="lbl">'+c.lbl+'</div><div class="val">'+c.val+'</div></div>'}).join('');
  renderBarChart('mn-chart', filas.map(function(f){return{lbl:f.materia,val:f.def}}));
  document.getElementById('t-mn').innerHTML = filas.length ? filas.map(function(f){
    return '<tr><td>'+f.materia+'</td><td class="grade-cell">'+f.c1+'</td><td class="grade-cell">'+f.c2+'</td><td class="grade-cell">'+f.c3+'</td><td class="grade-cell">'+f.c4+'</td><td class="grade-cell def-val">'+fmtDef(f.def)+'</td><td class="grade-cell"><span class="bdg '+f.est.cls+'">'+f.est.txt+'</span></td></tr>';
  }).join('') : '<tr><td colspan="7"><div class="empty-state">Todavía no tienes materias ni notas registradas.</div></td></tr>';
}

// ── MATERIAS ──────────────────────────────────────────────
window.renderMaterias=function(){
  var q=(document.getElementById('q-mat').value||'').toLowerCase(), fc=document.getElementById('f-mat-cur').value;
  var list = rolActual==='profesor' ? DB.materias.filter(function(m){return m.profesorEmail===currentUserEmail}) : DB.materias;
  list = list.filter(function(m){return (m.nombre||'').toLowerCase().indexOf(q)>-1 && (!fc || m.cursoId===fc)});
  var tb=document.getElementById('t-mat');
  if(!list.length){ tb.innerHTML='<tr><td colspan="6"><div class="empty-state">No hay materias registradas.</div></td></tr>'; return; }
  tb.innerHTML=list.map(function(m){
    var n=DB.alumnos.filter(function(a){return a.moduloId===m.cursoId}).length;
    var editBtn = (rolActual==='admin' || rolActual==='profesor') ? '<button class="btn bo bsm" onclick="openMMateria(\''+m.id+'\')">Editar</button>' : '';
    return '<tr>'
      +'<td><b>'+m.nombre+'</b></td>'
      +'<td>'+gCN(m.cursoId)+'</td>'
      +'<td>'+(m.profesorNombre||'<span style="color:#aaa">Sin asignar</span>')+'</td>'
      +'<td>'+n+'</td>'
      +'<td><span class="bdg '+(m.activa!==false?'bg':'bgr')+'">'+(m.activa!==false?'Activa':'Inactiva')+'</span></td>'
      +'<td>'+editBtn+'</td>'
      +'</tr>';
  }).join('');
}

window.openMMateria=function(id){
  id=id||null;
  document.getElementById('mm-tit').textContent = id?'Editar materia':'Nueva materia';
  document.getElementById('mm-nom').value=''; document.getElementById('mm-cur').value=''; document.getElementById('mm-prof').value='';
  document.getElementById('mm-del').style.display = id?'':'none';
  document.getElementById('m-materia').dataset.editId = id||'';
  if(id){
    var m=gM(id);
    if(m){ document.getElementById('mm-nom').value=m.nombre||''; document.getElementById('mm-cur').value=m.cursoId||''; document.getElementById('mm-prof').value=m.profesorEmail||''; }
  }
  var profSel=document.getElementById('mm-prof');
  if(rolActual==='profesor'){
    profSel.value=currentUserEmail; profSel.disabled=true;
  } else {
    profSel.disabled=false;
  }
  openM('m-materia');
}
window.saveMateria=async function(){
  var nom=document.getElementById('mm-nom').value.trim(), cur=document.getElementById('mm-cur').value;
  if(!nom||!cur){ alert('El nombre y el curso son obligatorios.'); return; }
  var profEmail=document.getElementById('mm-prof').value;
  var prof = profEmail ? DB.roles.find(function(r){return r.id===profEmail}) : null;
  var data={nombre:nom, cursoId:cur, profesorEmail:profEmail||null, profesorNombre: prof?(prof.nombre||profEmail):null, activa:true};
  var editId=document.getElementById('m-materia').dataset.editId;
  if(editId){ await fbUpd('materias', editId, data); } else { await fbAdd('materias', data); }
  closeM('m-materia');
}
window.delMateriaM=function(){
  var editId=document.getElementById('m-materia').dataset.editId;
  if(!editId) return;
  confirmDel('¿Eliminar esta materia? Las notas asociadas no se borrarán pero quedarán huérfanas.', async function(){
    await fbDel('materias', editId); closeM('m-materia');
  });
}

// ── ACCESOS (admin) ──────────────────────────────────────────
window.renderAccesos=function(){
  var profs=DB.roles.filter(function(r){return r.rol==='profesor'});
  document.getElementById('t-acc-prof').innerHTML = profs.length ? profs.map(function(p){
    var nMat=DB.materias.filter(function(m){return m.profesorEmail===p.id}).length;
    return '<tr><td>'+(p.nombre||'-')+'</td><td>'+p.id+'</td><td>'+nMat+'</td><td><button class="btn bd bsm" onclick="revocarAcceso(\''+p.id+'\')">Revocar</button></td></tr>';
  }).join('') : '<tr><td colspan="4"><div class="empty-state">Sin profesores con acceso todavía.</div></td></tr>';

  var alus=DB.roles.filter(function(r){return r.rol==='alumno'});
  document.getElementById('t-acc-alu').innerHTML = alus.length ? alus.map(function(r){
    var a=gA(r.alumnoId);
    return '<tr><td>'+(a?a.nombre:'(alumno eliminado)')+'</td><td>'+r.id+'</td><td>'+(a?gCN(a.moduloId):'-')+'</td><td><button class="btn bd bsm" onclick="revocarAcceso(\''+r.id+'\')">Revocar</button></td></tr>';
  }).join('') : '<tr><td colspan="4"><div class="empty-state">Ningún alumno tiene acceso todavía.</div></td></tr>';
}
window.revocarAcceso=function(email){
  confirmDel('¿Revocar el acceso de '+email+' al sistema de notas?\n\n(Esto elimina su rol aquí; si necesitas borrar la cuenta por completo, hazlo también desde Firebase Authentication.)', async function(){
    await fbDel('roles', email);
  });
}

window.openMAccProf=function(){
  document.getElementById('ap-nom').value=''; document.getElementById('ap-mail').value=''; document.getElementById('ap-pwd').value=''; document.getElementById('ap-err').textContent='';
  openM('m-acc-prof');
}
window.crearProfesor=async function(){
  var nom=document.getElementById('ap-nom').value.trim(), mail=document.getElementById('ap-mail').value.trim().toLowerCase(), pwd=document.getElementById('ap-pwd').value.trim();
  var err=document.getElementById('ap-err'); err.textContent='';
  if(!nom||!mail||!pwd){ err.textContent='Completa todos los campos.'; return; }
  if(pwd.length<6){ err.textContent='La contraseña debe tener mínimo 6 caracteres.'; return; }
  var btn=document.getElementById('ap-btn'); btn.disabled=true; btn.textContent='Creando...';
  try{
    await createUserWithEmailAndPassword(authSec, mail, pwd);
    await signOut(authSec);
    await fbSet('roles', mail, {rol:'profesor', nombre:nom});
    closeM('m-acc-prof');
  }catch(e){
    if(e.code==='auth/email-already-in-use'){
      if(confirm('Ese correo ya tiene una cuenta de acceso creada (su contraseña actual no cambia). ¿Quieres re-vincularlo como profesor de todas formas?')){
        await fbSet('roles', mail, {rol:'profesor', nombre:nom});
        closeM('m-acc-prof');
      } else { err.textContent='Ese correo ya tiene una cuenta creada.'; }
    } else { err.textContent='Error: '+e.message; }
  }
  btn.disabled=false; btn.textContent='Crear acceso';
}

window.openMAccAlu=function(){
  document.getElementById('aa-al').value=''; document.getElementById('aa-mail').value=''; document.getElementById('aa-pwd').value=''; document.getElementById('aa-err').textContent='';
  openM('m-acc-alu');
}
window.crearAccesoAlumno=async function(){
  var alId=document.getElementById('aa-al').value, mail=document.getElementById('aa-mail').value.trim().toLowerCase(), pwd=document.getElementById('aa-pwd').value.trim();
  var err=document.getElementById('aa-err'); err.textContent='';
  if(!alId||!mail||!pwd){ err.textContent='Completa todos los campos.'; return; }
  if(pwd.length<6){ err.textContent='La contraseña debe tener mínimo 6 caracteres.'; return; }
  var btn=document.getElementById('aa-btn'); btn.disabled=true; btn.textContent='Creando...';
  try{
    var alumno=gA(alId);
    await createUserWithEmailAndPassword(authSec, mail, pwd);
    await signOut(authSec);
    await fbSet('roles', mail, {rol:'alumno', alumnoId:alId, nombre: alumno?alumno.nombre:''});
    closeM('m-acc-alu');
  }catch(e){
    if(e.code==='auth/email-already-in-use'){
      if(confirm('Ese correo ya tiene una cuenta de acceso creada (su contraseña actual no cambia). ¿Quieres re-vincularlo con este alumno de todas formas?')){
        var alumno2=gA(alId);
        await fbSet('roles', mail, {rol:'alumno', alumnoId:alId, nombre: alumno2?alumno2.nombre:''});
        closeM('m-acc-alu');
      } else { err.textContent='Ese correo ya tiene una cuenta creada.'; }
    } else { err.textContent='Error: '+e.message; }
  }
  btn.disabled=false; btn.textContent='Crear acceso';
}

// ── CALENDARIO: PLANEACIÓN DE CURSOS (igual a la base de alumnos) ──
var MESES_CALP=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var CAMPOS_CALP=['n1i','n1f','n2i','n2f','n3i','n3f','n4i','n4f'];

function poblarCalpCurso(selectId){
  var sel=document.getElementById(selectId); if(!sel) return;
  var pv=sel.value;
  sel.innerHTML=[{v:'',t:'Seleccionar...'}].concat(DB.cursos.map(function(c){return{v:c.id,t:c.nombre}})).map(function(o){return'<option value="'+o.v+'">'+o.t+'</option>'}).join('');
  if(pv && DB.cursos.some(function(c){return c.id===pv})) sel.value=pv;
}

function renderCalpTabla(opts){
  poblarCalpCurso(opts.selCurso);
  var cursoId=document.getElementById(opts.selCurso).value;
  var anioInp=document.getElementById(opts.selAnio);
  if(!anioInp.value) anioInp.value=new Date().getFullYear();
  var anio=anioInp.value;
  var tb=document.getElementById(opts.tbodyId); if(!tb) return;
  if(!cursoId){ tb.innerHTML='<tr><td colspan="9" style="text-align:center;color:#aaa;padding:20px">Selecciona un curso</td></tr>'; return; }
  var docId=cursoId+'_'+anio;
  var datos=DB[opts.coleccion].find(function(d){return d.id===docId});
  tb.innerHTML=MESES_CALP.map(function(mes,mi){
    var fila=(datos&&datos.meses&&datos.meses[mi])||{};
    return'<tr style="border-bottom:1px solid #222">'
      +'<td style="background:'+(opts.colorMes||'#1d4ed8')+';color:#fff;font-weight:600;padding:8px;text-align:center">'+mes+'</td>'
      +CAMPOS_CALP.map(function(campo){
        var val=fila[campo]||'';
        return'<td style="padding:4px;text-align:center;background:#0a0a0a"><input type="date" value="'+val+'" disabled style="border:1px solid #2a2a2a;background:#161616;color:#999;border-radius:6px;padding:4px 6px;font-size:12px;width:100%;color-scheme:dark;cursor:not-allowed"></td>';
      }).join('')
      +'</tr>';
  }).join('');
}

window.renderCalNotas=function(){
  renderCalpTabla({selCurso:'cn-curso',selAnio:'cn-anio',tbodyId:'cn-body',coleccion:'calendario_plan',colorMes:'#dc2626'});
}
window.renderCalNotasFS=function(){
  renderCalpTabla({selCurso:'cn-curso-fs',selAnio:'cn-anio-fs',tbodyId:'cn-body-fs',coleccion:'calendario_plan_fs',colorMes:'#1d4ed8'});
}
window.saveCalpCelda=async function(coleccion,cursoId,anio,mesIdx,campo,valor){
  // Deshabilitado a propósito: el calendario de planeación es solo lectura desde Notas.
  // Las fechas solo se editan desde la base de alumnos.
}

// ── CALENDARIO: EVENTOS ──────────────────────────────────────
function tipoEvCfg(t){
  return {examen:{cls:'br',txt:'Examen'}, entrega:{cls:'by',txt:'Entrega de notas'}, evento:{cls:'bb',txt:'Evento'}, otro:{cls:'bgr',txt:'Otro'}}[t] || {cls:'bgr',txt:t||'-'};
}
window.renderEventos=function(){
  var list=document.getElementById('ev-list'); if(!list) return;
  var tf=document.getElementById('ev-tipo-f').value;
  var soloProx=document.getElementById('ev-solo-prox').checked;
  var hoy=new Date().toISOString().slice(0,10);
  var evs=DB.eventos.filter(function(e){return (!tf || e.tipo===tf) && (!soloProx || (e.fecha||'') >= hoy)})
    .sort(function(a,b){return (a.fecha||'') < (b.fecha||'') ? -1 : 1});
  if(!evs.length){ list.innerHTML='<div class="empty-state" style="color:#888">No hay eventos para mostrar.</div>'; return; }
  list.innerHTML=evs.map(function(e){
    var cfg=tipoEvCfg(e.tipo);
    var mat=e.materiaId?gM(e.materiaId):null;
    var fecha=e.fecha?new Date(e.fecha+'T00:00:00').toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}):'-';
    return '<div style="display:flex;align-items:center;gap:14px;padding:12px 4px;border-bottom:1px solid #222;flex-wrap:wrap">'
      +'<div style="min-width:90px;font-size:12px;color:#aaa;font-weight:600">'+fecha+'</div>'
      +'<div style="flex:1;min-width:160px"><div style="font-weight:600;font-size:14px">'+e.titulo+'</div>'
      +(mat?'<div style="font-size:11px;color:#888">'+mat.nombre+'</div>':'')
      +(e.descripcion?'<div style="font-size:12px;color:#999;margin-top:2px">'+e.descripcion+'</div>':'')+'</div>'
      +'<span class="bdg '+cfg.cls+'">'+cfg.txt+'</span>'
      +'<button class="btn bo bsm" onclick="openMEvento(\''+e.id+'\')">Editar</button>'
      +'</div>';
  }).join('');
}
window.openMEvento=function(id){
  id=id||null;
  document.getElementById('ev-tit').textContent = id?'Editar evento':'Nuevo evento';
  document.getElementById('ev-titulo').value=''; document.getElementById('ev-fecha').value=''; document.getElementById('ev-tipo').value='examen';
  document.getElementById('ev-materia').value=''; document.getElementById('ev-desc').value='';
  document.getElementById('ev-del').style.display = id?'':'none';
  document.getElementById('m-evento').dataset.editId = id||'';
  if(id){
    var e=DB.eventos.find(function(x){return x.id===id});
    if(e){ document.getElementById('ev-titulo').value=e.titulo||''; document.getElementById('ev-fecha').value=e.fecha||''; document.getElementById('ev-tipo').value=e.tipo||'examen'; document.getElementById('ev-materia').value=e.materiaId||''; document.getElementById('ev-desc').value=e.descripcion||''; }
  }
  openM('m-evento');
}
window.saveEvento=async function(){
  var titulo=document.getElementById('ev-titulo').value.trim(), fecha=document.getElementById('ev-fecha').value;
  if(!titulo||!fecha){ alert('El título y la fecha son obligatorios.'); return; }
  var data={
    titulo:titulo, fecha:fecha, tipo:document.getElementById('ev-tipo').value,
    materiaId: document.getElementById('ev-materia').value || null,
    descripcion: document.getElementById('ev-desc').value.trim()
  };
  var editId=document.getElementById('m-evento').dataset.editId;
  if(editId){ await fbUpd('eventos', editId, data); } else { await fbAdd('eventos', data); }
  closeM('m-evento');
}
window.delEventoM=function(){
  var editId=document.getElementById('m-evento').dataset.editId;
  if(!editId) return;
  confirmDel('¿Eliminar este evento del calendario?', async function(){
    await fbDel('eventos', editId); closeM('m-evento');
  });
}
