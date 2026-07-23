(function(){
  "use strict";
  const utf8 = new TextDecoder();
  function decodeBase64Url(value){
    if(typeof value!=="string"||value.length>12000) throw new Error("Некорректный размер ссылки");
    const normalized=value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4);
    let binary; try{binary=atob(normalized)}catch(_){throw new Error("Некорректная кодировка ссылки")}
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    try{return utf8.decode(bytes)}catch(_){throw new Error("Некорректный текст ссылки")}
  }
  function encodeBase64Url(value){
    const bytes=new TextEncoder().encode(value); let binary="";
    bytes.forEach(b=>binary+=String.fromCharCode(b));
    return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  }
  function parseFragment(hash){
    const fragment=(hash||"").replace(/^#/,"");
    if(!fragment.startsWith("v1.")) throw new Error("Неподдерживаемый формат ссылки");
    let payload; try{payload=JSON.parse(decodeBase64Url(fragment.slice(3)))}catch(e){if(e instanceof SyntaxError)throw new Error("Повреждённые данные вызова");throw e}
    validate(payload); return payload;
  }
  function validate(p){
    if(!p||p.schema!==1) throw new Error("Недействительная ссылка действия");
    if(p.type==="system.test"){
      if(typeof p.title!=="string"||typeof p.message!=="string") throw new Error("Некорректная тестовая карточка");
      return;
    }
    const allowed=new Set(["take","complete","help","comment"]);
    if(typeof p.token!=="string"||p.token.length<20) throw new Error("Недействительная ссылка действия");
    if(typeof p.firebase_channel!=="string"||!/^[A-Za-z0-9_-]{20,160}$/.test(p.firebase_channel)||p.firebase_channel.startsWith("CHANGE_ME")) throw new Error("В Bark-ссылке отсутствуют корректные параметры доставки. Откройте новое уведомление после обновления ESP32");
    if(!p.call||typeof p.call!=="object"||typeof p.call.public_id!=="string"||typeof p.call.node_name!=="string") throw new Error("В ссылке отсутствует карточка вызова");
    if(p.call.public_id.length>120||p.call.node_name.length>160) throw new Error("Некорректный размер карточки вызова");
    if(!Array.isArray(p.actions)||p.actions.some(a=>!allowed.has(a))) throw new Error("Некорректный список действий");
    if(typeof p.expires_at!=="string"||Number.isNaN(Date.parse(p.expires_at))) throw new Error("Некорректный срок действия ссылки");
  }
  window.RadioBridgeCodec={parseFragment,encodeBase64Url};
})();
