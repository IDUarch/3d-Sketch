import React, { useState } from 'react';
import { Keyboard, X, Sparkles, Navigation, Layers, Compass, Move, MousePointer } from 'lucide-react';

interface KeyboardShortcutsProps {
  lang: 'fa' | 'en';
}

export function KeyboardShortcuts({ lang }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const isFa = lang === 'fa';

  const shortcutGroups = [
    {
      title: isFa ? 'ویرایش نقاط، سگمنت‌ها و سطوح مکعب (Sub-Object)' : '3D Box Sub-Elements (Vertex, Edge, Polygon)',
      icon: MousePointer,
      shortcuts: [
        {
          key: '1',
          desc: isFa ? 'حالت انتخاب نقاط مکعب (Vertex)' : 'Box Vertex edit mode (select vertices)',
        },
        {
          key: '2',
          desc: isFa ? 'حالت انتخاب سگمنت‌ها / لبه‌های مکعب (Edge)' : 'Box Edge/Segment edit mode',
        },
        {
          key: '3',
          desc: isFa ? 'حالت انتخاب سطوح و وجه‌ها (Polygon / Face)' : 'Box Polygon/Face edit mode',
        },
        {
          key: '4',
          desc: isFa ? 'حالت کل حجم مکعب (Whole Object)' : 'Whole Box mode',
        },
        {
          key: 'Tab',
          desc: isFa ? 'چرخش و انتخاب نقطه/لبه/سطح بعدی' : 'Cycle to next vertex, edge, or face',
        },
        {
          key: 'W , A , S , D',
          desc: isFa
            ? 'جابجایی نقطه، لبه یا سطح انتخاب‌شده (A/D: افقی، W/S: ارتفاع، با Shift: عمق)'
            : 'Move selected vertex/edge/polygon (A/D: X, W/S: Y, Shift: Z)',
        },
        {
          key: isFa ? 'Shift + درگ گیزمو' : 'Shift + Drag Gizmo',
          desc: isFa
            ? 'توسعه حجم یا خالی کردن حجم با ایجاد سگمنت‌های متصل جدید (اکسترود معمارانه مطابق ویدیو)'
            : 'Extrude outward or carve inward with new connected segments (Architectural Shift-Extrude)',
        },
        {
          key: 'Shift + E',
          desc: isFa ? 'توسعه حجم روی وجه انتخاب‌شده (+1.0m)' : 'Extrude selected polygon face (+1.0m)',
        },
        {
          key: 'Shift + C',
          desc: isFa ? 'خالی کردن حجم / عقب‌نشینی بالکن و پاسیو (-0.5m)' : 'Carve / recess volume inward (-0.5m)',
        },
        {
          key: 'I',
          desc: isFa ? 'دستور اینست: آفست سطح به سمت داخل و ایجاد سطوح پولیگان جدید' : 'Inset Command: Offset polygon inward and generate new sub-faces',
        },
        {
          key: isFa ? 'درگ گیزمو ۳بعدی' : '3D Gizmo Drag',
          desc: isFa
            ? 'جابجایی مستقیم نقطه یا لبه در ویوپورت با دستگیره قرمز(X)، سبز(Y)، آبی(Z)'
            : 'Directly drag sub-element along Red (X), Green (Y), or Blue (Z) axis',
        },
      ],
    },
    {
      title: isFa ? 'انتخاب و جابجایی سه‌بعدی روی محورها (X, Y, Z)' : 'Selection & 3D Axis Movement (X, Y, Z)',
      icon: Move,
      shortcuts: [
        { key: 'S', desc: isFa ? 'ابزار انتخاب خطوط و احجام سه‌بعدی (همچنین با کیبورد فارسی)' : 'Activate Select Objects tool' },
        { key: 'L', desc: isFa ? 'ابزار خط‌کش مستقیم (Line)' : 'Straight Line rule' },
        { key: 'H', desc: isFa ? 'پنهان‌سازی / ظاهر کردن مجدد انتخاب‌ها (H)' : 'Hide / Show selected items' },
        { key: 'Shift + Click', desc: isFa ? 'انتخاب چند خط، حجم یا نقطه همزمان' : 'Multi-select items' },
        {
          key: 'W , A , S , D',
          desc: isFa
            ? 'جابجایی انتخاب‌ها (A/D: محور X، W/S: محور Y، با Shift: محور Z)'
            : 'Move selection (A/D: X-axis, W/S: Y-axis, Shift: Z-axis)',
        },
        {
          key: isFa ? 'کلیدهای جهت‌نما' : 'Arrow Keys',
          desc: isFa
            ? 'جابجایی روی محورها (←/→: محور X، ↑/↓: محور Y، Shift+↑/↓: محور Z)'
            : 'Move along axes (←/→: X-axis, ↑/↓: Y-axis, Shift+↑/↓: Z-axis)',
        },
        {
          key: 'Alt + ' + (isFa ? 'حرکت' : 'Move'),
          desc: isFa ? 'گام جابجایی بسیار ریز و دقیق (0.05m)' : 'Fine precision step (0.05m)',
        },
        { key: 'Ctrl + A', desc: isFa ? 'انتخاب همه خطوط و احجام فعال' : 'Select all active lines & volumes' },
        { key: 'Delete / Backspace', desc: isFa ? 'پاک کردن موارد انتخاب شده' : 'Delete selected items' },
        { key: 'Esc', desc: isFa ? 'لغو انتخاب اشیاء' : 'Deselect all' },
      ],
    },
    {
      title: isFa ? 'ابزارهای ترسیم و اندازه‌گیری معماری' : 'Architectural Drawing & Measuring Tools',
      icon: Sparkles,
      shortcuts: [
        { key: 'M', desc: isFa ? 'متر و اندازه‌گیری فاصله سه‌بعدی (Tape Measure)' : '3D Tape Measure (Click 2 points)' },
        { key: 'P', desc: isFa ? 'قلم نوری (Ink Pen)' : 'Fine Pen tool' },
        { key: 'B', desc: isFa ? 'ترسیم مکعب سه‌بعدی (3D Box)' : '3D Box / Volume' },
        { key: 'L', desc: isFa ? 'خط‌کش مستقیم (Line)' : 'Straight Line rule' },
        { key: 'E', desc: isFa ? 'پاک‌کن فضایی (Eraser)' : 'Eraser' },
      ],
    },
    {
      title: isFa ? 'صفحات سه‌بعدی و آهنربای گرید (3D Snaps)' : '3D Surfaces & Snap-to-Grid (3ds Max)',
      icon: Layers,
      shortcuts: [
        { key: 'Shift + S', desc: isFa ? 'فعال/غیرفعال کردن آهنربای سه‌بعدی و گرید (Snap-to-Grid)' : 'Toggle 3D Snap-to-Grid (3ds Max style)' },
        { key: 'Shift + G', desc: isFa ? 'تنظیمات پیشرفته اسنپ، گرید و فواصل (Snap Settings)' : 'Open 3D Snap & Grid Settings modal' },
        { key: 'G', desc: isFa ? 'پنهان‌سازی / نمایش تمام گریدها و صفحات کمکی' : 'Toggle all grids and helper planes' },
        { key: '1', desc: isFa ? 'صفحه کف/پلان (XOY)' : 'XOY Floor/Plan surface' },
        { key: '2', desc: isFa ? 'صفحه از روبرو (XOZ)' : 'XOZ Front surface' },
        { key: '3', desc: isFa ? 'صفحه برش جانبی (YOZ)' : 'YOZ Profile surface' },
        { key: '[  /  ]', desc: isFa ? 'جابجایی عمق صفحه (±0.2m)' : 'Shift surface offset' },
      ],
    },
    {
      title: isFa ? 'کنترل ناوبری و دوربین' : 'Navigation & Camera',
      icon: Navigation,
      shortcuts: [
        { key: 'Space', desc: isFa ? 'تغییر حالت ترسیم / چرخش سه‌بعدی' : 'Toggle Draw / 3D Orbit' },
        { key: isFa ? 'کلیک راست' : 'Right-Click', desc: isFa ? 'جابجایی بوم (Pan)' : 'Pan view' },
        { key: isFa ? 'اسکرول' : 'Scroll', desc: isFa ? 'بزرگنمایی (Zoom)' : 'Zoom in / out' },
      ],
    },
    {
      title: isFa ? 'عملیات و تاریخچه' : 'History & Actions',
      icon: Compass,
      shortcuts: [
        { key: 'Ctrl + Z', desc: isFa ? 'بازگشت به مرحله قبل (Undo)' : 'Undo last stroke' },
        { key: 'Ctrl + Y', desc: isFa ? 'انجام مجدد (Redo)' : 'Redo' },
      ],
    },
  ];

  return (
    <>
      {/* Persistent Floating Bottom Button */}
      <div
        className="relative pointer-events-auto"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          id="keyboard-shortcuts-persistent-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isFa ? 'کلیدهای میانبر کیبورد' : 'Keyboard shortcuts'}
          className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl border transition-all text-xs font-medium shadow-xl ${
            isOpen
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/25 ring-2 ring-indigo-400/40'
              : 'bg-slate-900/70 text-slate-200 border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">
            {isFa ? 'کلیدهای میانبر' : 'Shortcuts'}
          </span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-slate-300">
            ?
          </span>
        </button>

        {/* Hover Quick Tooltip */}
        {showTooltip && !isOpen && (
          <div
            className={`absolute bottom-full mb-2.5 ${
              isFa ? 'left-0' : 'right-0'
            } w-52 p-2.5 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl text-[11px] text-slate-200 pointer-events-none z-30 space-y-1.5`}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <div className="font-semibold text-indigo-300 border-b border-white/10 pb-1 flex items-center justify-between">
              <span>{isFa ? 'کلیدهای سریع:' : 'Quick Hotkeys:'}</span>
              <span className="text-[10px] text-slate-400 font-mono">1/2/3 • Space</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between items-center">
                <span>{isFa ? 'انتخاب اشیاء:' : 'Select Tool:'}</span>
                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">S</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{isFa ? 'جابجایی سه‌بعدی:' : 'Move Selection:'}</span>
                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">WASD / ↑↓←→</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{isFa ? 'تغییر ترسیم/چرخش:' : 'Draw / Orbit:'}</span>
                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Space</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{isFa ? 'صفحات XOY / XOZ / YOZ:' : 'Surfaces:'}</span>
                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">1, 2, 3</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center pt-0.5">
              {isFa ? 'برای مشاهده کامل کلیک کنید' : 'Click to see all shortcuts'}
            </div>
          </div>
        )}
      </div>

      {/* Full Keyboard Shortcuts Popover Modal */}
      {isOpen && (
        <div
          id="keyboard-shortcuts-popover"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          dir={isFa ? 'rtl' : 'ltr'}
        >
          <div
            className="w-full max-w-lg bg-slate-900/85 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-6 text-slate-100 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {isFa ? 'راهنمای کلیدهای میانبر' : 'Keyboard Shortcuts Cheatsheet'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isFa
                      ? 'برای افزایش سرعت طراحی سه‌بعدی از این کلیدها استفاده کنید'
                      : 'Accelerate your 3D sketching workflow with hotkeys'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shortcutGroups.map((group, gIdx) => {
                const Icon = group.icon;
                return (
                  <div
                    key={gIdx}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{group.title}</span>
                    </div>

                    <div className="space-y-1.5">
                      {group.shortcuts.map((sc, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-300 text-[11px] leading-tight">{sc.desc}</span>
                          <kbd className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/15 text-indigo-300 font-mono text-[11px] shadow-sm whitespace-nowrap">
                            {sc.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer tip */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {isFa
                  ? 'نکته: با کلید Space سریعاً بین ترسیم و چرخش آزاد سوئیچ کنید.'
                  : 'Pro-tip: Press Space anytime to switch between drawing and free orbit.'}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                {isFa ? 'متوجه شدم' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
