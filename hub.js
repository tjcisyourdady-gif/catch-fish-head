(() => {
  'use strict';
  const status=document.getElementById('hubStatus'), share=document.getElementById('shareHub');
  let resetTimer, message='选好了吗？点击按钮就开始。';
  const show=text=>status.textContent=text;
  share.addEventListener('click',async()=>{
    const url=new URL('./',location.href).href;
    if(location.protocol==='file:'){show('线上分享：https://tjcisyourdady-gif.github.io/catch-fish-head/');return;}
    try{
      if(navigator.share)await navigator.share({title:'鱼头游乐场',text:'捕捉鱼头，或陪鱼头小姐走过最后七天。选一个，一起玩！',url});
      else if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);show('首页链接已复制，发给朋友吧');clearTimeout(resetTimer);resetTimer=setTimeout(()=>show(message),4000);}
      else show('复制浏览器中的首页网址，就能分享给朋友。');
    }catch(error){if(error.name!=='AbortError')show('可以复制浏览器地址分享给朋友。');}
  });
  if(location.protocol==='file:'||!('serviceWorker'in navigator)||!window.isSecureContext)return;
  const inspect=worker=>{
    if(!worker)return;const channel=new MessageChannel();
    const timer=setTimeout(()=>channel.port1.close(),15000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();if(event.data?.type==='OFFLINE_READY'){message='首页已准备好，下次也能离线打开。';show(message);}};
    worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
  };
  navigator.serviceWorker.addEventListener('controllerchange',()=>inspect(navigator.serviceWorker.controller));
  window.addEventListener('load',async()=>{try{await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});const registration=await navigator.serviceWorker.ready;inspect(navigator.serviceWorker.controller||registration.active);}catch(_){if(navigator.serviceWorker.controller)inspect(navigator.serviceWorker.controller);}}, {once:true});
})();
