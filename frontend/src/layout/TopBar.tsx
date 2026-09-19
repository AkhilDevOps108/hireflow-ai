export function TopBar() {
  return (
    <header className="hf-topbar">
      <div className="hf-search-wrap">
        <input
          className="hf-search-input"
          placeholder="Search jobs, candidates, skills..."
          aria-label="Global search"
        />
      </div>

      <div className="hf-topbar-actions">
        <button type="button" className="ghost-btn" aria-label="Notifications">Notifications</button>
        <button type="button" className="ghost-btn" aria-label="Organization selector">Org: HireFlow Labs</button>
        <button type="button" className="ghost-btn" aria-label="User profile">Recruiter</button>
      </div>
    </header>
  );
}
