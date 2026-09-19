import { useQuery } from '@tanstack/react-query';
import { getCandidates, getJobs } from '../api/hireflow';

export function ActivityPage() {
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: getJobs });
  const candidatesQuery = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });

  const items = [
    `AI analyzed ${Math.max(0, candidatesQuery.data?.length ?? 0)} candidate resumes.`,
    `Recruiter reviewed ${candidatesQuery.data?.[0]?.name ?? 'a candidate'}.`,
    `AI identified candidates with Terraform and Kubernetes coverage.`,
    `New candidate added to talent pool.`,
    `JD requirements updated for ${jobsQuery.data?.[0]?.title ?? 'active role'}.`,
  ];

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1>Activity</h1>
          <p>Track recruiting and AI workflow events.</p>
        </div>
      </section>

      <section className="panel">
        <ul className="activity-list">
          {items.map((item, index) => (
            <li key={item}>
              <span>{10 + index * 12}:42</span>
              <p>{item}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
