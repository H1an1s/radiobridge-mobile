(function(){
  "use strict";
  async function publish(command,messageId,topicOverride){
    const cfg=window.RADIOBRIDGE_CONFIG||{};
    if(!/^https:\/\//.test(cfg.ntfyServer||"")) throw new Error("Некорректный ntfy server");
    const server=cfg.ntfyServer.replace(/\/$/,"");
    const allowed=(cfg.allowedNtfyServers||["https://ntfy.sh"]).map((item)=>String(item).replace(/\/$/,""));
    if(!allowed.includes(server)) throw new Error("ntfy server не разрешён CSP/config.js");
    const topic=String(topicOverride||cfg.ntfyTopic||"").trim();
    if(!/^[A-Za-z0-9_-]{20,}$/.test(topic)||topic.startsWith("CHANGE_ME")) throw new Error("ntfy topic не настроен в ссылке/config.js");
    const body=`MOBILEIN:1:${messageId}:${window.RadioBridgeCodec.encodeBase64Url(JSON.stringify(command))}`;
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),cfg.requestTimeoutMs||12000);
    try{
      const response=await fetch(`${server}/${topic}`,{method:"POST",headers:{"Content-Type":"text/plain; charset=utf-8"},body,signal:controller.signal,cache:"no-store",referrerPolicy:"no-referrer"});
      if(!response.ok) throw new Error(`ntfy отклонил команду: HTTP ${response.status}`);
      return true;
    }catch(e){if(e.name==="AbortError")throw new Error("Истекло время ожидания ntfy");throw e}finally{clearTimeout(timeout)}
  }
  window.RadioBridgeNtfy={publish};
})();
