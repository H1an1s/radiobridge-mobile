(function(){
  "use strict";
  const cfg=()=>window.RADIOBRIDGE_CONFIG||{};
  async function publish(command,messageId,channelOverride){
    const cfgv=cfg(); const channel=String(channelOverride||cfgv.firebaseChannel||"").trim();
    if(!/^[A-Za-z0-9_-]{20,160}$/.test(channel)||channel.startsWith("CHANGE_ME")) throw new Error("Firebase channel отсутствует в Bark-ссылке");
    const base=String(cfgv.firebaseDatabaseUrl||"").replace(/\/$/,"");
    if(!/^https:\/\/[A-Za-z0-9.-]+\.firebasedatabase\.app$/.test(base)) throw new Error("Firebase Database URL не настроен");
    const body=`MOBILEIN:1:${messageId}:${window.RadioBridgeCodec.encodeBase64Url(JSON.stringify(command))}`;
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),cfgv.requestTimeoutMs||12000);
    try{
      const url=`${base}/radiobridge/channels/${encodeURIComponent(channel)}/commands/${encodeURIComponent(messageId)}.json`;
      const response=await fetch(url,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:1,body,created_at:{".sv":"timestamp"},expires_at:Date.now()+120000}),signal:controller.signal,cache:"no-store"});
      if(!response.ok) throw new Error(`Firebase отклонил команду: HTTP ${response.status}`);
      return true;
    }catch(e){if(e.name==="AbortError")throw new Error("Истекло время ожидания Firebase");throw e}finally{clearTimeout(timeout)}
  }
  window.RadioBridgeFirebase={publish};
})();
