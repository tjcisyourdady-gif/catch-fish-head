(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./galgame-story.js'):root.FishNovelStory);if(typeof module==='object'&&module.exports)module.exports=api;else root.FishNovel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(story){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const cleanName=name=>typeof name==='string'?name.trim().slice(0,12)||'你':'你';
  const owns=(object,key)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(object,key);
  const choiceIds=story.choiceIds||['c1','c2','c3'];
  function flags(input={}) {
    input=input&&typeof input==='object'?input:{};
    return {recording:input.recording===true,comfort:input.comfort==='noodles'?'noodles':'listen',ending:owns(story.endings,input.ending)?input.ending:null,
      route:['pier','archive'].includes(input.route)?input.route:'unknown',shared:typeof input.shared==='boolean'?input.shared:input.recording===true,
      promise:['small','open','shelter'].includes(input.promise)?input.promise:'small',agency:input.agency!==false};
  }
  function reply(input) {
    const node=story.nodes[input?.at];
    if(node?.kind!=='everyday'||!node.options.some(o=>o.reply===input.text))return null;
    return {at:node.id,text:input.text};
  }
  function snapshot(input) {
    if(!input||!owns(story.nodes,input.node))return null;
    return {node:input.node,flags:flags(input.flags),reply:reply(input.reply),...(typeof input.choice==='string'?{choice:input.choice.slice(0,100)}:{})};
  }
  // Checkpoints refer to the current timeline instead of duplicating its history.
  // Rewinding rebuilds this table, so no choice from an abandoned branch survives.
  function refreshCheckpoints(state) {
    state.checkpoints={};
    state.history.forEach((entry,index)=>{if(choiceIds.includes(entry.node))state.checkpoints[entry.node]={node:entry.node,historyIndex:index};});
    return state;
  }
  function fresh(name) {return {storyVersion:2,name:cleanName(name),node:story.start,flags:flags(),reply:null,history:[],checkpoints:{},startedAt:Date.now()};}
  function normalizeSession(input) {
    const current=snapshot(input);if(!current)return null;
    return refreshCheckpoints({...fresh(input.name),...current,history:Array.isArray(input.history)?input.history.slice(-1600).map(snapshot).filter(Boolean):[],startedAt:Number.isFinite(input.startedAt)?input.startedAt:Date.now()});
  }
  function library(input) {
    const defaults={version:2,auto:null,slots:[null,null,null],seen:[],endings:[],prefs:{speed:30,music:false},lastName:''};
    if(!input||![1,2].includes(input.version))return defaults;
    defaults.auto=normalizeSession(input.auto);
    defaults.slots=defaults.slots.map((_,i)=>{const slot=input.slots?.[i],state=normalizeSession(slot?.state);return state?{state,savedAt:Number.isFinite(slot.savedAt)?slot.savedAt:0}:null;});
    defaults.seen=Array.isArray(input.seen)?[...new Set(input.seen.filter(id=>typeof id==='string'&&(owns(story.nodes,id)||validReadKey(id))))]:[];
    defaults.endings=Array.isArray(input.endings)?[...new Set(input.endings.filter(id=>owns(story.endings,id)))]:[];
    defaults.prefs={speed:[0,20,30,50].includes(input.prefs?.speed)?input.prefs.speed:30,music:input.prefs?.music===true};
    defaults.lastName=cleanName(input.lastName);return defaults;
  }
  const matches=(values,conditions)=>Object.entries(conditions||{}).every(([key,value])=>values[key]===value);
  function canChoose(state,option) {return !option.requires||(typeof option.requires==='string'?state.flags[option.requires]===true:matches(state.flags,option.requires));}
  function lineText(state,node=story.nodes[state.node]) {return node.replyFor&&state.reply?.at===node.replyFor?state.reply.text:node.text||'';}
  function readKey(state) {const node=story.nodes[state.node];if(!node?.replyFor)return state.node;const index=story.nodes[node.replyFor].options.findIndex(o=>o.reply===state.reply?.text);return state.node+':'+index;}
  function validReadKey(key) {const [id,index]=key.split(':');const node=story.nodes[id];return !!node?.replyFor&&/^[0-3]$/.test(index||'')&&!!story.nodes[node.replyFor].options[Number(index)];}
  function step(state,optionIndex) {
    const node=story.nodes[state.node];if(!node||node.type==='ending')return false;
    let next=node.next,option=null;
    let nextFlags={...state.flags};
    if(node.type==='choice') {
      option=node.options[optionIndex];if(!option||!canChoose(state,option))return false;
      const context={...state.flags,hadRecording:state.flags.recording};
      Object.assign(nextFlags,option.effect||{});next=option.next;
      const branch=option.branches?.find(b=>matches(context,b.when));
      if(branch){next=branch.next;Object.assign(nextFlags,branch.effect||{});}
    }
    if(!owns(story.nodes,next))return false;
    state.history.push({...snapshot(state),...(option?{choice:option.label}:{})});
    if(state.history.length>1600)state.history=state.history.slice(-1600);
    state.flags=flags(nextFlags);
    if(option)state.reply=option.reply?{at:node.id,text:option.reply}:null;
    state.node=next;refreshCheckpoints(state);return true;
  }
  function back(state) {
    const old=state.history.pop();if(!old)return false;
    state.node=old.node;state.flags=copy(old.flags);state.reply=copy(old.reply||null);refreshCheckpoints(state);return true;
  }
  function jumpHistory(state,index) {
    const old=state.history[index];if(!old)return false;
    state.node=old.node;state.flags=copy(old.flags);state.reply=copy(old.reply||null);state.history=state.history.slice(0,index);refreshCheckpoints(state);return true;
  }
  function checkpoint(state,id) {const point=state.checkpoints[id];return !!point&&jumpHistory(state,point.historyIndex);}
  function autoDuration(text) {return Math.max(1800,text.length*95+550);}
  return {fresh,normalizeSession,library,step,back,checkpoint,jumpHistory,refreshCheckpoints,canChoose,lineText,readKey,autoDuration,cleanName,copy};
});
