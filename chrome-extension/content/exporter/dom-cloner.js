(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.domCloner?.version === 3) return;

  function cloneNode(source, adapter) {
    const clone = source.cloneNode(true);
    AICE.imageHandler.copyCanvas(source, clone);
    const mathCount = AICE.mathPreserver.preserve(source, clone);
    AICE.contentCleaner.clean(clone, adapter);
    return { clone, mathCount };
  }

  function cloneSelection(adapter) {
    const selection = getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) throw new Error("내보낼 영역을 먼저 마우스로 선택해 주세요.");
    const range = selection.getRangeAt(0).cloneRange();
    // A drag beginning inside rendered KaTeX must retain its source wrapper.
    const formulas = AICE.mathPreserver.findMath(document.body);
    const startFormula = formulas.find(node => node.contains(range.startContainer));
    const endFormula = formulas.find(node => node.contains(range.endContainer));
    if (startFormula) range.setStartBefore(startFormula);
    if (endFormula) range.setEndAfter(endFormula);
    const fragment = range.cloneContents();
    const wrapper = document.createElement("div");
    wrapper.append(fragment);
    const selectedMath = formulas.filter(node => range.intersectsNode(node));
    const clonedMath = AICE.mathPreserver.findMath(wrapper);
    selectedMath.forEach((source, index) => {
      if (clonedMath[index]) AICE.mathPreserver.preserveNode(source, clonedMath[index]);
    });
    AICE.contentCleaner.clean(wrapper, adapter);
    return { clone: wrapper, mathCount: AICE.mathPreserver.findMath(wrapper).length };
  }

  AICE.domCloner = { cloneNode, cloneSelection, version: 3 };
})();
