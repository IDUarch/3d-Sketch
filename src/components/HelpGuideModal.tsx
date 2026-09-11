import React from 'react';
import { X, Layers, Compass, PenTool, Move3d, Sparkles, CheckCircle2 } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fa' | 'en';
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;
  const isFa = lang === 'fa';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div
        className="w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col text-slate-100"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Move3d className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isFa ? 'راهنمای اسکیس و طراحی سه‌بعدی' : '3D Sketch Studio Guide'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFa ? 'نحوه کارکرد ترسیم فضایی و لایه‌ها' : 'Spatial drawing & layer system'}
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

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-slate-300 text-xs sm:text-sm leading-relaxed">
          <div className="flex gap-3 items-start p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-indigo-300 mb-1">
                {isFa ? 'طراحی در فضای سه‌بعدی (مانند منتال کانواس)' : '3D Spatial Drawing'}
              </h4>
              <p className="text-slate-300 leading-normal">
                {isFa
                  ? 'برخلاف برنامه‌های نقاشی دوبعدی معمولی، در این نرم‌افزار خطوط روی صفحات فضایی (Planes) در دنیای سه‌بعدی قرار می‌گیرند. هرگاه صحنه را بچرخانید، طرح شما دارای عمق واقعی، پرسپکتیو و پارالاکس خواهد بود.'
                  : 'Unlike standard 2D drawing apps, your sketch lines reside on 3D spatial planes. When you orbit the camera, your sketch reveals true architectural depth and parallax.'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">
                  {isFa ? 'چرخش و زاویه دید (Orbit & Pan): ' : 'Orbit & Navigation: '}
                </span>
                <span>
                  {isFa
                    ? 'با کلیک راست، اسکرول ماوس، لمس دو انگشتی، یا تغییر حالت به آیکون چرخش در نوار ابزار سمت چپ، می‌توانید آزادانه زاویه دوربین را تغییر دهید.'
                    : 'Right-click, scroll wheel, two-finger touch gestures, or the Orbit button on the left allow full 360° navigation.'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">
                  {isFa ? 'بوم‌های طراحی (Drawing Planes): ' : 'Spatial Canvases: '}
                </span>
                <span>
                  {isFa
                    ? 'از بالای صفحه، بوم فعال را انتخاب کنید: مثلاً «کف و پله‌ها» برای رسم روی زمین، «نمای اصلی» برای دیوارها، یا «سایبان» برای خطوط برجسته در فضا.'
                    : 'Choose your active drawing plane from the top bar: Ground for floors, Facade for walls, or Awning for projecting elements.'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">
                  {isFa ? 'مدیریت لایه‌ها (Layer Stack): ' : 'Layers Management: '}
                </span>
                <span>
                  {isFa
                    ? 'در پنل سمت راست، می‌توانید لایه‌ها را فعال یا مخفی کنید، شفافیت (Opacity) آن‌ها را تغییر دهید و با افزودن لایه جدید جزئیات تکمیلی اضافه کنید.'
                    : 'In the top-right panel, toggle layer visibility, tweak opacity, and create new layers for detailed line work.'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">
                  {isFa ? 'فاصله کانونی لنز (17mm): ' : '17mm Lens Focal Length: '}
                </span>
                <span>
                  {isFa
                    ? 'نشان ۱۷ میلی‌متر در بالای صفحه (مطابق تصویر) زاویه دید واید حرفه‌ای معماری را تنظیم می‌کند؛ می‌توانید بین ۱۷، ۲۴، ۳۵، ۵۰ میلی‌متر یا دید ارتوگرافیک جابجا شوید.'
                    : 'The 17mm badge matches architectural wide-angle lenses, switchable between 17mm, 24mm, 35mm, 50mm, or Orthographic.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-2xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
          >
            {isFa ? 'متوجه شدم، شروع طراحی' : 'Got it, start sketching'}
          </button>
        </div>
      </div>
    </div>
  );
};
