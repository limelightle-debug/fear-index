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

  // the festival banner of a VIX event: while one is on (the VIX app's notes, mri-app/data/vix_notes.json), a large
  // "VIXイベント開催中！" under the given element, linking to the VIX app. ?sim=YYYYMM&d=YYYYMMDD previews a past event.
  function fest(o){
    if(/[?&]embed\b/.test(location.search))return;
    const anchor=document.querySelector(o.after);if(!anchor)return;
    const st=document.createElement("style");st.textContent=`.sfest{position:relative;overflow:hidden;display:block;margin-top:10px;border-radius:16px;padding:16px 14px 12px;text-align:center;color:#fff;text-decoration:none;
      background:radial-gradient(120% 140% at 50% 0%,#ff3b5c 0%,#b3122e 45%,#3a0410 100%);border:1px solid #ff6b85;animation:sfestglow 1.6s ease-in-out infinite}
      .sfest::before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,transparent 0 20deg,#fff2 20deg 30deg,transparent 30deg 60deg,#fff1 60deg 70deg,transparent 70deg 110deg,#fff2 110deg 120deg,transparent 120deg 160deg,#fff1 160deg 170deg,transparent 170deg 200deg,#fff2 200deg 210deg,transparent 210deg 250deg,#fff1 250deg 260deg,transparent 260deg 300deg,#fff2 300deg 310deg,transparent 310deg);animation:sfestspin 14s linear infinite;pointer-events:none}
      .sfest>*{position:relative}.sfest .fx{font-weight:900;font-size:28px;letter-spacing:.04em;line-height:1.1;text-shadow:0 0 18px #ffb3c1,0 2px 0 #5a0010}
      .sfest .fs{margin-top:7px;font-size:12.5px;font-weight:800;color:#ffe2e7}.sfest .fq{margin-top:5px;font-size:11px;font-weight:700;color:#ffc2cd}
      .sfest.m3{background:radial-gradient(120% 140% at 50% 0%,#ffcf3b 0%,#ff3b5c 40%,#3a0410 100%)}
      @keyframes sfestglow{0%,100%{box-shadow:0 0 0 1px #ff3b5c55,0 0 18px #ff3b5c66}50%{box-shadow:0 0 0 1px #ff3b5caa,0 0 34px #ff3b5ccc}}
      @keyframes sfestspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.sfest,.sfest::before{animation:none}}
      @media (max-width:360px){.sfest .fx{font-size:24px}}`;
    document.head.appendChild(st);
    const box=document.createElement("div");anchor.insertAdjacentElement("afterend",box);
    const q=new URLSearchParams(location.search),sim=+q.get("sim"),simd=+q.get("d");
    let N=null;
    const draw=()=>{
      if(!N){box.innerHTML="";return}
      let n=sim?N.notes.find(x=>x.ym===sim):N.notes.find(x=>x.active);if(!n){box.innerHTML="";return}
      let R=n.rows;if(sim){const d=simd&&R.some(r=>r[0]===simd)?simd:n.start;R=R.filter(r=>r[0]<=d);if(n.end&&d>=n.end){box.innerHTML="";return}}
      const en=document.documentElement.lang==="en",si=R.findIndex(r=>r[0]===n.start),day=si>=0?R.length-si:1;
      let w=1;R.forEach(r=>r[8].forEach(m=>{if(m[0]==="start")w=m[1]}));
      const m3=Math.max(...R.slice(Math.max(si,0)).map(r=>r[1]))>=n.sig[2];
      box.innerHTML=`<a class="sfest${m3?" m3":""}" href="${BASE}../mri-app/vix/${sim?`?sim=${sim}${simd?`&d=${simd}`:""}`:""}" target="_top"><div class="fx">${en?"VIX EVENT IS ON!":"VIXイベント開催中！"}</div><div class="fs">${en?`${n.en} ${n.year}  day ${day}  wave ${w}${m3?"  +3σ reached":""}`:`${n.name} ${n.year}　開催${day}日目　第${w}波${m3?"　+3σ到達":""}`}</div><div class="fq">${en?"Who masters fear masters the market ›":"恐怖を制するものは相場を制す ›"}</div></a>`;
    };
    const load=()=>fetch(BASE+"../mri-app/data/vix_notes.json?ts="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{if(j){N=j;draw()}}).catch(()=>{});
    load();setInterval(()=>{if(!document.hidden)load()},5*60*1000);
    new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  }
  window.Suite={mount,foot,fest};
})();
