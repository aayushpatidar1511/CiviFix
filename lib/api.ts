const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
const API_ROOT = API_URL.replace(/\/api\/v1$/, '')

export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'CITIZEN' | 'FIELD_WORKER' | 'DEPARTMENT_OFFICER' | 'CITY_ADMIN'
  phone?: string
}

export type Comment = {
  id: number
  complaint: number
  author: User
  body: string
  created_at: string
}

export type StatusHistory = {
  id: number
  actor: User | null
  old_status: string
  new_status: string
  reason: string
  timestamp: string
}

export type ResolutionEvidence = {
  id: number
  worker: User
  before_image?: string
  after_image?: string
  notes: string
  confidence: number
  captured_at: string
}

export type VerificationItem = {
  id: number
  citizen: string
  fixed: boolean
  comment: string
  created_at: string
}

export type VerificationSummary = {
  total: number
  fixed: number
  not_fixed: number
  items: VerificationItem[]
}

export type Complaint = {
  id: number
  code: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  priority_score: number
  priority_reasons: string[]
  address: string
  department?: number
  department_name?: string
  supports_count?: number
  location?: { type: string; coordinates: [number, number] }
  sla_deadline?: string
  sla_breached?: boolean
  assignment?: { id: number; worker: User; assigned_at: string; started_at?: string; completed_at?: string }
  images?: { id: number; image: string; created_at: string }[]
  resolution_evidence?: ResolutionEvidence
  comments?: Comment[]
  verifications?: VerificationSummary
  citizen?: User
  created_at: string
  updated_at: string
  resolved_at?: string
}

export type InfrastructureAsset = {
  id: number
  asset_id: string
  asset_type: string
  location?: { type: string; coordinates: [number, number] }
  installation_date?: string
  last_inspection?: string
  last_repair?: string
  health_score: number
  risk_score: number
  maintenance_count?: number
  inspections_count?: number
  metadata: Record<string, any>
  created_at: string
}

export type Department = {
  id: number
  name: string
  code: string
  categories: string[]
  head?: number
}

export type Notification = {
  id: number
  user: number
  title: string
  message: string
  read: boolean
  complaint?: number
  created_at: string
}

export type Dashboard = {
  total_complaints: number
  open_complaints: number
  resolved_complaints: number
  critical_issues: number
  sla_breaches: number
  infrastructure_risk: number
  categories: { category: string; count: number }[]
  departments: { name: string; count: number }[]
}

export type AnalyticsData = {
  status: { status: string; count: number }[]
  priority: { priority: string; count: number }[]
  category: { category: string; count: number }[]
  monthly: { month: string; count: number }[]
}

export type AIClassificationResult = {
  category: string
  confidence: number
  suggested_priority: string
  priority_score: number
  reasons: string[]
}

export type MapPinData = {
  id: number
  code: string
  title: string
  category: string
  status: string
  priority: string
  priority_score: number
  address: string
  department_name: string
  supports_count: number
  lat: number
  lng: number
  created_at: string
}

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('civifix_access') : null
}
function refreshToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('civifix_refresh') : null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const t = token()
  if (t) headers.set('Authorization', `Bearer ${t}`)
  let res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' })

  // Automatic token refresh on 401
  if (res.status === 401 && typeof window !== 'undefined') {
    const rf = refreshToken()
    if (rf) {
      try {
        const refreshRes = await fetch(`${API_ROOT}/api/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: rf }),
        })
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          if (refreshData.access) {
            localStorage.setItem('civifix_access', refreshData.access)
            headers.set('Authorization', `Bearer ${refreshData.access}`)
            res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: 'no-store' })
          }
        }
      } catch {
        // fallback
      }
    }
  }

  if (!res.ok) {
    const errText = await res.text()
    let errorMsg = `Request failed (${res.status})`
    try {
      const parsed = JSON.parse(errText)
      if (typeof parsed === 'object' && parsed !== null) {
        const messages = Object.entries(parsed).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        errorMsg = messages.join(' | ')
      }
    } catch {
      if (errText) errorMsg = errText
    }
    throw new Error(errorMsg)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: async (username: string, password: string) => {
    const r = await fetch(`${API_ROOT}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json() as Promise<{ access: string; refresh: string }>
  },
  register: (body: Record<string, unknown>) =>
    request<{ user: User; access: string; refresh: string }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<User>('/auth/me/'),
  dashboard: () => request<Dashboard>('/analytics/dashboard/'),
  complaints: (params: { all?: boolean; mine?: boolean } = {}) => {
    const qs = new URLSearchParams()
    if (params.all) qs.set('all', 'true')
    if (params.mine) qs.set('mine', 'true')
    const query = qs.toString() ? `?${qs.toString()}` : ''
    return request<Complaint[]>(`/complaints/${query}`)
  },
  getComplaint: (id: number) => request<Complaint>(`/complaints/${id}/`),
  createComplaint: (body: Record<string, unknown>) =>
    request<Complaint>('/complaints/', { method: 'POST', body: JSON.stringify(body) }),
  transition: (id: number, status: string, reason = '') =>
    request<Complaint>(`/complaints/${id}/transition/`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    }),
  support: (id: number) =>
    request<{ supported: boolean; count: number }>(`/complaints/${id}/support/`, { method: 'POST' }),
  getComments: (id: number) => request<Comment[]>(`/complaints/${id}/comment/`),
  addComment: (id: number, body: string) =>
    request<Comment>(`/complaints/${id}/comment/`, { method: 'POST', body: JSON.stringify({ body }) }),
  getHistory: (id: number) => request<StatusHistory[]>(`/complaints/${id}/history/`),
  getSimilar: (id: number) =>
    request<{ id: number; code: string; title: string; similarity: number }[]>(`/complaints/${id}/similar/`),
  uploadImage: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return request<{ id: number; image: string; created_at: string }>(`/complaints/${id}/upload_image/`, {
      method: 'POST',
      body: fd,
    })
  },
  resolveComplaint: (id: number, formData: FormData) =>
    request<Complaint>(`/complaints/${id}/resolve/`, { method: 'POST', body: formData }),
  assignComplaint: (id: number, worker_id: number) =>
    request<{ assignment_id: number; status: string; worker: User }>(`/complaints/${id}/assign/`, {
      method: 'POST',
      body: JSON.stringify({ worker_id }),
    }),
  communityVerify: (id: number, fixed: boolean, comment = '') =>
    request<{ fixed: boolean; negative_votes: number; status: string }>(`/complaints/${id}/community-verify/`, {
      method: 'POST',
      body: JSON.stringify({ fixed, comment }),
    }),
  map: (mine = false) => request<MapPinData[]>(`/map/${mine ? '?mine=true' : ''}`),
  classify: (title: string, description: string) =>
    request<AIClassificationResult>('/ai/classify/', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),
  getAssets: () => request<InfrastructureAsset[]>('/infrastructure/'),
  calculateAssetRisk: (id: number) =>
    request<{ risk_score: number; health_score: number; reasons: string[] }>(
      `/infrastructure/${id}/calculate-risk/`,
      { method: 'POST' }
    ),
  getWorkers: () => request<User[]>('/workers/'),
  getDepartments: () => request<Department[]>('/departments/'),
  getAnalytics: () => request<AnalyticsData>('/analytics/'),
  notifications: () => request<Notification[]>('/notifications/'),
  markNotificationRead: (id: number) => request<{ read: boolean }>(`/notifications/${id}/read/`, { method: 'POST' }),
  markAllNotificationsRead: () => request<{ read_all: boolean }>('/notifications/mark_all_read/', { method: 'POST' }),
  searchLocation: (query: string) =>
    request<{ display_name: string; lat: string; lon: string }[]>(
      `/geocode/search/?q=${encodeURIComponent(query)}`
    ),
  reverseGeocode: (lat: number, lon: number) =>
    request<{ display_name: string }>(`/geocode/reverse/?lat=${lat}&lon=${lon}`),
  getEmails: (complaintId?: number) =>
    request<{ id: number; recipient: string; subject: string; body: string; status: string; created_at: string; complaint?: number }[]>(
      `/emails/${complaintId ? `?complaint_id=${complaintId}` : ''}`
    ),
}
