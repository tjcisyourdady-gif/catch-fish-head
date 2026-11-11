(() => {
  'use strict';
  const { Engine, LEVELS, TYPES, UPGRADES, W, H, PIVOT, rng, clamp } = FishGame;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
  const fish = new Image(); fish.src = 'fish-head.png';
  const SAVE_KEY = 'catch-fish-head-v1';
  let save = null, saveAvailable = true;
  try { save = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (_) { saveAvailable = false; }
  let view = 'home', modalBack = null, toastUntil = 0, fx = [], frameTime = 0, previousFrame = 0, audio = null;
  let engine = new Engine(save, handleEvent);
  const random = rng(889); const bubbles = Array.from({ length: 27 }, () => ({ x: random() * W, y: random() * H, r: 1.5 + random() * 3, v: 6 + random() * 12 }));
  const weeds = Array.from({ length: 36 }, (_, i) => ({ x: i * 36 + random() * 15, height: 25 + random() * 69, width: 4 + random() * 5, phase: random() * 6 }));
  const palette = [
    { sky: '#e0edd1', hills: '#bacdaf', top: '#468f86', mid: '#216b69', bottom: '#174c50', sand: '#496f5d', coral: '#92b376' },
    { sky: '#e4e4c7', hills: '#b7c3a4', top: '#4e8c86', mid: '#2e666b', bottom: '#213e4a', sand: '#606c58', coral: '#9ca36b' },
    { sky: '#ecdfc4', hills: '#c8bfa5', top: '#64a69a', mid: '#3e7f83', bottom: '#285c70', sand: '#657d73', coral: '#d99289' },
    { sky: '#bdcccd', hills: '#8faeb0', top: '#477b89', mid: '#244b69', bottom: '#193653', sand: '#405874', coral: '#9f94b8' },
    { sky: '#e9dbb1', hills: '#bfb488', top: '#547f75', mid: '#285b60', bottom: '#163e4d', sand: '#6e7860', coral: '#cdbb70' }
  ];
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(engine.save)); saveAvailable = true; }
    catch (_) { saveAvailable = false; }
    $('saveStatus').classList.toggle('save-warning', !saveAvailable);
    $('saveStatus').innerHTML = saveAvailable ? '进度自动保存在本机 <span>●</span>' : '本次无法保存进度，请保持窗口打开';
  }
  function unlockAudio() {
    if (!engine.save.sound) return;
    try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); } catch (_) {}
  }
  function tone(frequency, duration = .1, type = 'sine', delay = 0, volume = .04) {
    if (!engine.save.sound || !audio) return;
    const t = audio.currentTime + delay, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, t); gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(volume, t + .008); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(t); osc.stop(t + duration + .01);
  }
  function sound(type) {
    if (type === 'fire') { tone(320, .1, 'triangle'); tone(220, .12, 'triangle', .06); }
    if (type === 'hooked') { tone(540, .08); tone(800, .1, 'sine', .05); }
    if (type === 'collect') [660, 830, 990].forEach((f, i) => tone(f, .15, 'sine', i * .07));
    if (type === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, 'triangle', i * .12));
    if (type === 'lose') [300, 240, 180].forEach((f, i) => tone(f, .2, 'triangle', i * .14));
    if (type === 'release') tone(130, .19, 'triangle');
    if (type === 'freeze') [900, 1200, 1400].forEach((f, i) => tone(f, .2, 'sine', i * .08));
    if (type === 'purchase') { tone(800, .12); tone(1200, .2, 'sine', .1); }
  }
  function toast(text, seconds = 2.3) { $('toast').textContent = text; $('toast').classList.add('visible'); toastUntil = performance.now() + seconds * 1000; }
  function particles(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) fx.push({ type: 'particle', x, y, vx: (Math.random() - .5) * 160, vy: -25 - Math.random() * 100, life: .7 + Math.random() * .4, total: 1.1, color, r: 2 + Math.random() * 4 });
  }
  function handleEvent(e) {
    if (['fire', 'hooked', 'release', 'freeze', 'purchase'].includes(e.type)) sound(e.type);
    if (e.type === 'hooked') { particles(e.x, e.y, e.item.type === 'rock' ? '#adbcaf' : '#d8ef93', 10); if (e.item.type === 'rock') toast('是石头！点击松钩器，可以省点时间。'); }
    if (e.type === 'miss') fx.push({ type: 'text', text: '差一点…', x: e.x, y: Math.min(H - 55, e.y), life: 1.1, total: 1.1, color: '#c0d5c6', vy: -20 });
    if (e.type === 'release') { particles(e.x, e.y, '#bcddd1', 14); toast('已松钩，抓钩快速回收'); }
    if (e.type === 'freeze') toast('冻结 6 秒：鱼群、机关、海流和倒计时全部停下 ❄');
    if (e.type === 'obstacle') { sound('release'); particles(e.x, e.y, '#efa99a', 20); toast(e.reason + (e.penalty ? ' · −' + e.penalty + ' 秒' : '')); }
    if (e.type === 'wrongOrder') { sound('release'); toast('抓错啦！已放生 · −2 秒。下一只要：' + e.wanted); }
    if (e.type === 'bossPhase') { sound('win'); particles(e.x, e.y, '#ffe18a', 45); toast('王冠碎了！等大王停下、绿环亮起，再抓一钩。', 4); }
    if (e.type === 'collect') {
      sound(e.item.type === 'rock' ? 'release' : 'collect'); particles(PIVOT.x, 173, '#dcf58c', 24);
      fx.push({ type: 'text', text: '+' + e.points + (e.combo > 1 ? '  连击 ×' + e.combo : ''), x: PIVOT.x, y: 207, life: 1.6, total: 1.6, color: '#efffc0', vy: -25 });
      if (e.item.type === 'king') toast('鱼头大王已就位！把诉求一起带回去。');
      else if (e.item.type === 'key') toast(engine.counts.key >= 2 ? '两把钥匙到手！海底宝箱已打开。' : '钥匙 +1，再找一把！');
      else if (e.item.type === 'chest') toast('创业资金到手！宝箱已带回。');
      else if (e.item.type === 'oxygen') toast('氧气补充！剩余时间 +6 秒');
      else if (e.item.type === 'rare' && engine.config.boss && engine.counts.rare === 2) toast('大王的护盾消失了！下一步：打碎王冠。', 4);
      else if (e.item.type === 'rare' && engine.config.night) toast('发光鱼头照亮夜海 · 持续 5 秒');
      else if (engine.score >= engine.config.target && !engine.goalComplete()) toast('分数够了，继续完成委托：' + engine.missionText());
    }
    if (e.type === 'finish') { persist(); sound(e.won ? 'win' : 'lose'); if (e.won) particles(600, 210, '#dbef96', 65); showResult(); }
    if (e.type === 'purchase') { persist(); updateHUD(); }
  }
  function updateHUD() {
    if (document.body.dataset.view !== view) document.body.dataset.view = view;
    const l = engine.config;
    $('levelEyebrow').textContent = 'NIGHT SHIFT / ' + String(engine.level + 1).padStart(2, '0');
    $('levelName').innerHTML = l.name + ' <span>' + l.en + '</span>';
    $('score').innerHTML = engine.score.toLocaleString() + ' <small>/ ' + l.target.toLocaleString() + '</small>';
    $('progress').style.width = Math.min(100, engine.score / l.target * 100) + '%';
    $('timer').innerHTML = Math.ceil(engine.time) + '<span>s</span>';
    $('timer').parentElement.parentElement.classList.toggle('urgent', engine.time <= 12 && engine.status === 'playing');
    $('timer').style.color = engine.frozen > 0 ? '#66a7ba' : '';
    $('wallet').textContent = engine.save.wallet.toLocaleString();
    $('releaseCount').textContent = engine.cutters; $('freezeCount').textContent = engine.freezes;
    const playing = engine.status === 'playing' && view === 'play';
    $('pauseButton').disabled = !playing; $('dropButton').disabled = !playing || engine.hook.phase !== 'swing';
    $('releaseButton').disabled = !playing || !engine.hook.caught || engine.cutters === 0;
    $('freezeButton').disabled = !playing || engine.freezes === 0;
    $('shopButton').disabled = engine.status === 'playing' || engine.status === 'paused';
    $('sceneLabel').textContent = '青头湾 / 水深 ' + l.depth + ' m';
    $('sceneCaption').textContent = view === 'play' ? engine.environmentText() : l.caption;
    $('missionLabel').textContent = l.mode;
    const mission = engine.missionText();
    if ($('missionProgress').textContent !== mission) $('missionProgress').textContent = mission;
    $('missionStrip').classList.toggle('complete', engine.goalComplete());
    $('soundButton').textContent = engine.save.sound ? '♫' : '♪';
    $('soundButton').style.opacity = engine.save.sound ? '1' : '.45';
    $('soundButton').setAttribute('aria-label', engine.save.sound ? '关闭音效' : '开启音效');
    $('soundButton').title = engine.save.sound ? '关闭音效' : '开启音效';
  }
  function openModal(name, html, wide = false) {
    $('toast').classList.remove('visible'); toastUntil = 0;
    view = name; $('modal').classList.toggle('wide', wide); $('modal').innerHTML = html;
    $('modalLayer').hidden = false; $('modal').scrollTop = 0; $('modal').focus({ preventScroll: true }); updateHUD();
  }
  function closeModal() { $('modalLayer').hidden = true; $('modal').innerHTML = ''; }
  function bind(id, action) { $(id).addEventListener('click', () => { unlockAudio(); action(); }); }
  function home() {
    $('toast').classList.remove('visible'); toastUntil = 0;
    engine.status = 'ready'; engine.start(Math.min(engine.save.unlocked - 1, 7)); view = 'home'; closeModal();
    $('homeScreen').hidden = false; fx = [];
    $('startButton').innerHTML = engine.save.completed ? '再捞一次 <span>↗</span>' : engine.save.unlocked > 1 ? '继续第 ' + engine.save.unlocked + ' 关 <span>↗</span>' : '开始打捞 <span>↗</span>';
    updateHUD();
  }
  function briefing(index) {
    if (index >= engine.save.unlocked) return;
    engine.start(index); fx = []; $('homeScreen').hidden = true;
    const l = engine.config;
    openModal('story', `<img class="modal-fish" src="fish-head.png" alt="绿色鱼头"><span class="eyebrow">第 ${String(index + 1).padStart(2, '0')} 站 / ${l.mode}</span><h2 id="modalTitle">${l.name}</h2><p>${l.story}</p><div class="dialogue"><div class="speaker">${l.speaker}</div><p>“${l.line}”</p></div><div class="briefing-stats"><div>本关目标<strong>${l.target} 分</strong></div><div>打捞时间<strong>${Math.ceil(engine.time)} 秒</strong></div><div>${l.boss ? '特别任务' : '免费补给'}<strong class="supply">${l.boss ? '抓回大王' : '2 ✂ + 1 ❄'}</strong></div></div><div class="mission-brief"><b>这一关怎么玩</b><p>${l.rule}</p><strong>${engine.missionText()}</strong></div><p class="subtle">${l.tip}</p><div class="modal-actions"><button id="beginLevel" class="primary-button">准备好了，放我下海 ↗</button><button id="storyBack" class="secondary-button">返回地图</button></div>`);
    bind('beginLevel', () => { closeModal(); view = 'play'; engine.begin(); updateHUD(); canvas.focus({ preventScroll: true }); });
    bind('storyBack', () => showMap());
  }
  function pause() {
    if (view !== 'play' || !engine.pause()) return;
    openModal('pause', `<span class="eyebrow">TAKE A BREATH</span><h2 id="modalTitle">鱼头先歇一会儿。</h2><p>抓钩和倒计时都已暂停，喝口水再回来。</p><div class="modal-actions"><button id="resumeGame" class="primary-button">继续打捞 ↗</button><button id="retryPause" class="secondary-button">重新挑战</button><button id="leavePause" class="secondary-button">返回主页</button></div>`);
    bind('resumeGame', resume); bind('retryPause', () => briefing(engine.level)); bind('leavePause', home);
  }
  function resume() { closeModal(); view = 'play'; engine.resume(); updateHUD(); canvas.focus({ preventScroll: true }); }
  function showResult() {
    const r = engine.result, final = engine.level === 7;
    if (!r) return;
    const heading = r.won ? final ? '大王，请随我回馆。' : '这波，满载而归。' : '鱼头还想再玩一会儿。';
    const message = !r.won && !r.goalComplete ? '还差委托：' + r.mission + '。' + engine.config.tip : r.won ? final ? '一场“鱼头出逃事件”，终于变成了双方都满意的谈判。' : ['馆长：干得漂亮！夜宵给你加个蛋。', '鱼头：下次团建，我们一定先请假。', '打捞记录 +1。再深一点，还有更多奇遇。'][engine.level % 3] : engine.config.boss && r.score >= engine.config.target && !r.kingCaught ? '分数已经够了，但鱼头大王还没有上钩。下一次记得留时间抓大王。' : '没关系，这一关可以重新挑战。优先抓发光鱼头，碰到石头就松钩。';
    openModal('result', `<span class="eyebrow">${r.won ? 'SHIFT COMPLETE / 打捞成功' : 'TRY AGAIN / 再来一钩'}</span><h2 id="modalTitle">${heading}</h2>${r.won ? `<div class="stars" aria-label="${r.stars} 星">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>` : ''}<p>${message}</p><div class="briefing-stats"><div>本关得分<strong>${r.score}</strong></div><div>捕捉鱼头<strong>${r.catches} 只</strong></div><div>剩余时间<strong>${Math.ceil(r.time)} 秒</strong></div></div>${r.won ? `<div class="reward-line">◈ 获得 ${r.reward} 鱼币 · 去小铺升级，让下一钩更轻松</div>` : ''}<p class="subtle">命中率 ${Math.round(r.accuracy * 100)}% · 最高连击 ${r.peakCombo} · 失误 ${r.mistakes} 次<br>三星：余时 ≥18秒、命中率 ≥75%、失误 ≤1次</p><div class="modal-actions"><button id="nextResult" class="primary-button">${r.won ? final ? '看看结局 ↗' : '前往下一站 ↗' : '再试一次 ↗'}</button>${r.won ? '<button id="resultShop" class="secondary-button">装备小铺</button>' : ''}<button id="resultMap" class="secondary-button">关卡地图</button></div>`);
    bind('nextResult', () => r.won ? final ? ending() : briefing(engine.level + 1) : briefing(engine.level));
    if (r.won) bind('resultShop', () => shop(showResult));
    bind('resultMap', () => showMap());
  }
  function showMap() {
    if (engine.status === 'playing') return;
    openModal('map', `<span class="eyebrow">THE NIGHT SHIFT ROUTE</span><h2 id="modalTitle">八种玩法，八站奇遇。</h2><p>分拣、追逐、寻宝、闸门、避电、救援、点单，最后挑战三阶段大王。</p><div class="map-grid">${LEVELS.map((l, i) => `<button class="map-card ${i === engine.save.unlocked - 1 ? 'current' : ''}" data-level="${i}" ${i >= engine.save.unlocked ? 'disabled' : ''}><span class="number">${String(i + 1).padStart(2, '0')}</span><strong>${l.name}</strong><span class="map-mode">${l.mode}</span><small>${i >= engine.save.unlocked ? '尚未解锁' : engine.save.stars[i] ? '★'.repeat(engine.save.stars[i]) + '☆'.repeat(3 - engine.save.stars[i]) : '等待打捞 ↗'}</small></button>`).join('')}</div><div class="modal-actions"><button id="mapHome" class="secondary-button">返回主页</button><button id="mapShop" class="secondary-button">装备小铺 · ${engine.save.wallet} 鱼币</button>${engine.save.completed ? '<button id="mapEnding" class="secondary-button">回看结局</button>' : ''}</div>`, true);
    document.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => { unlockAudio(); briefing(Number(btn.dataset.level)); }));
    bind('mapHome', home); bind('mapShop', () => shop(showMap)); if (engine.save.completed) bind('mapEnding', ending);
  }
  function shop(back = home) {
    if (engine.status === 'playing' || engine.status === 'paused') return;
    modalBack = back;
    openModal('shop', `<span class="eyebrow">THE LITTLE TACKLE SHOP</span><h2 id="modalTitle">好装备，更上头。</h2><p>当前余额 <strong>${engine.save.wallet} 鱼币</strong>。升级永久生效，从下一次开局开始应用。</p><div class="shop-list">${Object.entries(UPGRADES).map(([key, item]) => { const level = engine.save.upgrades[key], full = level >= item.max, price = item.prices[level]; return `<div class="shop-item"><div class="shop-icon">${item.icon}</div><div class="shop-info"><strong>${item.name} <span class="subtle">Lv.${level} / ${item.max}</span></strong><small>${item.desc}</small></div><button class="buy-button" data-buy="${key}" ${full || engine.save.wallet < price ? 'disabled' : ''}>${full ? '已满级' : price + ' 鱼币'}</button></div>`; }).join('')}</div><p class="subtle">每关自动补充 2 次松钩、1 次冻结。重复通关也可获得鱼币。</p><div class="modal-actions"><button id="shopBack" class="primary-button">收好装备，继续 ↗</button></div>`);
    document.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => { unlockAudio(); if (engine.buy(btn.dataset.buy)) { shop(back); toast('升级成功！下次开局就能用上。'); } }));
    bind('shopBack', back);
  }
  function ending() {
    openModal('ending', `<img class="modal-fish" src="fish-head.png" alt="鱼头大王"><span class="eyebrow">THE END / 也许是新开始</span><h2 id="modalTitle">每个鱼头，都值得正着戴。</h2><p>你把大王和它们的诉求一起带回水族馆。原来鱼头们逃跑，只是因为每天都有人把它们戴反。</p><div class="dialogue"><div class="speaker">青头湾 · 友好协商结果</div><p>白天一起营业，晚上自由放假。<br>不揪鱼鳍，不乱戳眼，更不能戴反。</p></div><p>第二天，水族馆准时开业。门口多了一块全新的招牌：</p><div class="ending-note">“请尊重每一个鱼头的朝向。”</div><p class="subtle">馆长兑现了夜宵。大王吃了两个蛋。你的夜班，终于结束了。</p><div class="modal-actions"><button id="endingMap" class="primary-button">重游青头湾 ↗</button><button id="endingHome" class="secondary-button">返回主页</button></div>`);
    bind('endingMap', () => showMap()); bind('endingHome', home);
  }
  function help() {
    const previous = view;
    if (previous === 'help') return;
    if (engine.status === 'playing') engine.pause();
    const returns = { home, story: () => briefing(engine.level), pause: () => { view = 'play'; engine.resume(); pause(); }, result: showResult, map: showMap, ending, shop: () => shop(modalBack || home), play: resume };
    const back = returns[previous] || home;
    openModal('help', `<span class="eyebrow">HOW TO CATCH A HEAD</span><h2 id="modalTitle">玩法很简单，时机很重要。</h2><div class="help-grid"><div><b>① 看准，放钩</b><span>抓钩自动左右摆动。按空格、↓ 或点击游戏水面，沿当前方向发射。</span></div><div><b>② 抓到，收回</b><span>碰到目标后自动回收，拉上岸才计分。小鱼头快，大鱼头重。</span></div><div><b>③ 善用小道具</b><span>B 松钩，甩掉误抓的目标；F 冻结时间、鱼群、海流和机关 6 秒。每关免费补充。</span></div><div><b>④ 达标，下一站</b><span>分数和上方委托都要完成。每关有独立规则；大王要先破盾、破冠再捕捉。P 或 Esc 暂停。</span></div></div><p>连着 9 秒内捞回鱼头可触发连击，最多加成 30%。三星还需要准确出钩、少撞机关。重试时普通鱼群会重新分布。切换窗口会自动暂停。</p><div class="modal-actions"><button id="helpBack" class="primary-button">明白了，开捞 ↗</button></div>`);
    bind('helpBack', back);
  }
  function fire() { unlockAudio(); if (view === 'play') engine.fire(); }
  bind('homeButton', () => { if (engine.status === 'playing') pause(); else if (view !== 'home') home(); });
  bind('startButton', () => briefing(engine.save.completed ? 0 : engine.save.unlocked - 1));
  bind('levelButton', () => showMap()); bind('helpButton', help); bind('pauseButton', pause);
  // Fire on contact, so a phone's synthesized click delay cannot change the aim.
  let lastPointerShot = -1000;
  $('dropButton').addEventListener('pointerdown', event => {
    if (event.button !== 0 || $('dropButton').disabled) return;
    lastPointerShot = performance.now(); event.preventDefault(); fire();
  });
  $('dropButton').addEventListener('click', event => { if (event.detail === 0 || performance.now() - lastPointerShot > 700) fire(); });
  bind('releaseButton', () => engine.release()); bind('freezeButton', () => engine.freeze());
  bind('shopButton', () => shop(home));
  bind('soundButton', () => { engine.save.sound = !engine.save.sound; if (engine.save.sound) { unlockAudio(); tone(700); } persist(); updateHUD(); });
  canvas.addEventListener('pointerdown', e => { if (e.button !== 0) return; if (view === 'play') { canvas.focus({ preventScroll: true }); fire(); } });
  document.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.code === 'Tab' && !$('modalLayer').hidden) {
      const focusable = [...$('modal').querySelectorAll('button:not(:disabled), [tabindex="0"]')];
      if (focusable.length && e.shiftKey && (document.activeElement === focusable[0] || document.activeElement === $('modal'))) { e.preventDefault(); focusable.at(-1).focus(); }
      else if (focusable.length && !e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0].focus(); }
      return;
    }
    if (e.code === 'Space' || e.code === 'ArrowDown') { if (view === 'play') { e.preventDefault(); fire(); } return; }
    if (e.code === 'KeyB' && view === 'play') { e.preventDefault(); engine.release(); }
    if (e.code === 'KeyF' && view === 'play') { e.preventDefault(); engine.freeze(); }
    if (e.code === 'KeyP' || e.code === 'Escape') { if (view === 'play') pause(); else if (view === 'pause') resume(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && view === 'play') pause(); });
  window.addEventListener('blur', () => { if (view === 'play') pause(); });
  document.addEventListener('fish:pause', pause);

  // All scenery is drawn locally. No network or external font is required.
  function path(points, fill, stroke, width = 1) {
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function roundRect(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }
  function ellipse(x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function text(value, x, y, size = 12, color = '#deead4', align = 'center', weight = 400) { ctx.font = `${weight} ${size}px "Microsoft YaHei",sans-serif`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(value, x, y); }
  function background(t) {
    const p = palette[engine.config.theme];
    ctx.fillStyle = p.sky; ctx.fillRect(0, 0, W, H);
    ellipse(980, 64, 32, 32, '#f4f1cd');
    path([[0, 131], [0, 99], [58, 66], [110, 105], [158, 75], [235, 134], [294, 115], [362, 153]], p.hills);
    path([[800, 150], [870, 121], [928, 141], [1020, 88], [1100, 126], [1150, 91], [1200, 116], [1200, 170]], p.hills);
    // Tiny shoreline houses and lighthouse.
    roundRect(82, 109, 44, 36, 2, '#98b19a'); path([[76, 111], [102, 90], [132, 111]], '#759682');
    roundRect(139, 118, 31, 25, 1, '#a9bba0'); roundRect(95, 122, 10, 18, 1, '#dbe3bd');
    path([[1060, 140], [1070, 58], [1087, 58], [1096, 140]], '#f3edce');
    path([[1067, 89], [1090, 89], [1092, 103], [1065, 103]], '#bd8b71');
    roundRect(1065, 52, 27, 15, 2, '#789383'); path([[1061, 52], [1079, 39], [1097, 52]], '#5c7d6c');
    // Clouds and distant bird marks.
    ctx.strokeStyle = '#8eac9555'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const x = 300 + i * 23; ctx.beginPath(); ctx.moveTo(x, 67 + i * 5); ctx.quadraticCurveTo(x + 5, 61 + i * 5, x + 10, 67 + i * 5); ctx.quadraticCurveTo(x + 15, 61 + i * 5, x + 20, 67 + i * 5); ctx.stroke(); }
    const sea = ctx.createLinearGradient(0, 155, 0, H); sea.addColorStop(0, p.top); sea.addColorStop(.52, p.mid); sea.addColorStop(1, p.bottom);
    ctx.fillStyle = sea; ctx.fillRect(0, 155, W, H - 155);
    // Soft shafts of light.
    ctx.save(); ctx.globalAlpha = .055;
    path([[140, 155], [204, 155], [430, 650], [260, 650]], '#e9f5b4');
    path([[700, 155], [735, 155], [550, 650], [430, 650]], '#e9f5b4');
    path([[1030, 155], [1065, 155], [1190, 650], [1080, 650]], '#e9f5b4'); ctx.restore();
    ctx.strokeStyle = '#bce4c97a'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= W; x += 6) { const y = 156 + Math.sin(x * .024 + t * 1.4) * 2.3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.strokeStyle = '#bce4c931'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) { const x = (i * 79 + t * 7) % W; ctx.beginPath(); ctx.moveTo(x, 169 + i % 3 * 9); ctx.lineTo(x + 17 + i % 4 * 8, 169 + i % 3 * 9); ctx.stroke(); }
    for (let i = 1; i <= 4; i++) { const y = 230 + i * 78; ctx.strokeStyle = '#c4dfce22'; ctx.beginPath(); ctx.moveTo(1160, y); ctx.lineTo(1175, y); ctx.stroke(); text(String(Math.floor(engine.config.depth * i / 4)).padStart(2, '0'), 1181, y + 3, 8, '#c4dfce55', 'left'); }
    if (engine.level === 2) {
      ctx.save(); ctx.globalAlpha = .28;
      path([[120, 527], [380, 557], [351, 604], [156, 604]], '#b0b59b', '#152e31', 4);
      ctx.strokeStyle = '#b0b59b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(236, 550); ctx.lineTo(254, 393); ctx.stroke();
      path([[260, 402], [260, 506], [349, 514]], '#b0b59b'); ctx.restore();
    }
    if (engine.config.theme === 3) {
      for (let i = 0; i < 5; i++) {
        const x = 100 + i * 250, y = 250 + Math.sin(t * .4 + i) * 15 + i % 3 * 85;
        ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = '#b1cbf0'; ctx.beginPath(); ctx.arc(x, y, 15, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#c5d4f3'; ctx.lineWidth = 1.2;
        for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + j * 8, y); ctx.bezierCurveTo(x + j * 8 - 7, y + 10, x + j * 8 + 8, y + 16, x + j * 8, y + 26); ctx.stroke(); } ctx.restore();
      }
    }
    // Seabed, rocks and swaying kelp frame the targets.
    ctx.beginPath(); ctx.moveTo(0, 620);
    for (let x = 0; x <= W; x += 25) ctx.lineTo(x, 620 + Math.sin(x * .013) * 7);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = p.sand; ctx.fill();
    for (const w of weeds) {
      const edge = w.x < 120 || w.x > 1080;
      const height = edge ? w.height * 1.4 : w.height * .47;
      ctx.strokeStyle = edge ? '#7aa98466' : '#96b68b44'; ctx.lineWidth = w.width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(w.x, 634); ctx.bezierCurveTo(w.x + 16, 634 - height * .3, w.x - 16, 634 - height * .7, w.x + Math.sin(t * .7 + w.phase) * 12, 634 - height); ctx.stroke();
    }
    for (let i = 0; i < 18; i++) ellipse(i * 73 + 18, 634 + Math.sin(i) * 8, 3 + i % 3 * 3, 2 + i % 2, '#abc1a735');
    // Coral branches.
    for (const [x, y, scale] of [[29, 616, 1], [1151, 620, 1.2], [988, 639, .45]]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.strokeStyle = p.coral + '99'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(j * 14, -29); ctx.lineTo(j * 24 + 4, -57); ctx.moveTo(j * 14, -29); ctx.lineTo(j * 30 - 6, -36); ctx.lineTo(j * 30 - 8, -48); ctx.stroke(); } ctx.restore();
    }
    ctx.strokeStyle = '#d1edce3d'; ctx.lineWidth = 1;
    for (const b of bubbles) { const y = 190 + ((b.y - t * b.v) % 438 + 438) % 438; ctx.beginPath(); ctx.arc(b.x + Math.sin(t * .4 + b.y) * 9, y, b.r, 0, Math.PI * 2); ctx.stroke(); }
    if (engine.level >= 6) {
      ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = '#b3ccb2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(375, 210); ctx.quadraticCurveTo(600, 260, 825, 210); ctx.stroke();
      for (let i = 0; i < 11; i++) { const x = 390 + i * 40, y = 213 + Math.sin(i / 10 * Math.PI) * 24; path([[x, y], [x + 23, y + 2], [x + 12, y + 24]], ['#d0c581', '#9cc6a5', '#cd9793'][i % 3]); } ctx.restore();
    }
    boat(t);
  }
  function boat(t) {
    const bob = Math.sin(t * 1.6) * 1.2;
    ctx.save(); ctx.translate(0, bob);
    ellipse(600, 157, 86, 7, '#174f4738');
    path([[520, 131], [674, 131], [656, 153], [542, 153]], '#bb7951', '#7a5941', 2);
    path([[523, 130], [673, 130], [667, 138], [531, 138]], '#f5deb0');
    ctx.strokeStyle = '#e8c596'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(543, 145); ctx.lineTo(649, 145); ctx.stroke();
    roundRect(631, 112, 22, 18, 3, '#9cbd7b'); ctx.strokeStyle = '#577759'; ctx.beginPath(); ctx.moveTo(637, 113); ctx.lineTo(637, 128); ctx.moveTo(647, 113); ctx.lineTo(647, 128); ctx.stroke();
    // The night-shift keeper.
    roundRect(549, 101, 23, 29, 7, '#d4e6a1'); roundRect(554, 118, 8, 14, 2, '#465b4c'); roundRect(565, 118, 8, 14, 2, '#465b4c');
    ellipse(561, 91, 11, 12, '#efcda0'); roundRect(548, 80, 26, 9, 4, '#425e46'); roundRect(548, 84, 31, 5, 2, '#6c884c');
    ellipse(566, 91, 1.5, 1.5, '#3c4a36');
    ctx.strokeStyle = '#efcda0'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(570, 107); ctx.lineTo(584, 113); ctx.stroke();
    // Crane arm and reel.
    ctx.strokeStyle = '#3c5946'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(590, 129); ctx.lineTo(590, 82); ctx.lineTo(600, 82); ctx.lineTo(600, 112); ctx.stroke();
    ctx.strokeStyle = '#d1bd77'; ctx.lineWidth = 6; ctx.stroke(); ellipse(600, 111, 12, 12, '#345546'); ellipse(600, 111, 8, 8, '#d5c986'); ellipse(600, 111, 3, 3, '#516a48');
    ctx.restore();
  }
  function drawTarget(n, t, caught = false) {
    if (!n.active && !caught) return;
    const x = caught ? engine.hook.x : n.x, y = caught ? engine.hook.y + n.r * .5 : n.y;
    ctx.save(); ctx.translate(x, y);
    if (engine.config.night && !engine.illuminated && !caught && !['rare', 'king'].includes(n.type)) ctx.globalAlpha = .48;
    if (['key', 'chest', 'oxygen'].includes(n.type)) {
      if (n.type === 'key') {
        ctx.strokeStyle = '#ffe59a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-10, -8, 12, 0, Math.PI * 2); ctx.moveTo(0, 0); ctx.lineTo(19, 19); ctx.lineTo(26, 12); ctx.moveTo(11, 11); ctx.lineTo(18, 4); ctx.stroke();
      } else if (n.type === 'chest') {
        const unlocked = (engine.counts.key || 0) >= 2;
        roundRect(-37, -25, 74, 52, 8, unlocked ? '#bf9452' : '#716f59', '#e4c57f');
        roundRect(-37, -25, 74, 17, 7, unlocked ? '#e1bd70' : '#938e67');
        roundRect(-5, -4, 10, 16, 3, '#fff1b5');
        text(unlocked ? '已解锁' : '2 把钥匙', 0, 50, 13, '#ffe8ac');
      } else {
        roundRect(-15, -25, 30, 50, 8, '#afdcd5', '#e0fff0'); roundRect(-7, -32, 14, 10, 2, '#e5d8a3');
        text('O₂', 0, 5, 17, '#285c62', 'center', 700); text('+6秒', 0, 44, 13, '#baf4eb');
      }
      ctx.restore(); return;
    }
    if (n.type === 'rock') {
      ctx.rotate(n.phase * .4); path([[-n.r * .9, 9], [-n.r * .7, -20], [-2, -28], [23, -15], [30, 9], [12, 25], [-19, 22]], '#7d9286', '#b3c2a64d', 1.5);
      path([[-22, -13], [-2, -24], [15, -12], [-6, -4]], '#9bad97'); path([[-5, -2], [23, 0], [10, 19], [-18, 18]], '#697e76');
      ctx.restore(); if (!caught) text('15', x, y + n.r + 15, 10, '#b4c6b199'); return;
    }
    const rotation = caught ? Math.sin(t * 8) * .09 : Math.sin(t * .8 + n.phase) * .08;
    ctx.rotate(rotation);
    if (n.type === 'rescue') {
      ctx.strokeStyle = '#ffb79d'; ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, n.r * .4, n.r * 1.18, n.r * .68, 0, 0, Math.PI * 2); ctx.stroke();
      text('SOS', 0, -n.r * 1.25, 13, '#ffd2a8', 'center', 700);
    }
    const wanted = engine.config.order && engine.config.order[engine.orderIndex] === n.type || engine.config.need && (engine.config.need[n.type] || 0) > (engine.counts[n.type] || 0);
    if (wanted && !caught) { ctx.strokeStyle = '#c2edbe70'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(0, 0, n.r * 1.34, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (n.type === 'rare' || n.type === 'king') {
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, n.r * 1.65); glow.addColorStop(0, '#e3e8704d'); glow.addColorStop(1, '#e3e87000');
      ctx.fillStyle = glow; ctx.fillRect(-n.r * 1.8, -n.r * 1.8, n.r * 3.6, n.r * 3.6);
      ctx.shadowColor = '#dce97b'; ctx.shadowBlur = 8;
    } else { ctx.shadowColor = '#0f343b66'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4; }
    if (fish.complete && fish.naturalWidth) ctx.drawImage(fish, -n.r * 1.22, -n.r * 1.22, n.r * 2.44, n.r * 2.44);
    else { ellipse(0, 0, n.r * .7, n.r, '#94bd47'); ellipse(-n.r * .3, -n.r * .2, 4, 5, '#173f32'); ellipse(n.r * .3, -n.r * .2, 4, 5, '#173f32'); ellipse(0, n.r * .4, n.r * .25, n.r * .15, '#d8d878'); }
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (n.type === 'king') {
      if (!engine.bossHits) path([[-38, -n.r * .88], [-43, -n.r * 1.25], [-18, -n.r * 1.12], [0, -n.r * 1.45], [18, -n.r * 1.12], [43, -n.r * 1.25], [38, -n.r * .88]], '#ead58a', '#b9a35c', 2);
      ellipse(0, -n.r * 1.07, 4, 5, '#799863');
      if (!caught) {
        ctx.strokeStyle = engine.bossVulnerable() ? '#bcf3ad' : '#98c5ed'; ctx.lineWidth = engine.bossVulnerable() ? 3 : 6;
        ctx.setLineDash(engine.bossVulnerable() ? [8, 6] : []); ctx.beginPath(); ctx.arc(0, 0, n.r * 1.4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        text(engine.bossVulnerable() ? engine.bossHits ? '现在捕捉！' : '命中破冠' : engine.bossHits ? '冲刺中' : '护盾 ' + Math.min(2, engine.counts.rare || 0) + '/2', 0, -n.r * 1.65, 16, '#e7f9cb', 'center', 700);
      }
    }
    if (n.type === 'courier') { roundRect(n.r * .25, n.r * .3, 30, 25, 3, '#cfb17d', '#f1dc9c'); text('↗', n.r * .25 + 15, n.r * .3 + 18, 18, '#526244', 'center', 700); }
    if (n.type === 'rare') { text('✦', -n.r * 1.03, -n.r * .7, 14, '#edf5a9'); text('✧', n.r * .95, n.r * .25, 11, '#edf5a9'); }
    ctx.restore();
    if (!caught) {
      const label = n.type === 'king' ? '♛ 1200' : String(n.value); const labelY = y + n.r * 1.16 + 14;
      roundRect(x - (n.type === 'king' ? 31 : 21), labelY - 11, n.type === 'king' ? 62 : 42, 19, 9, n.type === 'rare' || n.type === 'king' ? '#d7dc9225' : '#123b3e2e');
      text(label, x, labelY + 2, 10, n.type === 'rare' || n.type === 'king' ? '#e6eaa5' : '#c4dec0', 'center', 600);
    }
  }
  function drawHook(t) {
    const h = engine.hook;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#123f4355'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(PIVOT.x + 1, PIVOT.y + 1); ctx.lineTo(h.x + 1, h.y + 1); ctx.stroke();
    ctx.strokeStyle = '#eee4b6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y); ctx.lineTo(h.x, h.y); ctx.stroke();
    ctx.translate(h.x, h.y); ctx.rotate(-h.angle);
    ellipse(0, 0, 6, 6, '#d8d9b3'); ctx.strokeStyle = '#dbe6c8'; ctx.lineWidth = 3.5; ctx.beginPath();
    ctx.moveTo(-4, 2); ctx.lineTo(h.caught ? -9 : -15, 15); ctx.lineTo(h.caught ? -3 : -10, 24);
    ctx.moveTo(4, 2); ctx.lineTo(h.caught ? 9 : 15, 15); ctx.lineTo(h.caught ? 3 : 10, 24); ctx.stroke();
    ctx.restore();
    if (h.caught) drawTarget(h.caught, t, true);
    if (engine.status === 'playing' && h.phase === 'swing') {
      ctx.save(); ctx.globalAlpha = .27; ctx.setLineDash([3, 10]); ctx.strokeStyle = '#e7edbd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(h.x, h.y);
      for (const point of engine.aimPath().slice(0, engine.config.current ? 32 : 9)) ctx.lineTo(point.x, point.y);
      ctx.stroke(); ctx.restore();
    }
  }
  function drawMechanics(t) {
    if (engine.config.current) {
      const direction = engine.currentForce() >= 0 ? 1 : -1;
      ctx.save(); ctx.globalAlpha = engine.frozen ? .08 : .23; ctx.strokeStyle = '#bef0e4'; ctx.lineWidth = 2;
      for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) {
        const x = 65 + ((i * 210 + direction * engine.worldTime * 45) % 1080 + 1080) % 1080, y = 300 + row * 80;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + direction * 40, y); ctx.lineTo(x + direction * 29, y - 6); ctx.moveTo(x + direction * 40, y); ctx.lineTo(x + direction * 29, y + 6); ctx.stroke();
      }
      ctx.restore();
    }
    for (const g of engine.gates) {
      ctx.save(); ctx.strokeStyle = g.open ? '#a3ebbd' : '#e3a197'; ctx.lineWidth = g.open ? 2 : 11;
      ctx.setLineDash(g.open ? [10, 9] : []); ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.w, g.y); ctx.stroke(); ctx.setLineDash([]);
      if (!g.open) { ctx.strokeStyle = '#614f51'; ctx.lineWidth = 3; for (let x = g.x + 6; x < g.x + g.w; x += 25) { ctx.beginPath(); ctx.moveTo(x, g.y - 8); ctx.lineTo(x + 10, g.y + 8); ctx.stroke(); } }
      roundRect(g.x + g.w / 2 - 61, g.y - 33, 122, 22, 10, '#173f49dd');
      text((g.open ? '通行 ' : '关闭 ') + Math.ceil(g.remaining) + ' 秒', g.x + g.w / 2, g.y - 17, 13, g.open ? '#c5f6c9' : '#ffc2af'); ctx.restore();
    }
    for (const j of engine.jellies) {
      ctx.save(); ctx.translate(j.x, j.y);
      ctx.shadowColor = j.charged ? '#ffc0cc' : '#9ac6df'; ctx.shadowBlur = j.charged ? 20 : 0;
      ctx.fillStyle = j.charged ? '#d895ac' : '#648da1'; ctx.beginPath(); ctx.arc(0, 2, j.r, Math.PI, 0); ctx.quadraticCurveTo(0, 22, -j.r, 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = j.charged ? '#f6bdd2' : '#91b7c7'; ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 15, 6); ctx.bezierCurveTo(i * 15 + Math.sin(t * 2) * 9, 20, i * 15 - 10, 34, i * 15 + 2, 42); ctx.stroke(); }
      text(j.charged ? 'ϟ' : '·', 0, -2, 26, '#fff5e1', 'center', 700);
      text(j.charged ? '通电 −4秒' : '可以穿过', 0, -43, 12, j.charged ? '#ffc0cd' : '#bce9f4'); ctx.restore();
    }
  }
  function draw(t, dt) {
    background(t);
    if (engine.config.night && !engine.illuminated) { ctx.fillStyle = '#080f292e'; ctx.fillRect(0, 160, W, H - 160); }
    for (const n of engine.targets) if (n.active && !n.caught) drawTarget(n, t);
    drawMechanics(t);
    drawHook(t);
    for (const f of fx) {
      f.life -= dt; f.y += (f.vy || 0) * dt; f.x += (f.vx || 0) * dt;
      ctx.save(); ctx.globalAlpha = clamp(f.life / .35, 0, 1);
      if (f.type === 'particle') { f.vy += 110 * dt; ellipse(f.x, f.y, f.r, f.r, f.color); }
      else text(f.text, f.x, f.y, 20, f.color, 'center', 700);
      ctx.restore();
    }
    fx = fx.filter(f => f.life > 0);
    if (engine.frozen > 0 && engine.status === 'playing') {
      ctx.strokeStyle = '#a5e5e27a'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
      roundRect(515, 18, 170, 29, 14, '#d3f2e2aa'); text('❄ 时间冻结 ' + Math.ceil(engine.frozen) + 's', 600, 38, 12, '#35686c', 'center', 600);
    }
    if (engine.status === 'playing' && engine.elapsed < 6 && engine.hook.phase === 'swing') {
      roundRect(450, 211, 300, 31, 15, '#163f3ba6'); text(engine.config.mode + ' · 看上方委托再放钩', 600, 232, 12, '#e0ebc5');
    }
  }
  function frame(now) {
    const dt = previousFrame ? Math.min((now - previousFrame) / 1000, .1) : 0; previousFrame = now;
    if (!document.hidden) {
      if (engine.status === 'playing') engine.step(dt);
      if (view === 'play' || view === 'home' || view === 'story') frameTime += dt;
      draw(frameTime, dt); updateHUD();
      if (toastUntil && now >= toastUntil) { $('toast').classList.remove('visible'); toastUntil = 0; }
    }
    requestAnimationFrame(frame);
  }
  home(); persist(); requestAnimationFrame(frame);
  // Local diagnostics are available only when explicitly opened in test mode.
  if (['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('test') === '1') window.__fishTest = { get engine() { return engine; }, get view() { return view; }, briefing, home, showMap, showResult, ending, shop, pause, resume, saveKey: SAVE_KEY };
})();

