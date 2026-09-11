import * as THREE from 'three';
import { MaterialPresetId, BoxMaterial } from '../types';

export interface MaterialPresetDefinition {
  id: MaterialPresetId;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  defaultColor: string;
  roughness: number;
  metalness: number;
  opacity: number;
  transparent: boolean;
  textureScale: number;
  previewGradient: string;
  category: 'mineral' | 'structural' | 'finish' | 'synthetic';
}

export const MATERIAL_PRESETS: Record<MaterialPresetId, MaterialPresetDefinition> = {
  default: {
    id: 'default',
    nameEn: 'Studio Matte',
    nameFa: 'مات استودیویی',
    descriptionEn: 'Crisp studio tint matching 3ds Max Editable Poly shading',
    descriptionFa: 'رنگ استودیویی مات با بازتاب ملایم جهت مدلسازی تمیز',
    defaultColor: '#8b5cf6',
    roughness: 0.35,
    metalness: 0.04,
    opacity: 1.0,
    transparent: false,
    textureScale: 1.0,
    previewGradient: 'from-violet-500 to-indigo-600',
    category: 'synthetic',
  },
  concrete: {
    id: 'concrete',
    nameEn: 'Architectural Concrete',
    nameFa: 'بتن اکسپوز معماری',
    descriptionEn: 'Raw brutalist exposed concrete with fine aggregate and formwork texture',
    descriptionFa: 'بتن خام اکسپوز با درز قالب‌بندی و بافت دانه‌بندی شنی ملایم',
    defaultColor: '#94a3b8',
    roughness: 0.88,
    metalness: 0.06,
    opacity: 1.0,
    transparent: false,
    textureScale: 1.5,
    previewGradient: 'from-slate-400 to-slate-600',
    category: 'structural',
  },
  glass: {
    id: 'glass',
    nameEn: 'Curtain Wall Glass',
    nameFa: 'شیشه کرتین وال',
    descriptionEn: 'Modern architectural glazing with subtle sky tint and smooth reflection',
    descriptionFa: 'شیشه ساختمانی شفاف با تم آبی آسمانی و بازتاب صیقلی',
    defaultColor: '#93c5fd',
    roughness: 0.08,
    metalness: 0.75,
    opacity: 0.35,
    transparent: true,
    textureScale: 1.0,
    previewGradient: 'from-sky-300/60 to-blue-500/80',
    category: 'finish',
  },
  wood: {
    id: 'wood',
    nameEn: 'Warm Natural Wood',
    nameFa: 'چوب طبیعی و ترمووود',
    descriptionEn: 'Natural architectural oak & walnut planks with organic timber grain',
    descriptionFa: 'پلانک‌های چوب بلوط و ترمووود با رگه‌های گرم چوب',
    defaultColor: '#b45309',
    roughness: 0.58,
    metalness: 0.02,
    opacity: 1.0,
    transparent: false,
    textureScale: 2.0,
    previewGradient: 'from-amber-600 to-yellow-800',
    category: 'finish',
  },
  metal: {
    id: 'metal',
    nameEn: 'Brushed Aluminum',
    nameFa: 'آلومینیوم برس‌خورده',
    descriptionEn: 'Architectural brushed metal with anisotropic specular highlights',
    descriptionFa: 'فلز براق با خش‌های ظریف صنعتی و درخشش نقره‌ای',
    defaultColor: '#e2e8f0',
    roughness: 0.28,
    metalness: 0.92,
    opacity: 1.0,
    transparent: false,
    textureScale: 1.5,
    previewGradient: 'from-slate-200 to-slate-400',
    category: 'structural',
  },
  brick: {
    id: 'brick',
    nameEn: 'Terracotta Brick',
    nameFa: 'آجر نسوز سنتی',
    descriptionEn: 'Running bond architectural brick masonry with recessed mortar lines',
    descriptionFa: 'آجرنمای سفالی با بندکشی منظم و بافت متخلخل سنتی',
    defaultColor: '#b91c1c',
    roughness: 0.92,
    metalness: 0.02,
    opacity: 1.0,
    transparent: false,
    textureScale: 2.5,
    previewGradient: 'from-red-600 to-amber-800',
    category: 'mineral',
  },
  marble: {
    id: 'marble',
    nameEn: 'Carrara Marble',
    nameFa: 'سنگ مرمر کارارا',
    descriptionEn: 'Polished white Italian stone with elegant dark mineral veins',
    descriptionFa: 'سنگ مرمر سفید صیقلی با رگه‌های طبیعی خاکستری و درخشش بالا',
    defaultColor: '#f8fafc',
    roughness: 0.16,
    metalness: 0.08,
    opacity: 1.0,
    transparent: false,
    textureScale: 1.0,
    previewGradient: 'from-slate-100 to-slate-300',
    category: 'mineral',
  },
  plaster: {
    id: 'plaster',
    nameEn: 'Architectural Stucco',
    nameFa: 'پلاستر گچی / سیمان‌سفید',
    descriptionEn: 'Clean architectural matte plaster and limestone stucco finish',
    descriptionFa: 'اندود گچ و سیمان سفید با بافت ماسه‌ای مات و یکدست',
    defaultColor: '#f1f5f9',
    roughness: 0.95,
    metalness: 0.0,
    opacity: 1.0,
    transparent: false,
    textureScale: 1.0,
    previewGradient: 'from-slate-100 to-zinc-200',
    category: 'mineral',
  },
  dark_steel: {
    id: 'dark_steel',
    nameEn: 'Blackened Steel',
    nameFa: 'فولاد تیره آنودایز',
    descriptionEn: 'Contemporary charcoal blackened structural steel cladding',
    descriptionFa: 'فولاد مشکی مات معماری با بازتاب تیره‌رنگ صنعتی',
    defaultColor: '#1e293b',
    roughness: 0.35,
    metalness: 0.88,
    opacity: 1.0,
    transparent: false,
    textureScale: 1.2,
    previewGradient: 'from-slate-800 to-zinc-950',
    category: 'structural',
  },
};

// Texture cache to avoid creating multiple Canvas elements
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates procedural diffuse or bump map texture on an HTML5 canvas
 */
export function getProceduralTexture(
  preset: MaterialPresetId,
  type: 'diffuse' | 'bump' = 'diffuse'
): THREE.CanvasTexture | null {
  if (preset === 'default' || preset === 'glass') {
    return null; // Flat color / smooth glass don't need diffuse bitmap
  }

  const cacheKey = `${preset}_${type}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (type === 'bump') {
    // Generate grayscale bump map
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    if (preset === 'concrete') {
      // Noise and formwork seams
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 45;
        const val = Math.min(255, Math.max(0, 128 + noise));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      // Formwork lines
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      // Form tie holes
      ctx.fillStyle = '#202020';
      const ties = [
        [size * 0.25, size * 0.25],
        [size * 0.75, size * 0.25],
        [size * 0.25, size * 0.75],
        [size * 0.75, size * 0.75],
      ];
      ties.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (preset === 'wood') {
      // Wood plank seams & longitudinal grain
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < size; y += 4) {
        if (Math.random() > 0.4) {
          ctx.fillRect(0, y, size, 1 + Math.random() * 2);
        }
      }
      // Plank division seams
      ctx.strokeStyle = '#303030';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.33);
      ctx.lineTo(size, size * 0.33);
      ctx.moveTo(0, size * 0.66);
      ctx.lineTo(size, size * 0.66);
      ctx.stroke();
    } else if (preset === 'brick') {
      // Brick recessed mortar joints
      ctx.fillStyle = '#cccccc'; // Brick face is raised
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = '#303030'; // Recessed mortar lines
      const rows = 8;
      const rowHeight = size / rows;
      for (let r = 0; r <= rows; r++) {
        ctx.fillRect(0, r * rowHeight - 2, size, 5); // horizontal joint
      }
      const cols = 4;
      const colWidth = size / cols;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (colWidth / 2);
        for (let c = 0; c <= cols; c++) {
          ctx.fillRect((c * colWidth + offset) % size - 2, r * rowHeight, 5, rowHeight);
        }
      }
    } else if (preset === 'metal' || preset === 'dark_steel') {
      // Brushed horizontal streaks
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let y = 0; y < size; y++) {
        const rowNoise = (Math.random() - 0.5) * 30;
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const grain = (Math.random() - 0.5) * 15;
          const val = Math.min(255, Math.max(0, 128 + rowNoise + grain));
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (preset === 'marble') {
      // Vein displacement
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#606060';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.2);
      ctx.bezierCurveTo(size * 0.3, size * 0.5, size * 0.6, size * 0.1, size, size * 0.7);
      ctx.stroke();
    } else if (preset === 'plaster') {
      // Fine stucco grain
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        const val = Math.min(255, Math.max(0, 128 + noise));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } else {
    // Generate Diffuse Color Map
    if (preset === 'concrete') {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, size, size);

      // Aggregate particles
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const delta = (Math.random() - 0.5) * 32;
        data[i] = Math.min(255, Math.max(0, data[i] + delta));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + delta));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + delta));
      }
      ctx.putImageData(imgData, 0, 0);

      // Formwork seam
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, size / 2);
      ctx.lineTo(size, size / 2);
      ctx.stroke();

      // Form tie indentations
      ctx.fillStyle = '#334155';
      const ties = [
        [size * 0.25, size * 0.25],
        [size * 0.75, size * 0.25],
        [size * 0.25, size * 0.75],
        [size * 0.75, size * 0.75],
      ];
      ties.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (preset === 'wood') {
      // Wood gradient and planks
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, '#a16207');
      grad.addColorStop(0.5, '#b45309');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Fine wood grain lines
      for (let y = 0; y < size; y += 3) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(69, 26, 3, 0.22)' : 'rgba(251, 191, 36, 0.12)';
        ctx.fillRect(0, y, size, 1 + Math.random() * 2);
      }

      // Plank seams
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.33);
      ctx.lineTo(size, size * 0.33);
      ctx.moveTo(0, size * 0.66);
      ctx.lineTo(size, size * 0.66);
      ctx.stroke();
    } else if (preset === 'brick') {
      // Mortar background
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, size, size);

      // Bricks
      const rows = 8;
      const rowHeight = size / rows;
      const cols = 4;
      const colWidth = size / cols;

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (colWidth / 2);
        for (let c = -1; c <= cols + 1; c++) {
          const bx = c * colWidth + offset + 2;
          const by = r * rowHeight + 2;
          const bw = colWidth - 4;
          const bh = rowHeight - 4;

          const toneVar = Math.floor(Math.random() * 30) - 15;
          ctx.fillStyle = `rgb(${185 + toneVar}, ${40 + toneVar / 2}, ${40 + toneVar / 2})`;
          ctx.fillRect(bx, by, bw, bh);

          // Subtle brick surface noise
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          for (let k = 0; k < 6; k++) {
            ctx.fillRect(bx + Math.random() * bw, by + Math.random() * bh, 4, 3);
          }
        }
      }
    } else if (preset === 'marble') {
      // White Carrara base
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(0.5, '#f1f5f9');
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Soft mineral veins
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.15);
      ctx.bezierCurveTo(size * 0.4, size * 0.6, size * 0.7, size * 0.2, size, size * 0.85);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(size * 0.3, 0);
      ctx.bezierCurveTo(size * 0.5, size * 0.4, size * 0.2, size * 0.7, size * 0.6, size);
      ctx.stroke();
    } else if (preset === 'metal' || preset === 'dark_steel') {
      const baseCol = preset === 'metal' ? '#cbd5e1' : '#1e293b';
      ctx.fillStyle = baseCol;
      ctx.fillRect(0, 0, size, size);

      // Fine brushed streaks
      for (let y = 0; y < size; y += 2) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, y, size, 1);
      }
    } else if (preset === 'plaster') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);
      // Fine plaster texture
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const delta = (Math.random() - 0.5) * 12;
        data[i] = Math.min(255, Math.max(0, data[i] + delta));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + delta));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + delta));
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a Three.js MeshStandardMaterial configured with the BoxMaterial properties and procedural maps
 */
export function createBoxStandardMaterial(
  boxMaterial?: BoxMaterial,
  strokeColor?: string,
  isShaded: boolean = true
): THREE.MeshStandardMaterial {
  const presetId = boxMaterial?.preset || 'default';
  const def = MATERIAL_PRESETS[presetId] || MATERIAL_PRESETS.default;

  // Resolve color: boxMaterial color -> preset defaultColor -> strokeColor -> fallback
  let hexColor = boxMaterial?.color;
  if (!hexColor) {
    if (presetId === 'default' && strokeColor && strokeColor !== '#000000' && strokeColor !== '#ffffff') {
      hexColor = strokeColor;
    } else {
      hexColor = def.defaultColor;
    }
  }

  const color = new THREE.Color(hexColor);
  const roughness = boxMaterial?.roughness !== undefined ? boxMaterial.roughness : def.roughness;
  const metalness = boxMaterial?.metalness !== undefined ? boxMaterial.metalness : def.metalness;
  const opacity = boxMaterial?.opacity !== undefined ? boxMaterial.opacity : def.opacity;
  const transparent = boxMaterial?.transparent !== undefined ? boxMaterial.transparent : def.transparent;
  const scale = boxMaterial?.textureScale !== undefined ? boxMaterial.textureScale : def.textureScale;

  // If in wireframe or non-shaded mode
  if (!isShaded) {
    return new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  // Load procedural textures
  const diffuseTex = getProceduralTexture(presetId, 'diffuse');
  const bumpTex = getProceduralTexture(presetId, 'bump');

  let map: THREE.CanvasTexture | undefined;
  let bumpMap: THREE.CanvasTexture | undefined;

  if (diffuseTex) {
    map = diffuseTex.clone();
    map.needsUpdate = true;
    map.repeat.set(scale, scale);
  }

  if (bumpTex) {
    bumpMap = bumpTex.clone();
    bumpMap.needsUpdate = true;
    bumpMap.repeat.set(scale, scale);
  }

  return new THREE.MeshStandardMaterial({
    color,
    map: map || null,
    bumpMap: bumpMap || null,
    bumpScale: presetId === 'brick' ? 0.08 : presetId === 'concrete' ? 0.04 : 0.02,
    roughness,
    metalness,
    transparent,
    opacity,
    flatShading: presetId === 'default' || presetId === 'concrete',
    side: THREE.DoubleSide,
    depthWrite: !transparent || opacity >= 0.95,
  });
}
