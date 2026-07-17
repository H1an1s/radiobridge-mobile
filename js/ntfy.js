(function(){
  "use strict";
  async function publish(command,messageId){
    const cfg=window.RADIOBRIDGE_CONFIG||{};
    if(!/^https:\/\//.test(cfg.ntfyServer||"")) throw new Error("Некорректный ntfy server");
    if(!/^[A-Za-z0-9_-]{20,}$/.test(cfg.ntfyTopic||"")||cfg.ntfyTopic.startsWith("CHANGE_ME")) throw new Error("ntfy topic не настроен в config.js");
    const body=`MOBILEIN:1:${messageId}:${window.RadioBridgeCodec.encodeBase64Url(JSON.stringify(command))}`;
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),cfg.requestTimeoutMs||12000);
    try{
      const response=await fetch(`${cfg.ntfyServer.replace(/\/$/,"")}/${cfg.ntfyTopic}`,{method:"POST",headers:{"Content-Type":"text/plain; charset=utf-8"},body,signal:controller.signal,cache:"no-store",referrerPolicy:"no-referrer"});
      if(!response.ok) throw new Error(`ntfy отклонил команду: HTTP ${response.status}`);
      return true;
    }catch(e){if(e.name==="AbortError")throw new Error("Истекло время ожидания ntfy");throw e}finally{clearTimeout(timeout)}
  }
  window.RadioBridgeNtfy={publish};
})();
