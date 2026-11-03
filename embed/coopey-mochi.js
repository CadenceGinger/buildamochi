/*! Coopey Mochi widget loader v2.1 (shop helper, TEST BUILD) · unofficial community fork of Mochi (MIT, Bernhard Mueller)
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
  '#cgm .cgm-ctx{display:none;padding:4px 8px;border-bottom:1px solid #2a2410;color:#f3e6c4;font:12px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cgm .cgm-ctx.on{display:block}'+
  '#cgm.up .cgm-p{position:fixed;bottom:auto;top:76px}#cgm.mini .cgm-p{height:auto}#cgm.mini iframe{display:none}'+
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
    [/\b(single|singles|raw|pokemon|pokémon|card|cards)\b/i,"/shop/singles","Pokémon singles"],
    [/\b(shop|all|everything|products?)\b/i,"/shop","Shop"],[/\b(cart|bag|basket)\b/i,"/cart","Cart"],
    [/\b(about)\b/i,"/about","About"],[/\b(contact|email|help)\b/i,"/contact","Contact"],[/\b(ship|shipping)\b/i,"/shipping","Shipping"]];
  var PRODUCT='.product-list-item,.product-detail .product-meta,.product-detail .product-gallery,.ProductList-item,.ProductItem,.grid-item,[data-mochi-product]';
  var ADD='.sqs-add-to-cart-button,.product-add-to-cart-button-wrapper button,.product-add-to-cart button,[data-add-to-cart],.add-to-cart,button.add,[data-mochi-add]';
  function helper(root,openPanel,frame,BASE){
    var ORIGIN=new URL(BASE,location.href).origin,still=matchMedia("(prefers-reduced-motion: reduce)");
    var g=document.createElement("div");g.id="cgm-g";g.innerHTML=face+'<div class="say" role="status" aria-live="polite"></div>';document.body.appendChild(g);
    var say=g.querySelector(".say"),sayT=0,on=true;
    function post(msg){var f=frame();if(f&&f.contentWindow)try{f.contentWindow.postMessage({mochiHelp:msg},ORIGIN)}catch(e){}}
    function talk(t,ms){say.textContent=t;say.classList.add("on");clearTimeout(sayT);sayT=setTimeout(function(){say.classList.remove("on")},ms||2600)}
    function hopTo(el){var r=el.getBoundingClientRect();var x=Math.max(4,Math.min(innerWidth-50,r.left+Math.min(r.width-30,24))),y=Math.max(60,r.top-40);
      g.classList.add("on");g.style.transform="translate("+x+"px,"+y+"px)";
      post({op:"look",x:28+(r.left+r.width/2)/innerWidth*904,y:28+(r.top+r.height/2)/innerHeight*544})}
    function label(el){var d=el.closest(".product-detail")||el,t=d.querySelector(".product-list-item-title,.product-title,h1,h2,h3,h4,.ProductList-title,.grid-title");t=((t||el).textContent||"").trim().replace(/\s+/g," ");
      var p=d.querySelector(".product-list-item-price,.product-price,.ProductList-price,.price,.grid-prices");p=p?p.textContent.trim().replace(/\s+/g," "):"";
      var m=p.match(/[$€£]\s?[\d,]+(?:\.\d{2})?/);p=m?m[0]:p.replace(/^Sale Price:?\s*/i,"").replace(/Original Price:?.*$/i,"").trim();
      if(t.length>30)t=t.slice(0,28).replace(/[\s(·,-]+$/,"")+"…";return t+(p?" · "+p:"")}
    var ctx=root.querySelector(".cgm-ctx");function show(t,raw){if(ctx&&t){ctx.textContent=(raw?"":"👀 ")+t;ctx.classList.add("on")}}
    function cat(a){var h=(a.getAttribute("href")||"").toLowerCase();for(var i=0;i<ROUTES.length;i++){if(h&&h.replace(/\/$/,"")===ROUTES[i][1])return ROUTES[i][2]}
      var t=(a.textContent||"").trim();for(i=0;i<ROUTES.length;i++)if(ROUTES[i][0].test(t))return ROUTES[i][2];return null}
    // 1) point at what the shopper hovers or clicks
    var hov=0,quiet=0;function target(e){if(!on||e.target.closest("#cgm,#cgm-g,#cg-greeter"))return null;
      return e.target.closest(PRODUCT)||e.target.closest('a[href*="/shop"],[data-mochi-go],.cat,nav a,header a')}
    document.addEventListener("mouseover",function(e){var el=target(e);if(!el)return;clearTimeout(hov);hov=setTimeout(function(){
      if(Date.now()<quiet)return;hopTo(el);if(el.matches(PRODUCT)){var L=label(el);talk(L);show(L)}else{var c=el.dataset.mochiGo||cat(el);if(c)talk(c+" this way!")}},350)},true);
    document.addEventListener("focusin",function(e){var el=target(e);if(el){hopTo(el)}},true);
    // 3) celebrate add-to-cart
    function sparks(x,y){if(still.matches)return;for(var i=0;i<10;i++){var s=document.createElement("span");s.className="cgm-spark";s.textContent=i%2?"✦":"★";
      s.style.color=i%3?"#e8c55a":"#fff8ef";s.style.left=x+"px";s.style.top=y+"px";s.style.setProperty("--dx",(Math.cos(i*.63)*60)+"px");s.style.setProperty("--dy",(Math.sin(i*.63)*60-30)+"px");
      document.body.appendChild(s);setTimeout(function(s){s.remove()}.bind(null,s),1100)}}
    function cart(btn){if(!on)return;quiet=Date.now()+3500;clearTimeout(hov);if(btn)hopTo(btn);g.classList.remove("yay");void g.offsetWidth;g.classList.add("yay");
      var r=(btn||g).getBoundingClientRect();sparks(r.left+Math.min(r.width/2,60),r.top-20);talk("Added to your cart!",3000);post({op:"cart"})}
    var lastCheer=0,pend=null,pendT=0;function cheer(b){if(Date.now()-lastCheer<2500)return;lastCheer=Date.now();pend=null;cart(b);show("🎉 Added to your cart!",1)}
    // only cheer once Squarespace confirms the add; a refused add gets a gentle note instead
    function nope(){if(!on||Date.now()-lastCheer<2500)return;lastCheer=Date.now();var b=pend;pend=null;quiet=Date.now()+3500;if(b)hopTo(b);
      talk("Looks like that one's sold out of extras!",3500);show("😅 Looks like that one's sold out of extras!",1)}
    function isCart(u){return /shopping-cart|\/api\/commerce\/.*cart|\/cart\/(add|entries)/i.test(String(u||""))}
    function settle(ok){if(!pend&&Date.now()-pendT>8000)return;ok?cheer(pend||document.querySelector(ADD)):nope()}
    try{var F=window.fetch;if(F)window.fetch=function(i,o){var u=typeof i==="string"?i:(i&&i.url),m=((o&&o.method)||(i&&i.method)||"GET").toUpperCase(),r=F.apply(this,arguments);
      if(m!=="GET"&&isCart(u))r.then(function(x){settle(x.ok)},function(){settle(false)});return r}}catch(e){}
    try{var XO=XMLHttpRequest.prototype.open,XS=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(m,u){this._cgm=String(m).toUpperCase()!=="GET"&&isCart(u);return XO.apply(this,arguments)};
      XMLHttpRequest.prototype.send=function(){var x=this;if(x._cgm)x.addEventListener("loadend",function(){settle(x.status>=200&&x.status<300)});return XS.apply(this,arguments)}}catch(e){}
    document.addEventListener("click",function(e){var b=e.target.closest(ADD);if(b&&!e.target.closest("#cgm")){pend=b;pendT=Date.now()}},true);
    function qty(){var q=document.querySelector(".sqs-cart-quantity");return q?parseInt(q.textContent,10)||0:null}
    var q0=qty();setInterval(function(){var q=qty();if(q!==null&&q0!==null&&q>q0)cheer(pend||document.querySelector(ADD));if(q!==null)q0=q;
      if(pend&&Date.now()-pendT<8000){var d=[].slice.call(document.querySelectorAll('.sqs-widgets-confirmation,.sqs-modal-lightbox,[role="dialog"],[role="alertdialog"]')).some(function(x){return x.offsetParent&&/unable to add|only have|not available|out of stock|sold out/i.test(x.textContent)});if(d)nope()}
      if(pend&&Date.now()-pendT>8000)pend=null},300);
    // 2) lead the way to a category the shopper asks for
    function find(path,lab){var sel='[data-mochi-go="'+lab+'"],a[href$="'+path+'"],a[href$="'+path+'/"]';return document.querySelector(sel)}
    function go(q){q=String(q||"");for(var i=0;i<ROUTES.length;i++)if(ROUTES[i][0].test(q)){var R=ROUTES[i],el=find(R[1],R[2]);on=true;
        if(el&&el.hasAttribute("data-mochi-go")){el.scrollIntoView({behavior:still.matches?"auto":"smooth",block:"center"});setTimeout(function(){hopTo(el);talk(R[2]+" is right here!")},still.matches?50:700);return R[1]}
        if(el)hopTo(el);talk("Taking you to "+R[2]+"…");
        try{sessionStorage.setItem('cgm-open','1')}catch(e){}setTimeout(function(){if(location.pathname.replace(/\/$/,"")!==R[1])location.href=R[1]},el?1300:900);return R[1]}
      talk("I can show Singles, Graded (PSA, CGC, Beckett), Funko Pops or Chase.",4200);g.classList.add("on");return null}
    root.querySelector(".cgm-ask").onsubmit=function(e){e.preventDefault();var i=this.querySelector("input");go(i.value);i.value=""};
    // helper is on while the panel is open
    new MutationObserver(function(){on=root.classList.contains("open");if(!on){g.classList.remove("on")}else{var b=root.querySelector(".cgm-b").getBoundingClientRect();g.style.transform="translate("+(b.left+300)+"px,"+(innerHeight-90)+"px)";g.classList.add("on");if(!(ctx&&ctx.classList.contains("on")))talk("Hover anything and I'll point. Or ask me where to go!",3500)}}).observe(root,{attributes:true,attributeFilter:["class"]});
    var pd=document.querySelector(".product-detail");if(pd){var PL=label(pd);show(PL);setTimeout(function(){var t=pd.querySelector(".product-title")||pd;hopTo(t);talk("Ooh, "+PL,3500)},900)}
    try{if(sessionStorage.getItem('cgm-open')){sessionStorage.removeItem('cgm-open');openPanel(true)}}catch(e){}
    return {go:go,cart:cart}}
  function init(){
    var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    var root=document.createElement("div");root.id="cgm";
    root.innerHTML='<div class="cgm-p" role="dialog" aria-label="Mochi"><div class="cgm-h"><span>Mochi</span>'+
      '<a href="https://github.com/CadenceGinger/buildamochi" target="_blank" rel="noopener">Powered by Cadence (GPL-3.0) · source</a>'+
      '<button class="cgm-x" type="button" aria-label="Close Mochi">&times;</button></div>'+
      '<div class="cgm-ctx" role="status" aria-live="polite"></div><form class="cgm-ask"><input aria-label="Ask Mochi where to go" placeholder="Where to? graded, PSA, chase…" maxlength="40"><button type="submit">Go</button></form></div>'+
      '<button class="cgm-b" type="button" aria-expanded="false" aria-label="Mochi">'+face+'<span>Mochi</span></button>';
    document.body.appendChild(root);
    var panel=root.querySelector(".cgm-p"),btn=root.querySelector(".cgm-b"),loaded=false;
    function open(v){
      if(v&&!loaded){var f=document.createElement("iframe");f.title="Mochi, a pet with a live Cadence brain";
        f.src=BASE+"?brain=0";f.loading="eager";f.allow="autoplay";panel.appendChild(f);loaded=true}
      root.classList.toggle("open",v);btn.setAttribute("aria-expanded",v?"true":"false");try{sessionStorage.setItem('cgm-keep',v?'1':'0')}catch(e){}avoid()}
    // never cover Add to Cart: move the panel to the top, then shrink it to its header if still in the way
    function hits(a,b){return !(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom)}
    function avoid(){root.classList.remove("up","mini");if(!root.classList.contains("open"))return;
      var bs=[].slice.call(document.querySelectorAll(ADD)).filter(function(b){return b.offsetParent&&!b.closest("#cgm")}).map(function(b){return b.getBoundingClientRect()});
      function bad(){var p=panel.getBoundingClientRect();return bs.some(function(r){return r.bottom>0&&r.top<innerHeight&&hits(r,p)})}
      if(bad()){root.classList.add("up");if(bad()){root.classList.remove("up");root.classList.add("mini");if(bad())root.classList.add("up")}}}
    var avT=0;function avoidSoon(){clearTimeout(avT);avT=setTimeout(avoid,80)}addEventListener("scroll",avoidSoon,{passive:true});addEventListener("resize",avoidSoon);
    btn.onclick=function(){open(!root.classList.contains("open"))};
    // greeter (Squarespace Code Injection) links use ?category= filters that return no results; point them at the real category pages
    var FIX={"funko+pops":"/shop/funko-pops","pokemon+cards":"/shop/singles","graded+cards":"/shop/graded"};
    function fixLinks(){[].forEach.call(document.querySelectorAll('a[href*="/shop?category="]'),function(a){var k=(a.getAttribute("href").split("category=")[1]||"").toLowerCase();if(FIX[k])a.setAttribute("href",FIX[k])})}
    fixLinks();setTimeout(fixLinks,800);setTimeout(fixLinks,3000);
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
    try{if(sessionStorage.getItem('cgm-keep')==='1')open(true)}catch(e){}
    window.CoopeyMochi={open:function(){open(true)},close:function(){open(false)},go:H.go,cart:H.cart};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
