/*! Coopey Mochi widget loader v1 · unofficial community fork of Mochi (MIT, Bernhard Mueller)
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
  '@media (max-width:600px){#cgm{left:10px;bottom:10px}#cgm .cgm-b span{display:none}#cgm .cgm-b{padding:5px}'+
  '#cgm .cgm-p{position:fixed;left:8px;right:8px;bottom:64px;width:auto;height:min(55vh,360px)}}';
  var face='<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M14 58c-4-22 8-40 26-40s30 18 26 40c-2 10-50 10-52 0z" fill="#fff8ef" stroke="#c9a227" stroke-width="3"/><circle cx="31" cy="40" r="3.6" fill="#111"/><circle cx="49" cy="40" r="3.6" fill="#111"/><ellipse cx="25" cy="47" rx="4" ry="2.4" fill="#f4b6b6"/><ellipse cx="55" cy="47" rx="4" ry="2.4" fill="#f4b6b6"/><path d="M36 47q4 4 8 0" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  function init(){
    var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    var root=document.createElement("div");root.id="cgm";
    root.innerHTML='<div class="cgm-p" role="dialog" aria-label="Play with Mochi"><div class="cgm-h"><span>Play with Mochi</span>'+
      '<a href="https://github.com/CadenceGinger/buildamochi" target="_blank" rel="noopener">Powered by Cadence (GPL-3.0) · source</a>'+
      '<button class="cgm-x" type="button" aria-label="Close Mochi">&times;</button></div></div>'+
      '<button class="cgm-b" type="button" aria-expanded="false" aria-label="Play with Mochi">'+face+'<span>Mochi</span></button>';
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
    window.CoopeyMochi={open:function(){open(true)},close:function(){open(false)}};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
