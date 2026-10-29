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
    [["apps","アプリ"],["books","書籍"]].forEach(([k,l])=>{const b=document.createElement("button");b.type="button";b.dataset.suite=k;b.textContent=l;b.setAttribute("aria-pressed","false");tabs.appendChild(b)});
    const box=document.createElement("div");box.className="suite-box";box.hidden=true;
    const at=document.querySelector(o.after||"#app");(at&&at.parentNode?at:tabs).parentNode.insertBefore(box,(at&&at.parentNode?at:tabs).nextSibling);
    const frames={};
    const fit=f=>{try{const d=f.contentDocument;if(d&&d.body)f.style.height=d.documentElement.scrollHeight+"px"}catch(e){}};
    function open(k){
      tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.suite===k));
      document.documentElement.classList.add("suite-on");box.hidden=false;
      Object.entries(frames).forEach(([n,f])=>f.hidden=n!==k);
      if(!frames[k]){const f=document.createElement("iframe");f.className="suite-frame";f.title=k==="apps"?"アプリ":"書籍";
        f.src=BASE+"?embed="+k;f.addEventListener("load",()=>{fit(f);try{new ResizeObserver(()=>fit(f)).observe(f.contentDocument.body)}catch(e){}});
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
  window.Suite={mount};
})();
