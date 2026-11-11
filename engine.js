(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FishGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 1200, H = 650, PIVOT = { x: 600, y: 112 };
  const LEVELS = [
    { name: '新手码头', en: 'FIRST CATCH', depth: 3, target: 450, time: 65, fish: 11, rocks: 2, move: 0, theme: 0, speaker: '馆长 · 语音留言', line: '一整箱鱼头套，全跑了！开业前捞回来，今晚的夜宵我包。', story: '你是青头湾水族馆的夜班管理员。开业前夜，绿色鱼头套突然活了过来，只留下一张纸条：“不想上班，去当鱼了。”', tip: '抓钩会自动摆动。对准鱼头时按空格，小鱼头轻、大鱼头值钱。', caption: '“我只是出来透口气，真的。”' },
    { name: '水草浅滩', en: 'GREEN HIDEOUT', depth: 8, target: 650, time: 65, fish: 12, rocks: 3, move: 0, theme: 0, speaker: '躲在水草里的鱼头', line: '只要我足够绿，就没有人能发现我。', story: '第一批鱼头很快就被捞了回来。剩下的沿着水草留下了一串气泡，似乎正在赶赴某个秘密集合点。', tip: '石头又重又不值钱。误抓时按 B 使用松钩器，每关补充 2 次。', caption: '水草里好像混进了几个不太聪明的家伙。' },
    { name: '沉船仓库', en: 'LOST & FOUND', depth: 16, target: 850, time: 68, fish: 13, rocks: 4, move: 5, theme: 1, speaker: '抱着宝箱的大鱼头', line: '这是我们的创业启动资金，不能上交。', story: '沉船里堆满了鱼头们收集的“宝贝”。你翻出一张邀请函：第一届鱼头自由大会，将于天亮前举行。', tip: '发光鱼头价值 350 分。连续抓到鱼头还有连击加分。', caption: '鱼头自由大会 · 筹备组仓库' },
    { name: '珊瑚回廊', en: 'CORAL EXPRESS', depth: 24, target: 1050, time: 70, fish: 14, rocks: 4, move: 9, theme: 2, speaker: '鱼头快递员', line: '借过借过，给大王送王冠，迟到扣鱼粮！', story: '珊瑚丛里全是忙着赶路的鱼头。你终于听说了幕后主使：一个戴着王冠、体型夸张的“鱼头大王”。', tip: '鱼头开始游动了。稍微提前放钩，预判它们的位置。', caption: '前方珊瑚路段，请鱼头减速慢行。' },
    { name: '水母夜海', en: 'GLOW AFTER DARK', depth: 38, target: 1250, time: 72, fish: 15, rocks: 4, move: 12, theme: 3, speaker: '发光鱼头', line: '我们这叫夜间团建，别跟馆长说。', story: '越往深处，海水越暗。发光鱼头把自己装扮成舞台灯，准备为大会开场。你顺手拿到了它们的节目单。', tip: '按 F 或点击“冻结时间”，可以让倒计时停 6 秒，每关一次。', caption: '今晚的灯光师，长得有点鱼头鱼脑。' },
    { name: '暗流深沟', en: 'DEEP TROUBLE', depth: 56, target: 1450, time: 75, fish: 16, rocks: 5, move: 16, theme: 3, speaker: '馆长 · 信号不佳', line: '滋……找到它们先别凶，问问……滋……为什么跑。', story: '追到这里，你开始觉得有点不对：鱼头们看起来并不是讨厌水族馆。暗流中漂来一份写着“合理诉求”的文件。', tip: '大鱼头回收比较慢。升级强力卷轴，能更快拉回抓钩。', caption: '文件第一条：禁止揪鱼鳍。' },
    { name: '鱼头派对', en: 'HEADS TOGETHER', depth: 70, target: 1650, time: 78, fish: 17, rocks: 5, move: 18, theme: 2, speaker: '大会主持鱼头', line: '欢迎唯一的人类代表！你这根绳子是来拉横幅的吗？', story: '自由大会的入口到了。横幅写着：“我们要下班！我们要被正确佩戴！”原来逃跑只是它们的集体抗议。', tip: '先抓高价值的发光鱼头。清理靠上的鱼头，能给深处目标腾出通道。', caption: '第一届鱼头自由大会 · 现场禁止摸鱼' },
    { name: '鱼头王座', en: 'THE LAST HEAD', depth: 88, target: 2200, time: 90, fish: 12, rocks: 5, move: 12, theme: 4, boss: true, speaker: '鱼头大王', line: '每天都有人把我们戴反！你知道用后脑勺看世界是什么感觉吗？！', story: '王座上的大鱼头终于说出了真相。你答应把意见带给馆长，但首先——请大王跟你一起回去谈谈。', tip: '本关需达到 2200 分，并抓回戴王冠的鱼头大王。大王价值 1200 分。', caption: '最后一钩，带上大王一起回家。' }
  ];
  const TYPES = {
    small: { name: '小鱼头', r: 28, value: 80, weight: .85 },
    big: { name: '大鱼头', r: 42, value: 180, weight: 1.6 },
    rare: { name: '发光鱼头', r: 33, value: 350, weight: 1.05 },
    rock: { name: '石头', r: 31, value: 15, weight: 3.2 },
    king: { name: '鱼头大王', r: 65, value: 1200, weight: 3 },
    key: { name: '沉船钥匙', r: 22, value: 60, weight: .6 },
    chest: { name: '创业宝箱', r: 39, value: 600, weight: 2.1 },
    courier: { name: '快递鱼头', r: 29, value: 200, weight: .8 },
    rescue: { name: '求救鱼头', r: 32, value: 240, weight: 1.3 },
    oxygen: { name: '氧气瓶', r: 22, value: 30, weight: .65 }
  };
  const ORDER = ['small', 'big', 'rare', 'small', 'big', 'rare'];
  const CHALLENGES = [
    { name: '码头分拣', mode: '分拣委托', target: 700, time: 65, need: { small: 3, big: 2 }, tip: '凑够 700 分，还要带回 3 只小鱼头、2 只大鱼头。先选目标，再等抓钩对准。', rule: '收齐指定鱼头，分数和委托都完成才过关。' },
    { name: '逃跑鱼群', mode: '追逐预判', target: 950, time: 70, fish: 14, move: 82, speed: 1.25, need: { small: 6 }, tip: '捞回 6 只小鱼头并获得 950 分。鱼群会大幅左右游动，朝它们即将经过的位置放钩。', rule: '鱼群来回冲刺；冻结可让鱼群和倒计时一起停下。' },
    { name: '沉船寻宝', mode: '钥匙寻宝', target: 1200, time: 80, fish: 9, rocks: 3, move: 10, need: { key: 2, chest: 1 }, tip: '先抓两把金色钥匙，再捞起海底宝箱。宝箱尚未解锁时会弹开抓钩。', rule: '2 把钥匙 → 打开宝箱 → 达到 1200 分。' },
    { name: '珊瑚闸门', mode: '开闸抢运', target: 1200, time: 80, fish: 10, rocks: 2, move: 35, need: { courier: 3 }, gates: true, tip: '带回 3 只背着包裹的快递鱼头。绿色虚线是开放通道；红色闸门会挡回抓钩，扣 2 秒。', rule: '两道闸门交替开放，看准窗口把快递鱼头捞回来。' },
    { name: '水母禁区', mode: '避电夜潜', target: 1450, time: 80, fish: 14, rocks: 2, move: 24, need: { rare: 3 }, jellies: 3, night: true, tip: '捞回 3 只发光鱼头。带闪电的水母会把抓钩电回去并扣 4 秒，暗下来的水母可以穿过。', rule: '观察水母放电周期；每捞回发光鱼头，整片夜海会亮起 5 秒。' },
    { name: '逆流救援', mode: '暗流救援', target: 1500, time: 85, fish: 9, rocks: 3, move: 22, need: { rescue: 4 }, current: true, tip: '救回 4 只戴救生圈的鱼头。暗流会带偏下放的抓钩；氧气瓶补 6 秒，冻结可暂时平息暗流。', rule: '水流会换方向，顺着弯曲的瞄准线预判落点。' },
    { name: '派对点单', mode: '顺序点单', target: 1550, time: 90, fish: 18, rocks: 3, move: 40, order: ORDER, tip: '按“小 → 大 → 发光 → 小 → 大 → 发光”的顺序接客。抓错会放回水里并扣 2 秒，不会卡死订单。', rule: '看上方当前订单。六单完成后，再补足目标分数。' },
    { name: '鱼头王座', mode: '三阶段大王', target: 2600, time: 110, fish: 13, rocks: 3, move: 32, boss: true, tip: '① 抓 2 只发光鱼头解除护盾；② 命中大王打碎王冠；③ 等它停下，再抓一钩带回。最终还需 2600 分。', rule: '护盾 → 破冠 → 冲刺。大王停下时，绿色圆环表示可以捕捉。' }
  ];
  LEVELS.forEach((level, i) => Object.assign(level, CHALLENGES[i]));
  const UPGRADES = {
    speed: { name: '强力卷轴', desc: '每级提升 22% 回收速度', icon: '↟', prices: [220, 460, 760], max: 3 },
    time: { name: '加班沙漏', desc: '每级增加 8 秒关卡时间', icon: '◷', prices: [200, 430, 720], max: 3 },
    magnet: { name: '宽口抓钩', desc: '每级扩大 5 像素捕捉范围', icon: '⊹', prices: [180, 390, 660], max: 3 }
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function newSave() { return { version: 1, unlocked: 1, wallet: 0, stars: Array(8).fill(0), best: Array(8).fill(0), upgrades: { speed: 0, time: 0, magnet: 0 }, sound: true, completed: false }; }
  function normalizeSave(input) {
    const d = newSave();
    if (!input || typeof input !== 'object' || input.version !== 1) return d;
    const number = (v, max) => Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0;
    d.unlocked = Math.max(1, number(input.unlocked, 8)); d.wallet = number(input.wallet, 99999999);
    d.stars = d.stars.map((_, i) => number(input.stars && input.stars[i], 3));
    d.best = d.best.map((_, i) => number(input.best && input.best[i], 9999999));
    for (const key of Object.keys(d.upgrades)) d.upgrades[key] = number(input.upgrades && input.upgrades[key], 3);
    d.sound = input.sound !== false; d.completed = input.completed === true;
    return d;
  }
  // Swept segment collision prevents a fast hook from skipping a small target.
  function hitAlongSegment(ax, ay, bx, by, cx, cy, radius) {
    const dx = bx - ax, dy = by - ay, fx = ax - cx, fy = ay - cy;
    const a = dx * dx + dy * dy, c = fx * fx + fy * fy - radius * radius;
    if (c <= 0) return 0;
    if (a === 0) return null;
    const b = 2 * (fx * dx + fy * dy), det = b * b - 4 * a * c;
    if (det < 0) return null;
    const t = (-b - Math.sqrt(det)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  function hitGate(ax, ay, bx, by, gate) {
    let near = 0, far = 1;
    for (const [origin, delta, min, max] of [[ax, bx - ax, gate.x - 8, gate.x + gate.w + 8], [ay, by - ay, gate.y - 14, gate.y + 14]]) {
      if (Math.abs(delta) < 1e-9) { if (origin < min || origin > max) return null; }
      else { const a = (min - origin) / delta, b = (max - origin) / delta; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); if (near > far) return null; }
    }
    return near;
  }
  function makeTargets(index, seed) {
    const l = LEVELS[index], random = rng(seed), nodes = [];
    function add(type, x, y) {
      const data = TYPES[type];
      nodes.push({ ...data, type, id: nodes.length, x, y, baseX: x, baseY: y, phase: random() * Math.PI * 2, active: true, caught: false });
    }
    if (l.boss) add('king', 600, 508);
    else add('small', 600, 278);
    if (index === 2) { add('key', 360, 305); add('key', 865, 340); add('chest', 590, 532); }
    if (l.gates) { add('courier', 320, 475); add('courier', 600, 535); add('courier', 880, 475); }
    if (l.current) { [[275, 440], [445, 535], [765, 525], [930, 435]].forEach(([x, y]) => add('rescue', x, y)); add('oxygen', 440, 305); add('oxygen', 810, 330); }
    const types = [];
    for (let i = l.boss ? 0 : 1; i < l.fish; i++) types.push(i % 5 === 4 || (index > 3 && i % 5 === 3) ? 'rare' : i % 3 === 1 ? 'big' : 'small');
    for (let i = 0; i < l.rocks; i++) types.push('rock');
    for (const type of types) {
      const r = TYPES[type].r;
      for (let tries = 0; tries < 1200; tries++) {
        const x = 80 + random() * 1040, y = 260 + random() * (H - 58 - r - 260);
        if (Math.abs(Math.atan2(x - PIVOT.x, y - PIVOT.y)) > 1.1) continue;
        const gap = tries < 600 ? 23 : 9;
        if (nodes.some(n => Math.hypot(n.x - x, n.y - y) < n.r + r + gap)) continue;
        add(type, x, y); break;
      }
    }
    return nodes;
  }
  class Engine {
    constructor(save, onEvent = () => {}) { this.save = normalizeSave(save); this.onEvent = onEvent; this.attempts = Array(8).fill(0); this.status = 'ready'; this.level = 0; this.start(0); }
    start(index) {
      this.level = clamp(Math.floor(index), 0, 7); this.config = LEVELS[this.level];
      this.status = 'ready'; this.score = 0; this.elapsed = 0; this.time = this.config.time + this.save.upgrades.time * 8;
      this.targets = makeTargets(this.level, 12345 + this.level * 771 + this.attempts[this.level]++ * 701);
      this.hook = { phase: 'swing', angle: -.45, length: 40, caught: null, x: 0, y: 0 };
      this.swingTime = -.4; this.cutters = 2; this.freezes = 1; this.frozen = 0;
      this.combo = 0; this.lastCatch = -99; this.kingCaught = false; this.catches = 0; this.result = null; this.updateHookPoint();
      this.counts = {}; this.orderIndex = 0; this.shots = 0; this.mistakes = 0; this.peakCombo = 0;
      this.worldTime = 0; this.illuminated = 0; this.bossHits = 0; this.bossRecovery = 0;
      this.gates = this.config.gates ? [{ x: 170, y: 330, w: 350, phase: 0 }, { x: 680, y: 370, w: 350, phase: 4 }] : [];
      this.jellies = Array.from({ length: this.config.jellies || 0 }, (_, i) => ({ x: 285 + i * 300, y: 345, baseX: 285 + i * 300, baseY: 335 + i % 2 * 80, phase: i * 2, r: 30 }));
      this.updateWorld();
    }
    begin() { if (this.status === 'ready') { this.status = 'playing'; this.onEvent({ type: 'begin' }); return true; } return false; }
    pause() { if (this.status === 'playing') { this.status = 'paused'; return true; } return false; }
    resume() { if (this.status === 'paused') { this.status = 'playing'; return true; } return false; }
    fire() {
      if (this.status !== 'playing' || this.hook.phase !== 'swing') return false;
      this.hook.phase = 'out'; this.shots++; this.onEvent({ type: 'fire' }); return true;
    }
    release() {
      if (this.status !== 'playing' || !this.hook.caught || this.cutters < 1) return false;
      this.cutters--; const item = this.hook.caught; item.active = true; item.caught = false; this.hook.caught = null;
      this.combo = 0; this.onEvent({ type: 'release', x: this.hook.x, y: this.hook.y }); return true;
    }
    freeze() {
      if (this.status !== 'playing' || this.freezes < 1 || this.frozen > 0) return false;
      this.freezes--; this.frozen = 6; this.onEvent({ type: 'freeze' }); return true;
    }
    goalComplete() {
      if (this.config.boss) return this.kingCaught;
      if (this.config.order) return this.orderIndex >= this.config.order.length;
      return Object.entries(this.config.need || {}).every(([type, count]) => (this.counts[type] || 0) >= count);
    }
    missionText() {
      if (this.config.boss) {
        if (this.kingCaught) return '大王已上船 · 补足目标分数';
        if ((this.counts.rare || 0) < 2) return '① 解除护盾：发光鱼头 ' + (this.counts.rare || 0) + '/2';
        if (!this.bossHits) return '② 护盾已破 · 命中大王打碎王冠';
        return this.bossVulnerable() ? '③ 大王停下了！现在可以抓回' : '③ 大王正在冲刺 · 等绿色圆环亮起';
      }
      if (this.config.order) return this.orderIndex < this.config.order.length ? '订单 ' + (this.orderIndex + 1) + '/6：下一只要 ' + TYPES[this.config.order[this.orderIndex]].name : '六份订单完成 · 补足目标分数';
      return Object.entries(this.config.need || {}).map(([type, total]) => TYPES[type].name + ' ' + Math.min(total, this.counts[type] || 0) + '/' + total).join(' · ');
    }
    environmentText() {
      if (this.frozen > 0) return '❄ 海流、鱼群与机关已冻结';
      if (this.gates.length) return this.gates.map((g, i) => (i ? '右' : '左') + '闸' + (g.open ? '开放' : '关闭') + ' ' + Math.ceil(g.remaining) + '秒').join(' · ');
      if (this.jellies.length) return '闪电水母通电时不可碰 · 暗下来可穿过';
      if (this.config.current) return Math.abs(this.currentForce()) < .2 ? '暗流即将换向' : (this.currentForce() > 0 ? '→ 右向暗流' : '← 左向暗流') + ' · 氧气瓶 +6秒';
      if (this.config.order) return '小 → 大 → 发光 → 小 → 大 → 发光';
      if (this.level === 2) return (this.counts.key || 0) >= 2 ? '宝箱已经解锁' : '找到两把金色钥匙';
      return this.config.rule;
    }
    currentForce(time = this.worldTime) { return this.config.current && this.frozen <= 0 ? Math.sin(time * .55 + .8) : 0; }
    bossVulnerable() { return (this.counts.rare || 0) >= 2 && (!this.bossHits || (this.worldTime >= this.bossRecovery && (this.worldTime - this.bossRecovery) % 7 < 3.6)); }
    updateWorld(dt = 0) {
      for (const g of this.gates) { const phase = (this.worldTime + g.phase) % 8; g.open = phase < 3.2; g.remaining = (g.open ? 3.2 : 8) - phase; }
      for (const j of this.jellies) { j.x = j.baseX + Math.sin(this.worldTime * .75 + j.phase) * 100; j.y = j.baseY + Math.sin(this.worldTime * .6 + j.phase) * 25; j.charged = (this.worldTime + j.phase) % 7 < 4.2; }
      for (const n of this.targets) {
        if (!n.active || n.caught || ['rock', 'key', 'chest', 'oxygen'].includes(n.type)) continue;
        const movement = n.type === 'king' ? 85 : n.type === 'courier' ? 65 : this.config.move;
        if (n.type === 'king') n.travelPhase = (n.travelPhase ?? n.phase) + dt * (this.bossHits ? this.bossVulnerable() ? 0 : 2.6 : .22);
        const phase = n.type === 'king' ? n.travelPhase : this.worldTime * (this.config.speed || .9) + n.phase;
        n.y = n.baseY + Math.sin(this.worldTime * .9 + n.phase) * (movement ? 8 : 0);
        const reach = (n.y - PIVOT.y) * Math.tan(1.07);
        n.x = clamp(n.baseX + Math.sin(phase) * movement, Math.max(n.r + 55, PIVOT.x - reach), Math.min(W - n.r - 55, PIVOT.x + reach));
      }
    }
    // Used by the visible aim guide; it follows the same flow field as the hook.
    aimPath() {
      const dots = []; let angle = this.hook.angle, length = 40;
      for (let i = 0; i < 32; i++) {
        if (PIVOT.y + Math.cos(angle) * length > 230) angle += this.currentForce(this.worldTime + i * .025) * .27 * .025;
        length += 620 * .025;
        const x = PIVOT.x + Math.sin(angle) * length, y = PIVOT.y + Math.cos(angle) * length;
        if (x < 28 || x > W - 28 || y > H - 40) break;
        dots.push({ x, y });
      }
      return dots;
    }
    rebound(reason, penalty = 0) {
      this.hook.phase = 'back'; this.hook.caught = null; this.combo = 0; this.mistakes++;
      this.time = Math.max(0, this.time - penalty);
      this.onEvent({ type: 'obstacle', reason, penalty, x: this.hook.x, y: this.hook.y });
      if (this.time <= 0) this.finish(false);
    }
    updateHookPoint() { this.hook.x = PIVOT.x + Math.sin(this.hook.angle) * this.hook.length; this.hook.y = PIVOT.y + Math.cos(this.hook.angle) * this.hook.length; }
    step(dt) {
      if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, .25);
      while (remaining > 0 && this.status === 'playing') { const chunk = Math.min(remaining, 1 / 60); this.tick(chunk); remaining -= chunk; }
    }
    tick(dt) {
      const frozenPart = Math.min(dt, this.frozen); this.frozen -= frozenPart;
      this.time = Math.max(0, this.time - (dt - frozenPart)); this.elapsed += dt; this.worldTime += dt - frozenPart;
      this.illuminated = Math.max(0, this.illuminated - (dt - frozenPart));
      if (this.time <= 0) { this.finish(false); return; }
      this.updateWorld(dt - frozenPart);
      const h = this.hook;
      if (h.phase === 'swing') {
        this.swingTime += dt; h.angle = Math.sin(this.swingTime * 1.27) * 1.12;
      } else if (h.phase === 'out') {
        const oldX = h.x, oldY = h.y;
        if (h.y > 230) h.angle += this.currentForce() * .27 * dt;
        h.length += 620 * dt; this.updateHookPoint();
        let best = null, barrier = null, firstT = Infinity;
        for (const g of this.gates) {
          if (g.open) continue;
          const t = hitGate(oldX, oldY, h.x, h.y, g);
          if (t !== null && t < firstT) { firstT = t; barrier = { reason: '撞到关闭的闸门', penalty: 2 }; }
        }
        for (const j of this.jellies) {
          if (!j.charged) continue;
          const t = hitAlongSegment(oldX, oldY, h.x, h.y, j.x, j.y, j.r + 8);
          if (t !== null && t < firstT) { firstT = t; barrier = { reason: '被水母电到了', penalty: 4 }; }
        }
        for (const n of this.targets) {
          if (!n.active || n.caught) continue;
          const t = hitAlongSegment(oldX, oldY, h.x, h.y, n.x, n.y, n.r * .8 + 9 + this.save.upgrades.magnet * 5);
          if (t !== null && t < firstT) { firstT = t; best = n; barrier = null; }
        }
        if (barrier || best) {
          h.x = oldX + (h.x - oldX) * firstT; h.y = oldY + (h.y - oldY) * firstT;
          h.length = Math.hypot(h.x - PIVOT.x, h.y - PIVOT.y);
          if (barrier) this.rebound(barrier.reason, barrier.penalty);
          else if (best.type === 'chest' && (this.counts.key || 0) < 2) this.rebound('宝箱还缺钥匙');
          else if (best.type === 'king' && !this.bossVulnerable()) this.rebound((this.counts.rare || 0) < 2 ? '先抓两只发光鱼头解除护盾' : '大王正在冲刺，等它停下', 2);
          else if (best.type === 'king' && !this.bossHits) {
            this.bossHits++; this.bossRecovery = this.worldTime + 2;
            h.phase = 'back'; this.onEvent({ type: 'bossPhase', x: h.x, y: h.y });
          } else { h.caught = best; best.caught = true; h.phase = 'back'; this.onEvent({ type: 'hooked', item: best, x: h.x, y: h.y }); }
        } else if (h.x < 28 || h.x > W - 28 || h.y > H - 40) { h.phase = 'back'; this.combo = 0; this.onEvent({ type: 'miss', x: h.x, y: h.y }); }
      } else if (h.phase === 'back') {
        const weight = h.caught ? h.caught.weight : .7;
        h.length = Math.max(40, h.length - (390 * (1 + this.save.upgrades.speed * .22) / weight) * dt);
        if (h.length <= 40) {
          const item = h.caught; h.caught = null; h.phase = 'swing';
          if (item) this.collect(item);
        }
      }
      this.updateHookPoint();
    }
    collect(item) {
      if (this.status !== 'playing' || !item.active) return;
      if (this.config.order && this.orderIndex < this.config.order.length && ['small', 'big', 'rare'].includes(item.type)) {
        if (item.type !== this.config.order[this.orderIndex]) {
          item.caught = false; this.combo = 0; this.mistakes++; this.time = Math.max(0, this.time - 2);
          this.onEvent({ type: 'wrongOrder', wanted: TYPES[this.config.order[this.orderIndex]].name });
          if (this.time <= 0) this.finish(false);
          return;
        }
        this.orderIndex++;
      }
      item.active = false; item.caught = false;
      this.counts[item.type] = (this.counts[item.type] || 0) + 1;
      if (item.type === 'rock') this.combo = 0;
      else { if (!['key', 'chest', 'oxygen'].includes(item.type)) this.catches++; this.combo = this.elapsed - this.lastCatch < 9 ? this.combo + 1 : 1; this.lastCatch = this.elapsed; }
      this.peakCombo = Math.max(this.peakCombo, this.combo);
      if (item.type === 'rare') this.illuminated = 5;
      if (item.type === 'oxygen') this.time += 6;
      const multiplier = item.type === 'rock' ? 1 : 1 + Math.min(3, Math.max(0, this.combo - 1)) * .1;
      const points = Math.round(item.value * multiplier); this.score += points;
      if (item.type === 'king') this.kingCaught = true;
      this.onEvent({ type: 'collect', item, points, combo: this.combo, multiplier });
      if (this.score >= this.config.target && this.goalComplete()) this.finish(true);
      else if (!this.targets.some(n => n.active)) this.finish(false);
    }
    finish(won) {
      if (this.status !== 'playing') return;
      this.status = won ? 'won' : 'lost';
      const accuracy = this.shots ? Math.min(1, (this.catches + (this.counts.key || 0) + (this.counts.chest || 0) + (this.counts.oxygen || 0)) / this.shots) : 1;
      const stars = won ? this.time >= 18 && accuracy >= .75 && this.mistakes <= 1 ? 3 : this.time >= 8 && accuracy >= .5 ? 2 : 1 : 0;
      const reward = won ? 100 + Math.floor(this.score * .35 + this.time) : 0;
      if (won) {
        this.save.wallet += reward; this.save.unlocked = Math.max(this.save.unlocked, Math.min(8, this.level + 2));
        this.save.stars[this.level] = Math.max(this.save.stars[this.level], stars);
        this.save.best[this.level] = Math.max(this.save.best[this.level], this.score);
        if (this.level === 7) this.save.completed = true;
      }
      this.result = { won, stars, reward, score: this.score, time: this.time, catches: this.catches, kingCaught: this.kingCaught, accuracy, mistakes: this.mistakes, peakCombo: this.peakCombo, mission: this.missionText(), goalComplete: this.goalComplete() };
      this.onEvent({ type: 'finish', ...this.result });
    }
    buy(key) {
      const item = UPGRADES[key], current = this.save.upgrades[key];
      if (!item || current >= item.max || this.status === 'playing' || this.status === 'paused') return false;
      const price = item.prices[current];
      if (this.save.wallet < price) return false;
      this.save.wallet -= price; this.save.upgrades[key]++; this.onEvent({ type: 'purchase', key }); return true;
    }
  }
  return { Engine, LEVELS, TYPES, UPGRADES, W, H, PIVOT, newSave, normalizeSave, makeTargets, hitAlongSegment, rng, clamp };
});
