// 띠운세 마스코트 토끼 (직접 그린 단순 SVG). 프로필 사진·표지에서 같이 쓴다.
// pose: "face" = 얼굴만(프로필), "list" = 체크리스트를 든 상반신(표지)
window.bunny = function (pose = "face", ink = "#1f1b18") {
  const fill = "#fffaf0";
  if (pose === "face") {
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><g fill="${fill}" stroke="${ink}" stroke-width="9" stroke-linejoin="round">
<path d="M70 92 C55 60 52 18 72 12 C92 6 96 50 92 86 Z"/><path d="M108 86 C114 52 128 14 148 20 C166 26 150 66 130 94 Z"/>
<ellipse cx="100" cy="128" rx="62" ry="54"/></g>
<g fill="${ink}"><circle cx="78" cy="122" r="6"/><circle cx="122" cy="122" r="6"/></g>
<path d="M88 140 q6 8 12 0 q6 8 12 0" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>
<g fill="#f6a5a5" opacity=".75"><ellipse cx="64" cy="142" rx="10" ry="6"/><ellipse cx="136" cy="142" rx="10" ry="6"/></g></svg>`;
  }
  return `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
<g fill="${fill}" stroke="${ink}" stroke-width="7" stroke-linejoin="round">
<path d="M58 96 C40 60 38 14 60 8 C82 2 86 50 80 90 Z"/><path d="M96 88 C104 50 122 10 142 18 C160 26 140 70 118 98 Z"/>
<path d="M20 220 C20 170 40 150 60 146 L140 146 C160 150 175 175 178 220 Z"/>
<ellipse cx="88" cy="128" rx="58" ry="48"/></g>
<g fill="${ink}"><circle cx="68" cy="122" r="5"/><circle cx="106" cy="122" r="5"/></g>
<path d="M80 138 q5 6 9 0 q5 6 9 0" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
<g transform="rotate(-10 150 175)"><rect x="118" y="132" width="66" height="86" rx="8" fill="#5b8def" stroke="${ink}" stroke-width="7"/>
<g stroke="${ink}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M130 152 l5 5 l9 -10"/><path d="M152 154 h20"/><rect x="130" y="170" width="11" height="11" rx="2"/><path d="M152 176 h20"/><rect x="130" y="192" width="11" height="11" rx="2"/><path d="M152 198 h16"/></g></g>
<ellipse cx="128" cy="190" rx="16" ry="13" fill="${fill}" stroke="${ink}" stroke-width="7"/>
<g stroke="#5b8def" stroke-width="6" stroke-linecap="round"><path d="M170 110 l6 -14"/><path d="M186 120 l12 -8"/><path d="M158 106 l-1 -14"/></g></svg>`;
};
