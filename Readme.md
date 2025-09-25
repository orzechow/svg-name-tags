# SVG Grid Name Tool

This web tool allows you to generate a grid of name tags from an SVG template.
We use this for creating name tags for laser cutting for events like the _["Türen auf mit der Maus" @ FabLab Karlsruhe](https://fablab-karlsruhe.de/2025/08/22/tueren-auf-mit-der-maus-am-3-oktober-im-fablab-karlsruhe/)_.

![Screenshot of the SVG Grid Name Tool](screenshot.jpg)

## Usage
1. Clone this repository
2. Open `index.html` in your browser.
3. Upload an SVG template (must contain one text field for the name)
4. Enter a list of names (one per line)
5. Set maximum page width and width per name tag
6. Tune font size and name width to fit short and long names
7. Generates a single SVG with all names arranged in a grid
8. Download the generated SVG
9. For laser cutting etc., use Inkscape or a similar tool to convert text to paths

## Limitations
- Only works with SVG templates that have a single text element for the name.
- Text-to-path conversion is not supported in-browser.

---

MIT License
