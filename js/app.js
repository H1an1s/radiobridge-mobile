(function(){
  "use strict";
  const $=id=>document.getElementById(id); let payload=null; let busy=false; let messageId=null;
  const labels={active:"Активный",in_progress:"В работе",done:"Завершён"};
  const actionLabels={take:"Взять в работу",complete:"Завершить",help:"Требуется помощь"};
  function showError(text){$("title").textContent="Ссылка недействительна";$("message").textContent=text;$("details").hidden=true;$("comments").hidden=true;$("actions").hidden=true;$("comment-form").hidden=true;$("status").hidden=false;$("status").className="status error";$("status").textContent="Откройте актуальное уведомление Bark."}
  function addDetail(name,value){const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=name;dd.textContent=value||"—";$("details").append(dt,dd)}
  function maskedTopic(value){const topic=String(value||"");return topic.length>16?`${topic.slice(0,8)}…${topic.slice(-8)}`:topic}
  function renderComments(items){const box=$("comments");box.innerHTML="";(items||[]).forEach(item=>{const card=document.createElement("div");card.className="comment-card";const title=document.createElement("strong");title.textContent=item.author||"Комментарий";const text=document.createElement("p");text.textContent=item.text||"";card.append(title,text);box.appendChild(card)});box.hidden=!box.children.length}
  function expired(){return Date.now()>=Date.parse(payload.expires_at)}
  function newMessageId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`}
  function setBusy(value){busy=value;document.querySelectorAll("button,textarea").forEach(el=>el.disabled=value)}
  async function send(action,comment=""){
    if(busy||expired())return; if((action==="complete"||action==="help")&&!confirm(action==="complete"?"Завершить этот вызов?":"Запросить помощь и вернуть вызов в активное состояние?"))return;
    messageId=messageId||newMessageId(); setBusy(true);$("status").hidden=false;$("status").className="status";$("status").textContent=`Передаю команду в Firebase channel ${maskedTopic(payload.firebase_channel)}…`;
    try{await window.RadioBridgeFirebase.publish({type:"call.action",action_token:payload.token,action,...(comment?{comment}:{})},messageId,payload.firebase_channel);$("status").textContent="Команда передана в RadioBridge. Окончательный результат подтвердит следующее уведомление Bark.";$("actions").hidden=true;$("comment-form").hidden=true;payload.token=""}
    catch(e){$("status").className="status error";$("status").textContent=e.message+". Повтор использует тот же идентификатор команды.";setBusy(false)}
  }
  function renderTest(){
    $("title").textContent=payload.title;$("message").textContent=payload.message;$("details").hidden=true;$("comments").hidden=true;$("actions").hidden=true;$("comment-form").hidden=true;$("status").hidden=false;$("status").className="status";$("status").textContent="Тестовая карточка открылась. URL мобильного Web UI в Bark работает.";
  }
  function render(){
    if(payload.type==="system.test"){renderTest();return}
    const c=payload.call;$("title").textContent=c.node_name;$("message").textContent="Управление вызовом через защищённый одноразовый токен.";$("details").innerHTML="";addDetail("ID",c.public_id);addDetail("Статус",labels[c.state]||c.state);addDetail("Отдел",(c.department_names||[]).join(", "));addDetail("Оператор",c.initiated_by);addDetail("Firebase channel",maskedTopic(payload.firebase_channel));addDetail("Создан",new Date(c.started_at).toLocaleString());addDetail("Ссылка до",new Date(payload.expires_at).toLocaleString());$("details").hidden=false;renderComments(c.last_comments);
    if(expired()){showError("Срок действия этой ссылки истёк.");return}
    $("actions").innerHTML="";payload.actions.filter(a=>a!=="comment").forEach(action=>{const b=document.createElement("button");b.type="button";b.textContent=actionLabels[action]||action;b.className=action==="complete"?"danger":action==="help"?"secondary":"";b.addEventListener("click",()=>send(action));$("actions").appendChild(b)});$("actions").hidden=$("actions").children.length===0;
    if(payload.actions.includes("comment")){$("comment-form").hidden=false;$("comment").addEventListener("input",()=>$("counter").textContent=`${$("comment").value.length}/500`);$("comment-form").addEventListener("submit",e=>{e.preventDefault();const text=$("comment").value.trim();if(text)send("comment",text)})}
  }
  document.addEventListener("DOMContentLoaded",()=>{$("version").textContent=`Версия ${(window.RADIOBRIDGE_CONFIG||{}).appVersion||"dev"}`;try{payload=window.RadioBridgeCodec.parseFragment(location.hash);history.replaceState(null,document.title,location.pathname+location.search);render()}catch(e){showError(e.message)}});
})();
