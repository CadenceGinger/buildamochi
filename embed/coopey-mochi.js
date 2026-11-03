/*! Coopey Mochi widget loader v2 (shop helper, TEST BUILD) · unofficial community fork of Mochi (MIT, Bernhard Mueller)
 *  running a Cadence brain (GPL-3.0-only). Source: https://github.com/CadenceGinger/buildamochi
 *  This loader is ~4 KB and fetches nothing else until the visitor opens the bubble.
 *  No cookies and no tracking. Mochi is saved only in the visitor's own browser. */
(function(){
  if(window.__cgMochi)return;window.__cgMochi=1;
  var s=document.currentScript, BASE=(s&&s.dataset.base)||"https://buildamochi.com/embed/";
  var css='#cgm{position:fixed;left:16px;bottom:16px;z-index:99998;font-family:system-ui,sans-serif}'+
  '#cgm .cgm-b{display:flex;align-items:center;gap:8px;background:#0b0b0b;color:#e8c55a;border:1px solid #c9a227;border-radius:999px;padding:6px 14px 6px 6px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.6);font:600 13px system-ui,sans-serif}'+
  '#cgm .cgm-b:hover,#cgm .cgm-b:focus-visible{background:#1a160c}'+
  '#cgm .cgm-b svg{width:34px;height:34px}'+
  '#cgm .cgm-p{display:none;position:absolute;left:0;bottom:56px;width:280px;height:340px;background:#0b0b0b;border:1px solid #c9a227;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.7)}'+
  '#cgm.open .cgm-p{display:flex;flex-direction:column}'+
  '#cgm .cgm-h{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #c9a227;color:#e8c55a;font:600 13px system-ui,sans-serif}'+
  '#cgm .cgm-h a{color:#cdbf9a;font-weight:400;font-size:10.5px}'+
  '#cgm .cgm-x{background:none;border:0;color:#c9a227;font-size:20px;cursor:pointer;line-height:1}'+
  '#cgm iframe{flex:1;width:100%;border:0;background:#0b0b0b}'+
  '#cgm .cgm-ask{display:flex;gap:4px;padding:5px 6px;border-bottom:1px solid #2a2410}'+
  '#cgm .cgm-ask input{flex:1;min-width:0;background:#141414;color:#eee;border:1px solid #c9a227;border-radius:6px;padding:4px 6px;font:12px system-ui}'+
  '#cgm .cgm-ask button{background:#c9a227;color:#0b0b0b;border:0;border-radius:6px;font:600 11px system-ui;padding:0 8px;cursor:pointer}'+
  '#cgm-g{position:fixed;left:0;top:0;width:46px;height:46px;z-index:99997;pointer-events:none;display:none;transition:transform .5s cubic-bezier(.3,1.5,.5,1);filter:drop-shadow(0 4px 6px rgba(0,0,0,.7))}'+
  '#cgm-g.on{display:block}#cgm-g svg{width:100%;height:100%}#cgm-g.yay svg{animation:cgmyay .8s ease-in-out 2}'+
  '#cgm-g .say{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);background:#0b0b0b;color:#f3e6c4;border:1px solid #c9a227;border-radius:10px;padding:5px 8px;font:12px system-ui;white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis;display:none}'+
  '#cgm-g .say.on{display:block}'+
  '.cgm-spark{position:fixed;z-index:99996;pointer-events:none;font-size:18px;animation:cgmsp 1s ease-out forwards}'+
  '@keyframes cgmyay{0%,100%{transform:none}40%{transform:translateY(-22px) rotate(-12deg)}70%{transform:translateY(-8px) rotate(10deg)}}'+
  '@keyframes cgmsp{to{transform:translate(var(--dx),var(--dy));opacity:0}}'+
  '@media (prefers-reduced-motion:reduce){#cgm-g{transition:none}#cgm-g.yay svg,.cgm-spark{animation:none}}'+
  '@media (max-width:600px){#cgm{left:10px;bottom:10px}#cgm .cgm-b span{display:none}#cgm .cgm-b{padding:5px}'+
  '#cgm .cgm-p{position:fixed;left:8px;right:8px;bottom:64px;width:auto;height:min(55vh,360px)}}';
  var face='<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M14 58c-4-22 8-40 26-40s30 18 26 40c-2 10-50 10-52 0z" fill="#fff8ef" stroke="#c9a227" stroke-width="3"/><circle cx="31" cy="40" r="3.6" fill="#111"/><circle cx="49" cy="40" r="3.6" fill="#111"/><ellipse cx="25" cy="47" rx="4" ry="2.4" fill="#f4b6b6"/><ellipse cx="55" cy="47" rx="4" ry="2.4" fill="#f4b6b6"/><path d="M36 47q4 4 8 0" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';

  // ---------------- Shop helper ----------------
  // The little guide on the page is a plain animation (not Mochi's brain). It points at what the
  // shopper hovers or clicks, leads to a category the shopper asks for, and celebrates add-to-cart.
  // The live Mochi in the panel gets the same moments as ordinary world events (a gold spot where
  // the shopper looks; a cookie and praise on add-to-cart) and reacts with its own Cadence brain.
  // Works by category URLs and Squarespace collection/product selectors, never by product names.
  // Sends nothing anywhere except postMessage into the Mochi iframe; typed text never leaves the page.
  var ROUTES=[ // [words, path, label]  (paths as set up on the live shop)
    [/\b(psa)\b/i,"/shop/graded/psa","PSA graded"],[/\b(cgc)\b/i,"/shop/graded/cgc","CGC graded"],
    [/\b(beckett|bgs)\b/i,"/shop/graded/beckett","Beckett graded"],[/\b(chase|chases)\b/i,"/shop/funko-pops/chase","Funko Chase"],
    [/\b(grade|graded|slab|slabs)\b/i,"/shop/graded","Graded"],[/\b(funko|funkos|pop|pops)\b/i,"/shop/funko-pops","Funko Pops"],
    [/\b(single|singles|raw|pokemon|pokémon|card|cards)\b/i,"/shop/singles","Singles"],
    [/\b(shop|all|everything|products?)\b/i,"/shop","Shop"],[/\b(cart|bag|basket)\b/i,"/cart","Cart"],
    [/\b(about)\b/i,"/about","About"],[/\b(contact|email|help)\b/i,"/contact","Contact"],[/\b(ship|shipping)\b/i,"/shipping","Shipping"]];
  var PRODUCT='.ProductList-item,.product-list-item,.grid-item,.list-grid-item,.ProductItem,[data-mochi-product]';
  var ADD='.sqs-add-to-cart-button,.product-add-to-cart button,[data-add-to-cart],.add-to-cart,button.add,[data-mochi-add]';
  function helper(root,openPanel,frame,BASE){
    var ORIGIN=new URL(BASE,location.href).origin,still=matchMedia("(prefers-reduced-motion: reduce)");
    var g=document.createElement("div");g.id="cgm-g";g.innerHTML=face+'<div class="say" role="status" aria-live="polite"></div>';document.body.appendChild(g);
    var say=g.querySelector(".say"),sayT=0,on=false;
    function post(msg){var f=frame();if(f&&f.contentWindow)try{f.contentWindow.postMessage({mochiHelp:msg},ORIGIN)}catch(e){}}
    function talk(t,ms){say.textContent=t;say.classList.add("on");clearTimeout(sayT);sayT=setTimeout(function(){say.classList.remove("on")},ms||2600)}
    function hopTo(el){var r=el.getBoundingClientRect();var x=Math.max(4,Math.min(innerWidth-50,r.left+Math.min(r.width-30,24))),y=Math.max(60,r.top-40);
      g.classList.add("on");g.style.transform="translate("+x+"px,"+y+"px)";
      post({op:"look",x:28+(r.left+r.width/2)/innerWidth*904,y:28+(r.top+r.height/2)/innerHeight*544})}
    function label(el){var t=el.querySelector("h1,h2,h3,h4,.ProductList-title,.product-title,.grid-title");t=((t||el).textContent||"").trim().replace(/\s+/g," ");
      var p=el.querySelector(".product-price,.ProductList-price,.price,.grid-prices");p=p?p.textContent.trim().replace(/\s+/g," "):"";
      return (t.slice(0,34)+(p?" · "+p.slice(0,14):""))}
    function cat(a){var h=(a.getAttribute("href")||"").toLowerCase();for(var i=0;i<ROUTES.length;i++){if(h&&h.replace(/\/$/,"")===ROUTES[i][1])return ROUTES[i][2]}
      var t=(a.textContent||"").trim();for(i=0;i<ROUTES.length;i++)if(ROUTES[i][0].test(t))return ROUTES[i][2];return null}
    // 1) point at what the shopper hovers or clicks
    var hov=0,quiet=0;function target(e){if(!on||e.target.closest("#cgm,#cgm-g,#cg-greeter"))return null;
      return e.target.closest(PRODUCT)||e.target.closest('a[href*="/shop"],[data-mochi-go],.cat,nav a,header a')}
    document.addEventListener("mouseover",function(e){var el=target(e);if(!el)return;clearTimeout(hov);hov=setTimeout(function(){
      if(Date.now()<quiet)return;hopTo(el);if(el.matches(PRODUCT))talk(label(el));else{var c=el.dataset.mochiGo||cat(el);if(c)talk(c+" this way!")}},350)},true);
    document.addEventListener("focusin",function(e){var el=target(e);if(el){hopTo(el)}},true);
    // 3) celebrate add-to-cart
    function sparks(x,y){if(still.matches)return;for(var i=0;i<10;i++){var s=document.createElement("span");s.className="cgm-spark";s.textContent=i%2?"✦":"★";
      s.style.color=i%3?"#e8c55a":"#fff8ef";s.style.left=x+"px";s.style.top=y+"px";s.style.setProperty("--dx",(Math.cos(i*.63)*60)+"px");s.style.setProperty("--dy",(Math.sin(i*.63)*60-30)+"px");
      document.body.appendChild(s);setTimeout(function(s){s.remove()}.bind(null,s),1100)}}
    function cart(btn){if(!on)return;quiet=Date.now()+3500;clearTimeout(hov);if(btn)hopTo(btn);g.classList.remove("yay");void g.offsetWidth;g.classList.add("yay");
      var r=(btn||g).getBoundingClientRect();sparks(r.left+Math.min(r.width/2,60),r.top-20);talk("Added to your cart!",3000);post({op:"cart"})}
    document.addEventListener("click",function(e){var b=e.target.closest(ADD);if(b&&!e.target.closest("#cgm"))setTimeout(function(){cart(b)},60)},true);
    // 2) lead the way to a category the shopper asks for
    function find(path,lab){var sel='[data-mochi-go="'+lab+'"],a[href$="'+path+'"],a[href$="'+path+'/"]';return document.querySelector(sel)}
    function go(q){q=String(q||"");for(var i=0;i<ROUTES.length;i++)if(ROUTES[i][0].test(q)){var R=ROUTES[i],el=find(R[1],R[2]);on=true;
        if(el&&el.hasAttribute("data-mochi-go")){el.scrollIntoView({behavior:still.matches?"auto":"smooth",block:"center"});setTimeout(function(){hopTo(el);talk(R[2]+" is right here!")},still.matches?50:700);return R[1]}
        if(el)hopTo(el);talk("Taking you to "+R[2]+"…");
        try{sessionStorage.setItem('cgm-open','1')}catch(e){}setTimeout(function(){if(location.pathname.replace(/\/$/,"")!==R[1])location.href=R[1]},el?1300:900);return R[1]}
      talk("I can show Singles, Graded (PSA, CGC, Beckett), Funko Pops or Chase.",4200);g.classList.add("on");return null}
    root.querySelector(".cgm-ask").onsubmit=function(e){e.preventDefault();var i=this.querySelector("input");go(i.value);i.value=""};
    // helper is on while the panel is open
    new MutationObserver(function(){on=root.classList.contains("open");if(!on){g.classList.remove("on")}else{var b=root.querySelector(".cgm-b").getBoundingClientRect();g.style.transform="translate("+(b.left+300)+"px,"+(innerHeight-90)+"px)";g.classList.add("on");talk("Hover anything and I'll point. Or ask me where to go!",3500)}}).observe(root,{attributes:true,attributeFilter:["class"]});
    try{if(sessionStorage.getItem('cgm-open')){sessionStorage.removeItem('cgm-open');openPanel(true)}}catch(e){}
    return {go:go,cart:cart}}
  function init(){
    var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    var root=document.createElement("div");root.id="cgm";
    root.innerHTML='<div class="cgm-p" role="dialog" aria-label="Mochi"><div class="cgm-h"><span>Mochi</span>'+
      '<a href="https://github.com/CadenceGinger/buildamochi" target="_blank" rel="noopener">Powered by Cadence (GPL-3.0) · source</a>'+
      '<button class="cgm-x" type="button" aria-label="Close Mochi">&times;</button></div>'+
      '<form class="cgm-ask"><input aria-label="Ask Mochi where to go" placeholder="Where to? graded, PSA, chase…" maxlength="40"><button type="submit">Go</button></form></div>'+
      '<button class="cgm-b" type="button" aria-expanded="false" aria-label="Mochi">'+face+'<span>Mochi</span></button>';
    document.body.appendChild(root);
    var panel=root.querySelector(".cgm-p"),btn=root.querySelector(".cgm-b"),loaded=false;
    function open(v){
      if(v&&!loaded){var f=document.createElement("iframe");f.title="Mochi, a pet with a live Cadence brain";
        f.src=BASE+"?brain=0";f.loading="eager";f.allow="autoplay";panel.appendChild(f);loaded=true}
      root.classList.toggle("open",v);btn.setAttribute("aria-expanded",v?"true":"false")}
    btn.onclick=function(){open(!root.classList.contains("open"))};
    root.querySelector(".cgm-x").onclick=function(){open(false)};
    // One character: the greeter's card gets a "Play with Mochi" button that opens this panel.
    function hook(){var card=document.querySelector("#cg-greeter .cg-links");if(!card){return false}
      if(card.querySelector(".cgm-play"))return true;
      var a=document.createElement("a");a.href="#";a.className="cgm-play";a.textContent="Mochi";a.style.gridColumn="1 / -1";
      a.onclick=function(e){e.preventDefault();var c=document.querySelector('#cg-greeter .cg-card');if(c&&mq.matches)c.classList.add('cg-hide');open(true)};card.appendChild(a);return true}
    if(!hook()){var n=0,t=setInterval(function(){if(hook()||++n>20)clearInterval(t)},500)}
    // Phones: while the greeter's welcome card is showing it holds the "Play with me" button,
    // so the bubble steps aside instead of sitting under the card.
    var mq=window.matchMedia("(max-width:600px)");
    function dodge(){var c=document.querySelector("#cg-greeter .cg-card");
      var hide=mq.matches&&c&&!c.classList.contains("cg-hide")&&!root.classList.contains("open");
      root.style.display=hide?"none":""}
    dodge();setInterval(dodge,600);
    var H=helper(root,open,function(){return panel.querySelector('iframe')},BASE);
    window.CoopeyMochi={open:function(){open(true)},close:function(){open(false)},go:H.go,cart:H.cart};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
