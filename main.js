// main.js
// Handles SVG grid generation and download

let svgTemplateString = '';
let svgTemplateDoc = null;
const svgNS = 'http://www.w3.org/2000/svg';

// --- Utility Functions ---
const SVG_PX_PER_CM = 37.7952755906;  // SVG px/cm conversion factor
const MAX_GRID_WIDTH_CM = Infinity;   // Maximum grid width in cm
const MAX_CLONE_WIDTH_CM = Infinity;  // Maximum clone width in cm
let MAX_FONT_SIZE_CM = 2;             // Will be set based on template
const MAX_NAME_WIDTH = 1;             // Maximum fraction of clone width that the name can occupy

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
  if (isNaN(val)) {
    showError(`Invalid value for ${id.replace('-', ' ')}. Using fallback: ${fallback}`);
    return fallback;
  }
  if (val < min) {
    showError(`Value for ${id.replace('-', ' ')} too small. Clamped to ${min}.`);
    return min;
  }
  if (val > max) {
    showError(`Value for ${id.replace('-', ' ')} too large. Clamped to ${max}.`);
    return max;
  }
  return val;
}

// Handle SVG template upload
let templateFileName = 'names-grid.svg';
const svgInput = document.getElementById('svg-template');
svgInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  svgTemplateString = await file.text();
  // Set template file name for download
  if (file.name) {
    const dotIdx = file.name.lastIndexOf('.');
    const baseName = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
    templateFileName = baseName + '-name-tags.svg';
    document.getElementById('download-link').setAttribute('download', templateFileName);
  }
  const parser = new DOMParser();
  svgTemplateDoc = parser.parseFromString(svgTemplateString, 'image/svg+xml').documentElement;

  // Find the text element and set max-font-size field
  const textEl = svgTemplateDoc.querySelector('text');
  if (textEl) {
    // Set max-font-size field to template font size (in cm)
    const fontSizePx = parseFloat(textEl.getAttribute('font-size')) || 20;
    const fontSizeCm = pxToCm(fontSizePx);
    MAX_FONT_SIZE_CM = fontSizeCm * 2;

    document.getElementById('max-font-size').value = fontSizeCm.toFixed(2);
    document.getElementById('max-font-size').max = MAX_FONT_SIZE_CM.toFixed(2);

    // Set max-name-width field to template text width (as fraction of template width)
    document.body.appendChild(svgTemplateDoc);

    let textScale = 0.2;
    try {
      const templateWidth = svgTemplateDoc.getBoundingClientRect().width;
      const textWidth = textEl.getBoundingClientRect().width;
      textScale = textWidth / templateWidth;
    } catch (err) { }

    document.getElementById('max-name-width').value = textScale.toFixed(2);

    document.body.removeChild(svgTemplateDoc);
  }

  updateSVGGrid();
});

/**
 * Show an error message to the user
 * @param {string} message
 */
function showError(message) {
  alert(message);
}

/**
 * Get the list of names from the textarea input
 * @returns {string[]}
 */
function getNames() {
  const names = document.getElementById('names').value.split('\n').map(n => n.trim()).filter(Boolean);
  if (names.length === 0) {
    showError('Please enter at least one name.');
  }
  return names;
}

/**
 * Fit the text element's font size so the name fits within the max width
 * @param {SVGTextElement} textEl
 * @param {string} name
 * @param {number} maxFontSizePx
 * @param {number} maxNameWidthPx
 */
function fitTextToWidth(textEl, name, maxFontSizePx, maxNameWidthPx) {
  textEl.textContent = name;
  let fontSize = maxFontSizePx;
  textEl.style.fontSize = fontSize + 'px';

  // Shrink font size until it fits within max name width
  while (textEl.getBoundingClientRect().width > maxNameWidthPx && fontSize > 1) {
    fontSize *= 0.95;
    textEl.style.fontSize = fontSize + 'px';
  }
}

/**
 * Set the text in the SVG clone and fit its size
 * @param {SVGElement} svg
 * @param {string} name
 */
function setTextAndFit(svg, name) {
  // Find the text element (assume only one)
  const textEl = svg.querySelector('text');
  if (!textEl) {
    showError('No text element found in SVG template.');
    return;
  }
  // Get user max font size and max name width (not exactly in cm, as it does not consider scaling)
  const maxFontSize = validateNumberInput('max-font-size', 0.1, MAX_FONT_SIZE_CM, 10);
  const maxNameWidth = validateNumberInput('max-name-width', 0.1, MAX_NAME_WIDTH, 5);
  const maxFontSizePx = cmToPx(maxFontSize);

  const cloneWidthPx = svg.getBoundingClientRect().width;

  fitTextToWidth(textEl, name, maxFontSizePx, maxNameWidth * cloneWidthPx);
}

/**
 * Get the bounding box of the template's children
 * @param {SVGElement} svgTemplateDoc
 * @returns {DOMRect}
 */
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

/**
 * Create a normalized group for the template, translated so its bounding box starts at (0,0)
 * @param {SVGElement} svgTemplateDoc
 * @param {DOMRect} bbox
 * @returns {SVGGElement}
 */
function createNormalizedTemplateGroup(svgTemplateDoc, bbox) {
  const innerG = document.createElementNS(svgNS, 'g');
  innerG.setAttribute('transform', `translate(${-bbox.x},${-bbox.y})`);
  for (const child of Array.from(svgTemplateDoc.children)) {
    const childClone = child.cloneNode(true);
    innerG.appendChild(childClone);
  }
  return innerG;
}

/**
 * Build the SVG grid in the DOM for preview and download
 * @param {string[]} names
 * @param {number} maxWidth
 * @returns {SVGElement}
 */
function buildLiveSVGGrid(names, maxWidth) {
  if (!svgTemplateDoc) {
    // showError('Please upload an SVG template.');
    return;
  }

  // --- Get template and grid parameters ---
  const bbox = getTemplateBBox(svgTemplateDoc);
  const templateWidth = parseFloat(svgTemplateDoc.getAttribute('width')) || 100;
  const templateHeight = parseFloat(svgTemplateDoc.getAttribute('height')) || 30;
  const cloneWidthCm = validateNumberInput('clone-width', 0.1, MAX_CLONE_WIDTH_CM, 3);
  const cloneWidth = cmToPx(cloneWidthCm);
  const scaleClone = cloneWidth / templateWidth;
  const cellWidth = cloneWidth;
  const cellHeight = templateHeight * scaleClone;
  const columns = Math.max(1, Math.floor(maxWidth / cellWidth));
  const rows = Math.ceil(names.length / columns);
  const gridWidth = columns * cellWidth;
  const gridHeight = rows * cellHeight;

  // --- Create SVG root ---
  const preview = document.getElementById('svg-preview');
  preview.innerHTML = '';
  const outSvg = document.createElementNS(svgNS, 'svg');
  outSvg.setAttribute('width', gridWidth);
  outSvg.setAttribute('height', gridHeight);
  outSvg.setAttribute('viewBox', `0 0 ${gridWidth} ${gridHeight}`);
  outSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  preview.appendChild(outSvg);

  // --- Place each name in the grid ---
  let offsetX = 0;
  let offsetY = 0;
  names.forEach((name, i) => {
    const row = Math.floor(i / columns);
    const col = i % columns;

    // Create and position group for this clone
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

/**
 * Show the SVG grid preview
 * @param {string[]} names
 * @param {number} maxWidth
 */
function showPreview(names, maxWidth) {
  buildLiveSVGGrid(names, maxWidth);
}

/**
 * Download the generated SVG grid as a file
 */
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
  link.setAttribute('download', templateFileName);
  link.style.display = 'inline-block';
}

// Auto-update setup
function setupAutoUpdate() {
  const inputIds = [
    'names', 'max-grid-width', 'clone-width', 'max-font-size', 'max-name-width'
  ];
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', updateSVGGrid);
  });
}

function updateSVGGrid() {
  const names = getNames();
  const maxWidth = cmToPx(validateNumberInput('max-grid-width', 0.1, MAX_GRID_WIDTH_CM, 10));
  showPreview(names, maxWidth);
  downloadSVG();
}

// Initialize auto-update on page load
window.addEventListener('DOMContentLoaded', setupAutoUpdate);
