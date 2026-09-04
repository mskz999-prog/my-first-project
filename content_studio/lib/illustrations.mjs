// 手描きスケッチ風のディテールイラストをSVG文字列として生成するヘルパー群。
// 実物写真が用意できるまでの「AIイラスト路線」の代わりとして、シンプルな線画で代用する。
// 将来、実物写真に差し替える場合はテンプレート側の <img> に置き換えるだけで済むようにしてある。

const INK = "#1a1a1a";
const PAPER = "#fffdf6";

function wrap(inner, viewBox = "0 0 160 120") {
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// ヒールパッチ（かかとのロゴパッチ）
export function heelPatch({ label, sub = "", fill = PAPER }) {
  const subLine = sub
    ? `<text x="80" y="82" text-anchor="middle" font-size="13" fill="${INK}" font-family="IPAGothic, sans-serif">${sub}</text>`
    : "";
  return wrap(`
    <rect x="12" y="16" width="136" height="88" rx="18" fill="${fill}" stroke="${INK}" stroke-width="5"/>
    <text x="80" y="60" text-anchor="middle" font-size="19" font-weight="700" fill="${INK}" font-family="IPAGothic, sans-serif">${label}</text>
    ${subLine}
  `);
}

// サイドタグ（アッパー側面の織りタグ／ピスネーム）
export function sideTag({ label, color = INK, mark = "" }) {
  return wrap(`
    <rect x="16" y="26" width="128" height="60" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
    <rect x="24" y="34" width="112" height="44" rx="3" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.5"/>
    <text x="80" y="63" text-anchor="middle" font-size="20" font-weight="700" fill="${color}" font-family="IPAGothic, sans-serif">${label}<tspan font-size="12" dy="-8">${mark}</tspan></text>
  `, "0 0 160 100");
}

// ソール（スリットソール／ワッフルソール）
export function sole({ type }) {
  const outline = `<path d="M20 60 Q20 20 80 18 Q140 20 140 60 Q140 100 80 102 Q20 100 20 60 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`;
  let pattern = "";
  if (type === "slit") {
    pattern = Array.from({ length: 5 })
      .map((_, i) => `<line x1="34" y1="${34 + i * 12}" x2="126" y2="${34 + i * 12}" stroke="#3f5f8a" stroke-width="3" stroke-linecap="round"/>`)
      .join("");
  } else {
    const cells = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        cells.push(`<rect x="${32 + col * 14}" y="${30 + row * 14}" width="10" height="10" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.6"/>`);
      }
    }
    pattern = cells.join("");
  }
  return wrap(outline + pattern, "0 0 160 120");
}

// インソール（中敷き）
export function insole({ label = "", soft = false }) {
  const texture = soft
    ? Array.from({ length: 10 })
        .map(() => {
          const cx = 30 + Math.random() * 100;
          const cy = 25 + Math.random() * 70;
          return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2" fill="${INK}" opacity="0.25"/>`;
        })
        .join("")
    : `<path d="M35 35 Q80 25 125 35" stroke="${INK}" stroke-width="1.5" fill="none" opacity="0.3"/>`;
  const text = label
    ? `<text x="80" y="65" text-anchor="middle" font-size="14" font-weight="700" fill="${INK}" font-family="IPAGothic, sans-serif">${label}</text>`
    : "";
  return wrap(`
    <path d="M22 55 Q18 15 80 12 Q142 15 138 55 Q142 105 80 108 Q18 105 22 55 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>
    ${texture}
    ${text}
  `, "0 0 160 120");
}
