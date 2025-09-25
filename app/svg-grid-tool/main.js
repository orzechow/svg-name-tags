// main.js
// Handles SVG grid generation and download

let svgTemplateString = '';
let svgTemplateDoc = null;
const svgNS = 'http://www.w3.org/2000/svg';

// Handle SVG template upload
const svgInput = document.getElementById('svg-template');
svgInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  svgTemplateString = await file.text();
  const parser = new DOMParser();
  svgTemplateDoc = parser.parseFromString(svgTemplateString, 'image/svg+xml').documentElement;
});

function getNames() {
  return document.getElementById('names').value.split('\n').map(n => n.trim()).filter(Boolean);
}

function cmToPx(cm) {
  // 1cm = 37.7952755906px (SVG standard)
  return cm * 37.7952755906;
}

function cloneSVGElement(el) {
  return el.cloneNode(true);
}

function setTextAndFit(svg, name) {
  // Find the text element (assume only one)
  const textEl = svg.querySelector('text');
  if (!textEl) return;
  textEl.textContent = name;
  // Fit text size to bounding box (simple approach)
  let fontSize = parseFloat(textEl.getAttribute('font-size')) || 20;
  const maxWidth = textEl.getBBox().width || 100;
  const maxHeight = textEl.getBBox().height || 30;
  textEl.setAttribute('font-size', fontSize);
  // Shrink font size until it fits
  while ((textEl.getBBox().width > maxWidth || textEl.getBBox().height > maxHeight) && fontSize > 5) {
    fontSize -= 1;
    textEl.setAttribute('font-size', fontSize);
  }
}

function convertTextToPath(svg) {
  // This requires a library or server-side tool (e.g. Opentype.js, SVGPathConverter, or Inkscape)
  // For now, we leave as text and warn the user
  // TODO: Integrate text-to-path conversion (client-side is complex)
}

function generateGridSVG(names, maxWidth, maxHeight) {
  // --- Normalize template: move all children so bounding box is at (0,0) ---
  // Create a temporary SVG to measure the bounding box
  const tempSvg = document.createElementNS(svgNS, 'svg');
  for (const child of Array.from(svgTemplateDoc.children)) {
    const childClone = child.cloneNode(true);
    tempSvg.appendChild(childClone);
  }
  document.body.appendChild(tempSvg); // Attach to DOM to getBBox
  let bbox = { x: 0, y: 0 };
  try {
    bbox = tempSvg.getBBox();
  } catch (e) {}
  document.body.removeChild(tempSvg);

  // Now, for each clone, wrap children in a <g> and translate by -bbox.x, -bbox.y
  if (!svgTemplateDoc) {
    alert('Please upload an SVG template.');
    return '';
  }
  // Get template size
  const templateWidth = parseFloat(svgTemplateDoc.getAttribute('width')) || 100;
  const templateHeight = parseFloat(svgTemplateDoc.getAttribute('height')) || 30;
  // Get user target width per clone (in px)
  const cloneWidthCm = parseFloat(document.getElementById('clone-width').value) || 3;
  const cloneWidth = cmToPx(cloneWidthCm);
  // Calculate scale for each clone
  const scaleClone = cloneWidth / templateWidth;
  const cellWidth = cloneWidth;
  const cellHeight = templateHeight * scaleClone;
  const columns = Math.max(1, Math.floor(maxWidth / cellWidth));
  const rows = Math.ceil(names.length / columns);
  const gridWidth = columns * cellWidth;
  const gridHeight = rows * cellHeight;
  // (Removed old scaleX/scaleY/scale for grid scaling)
  // Create SVG root
  const outSvg = document.createElementNS(svgNS, 'svg');
  outSvg.setAttribute('width', gridWidth);
  outSvg.setAttribute('height', gridHeight);
  outSvg.setAttribute('viewBox', `0 0 ${gridWidth} ${gridHeight}`);
  outSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Place each name
  // Determine if scaling is needed based on viewBox vs width/height
  // scaleX/scaleY not needed, use scaleClone for uniform scaling
  // Optionally, offset grid to always start at (0,0)
  let offsetX = 0;
  let offsetY = 0;
  // (If you want to center the grid in a larger area, set offsetX/Y here)
  names.forEach((name, i) => {
    const row = Math.floor(i / columns);
    const col = i % columns;
    // Create a group for the normalized template
    const g = document.createElementNS(svgNS, 'g');
    const innerG = document.createElementNS(svgNS, 'g');
    innerG.setAttribute('transform', `translate(${-bbox.x},${-bbox.y})`);
    for (const child of Array.from(svgTemplateDoc.children)) {
      const childClone = child.cloneNode(true);
      innerG.appendChild(childClone);
    }
    g.appendChild(innerG);
    setTextAndFit(g, name);
    convertTextToPath(g);
    // Place at grid position
    const tx = offsetX + col * cellWidth;
    const ty = offsetY + row * cellHeight;
    let transform = `translate(${tx},${ty})`;
    if (scaleClone !== 1) {
      transform += ` scale(${scaleClone})`;
    }
    g.setAttribute('transform', transform);
    outSvg.appendChild(g);
  });
  return outSvg.outerHTML;
}

function showPreview(svgString) {
  const preview = document.getElementById('svg-preview');
  preview.innerHTML = svgString;
}

function downloadSVG(svgString) {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('download-link');
  link.href = url;
  link.style.display = 'inline-block';
}

document.getElementById('generate').addEventListener('click', () => {
  const names = getNames();
  const maxWidth = cmToPx(parseFloat(document.getElementById('max-width').value) || 10);
  const maxHeight = cmToPx(parseFloat(document.getElementById('max-height').value) || 5);
  const svgString = generateGridSVG(names, maxWidth, maxHeight);
  if (svgString) {
    showPreview(svgString);
    downloadSVG(svgString);
  }
});
