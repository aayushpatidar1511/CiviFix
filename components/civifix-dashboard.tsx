'use client'

import React, { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

const RealCityMap = dynamic(() => import('@/components/map-components').then((mod) => mod.RealCityMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 380, display: 'grid', placeItems: 'center', background: '#eef3f2', borderRadius: 10, color: '#5f7378', fontSize: 12 }}>
      Loading Real Street Map...
    </div>
  ),
})

const ReportMapPicker = dynamic(() => import('@/components/map-components').then((mod) => mod.ReportMapPicker), {
  ssr: false,
  loading: () => (
    <div style={{ height: 200, display: 'grid', placeItems: 'center', background: '#eef3f2', borderRadius: 8, color: '#5f7378', fontSize: 12 }}>
      Loading Interactive Location Picker...
    </div>
  ),
})
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Eye,
  FilePlus2,
  Filter,
  Gauge,
  HelpCircle,
  History,
  Image as ImageIcon,
  Info,
  Layers3,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import {
  AIClassificationResult,
  AnalyticsData,
  api,
  Comment,
  Complaint,
  Dashboard,
  Department,
  InfrastructureAsset,
  MapPinData,
  Notification,
  StatusHistory,
  User,
} from '@/lib/api'

const navItems = [
  { label: 'Overview', icon: Gauge },
  { label: 'Issue intelligence', icon: Layers3 },
  { label: 'Assignments', icon: Navigation },
  { label: 'Infrastructure', icon: Building2 },
  { label: 'Analytics', icon: ArrowUpRight },
]

const demoPersonas = [
  { label: 'City Admin', username: 'aayush_patidar', role: 'CITY_ADMIN', name: 'Aayush Patidar' },
  { label: 'Department Officer', username: 'department_user', role: 'DEPARTMENT_OFFICER', name: 'Department User' },
  { label: 'Field Worker', username: 'worker', role: 'FIELD_WORKER', name: 'Worker' },
  { label: 'Citizen', username: 'aayush', role: 'CITIZEN', name: 'Aayush' },
]

const cityPresets = [
  { name: 'Lakeview Metro Road', lat: '22.7196', lng: '75.8577' },
  { name: 'Palasia Square Junction', lat: '22.7244', lng: '75.8839' },
  { name: 'Rajwada Market Sector B', lat: '22.7120', lng: '75.8620' },
  { name: 'Chhappan Dukan Lane 4', lat: '22.7280', lng: '75.8900' },
  { name: 'Tilak Nagar Primary School', lat: '22.7350', lng: '75.8680' },
  { name: 'Scheme 54, Vijay Nagar', lat: '22.7533', lng: '75.8950' },
]

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  const cleanTone = (tone || 'neutral').toLowerCase().replaceAll('_', '-')
  return <span className={`status-pill status-${cleanTone}`}>{children}</span>
}

export function CiviFixDashboard() {
  // Navigation & Shell state
  const [activeNav, setActiveNav] = useState('Overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showNotifDrawer, setShowNotifDrawer] = useState(false)

  // Auth state
  const [isAuth, setIsAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState('')
  const [credentials, setCredentials] = useState({ username: 'aayush_patidar', password: 'CiviFix@2026' })
  const [regForm, setRegForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
  })

  // Core Data state
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [issues, setIssues] = useState<Complaint[]>([])
  const [assets, setAssets] = useState<InfrastructureAsset[]>([])
  const [workers, setWorkers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [mapPins, setMapPins] = useState<MapPinData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filter state
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All issues')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Issue Detail Drawer State
  const [selectedIssue, setSelectedIssue] = useState<Complaint | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'comments' | 'timeline' | 'proof' | 'similar' | 'verify' | 'emails'>('overview')
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [similarIssues, setSimilarIssues] = useState<{ id: number; code: string; title: string; similarity: number }[]>([])
  const [issueEmails, setIssueEmails] = useState<{ id: number; recipient: string; subject: string; body: string; status: string; created_at: string }[]>([])
  const [showAllEmailsModal, setShowAllEmailsModal] = useState(false)
  const [allEmails, setAllEmails] = useState<{ id: number; recipient: string; subject: string; body: string; status: string; created_at: string }[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [assignWorkerId, setAssignWorkerId] = useState<number | ''>('')
  const [verifyComment, setVerifyComment] = useState('')

  // Field Worker Resolution Modal
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolveBeforeFile, setResolveBeforeFile] = useState<File | null>(null)
  const [resolveAfterFile, setResolveAfterFile] = useState<File | null>(null)
  const [resolving, setResolving] = useState(false)

  // AI Classification Sandbox
  const [aiSandboxTitle, setAiSandboxTitle] = useState('Deep sinkhole crater near school gate')
  const [aiSandboxDesc, setAiSandboxDesc] = useState('A 3-foot deep sinkhole has developed on the main roadway right next to the school entrance, threatening student buses and morning traffic.')
  const [aiResult, setAiResult] = useState<AIClassificationResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Infrastructure AI Risk Modal
  const [riskModalData, setRiskModalData] = useState<{ assetName: string; risk: number; health: number; reasons: string[] } | null>(null)

  // Report Issue Form State
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    category: 'POTHOLE',
    lat: '22.7196',
    lng: '75.8577',
    address: 'Opposite Metro Station Gate 2, Lakeview Road',
  })
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [submittingReport, setSubmittingReport] = useState(false)
  const [detectingAi, setDetectingAi] = useState(false)

  // Interactive Map State
  const [mapZoom, setMapZoom] = useState(1)
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const [isDraggingMap, setIsDraggingMap] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredPin, setHoveredPin] = useState<MapPinData | null>(null)

  // Logged-in User's Live Current GPS Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocatingUser, setIsLocatingUser] = useState(false)
  const [reportSuccessMsg, setReportSuccessMsg] = useState('')

  const handleDetectUserLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsLocatingUser(true)
    const tryDetect = (highAcc: boolean) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setIsLocatingUser(false)
          const loc = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          }
          setUserLocation(loc)
          setReportForm((prev) => ({
            ...prev,
            lat: String(loc.lat),
            lng: String(loc.lng),
          }))
          try {
            const data = await api.reverseGeocode(loc.lat, loc.lng)
            if (data?.display_name) {
              setReportForm((prev) => ({ ...prev, address: data.display_name }))
            }
          } catch {
            // pass
          }
        },
        (err) => {
          if (highAcc) {
            tryDetect(false)
          } else {
            setIsLocatingUser(false)
            alert('Could not access current location. Please grant permission in your browser address bar.')
          }
        },
        { enableHighAccuracy: highAcc, timeout: highAcc ? 4000 : 8000, maximumAge: 60000 }
      )
    }
    tryDetect(true)
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      handleDetectUserLocation()
    }
  }, [isAuth])

  // Initial Authentication check
  useEffect(() => {
    const token = localStorage.getItem('civifix_access')
    if (token) {
      setIsAuth(true)
      fetchUserProfile()
    } else {
      setIsAuth(false)
    }
  }, [])

  // Fetch current user details
  async function fetchUserProfile() {
    try {
      const user = await api.me()
      setCurrentUser(user)
      loadDashboardData()
    } catch {
      localStorage.removeItem('civifix_access')
      localStorage.removeItem('civifix_refresh')
      setIsAuth(false)
    }
  }

  // Load all platform data
  async function loadDashboardData() {
    try {
      setLoading(true)
      const [dash, comp, ast, wrk, dep, notif, pins, ana] = await Promise.all([
        api.dashboard().catch(() => null),
        api.complaints({ all: true }).catch(() => []),
        api.getAssets().catch(() => []),
        api.getWorkers().catch(() => []),
        api.getDepartments().catch(() => []),
        api.notifications().catch(() => []),
        api.map().catch(() => []),
        api.getAnalytics().catch(() => null),
      ])
      setDashboard(dash)
      setIssues(comp)
      setAssets(ast)
      setWorkers(wrk)
      setDepartments(dep)
      setNotifications(notif)
      setMapPins(pins)
      setAnalyticsData(ana)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load CiviFix data')
    } finally {
      setLoading(false)
    }
  }

  // Login handler
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      setAuthError('')
      const r = await api.login(credentials.username, credentials.password)
      localStorage.setItem('civifix_access', r.access)
      localStorage.setItem('civifix_refresh', r.refresh)
      setIsAuth(true)
      await fetchUserProfile()
    } catch {
      setAuthError('Invalid username or password. Please try again.')
    }
  }

  // Register handler
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    try {
      setAuthError('')
      const r = await api.register({ ...regForm, role: 'CITIZEN' })
      localStorage.setItem('civifix_access', r.access)
      localStorage.setItem('civifix_refresh', r.refresh)
      setIsAuth(true)
      await fetchUserProfile()
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed')
    }
  }

  // Quick Persona Switcher
  async function switchPersona(username: string) {
    try {
      setLoading(true)
      const r = await api.login(username, 'CiviFix@2026')
      localStorage.setItem('civifix_access', r.access)
      localStorage.setItem('civifix_refresh', r.refresh)
      setIsAuth(true)
      setCredentials({ username, password: 'CiviFix@2026' })
      await fetchUserProfile()
    } catch (e) {
      setError('Persona switch failed')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.clear()
    setIsAuth(false)
    setCurrentUser(null)
  }

  // Open Issue Detail Drawer
  async function openIssueDetail(issue: Complaint) {
    setSelectedIssue(issue)
    setDrawerTab('overview')
    try {
      const [full, comms, hist, sim, ems] = await Promise.all([
        api.getComplaint(issue.id).catch(() => issue),
        api.getComments(issue.id).catch(() => []),
        api.getHistory(issue.id).catch(() => []),
        api.getSimilar(issue.id).catch(() => []),
        api.getEmails(issue.id).catch(() => []),
      ])
      setSelectedIssue(full)
      setComments(comms)
      setHistory(hist)
      setSimilarIssues(sim)
      setIssueEmails(ems)
    } catch {
      // fallback to already fetched complaint
    }
  }

  // Transition Issue Status
  async function handleStatusTransition(newStatus: string, reason = '', targetIssueId?: number) {
    const id = targetIssueId ?? selectedIssue?.id
    if (!id) return
    try {
      const updated = await api.transition(id, newStatus, reason)
      if (selectedIssue && selectedIssue.id === id) {
        setSelectedIssue(updated)
        api.getEmails(id).then(setIssueEmails).catch(() => {})
      }
      await loadDashboardData()
    } catch (err: any) {
      alert(`Status transition error: ${err.message}`)
    }
  }

  // Assign Issue to Field Worker
  async function handleAssignWorker() {
    if (!selectedIssue || !assignWorkerId) return
    try {
      await api.assignComplaint(selectedIssue.id, Number(assignWorkerId))
      const updated = await api.getComplaint(selectedIssue.id)
      setSelectedIssue(updated)
      setAssignWorkerId('')
      await loadDashboardData()
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`)
    }
  }

  // Upvote / Support issue
  async function handleSupport(issueId: number) {
    try {
      const res = await api.support(issueId)
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue({ ...selectedIssue, supports_count: res.count })
      }
      setIssues(issues.map((i) => (i.id === issueId ? { ...i, supports_count: res.count } : i)))
    } catch (err: any) {
      alert(`Support error: ${err.message}`)
    }
  }

  // Add Comment
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIssue || !newComment.trim()) return
    try {
      setCommentLoading(true)
      const added = await api.addComment(selectedIssue.id, newComment.trim())
      setComments([...comments, added])
      setNewComment('')
    } catch (err: any) {
      alert(`Could not post comment: ${err.message}`)
    } finally {
      setCommentLoading(false)
    }
  }

  // Community Verification vote
  async function handleCommunityVote(fixed: boolean) {
    if (!selectedIssue) return
    try {
      await api.communityVerify(selectedIssue.id, fixed, verifyComment)
      const updated = await api.getComplaint(selectedIssue.id)
      setSelectedIssue(updated)
      setVerifyComment('')
      await loadDashboardData()
    } catch (err: any) {
      alert(`Verification vote error: ${err.message}`)
    }
  }

  // Submit Field Worker Resolution Evidence
  async function handleWorkerResolve(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedIssue) return
    try {
      setResolving(true)
      const fd = new FormData()
      fd.append('notes', resolveNotes)
      if (resolveBeforeFile) fd.append('before_image', resolveBeforeFile)
      if (resolveAfterFile) fd.append('after_image', resolveAfterFile)

      const updated = await api.resolveComplaint(selectedIssue.id, fd)
      setSelectedIssue(updated)
      setShowResolveModal(false)
      setResolveNotes('')
      setResolveBeforeFile(null)
      setResolveAfterFile(null)
      await loadDashboardData()
    } catch (err: any) {
      alert(`Resolution error: ${err.message}`)
    } finally {
      setResolving(false)
    }
  }

  // Recalculate Infrastructure AI Risk
  async function handleRecalculateRisk(asset: InfrastructureAsset) {
    try {
      const res = await api.calculateAssetRisk(asset.id)
      setRiskModalData({
        assetName: asset.metadata?.name || asset.asset_type,
        risk: res.risk_score,
        health: res.health_score,
        reasons: res.reasons,
      })
      await loadDashboardData()
    } catch (err: any) {
      alert(`Risk calculation error: ${err.message}`)
    }
  }

  // Live AI Auto-Detect in Report Form
  async function handleAiDetectInReport() {
    if (!reportForm.title && !reportForm.description) {
      alert('Please enter a title or description first to auto-detect!')
      return
    }
    try {
      setDetectingAi(true)
      const res = await api.classify(reportForm.title, reportForm.description)
      setReportForm((prev) => ({
        ...prev,
        category: res.category,
      }))
    } catch {
      // fallback
    } finally {
      setDetectingAi(false)
    }
  }

  // Run AI Classifier in Sandbox
  async function runAiSandbox() {
    try {
      setAiLoading(true)
      const res = await api.classify(aiSandboxTitle, aiSandboxDesc)
      setAiResult(res)
    } catch {
      // fallback
    } finally {
      setAiLoading(false)
    }
  }

  // Submit Issue Report
  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSubmittingReport(true)
      const latNum = parseFloat(String(reportForm.lat))
      const lngNum = parseFloat(String(reportForm.lng))
      const finalLat = !isNaN(latNum) && latNum !== 0 ? latNum : (userLocation?.lat || 22.7196)
      const finalLng = !isNaN(lngNum) && lngNum !== 0 ? lngNum : (userLocation?.lng || 75.8577)

      const complaint = await api.createComplaint({
        title: reportForm.title.trim(),
        description: reportForm.description.trim(),
        category: reportForm.category,
        location: {
          type: 'Point',
          coordinates: [finalLng, finalLat],
        },
        address: reportForm.address.trim() || `Coordinates: ${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}`,
      })

      if (reportFile && complaint.id) {
        try {
          await api.uploadImage(complaint.id, reportFile)
        } catch (imgErr) {
          console.warn('Image upload skipped or failed:', imgErr)
        }
      }

      setShowReport(false)
      setReportForm({
        title: '',
        description: '',
        category: 'POTHOLE',
        lat: String(finalLat),
        lng: String(finalLng),
        address: reportForm.address,
      })
      setReportFile(null)
      setReportSuccessMsg(`Complaint ${complaint.code} registered! Automated notifications dispatched.`)
      setTimeout(() => setReportSuccessMsg(''), 7000)
      await loadDashboardData()
    } catch (err: any) {
      alert(`Report failed: ${err.message}`)
    } finally {
      setSubmittingReport(false)
    }
  }

  // Filtered issues list
  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const matchesQuery = `${i.title} ${i.category} ${i.code} ${i.address}`.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'All issues' || i.priority === filter || i.status === filter
      const matchesCategory = categoryFilter === 'ALL' || i.category === categoryFilter
      return matchesQuery && matchesFilter && matchesCategory
    })
  }, [issues, query, filter, categoryFilter])

  // Unread notification count
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  // If not logged in, render sleek Auth View
  if (!isAuth) {
    return (
      <main className="civifix-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="report-modal login-card" style={{ maxWidth: 440, width: '90%' }}>
          <div className="brand-row" style={{ padding: '0 0 16px' }}>
            <div className="brand-mark">
              <Zap size={16} fill="currentColor" />
            </div>
            <span>CiviFix</span>
          </div>
          <div className="panel-kicker" style={{ marginBottom: 8 }}>
            <ShieldCheck size={14} /> Smart City Operations Platform
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>
            {authMode === 'login' ? 'Sign in to CiviFix' : 'Register Citizen Account'}
          </h1>
          <p style={{ margin: '0 0 20px', color: '#6d7f85', fontSize: 12 }}>
            {authMode === 'login'
              ? 'Access real-time civic intelligence, dispatch workflows, and infrastructure health.'
              : 'Join fellow citizens to report, track, and verify city resolutions.'}
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: '#eef2f1', padding: 4, borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 0,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: authMode === 'login' ? '#fff' : 'transparent',
                color: authMode === 'login' ? '#176b67' : '#728186',
                boxShadow: authMode === 'login' ? '0 2px 5px #0001' : 'none',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 0,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: authMode === 'register' ? '#fff' : 'transparent',
                color: authMode === 'register' ? '#176b67' : '#728186',
                boxShadow: authMode === 'register' ? '0 2px 5px #0001' : 'none',
              }}
            >
              Citizen Sign Up
            </button>
          </div>

          {authError && (
            <div style={{ background: '#fff0ec', color: '#be3e2b', padding: '9px 12px', borderRadius: 6, fontSize: 11, marginBottom: 14 }}>
              {authError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <label>
                Username
                <input
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Enter username"
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Enter password"
                />
              </label>
              <button className="primary-button" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>
                Sign in to Dashboard <ArrowUpRight size={16} />
              </button>

              <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #e7eeec' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8b9a9f', textTransform: 'uppercase' }}>
                  One-Click Demo Personas:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                  {demoPersonas.map((p) => (
                    <button
                      key={p.username}
                      type="button"
                      onClick={() => switchPersona(p.username)}
                      style={{
                        padding: '7px 8px',
                        borderRadius: 6,
                        border: '1px solid #d9e4e1',
                        background: '#f8faf9',
                        fontSize: 10,
                        fontWeight: 650,
                        color: '#34474d',
                        textAlign: 'left',
                      }}
                    >
                      <strong style={{ display: 'block', color: '#176b67' }}>{p.label}</strong>
                      <span style={{ fontSize: 9, color: '#88989d' }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label>
                  First Name
                  <input
                    required
                    value={regForm.first_name}
                    onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                    placeholder="Enter first name"
                  />
                </label>
                <label>
                  Last Name
                  <input
                    required
                    value={regForm.last_name}
                    onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                    placeholder="Enter last name"
                  />
                </label>
              </div>
              <label>
                Username
                <input
                  required
                  value={regForm.username}
                  onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                  placeholder="Enter username"
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="example@gmail.com"
                />
              </label>
              <label>
                Password (min 8 characters)
                <input
                  required
                  type="password"
                  minLength={8}
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="Enter password"
                />
              </label>
              <label>
                Phone Number
                <input
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                />
              </label>
              <button className="primary-button" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                Create Citizen Account <Plus size={16} />
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  // Logged-in Main App Shell
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. TOP PERSONA QUICK-SWITCHER BAR */}
      <section className="persona-bar">
        <span className="persona-label">
          <UserCheck size={13} /> Active Persona:
        </span>
        <div className="persona-pills">
          {demoPersonas.map((p) => {
            const isActive = currentUser?.role === p.role
            return (
              <button
                key={p.username}
                type="button"
                className={`persona-pill ${isActive ? 'active' : ''}`}
                onClick={() => switchPersona(p.username)}
              >
                <span>{p.label}</span>
                <span className="persona-role-badge">{p.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      <main className="civifix-shell" style={{ flex: 1 }}>
        {/* SIDEBAR NAVIGATION */}
        <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
          <div className="brand-row">
            <div className="brand-mark">
              <Zap size={16} fill="currentColor" />
            </div>
            <span>CiviFix</span>
            <button className="mobile-close" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="workspace-switcher">
            <div className="workspace-avatar">
              {currentUser?.first_name?.[0] || 'U'}
              {currentUser?.last_name?.[0] || 'F'}
            </div>
            <div>
              <strong>{currentUser?.first_name} {currentUser?.last_name}</strong>
              <span>{currentUser?.role?.replace('_', ' ')}</span>
            </div>
            <ChevronDown size={14} />
          </div>

          <nav className="main-nav">
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={activeNav === label ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setActiveNav(label)
                  setMobileOpen(false)
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {label === 'Overview' && (
                  <span className="nav-count">{dashboard?.open_complaints ?? issues.length}</span>
                )}
                {label === 'Assignments' && (
                  <span className="nav-count">
                    {currentUser?.role === 'FIELD_WORKER'
                      ? issues.filter((i) => i.assignment?.worker?.id === currentUser?.id).length
                      : issues.filter((i) => i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS').length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-label">Operations</div>
          <nav className="main-nav">
            <button
              className={activeNav === 'City alerts' ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setActiveNav('City alerts')
                setMobileOpen(false)
              }}
            >
              <Siren size={17} />
              <span>City alerts</span>
              {unreadCount > 0 && <span className="alert-dot" />}
            </button>
            <button
              className={activeNav === 'Teams' ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setActiveNav('Teams')
                setMobileOpen(false)
              }}
            >
              <Users size={17} />
              <span>Teams</span>
            </button>
            <button
              className={activeNav === 'Verification' ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setActiveNav('Verification')
                setMobileOpen(false)
              }}
            >
              <ShieldCheck size={17} />
              <span>Verification</span>
              <span className="nav-count">
                {issues.filter((i) => i.status === 'RESOLVED' || i.status === 'COMMUNITY_VERIFIED').length}
              </span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="help-card" onClick={() => setActiveNav('Issue intelligence')} style={{ cursor: 'pointer' }}>
              <Sparkles size={16} />
              <div>
                <strong>AI Intelligence</strong>
                <span>Scikit-Learn ML Ready</span>
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-avatar">
                {currentUser?.username?.slice(0, 2).toUpperCase() || 'CF'}
              </div>
              <div>
                <strong>{currentUser?.username}</strong>
                <span>{currentUser?.role?.toLowerCase()}</span>
              </div>
              <button className="row-menu" title="Sign out" onClick={handleLogout}>
                <MoreHorizontal size={17} />
              </button>
            </div>
          </div>
        </aside>

        {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

        {/* MAIN APPLICATION VIEWPORT */}
        <section className="main-area">
          {/* TOPBAR */}
          <header className="topbar">
            <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>CiviFix Smart City</span>
              <span>/</span>
              <strong>{activeNav}</strong>
            </div>

            <div className="topbar-actions">
              <button
                className="icon-button"
                onClick={async () => {
                  try {
                    const ems = await api.getEmails()
                    setAllEmails(ems)
                  } catch {}
                  setShowAllEmailsModal(true)
                }}
                title="Dispatched Email Notifications Outbox"
                style={{
                  background: '#f0f5f4',
                  border: '1px solid #d0e0dc',
                  color: '#176b67',
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Mail size={17} />
              </button>
              <button
                className="notification-button"
                onClick={() => setShowNotifDrawer(true)}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span />}
              </button>
              <div
                className="top-avatar"
                title={`${currentUser?.first_name} (${currentUser?.role})`}
                style={{ cursor: 'pointer' }}
                onClick={handleLogout}
              >
                {currentUser?.first_name?.[0] || 'A'}
              </div>
            </div>
          </header>

          <div className="page-content">
            {/* VIEW HEADER */}
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="live-dot" />
                  Live Metro Grid <span className="eyebrow-divider" /> PostGIS Connected
                </div>
                <h1>
                  {activeNav === 'Overview' && 'City operations intelligence.'}
                  {activeNav === 'Issue intelligence' && 'AI & predictive triage.'}
                  {activeNav === 'Assignments' && 'Field service & dispatch.'}
                  {activeNav === 'Infrastructure' && 'Asset health & risk monitor.'}
                  {activeNav === 'Analytics' && 'Civic performance metrics.'}
                  {activeNav === 'City alerts' && 'Live city alerts & escalations.'}
                  {activeNav === 'Teams' && 'Departments & field workers.'}
                  {activeNav === 'Verification' && 'Community resolution verification.'}
                </h1>
                <p>
                  {currentUser?.role === 'CITIZEN' && 'Report civic issues, upvote community concerns, and verify resolutions.'}
                  {currentUser?.role === 'FIELD_WORKER' && 'Track your dispatched tasks, navigate to locations, and upload proof of resolution.'}
                  {currentUser?.role === 'DEPARTMENT_OFFICER' && 'Triage incoming department complaints, dispatch field workers, and monitor SLAs.'}
                  {currentUser?.role === 'CITY_ADMIN' && 'Real-time citywide operations, asset risk calculations, and automated escalations.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="soft-button" onClick={loadDashboardData}>
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
                <button className="primary-button" onClick={() => setShowReport(true)}>
                  <Plus size={18} /> Report an issue
                </button>
              </div>
            </div>

            {error && <div className="empty-state" style={{ background: '#fff0ec', color: '#c44' }}>{error}</div>}

            {/* TAB 1: OVERVIEW */}
            {activeNav === 'Overview' && (
              <>
                {/* METRICS STAT GRID */}
                <div className="stat-grid">
                  <article className="stat-card stat-dark">
                    <div className="stat-header">
                      <span>Open issues</span>
                      <Layers3 size={16} />
                    </div>
                    <div className="stat-value">{dashboard?.open_complaints ?? issues.length}</div>
                    <div className="stat-foot">
                      <span>PostgreSQL / PostGIS</span>
                    </div>
                  </article>

                  <article className="stat-card">
                    <div className="stat-header">
                      <span>Resolved</span>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="stat-value">{dashboard?.resolved_complaints ?? 0}</div>
                    <div className="stat-foot">
                      <span className="positive">Completed work</span>
                    </div>
                  </article>

                  <article className="stat-card">
                    <div className="stat-header">
                      <span>SLA breaches</span>
                      <Clock3 size={16} />
                    </div>
                    <div className="stat-value">{dashboard?.sla_breaches ?? 0}</div>
                    <div className="stat-foot">
                      <span className="warning">Celery beat monitored</span>
                    </div>
                  </article>

                  <article className="stat-card stat-warm">
                    <div className="stat-header">
                      <span>Critical attention</span>
                      <AlertTriangle size={16} />
                    </div>
                    <div className="stat-value">{dashboard?.critical_issues ?? 0}</div>
                    <div className="stat-foot">
                      <span>Immediate dispatch</span>
                    </div>
                  </article>
                </div>

                {/* MAP & AI BRIEFING SECTION */}
                <div className="section-grid">
                  {/* REAL OPENSTREETMAP & LIVE GPS PANEL */}
                  <article className="panel map-panel">
                    <div className="panel-header">
                      <div>
                        <div className="panel-kicker">
                          <MapPin size={14} /> Real OpenStreetMap & GPS
                        </div>
                        <h2>Interactive City Map ({mapPins.length} issues)</h2>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleDetectUserLocation}
                          disabled={isLocatingUser}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            background: '#e8f4f2',
                            color: '#176b67',
                            border: '1px solid #b2d8d2',
                            borderRadius: 6,
                            padding: '4px 10px',
                            cursor: 'pointer',
                          }}
                          title="Detect and view your live current GPS location on map"
                        >
                          <Navigation size={13} />
                          {isLocatingUser ? 'Detecting GPS...' : userLocation ? '📍 My Location Active' : '📍 View My Current Location'}
                        </button>
                        {userLocation && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#176b67', display: 'flex', alignItems: 'center', gap: 4, background: '#e8f4f2', padding: '3px 8px', borderRadius: 12 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#176b67' }} />
                            GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                          </span>
                        )}
                        <StatusPill tone="low">OpenStreetMap</StatusPill>
                      </div>
                    </div>

                    <div style={{ padding: '0 20px 20px' }}>
                      <RealCityMap
                        pins={mapPins}
                        issues={issues}
                        onSelectIssue={openIssueDetail}
                        userLocation={userLocation}
                      />
                    </div>
                  </article>

                  {/* AI BRIEFING PANEL */}
                  <article className="panel briefing-panel">
                    <div className="panel-header">
                      <div>
                        <div className="panel-kicker">
                          <Sparkles size={14} /> CiviFix Intelligence
                        </div>
                        <h2>Today&apos;s City Briefing</h2>
                      </div>
                      <StatusPill tone="ai">AI Engine Active</StatusPill>
                    </div>

                    <div className="briefing-intro">Real-time analytical patterns calculated from your live database.</div>

                    <div className="briefing-list">
                      <div className="briefing-item">
                        <div className="briefing-icon coral">
                          <AlertTriangle size={16} />
                        </div>
                        <div>
                          <strong>{dashboard?.critical_issues ?? 0} Critical civic hazards</strong>
                          <p>Emergency response teams notified. Potholes and pipeline failures prioritized.</p>
                        </div>
                      </div>

                      <div className="briefing-item">
                        <div className="briefing-icon amber">
                          <Clock3 size={16} />
                        </div>
                        <div>
                          <strong>{dashboard?.sla_breaches ?? 0} SLA Breaches escalated</strong>
                          <p>Celery beat escalation triggers automated department head notifications.</p>
                        </div>
                      </div>

                      <div className="briefing-item">
                        <div className="briefing-icon blue">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <strong>{dashboard?.infrastructure_risk ?? 0}% Average asset risk</strong>
                          <p>Calculated across {assets.length} monitored municipal structures and utility trunks.</p>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>

                {/* OPERATIONS QUEUE TABLE */}
                <div className="panel issues-panel">
                  <div className="panel-header">
                    <div>
                      <div className="panel-kicker">
                        <Layers3 size={14} /> Operations Queue
                      </div>
                      <h2>Live Civic Issue Activity ({filteredIssues.length})</h2>
                    </div>

                    <div className="table-actions">
                      <div className="search-field">
                        <Search size={14} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search issues, address, code..."
                        />
                      </div>

                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="ALL">All Categories</option>
                        {['POTHOLE', 'ROAD', 'STREETLIGHT', 'WATER', 'DRAINAGE', 'GARBAGE', 'ELECTRICITY', 'FOOTPATH', 'PUBLIC_TRANSPORT'].map((c) => (
                          <option key={c} value={c}>{c.replace('_', ' ')}</option>
                        ))}
                      </select>

                      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="All issues">All Status / Priority</option>
                        <option value="CRITICAL">Critical Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="REPORTED">Reported</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <div className="issue-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Issue Details</th>
                          <th>Location</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Supports</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIssues.map((issue) => (
                          <tr
                            key={issue.id}
                            onClick={() => openIssueDetail(issue)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <div className="issue-title">
                                <span className={`issue-icon ${issue.priority === 'CRITICAL' ? 'coral' : 'blue'}`}>
                                  <FilePlus2 size={15} />
                                </span>
                                <div>
                                  <strong>{issue.title}</strong>
                                  <span>{issue.code} · {issue.category.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="location-cell">
                                <MapPin size={13} />
                                {issue.address || 'Metro Coordinates'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: 11, color: '#526469' }}>
                                {issue.department_name || 'General Operations'}
                              </span>
                            </td>
                            <td>
                              <StatusPill tone={issue.status}>{issue.status}</StatusPill>
                            </td>
                            <td>
                              <StatusPill tone={issue.priority}>{issue.priority}</StatusPill>
                            </td>
                            <td>
                              <button
                                className="soft-button"
                                style={{ padding: '3px 8px' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSupport(issue.id)
                                }}
                              >
                                <ThumbsUp size={12} /> {issue.supports_count ?? 1}
                              </button>
                            </td>
                            <td>
                              <button className="soft-button" style={{ padding: '4px 8px' }}>
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!loading && filteredIssues.length === 0 && (
                      <div className="empty-state">No civic issues match your search filter.</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ISSUE INTELLIGENCE */}
            {activeNav === 'Issue intelligence' && (
              <div>
                {/* AI CLASSIFIER LIVE SANDBOX */}
                <div className="panel" style={{ padding: 22, marginBottom: 20 }}>
                  <div className="panel-header" style={{ padding: 0, marginBottom: 16 }}>
                    <div>
                      <div className="panel-kicker">
                        <Sparkles size={14} /> Scikit-Learn NLP Classifier
                      </div>
                      <h2>Live AI Triage & Classification Engine</h2>
                    </div>
                    <StatusPill tone="ai">v1.5 Logistic Regression</StatusPill>
                  </div>

                  <p style={{ fontSize: 12, color: '#687a80', margin: '0 0 16px' }}>
                    Type any civic complaint below to test how the scikit-learn TF-IDF model automatically infers the category, suggests SLA priority, and generates explainable triage rationales.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a5d63', marginBottom: 6 }}>
                        Complaint Title
                      </label>
                      <input
                        value={aiSandboxTitle}
                        onChange={(e) => setAiSandboxTitle(e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: 9, fontSize: 12, marginBottom: 12 }}
                      />

                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4a5d63', marginBottom: 6 }}>
                        Detailed Problem Description
                      </label>
                      <textarea
                        rows={4}
                        value={aiSandboxDesc}
                        onChange={(e) => setAiSandboxDesc(e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: 9, fontSize: 12, marginBottom: 12 }}
                      />

                      <button className="primary-button" onClick={runAiSandbox} disabled={aiLoading}>
                        <Sparkles size={15} /> {aiLoading ? 'Analyzing text...' : 'Predict Category & Priority'}
                      </button>
                    </div>

                    <div className="ai-classifier-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#6b3281', textTransform: 'uppercase' }}>
                          Model Inference Result
                        </span>
                        {aiResult && <StatusPill tone={aiResult.suggested_priority}>{aiResult.suggested_priority}</StatusPill>}
                      </div>

                      {aiResult ? (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#27173a' }}>
                            {aiResult.category.replace('_', ' ')}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#77528e', marginTop: 4 }}>
                            <span>Classification Confidence</span>
                            <strong>{Math.round(aiResult.confidence * 100)}%</strong>
                          </div>
                          <div className="ai-confidence-meter">
                            <div className="ai-confidence-fill" style={{ width: `${Math.round(aiResult.confidence * 100)}%` }} />
                          </div>

                          <div style={{ marginTop: 14 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#613b77' }}>Explainable Triage Reasons:</span>
                            <div style={{ marginTop: 6 }}>
                              {aiResult.reasons.map((r, i) => (
                                <span key={i} className="ai-reason-pill">
                                  <ShieldAlert size={11} /> {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '36px 0', color: '#9782a6', fontSize: 11 }}>
                          Click &quot;Predict Category & Priority&quot; to test the classifier.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SLA ESCALATION MONITOR */}
                <div className="panel" style={{ padding: 22 }}>
                  <div className="panel-header" style={{ padding: 0, marginBottom: 14 }}>
                    <div>
                      <div className="panel-kicker">
                        <Clock3 size={14} /> Celery Beat Escalation Queue
                      </div>
                      <h2>Active SLA Deadlines & Escalated Issues</h2>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Title</th>
                        <th>Priority</th>
                        <th>Department</th>
                        <th>SLA Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((i) => (
                        <tr key={i.id} onClick={() => openIssueDetail(i)} style={{ cursor: 'pointer' }}>
                          <td><strong>{i.code}</strong></td>
                          <td>{i.title}</td>
                          <td><StatusPill tone={i.priority}>{i.priority}</StatusPill></td>
                          <td>{i.department_name || 'Operations'}</td>
                          <td>
                            {i.status === 'ESCALATED' ? (
                              <span style={{ color: '#be3e2b', fontWeight: 700, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> BREACHED & ESCALATED
                              </span>
                            ) : (
                              <span style={{ color: '#176b67', fontSize: 10 }}>Within Turnaround Target</span>
                            )}
                          </td>
                          <td>
                            <button className="soft-button" style={{ padding: '3px 8px' }}>
                              Inspect <ArrowUpRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: ASSIGNMENTS (FIELD OPERATIONS) */}
            {activeNav === 'Assignments' && (
              <div>
                <div className="panel" style={{ padding: 22 }}>
                  <div className="panel-header" style={{ padding: 0, marginBottom: 16 }}>
                    <div>
                      <div className="panel-kicker">
                        <Navigation size={14} /> Field Service Dispatch
                      </div>
                      <h2>
                        {currentUser?.role === 'FIELD_WORKER'
                          ? 'My Assigned Tasks'
                          : 'Municipal Work Orders & Worker Assignments'}
                      </h2>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Issue Code</th>
                        <th>Title</th>
                        <th>Location</th>
                        <th>Assigned Worker</th>
                        <th>Status</th>
                        <th>Workflow Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues
                        .filter((i) =>
                          currentUser?.role === 'FIELD_WORKER'
                            ? i.assignment?.worker?.id === currentUser?.id || i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS'
                            : true
                        )
                        .map((issue) => (
                          <tr key={issue.id}>
                            <td><strong>{issue.code}</strong></td>
                            <td>
                              <div>
                                <strong>{issue.title}</strong>
                                <span style={{ display: 'block', fontSize: 9, color: '#7a898f' }}>{issue.category}</span>
                              </div>
                            </td>
                            <td><MapPin size={12} style={{ display: 'inline', marginRight: 3 }} /> {issue.address}</td>
                            <td>
                              {issue.assignment?.worker ? (
                                <span style={{ fontSize: 11, fontWeight: 650, color: '#176b67' }}>
                                  {issue.assignment.worker.first_name} {issue.assignment.worker.last_name}
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: '#97a3a6' }}>Unassigned</span>
                              )}
                            </td>
                            <td><StatusPill tone={issue.status}>{issue.status}</StatusPill></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="soft-button" onClick={() => openIssueDetail(issue)}>
                                  Details
                                </button>
                                {currentUser?.role === 'FIELD_WORKER' && issue.status === 'ASSIGNED' && (
                                  <button
                                    className="action-btn"
                                    onClick={() => handleStatusTransition('IN_PROGRESS', 'Worker arrived at site', issue.id)}
                                  >
                                    Start Work
                                  </button>
                                )}
                                {currentUser?.role === 'FIELD_WORKER' && issue.status === 'IN_PROGRESS' && (
                                  <button
                                    className="action-btn"
                                    onClick={() => {
                                      setSelectedIssue(issue)
                                      setShowResolveModal(true)
                                    }}
                                  >
                                    Submit Resolution
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: INFRASTRUCTURE & ASSET MANAGEMENT */}
            {activeNav === 'Infrastructure' && (
              <div>
                <div className="stat-grid">
                  <article className="stat-card">
                    <div className="stat-header"><span>Monitored Assets</span><Building2 size={16} /></div>
                    <div className="stat-value">{assets.length}</div>
                    <div className="stat-foot"><span>Bridges, culverts, trunks</span></div>
                  </article>
                  <article className="stat-card">
                    <div className="stat-header"><span>Average Health</span><CheckCircle2 size={16} /></div>
                    <div className="stat-value">
                      {assets.length ? Math.round(assets.reduce((s, a) => s + a.health_score, 0) / assets.length) : 0}%
                    </div>
                    <div className="stat-foot"><span className="positive">Structural integrity</span></div>
                  </article>
                  <article className="stat-card stat-warm">
                    <div className="stat-header"><span>High Risk Assets</span><AlertTriangle size={16} /></div>
                    <div className="stat-value">{assets.filter((a) => a.risk_score >= 70).length}</div>
                    <div className="stat-foot"><span className="warning">Requires maintenance</span></div>
                  </article>
                </div>

                <div className="asset-grid">
                  {assets.map((asset) => {
                    const isHigh = asset.risk_score >= 70
                    const isMed = asset.risk_score >= 40

                    return (
                      <article key={asset.id} className="asset-card">
                        <div>
                          <div className="asset-header">
                            <div>
                              <h3>{asset.metadata?.name || asset.asset_type}</h3>
                              <span className="asset-id">{asset.asset_id} · {asset.asset_type}</span>
                            </div>
                            <StatusPill tone={isHigh ? 'critical' : isMed ? 'high' : 'low'}>
                              {asset.risk_score}% Risk
                            </StatusPill>
                          </div>

                          <div className="health-meter-wrap">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#68797e' }}>
                              <span>Health Score</span>
                              <strong>{Math.round(asset.health_score)}%</strong>
                            </div>
                            <div className="health-bar">
                              <div
                                className={`health-bar-fill ${isHigh ? 'danger' : isMed ? 'warning' : ''}`}
                                style={{ width: `${Math.round(asset.health_score)}%` }}
                              />
                            </div>
                          </div>

                          <div className="asset-stats">
                            <div>
                              <span>Last Inspection</span>
                              <strong>{asset.last_inspection || 'Recent'}</strong>
                            </div>
                            <div>
                              <span>Repairs Performed</span>
                              <strong>{asset.maintenance_count ?? 1} maintenance</strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #edf2f1' }}>
                          <button
                            className="soft-button"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleRecalculateRisk(asset)}
                          >
                            <Sparkles size={13} /> Recalculate AI Risk Score
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: ANALYTICS */}
            {activeNav === 'Analytics' && (
              <div>
                <div className="analytics-grid">
                  {/* Category Breakdown */}
                  <article className="chart-card">
                    <h3><span>Complaints by Category</span><Layers3 size={16} /></h3>
                    <div className="bar-chart-list">
                      {dashboard?.categories?.map((cat) => (
                        <div key={cat.category} className="bar-row">
                          <div className="bar-row-label">
                            <span>{cat.category.replace('_', ' ')}</span>
                            <strong>{cat.count}</strong>
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{ width: `${Math.min(100, (cat.count / Math.max(1, issues.length)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  {/* Department Workload */}
                  <article className="chart-card">
                    <h3><span>Department Workload</span><Building2 size={16} /></h3>
                    <div className="bar-chart-list">
                      {dashboard?.departments?.map((dept) => (
                        <div key={dept.name} className="bar-row">
                          <div className="bar-row-label">
                            <span>{dept.name}</span>
                            <strong>{dept.count}</strong>
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{
                                width: `${Math.min(100, (dept.count / Math.max(1, issues.length)) * 100)}%`,
                                background: '#36897c',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </div>
            )}

            {/* TAB 6: CITY ALERTS */}
            {activeNav === 'City alerts' && (
              <div className="panel" style={{ padding: 22 }}>
                <div className="panel-header" style={{ padding: 0, marginBottom: 16 }}>
                  <div>
                    <div className="panel-kicker"><Siren size={14} /> Notification Stream</div>
                    <h2>Citywide Escalations & Status Updates</h2>
                  </div>
                  <button className="soft-button" onClick={() => api.markAllNotificationsRead().then(loadDashboardData)}>
                    Mark All as Read
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {notifications.map((notif) => (
                    <div key={notif.id} className={`notif-item ${notif.read ? '' : 'unread'}`}>
                      <div className="notif-title">{notif.title}</div>
                      <div className="notif-msg">{notif.message}</div>
                      <div className="notif-time">{new Date(notif.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: TEAMS */}
            {activeNav === 'Teams' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="panel" style={{ padding: 20 }}>
                  <h3>Municipal Departments ({departments.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {departments.map((d) => (
                      <div key={d.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fbfdfc' }}>
                        <strong>{d.name}</strong>
                        <span style={{ display: 'block', fontSize: 10, color: '#7a8a8e', marginTop: 4 }}>
                          Code: {d.code} · Handled: {d.categories?.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ padding: 20 }}>
                  <h3>Field Workers Roster ({workers.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {workers.map((w) => (
                      <div key={w.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fbfdfc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{w.first_name} {w.last_name}</strong>
                          <StatusPill tone="low">Field Worker</StatusPill>
                        </div>
                        <span style={{ display: 'block', fontSize: 10, color: '#7a8a8e', marginTop: 4 }}>
                          Email: {w.email} · Phone: {w.phone || 'Standard Dispatch'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: COMMUNITY VERIFICATION */}
            {activeNav === 'Verification' && (
              <div className="panel" style={{ padding: 22 }}>
                <div className="panel-header" style={{ padding: 0, marginBottom: 16 }}>
                  <div>
                    <div className="panel-kicker"><ShieldCheck size={14} /> Citizen Audit</div>
                    <h2>Community Verification Queue</h2>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#68797e', margin: '0 0 16px' }}>
                  Complaints marked as &quot;Resolved&quot; by field workers are subject to citizen community verification. If 2 or more citizens confirm the fix failed, the issue is automatically reopened.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {issues
                    .filter((i) => i.status === 'RESOLVED' || i.status === 'COMMUNITY_VERIFIED')
                    .map((issue) => (
                      <div key={issue.id} className="verify-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong>{issue.code}: {issue.title}</strong>
                            <p style={{ margin: '4px 0', fontSize: 11, color: '#68797e' }}>
                              <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {issue.address}
                            </p>
                          </div>
                          <StatusPill tone={issue.status}>{issue.status}</StatusPill>
                        </div>

                        <div className="verify-meters">
                          <div className="verify-stat">
                            <strong>{issue.verifications?.fixed ?? 1}</strong>
                            <span>Citizen Confirmations</span>
                          </div>
                          <div className="verify-stat negative">
                            <strong>{issue.verifications?.not_fixed ?? 0}</strong>
                            <span>Disputes (Threshold: 2)</span>
                          </div>
                        </div>

                        <div className="vote-buttons">
                          <button
                            className="action-btn"
                            onClick={() => {
                              setSelectedIssue(issue)
                              handleCommunityVote(true)
                            }}
                          >
                            <CheckCircle2 size={14} /> Confirm Fix (Vote Fixed)
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => {
                              setSelectedIssue(issue)
                              handleCommunityVote(false)
                            }}
                          >
                            <AlertTriangle size={14} /> Dispute Fix (Reopen Issue)
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* NOTIFICATIONS DRAWER */}
        {showNotifDrawer && (
          <div className="notif-drawer">
            <div className="notif-header">
              <strong style={{ fontSize: 14, color: '#17272b' }}>City Notifications ({notifications.length})</strong>
              <button className="icon-button" onClick={() => setShowNotifDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => {
                    api.markNotificationRead(n.id)
                    loadDashboardData()
                  }}
                >
                  {!n.read && <span className="notif-unread-dot" />}
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ISSUE DETAIL DRAWER */}
        {selectedIssue && (
          <div className="drawer-backdrop" onClick={() => setSelectedIssue(null)}>
            <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <div className="drawer-title-wrap">
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#78868c' }}>{selectedIssue.code}</span>
                  <h2>{selectedIssue.title}</h2>
                  <div className="drawer-badges">
                    <StatusPill tone={selectedIssue.status}>{selectedIssue.status}</StatusPill>
                    <StatusPill tone={selectedIssue.priority}>{selectedIssue.priority}</StatusPill>
                    <span className="status-pill">{selectedIssue.category.replace('_', ' ')}</span>
                  </div>
                </div>
                <button className="icon-button" onClick={() => setSelectedIssue(null)}>
                  <X size={20} />
                </button>
              </div>

              {/* TABS */}
              <div className="drawer-nav">
                <button
                  className={`drawer-tab ${drawerTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('overview')}
                >
                  Overview & Actions
                </button>
                <button
                  className={`drawer-tab ${drawerTab === 'comments' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('comments')}
                >
                  Discussion ({comments.length})
                </button>
                <button
                  className={`drawer-tab ${drawerTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('timeline')}
                >
                  Audit Trail
                </button>
                <button
                  className={`drawer-tab ${drawerTab === 'proof' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('proof')}
                >
                  Resolution Proof
                </button>
                <button
                  className={`drawer-tab ${drawerTab === 'similar' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('similar')}
                >
                  Duplicates ({similarIssues.length})
                </button>
                <button
                  className={`drawer-tab ${drawerTab === 'emails' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('emails')}
                >
                  📨 Emails ({issueEmails.length})
                </button>
              </div>

              <div className="drawer-content">
                {drawerTab === 'overview' && (
                  <div>
                    {/* WORKFLOW ACTIONS BOX */}
                    <div className="action-box">
                      <h4>Workflow Actions (Role: {currentUser?.role})</h4>
                      <div className="action-buttons">
                        {currentUser?.role === 'FIELD_WORKER' ? (
                          <>
                            {selectedIssue.status === 'ASSIGNED' && (
                              <button className="action-btn" onClick={() => handleStatusTransition('IN_PROGRESS', 'Worker arrived on site')}>
                                ▶️ Start Work
                              </button>
                            )}
                            {selectedIssue.status === 'IN_PROGRESS' && (
                              <button className="action-btn" onClick={() => setShowResolveModal(true)}>
                                ✅ Submit Resolution Proof
                              </button>
                            )}
                          </>
                        ) : currentUser?.role !== 'CITIZEN' ? (
                          <>
                            <button className="action-btn secondary" onClick={() => handleStatusTransition('UNDER_REVIEW', 'Under inspection')}>
                              Under Review
                            </button>
                            <button className="action-btn secondary" onClick={() => handleStatusTransition('VERIFIED', 'Verified on site')}>
                              Verify
                            </button>
                            <button className="action-btn" onClick={() => handleStatusTransition('IN_PROGRESS', 'Work initiated')}>
                              In Progress
                            </button>
                            <button className="action-btn" onClick={() => setShowResolveModal(true)}>
                              Resolve with Evidence
                            </button>
                            <button className="action-btn danger" onClick={() => handleStatusTransition('CLOSED', 'Closed by admin')}>
                              Close
                            </button>
                          </>
                        ) : null}
                        {currentUser?.role === 'CITIZEN' && selectedIssue.status === 'RESOLVED' && (
                          <button className="action-btn danger" onClick={() => handleStatusTransition('REOPENED', 'Citizen dispute')}>
                            Reopen Complaint
                          </button>
                        )}
                        <button className="action-btn secondary" onClick={() => handleSupport(selectedIssue.id)}>
                          <ThumbsUp size={13} /> Support ({selectedIssue.supports_count ?? 1})
                        </button>
                      </div>

                      {/* ASSIGNMENT DROPDOWN FOR OFFICERS */}
                      {(currentUser?.role === 'CITY_ADMIN' || currentUser?.role === 'DEPARTMENT_OFFICER') && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #dce8e5' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#38494e' }}>
                            Dispatch to Field Worker:
                          </span>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <select
                              value={assignWorkerId}
                              onChange={(e) => setAssignWorkerId(Number(e.target.value))}
                              style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid var(--border)', fontSize: 11 }}
                            >
                              <option value="">Select available worker...</option>
                              {workers.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.first_name} {w.last_name} ({w.email})
                                </option>
                              ))}
                            </select>
                            <button className="action-btn" onClick={handleAssignWorker} disabled={!assignWorkerId}>
                              Assign
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ISSUE SUMMARY */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
                      <div>
                        <span style={{ color: '#7a898f', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                          Description
                        </span>
                        <p style={{ margin: '4px 0 0', lineHeight: 1.5, color: '#27383e' }}>
                          {selectedIssue.description}
                        </p>
                      </div>

                      <div>
                        <span style={{ color: '#7a898f', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                          Location Address
                        </span>
                        <p style={{ margin: '4px 0 0', color: '#27383e' }}>
                          <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                          {selectedIssue.address || 'Metro Coordinates'}
                        </p>
                      </div>

                      <div>
                        <span style={{ color: '#7a898f', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                          Department
                        </span>
                        <p style={{ margin: '4px 0 0', color: '#27383e' }}>
                          {selectedIssue.department_name || 'Municipal Road & Highway Department'}
                        </p>
                      </div>

                      <div>
                        <span style={{ color: '#7a898f', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                          Explainable Priority Rationale
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {selectedIssue.priority_reasons?.map((r, idx) => (
                            <span key={idx} className="status-pill" style={{ background: '#f5f7f6', color: '#334448' }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: COMMENTS */}
                {drawerTab === 'comments' && (
                  <div>
                    <div className="comments-list">
                      {comments.map((comm) => (
                        <div key={comm.id} className="comment-card">
                          <div className="comment-head">
                            <div className="comment-author">
                              <span>{comm.author?.first_name} {comm.author?.last_name}</span>
                              <span className="comment-role">{comm.author?.role?.toLowerCase()}</span>
                            </div>
                            <span className="comment-date">{new Date(comm.created_at).toLocaleString()}</span>
                          </div>
                          <p className="comment-text">{comm.body}</p>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <div className="empty-state">No comments yet. Start the conversation below!</div>
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="comment-form">
                      <textarea
                        rows={3}
                        required
                        placeholder="Add a remark or update on this issue..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button className="primary-button" type="submit" disabled={commentLoading} style={{ alignSelf: 'flex-end' }}>
                        <Send size={14} /> {commentLoading ? 'Posting...' : 'Post Comment'}
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB: TIMELINE */}
                {drawerTab === 'timeline' && (
                  <div className="timeline">
                    {history.map((h) => (
                      <div key={h.id} className="timeline-step">
                        <div className="timeline-dot" />
                        <div className="timeline-header">
                          <span>{h.new_status}</span>
                          <span style={{ fontSize: 9, color: '#88989c' }}>{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="timeline-desc">
                          {h.reason || 'Status updated'} · By {h.actor?.username || 'System'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB: PROOF / RESOLUTION EVIDENCE */}
                {drawerTab === 'proof' && (
                  <div>
                    {selectedIssue.resolution_evidence ? (
                      <div className="evidence-card">
                        <div className="evidence-header">
                          <CheckCircle2 size={18} style={{ color: '#176b67' }} />
                          <div>
                            <strong>Resolution Certified by {selectedIssue.resolution_evidence.worker?.username}</strong>
                            <span style={{ display: 'block', fontSize: 10, color: '#7a8b90' }}>
                              Completed at {new Date(selectedIssue.resolution_evidence.captured_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: 12, color: '#384a50', margin: '8px 0' }}>
                          <strong>Worker Notes:</strong> {selectedIssue.resolution_evidence.notes || 'Repairs completed and site cleaned.'}
                        </p>

                        <div className="evidence-gallery">
                          <div className="evidence-photo-box">
                            <div className="evidence-photo-label">Before Inspection</div>
                            <div style={{ height: 110, display: 'grid', placeItems: 'center', background: '#eef3f2', color: '#687b80', fontSize: 11 }}>
                              <ImageIcon size={20} /> Photo Documented
                            </div>
                          </div>
                          <div className="evidence-photo-box">
                            <div className="evidence-photo-label">After Resolution</div>
                            <div style={{ height: 110, display: 'grid', placeItems: 'center', background: '#eef3f2', color: '#687b80', fontSize: 11 }}>
                              <CheckCircle2 size={20} style={{ color: '#176b67' }} /> Resolution Verified
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        No resolution proof submitted yet. Once field workers resolve this task, proof photos will appear here.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: SIMILAR / DUPLICATES */}
                {drawerTab === 'similar' && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {similarIssues.map((sim) => (
                        <div key={sim.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fbfdfc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{sim.code}: {sim.title}</strong>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#176b67' }}>
                              {Math.round(sim.similarity * 100)}% Match
                            </span>
                          </div>
                        </div>
                      ))}
                      {similarIssues.length === 0 && (
                        <div className="empty-state">No duplicate or nearby correlated complaints detected.</div>
                      )}
                    </div>
                  </div>
                )}

                {drawerTab === 'emails' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0 }}>Automated Lifecycle Emails ({issueEmails.length})</h4>
                      <span style={{ fontSize: 11, color: '#176b67', fontWeight: 600 }}>Sent to Citizen & Dept</span>
                    </div>

                    <div style={{ background: '#e8f4f2', border: '1px solid #c2e2dc', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#176b67' }}>
                      <strong>📬 Municipal Email Dispatch:</strong> An email notification is automatically recorded and sent for every lifecycle event (creation, assignment, in-progress, resolution).
                    </div>

                    {issueEmails.length === 0 ? (
                      <div className="empty-state">No emails recorded yet for this complaint.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {issueEmails.map((em) => (
                          <div key={em.id} style={{ background: '#f8faf9', border: '1px solid #dce8e5', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#176b67', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={13} color="#176b67" /> Sent to: <strong>{em.recipient}</strong>
                              </span>
                              <span style={{ fontSize: 10, color: '#88989e' }}>
                                {new Date(em.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#27383e', marginBottom: 6 }}>
                              {em.subject}
                            </div>
                            <pre style={{ fontSize: 11, color: '#4a5d64', whiteSpace: 'pre-wrap', background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #eef2f1', maxHeight: 180, overflowY: 'auto', margin: 0, fontFamily: 'inherit' }}>
                              {em.body}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT RESOLUTION EVIDENCE MODAL */}
        {showResolveModal && (
          <div className="modal-backdrop">
            <div className="report-modal">
              <div className="modal-header">
                <div>
                  <div className="panel-kicker"><Wrench size={14} /> Field Worker Work Order</div>
                  <h2>Submit Resolution Proof</h2>
                </div>
                <button className="icon-button" onClick={() => setShowResolveModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleWorkerResolve}>
                <label>
                  Work Completion Notes
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe repairs, replacement materials used, site cleanup..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                  />
                </label>

                <label>
                  Before Photo (Site Condition)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setResolveBeforeFile(e.target.files?.[0] || null)}
                  />
                </label>

                <label>
                  After Photo (Finished Work)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setResolveAfterFile(e.target.files?.[0] || null)}
                  />
                </label>

                <div className="modal-actions">
                  <button type="button" className="soft-button" onClick={() => setShowResolveModal(false)}>
                    Cancel
                  </button>
                  <button className="primary-button" type="submit" disabled={resolving}>
                    {resolving ? 'Submitting...' : 'Certify & Mark Resolved'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI RISK RECALCULATION MODAL */}
        {riskModalData && (
          <div className="modal-backdrop">
            <div className="report-modal">
              <div className="modal-header">
                <div>
                  <div className="panel-kicker"><Sparkles size={14} /> Machine Learning Telemetry</div>
                  <h2>Risk Assessment: {riskModalData.assetName}</h2>
                </div>
                <button className="icon-button" onClick={() => setRiskModalData(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fbfdfc', border: '1px solid var(--border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#7a898e' }}>Computed Risk Score</span>
                    <strong style={{ display: 'block', fontSize: 22, color: riskModalData.risk >= 70 ? '#be3e2b' : '#176b67' }}>
                      {riskModalData.risk}%
                    </strong>
                  </div>
                  <div style={{ background: '#fbfdfc', border: '1px solid var(--border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: '#7a898e' }}>Structural Health</span>
                    <strong style={{ display: 'block', fontSize: 22, color: '#176b67' }}>
                      {riskModalData.health}%
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#56686d', textTransform: 'uppercase' }}>
                    Risk Factors Analyzed:
                  </span>
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {riskModalData.reasons.map((r, idx) => (
                      <div key={idx} className="risk-reasons-list">
                        <AlertTriangle size={12} style={{ display: 'inline', marginRight: 6, color: '#cf7b38' }} />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className="primary-button" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setRiskModalData(null)}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        )}

        {/* REPORT A CIVIC ISSUE MODAL */}
        {showReport && (
          <div className="modal-backdrop">
            <div className="report-modal" role="dialog">
              <div className="modal-header">
                <div>
                  <div className="panel-kicker">
                    <FilePlus2 size={14} /> New Incident
                  </div>
                  <h2>Report a Civic Issue</h2>
                </div>
                <button className="icon-button" onClick={() => setShowReport(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={submitReport}>
                <label>
                  Issue Title
                  <input
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="e.g. Broken streetlight, dangerous pothole"
                  />
                </label>

                <label>
                  Detailed Description
                  <textarea
                    required
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the issue, hazards, and exact landmark..."
                  />
                </label>

                {/* AI AUTO-DETECT BUTTON */}
                <button
                  type="button"
                  className="ai-detect-btn"
                  onClick={handleAiDetectInReport}
                  disabled={detectingAi}
                >
                  <Sparkles size={13} /> {detectingAi ? 'Predicting category...' : 'AI Auto-Detect Category'}
                </button>

                <label>
                  Category
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                  >
                    {[
                      'ROAD',
                      'POTHOLE',
                      'STREETLIGHT',
                      'WATER',
                      'DRAINAGE',
                      'GARBAGE',
                      'TRAFFIC_SIGNAL',
                      'PUBLIC_TRANSPORT',
                      'PARK',
                      'FOOTPATH',
                      'PUBLIC_TOILET',
                      'ELECTRICITY',
                      'PUBLIC_BUILDING',
                      'OTHER',
                    ].map((x) => (
                      <option key={x} value={x}>
                        {x.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Attach Photo Evidence (Optional)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  />
                </label>

                {/* INTERACTIVE LOCATION PICKER ON REAL MAP */}
                <ReportMapPicker
                  lat={Number(reportForm.lat)}
                  lng={Number(reportForm.lng)}
                  userLocation={userLocation}
                  onLocationSelect={({ lat, lng }) => {
                    setReportForm((prev) => ({
                      ...prev,
                      lat: String(lat),
                      lng: String(lng),
                    }))
                  }}
                  onFetchAddress={(address) => {
                    setReportForm((prev) => ({
                      ...prev,
                      address,
                    }))
                  }}
                />

                <label>
                  Address & Landmarks (Auto-fetched from map selection or edit)
                  <input
                    required
                    value={reportForm.address}
                    onChange={(e) => setReportForm({ ...reportForm, address: e.target.value })}
                    placeholder="Street, ward, or landmark"
                  />
                </label>

                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#7a8b90' }}>Quick City Presets:</span>
                  <div className="preset-chips">
                    {cityPresets.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="preset-chip"
                        onClick={() =>
                          setReportForm({
                            ...reportForm,
                            address: p.name,
                            lat: p.lat,
                            lng: p.lng,
                          })
                        }
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: 10 }}>
                  <label>
                    Latitude
                    <input
                      required
                      type="number"
                      step="any"
                      value={reportForm.lat}
                      onChange={(e) => setReportForm({ ...reportForm, lat: e.target.value })}
                    />
                  </label>
                  <label>
                    Longitude
                    <input
                      required
                      type="number"
                      step="any"
                      value={reportForm.lng}
                      onChange={(e) => setReportForm({ ...reportForm, lng: e.target.value })}
                    />
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="soft-button" onClick={() => setShowReport(false)}>
                    Cancel
                  </button>
                  <button disabled={submittingReport} className="primary-button" type="submit">
                    <Plus size={17} /> {submittingReport ? 'Filing Issue...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ALL DISPATCHED EMAILS OUTBOX MODAL */}
        {showAllEmailsModal && (
          <div className="modal-backdrop">
            <div className="report-modal" style={{ maxWidth: 640 }}>
              <div className="modal-header">
                <div>
                  <div className="panel-kicker"><Mail size={14} /> Municipal Notification Dispatch</div>
                  <h2>Dispatched Email Outbox ({allEmails.length})</h2>
                </div>
                <button className="icon-button" onClick={() => setShowAllEmailsModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: '#e8f4f2', border: '1px solid #c2e2dc', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#176b67', lineHeight: 1.4 }}>
                <strong>📨 Automated Email Dispatch Active:</strong> Real-time emails are generated for complaint registration, worker assignments, field progress, and completions.
                <br />
                <span style={{ fontSize: 10, color: '#274b46' }}>
                  To deliver directly to your real Gmail inbox app, provide your Gmail address & 16-character App Password in <code>civifix/.env</code> (EMAIL_HOST_USER & EMAIL_HOST_PASSWORD).
                </span>
              </div>

              <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allEmails.length === 0 ? (
                  <p style={{ color: '#7a898f', fontSize: 12, textAlign: 'center', padding: 20 }}>
                    No emails dispatched yet. File a complaint or transition an issue status to trigger automated emails!
                  </p>
                ) : (
                  allEmails.map((em) => (
                    <div key={em.id} style={{ background: '#fbfdfc', border: '1px solid #dce8e5', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#176b67', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} color="#176b67" /> Sent to: <strong>{em.recipient}</strong>
                        </span>
                        <span style={{ fontSize: 10, color: '#88989e' }}>
                          {new Date(em.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#27383e', marginBottom: 6 }}>
                        {em.subject}
                      </div>
                      <pre style={{ fontSize: 11, color: '#4a5d64', whiteSpace: 'pre-wrap', background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #eef2f1', maxHeight: 150, overflowY: 'auto', margin: 0, fontFamily: 'inherit' }}>
                        {em.body}
                      </pre>
                    </div>
                  ))
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button type="button" className="primary-button" onClick={() => setShowAllEmailsModal(false)}>
                  Close Outbox
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CiviFixDashboard
