import React, { useState } from 'react';
import { DrawingPlane, Point3D } from '../types';
import { Layers, Plus, Move, Sliders, X, Check, Eye } from 'lucide-react';

interface PlaneManagerProps {
  isOpen: boolean;
  onClose: () => void;
  planes: DrawingPlane[];
  activePlaneId: string;
  onSelectPlane: (id: string) => void;
  onAddPlane: (newPlane: DrawingPlane) => void;
  onUpdatePlaneOffset: (planeId: string, deltaOffset: number) => void;
  lang: 'fa' | 'en';
}

export const PlaneManager: React.FC<PlaneManagerProps> = ({
  isOpen,
  onClose,
  planes,
  activePlaneId,
  onSelectPlane,
  onAddPlane,
  onUpdatePlaneOffset,
  lang,
}) => {
  const [newPlaneName, setNewPlaneName] = useState('');
  const [planeOrientation, setPlaneOrientation] = useState<'ground' | 'wall' | 'side'>('wall');
  const [offsetSlider, setOffsetSlider] = useState(0);

  if (!isOpen) return null;

  const isFa = lang === 'fa';
  const activePlane = planes.find((p) => p.id === activePlaneId) || planes[0];

  const handleCreatePlane = () => {
    const id = `plane-${Date.now()}`;
    let normal: Point3D = { x: 0, y: 0, z: 1 };
    let up: Point3D = { x: 0, y: 1, z: 0 };
    let origin: Point3D = { x: 0, y: 2, z: 1.5 };

    if (planeOrientation === 'ground') {
      normal = { x: 0, y: 1, z: 0 };
      up = { x: 0, y: 0, z: -1 };
      origin = { x: 0, y: 1.0, z: 1.5 };
    } else if (planeOrientation === 'side') {
      normal = { x: 1, y: 0, z: 0 };
      up = { x: 0, y: 1, z: 0 };
      origin = { x: 1.5, y: 2.0, z: 1.0 };
    }

    const surfaceType =
      planeOrientation === 'ground' ? 'xoy' : planeOrientation === 'side' ? 'yoz' : 'xoz';

    const newPlane: DrawingPlane = {
      id,
      name: newPlaneName.trim() || `Plane ${planes.length + 1}`,
      nameFa: newPlaneName.trim() || `بوم جدید ${planes.length + 1}`,
      origin,
      normal,
      up,
      width: 4.0,
      height: 4.0,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      surfaceType,
    };

    onAddPlane(newPlane);
    onSelectPlane(id);
    setNewPlaneName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col text-slate-100"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isFa ? 'مدیریت بوم‌های سه‌بعدی' : '3D Drawing Planes'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFa ? 'ترسیم در لایه‌ها و عمق‌های مختلف فضا' : 'Draw strokes across spatial planes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active Plane Selection List */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              {isFa ? 'انتخاب بوم فعال برای ترسیم:' : 'Select Active Canvas for Drawing:'}
            </label>
            <div className="space-y-2">
              {planes.map((p) => {
                const isSelected = p.id === activePlaneId;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPlane(p.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="text-xs font-semibold text-slate-100">
                          {isFa ? p.nameFa || p.name : p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          موقعیت: ({p.origin.x.toFixed(1)}, {p.origin.y.toFixed(1)}, {p.origin.z.toFixed(1)})
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/30 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                        <Check className="w-3.5 h-3.5" />
                        {isFa ? 'انتخاب شده' : 'Active'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adjust Depth / Distance of Active Plane */}
          {activePlane && (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Move className="w-4 h-4 text-indigo-400" />
                  {isFa ? 'تنظیم موقعیت عمق بوم فعال:' : 'Shift Active Plane Depth:'}
                </span>
                <span className="font-mono text-indigo-400">
                  Z: {activePlane.origin.z.toFixed(2)}m
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdatePlaneOffset(activePlane.id, -0.2)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white/10 border border-white/15 text-slate-200 rounded-lg hover:bg-white/20 transition-colors"
                >
                  - 0.2m
                </button>
                <div className="flex-1 text-center text-[11px] text-slate-400">
                  {isFa ? 'انتقال بوم در امتداد عمق فضا' : 'Shift along normal'}
                </div>
                <button
                  onClick={() => onUpdatePlaneOffset(activePlane.id, 0.2)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white/10 border border-white/15 text-slate-200 rounded-lg hover:bg-white/20 transition-colors"
                >
                  + 0.2m
                </button>
              </div>
            </div>
          )}

          {/* Create New Plane Section */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">
              {isFa ? 'افزودن بوم جدید در فضای سه‌بعدی:' : 'Create New Spatial Plane:'}
            </h4>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isFa ? 'جهت‌گیری بوم:' : 'Plane Orientation:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPlaneOrientation('wall')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    planeOrientation === 'wall'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-semibold shadow-sm'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {isFa ? 'نمای عمودی (دیوار)' : 'Vertical Wall'}
                </button>
                <button
                  type="button"
                  onClick={() => setPlaneOrientation('ground')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    planeOrientation === 'ground'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-semibold shadow-sm'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {isFa ? 'افقی (کف/سقف)' : 'Horizontal Floor'}
                </button>
                <button
                  type="button"
                  onClick={() => setPlaneOrientation('side')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    planeOrientation === 'side'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-semibold shadow-sm'
                      : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {isFa ? 'عمودی جانبی' : 'Side Wall'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {isFa ? 'نام بوم جدید:' : 'Plane Name:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isFa ? 'مثال: بالکن طبقه ۲، نرده، رواق...' : 'e.g., Balcony, Canopy...'}
                  value={newPlaneName}
                  onChange={(e) => setNewPlaneName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-white/15 rounded-xl bg-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreatePlane}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-md shadow-indigo-600/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isFa ? 'افزودن' : 'Add'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white/5 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
          >
            {isFa ? 'بستن' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
