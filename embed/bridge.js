// Coopey play bar: thin buttons over the page's own controls. Nothing here chooses an action
// for Mochi or touches its brain; it only drops food, rings a word or praises, like the full page.
(function(){
  var $=function(id){return document.getElementById(id)};
  var buttons=document.querySelectorAll("#cgbar button");
  function ready(){var m=window.mochi;return m&&m.world&&document.getElementById("boot").classList.contains("done")}
  function sync(){var ok=ready();buttons.forEach(function(b){b.disabled=!ok});if(!ok)setTimeout(sync,500)}
  sync();
  $("cgFeed").onclick=function(){var w=window.mochi.world,m=w.m;w.dropTreat(m.x+40*(Math.random()<.5?-1:1),m.y+30,"cookie")};
  document.querySelectorAll(".cgw").forEach(function(b){b.onclick=function(){
    var say=document.querySelector("#word"+b.dataset.word+" button");if(!say)return;say.click();
    b.classList.add("ring");setTimeout(function(){b.classList.remove("ring")},1500)}});
  $("cgGood").onclick=function(){$("good").click()};
  // Tell the host page when Mochi is awake (no data about the visitor is sent).
  (function tell(){if(ready()){try{parent.postMessage({mochiEmbed:"ready"},"*")}catch(e){}}else setTimeout(tell,700)})();
})();
