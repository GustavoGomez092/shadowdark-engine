/**
 * Style - Visual configuration for dungeon rendering
 *
 * Controls the complete visual appearance including colors, stroke widths,
 * fonts, and rendering modes (B&W, grid style, etc.)
 */

const PALETTES = {
  default: {
    name: 'Default',
    ink: '#222022',
    paper: '#F8F8F4',
    floor: '#F8F8F4',   // Original: floor === paper (H.floor = H.paper = 16316660)
    water: '#CCCECE',
    shading: '#CCCECE'
  },
  ancient: {
    name: 'Ancient',
    ink: '#4A3728',
    paper: '#F5E6C8',
    floor: '#E8D9B5',
    water: '#8B7355',
    shading: '#D4C4A0'
  },
  light: {
    name: 'Light',
    ink: '#666666',
    paper: '#FFFFFF',
    floor: '#F0F0F0',
    water: '#A0B8CC',
    shading: '#D8D8D8'
  },
  modern: {
    name: 'Modern',
    ink: '#1A1A2E',
    paper: '#E8E8E8',
    floor: '#D8D8D8',
    water: '#6688AA',
    shading: '#B0B0B8'
  },
  link: {
    name: 'Link',
    ink: '#2C5F2C',
    paper: '#F0EBD8',
    floor: '#E0D9C0',
    water: '#4488AA',
    shading: '#B8C0A8'
  }
};

// Grid display modes
const GRID_MODES = {
  HIDDEN: 'hidden',
  DOTTED: 'dotted',
  DASHED: 'dashed',
  SOLID: 'solid',
  BROKEN: 'broken'
};

// Note display modes
const NOTE_MODES = {
  NORMAL: 'normal',
  NUMBERS: 'numbers',
  SYMBOLS: 'symbols',
  HIDDEN: 'hidden'
};

/**
 * Style class - manages all visual configuration
 */
class Style {
  constructor() {
    // Colors (hex strings) — matches original Watabou default palette
    // Original values from Dungeon-built.js: H.ink=0x222022, H.paper=H.floor=0xF8F8F4
    this.ink = '#222022';
    this.paper = '#F8F8F4';
    this.floor = '#F8F8F4';
    this.water = '#CCCECE';
    this.shading = '#CCCECE';

    // Stroke widths (in pixels at 30px/cell scale)
    this.thick = 3;       // Wall thickness
    this.normal = 1.5;    // Default strokes
    this.stroke = 1;      // Hatching lines
    this.thin = 0.5;      // Grid lines

    // Shadow
    this.shadowDist = 0.2; // Shadow offset in grid units
    this.shadowColor = '#CCCCCC'; // H.shadowColor = 0xCCCCCC

    // Rendering flags
    this.bw = false;           // Black & white mode
    this.gridMode = GRID_MODES.DOTTED;
    this.gridScale = 1;        // 1 = normal, 2 = half-grid
    this.noteMode = NOTE_MODES.NORMAL;
    this.showWater = true;
    this.showProps = true;
    this.showSecrets = false;
    this.showShadows = true;
    this.showGrid = true;
    this.showNotes = true;
    this.showLegend = true;
    this.showConnectors = true;  // Show connector lines between note boxes and rooms
    this.rotation = 0;         // Dungeon rotation angle (radians)
    this.autoRotate = true;

    // Cell size in pixels
    this.cellSize = 30;

    // Fonts
    this.fontTitle = { family: 'Germania One, serif', size: 48, italic: false, bold: false };
    this.fontStory = { family: 'Pathway Gothic One, sans-serif', size: 24, italic: true, bold: false };
    this.fontNotes = { family: 'Pathway Gothic One, sans-serif', size: 20, italic: false, bold: false };
    this.fontLegend = { family: 'Pathway Gothic One, sans-serif', size: 24, italic: false, bold: false };
    this.fontSymbols = { family: 'Pathway Gothic One, sans-serif', size: 30, italic: false, bold: true };
  }

  /**
   * Apply a named palette
   * @param {string} name - Palette name
   */
  setPalette(name) {
    const pal = PALETTES[name] || PALETTES.default;
    this.ink = pal.ink;
    this.paper = pal.paper;
    this.floor = pal.floor;
    this.water = pal.water;
    this.shading = pal.shading;
  }

  /**
   * Get effective ink color (respects B&W mode)
   * @returns {string} Hex color
   */
  getInk() {
    return this.bw ? '#000000' : this.ink;
  }

  /**
   * Get effective paper color
   * @returns {string} Hex color
   */
  getPaper() {
    return this.bw ? '#FFFFFF' : this.paper;
  }

  /**
   * Get effective floor color
   * @returns {string} Hex color
   */
  getFloor() {
    return this.bw ? '#FFFFFF' : this.floor;
  }

  /**
   * Get effective water color
   * @returns {string} Hex color
   */
  getWater() {
    return this.bw ? '#DDDDDD' : this.water;
  }

  /**
   * Get effective shading color
   * @returns {string} Hex color
   */
  getShading() {
    return this.bw ? '#CCCCCC' : this.shading;
  }

  /**
   * Get wall line width
   * @returns {number} Width in pixels
   */
  getWallWidth() {
    return this.thick;
  }

  /**
   * Cycle grid mode to next option
   */
  cycleGrid() {
    const modes = Object.values(GRID_MODES);
    const idx = modes.indexOf(this.gridMode);
    this.gridMode = modes[(idx + 1) % modes.length];
  }

  /**
   * Cycle note display mode
   */
  cycleNotes() {
    const modes = Object.values(NOTE_MODES);
    const idx = modes.indexOf(this.noteMode);
    this.noteMode = modes[(idx + 1) % modes.length];
  }

  /**
   * Get font CSS string for canvas context
   * @param {Object} fontDef - Font definition object
   * @returns {string} CSS font string
   */
  getFontCSS(fontDef) {
    let css = '';
    if (fontDef.italic) css += 'italic ';
    if (fontDef.bold) css += 'bold ';
    css += `${fontDef.size}px ${fontDef.family}`;
    return css;
  }

  /**
   * Save style configuration to localStorage
   */
  save() {
    try {
      localStorage.setItem('dungeon_style', JSON.stringify({
        ink: this.ink,
        paper: this.paper,
        floor: this.floor,
        water: this.water,
        shading: this.shading,
        bw: this.bw,
        gridMode: this.gridMode,
        gridScale: this.gridScale,
        showWater: this.showWater,
        showProps: this.showProps,
        showSecrets: this.showSecrets,
        showShadows: this.showShadows,
        showGrid: this.showGrid,
        showNotes: this.showNotes,
        noteMode: this.noteMode,
        showConnectors: this.showConnectors,
        autoRotate: this.autoRotate,
        rotation: this.rotation
      }));
    } catch(e) {
      // Silently fail if localStorage not available
    }
  }

  /**
   * Restore style configuration from localStorage
   */
  restore() {
    try {
      const data = JSON.parse(localStorage.getItem('dungeon_style'));
      if (data) {
        Object.assign(this, data);
      }
    } catch(e) {
      // Silently fail if localStorage not available
    }
  }

  /**
   * Get all available palette names
   * @returns {string[]} Array of palette names
   */
  getPaletteNames() {
    return Object.keys(PALETTES);
  }

  /**
   * Get palette details by name
   * @param {string} name - Palette name
   * @returns {Object} Palette definition
   */
  getPalette(name) {
    return PALETTES[name] || PALETTES.default;
  }

  /**
   * Reset to default values
   */
  reset() {
    this.ink = '#222022';
    this.paper = '#F8F8F4';
    this.floor = '#F8F8F4';
    this.water = '#CCCECE';
    this.shading = '#CCCECE';
    this.bw = false;
    this.gridMode = GRID_MODES.DOTTED;
    this.gridScale = 1;
    this.noteMode = NOTE_MODES.NORMAL;
    this.showWater = true;
    this.showProps = true;
    this.showSecrets = false;
    this.showShadows = true;
    this.showGrid = true;
    this.showNotes = true;
    this.showLegend = true;
    this.showConnectors = true;
    this.rotation = 0;
    this.autoRotate = true;
  }
}

// Singleton instance
const style = new Style();

export { Style, style, PALETTES, GRID_MODES, NOTE_MODES };
export default style;
