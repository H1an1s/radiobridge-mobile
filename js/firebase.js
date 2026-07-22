(function(){
  "use strict";
  let authPromise=null;
  let idToken="";
  let refreshToken="";
  let expiresAt=0;
  const refreshKey="radiobridge.firebase.refreshToken";
  const cfg=()=>window.RADIOBRIDGE_CONFIG||{};
  function apiUrl(){return `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(cfg().firebaseApiKey||"")}`}
  function refreshUrl(){return `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(cfg().firebaseApiKey||"")}`}
  function saveTokens(data,idKey,refreshKeyName,expiresKey){
    idToken=data[idKey]||"";
    refreshToken=data[refreshKeyName]||refreshToken||"";
    expiresAt=Date.now()+Math.max(60,Number(data[expiresKey]||3600)-60)*1000;
    if(refreshToken) localStorage.setItem(refreshKey,refreshToken);
    if(!idToken) throw new Error("Firebase Auth не вернул токен");
    return idToken;
  }
  async function refreshAuth(){
    const stored=refreshToken||localStorage.getItem(refreshKey)||"";
    if(!stored) return null;
    const body=new URLSearchParams({grant_type:"refresh_token",refresh_token:stored});
    const response=await fetch(refreshUrl(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const msg=data.error?.message||"";
      if(/INVALID_REFRESH_TOKEN|TOKEN_EXPIRED|USER_NOT_FOUND|USER_DISABLED/.test(msg)){
        localStorage.removeItem(refreshKey); refreshToken="";
        return null;
      }
      throw new Error(`Firebase Auth refresh: HTTP ${response.status} ${msg}`.trim());
    }
    return saveTokens(data,"id_token","refresh_token","expires_in");
  }
  async function anonymousAuth(){
    if(!cfg().firebaseApiKey) throw new Error("Firebase API key не настроен");
    const response=await fetch(apiUrl(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true}),cache:"no-store"});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(`Firebase Auth: HTTP ${response.status} ${data.error?.message||""}`.trim());
    return saveTokens(data,"idToken","refreshToken","expiresIn");
  }
  async function token(){
    if(idToken && Date.now()<expiresAt) return idToken;
    if(!authPromise) authPromise=(async()=>await refreshAuth()||await anonymousAuth())().finally(()=>{authPromise=null});
    return authPromise;
  }
  async function publish(command,messageId,channelOverride){
    const cfgv=cfg(); const channel=String(channelOverride||cfgv.firebaseChannel||"").trim();
    if(!/^[A-Za-z0-9_-]{20,160}$/.test(channel)||channel.startsWith("CHANGE_ME")) throw new Error("Firebase channel отсутствует в Bark-ссылке");
    const body=`MOBILEIN:1:${messageId}:${window.RadioBridgeCodec.encodeBase64Url(JSON.stringify(command))}`;
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),cfgv.requestTimeoutMs||12000);
    try{
      const tokenValue=await token();
      const base=String(cfgv.firebaseDatabaseUrl||"").replace(/\/$/,"");
      const url=`${base}/radiobridge/channels/${encodeURIComponent(channel)}/commands/${encodeURIComponent(messageId)}.json?auth=${encodeURIComponent(tokenValue)}`;
      const response=await fetch(url,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:1,body,created_at:{".sv":"timestamp"},expires_at:Date.now()+120000}),signal:controller.signal,cache:"no-store"});
      if(!response.ok) throw new Error(`Firebase отклонил команду: HTTP ${response.status}`);
      return true;
    }catch(e){if(e.name==="AbortError")throw new Error("Истекло время ожидания Firebase");throw e}finally{clearTimeout(timeout)}
  }
  window.RadioBridgeFirebase={publish};
})();
