(() => {
  'use strict';
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.imageHandler?.version === 2) return;
  const MEDIA = 'img,canvas,svg,iframe';
  const MATH = '.katex,mjx-container,math,[role="math"],.MathJax,.MathJax_Display,.math-element,.math-inline,.math-block,.aice-preserved-math,[data-latex],[data-math],[data-tex]';
  let assets = new WeakMap(), diagnostics, exportId, savedScroll, totalBytes;
  function begin(options = {}) {
    assets = new WeakMap(); exportId = options.exportId; savedScroll = new Map(); totalBytes = 0;
    diagnostics = { requested: 0, included: 0, omitted: 0, excluded: 0, failures: [] };
  }
  function nodes(root) { return [...(root.matches?.(MEDIA) ? [root] : []), ...root.querySelectorAll(MEDIA)]; }
  function candidates(root) {
    const all = nodes(root).filter(node => {
      if (node.closest(MATH)) return false;
      if (node.localName === 'img') return true;
      const rect = node.getBoundingClientRect();
      const layoutHeight = node.localName === 'svg' ? (node.height?.baseVal?.value || rect.height) : rect.height;
      return rect.width >= 80 && layoutHeight >= 50 && (node.localName !== 'iframe' || !/analytics|marketing|마케팅|captcha/i.test(node.title));
    });
    return all.filter(node => !all.some(parent => parent !== node && parent.contains(node)));
  }
  function rememberScroll(node) {
    for (let current = node.parentElement; current; current = current.parentElement) {
      if ((current.scrollHeight > current.clientHeight || current.scrollWidth > current.clientWidth) && !savedScroll.has(current)) savedScroll.set(current, [current.scrollLeft, current.scrollTop]);
    }
    const scroller = document.scrollingElement;
    if (scroller && !savedScroll.has(scroller)) savedScroll.set(scroller, [scroller.scrollLeft, scroller.scrollTop]);
  }
  function restore() {
    for (const [node, [left, top]] of [...savedScroll].reverse()) node.scrollTo({left, top, behavior:'instant'});
    savedScroll.clear();
  }
  const settled = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  function canvasPng(node) {
    // A foreignObject infographic is already a raster image; use its original pixels.
    const image = node.localName === 'svg' && node.querySelector('foreignObject img') || node;
    if (!['img','canvas'].includes(image.localName)) throw new Error('시각화 화면 보존 필요');
    const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
    if (!width || !height) throw new Error('그림이 아직 로드되지 않았습니다.');
    const scale = Math.min(1, Math.sqrt(12000000 / (width * height)));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width*scale)); canvas.height = Math.max(1, Math.round(height*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/png');
  }
  function decode(url) {
    return new Promise((resolve,reject) => {
      const image = new Image(); const timer = setTimeout(() => reject(new Error('화면 이미지를 읽지 못했습니다.')),5000);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('화면 이미지 형식 오류')); }; image.src = url;
    });
  }
  function clip(node) {
    const r = node.getBoundingClientRect();
    const box = {left:Math.max(0,r.left),top:Math.max(0,r.top),right:Math.min(innerWidth,r.right),bottom:Math.min(innerHeight,r.bottom)};
    for(let p=node.parentElement;p;p=p.parentElement){
      const style=getComputedStyle(p), pr=p.getBoundingClientRect();
      if(/hidden|clip|auto|scroll/.test(style.overflowX)){box.left=Math.max(box.left,pr.left);box.right=Math.min(box.right,pr.right);}
      if(/hidden|clip|auto|scroll/.test(style.overflowY)){box.top=Math.max(box.top,pr.top);box.bottom=Math.min(box.bottom,pr.bottom);}
    }
    return {r,box};
  }
  function scrollByPixels(scroller, top) {
    const zoom = scroller === document.scrollingElement ? 1 : (scroller.getBoundingClientRect().height / scroller.offsetHeight || 1);
    scroller.scrollBy({top:top/zoom,behavior:'instant'});
  }
  async function capture(node) {
    if (!exportId || !chrome?.runtime?.sendMessage) throw new Error('그림이 보이는 탭에서 다시 내보내 주세요.');
    rememberScroll(node);
    node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}); await settled();
    let {r} = clip(node);
    if (r.height > innerHeight - 150) {
      node.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
      const scrollable=[...savedScroll.keys()].find(p=>p.contains(node)&&p.scrollHeight>p.clientHeight);
      if(scrollable)scrollByPixels(scrollable,-80); await settled();
    }
    let lastOffset=-1, lastEnd=0, output, ratio;
    for(let attempt=0;attempt<8;attempt++){
      const {r,box}=clip(node);
      if(box.right-box.left<2||box.bottom-box.top<2)throw new Error('그림이 화면에 표시되지 않습니다.');
      if(box.left>r.left+2||box.right<r.right-2)throw new Error('그림의 좌우가 잘립니다. 창을 넓히거나 그림을 축소해 주세요.');
      const offset=Math.max(0,box.top-r.top);
      if(attempt===0 && offset>2)throw new Error('그림의 상단이 가려져 있습니다. 그림을 화면에 펼쳐 주세요.');
      if(attempt>0 && offset>lastEnd+2)throw new Error('그림 일부가 건너뛰어졌습니다. 배율을 줄여 다시 시도해 주세요.');
      if(attempt>0 && offset<=lastOffset+1)throw new Error('그림 전체를 스크롤할 수 없습니다. 그림을 축소해 주세요.');
      const result=await chrome.runtime.sendMessage({type:'CAPTURE_EXPORT_VIEW',exportId});
      if(!result?.ok)throw new Error(result?.error||'그림 화면을 확보하지 못했습니다.');
      const shot=await decode(result.dataUrl); ratio=shot.naturalWidth/innerWidth;
      if(!output){
        const limit=Math.min(ratio,Math.sqrt(12000000/(r.width*r.height)));
        output=document.createElement('canvas');output.width=Math.max(1,Math.round(r.width*limit));output.height=Math.max(1,Math.round(r.height*limit));
      }
      const scale=output.width/r.width;
      output.getContext('2d').drawImage(shot,box.left*ratio,box.top*ratio,(box.right-box.left)*ratio,(box.bottom-box.top)*ratio,0,offset*scale,(box.right-box.left)*scale,(box.bottom-box.top)*scale);
      lastEnd=offset+box.bottom-box.top; lastOffset=offset;
      if(box.bottom>=r.bottom-1)return output.toDataURL('image/png');
      const scroller=[...savedScroll.keys()].find(p=>p.contains(node)&&p.scrollHeight>p.clientHeight);
      if(!scroller)throw new Error('그림 전체를 캡처할 수 없습니다.');
      scrollByPixels(scroller,Math.max(30,box.bottom-box.top-30)); await settled();
    }
    throw new Error('그림이 너무 깁니다. 그림을 축소한 뒤 다시 시도해 주세요.');
  }
  async function prepare(root, settings={}, accept=()=>true) {
    if(!diagnostics)begin();
    try {
      for (const node of candidates(root).filter(accept)) {
        if(assets.has(node))continue;
        if(settings.includeImages===false){assets.set(node,{excluded:true});diagnostics.excluded++;continue;}
        diagnostics.requested++;
        const alt=node.alt || node.getAttribute('aria-label') || node.title || (node.localName==='iframe'?'대화형 그림':'그림');
        try {
          if(diagnostics.requested>40)throw new Error('한 번에 그림 40개까지 포함할 수 있습니다.');
          const loadedImage = node.localName === 'img' ? node : node.querySelector?.('foreignObject img');
          if (loadedImage && (!loadedImage.complete || !loadedImage.naturalWidth)) {
            rememberScroll(node);
            node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});await settled();
            await waitForImages(loadedImage.parentElement || root);
            if (!loadedImage.complete || !loadedImage.naturalWidth) throw new Error('그림 로딩이 끝나지 않았습니다. 잠시 후 다시 시도하세요.');
          }
          let data;
          try { data=canvasPng(node); } catch (_) { data=await capture(node); }
          totalBytes+=data.length;
          if(totalBytes>24000000)throw new Error('그림 용량이 큽니다. 대화를 나누어 내보내 주세요.');
          const bytes = atob(data.slice(data.indexOf(',')+1, data.indexOf(',')+45));
          const word = i => ((bytes.charCodeAt(i)*16777216)+(bytes.charCodeAt(i+1)<<16)+(bytes.charCodeAt(i+2)<<8)+bytes.charCodeAt(i+3));
          assets.set(node,{data,alt,width:word(16),height:word(20)});diagnostics.included++;
        } catch(error){assets.set(node,{error:String(error.message),alt});diagnostics.omitted++;diagnostics.failures.push({alt,reason:String(error.message)});}
      }
    } finally { restore(); }
  }
  function copyPairs(sources, clones, settings={}) {
    sources.forEach((source,index)=>{
      const clone=clones[index]; if(!clone||source.closest(MATH))return;
      const asset=assets.get(source);
      if(settings.includeImages===false){clone.remove();return;}
      if(!asset)return;
      if(asset.excluded){clone.remove();return;}
      const replacement=document.createElement(asset.data?'img':'span');
      if(asset.data){replacement.src=asset.data;replacement.alt=asset.alt;
        const displayScale=Math.min(1,640/asset.width,900/asset.height,(source.getBoundingClientRect().width||640)/asset.width);
        replacement.width=Math.max(1,Math.round(asset.width*displayScale));replacement.height=Math.max(1,Math.round(asset.height*displayScale));
        replacement.setAttribute('data-aice-image','true');replacement.style.cssText='display:block;max-width:100%;height:auto;';}
      else {replacement.className='aice-image-omitted';replacement.textContent=`[그림 생략: ${asset.alt} — ${asset.error}]`;}
      clone.replaceWith(replacement);
    });
  }
  function copyMedia(source,clone,settings={}) { copyPairs(nodes(source),nodes(clone),settings); }
  function selectionAncestor(range) { return range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement; }
  async function prepareSelection(range,settings={}) {
    const ancestor=selectionAncestor(range);
    for(const child of ancestor.children)if(range.intersectsNode(child))await prepare(child,settings,node=>range.intersectsNode(node));
  }
  function copySelection(range,clone,settings={}) {
    const sources=[...selectionAncestor(range).querySelectorAll(MEDIA)].filter(node=>range.intersectsNode(node));
    copyPairs(sources,nodes(clone),settings);
  }
  function preserveContainers(root) {
    root.querySelectorAll('svg').forEach(svg=>{
      if(svg.closest(MATH))return;
      const images=[...svg.querySelectorAll('foreignObject img')];
      if(images.length){const box=document.createElement('div');images.forEach(img=>box.append(img));svg.replaceWith(box);}
    });
    root.querySelectorAll('foreignObject').forEach(node=>{
      if(node.closest('svg')||node.closest(MATH))return;
      const box=document.createElement('div');box.append(...node.childNodes);node.replaceWith(box);
    });
    root.querySelectorAll('button,[role="button"],nb-button').forEach(button=>{
      if(!button.querySelector('img[data-aice-image],img:not([width="16"]):not([width="24"]),canvas,iframe'))return;
      const box=document.createElement('div');box.append(...button.childNodes);button.replaceWith(box);
    });
  }
  async function waitForImages(root, timeoutMs = 4500) {
    const pending=[...root.querySelectorAll('img')].filter(image=>!image.complete);
    if(!pending.length)return;
    let timer; const cleanups=[];
    try {await Promise.race([Promise.allSettled(pending.map(image=>new Promise(resolve=>{
      image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});
      cleanups.push(()=>{image.removeEventListener('load',resolve);image.removeEventListener('error',resolve);});
    }))),new Promise(resolve=>{timer=setTimeout(resolve,timeoutMs);})]);}
    finally {clearTimeout(timer);cleanups.forEach(fn=>fn());}
  }
  AICE.imageHandler={version:2,begin,prepare,prepareSelection,copyMedia,copySelection,preserveContainers,copyCanvas:copyMedia,waitForImages,getDiagnostics:()=>diagnostics||{requested:0,included:0,omitted:0,excluded:0,failures:[]}};
})();
