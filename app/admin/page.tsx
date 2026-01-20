export default function AdminDashboard() {
  return (
    <div className="px-8">
      <h1 className="text-2xl font-semibold mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Artworks', value: '—', color: 'bg-blue-50' },
          { label: 'Exhibitions', value: '—', color: 'bg-green-50' },
          { label: 'Pending Inquiries', value: '—', color: 'bg-yellow-50' },
          { label: 'Subscribers', value: '—', color: 'bg-purple-50' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-lg p-6`}>
            <div className="text-3xl font-semibold mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <div className="text-gray-500 text-sm">
          No recent activity to display.
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex gap-4">
        <a
          href="/admin/artworks/new"
          className="btn-primary"
        >
          Add Artwork
        </a>
        <a
          href="/admin/exhibitions/new"
          className="btn-secondary"
        >
          Add Exhibition
        </a>
        <a
          href="/admin/inquiries"
          className="btn-secondary"
        >
          View Inquiries
        </a>
      </div>
    </div>
  )
}
