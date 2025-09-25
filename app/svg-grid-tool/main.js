// main.js
// Handles SVG grid generation and download

let svgTemplateString = '';
let svgTemplateDoc = null;
const svgNS = 'http://www.w3.org/2000/svg';

// --- Utility Functions ---
// SVG px/cm conversion factor
const SVG_PX_PER_CM = 37.7952755906;

/**
 * Convert centimeters to pixels (SVG standard)
 * @param {number} cm
 * @returns {number}
 */
function cmToPx(cm) {
  return cm * SVG_PX_PER_CM;
}

/**
 * Convert pixels to centimeters (SVG standard)
 * @param {number} px
 * @returns {number}
 */
function pxToCm(px) {
  return px / SVG_PX_PER_CM;
}

/**
 * Validate a numeric input field and return a safe value
 * @param {string} id - Input field id
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} fallback - Fallback value if invalid
 * @returns {number}
 */
function validateNumberInput(id, min, max, fallback) {
  const val = parseFloat(document.getElementById(id).value);
  if (isNaN(val) || val < min || val > max) {
    showError(`Invalid value for ${id.replace('-', ' ')}. Using fallback: ${fallback}`);
    return fallback;
  }
  return val;
}

// Handle SVG template upload
const svgInput = document.getElementById('svg-template');
svgInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  svgTemplateString = await file.text();
  const parser = new DOMParser();
  svgTemplateDoc = parser.parseFromString(svgTemplateString, 'image/svg+xml').documentElement;
  // Find the text element and set max-name-width and max-font-size fields
  const textEl = svgTemplateDoc.querySelector('text');
  if (textEl) {
    // Set max-font-size field to template font size (in cm)
    const fontSizePx = parseFloat(textEl.getAttribute('font-size')) || 20;
    const fontSizeCm = pxToCm(fontSizePx);
    document.getElementById('max-font-size').value = fontSizeCm.toFixed(2);
    document.getElementById('max-font-size').max = (fontSizeCm * 2).toFixed(2);

    // Create a temp SVG to measure text width
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempText = textEl.cloneNode(true);
    tempSvg.appendChild(tempText);
    document.body.appendChild(tempSvg);
    let textWidth = 100;
    try {
      textWidth = tempText.getBBox().width;
    } catch (err) { }
    document.body.removeChild(tempSvg);
    // Convert px to cm for the field
    const textWidthCm = pxToCm(textWidth);
    document.getElementById('max-name-width').value = textWidthCm.toFixed(2);
    document.getElementById('max-name-width').max = (textWidthCm * 2).toFixed(2);
  }
});

function showError(message) {
  alert(message);
}

function getNames() {
  const names = document.getElementById('names').value.split('\n').map(n => n.trim()).filter(Boolean);
  if (names.length === 0) {
    showError('Please enter at least one name.');
  }
  return names;
}

function fitTextToWidth(textEl, name, maxFontSizePx, maxNameWidthPx) {
  textEl.textContent = name;
  let fontSize = maxFontSizePx;
  textEl.style.fontSize = fontSize + 'px';
  // Shrink font size until it fits within max name width
  while (textEl.getBBox().width > maxNameWidthPx && fontSize > 1) {
    fontSize -= 0.2;
    textEl.style.fontSize = fontSize + 'px';
  }
}

function setTextAndFit(svg, name) {
  // Find the text element (assume only one)
  const textEl = svg.querySelector('text');
  if (!textEl) {
    showError('No text element found in SVG template.');
    return;
  }
  // Get user max font size and max name width (in cm)
  const maxFontSizeCm = validateNumberInput('max-font-size', 0.1, 100, 1);
  const maxNameWidthCm = validateNumberInput('max-name-width', 0.1, 100, 3);
  const maxFontSizePx = cmToPx(maxFontSizeCm);
  const maxNameWidthPx = cmToPx(maxNameWidthCm);
  fitTextToWidth(textEl, name, maxFontSizePx, maxNameWidthPx);
}

function getTemplateBBox(svgTemplateDoc) {
  const tempSvg = document.createElementNS(svgNS, 'svg');
  for (const child of Array.from(svgTemplateDoc.children)) {
    const childClone = child.cloneNode(true);
    tempSvg.appendChild(childClone);
  }
  document.body.appendChild(tempSvg);
  let bbox = { x: 0, y: 0 };
  try {
    bbox = tempSvg.getBBox();
  } catch (e) {}
  document.body.removeChild(tempSvg);
  return bbox;
}

function createNormalizedTemplateGroup(svgTemplateDoc, bbox) {
  const innerG = document.createElementNS(svgNS, 'g');
  innerG.setAttribute('transform', `translate(${-bbox.x},${-bbox.y})`);
  for (const child of Array.from(svgTemplateDoc.children)) {
    const childClone = child.cloneNode(true);
    innerG.appendChild(childClone);
  }
  return innerG;
}

function buildLiveSVGGrid(names, maxWidth, maxHeight) {
  if (!svgTemplateDoc) {
    showError('Please upload an SVG template.');
    return;
  }

  // Normalize template: move all children so bounding box is at (0,0)
  const bbox = getTemplateBBox(svgTemplateDoc);

  // Get template size
  const templateWidth = parseFloat(svgTemplateDoc.getAttribute('width')) || 100;
  const templateHeight = parseFloat(svgTemplateDoc.getAttribute('height')) || 30;
  const cloneWidthCm = validateNumberInput('clone-width', 0.1, 100, 3);
  const cloneWidth = cmToPx(cloneWidthCm);
  const scaleClone = cloneWidth / templateWidth;
  const cellWidth = cloneWidth;
  const cellHeight = templateHeight * scaleClone;
  const columns = Math.max(1, Math.floor(maxWidth / cellWidth));
  const rows = Math.ceil(names.length / columns);
  const gridWidth = columns * cellWidth;
  const gridHeight = rows * cellHeight;

  // Create SVG root in preview
  const preview = document.getElementById('svg-preview');
  preview.innerHTML = '';
  const outSvg = document.createElementNS(svgNS, 'svg');
  outSvg.setAttribute('width', gridWidth);
  outSvg.setAttribute('height', gridHeight);
  outSvg.setAttribute('viewBox', `0 0 ${gridWidth} ${gridHeight}`);
  outSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  preview.appendChild(outSvg);

  let offsetX = 0;
  let offsetY = 0;
  names.forEach((name, i) => {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const g = document.createElementNS(svgNS, 'g');
    const innerG = createNormalizedTemplateGroup(svgTemplateDoc, bbox);
    g.appendChild(innerG);
    const tx = offsetX + col * cellWidth;
    const ty = offsetY + row * cellHeight;
    let transform = `translate(${tx},${ty})`;
    if (scaleClone !== 1) {
      transform += ` scale(${scaleClone})`;
    }
    g.setAttribute('transform', transform);
    outSvg.appendChild(g);

    setTextAndFit(g, name);
  });
  return outSvg;
}

function showPreview(names, maxWidth, maxHeight) {
  buildLiveSVGGrid(names, maxWidth, maxHeight);
}

function downloadSVG() {
  const preview = document.getElementById('svg-preview');
  const svgEl = preview.querySelector('svg');
  if (!svgEl) return;
  // Serialize SVG DOM to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('download-link');
  link.href = url;
  link.style.display = 'inline-block';
}

document.getElementById('generate').addEventListener('click', () => {
  const names = getNames();
  const maxWidth = cmToPx(validateNumberInput('max-width', 0.1, 100, 10));
  const maxHeight = cmToPx(validateNumberInput('max-height', 0.1, 100, 5));
  showPreview(names, maxWidth, maxHeight);
  downloadSVG();
});
