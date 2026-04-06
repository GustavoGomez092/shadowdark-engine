/**
 * Formats.js - Export functionality for multiple file formats
 *
 * This module provides export capabilities for dungeons in PNG, SVG, JSON,
 * and Markdown formats. Each export function handles the conversion and
 * file download process.
 *
 * @module export/Formats
 */

import style from './Style.js';

/**
 * Formats class providing static methods for dungeon export.
 * All export methods trigger a browser file download.
 */
class Formats {
  /**
   * Export dungeon as PNG image.
   *
   * Renders the dungeon to an offscreen canvas at the specified scale factor,
   * then triggers a PNG file download through the browser. The image includes
   * all rooms, doors, corridors, and annotations.
   *
   * @param {Object} dungeon - The dungeon model containing rooms and doors
   * @param {Object} renderer - Renderer instance with renderToContext method
   * @param {number} [scale=1] - Scale factor for output resolution (e.g., 2 for 2x size)
   * @param {string} [filename] - Optional custom filename (defaults to dungeon name + .png)
   */
  static exportPNG(dungeon, renderer, scale = 1, filename = null) {
    const rect = dungeon.getRect();
    const cellSize = style.cellSize;
    const padding = 2;
    const width = (rect.w + padding * 2) * cellSize * scale;
    const height = (rect.h + padding * 2) * cellSize * scale;

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Apply scaling
    ctx.scale(scale, scale);

    // Render dungeon to offscreen context
    renderer.renderToContext(ctx, dungeon, width / scale, height / scale);

    // Export as PNG blob
    offscreen.toBlob(
      (blob) => {
        if (!blob) {
          throw new Error('Failed to create PNG blob');
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `${dungeon.name || 'dungeon'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      'image/png'
    );
  }

  /**
   * Export dungeon as SVG vector graphic.
   *
   * Converts the dungeon layout to SVG elements, preserving all geometric
   * information. The SVG includes room shapes, door positions, and text labels.
   * This format is ideal for printing and scaling to any size without quality loss.
   *
   * @param {Object} dungeon - The dungeon model containing rooms and doors
   * @param {Object} renderer - Renderer instance (optional, used for additional context)
   * @param {string} [filename] - Optional custom filename (defaults to dungeon name + .svg)
   */
  static exportSVG(dungeon, renderer = null, filename = null) {
    const rect = dungeon.getRect();
    const cellSize = style.cellSize;
    const padding = 2;
    const width = (rect.w + padding * 2) * cellSize;
    const height = (rect.h + padding * 2) * cellSize;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Germania+One&family=Pathway+Gothic+One');
  text { font-family: 'Pathway Gothic One', serif; }
</style>
</defs>
<rect width="100%" height="100%" fill="${Formats._svgColor(style.getPaper())}"/>
`;

    // Build SVG content layers
    svg += Formats._roomsToSVG(dungeon, rect, cellSize, padding);
    svg += Formats._doorsToSVG(dungeon, rect, cellSize, padding);
    svg += Formats._notesToSVG(dungeon, rect, cellSize, padding);
    svg += '\n</svg>';

    // Create and download SVG blob
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${dungeon.name || 'dungeon'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert room geometries to SVG group element.
   * Handles both rectangular and circular rooms.
   *
   * @private
   * @param {Object} dungeon - The dungeon model
   * @param {Object} rect - Bounding rectangle {x, y, w, h}
   * @param {number} cellSize - Size of each grid cell in pixels
   * @param {number} padding - Padding around dungeon border
   * @returns {string} SVG group string containing all rooms
   */
  static _roomsToSVG(dungeon, rect, cellSize, padding) {
    let svg = '\n<g id="rooms">';

    for (const room of dungeon.rooms) {
      const x = (room.x - rect.x + padding) * cellSize;
      const y = (room.y - rect.y + padding) * cellSize;
      const w = room.w * cellSize;
      const h = room.h * cellSize;

      if (room.round) {
        // Circular room
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = w / 2;
        svg += `\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${Formats._svgColor(style.getFloor())}" stroke="${Formats._svgColor(style.getInk())}" stroke-width="${style.thick}"/>`;
      } else {
        // Rectangular room
        svg += `\n  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${Formats._svgColor(style.getFloor())}" stroke="${Formats._svgColor(style.getInk())}" stroke-width="${style.thick}"/>`;
      }

      // Add columns if present
      if (room.columns) {
        svg += Formats._columnsToSVG(room, x, y, w, h, cellSize);
      }
    }

    svg += '\n</g>';
    return svg;
  }

  /**
   * Convert column placement to SVG elements.
   *
   * @private
   * @param {Object} room - Room object with columns
   * @param {number} x - Room x position in SVG coordinates
   * @param {number} y - Room y position in SVG coordinates
   * @param {number} w - Room width in pixels
   * @param {number} h - Room height in pixels
   * @param {number} cellSize - Size of each grid cell
   * @returns {string} SVG elements for columns
   */
  static _columnsToSVG(room, x, y, w, h, cellSize) {
    let svg = '';
    const colRadius = cellSize * 0.15;
    const cols = room.columns;

    // Simple grid layout for columns
    const colCount = Math.ceil(Math.sqrt(cols));
    const spacing = Math.min(w, h) / (colCount + 1);

    for (let i = 0; i < cols; i++) {
      const cx = x + spacing * (i % colCount + 1);
      const cy = y + spacing * (Math.floor(i / colCount) + 1);
      svg += `\n  <circle cx="${cx}" cy="${cy}" r="${colRadius}" fill="${Formats._svgColor(style.getInk())}" stroke="${Formats._svgColor(style.getInk())}"/>`;
    }

    return svg;
  }

  /**
   * Convert door positions to SVG group element.
   * Different visual styles for different door types.
   *
   * @private
   * @param {Object} dungeon - The dungeon model
   * @param {Object} rect - Bounding rectangle {x, y, w, h}
   * @param {number} cellSize - Size of each grid cell in pixels
   * @param {number} padding - Padding around dungeon border
   * @returns {string} SVG group string containing all doors
   */
  static _doorsToSVG(dungeon, rect, cellSize, padding) {
    let svg = '\n<g id="doors">';

    for (const door of dungeon.doors) {
      const x = (door.x - rect.x + padding) * cellSize;
      const y = (door.y - rect.y + padding) * cellSize;
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      const iconSize = cellSize * 0.3;

      // Door type indicators
      if (door.type === 0) {
        // Regular door - simple gap
        svg += `\n  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${Formats._svgColor(style.getFloor())}" stroke="none"/>`;
      } else if (door.type === 1) {
        // Archway - decorative arc
        svg += `\n  <path d="M ${x} ${y + cellSize} Q ${cx} ${y} ${x + cellSize} ${y + cellSize}" fill="none" stroke="${Formats._svgColor(style.getInk())}" stroke-width="${style.thin}"/>`;
      } else if (door.type === 2) {
        // Secret door - hidden marker
        svg += `\n  <circle cx="${cx}" cy="${cy}" r="${iconSize / 2}" fill="none" stroke="${Formats._svgColor(style.getInk())}" stroke-width="${style.thin}" stroke-dasharray="2,2"/>`;
      } else if (door.type === 3) {
        // Entrance - bold marker
        svg += `\n  <rect x="${x + cellSize * 0.2}" y="${y + cellSize * 0.2}" width="${cellSize * 0.6}" height="${cellSize * 0.6}" fill="${Formats._svgColor(style.getInk())}"/>`;
      } else if (door.type === 4) {
        // Locked - cross marker
        svg += `\n  <line x1="${x + cellSize * 0.3}" y1="${y + cellSize * 0.3}" x2="${x + cellSize * 0.7}" y2="${y + cellSize * 0.7}" stroke="${Formats._svgColor(style.getInk())}" stroke-width="${style.thin}"/>`;
        svg += `\n  <line x1="${x + cellSize * 0.7}" y1="${y + cellSize * 0.3}" x2="${x + cellSize * 0.3}" y2="${y + cellSize * 0.7}" stroke="${Formats._svgColor(style.getInk())}" stroke-width="${style.thin}"/>`;
      }
    }

    svg += '\n</g>';
    return svg;
  }

  /**
   * Convert room annotations to SVG text elements.
   *
   * @private
   * @param {Object} dungeon - The dungeon model
   * @param {Object} rect - Bounding rectangle {x, y, w, h}
   * @param {number} cellSize - Size of each grid cell in pixels
   * @param {number} padding - Padding around dungeon border
   * @returns {string} SVG group string containing all text annotations
   */
  static _notesToSVG(dungeon, rect, cellSize, padding) {
    let svg = '\n<g id="annotations">';

    for (const room of dungeon.rooms) {
      if (!room.note) continue;

      const x = (room.note.point.x - rect.x + padding) * cellSize;
      const y = (room.note.point.y - rect.y + padding) * cellSize;
      const fontSize = style.fontNotes.size || 14;

      svg += `\n  <text x="${x}" y="${y}" fill="${Formats._svgColor(style.getInk())}" font-size="${fontSize}" font-family="${style.fontNotes.family}" text-anchor="middle" dominant-baseline="central">${Formats._escapeXml(room.note.symb)}</text>`;
    }

    svg += '\n</g>';
    return svg;
  }

  /**
   * Export dungeon as JSON data.
   *
   * Creates a JSON representation of the entire dungeon including all rooms,
   * doors, annotations, and metadata. This format can be re-imported to
   * recreate the exact same dungeon.
   *
   * @param {Object} dungeon - The dungeon model
   * @param {string} [filename] - Optional custom filename (defaults to dungeon name + .json)
   */
  static exportJSON(dungeon, filename = null) {
    const data = {
      name: dungeon.name,
      seed: dungeon.seed,
      story: dungeon.story || '',
      tags: dungeon.tags || [],
      rooms: dungeon.rooms.map((room) => ({
        x: room.x,
        y: room.y,
        w: room.w,
        h: room.h,
        round: room.round,
        columns: room.columns,
        note: room.note
          ? {
              symb: room.note.symb,
              text: room.note.text,
              point: room.note.point,
            }
          : null,
      })),
      doors: dungeon.doors.map((door) => ({
        x: door.x,
        y: door.y,
        type: door.type,
      })),
      createdAt: new Date().toISOString(),
      version: '1.2.7',
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${dungeon.name || 'dungeon'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export dungeon as Markdown document.
   *
   * Creates a human-readable Markdown file with dungeon name, story,
   * room descriptions, and metadata. Suitable for RPG campaign notes
   * or sharing with game masters.
   *
   * @param {Object} dungeon - The dungeon model
   * @param {Object} [planner] - Optional planner object with additional context
   * @param {string} [filename] - Optional custom filename (defaults to dungeon name + .md)
   */
  static exportMarkdown(dungeon, planner = null, filename = null) {
    let md = `# ${Formats._escapeMarkdown(dungeon.name || 'Untitled Dungeon')}\n\n`;

    // Story section
    if (dungeon.story) {
      md += `> ${Formats._escapeMarkdown(dungeon.story)}\n\n`;
    }

    // Metadata section
    md += `**Seed:** \`${dungeon.seed}\`\n\n`;

    if (dungeon.tags && dungeon.tags.length > 0) {
      md += `**Tags:** ${dungeon.tags.join(', ')}\n\n`;
    }

    // Rooms section
    md += `## Rooms\n\n`;

    let roomCount = 0;
    for (const room of dungeon.rooms) {
      if (!room.note) continue;

      roomCount++;
      md += `### ${room.note.symb}. ${Formats._escapeMarkdown(room.note.text)}\n\n`;

      // Room dimensions
      md += `**Dimensions:** ${room.w}×${room.h} cells`;
      if (room.round) md += ' (circular)';
      md += '\n\n';

      // Features
      const features = [];
      if (room.columns) {
        features.push(`${room.columns} columns`);
      }

      if (features.length > 0) {
        md += `**Features:** ${features.join(', ')}\n\n`;
      }

      // Doors
      const doors = room.getDoors ? room.getDoors() : [];
      if (doors.length > 0) {
        const doorTypes = doors
          .map((d) => Formats._doorTypeName(d.type))
          .filter((v, i, a) => a.indexOf(v) === i);

        md += `**Connections:** ${doors.length} door${doors.length !== 1 ? 's' : ''}`;

        if (doorTypes.length > 0) {
          md += ` (${doorTypes.join(', ')})`;
        }
        md += '\n\n';
      }
    }

    if (roomCount === 0) {
      md += '*No rooms with descriptions.*\n\n';
    }

    // Footer
    md += `---\n\n`;
    md += `*Generated with One Page Dungeon Generator v1.2.7*\n\n`;
    md += `*Created: ${new Date().toISOString().split('T')[0]}*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${dungeon.name || 'dungeon'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert a color string to SVG-compatible format.
   * Handles hex, rgb, and named colors.
   *
   * @private
   * @param {string} color - Color value (hex, rgb, or named)
   * @returns {string} SVG-compatible color string
   */
  static _svgColor(color) {
    // If it's already a valid SVG color, return as-is
    if (typeof color === 'string') {
      return color;
    }
    // Fallback to black
    return '#000000';
  }

  /**
   * Escape special XML characters in text.
   *
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text safe for XML
   */
  static _escapeXml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape special Markdown characters in text.
   *
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text safe for Markdown
   */
  static _escapeMarkdown(text) {
    if (!text) return '';
    return String(text).replace(/[*_`[\]()#]/g, '\\$&');
  }

  /**
   * Get human-readable name for door type.
   *
   * @private
   * @param {number} type - Door type index
   * @returns {string} Door type name
   */
  static _doorTypeName(type) {
    const names = [
      'regular',
      'archway',
      'secret',
      'entrance',
      'locked',
      'boss gate',
      'secret entrance',
      'barred',
      'stairs down',
      'stairs up',
    ];
    return names[type] || 'unknown';
  }
}

export default Formats;
