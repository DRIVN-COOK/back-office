// src/components/AppLauncher.tsx
import { Link } from 'react-router-dom';
import { navSections } from '../nav';

export default function AppLauncher({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed right-4 top-16 w-[680px] max-w-[95vw] max-h-[75vh] overflow-auto bg-white border rounded-2xl shadow-xl transition-transform ${
          open ? 'translate-y-0' : '-translate-y-2 pointer-events-none opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Lanceur d’apps"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Aller vers…</div>
          <button onClick={onClose} className="px-2 py-1 text-sm rounded hover:bg-black/5">
            Fermer
          </button>
        </div>

        <div className="p-4 space-y-6">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div className="uppercase text-[0.7rem] opacity-60 mb-2">{section.title}</div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {section.items.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={onClose}
                    className="group flex items-center gap-3 border rounded-xl p-3 hover:bg-black/5 transition-colors"
                  >
                    <it.icon size={20} />
                    <div className="font-medium group-hover:underline">{it.label}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
