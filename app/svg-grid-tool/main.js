// main.js
// Handles SVG grid generation and download

let svgTemplateString = '';
let svgTemplateDoc = null;

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
  if (!svgTemplateDoc) {
    alert('Please upload an SVG template.');
    return '';
  }
  // Get template size
  const templateWidth = parseFloat(svgTemplateDoc.getAttribute('width')) || 100;
  const templateHeight = parseFloat(svgTemplateDoc.getAttribute('height')) || 30;
  // Calculate columns to fit maxWidth
  const columns = Math.max(1, Math.floor(maxWidth / templateWidth));
  const rows = Math.ceil(names.length / columns);
  // Calculate scale to fit grid in maxWidth/maxHeight
  const cellWidth = templateWidth;
  const cellHeight = templateHeight;
  const gridWidth = columns * cellWidth;
  const gridHeight = rows * cellHeight;
  const scaleX = maxWidth / gridWidth;
  const scaleY = maxHeight / gridHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  // Create SVG root
  const svgNS = 'http://www.w3.org/2000/svg';
  const outSvg = document.createElementNS(svgNS, 'svg');
  outSvg.setAttribute('width', maxWidth);
  outSvg.setAttribute('height', maxHeight);
  outSvg.setAttribute('viewBox', `0 0 ${maxWidth} ${maxHeight}`);
  // Place each name
  names.forEach((name, i) => {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const g = document.createElementNS(svgNS, 'g');
    const templateClone = cloneSVGElement(svgTemplateDoc);
    // Ensure the clone has correct width/height and viewBox for scaling
    templateClone.setAttribute('width', templateWidth);
    templateClone.setAttribute('height', templateHeight);
    if (!templateClone.getAttribute('viewBox')) {
      templateClone.setAttribute('viewBox', `0 0 ${templateWidth} ${templateHeight}`);
    }
    setTextAndFit(templateClone, name);
    convertTextToPath(templateClone);
    g.appendChild(templateClone);
    // The translation must be by col*cellWidth*scale, row*cellHeight*scale, but since we scale the group, we translate by col*cellWidth, row*cellHeight and then scale
    const tx = col * cellWidth;
    const ty = row * cellHeight;
    g.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
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
