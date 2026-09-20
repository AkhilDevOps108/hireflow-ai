import { NavLink } from 'react-router-dom';

type Group = {
  label?: string;
  items: { to: string; label: string; end?: boolean }[];
};

const groups: Group[] = [
  {
    items: [{ to: '/', label: 'Overview', end: true }],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/chat', label: 'AI Assistant' },
      { to: '/jobs', label: 'Jobs' },
      { to: '/candidates', label: 'Talent Pool' },
      { to: '/interviews', label: 'Interviews' },
      { to: '/evaluations', label: 'Evaluations' },
    ],
  },
  {
    label: 'Verification',
    items: [
      { to: '/audit', label: 'Audit Trail' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="hf-sidebar" aria-label="Primary navigation">
      <div className="hf-brand">
        <div className="hf-brand-mark">H</div>
        <div>
          <div className="hf-brand-title">HIRE FLOW</div>
          <div className="hf-brand-subtitle">Recruitment Intelligence</div>
        </div>
      </div>

      <nav className="hf-nav">
        {groups.map((group) => (
          <section key={group.label ?? 'overview'} className="hf-nav-group">
            {group.label ? <p className="hf-nav-group-title">{group.label}</p> : null}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `hf-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
    </aside>
  );
}
