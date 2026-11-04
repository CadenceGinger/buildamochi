/*! Coopey Mochi widget loader v2.1 (shop helper + collector glossary, TEST BUILD) · unofficial community fork of Mochi (MIT, Bernhard Mueller)
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
    // 4) Collector glossary (TEST BUILD). A plain rule decides when Mochi chimes in, not the Cadence brain:
    // the brain links words to actions and rewards; it does not learn definitions. Rule: at most one automatic
    // tip per page view (desktop only, never at 600px or narrower), any number when the shopper taps an underlined term.
    // The brain only gets an ordinary "look" event at the term, same as a hover.
    var GL=[ // [pattern, explanation]  longest/most specific first
      [/\bPSA\s*10\b/i,"PSA 10 means Gem Mint, the top grade from PSA!"],
      [/\bPSA\s*9\b/i,"PSA 9 is Mint, one step below PSA's top grade (Gem Mint 10)."],
      [/\bPSA\s*8\b/i,"PSA 8 is Near Mint-Mint on PSA's 1–10 scale."],
      [/\bPSA\b/,"PSA (Professional Sports Authenticator) grades cards 1–10 and seals them in a slab."],
      [/\b(CGC\s*Pristine\s*10|Pristine\s*10\s*CGC|Pristine\s*10)\b/i,"CGC Pristine 10 is CGC's very highest grade, a step above Gem Mint 10!"],
      [/\bCGC\s*10\b/i,"CGC 10 is Gem Mint from CGC; only Pristine 10 ranks higher."],
      [/\bCGC\b/,"CGC grades cards on a 1–10 scale (half points too) and seals them in a slab."],
      [/\bBlack\s*Label\b/i,"A BGS Black Label is a 10 with perfect 10s in all four subgrades. Super rare!"],
      [/\b(BGS|Beckett)\b/,"BGS (Beckett Grading Services) gives subgrades for centering, corners, edges and surface."],
      [/\b(slab|slabbed)\b/i,"A slab is the sealed, tamper-evident plastic case a graded card lives in."],
      [/\bpop(ulation)?\s*report\b/i,"The pop report counts how many copies a grader has given each grade."],
      [/\bReverse\s*Holo\b/i,"Reverse Holo means the shiny foil is on the card everywhere except the artwork."],
      [/\bSpecial\s*Illustration\s*Rare\b|\bSIR\b/,"Special Illustration Rares are full-card art showpieces, among the rarest in Scarlet & Violet sets."],
      [/\bIllustration\s*Rare\b/i,"Illustration Rares show a Pokémon in full-card artwork that extends past the frame."],
      [/\bArt\s*Rare\b/i,"Art Rare (AR) is the Japanese name for an Illustration Rare: full-card artwork."],
      [/\b(Alt(ernate)?\s*Art)\b/i,"Alt Art cards are special versions with unique full-scene artwork, loved by collectors."],
      [/\bFull\s*Art\b/i,"Full Art means the artwork covers the whole card, not just a window."],
      [/\bSecret\s*Rare\b/i,"A Secret Rare's number is higher than the set's printed total, like 201/198."],
      [/\bUltra\s*Rare\b/i,"Ultra Rare is a rarity tier above Holo Rare, home to big cards like V, ex and Full Arts."],
      [/\bTrainer\s*Gallery\b|\bTG\d+(\/TG\d+)?\b/i,"Trainer Gallery (TG) cards show a Pokémon with its Trainer, from Sword & Shield era sets."],
      [/\bBlack\s*Star\s*Promo\b/i,"Black Star Promos are official promo cards marked with a black star, given out outside of packs."],
      [/\bPromo\b/i,"A promo card comes from a special product or event instead of regular booster packs."],
      [/\bHolo(foil|graphic)?\b/i,"Holo means the artwork has shiny holographic foil."],
      [/\b1st\s*Edition\b/i,"1st Edition cards are from the first print run of early sets, marked with a 1st Edition stamp."],
      [/\bShadowless\b/i,"Shadowless is an early Base Set print without the drop shadow beside the art box."],
      [/\bVMAX\b/,"VMAX cards evolve from a Pokémon V and give up three Prize cards when knocked out."],
      [/\bVSTAR\b/,"VSTAR cards evolve from a Pokémon V and have a once-per-game VSTAR Power."],
      [/\bGX\b/,"GX cards (Sun & Moon era) have a powerful once-per-game GX attack."],
      [/\b(NM|Near\s*Mint)\b/,"Near Mint (NM) means a raw card that looks almost untouched, at most tiny flaws."],
      [/\bLP:?\s*(1\/[\d,]+|[\d,]+)/,function(m){var n=m[1].replace(/^1\//,"");return "On a Pop, LP: "+n+" means Limited Production, a stated run of "+n+" pieces."}],
      [/\b(LP|Lightly\s*Played)\b(?!:?\s*\d)/,"Lightly Played (LP) means a raw card with light wear, like minor edge whitening."],
      [/\bRaw\b/,"Raw means the card is ungraded, not in a slab."],
      [/\bChase\b/i,"A Chase is a rarer variant of a Pop, often packed about 1 in 6 with the regular one."],
      [/\bVaulted\b/i,"Vaulted means Funko has retired that Pop, so no new ones are being made."],
      [/\b(SDCC|NYCC|Convention\s*Exclusive|(summer|fall|winter)\s*convention)\b/i,"Convention Pops were sold at a Funko convention event, usually in limited numbers."],
      [/\bExclusive\b/i,"An Exclusive is sold only by one store or event, often marked with a sticker on the box."],
      [/\bFlocked\b/i,"Flocked Pops have a soft, fuzzy coating."],
      [/\b(GITD|Glow\s*in\s*the\s*Dark)\b/i,"GITD means Glow in the Dark!"],
      [/\bPop\s*Protector\b/i,"A Pop protector is a clear plastic case that keeps the box safe from dings."],
      [/\b(OOB|Out\s*of\s*Box)\b/i,"OOB means out of box: the figure without its original packaging."],
      [/\b(NIB|MIB|New\s*in\s*Box|Mint\s*in\s*Box)\b/i,"NIB means new in box: never opened, still in its original packaging."],
      [/\bSealed\b/i,"Sealed means factory sealed and never opened."],
      [/\bGrail\b/i,"A grail is a collector's dream item, the top of the wishlist!"],
      [/\bBundle\b/i,"A bundle is several items sold together as one listing."]];
    function tip(i,m){var t=GL[i][1];return typeof t==="function"?t(m):t}
    var glcss=document.createElement("style");glcss.textContent='.cgm-term{text-decoration:underline dotted #c9a227 2px;text-underline-offset:3px;cursor:help;border-radius:3px}.cgm-term:focus-visible{outline:2px solid #c9a227}'+
      '#cgm-gl{position:fixed;z-index:99999;max-width:min(280px,calc(100vw - 16px));background:#0b0b0b;color:#f3e6c4;border:1px solid #c9a227;border-radius:12px;padding:8px 30px 8px 10px;font:13px/1.35 system-ui,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.6);display:none}'+
      '#cgm-gl.on{display:block}#cgm-gl b{color:#e8c55a}#cgm-gl button{position:absolute;top:2px;right:6px;background:none;border:0;color:#c9a227;font-size:18px;cursor:pointer}';document.head.appendChild(glcss);
    var bub=document.createElement("div");bub.id="cgm-gl";bub.setAttribute("role","status");bub.setAttribute("aria-live","polite");document.body.appendChild(bub);var bubT=0;
    function prim(){return [].slice.call(document.querySelectorAll(ADD+',.cart-checkout-button,[class*="checkout-button"],a[href*="/checkout"]')).filter(function(e){return e.getClientRects().length&&!e.closest("#cgm")}).map(function(e){return e.getBoundingClientRect()})}
    function clash(a){return prim().some(function(b){return !(a.right+6<b.left||a.left-6>b.right||a.bottom+6<b.top||a.top-6>b.bottom)})}
    function explain(el,auto){var r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return false;
      bub.innerHTML='<b>'+'💡 '+'</b>'+el.dataset.tip.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'<button type="button" aria-label="Close tip">&times;</button>';bub.classList.add("on");
      bub.querySelector("button").onclick=function(){bub.classList.remove("on")};
      var w=bub.offsetWidth,h=bub.offsetHeight,x=Math.max(8,Math.min(innerWidth-w-8,r.left)),spots=[r.bottom+8,r.top-h-8],ok=false;
      for(var k=0;k<2&&!ok;k++){var y=spots[k];if(y<8||y+h>innerHeight-8)continue;bub.style.left=x+"px";bub.style.top=y+"px";ok=!clash(bub.getBoundingClientRect())}
      if(!ok){bub.classList.remove("on");return false} // never cover Add to cart / Checkout
      post({op:"look",x:28+(r.left+r.width/2)/innerWidth*904,y:28+(r.top+r.height/2)/innerHeight*544});
      clearTimeout(bubT);bubT=setTimeout(function(){bub.classList.remove("on")},auto?6000:9000);return true}
    function mark(node){var seen={};var tw=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode:function(n){return n.parentNode.closest("a,button,script,style,.cgm-term,#cgm,#cgm-g,#cgm-gl,input,select,textarea")?2:1}}),list=[],n;
      while(n=tw.nextNode())list.push(n);var out=[];
      list.forEach(function(tn){var go=true;while(go){go=false;var txt=tn.nodeValue,best=null;
        for(var i=0;i<GL.length;i++){if(seen[i])continue;var m=GL[i][0].exec(txt);if(m&&(!best||m.index<best.m.index||(m.index===best.m.index&&m[0].length>best.m[0].length)))best={i:i,m:m}}
        if(!best)break;var mm=best.m,s=document.createElement("span");s.className="cgm-term";s.tabIndex=0;s.setAttribute("role","button");s.dataset.tip=tip(best.i,mm);
        s.setAttribute("aria-label",mm[0]+": tap for meaning");seen[best.i]=1;
        // a match also covers shorter entries for the same idea (PSA 10 covers PSA)
        for(var j=best.i+1;j<GL.length;j++){var m2=GL[j][0].exec(mm[0]);if(m2&&m2[0].length>0)seen[j]=1}
        var rest=tn.splitText(mm.index);var after=rest.splitText(mm[0].length);s.textContent=rest.nodeValue;rest.parentNode.replaceChild(s,rest);out.push(s);tn=after;go=true}});return out}
    var scope=document.querySelectorAll('.product-detail .product-title,.ProductItem-details-title,.product-detail .product-description,.ProductItem-details-excerpt,.product-detail h1,[data-mochi-desc]');
    var terms=[];[].forEach.call(scope,function(e){terms=terms.concat(mark(e))});
    document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest(".cgm-term");if(t){e.preventDefault();explain(t,false)}},true);
    document.addEventListener("keydown",function(e){var t=e.target.closest&&e.target.closest(".cgm-term");if(t&&(e.key==="Enter"||e.key===" ")){e.preventDefault();explain(t,false)}},true);
    var phone=matchMedia("(max-width:600px)");
    if(terms.length&&!phone.matches)setTimeout(function(){for(var i=0;i<terms.length;i++)if(explain(terms[i],true))break},4500); // one auto tip per page view
    window.__cgmGlossary={count:GL.length,terms:terms.map(function(t){return t.textContent})};
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
    // One launcher: the old Code Injection greeter's round Mochi button is hidden; ours is the only launcher.
    // Phones: the greeter's welcome card never auto-opens (not saved as dismissed, so desktop is unchanged).
    // Anywhere: if the greeter card would cover a primary button it steps aside.
    var mq=window.matchMedia("(max-width:600px)"),gst=document.createElement("style");
    gst.textContent='#cg-greeter .cg-mochi{display:none!important}';document.head.appendChild(gst);
    var PRIM=ADD+',.cart-checkout-button,.cart-checkout,[class*="checkout-button"],a[href*="/checkout"],button[type=submit][class*="checkout"]';
    function prims(){var out=[].slice.call(document.querySelectorAll(PRIM));
      [].forEach.call(document.querySelectorAll('button,a,[role=button]'),function(e){if(/^\s*(add to cart|checkout|check out|buy now|place order)\s*$/i.test(e.textContent||""))out.push(e)});
      [].forEach.call(document.querySelectorAll('body *'),function(e){if(e.closest("#cgm,#cgm-g,#cg-greeter"))return;var cs=getComputedStyle(e);
        if((cs.position==="fixed"||cs.position==="sticky")&&e.offsetHeight>30&&e.offsetHeight<200){var r=e.getBoundingClientRect();if(r.bottom>=innerHeight-2&&r.width>innerWidth*.6)out.push(e)}});
      return out.filter(function(e){return !e.closest("#cgm,#cgm-g,#cg-greeter")&&e.getClientRects().length}).map(function(e){return e.getBoundingClientRect()}).filter(function(r){return r.width&&r.bottom>0&&r.top<innerHeight})}
    function over(a,b,m){m=m||6;return !(a.right+m<b.left||a.left-m>b.right||a.bottom+m<b.top||a.top-m>b.bottom)}
    var cardAuto=true;
    function dodge(){var c=document.querySelector("#cg-greeter .cg-card");
      if(c&&cardAuto){cardAuto=false;if(mq.matches)c.classList.add("cg-hide")}
      if(root.classList.contains("open"))return;
      var P=prims(),bot=mq.matches?10:16;root.style.bottom=bot+"px";
      var L=btn.getBoundingClientRect(),h=L.height,base=innerHeight-bot,moved=true,n=0;
      while(moved&&n++<8){moved=false;for(var i=0;i<P.length;i++){var top=base-h;if(!(P[i].right+6<L.left||P[i].left-6>L.right||P[i].bottom+6<top||P[i].top-6>base)){base=P[i].top-8;moved=true}}}
      bot=Math.min(innerHeight-h-60,Math.max(bot,innerHeight-base));root.style.bottom=bot+"px";
      if(c&&!c.classList.contains("cg-hide")){var cr=c.getBoundingClientRect();if(P.some(function(r){return over(r,cr)}))c.classList.add("cg-hide")}
      var gg=document.getElementById("cgm-g");if(gg&&gg.classList.contains("on")){var gr=gg.getBoundingClientRect(),sy=gg.querySelector(".say.on");
        var hit=P.filter(function(r){return over(r,gr)||(sy&&over(r,sy.getBoundingClientRect()))})[0];
        if(hit){var m=/translate\(([-\d.]+)px/.exec(gg.style.transform);gg.style.transform="translate("+(m?m[1]:8)+"px,"+Math.max(60,hit.top-56)+"px)"}}}
    var dgT=0;function dodgeSoon(){clearTimeout(dgT);dgT=setTimeout(dodge,60)}dodge();setInterval(dodge,500);addEventListener("scroll",dodgeSoon,{passive:true});addEventListener("resize",dodgeSoon);
    var H=helper(root,open,function(){return panel.querySelector('iframe')},BASE);
    try{if(sessionStorage.getItem('cgm-keep')==='1')open(true)}catch(e){}
    window.CoopeyMochi={open:function(){open(true)},close:function(){open(false)},go:H.go,cart:H.cart};
  }
  // Fail-safe for the old Code Injection greeter, installed before init so it works even if init is late or throws:
  // capture-phase click fix for its stale /shop?category= links, and the old avatar hidden whenever it (re)appears.
  (function(){var MAP={"funko+pops":"/shop/funko-pops","funko%20pops":"/shop/funko-pops","pokemon+cards":"/shop/singles","pok%C3%A9mon+cards":"/shop/singles","graded+cards":"/shop/graded"};
    function real(h){var m=/\/shop\?category=([^&#]+)/i.exec(h||"");return m?(MAP[m[1].toLowerCase()]||"/shop"):null}
    document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;var r=real(a.getAttribute("href"));
      if(r&&!e.defaultPrevented&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&e.button===0){e.preventDefault();e.stopPropagation();location.href=r}},true);
    function tidy(){var g=document.getElementById("cg-greeter");if(!g)return;var m=g.querySelector(".cg-mochi");if(m&&m.style.display!=="none")m.style.setProperty("display","none","important");
      [].forEach.call(g.querySelectorAll('a[href*="/shop?category="]'),function(a){a.setAttribute("href",real(a.getAttribute("href")))})}
    tidy();try{new MutationObserver(tidy).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
    document.addEventListener("DOMContentLoaded",tidy)})();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
