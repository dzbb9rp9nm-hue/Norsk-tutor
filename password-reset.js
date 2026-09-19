"use strict";
// Supabase's default recovery email redirects with tokens in the URL fragment.
// Capture only the access token in memory, and scrub all authentication fields
// before loading the rest of the app. Never persist either token.
const PasswordRecovery=(()=>{
  const fragment=new URLSearchParams(window.location.hash.slice(1));
  const present=fragment.has("access_token")||fragment.has("refresh_token")||fragment.has("error");
  let token=fragment.get("type")==="recovery"?fragment.get("access_token"):null;
  if(present)window.history.replaceState(null,"",window.location.pathname+window.location.search);
  let inFlight=false;
  const clear=()=>{token=null;};
  window.addEventListener("pagehide",clear);
  document.addEventListener("DOMContentLoaded",()=>{
    if(!present)return;
    const get=id=>document.getElementById(id),dialog=get("password-reset-dialog"),form=get("password-reset-form"),status=get("password-reset-status");
    const clearFields=()=>{get("new-password").value="";get("repeat-password").value="";};
    if(!token){form.hidden=true;status.textContent="This recovery link has expired or is not a password recovery link. Request a new password recovery email and open its link.";}
    dialog.addEventListener("cancel",event=>{if(inFlight)event.preventDefault();});
    dialog.addEventListener("close",()=>{clear();clearFields();});
    get("close-password-reset").addEventListener("click",()=>{if(!inFlight)window.location.replace(window.location.pathname);});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(inFlight)return;
      const password=get("new-password").value;
      if(password.length<12||password.length>256){status.textContent="Use between 12 and 256 characters.";return;}
      if(password!==get("repeat-password").value){status.textContent="The two passwords don't match. Please enter them again.";return;}
      if(!token){status.textContent="Open a new password recovery email to continue.";return;}
      inFlight=true;get("save-password").disabled=true;get("close-password-reset").disabled=true;status.textContent="Saving your password…";
      try{
        const response=await fetch("/api/account/reset-password",{method:"POST",headers:{"content-type":"application/json","x-norsk-request":"1"},body:JSON.stringify({accessToken:token,password}),signal:AbortSignal.timeout(20000)});
        const result=await response.json();
        if(!response.ok||result.changed!==true)throw Error(result.error||"The password change could not be confirmed. Try again or request a new recovery email.");
        clear();clearFields();form.hidden=true;status.textContent="Your password is saved. Return to practice and use Account & saving to sign in when account access is enabled.";
      }catch(error){status.textContent=error.name==="TimeoutError"?"The request timed out. Your password may have changed. Try signing in with the new password, or request another recovery email.":"Couldn't confirm the password change. "+(error instanceof TypeError?"Check your connection and try again.":error.message);}
      finally{inFlight=false;get("save-password").disabled=false;get("close-password-reset").disabled=false;}
    });
    dialog.showModal();
  });
  return {present};
})();
