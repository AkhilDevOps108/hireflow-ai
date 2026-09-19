export function SettingsPage() {
  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Profile, organization, permissions, AI configuration and security.</p>
        </div>
      </section>

      <section className="settings-grid">
        <div className="panel"><h3>Profile</h3><p>Manage recruiter profile and preferences.</p></div>
        <div className="panel"><h3>Organization</h3><p>Organization-level recruiting settings and branding.</p></div>
        <div className="panel"><h3>Team & Permissions</h3><p>Control recruiter and hiring manager access.</p></div>
        <div className="panel"><h3>AI Configuration</h3><p>Provider and runtime controls for AI features.</p></div>
        <div className="panel"><h3>Notifications</h3><p>Configure candidate and interview alerts.</p></div>
        <div className="panel"><h3>Security</h3><p>Authentication, authorization and audit safeguards.</p></div>
      </section>
    </div>
  );
}
