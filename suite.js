// The institute's two shared tabs, アプリ and 書籍, added to the first tab row of each app (not Nasdaq 100).
// Each app loads this file from the institute (same site) and calls Suite.mount with its own tab row and the
// elements to hide while one of these tabs is open. The tab's content is the institute's own page in a frame
// (fear-index/?embed=apps or ?embed=books), sized to its content so the page scrolls as one.
(function(){
  const BASE=new URL(".",document.currentScript.src).href;   // .../fear-index/
  const css=`.suite-frame{display:block;width:100%;border:0;background:transparent;margin-top:10px}
    html.suite-on [data-suite-hide]{display:none!important}
    #tabs.suite5{flex:1 1 100%;width:100%}
    #tabs.suite5 button{flex:1 1 0;min-width:0;font-size:12.5px;padding-left:2px;padding-right:2px;letter-spacing:0}`;
  function mount(o){
    // inside the institute's own frame (MRI tab) the institute already has these tabs
    if(/[?&]embed\b/.test(location.search))return;
    const tabs=document.querySelector(o.tabs||"#tabs");if(!tabs||tabs.querySelector("[data-suite]"))return;
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    (o.hide||[]).forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.setAttribute("data-suite-hide","")));
    tabs.classList.add("suite5");
    // labels follow the app's language (each app sets <html lang> when JP / EN is switched)
    const L={apps:["アプリ","Apps"],books:["書籍","Books"]},en=()=>document.documentElement.lang==="en";
    ["apps","books"].forEach(k=>{const b=document.createElement("button");b.type="button";b.dataset.suite=k;b.setAttribute("aria-pressed","false");tabs.appendChild(b)});
    // on a language switch the open frames load again in the new language
    const label=()=>{tabs.querySelectorAll("[data-suite]").forEach(b=>b.textContent=L[b.dataset.suite][en()?1:0]);
      Object.entries(frames).forEach(([k,f])=>{const u=BASE+"?embed="+k+"&lang="+(en()?"en":"ja");if(f.src!==u)f.src=u})};
    new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
    const box=document.createElement("div");box.className="suite-box";box.hidden=true;
    const at=document.querySelector(o.after||"#app");(at&&at.parentNode?at:tabs).parentNode.insertBefore(box,(at&&at.parentNode?at:tabs).nextSibling);
    const frames={};label();
    const fit=f=>{try{const d=f.contentDocument;if(d&&d.body)f.style.height=d.documentElement.scrollHeight+"px"}catch(e){}};
    function open(k){
      tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.suite===k));
      document.documentElement.classList.add("suite-on");box.hidden=false;
      Object.entries(frames).forEach(([n,f])=>f.hidden=n!==k);
      if(!frames[k]){const f=document.createElement("iframe");f.className="suite-frame";f.title=k==="apps"?"アプリ":"書籍";
        f.src=BASE+"?embed="+k+"&lang="+(en()?"en":"ja");f.addEventListener("load",()=>{fit(f);try{new ResizeObserver(()=>fit(f)).observe(f.contentDocument.body)}catch(e){}});
        frames[k]=f;box.appendChild(f)}
      else fit(frames[k]);
      window.scrollTo(0,0);
    }
    tabs.addEventListener("click",e=>{
      const s=e.target.closest("[data-suite]");if(s){e.stopPropagation();open(s.dataset.suite);return}
      // back to one of the app's own tabs: close ours first and press the one tapped (the app may skip a tab it thinks is open)
      const b=e.target.closest("button");if(!b||!document.documentElement.classList.contains("suite-on"))return;
      document.documentElement.classList.remove("suite-on");box.hidden=true;
      tabs.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    },true);
  }
  // the one footer of every app: the institute's mark and name (a plain link back to the institute) and the copyright.
  // Takes the place of the app's old footer (the element given) at the very end of the page, outside every tab, so it
  // shows on every tab. Not in the institute's アプリ / 書籍 frames (the app around them has its own).
  function foot(sel){
    const el=document.querySelector(sel||".foot");
    if(/[?&]embed=(apps|books)\b/.test(location.search)){if(el)el.remove();return}
    const st=document.createElement("style");st.textContent=`.ifoot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:22px;padding:14px 0 4px;border-top:1px solid var(--line,#2a2a4a)}
      .ifoot .ilab{display:flex;align-items:center;gap:10px;color:var(--ink,#f2f2f7);text-decoration:none;font-size:15px;font-weight:700;letter-spacing:.06em}
      .ifoot .ilab img{width:36px;height:36px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1px var(--line,#2a2a4a)}
      .ifoot .icopy{font-size:11px;color:var(--muted,#8a8aa6);white-space:nowrap}`;
    document.head.appendChild(st);
    const f=document.createElement("footer");f.className="ifoot";
    f.innerHTML=`<a class="ilab" href="${BASE}" target="_top"><img src="${BASE}icons/app.png" alt="" width="36" height="36"><span></span></a><span class="icopy">© Gold Locks</span>`;
    if(el)el.remove();(document.querySelector(".wrap")||document.body).appendChild(f);
    const name=()=>f.querySelector(".ilab span").textContent=document.documentElement.lang==="en"?"Fear Index Research Institute":"恐怖指数研究所";
    name();new MutationObserver(name).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  }
  window.Suite={mount,foot};
})();
