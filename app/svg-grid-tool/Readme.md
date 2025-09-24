# SVG Grid Name Tool

This web tool allows you to generate a grid of name tags from an SVG template.

## Features
- Upload an SVG template (must contain one text field for the name)
- Enter a list of names (one per line)
- Set maximum width/height and number of columns
- Generates a single SVG with all names arranged in a grid
- Download the generated SVG

## Usage
1. Open `index.html` in your browser.
2. Upload your SVG template.
3. Enter names (one per line).
4. Set grid options (width, height, columns).
5. Click "Generate SVG Grid".
6. Download the result.

**Note:**
- The text is not converted to paths in the browser (due to browser limitations). For production, use Inkscape or a similar tool to convert text to paths if needed.
- The tool tries to fit the name into the text field by reducing font size if necessary.

## Limitations
- Only works with SVG templates that have a single text element for the name.
- Text-to-path conversion is not supported in-browser.

---

MIT License
