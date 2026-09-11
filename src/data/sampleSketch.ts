import { Layer, DrawingPlane, Stroke, Point3D } from '../types';

export const INITIAL_PLANES: DrawingPlane[] = [
  {
    id: 'plane-facade',
    name: 'XOZ Front Facade',
    nameFa: 'صفحه XOZ (از روبرو)',
    origin: { x: 0, y: 2.8, z: 0 },
    normal: { x: 0, y: 0, z: 1 },
    up: { x: 0, y: 1, z: 0 },
    width: 4.5,
    height: 5.5,
    color: '#38BDF8',
    surfaceType: 'xoz',
  },
  {
    id: 'plane-ground',
    name: 'XOY Ground / Floor',
    nameFa: 'صفحه XOY (کف/پلان)',
    origin: { x: 0.5, y: 0, z: 1.5 },
    normal: { x: 0, y: 1, z: 0 },
    up: { x: 0, y: 0, z: -1 },
    width: 6,
    height: 6,
    color: '#34D399',
    surfaceType: 'xoy',
  },
  {
    id: 'plane-side-yoz',
    name: 'YOZ Profile / Section (YZ)',
    nameFa: 'صفحه YOZ (برش و نمای جانبی)',
    origin: { x: 2.2, y: 2.5, z: 1.5 },
    normal: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    width: 5.0,
    height: 5.0,
    color: '#FB923C',
    surfaceType: 'yoz',
  },
  {
    id: 'plane-awning',
    name: 'Canopy / Awning',
    nameFa: 'سایبان شیشه‌ای',
    origin: { x: 0.1, y: 2.5, z: 0.9 },
    normal: { x: 0, y: 0.95, z: -0.3 }, // tilted slightly downwards
    up: { x: 0, y: 0.3, z: 0.95 },
    width: 2.6,
    height: 2.0,
    color: '#F59E0B',
    surfaceType: 'custom',
  },
  {
    id: 'plane-cafe',
    name: 'Side Cafe & Terrace',
    nameFa: 'کافه و فضای باز',
    origin: { x: 2.2, y: 0, z: 2.0 },
    normal: { x: 0, y: 1, z: 0 },
    up: { x: 0, y: 0, z: -1 },
    width: 3.5,
    height: 3.5,
    color: '#8B5CF6',
    surfaceType: 'xoy',
  },
];

export const INITIAL_LAYERS: Layer[] = [
  {
    id: 'layer-ground',
    name: 'Ground & Steps',
    nameFa: 'کف و پله‌ها',
    visible: true,
    locked: false,
    opacity: 1.0,
    colorTag: '#64748B',
  },
  {
    id: 'layer-facade',
    name: 'Building Facade',
    nameFa: 'نمای ساختمان',
    visible: true,
    locked: false,
    opacity: 1.0,
    colorTag: '#818CF8',
  },
  {
    id: 'layer-awning',
    name: 'Glass Canopy',
    nameFa: 'سایبان شیشه‌ای',
    visible: true,
    locked: false,
    opacity: 0.9,
    colorTag: '#38BDF8',
  },
  {
    id: 'layer-cafe',
    name: 'Cafe Furniture',
    nameFa: 'مبلمان کافه و چتر',
    visible: true,
    locked: false,
    opacity: 0.95,
    colorTag: '#F59E0B',
  },
  {
    id: 'layer-details',
    name: 'Fine Details',
    nameFa: 'جزئیات تکمیلی',
    visible: true,
    locked: false,
    opacity: 0.85,
    colorTag: '#C084FC',
  },
];

function createPolyline(
  points: Point3D[],
  layerId: string,
  planeId: string,
  color: string = '#F8FAFC',
  size: number = 3,
  opacity: number = 0.95,
  tool: 'pen' | 'pencil' | 'marker' = 'pen'
): Stroke {
  return {
    id: `stroke-${Math.random().toString(36).substr(2, 9)}`,
    layerId,
    planeId,
    points,
    color,
    size,
    opacity,
    tool,
    createdAt: Date.now(),
  };
}

// Generate the authentic architectural sketch matching the user's uploaded image
export function generateDemoStrokes(): Stroke[] {
  const strokes: Stroke[] = [];
  const inkColor = '#F8FAFC'; // luminous architectural white sketch ink
  const faintInk = '#94A3B8'; // crisp subtle slate
  const glassColor = '#60A5FA'; // radiant sky blue glass

  // ================= 1. GROUND & STEPS (Y = 0 to 0.4) =================
  // Rounded terrace steps leading up to facade entry
  const stepShapes = [
    { radiusX: 1.6, radiusZ: 2.6, y: 0.04, pointsCount: 28, centerZ: 1.2 },
    { radiusX: 1.35, radiusZ: 2.2, y: 0.14, pointsCount: 26, centerZ: 1.0 },
    { radiusX: 1.1, radiusZ: 1.8, y: 0.24, pointsCount: 24, centerZ: 0.8 },
  ];

  stepShapes.forEach((s) => {
    const stepPts: Point3D[] = [];
    for (let i = 0; i <= s.pointsCount; i++) {
      const angle = Math.PI * (i / s.pointsCount); // semicircle towards viewer
      const x = Math.cos(angle) * s.radiusX + 0.1;
      const z = Math.sin(angle) * s.radiusZ + s.centerZ;
      // add natural hand-drawn jitter
      const jitter = (Math.sin(i * 1.7) * 0.015);
      stepPts.push({ x: x + jitter, y: s.y, z: z });
    }
    strokes.push(createPolyline(stepPts, 'layer-ground', 'plane-ground', inkColor, 3.5));

    // Vertical riser line on steps corner
    strokes.push(
      createPolyline(
        [
          { x: s.radiusX + 0.1, y: 0, z: s.centerZ },
          { x: s.radiusX + 0.1, y: s.y, z: s.centerZ },
        ],
        'layer-ground',
        'plane-ground',
        faintInk,
        2
      )
    );
  });

  // Sidewalk street contour lines
  strokes.push(
    createPolyline(
      [
        { x: -1.8, y: 0, z: 3.6 },
        { x: 0.2, y: 0, z: 3.5 },
        { x: 2.2, y: 0, z: 3.7 },
        { x: 3.8, y: 0, z: 3.9 },
      ],
      'layer-ground',
      'plane-ground',
      faintInk,
      2.5
    )
  );
  strokes.push(
    createPolyline(
      [
        { x: -1.9, y: -0.05, z: 3.8 },
        { x: 0.2, y: -0.05, z: 3.7 },
        { x: 2.3, y: -0.05, z: 3.9 },
        { x: 4.0, y: -0.05, z: 4.1 },
      ],
      'layer-ground',
      'plane-ground',
      '#64748b',
      2
    )
  );

  // ================= 2. MAIN STOREFRONT FACADE (Z = 0) =================
  // Main building outer frame (tall slender European / Parisian facade)
  const facadeLeft = -0.95;
  const facadeRight = 1.15;
  const facadeBottom = 0.28;
  const facadeTop = 5.2;

  // Outer vertical columns
  strokes.push(
    createPolyline(
      [
        { x: facadeLeft, y: facadeBottom, z: 0 },
        { x: facadeLeft, y: facadeTop, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      3.5
    )
  );
  strokes.push(
    createPolyline(
      [
        { x: facadeRight, y: facadeBottom, z: 0 },
        { x: facadeRight, y: facadeTop, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      3.5
    )
  );

  // Roof cornice & parapet molding
  strokes.push(
    createPolyline(
      [
        { x: facadeLeft - 0.15, y: facadeTop, z: 0 },
        { x: facadeRight + 0.15, y: facadeTop, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      4
    )
  );
  strokes.push(
    createPolyline(
      [
        { x: facadeLeft - 0.1, y: facadeTop - 0.15, z: 0 },
        { x: facadeRight + 0.1, y: facadeTop - 0.15, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      2.5
    )
  );

  // Ground floor arched entrance
  const archCenter = 0.1;
  const archRadius = 0.65;
  const archHeight = 2.0;
  // Left post
  strokes.push(
    createPolyline(
      [
        { x: archCenter - archRadius, y: facadeBottom, z: 0 },
        { x: archCenter - archRadius, y: archHeight, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      3
    )
  );
  // Right post
  strokes.push(
    createPolyline(
      [
        { x: archCenter + archRadius, y: facadeBottom, z: 0 },
        { x: archCenter + archRadius, y: archHeight, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      3
    )
  );
  // Arch curve
  const archPts: Point3D[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (i / 20);
    const x = archCenter + Math.cos(Math.PI - a) * archRadius;
    const y = archHeight + Math.sin(a) * archRadius;
    archPts.push({ x, y, z: 0 });
  }
  strokes.push(createPolyline(archPts, 'layer-facade', 'plane-facade', inkColor, 3.2));

  // Inner door divisions & sunburst mullions
  strokes.push(
    createPolyline(
      [
        { x: archCenter, y: facadeBottom, z: 0 },
        { x: archCenter, y: archHeight, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      faintInk,
      2
    )
  );
  for (let angle = 0.3; angle < Math.PI; angle += 0.5) {
    strokes.push(
      createPolyline(
        [
          { x: archCenter, y: archHeight, z: 0 },
          {
            x: archCenter + Math.cos(angle) * archRadius,
            y: archHeight + Math.sin(angle) * archRadius,
            z: 0,
          },
        ],
        'layer-facade',
        'plane-facade',
        faintInk,
        1.8
      )
    );
  }

  // Intermediate floor cornice (above entrance)
  strokes.push(
    createPolyline(
      [
        { x: facadeLeft - 0.05, y: 2.85, z: 0 },
        { x: facadeRight + 0.05, y: 2.85, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      3
    )
  );

  // Upper Floor: Balcony & French Windows
  // Balcony slab
  strokes.push(
    createPolyline(
      [
        { x: -0.65, y: 2.95, z: 0 },
        { x: -0.65, y: 2.95, z: 0.35 },
        { x: 0.85, y: 2.95, z: 0.35 },
        { x: 0.85, y: 2.95, z: 0 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      3
    )
  );
  // Balcony railing
  strokes.push(
    createPolyline(
      [
        { x: -0.65, y: 3.45, z: 0.35 },
        { x: 0.85, y: 3.45, z: 0.35 },
      ],
      'layer-facade',
      'plane-facade',
      inkColor,
      2.5
    )
  );
  // Railing pickets
  for (let rx = -0.6; rx <= 0.8; rx += 0.15) {
    strokes.push(
      createPolyline(
        [
          { x: rx, y: 2.95, z: 0.35 },
          { x: rx, y: 3.45, z: 0.35 },
        ],
        'layer-facade',
        'plane-facade',
        faintInk,
        1.8
      )
    );
  }

  // Upper French Windows (Left and Right)
  const windowCoords = [
    { xMin: -0.55, xMax: -0.1, yMin: 3.2, yMax: 4.6 },
    { xMin: 0.3, xMax: 0.75, yMin: 3.2, yMax: 4.6 },
  ];

  windowCoords.forEach((w) => {
    // Window outer rectangle
    strokes.push(
      createPolyline(
        [
          { x: w.xMin, y: w.yMin, z: 0 },
          { x: w.xMin, y: w.yMax, z: 0 },
          { x: w.xMax, y: w.yMax, z: 0 },
          { x: w.xMax, y: w.yMin, z: 0 },
          { x: w.xMin, y: w.yMin, z: 0 },
        ],
        'layer-facade',
        'plane-facade',
        inkColor,
        2.5
      )
    );
    // Vertical mullion
    const midX = (w.xMin + w.xMax) / 2;
    strokes.push(
      createPolyline(
        [
          { x: midX, y: w.yMin, z: 0 },
          { x: midX, y: w.yMax, z: 0 },
        ],
        'layer-facade',
        'plane-facade',
        faintInk,
        1.8
      )
    );
    // Horizontal panes
    [3.6, 4.1].forEach((py) => {
      strokes.push(
        createPolyline(
          [
            { x: w.xMin, y: py, z: 0 },
            { x: w.xMax, y: py, z: 0 },
          ],
          'layer-facade',
          'plane-facade',
          faintInk,
          1.8
        )
      );
    });
  });

  // ================= 3. AWNING / CANOPY (Projecting in 3D Space!) =================
  // In the photo, the canopy juts out directly from the wall into 3D space!
  const canopyStartY = 2.45;
  const canopyEndY = 2.15;
  const canopyDepth = 1.45;
  const canopyLeft = -0.7;
  const canopyRight = 0.9;

  // Front outer rim of awning
  strokes.push(
    createPolyline(
      [
        { x: canopyLeft, y: canopyEndY, z: canopyDepth },
        { x: canopyRight, y: canopyEndY, z: canopyDepth },
      ],
      'layer-awning',
      'plane-awning',
      inkColor,
      3.5
    )
  );
  // Left outer edge
  strokes.push(
    createPolyline(
      [
        { x: canopyLeft, y: canopyStartY, z: 0 },
        { x: canopyLeft, y: canopyEndY, z: canopyDepth },
      ],
      'layer-awning',
      'plane-awning',
      inkColor,
      3.2
    )
  );
  // Right outer edge
  strokes.push(
    createPolyline(
      [
        { x: canopyRight, y: canopyStartY, z: 0 },
        { x: canopyRight, y: canopyEndY, z: canopyDepth },
      ],
      'layer-awning',
      'plane-awning',
      inkColor,
      3.2
    )
  );

  // Ribs / Mullions along the glass canopy
  const numRibs = 5;
  for (let i = 1; i < numRibs; i++) {
    const rx = canopyLeft + (canopyRight - canopyLeft) * (i / numRibs);
    strokes.push(
      createPolyline(
        [
          { x: rx, y: canopyStartY, z: 0 },
          { x: rx, y: canopyEndY, z: canopyDepth },
        ],
        'layer-awning',
        'plane-awning',
        faintInk,
        2.2
      )
    );
  }

  // Cross ribs
  [0.45, 0.95].forEach((d) => {
    const factor = d / canopyDepth;
    const yAtD = canopyStartY + (canopyEndY - canopyStartY) * factor;
    strokes.push(
      createPolyline(
        [
          { x: canopyLeft, y: yAtD, z: d },
          { x: canopyRight, y: yAtD, z: d },
        ],
        'layer-awning',
        'plane-awning',
        glassColor,
        1.8,
        0.8,
        'marker'
      )
    );
  });

  // Structural diagonal tie rods / steel brackets anchoring to facade
  strokes.push(
    createPolyline(
      [
        { x: canopyLeft, y: 2.9, z: 0 },
        { x: canopyLeft, y: canopyEndY, z: canopyDepth },
      ],
      'layer-awning',
      'plane-awning',
      inkColor,
      2.5
    )
  );
  strokes.push(
    createPolyline(
      [
        { x: canopyRight, y: 2.9, z: 0 },
        { x: canopyRight, y: canopyEndY, z: canopyDepth },
      ],
      'layer-awning',
      'plane-awning',
      inkColor,
      2.5
    )
  );

  // ================= 4. SIDEWALK CAFE & PARASOL (To the right in 3D) =================
  const cafeX = 2.1;
  const cafeZ = 1.9;

  // Parasol / Umbrella (Tilted in 3D)
  const poleBase: Point3D = { x: cafeX + 0.3, y: 0, z: cafeZ };
  const poleApex: Point3D = { x: cafeX + 0.3, y: 2.6, z: cafeZ - 0.1 };

  // Central pole
  strokes.push(
    createPolyline([poleBase, poleApex], 'layer-cafe', 'plane-cafe', inkColor, 3.2)
  );

  // Umbrella canopy rim & spokes
  const umbrellaRadius = 0.95;
  const rimY = 2.05;
  const numSpokes = 8;
  const rimPts: Point3D[] = [];

  for (let i = 0; i <= numSpokes; i++) {
    const theta = (i / numSpokes) * Math.PI * 2;
    const px = poleApex.x + Math.cos(theta) * umbrellaRadius;
    const pz = poleApex.z + Math.sin(theta) * umbrellaRadius * 0.9;
    const py = rimY + Math.sin(theta * 2) * 0.05;
    rimPts.push({ x: px, y: py, z: pz });

    // Spoke from apex to rim
    if (i < numSpokes) {
      strokes.push(
        createPolyline(
          [poleApex, { x: px, y: py, z: pz }],
          'layer-cafe',
          'plane-cafe',
          inkColor,
          2.2
        )
      );
    }
  }
  strokes.push(createPolyline(rimPts, 'layer-cafe', 'plane-cafe', inkColor, 3));

  // Cafe Round Table
  const tableX = cafeX - 0.1;
  const tableZ = cafeZ + 0.2;
  const tableHeight = 0.75;
  const tableRadius = 0.38;

  // Table top ellipse
  const tableTopPts: Point3D[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    tableTopPts.push({
      x: tableX + Math.cos(a) * tableRadius,
      y: tableHeight,
      z: tableZ + Math.sin(a) * tableRadius * 0.7,
    });
  }
  strokes.push(createPolyline(tableTopPts, 'layer-cafe', 'plane-cafe', inkColor, 2.5));

  // Table leg and tripod base
  strokes.push(
    createPolyline(
      [
        { x: tableX, y: tableHeight, z: tableZ },
        { x: tableX, y: 0, z: tableZ },
      ],
      'layer-cafe',
      'plane-cafe',
      inkColor,
      2.5
    )
  );
  // Tripod base feet
  strokes.push(
    createPolyline(
      [
        { x: tableX - 0.25, y: 0, z: tableZ - 0.15 },
        { x: tableX, y: 0.1, z: tableZ },
        { x: tableX + 0.25, y: 0, z: tableZ + 0.15 },
      ],
      'layer-cafe',
      'plane-cafe',
      faintInk,
      2
    )
  );

  // Bistro Chairs (Left and Right of table)
  const chairPositions = [
    { cx: tableX - 0.55, cz: tableZ, faceAngle: 0 },
    { cx: tableX + 0.55, cz: tableZ + 0.1, faceAngle: Math.PI },
  ];

  chairPositions.forEach((c) => {
    // Seat ring
    const seatPts: Point3D[] = [];
    const seatY = 0.45;
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      seatPts.push({
        x: c.cx + Math.cos(a) * 0.2,
        y: seatY,
        z: c.cz + Math.sin(a) * 0.18,
      });
    }
    strokes.push(createPolyline(seatPts, 'layer-cafe', 'plane-cafe', inkColor, 2));

    // Curved backrest
    const backPts: Point3D[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      backPts.push({
        x: c.cx - 0.18 + Math.cos(a) * 0.05,
        y: seatY + Math.sin(a) * 0.4,
        z: c.cz - 0.15 + (i / 8) * 0.3,
      });
    }
    strokes.push(createPolyline(backPts, 'layer-cafe', 'plane-cafe', inkColor, 2));

    // 4 slender legs
    [
      { dx: -0.15, dz: -0.12 },
      { dx: 0.15, dz: -0.12 },
      { dx: -0.15, dz: 0.12 },
      { dx: 0.15, dz: 0.12 },
    ].forEach((leg) => {
      strokes.push(
        createPolyline(
          [
            { x: c.cx + leg.dx, y: seatY, z: c.cz + leg.dz },
            { x: c.cx + leg.dx * 1.3, y: 0, z: c.cz + leg.dz * 1.3 },
          ],
          'layer-cafe',
          'plane-cafe',
          faintInk,
          1.8
        )
      );
    });
  });

  // ================= 5. HATCHING & ARTISTIC DETAILS =================
  // Window reflections and glass hatching
  for (let i = 0; i < 4; i++) {
    strokes.push(
      createPolyline(
        [
          { x: -0.5 + i * 0.08, y: 3.4 + i * 0.1, z: 0 },
          { x: -0.3 + i * 0.08, y: 3.8 + i * 0.1, z: 0 },
        ],
        'layer-details',
        'plane-facade',
        '#60a5fa',
        1.5,
        0.7,
        'pencil'
      )
    );
  }

  return strokes;
}
