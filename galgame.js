(() => {
  'use strict';
  const story = FishNovelStory, core = FishNovel, $ = id => document.getElementById(id), KEY = 'fish-head-galgame-v1';
  let lib, storageOkay = true;
  try { lib = core.library(JSON.parse(localStorage.getItem(KEY))); } catch (_) { lib = core.library(null); storageOkay = false; }
  let state = null, view = 'title', typing = false, auto = false, skipping = false, textTimer = 0, flowTimer = 0, toastTimer = 0, fullText = '', enteredAt = 0, seenOnEntry = false;
  let audioContext = null, musicLoop = 0, musicStep = 0;
  const seen = new Set(lib.seen), modal = $('modal');
  const copy = core.copy;
  function button(label, onClick, className = '') { const b = document.createElement('button'); b.textContent = label; b.className = className; b.addEventListener('click', onClick); return b; }
  function paragraph(text) { const p = document.createElement('p'); p.textContent = text; return p; }
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 3200); }
  function persist() {
    lib.seen = [...seen];
    try { localStorage.setItem(KEY, JSON.stringify(lib)); storageOkay = true; } catch (_) { storageOkay = false; }
    $('saveStatus').textContent = storageOkay ? '自动保存于此设备' : '此浏览器暂时无法保存，请保持页面打开';
    $('continueGame').disabled = !lib.auto;
  }
  function saveAuto() { if (state) { lib.auto = copy(state); lib.lastName = state.name; } persist(); }
  function stopTimers() { clearTimeout(textTimer); clearTimeout(flowTimer); }
  function controls() { $('autoButton').setAttribute('aria-pressed', String(auto)); $('skipButton').setAttribute('aria-pressed', String(skipping)); $('backButton').disabled = !state?.history.length; $('choiceBack').disabled = !state?.history.length; }
  function stopFlow() { auto = false; skipping = false; clearTimeout(flowTimer); controls(); }
  function showModal(title, build) {
    stopFlow(); $('modalHeading').textContent = title; $('modalContent').replaceChildren(); build($('modalContent'));
    if (!modal.open) modal.showModal();
  }
  function closeModal() { modal.close(); }
  $('closeModal').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) { const b = modal.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) closeModal(); } });
  function setScene(node) {
    const changed=$('novel').dataset.scene!==node.scene;
    $('novel').dataset.scene = node.scene;
    if(changed&&!skipping&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)$('backdrop').animate([{opacity:.35},{opacity:1}],{duration:650,easing:'ease-out'});
    $('sceneTime').textContent = story.days[(node.chapter || 1) - 1];
    $('cast').className = 'cast' + (node.actor === 'all' ? ' all' : node.actor === 'fish' ? ' fish' : '');
    for (const actor of ['qing','pao','lan']) {
      const element = document.querySelector('[data-person="' + actor + '"]');
      element.classList.toggle('visible', node.actor === actor || node.actor === 'all');
      element.classList.toggle('human', !!node.human?.[actor]);
    }
  }
  function showTitle() {
    stopTimers(); stopFlow(); view = 'title'; state = null;
    $('novel').dataset.view = 'title'; $('titleScreen').hidden = false; $('readingScreen').hidden = true; $('endingScreen').hidden = true;
    setScene({ scene: 'harbor', actor: 'qing', human: {}, chapter: 1 }); $('sceneTime').textContent = 'THE LAST SEVEN DAYS'; persist();
  }
  function markSeen() { if (state && !seen.has(core.readKey(state))) { seen.add(core.readKey(state)); persist(); } }
  function scheduleNext() {
    clearTimeout(flowTimer);
    if (!state || view !== 'reading' || modal.open || document.hidden) return;
    const node = story.nodes[state.node]; if (node.type !== 'line' || typing) return;
    if (skipping) {
      if (!seenOnEntry) { skipping = false; controls(); toast('已到未读内容，跳过已停止'); return; }
      flowTimer = setTimeout(next, 140);
    } else if (auto) {
      const total = core.autoDuration(fullText);
      flowTimer = setTimeout(next, Math.max(850, total - (performance.now() - enteredAt)));
    }
  }
  function reveal() {
    clearTimeout(textTimer); typing = false; $('dialogueText').textContent = fullText; $('advanceText').setAttribute('aria-label', '继续下一句'); markSeen(); scheduleNext();
  }
  function render() {
    stopTimers(); if (!state) return;
    const node = story.nodes[state.node]; if (!node) { showTitle(); toast('存档位置无效，已回到标题'); return; }
    setScene(node); $('titleScreen').hidden = true; $('chapterLabel').textContent = (node.chapter<=6?'第 ' + node.chapter + ' 幕':'尾声') + ' · ' + story.chapterNames[node.chapter - 1];
    $('memoryBadge').hidden = !state.flags.recording; $('choicePanel').hidden = node.type !== 'choice'; $('endingScreen').hidden = node.type !== 'ending'; $('readingScreen').hidden = node.type === 'ending';
    view = node.type === 'ending' ? 'ending' : 'reading'; $('novel').dataset.view = view; enteredAt = performance.now(); controls(); saveAuto();
    if (node.type === 'ending') { renderEnding(node); return; }
    if (node.type === 'choice') {
      stopFlow(); markSeen(); $('choiceTitle').textContent = node.text; $('choices').replaceChildren();
      $('choiceKind').textContent = node.kind==='everyday'?'日常对话 · 不影响路线与结局':node.kind==='rejoin'?'新的路口 · 可以重新选择方向':node.kind==='ending'?'潮声之后 · 回应你们一路的选择':'此刻，由你决定';
      node.options.forEach((option, i) => {
        const b = button('', () => { if (core.step(state, i)) { if (node.id === 'c2' && state.flags.recording) toast('已留下「给明天的留言」'); render(); } });
        const strong = document.createElement('strong'), detail = document.createElement('small'); strong.textContent = String.fromCharCode(65 + i) + '  ' + option.label;
        detail.textContent = core.canChoose(state, option) ? option.detail : option.lockedHint || '这一路还没有准备好这个选择';
        b.disabled = !core.canChoose(state, option); b.append(strong, detail); $('choices').append(b);
      });
      $('choiceTitle').setAttribute('tabindex','-1'); $('choiceTitle').focus({preventScroll:true}); return;
    }
    fullText = core.lineText(state,node); seenOnEntry = seen.has(core.readKey(state));
    $('speaker').textContent = node.speaker === '你' ? state.name : node.speaker === '旁白' ? '青头湾 · 夜班日记' : node.speaker;
    $('readMark').textContent = seenOnEntry ? '已读' : '未读'; $('accessibleLine').textContent = fullText; $('dialogueText').textContent = '';
    $('advanceText').setAttribute('aria-label', '显示完整对白'); typing = true;
    if (skipping && !seenOnEntry) { skipping = false; controls(); toast('已到未读内容，跳过已停止'); }
    if (!lib.prefs.speed || skipping) reveal();
    else {
      const started = performance.now(), speed = lib.prefs.speed;
      const paint = () => {
        const count = Math.floor((performance.now() - started) / 1000 * speed);
        if (count >= fullText.length) { reveal(); return; }
        $('dialogueText').textContent = fullText.slice(0, count); textTimer = setTimeout(paint, 24);
      }; paint();
    }
    if (/敲了两下|敲两下|两下轻响/.test(node.text)) glassKnock();
  }
  function next() {
    if (!state || modal.open || view !== 'reading' || story.nodes[state.node].type !== 'line') return;
    if (typing) { reveal(); return; }
    if (core.step(state)) render();
  }
  function previous() { if (!state || modal.open) return; stopFlow(); if (core.back(state)) render(); }
  function newGame() {
    showModal('在青头湾，怎么称呼你？', container => {
      container.append(paragraph('你是刚毕业、来做最后一周临时工的新人。三位同事都戴着绿色鱼头套。约 30 分钟走完一个结局；旧码头与旧记录两条路线可以重新汇合，关键决定会改变你们的明天。'));
      const form = document.createElement('form'), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input'); row.className = 'form-row';
      label.textContent = '你的名字'; label.htmlFor = 'playerName'; input.id = 'playerName'; input.maxLength = 12; input.placeholder = '留空也可以，就叫“你”'; input.autocomplete = 'off'; input.value = lib.lastName === '你' ? '' : lib.lastName;
      row.append(label,input); form.append(row);
      if (lib.auto) form.append(paragraph('开始新故事会更新自动存档，手动存档和结局收藏会保留。'));
      const submit = button('收拾行李，去青头湾 ↗', () => {}, 'primary'); submit.type = 'submit'; form.append(submit);
      form.addEventListener('submit', event => { event.preventDefault(); state = core.fresh(input.value); closeModal(); render(); startMusic(); }); container.append(form);
      setTimeout(() => input.focus(), 50);
    });
  }
  function continueGame() { if (!lib.auto) return; state = core.normalizeSession(lib.auto); if (modal.open) closeModal(); render(); startMusic(); }
  function showSave(mode) {
    showModal(mode === 'save' ? '把这一刻存下来' : '回到留下的那一页', container => {
      container.append(paragraph('存档只保存在当前浏览器和设备，不会上传。清除浏览器数据会删除它们。'));
      if (mode === 'load' && lib.auto) {
        const row = document.createElement('div'); row.className = 'save-slot'; const label = document.createElement('strong'); label.textContent = '自动存档 · ' + story.chapterNames[story.nodes[lib.auto.node].chapter - 1]; row.append(label,button('继续',continueGame)); container.append(row);
      }
      lib.slots.forEach((slot,i) => {
        const row = document.createElement('div'), info = document.createElement('div'), label = document.createElement('strong'), detail = document.createElement('small'); row.className = 'save-slot';
        label.textContent = '存档 ' + (i + 1) + (slot ? ' · ' + slot.state.name : ' · 空白');
        detail.textContent = slot ? story.chapterNames[story.nodes[slot.state.node].chapter - 1] + ' / ' + new Date(slot.savedAt).toLocaleString('zh-CN') : '还没有在这里留下故事'; info.append(label,detail);
        const action = button(mode === 'save' ? slot ? '覆盖存档' : '保存' : '读取', () => {
          if (mode === 'save' && state) { lib.slots[i] = {state:copy(state),savedAt:Date.now()}; persist(); showSave(mode); toast(storageOkay ? '已保存到存档 ' + (i+1) : '暂时无法写入浏览器存档'); }
          else if (slot) { state = core.normalizeSession(slot.state); closeModal(); render(); startMusic(); }
        }); action.disabled = mode === 'save' ? !state : !slot; row.append(info,action); container.append(row);
      });
    });
  }
  function showHistory() {
    showModal('刚才的话，我都记得', container => {
      const list = document.createElement('div'); list.className = 'history-list';
      const entries = [...(state?.history || []), ...(state ? [{ node: state.node, reply:copy(state.reply) }] : [])].slice(-160);
      if (!entries.length) list.append(paragraph('故事还没有开始。'));
      for (const entry of entries) {
        const n = story.nodes[entry.node]; if (n.type === 'ending') continue;
        const article = document.createElement('article'), name = document.createElement('strong'), text = document.createElement('p');
        name.textContent = n.type === 'choice' ? '你的选择' : n.speaker === '你' ? state.name : n.speaker;
        text.textContent = n.type === 'choice' ? entry.choice || n.text : core.lineText(entry,n); if (n.type === 'choice') article.className = 'choice-log'; article.append(name,text); list.append(article);
      }
      container.append(list); setTimeout(() => list.scrollTop = list.scrollHeight, 0);
    });
  }
  function jumpCheckpoint(id) { if (state && core.checkpoint(state,id)) { if (modal.open) closeModal(); render(); } }
  function renderEnding(node) {
    stopFlow(); typing = false;
    const id = node.ending === 'current' ? state.flags.ending || 'tomorrow' : node.ending, ending = story.endings[id];
    state.flags.ending = id; if (!lib.endings.includes(id)) lib.endings.push(id); markSeen(); saveAuto();
    $('endingNumber').textContent = '潮声之后 · 已收录'; $('endingTitle').textContent = ending.title; $('endingPoem').textContent = ending.text;
    $('bonusButton').hidden = !['tomorrow','together'].includes(id) || node.id === 'finishBonus'; $('lastChoiceButton').hidden = !state.checkpoints.c3; $('secondChoiceButton').hidden = !Object.keys(state.checkpoints).length;
  }
  function showGallery() {
    showModal('潮声之后 · 结局收藏', container => {
      container.append(paragraph('已经抵达的结局会保存在这里。其他的明天，留给你自己发现。'));
      const grid = document.createElement('div'); grid.className = 'gallery-grid';
      const collected=Object.values(story.endings).filter(ending=>lib.endings.includes(ending.id));
      if(!collected.length)container.append(paragraph('这里还没有留下回忆。先陪她走过这七天吧。'));
      collected.forEach(ending => {
        const card = document.createElement('article'), ornament = document.createElement('span'), title = document.createElement('h3'); card.className = 'gallery-card'; ornament.className = 'ending-idx'; ornament.textContent = '✦'; ornament.setAttribute('aria-hidden','true'); title.textContent = ending.title;
        card.append(ornament,title,paragraph(ending.text));
        card.append(button('重温这一段', () => { state = core.fresh(lib.lastName); state.node = ending.entry; state.flags.recording = ending.id === 'together'; state.flags.shared = ending.id === 'together'; state.flags.agency=ending.id!=='apart'; state.flags.ending = ending.id; closeModal(); render(); startMusic(); })); grid.append(card);
      }); container.append(grid);
      const active = state || lib.auto;
      if (active&&Object.keys(active.checkpoints).length) container.append(button('查看本轮选择足迹',showRoutes,'soft'));
    });
  }
  function showChapters() {
    showModal('这一周的足迹', container => {
      const active = state || lib.auto; container.append(paragraph('可以回到本轮已经走过的章节。录音等选择会恢复到当时的状态。'));
      const list = document.createElement('div'); list.className = 'progress-list';
      story.chapters.filter(c=>c.number<=6).forEach(chapter => {
        const index = active?.history.findIndex(h=>h.node===chapter.id) ?? -1, current = active?.node===chapter.id;
        const b = button('第 ' + chapter.number + ' 幕 · ' + chapter.title, () => {
          state = core.normalizeSession(active); if (!current) core.jumpHistory(state,index);
          closeModal(); render();
        }); b.disabled = index<0&&!current; list.append(b);
      }); container.append(list);
    });
  }
  function showRoutes() {
    showModal('走过的路口',container=>{
      const active=state||lib.auto;
      container.append(paragraph('只展示本轮已经做过的选择。回到某个路口，会恢复当时的记录和约定；此后的选择可以重新做。两段日常拌嘴只改变回应，不影响结局。'));
      const list=document.createElement('div');list.className='progress-list';
      const points=Object.values(active?.checkpoints||{}).sort((a,b)=>a.historyIndex-b.historyIndex);
      for(const point of points){const node=story.nodes[point.node],entry=active.history[point.historyIndex];list.append(button((node.kind==='everyday'?'日常 · ':'路口 · ')+entry.choice,()=>{state=core.normalizeSession(active);jumpCheckpoint(point.node);}));}
      if(!points.length)list.append(paragraph('还没有走到第一个选择，继续故事就会留下足迹。'));
      container.append(list);
    });
  }
  function showSettings() {
    showModal('阅读设置', container => {
      const row = document.createElement('div'), label = document.createElement('label'), select = document.createElement('select'); row.className = 'form-row'; label.textContent = '文字显示速度'; label.htmlFor = 'textSpeed'; select.id = 'textSpeed';
      for (const [value,text] of [[20,'慢速'],[30,'标准'],[50,'快速'],[0,'立即显示']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); } select.value = lib.prefs.speed;
      select.addEventListener('change',()=>{lib.prefs.speed=Number(select.value);persist();if(typing)reveal();}); row.append(label,select); container.append(row,paragraph('点一下对白会立即显示整句，再点一下继续。自动播放会按字数留出阅读时间，遇到选择会停下。跳过只对已经读过的内容生效。'),paragraph('键盘：空格 / → 继续，← 上一句，Esc 打开菜单。手机横竖屏均可阅读，选择没有倒计时。'));
      container.append(button(lib.prefs.music?'关闭背景音乐':'开启背景音乐',()=>{toggleMusic();showSettings();},'soft'));
    });
  }
  function menu() {
    showModal('暂时停靠', container => {
      const grid = document.createElement('div'); grid.className='menu-grid';
      for (const [text,fn,disabled] of [['继续阅读',closeModal,false],['保存进度',()=>showSave('save'),!state],['读取存档',()=>showSave('load'),false],['对白回顾',showHistory,!state],['章节回看',showChapters,!state&&!lib.auto],['选择足迹',showRoutes,!state&&!lib.auto],['结局收藏',showGallery,false],['阅读设置',showSettings,false],['返回标题',()=>{closeModal();showTitle();},false]]) { const b=button(text,fn);b.disabled=disabled;grid.append(b); } container.append(grid);
    });
  }
  function installInfo() {
    showModal('把鱼头小姐带回主屏幕',container=>{container.append(paragraph('iPhone / iPad：用 Safari 打开游戏，点击分享 → 添加到主屏幕。安卓可在浏览器菜单中选择安装应用或添加到主屏幕。'),paragraph('首次联网完整加载，并显示“已可离线阅读”后，可以离线继续。存档属于当前设备，清理浏览器数据会移除存档和缓存。'));});
  }
  function tone(freq, delay, duration, volume=.018) {
    if (!audioContext || audioContext.state!=='running') return; const t=audioContext.currentTime+delay, osc=audioContext.createOscillator(), gain=audioContext.createGain(); osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.08);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+duration+.05);
  }
  function chord() { const chords=[[220,261.63,329.63],[196,246.94,293.66],[174.61,220,261.63],[196,261.63,329.63]]; chords[musicStep++%4].forEach((f,i)=>tone(f,i*.35,4.6,.012)); }
  function startMusic() { if(!lib.prefs.music||document.hidden)return; try { if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().then(()=>{if(lib.prefs.music&&!musicLoop){chord();musicLoop=setInterval(chord,4600);}}).catch(()=>{}); }catch(_){toast('此浏览器暂时无法播放音乐');} }
  function stopMusic(){clearInterval(musicLoop);musicLoop=0;if(audioContext)audioContext.suspend().catch(()=>{});}
  function toggleMusic(){lib.prefs.music=!lib.prefs.music;persist();$('musicButton').setAttribute('aria-pressed',String(lib.prefs.music));$('musicButton').setAttribute('aria-label',lib.prefs.music?'关闭音乐':'开启音乐');if(lib.prefs.music)startMusic();else stopMusic();}
  function glassKnock(){if(lib.prefs.music){tone(880,0,.25,.025);tone(880,.22,.25,.025);}}
  $('newGame').addEventListener('click',newGame);$('continueGame').addEventListener('click',continueGame);
  $('titleGallery').addEventListener('click',showGallery);$('titleLoad').addEventListener('click',()=>showSave('load'));$('menuButton').addEventListener('click',menu);$('musicButton').addEventListener('click',toggleMusic);
  $('advanceText').addEventListener('click',next);$('backButton').addEventListener('click',previous);$('choiceBack').addEventListener('click',previous);$('historyButton').addEventListener('click',showHistory);
  $('saveButton').addEventListener('click',()=>showSave('save'));$('loadButton').addEventListener('click',()=>showSave('load'));
  $('autoButton').addEventListener('click',()=>{auto=!auto;skipping=false;controls();scheduleNext();});
  $('skipButton').addEventListener('click',()=>{auto=false;skipping=!skipping;controls();if(skipping&&seen.has(core.readKey(state))){seenOnEntry=true;reveal();}else scheduleNext();});
  $('bonusButton').addEventListener('click',()=>{state.history.push({node:state.node,flags:copy(state.flags)});state.node=story.bonus;render();});
  $('lastChoiceButton').addEventListener('click',()=>jumpCheckpoint('c3'));$('secondChoiceButton').addEventListener('click',showRoutes);
  $('endingHomeButton').addEventListener('click',showTitle);$('endingGalleryButton').addEventListener('click',showGallery);$('installInfo').addEventListener('click',installInfo);
  document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;if(modal.open)return;if(event.code==='Escape'){event.preventDefault();menu();}else if(view==='reading'&&(event.code==='Space'||event.code==='ArrowRight')){event.preventDefault();next();}else if(view==='reading'&&event.code==='ArrowLeft'){event.preventDefault();previous();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopFlow();stopMusic();}else if(lib.prefs.music)startMusic();});
  $('musicButton').setAttribute('aria-pressed',String(lib.prefs.music));$('musicButton').setAttribute('aria-label',lib.prefs.music?'关闭音乐':'开启音乐');
  async function offline() {
    if(location.protocol==='file:'){$('offlineStatus').textContent='本地离线版 · 进度保存在此浏览器';return;}
    if(!('serviceWorker'in navigator)||!window.isSecureContext)return;
    let activeChannel=null, timeout=0, requestNumber=0;
    const prepare=worker=>{
      if(!worker)return;
      const current=++requestNumber;clearTimeout(timeout);if(activeChannel)activeChannel.close();
      $('offlineStatus').textContent='正在准备离线阅读…';
      const channel=new MessageChannel();activeChannel=channel.port1;
      timeout=setTimeout(()=>{if(current===requestNumber)$('offlineStatus').textContent='离线素材尚未全部就绪，请联网重试';channel.port1.close();},90000);
      channel.port1.onmessage=event=>{if(current!==requestNumber)return;clearTimeout(timeout);$('offlineStatus').textContent=event.data?.type==='GAL_READY'?'✓ 已可离线阅读 · 自动存档':'离线素材尚未全部就绪，请联网重试';channel.port1.close();};
      worker.postMessage({type:'CACHE_GAL'},[channel.port2]);
    };
    navigator.serviceWorker.addEventListener('controllerchange',()=>prepare(navigator.serviceWorker.controller));
    try {
      await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      const registration=await navigator.serviceWorker.ready;
      prepare(navigator.serviceWorker.controller||registration.active);
    }catch(_){if(navigator.serviceWorker.controller)prepare(navigator.serviceWorker.controller);else $('offlineStatus').textContent='当前未能准备离线阅读';}
  }
  showTitle();if(!storageOkay)toast('此浏览器暂时无法保存，请保持页面打开');window.addEventListener('load',offline,{once:true});
})();
