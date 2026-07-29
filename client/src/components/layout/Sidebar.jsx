import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuth } from '../../hooks/useAuth';

const NAV = [
  { to: '/',          label: 'Dashboard',   icon: '◈', roles: ['admin','analyst','viewer'] },
  { to: '/datasets',  label: 'Datasets',    icon: '⊟', roles: ['admin','analyst','viewer'] },
  { to: '/analysis',  label: 'Analysis',    icon: '⊕', roles: ['admin','analyst'] },
  { to: '/anomalies', label: 'Anomalies',   icon: '⚠', roles: ['admin','analyst','viewer'] },
  { to: '/threats',   label: 'Threats',     icon: 'T', roles: ['admin','analyst','viewer'] },
  { to: '/audit',     label: 'Audit Logs',  icon: '▣', roles: ['admin'] },
  { to: '/settings',  label: 'Settings',    icon: '⊞', roles: ['admin'] },
];

function SidebarContent({ collapsed, onNavClick }) {
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const { toggleSidebar } = useUIStore();

  return (
    <aside
      className={`flex flex-col bg-surface border-r border-border transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      } min-h-screen shrink-0`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-border">
        <img src="/regiment_logo.jpg" alt="Regiment Logo" className="w-7 h-7 object-contain shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-text-primary font-display font-bold text-sm tracking-widest uppercase">Regiment</div>
            <div className="text-accent font-mono text-xs tracking-widest">OPS</div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto text-text-muted hover:text-text-secondary transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* System status */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="status-dot bg-success animate-pulse-slow" />
            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Sys Online</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.filter((item) => hasRole(...item.roles)).map((item) => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-2 py-2 text-sm transition-all duration-100 group ${
                active
                  ? 'bg-accent-dim text-accent border-l-2 border-accent pl-2'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 border-l-2 border-transparent'
              }`}
            >
              <span className={`font-mono shrink-0 ${active ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="font-display text-xs uppercase tracking-wider truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="w-7 h-7 rounded-none bg-accent/20 flex items-center justify-center text-accent text-xs font-mono font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 shrink-0 bg-accent/20 flex items-center justify-center text-accent text-xs font-mono font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-text-primary truncate">{user?.username || 'Unknown'}</div>
              <div className="text-xs font-mono text-accent uppercase tracking-wider">{user?.role || 'viewer'}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, mobileMenuOpen, closeMobileMenu } = useUIStore();

  return (
    <>
      {/* ── Desktop sidebar (md and up) ─────────────────────── */}
      <div className="hidden md:block">
        <SidebarContent collapsed={sidebarCollapsed} onNavClick={undefined} />
      </div>

      {/* ── Mobile drawer (below md) ────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          {/* Drawer panel — always fully expanded on mobile */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden flex">
            <SidebarContent collapsed={false} onNavClick={closeMobileMenu} />
          </div>
        </>
      )}
    </>
  );
}

