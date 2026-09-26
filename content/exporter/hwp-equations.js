(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  const symbols = {
    "α":"alpha", "β":"beta", "γ":"gamma", "δ":"delta", "ε":"epsilon", "θ":"theta",
    "λ":"lambda", "μ":"mu", "π":"pi", "ρ":"rho", "σ":"sigma", "τ":"tau", "φ":"phi",
    "ψ":"psi", "ω":"omega", "Γ":"GAMMA", "Δ":"DELTA", "Θ":"THETA", "Σ":"SIGMA", "Ω":"OMEGA",
    "∫":"int", "∬":"dint", "∭":"tint", "∮":"oint", "∑":"sum", "∏":"prod", "∞":"inf",
    "∂":"partial", "∇":"nabla", "×":"times", "÷":"div", "·":"cdot", "±":"+-", "∓":"-+",
    "≤":"<=", "≥":">=", "≠":"!=", "≈":"approx", "≡":"equiv", "→":"rarrow", "←":"larrow",
    "∈":"in", "∉":"notin", "∪":"union", "∩":"inter", "−":"-", "′":"'", "∝":"propto", "⋯":"cdots", "…":"ldots",
    "⁡":"", "⁢":"", "⁣":"", "⁤":"", " ":"~"
  };
  Object.assign(symbols, { "≫": ">>", "≪": "<<", "∼": "SIM", "⇒": "RARROW", "⇐": "LARROW", "⇔": "LRARROW", "↔": "lrarrow" });
  const group = value => `{${value}}`;
  function token(value) {
    return [...value].map(char => {
      if (Object.hasOwn(symbols, char)) return ` ${symbols[char]} `;
      if (/^[a-zA-Z0-9\s+\-=.,:;!()\[\]|/'<>]$/.test(char)) return char;
      if (char === "{") return " LEFT { ";
      if (char === "}") return " RIGHT } ";
      throw new Error(`지원하지 않는 수식 문자: ${char}`);
    }).join("").trim();
  }
  function fromMathML(node) {
    const children = [...node.children];
    const at = index => { if (!children[index]) throw new Error("불완전한 MathML 수식"); return fromMathML(children[index]); };
    const tag = node.localName.toLowerCase();
    switch (tag) {
      case "math": case "mrow": case "mstyle": case "mpadded":
        return children.map(fromMathML).join(" ");
      case "semantics": return at(0);
      case "mi": return node.getAttribute("mathvariant") === "normal" && /^[a-zA-Z]+$/.test(node.textContent) ? `{rm ${token(node.textContent)}}` : token(node.textContent);
      case "mn": return token(node.textContent);
      case "mo": {
        const value = node.textContent;
        if (node.getAttribute("fence") === "true" && "([{".includes(value)) return `LEFT ${value}`;
        if (node.getAttribute("fence") === "true" && ")]}".includes(value)) return `RIGHT ${value}`;
        return token(value);
      }
      case "mtext": case "ms": return !node.textContent.trim() ? "~" : `{rm "${node.textContent.replace(/"/g, "'")}"}`;
      case "menclose":
        if (node.getAttribute("notation") !== "box") throw new Error("지원하지 않는 수식 테두리/취소선");
        return children.map(fromMathML).join(" "); // Decorative border omission is reported by convert().
      case "mspace": return "~";
      case "mphantom": return "";
      case "mfrac":
        if (node.getAttribute("linethickness") === "0px" || node.getAttribute("linethickness") === "0") return `${group(at(0))} atop ${group(at(1))}`;
        return `${group(at(0))} over ${group(at(1))}`;
      case "msup": return `${group(at(0))}^${group(at(1))}`;
      case "msub": return `${group(at(0))}_${group(at(1))}`;
      case "msubsup": return `${group(at(0))}_${group(at(1))}^${group(at(2))}`;
      case "msqrt": return `sqrt ${group(children.map(fromMathML).join(" "))}`;
      case "mroot": return `root ${group(at(1))} of ${group(at(0))}`;
      case "munder": return `${group(at(0))}_${group(at(1))}`;
      case "munderover": return `${group(at(0))}_${group(at(1))}^${group(at(2))}`;
      case "mover": {
        const accent = { "→":"vec", "⃗":"vec", "¯":"bar", "‾":"bar", "^":"hat", "ˆ":"hat", "~":"tilde", "˜":"tilde", ".":"dot", "˙":"dot", "¨":"ddot" }[children[1]?.textContent];
        return accent ? `${accent} ${group(at(0))}` : `${group(at(0))}^${group(at(1))}`;
      }
      case "mfenced": return `LEFT ${node.getAttribute("open") || "("} ${children.map(fromMathML).join(" , ")} RIGHT ${node.getAttribute("close") || ")"}`;
      case "mtable": return `matrix {${children.map(row => [...row.children].map(fromMathML).join(" & ")).join(" # ")}}`;
      case "mtd": return children.map(fromMathML).join(" ");
      default: throw new Error(`지원하지 않는 MathML 요소: ${tag}`);
    }
  }
  const commands = new Set(("alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega GAMMA DELTA THETA LAMBDA XI PI SIGMA UPSILON PHI PSI OMEGA sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh log ln exp lim min max det gcd int oint sum prod partial nabla inf times cdot div approx equiv in notin union inter").split(" "));
  const aliases = { Gamma:"GAMMA", Delta:"DELTA", Theta:"THETA", Lambda:"LAMBDA", Xi:"XI", Pi:"PI", Sigma:"SIGMA", Upsilon:"UPSILON", Phi:"PHI", Psi:"PSI", Omega:"OMEGA", infty:"inf", le:"<=", leq:"<=", ge:">=", geq:">=", ne:"!=", neq:"!=", pm:"+-", mp:"-+", to:"rarrow", rightarrow:"rarrow", leftarrow:"larrow", iint:"dint", iiint:"tint", cup:"union", cap:"inter", ldots:"cdots", dots:"cdots", lvert:"|", rvert:"|" };
  function fromLatex(input) {
    const source = input.trim().replace(/^\$\$?|\$\$?$/g, "").replace(/^\\\[|\\\]$/g, "").replace(/^\\\(|\\\)$/g, "");
    let pos = 0;
    const skip = () => { while (/\s/.test(source[pos] || "\0")) pos++; };
    function rawGroup() {
      skip(); if (source[pos++] !== "{") throw new Error("LaTeX 중괄호가 필요합니다.");
      const start = pos; let depth = 1;
      while (pos < source.length && depth) { const c = source[pos++]; if (c === "{") depth++; if (c === "}") depth--; }
      if (depth) throw new Error("닫히지 않은 LaTeX 중괄호");
      return source.slice(start, pos - 1);
    }
    function argument() { skip(); return source[pos] === "{" ? fromLatex(rawGroup()) : atom(); }
    function atom() {
      skip(); if (pos >= source.length) throw new Error("수식 인수가 누락되었습니다.");
      const c = source[pos++];
      if (c === "{") { pos--; return group(fromLatex(rawGroup())); }
      if (c === "}") throw new Error("예상하지 못한 닫는 중괄호");
      if (c === "^" || c === "_") return c + group(argument());
      if (c !== "\\") return token(c);
      const match = /^[a-zA-Z]+/.exec(source.slice(pos));
      if (!match) {
        const escaped = source[pos++];
        if ([",", ";", ":", " "].includes(escaped)) return "~";
        if (escaped === "!") return "";
        if (escaped === "{" || escaped === "}") return escaped;
        if (escaped === "|") return "||";
        throw new Error(`지원하지 않는 LaTeX 명령: \\${escaped}`);
      }
      const cmd = match[0]; pos += cmd.length;
      if (["rm", "it", "bold"].includes(cmd)) return cmd;
      if (["propto", "cdots", "ldots"].includes(cmd)) return cmd;
      if (cmd === "boxed") return group(argument());
      if (["frac", "dfrac", "tfrac"].includes(cmd)) return `${group(argument())} over ${group(argument())}`;
      if (cmd === "sqrt") {
        skip();
        if (source[pos] === "[") {
          const end = source.indexOf("]", ++pos); if (end < 0) throw new Error("근 지수가 닫히지 않았습니다.");
          const degree = fromLatex(source.slice(pos, end)); pos = end + 1;
          return `root ${group(degree)} of ${group(argument())}`;
        }
        return `sqrt ${group(argument())}`;
      }
      if (["text", "textrm", "operatorname"].includes(cmd)) return `rm "${rawGroup().replace(/"/g, "'")}"`;
      if (["mathrm", "mathbf", "mathit"].includes(cmd)) return `${{mathrm:"rm",mathbf:"bold",mathit:"it"}[cmd]} ${group(argument())}`;
      if (["vec", "hat", "bar", "dot", "ddot", "tilde", "overline", "underline"].includes(cmd)) return `${{overline:"bar",underline:"under"}[cmd] || cmd} ${group(argument())}`;
      if (cmd === "left" || cmd === "right") return cmd.toUpperCase();
      const relations = { sim: "SIM", implies: "RARROW", Rightarrow: "RARROW", Longrightarrow: "RARROW", impliedby: "LARROW", Leftarrow: "LARROW", iff: "LRARROW", Leftrightarrow: "LRARROW", Longleftrightarrow: "LRARROW", leftrightarrow: "lrarrow" };
      if (Object.hasOwn(relations, cmd)) return relations[cmd];
      if (cmd === "gg" || cmd === "ll") return cmd === "gg" ? ">>" : "<<";
      if (["quad", "qquad"].includes(cmd)) return cmd === "quad" ? "~~" : "~~~~";
      if (["displaystyle", "textstyle", "limits", "nolimits"].includes(cmd)) return "";
      if (Object.hasOwn(aliases, cmd)) return aliases[cmd];
      if (commands.has(cmd)) return cmd;
      throw new Error(`지원하지 않는 LaTeX 명령: \\${cmd}`);
    }
    const result = []; while (pos < source.length) { skip(); if (pos < source.length) result.push(atom()); }
    return result.join(" ").replace(/\s+/g, " ").trim();
  }
  function convert(node, preference = 'auto') {
    const math = node.matches("math") ? node : node.querySelector("math");
    let mathError;
    const boxWarning = "수식의 강조 테두리는 생략됩니다. 수식 내용은 편집 가능한 개체로 보존됩니다.";
    if (math && preference !== 'latex') { try { return { script: fromMathML(math), sourceType: "mathml", warnings: math.querySelector('menclose[notation="box"]') ? [boxWarning] : [] }; } catch (error) { mathError = error; } }
    const latex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent ||
      ["data-math", "data-latex", "data-tex"].map(attribute =>
        node.getAttribute(attribute) || node.querySelector(`[${attribute}]`)?.getAttribute(attribute)
      ).find(value => value?.trim());
    if (latex) {
      try { return { script: fromLatex(latex), sourceType: "latex", warnings: latex.includes("\\boxed") ? [boxWarning] : [] }; }
      catch (error) { if (!math || preference !== 'latex') throw error; }
    }
    if (math && preference === 'latex') return { script: fromMathML(math), sourceType: 'mathml', warnings: math.querySelector('menclose[notation="box"]') ? [boxWarning] : [] };
    throw mathError || new Error("이 수식의 원문을 읽지 못했습니다. 수식 전체를 선택하거나 답변을 새로고침해 주세요.");
  }
  AICE.hwpEquations = { fromMathML, fromLatex, convert };
})();
