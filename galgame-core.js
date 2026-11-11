(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./galgame-story.js'):root.FishNovelStory);if(typeof module==='object'&&module.exports)module.exports=api;else root.FishNovel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(story){
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const cleanName = name => typeof name === 'string' ? name.trim().slice(0, 12) || '你' : '你';
  const owns = (object, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);
  function flags(input = {}) { input = input && typeof input === 'object' ? input : {}; return { recording: input.recording === true, comfort: input.comfort === 'noodles' ? 'noodles' : 'listen', ending: owns(story.endings,input.ending) ? input.ending : null }; }
  function snapshot(input) {
    if (!input || !owns(story.nodes,input.node)) return null;
    return { node: input.node, flags: flags(input.flags), choice: typeof input.choice === 'string' ? input.choice.slice(0, 80) : undefined };
  }
  function fresh(name) { return { name: cleanName(name), node: story.start, flags: flags(), history: [], checkpoints: {}, startedAt: Date.now() }; }
  function normalizeSession(input) {
    if (!snapshot(input)) return null;
    const result = { ...fresh(input.name), ...snapshot(input), history: Array.isArray(input.history) ? input.history.slice(-500).map(snapshot).filter(Boolean) : [], checkpoints: {}, startedAt: Number.isFinite(input.startedAt) ? input.startedAt : Date.now() };
    for (const id of ['c1','c2','c3']) {
      const value = input.checkpoints?.[id];
      if (value?.node === id) result.checkpoints[id] = { node: id, flags: flags(value.flags), history: Array.isArray(value.history) ? value.history.slice(-500).map(snapshot).filter(Boolean) : [] };
    }
    return result;
  }
  function library(input) {
    const defaults = { version: 1, auto: null, slots: [null,null,null], seen: [], endings: [], prefs: { speed: 30, music: false }, lastName: '' };
    if (!input || input.version !== 1) return defaults;
    defaults.auto = normalizeSession(input.auto);
    defaults.slots = defaults.slots.map((_,i) => { const slot = input.slots?.[i], state = normalizeSession(slot?.state); return state ? { state, savedAt: Number.isFinite(slot.savedAt) ? slot.savedAt : 0 } : null; });
    defaults.seen = Array.isArray(input.seen) ? [...new Set(input.seen.filter(id => owns(story.nodes,id)))] : [];
    defaults.endings = Array.isArray(input.endings) ? [...new Set(input.endings.filter(id => owns(story.endings,id)))] : [];
    defaults.prefs = { speed: [0,20,30,50].includes(input.prefs?.speed) ? input.prefs.speed : 30, music: input.prefs?.music === true };
    defaults.lastName = cleanName(input.lastName); return defaults;
  }
  function canChoose(state, option) { return !option.requires || state.flags[option.requires] === true; }
  function step(state, optionIndex) {
    const node = story.nodes[state.node]; if (!node || node.type === 'ending') return false;
    let next = node.next, option = null;
    if (node.type === 'choice') {
      option = node.options[optionIndex]; if (!option || !canChoose(state, option)) return false;
      state.checkpoints[node.id] = { node: node.id, flags: copy(state.flags), history: copy(state.history) };
      if (node.id === 'c1') { delete state.checkpoints.c2; delete state.checkpoints.c3; }
      if (node.id === 'c2') delete state.checkpoints.c3;
      next = option.next;
    }
    if (!story.nodes[next]) return false;
    state.history.push({ node: state.node, flags: copy(state.flags), ...(option ? { choice: option.label } : {}) });
    state.history = state.history.slice(-500);
    if (option) Object.assign(state.flags, option.effect || {});
    state.node = next; return true;
  }
  function back(state) {
    const previous = state.history.pop(); if (!previous) return false;
    state.node = previous.node; state.flags = copy(previous.flags);
    if (story.nodes[state.node].chapter < 6 || state.node === 'c2') delete state.checkpoints.c3;
    if (story.nodes[state.node].chapter < 4 || state.node === 'c1') delete state.checkpoints.c2;
    return true;
  }
  function checkpoint(state, id) {
    const point = state.checkpoints[id]; if (!point) return false;
    state.node = id; state.flags = copy(point.flags); state.history = copy(point.history);
    if (id === 'c2') delete state.checkpoints.c3;
    return true;
  }
  return { fresh, normalizeSession, library, step, back, checkpoint, canChoose, cleanName, copy };
});
