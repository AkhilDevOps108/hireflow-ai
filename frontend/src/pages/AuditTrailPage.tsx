import { useQuery } from '@tanstack/react-query';
import { getAuditEvents } from '../api/hireflow';

export function AuditTrailPage() {
  const auditQuery = useQuery({ queryKey: ['audit-events'], queryFn: getAuditEvents });

  if (auditQuery.isLoading) {
    return <div className="state-panel">Loading audit trail...</div>;
  }

  if (auditQuery.isError) {
    return <div className="state-panel error">Unable to load audit trail.</div>;
  }

  const events = auditQuery.data ?? [];

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Audit Trail</h1>
          <p>Trace which candidate and job data informed each generated insight.</p>
        </div>
      </section>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.timestamp).toLocaleString()}</td>
                  <td>{event.action}</td>
                  <td>{event.actor}</td>
                  <td>{event.entity_type}:{event.entity_id}</td>
                  <td><small>{JSON.stringify(event.details)}</small></td>
                </tr>
              ))}
              {events.length === 0 ? <tr><td colSpan={5} className="empty-cell">No audit events yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
