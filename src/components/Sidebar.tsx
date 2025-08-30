import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { navSections } from '../nav';

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function LinkItem({
  to,
  label,
  Icon,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  Icon: LucideIcon;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded px-2 py-2 transition-colors',
          isActive ? 'bg-black/5 font-medium' : 'hover:bg-black/5',
        ].join(' ')
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
}: Props) {
  // Fermer le drawer mobile avec ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) onCloseMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  // ----- Desktop (fixe + collapse) -----
  const Desktop = (
    <aside
      className={`h-full border-r bg-white ${
        collapsed ? 'w-16' : 'w-64'
      } px-3 py-4 text-sm hidden md:block`}
    >
      <div className="flex items-center justify-between mb-3">
        {!collapsed ? <div className="font-semibold">Navigation</div> : <div className="h-5" />}
        <button
          onClick={onToggleCollapsed}
          className="p-1 rounded hover:bg-black/5"
          title={collapsed ? 'Déplier' : 'Replier'}
          aria-label="Basculer la largeur du menu"
        >
          <ChevronLeft
            className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            size={18}
          />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && !collapsed && (
              <div className="uppercase opacity-60 mt-3 mb-1 text-[0.7rem]">
                {section.title}
              </div>
            )}
            {section.items.map(({ to, label, icon: Icon }, i) => (
              <LinkItem
                key={to + i}
                to={to}
                label={label}
                Icon={Icon}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );

  // ----- Mobile (off-canvas) -----
  const Mobile = (
    <div className="md:hidden">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
      />
      {/* Panel */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-72 border-r bg-white p-4 text-sm transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Navigation</div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded hover:bg-black/5"
            aria-label="Fermer"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="uppercase opacity-60 mt-3 mb-1 text-[0.7rem]">
                  {section.title}
                </div>
              )}
              {section.items.map(({ to, label, icon: Icon }, i) => (
                <LinkItem
                  key={to + i}
                  to={to}
                  label={label}
                  Icon={Icon}
                  onClick={onCloseMobile}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );

  return (
    <>
      {Desktop}
      {Mobile}
    </>
  );
}
