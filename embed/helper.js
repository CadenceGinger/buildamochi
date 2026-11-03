// Coopey Mochi shop helper, brain side (runs inside the buildamochi.com iframe). TEST BUILD.
// Nothing here picks Mochi's actions; its Cadence brain still decides every move and keeps
// learning online (no retraining). The shop page only sends events, never visitor text:
//   look  -> a gold spot appears in Mochi's room where the shopper is looking (seen via its own vision)
//   cart  -> a cookie lands at Mochi's mouth and it is praised (a real treat + "Good!")
// Caretaker (helper mode): the embed Mochi tended not to walk to its bowl, so hunger/thirst ran
// high. Here a caretaker drops a cookie at Mochi's mouth when hunger passes 0.55, refills bowl
// and water, and if Mochi still has not eaten and hunger passes 0.8 it hand-feeds (hunger and
// thirst eased back to 0.5). Mochi still gets hungry, so it still has a reason to move.
(function(){
  var cfg={care:true,treatAt:0.55,handAt:0.8,easeTo:0.5};
  var st={ticks:0,starving:0,hungerSum:0,hungerMax:0,asleep:0,careTreats:0,handFeeds:0,cartTreats:0,looks:0};
  var lastTreat=-1e9,lastCart=-1e9;
  function W(){return window.mochi&&window.mochi.world}
  function tick(){var w=W();if(!w)return;var m=w.m,n=m.needs,now=performance.now()/1000;
    if(cfg.care){
      if(n.hunger>cfg.treatAt&&now-lastTreat>25){lastTreat=now;w.dropTreat(m.x,m.y+10,"cookie");try{w.fillBowl();w.fillWater()}catch(e){};st.careTreats++}
      if(n.hunger>cfg.handAt||n.thirst>cfg.handAt){n.hunger=Math.min(n.hunger,cfg.easeTo);n.thirst=Math.min(n.thirst,cfg.easeTo);st.handFeeds++}}
    st.ticks++;st.hungerSum+=n.hunger;st.hungerMax=Math.max(st.hungerMax,n.hunger);
    if(n.hunger>0.9||n.thirst>0.9)st.starving++;if(m.asleep)st.asleep++;
    if(w.furniture.pg_look&&now-w.furniture.pg_look.t>6)delete w.furniture.pg_look}
  setInterval(tick,150);
  window.addEventListener("message",function(e){if(e.source!==parent)return;var d=e.data&&e.data.mochiHelp;if(!d)return;var w=W();if(!w)return;
    var now=performance.now()/1000,m=w.m;
    if(d.op==="look"&&w.room==="home"&&isFinite(d.x)&&isFinite(d.y)){
      w.furniture.pg_look={x:Math.max(40,Math.min(920,d.x)),y:Math.max(40,Math.min(560,d.y)),r:18,hue:50,kind:"look",label:"look",t:now};st.looks++}
    if(d.op==="cart"&&now-lastCart>4){lastCart=now;w.dropTreat(m.x,m.y+10,"cookie");var g=document.getElementById("good");if(g)g.click();st.cartTreats++}});
  window.mochiHelper={cfg:cfg,stats:st};
})();
