import { StyleSheet } from '@react-pdf/renderer'

// ── Shared color palette ──
export const COLORS = {
  black: '#000000',
  darkGray: '#333333',
  mediumGray: '#666666',
  lightGray: '#999999',
  ruleGray: '#CCCCCC',
  bgGray: '#F5F5F5',
  white: '#FFFFFF',
} as const

// ── Shared page dimensions ──
export const PAGE = {
  width: 612,   // 8.5" at 72dpi
  height: 792,  // 11" at 72dpi
  marginTop: 54,
  marginBottom: 54,
  marginHorizontal: 54,
  columnGap: 18,
} as const

// ── Common styles shared across all pages ──
export const styles = StyleSheet.create({
  // ── Page layouts ──
  page: {
    paddingTop: PAGE.marginTop,
    paddingBottom: PAGE.marginBottom,
    paddingHorizontal: PAGE.marginHorizontal,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },

  coverPage: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORS.black,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Page number ──
  pageNumber: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: COLORS.lightGray,
  },

  // ── Two-column layout ──
  twoColumn: {
    flexDirection: 'row',
    gap: PAGE.columnGap,
  },
  column: {
    flex: 1,
  },

  // ── Typography ──
  title: {
    fontFamily: 'Times-Roman',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: COLORS.black,
  },
  subtitle: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  sectionHeader: {
    fontFamily: 'Times-Roman',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
    color: COLORS.black,
  },
  subsectionHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 4,
    marginTop: 8,
    color: COLORS.black,
  },
  roomHeader: {
    fontFamily: 'Times-Roman',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    color: COLORS.black,
  },
  bodyText: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  bodyTextBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.darkGray,
  },
  italicText: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.mediumGray,
    marginBottom: 4,
  },
  smallText: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    lineHeight: 1.4,
    color: COLORS.mediumGray,
  },

  // ── Horizontal rule ──
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ruleGray,
    marginBottom: 6,
    marginTop: 2,
  },
  ruleThick: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.black,
    marginBottom: 8,
    marginTop: 2,
  },

  // ── Callout box (read-aloud text) ──
  calloutBox: {
    backgroundColor: COLORS.bgGray,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.darkGray,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  calloutText: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.darkGray,
  },

  // ── Bullet items ──
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 4,
  },
  bulletMarker: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    width: 12,
    color: COLORS.darkGray,
  },
  bulletText: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.darkGray,
    flex: 1,
  },

  // ── Table styles ──
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.black,
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ruleGray,
    paddingVertical: 2,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ruleGray,
    paddingVertical: 2,
    backgroundColor: COLORS.bgGray,
  },
  tableCellSmall: {
    width: 40,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: COLORS.darkGray,
  },
  tableCellMedium: {
    width: 80,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: COLORS.darkGray,
  },
  tableCellFlex: {
    flex: 1,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: COLORS.darkGray,
  },
  tableCellHeaderSmall: {
    width: 40,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: COLORS.black,
  },
  tableCellHeaderMedium: {
    width: 80,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: COLORS.black,
  },
  tableCellHeaderFlex: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: COLORS.black,
  },

  // ── Stat block ──
  statBlockName: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 1,
  },
  statBlockDescription: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 8,
    color: COLORS.mediumGray,
    marginBottom: 3,
  },
  statLine: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    lineHeight: 1.4,
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  statLineBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: COLORS.darkGray,
  },
  statBlockRule: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
    marginBottom: 4,
  },
  statBlockAbility: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    lineHeight: 1.4,
    color: COLORS.darkGray,
    marginBottom: 2,
    paddingLeft: 8,
  },

  // ── Map image ──
  mapImage: {
    width: '100%',
    objectFit: 'contain',
    marginBottom: 12,
  },
})
