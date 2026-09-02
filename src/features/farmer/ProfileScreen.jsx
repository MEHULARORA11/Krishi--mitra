import { useState, useEffect } from 'react'
import { Leaf, MessageCircle, Pencil, Save, UserRound, X } from 'lucide-react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useLanguage } from '../../context/LanguageContext'
import { apiClient } from '../../lib/api'
import { StateWrapper } from '../../components/ui/StateWrapper'
import { DataBadge } from '../../components/ui/DataBadge'
import '../../styles/ProfilePage.css'

export default function ProfileScreen() {
  const { user } = useUser()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { currentLanguage } = useLanguage()
  const [farmerProfile, setFarmerProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ district: '', state: '' })
  const [saving, setSaving] = useState(false)
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [historyTab, setHistoryTab] = useState('analyses')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !user) {
      setIsLoading(false)
      return
    }

    const syncAndLoad = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('Authentication session is still initializing. Please retry in a moment.')
        }

        await apiClient.postJson('/users/sync', {
          clerkUserId: user.id,
          name: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
        })

        const profile = await apiClient.get('/users/me')
        setFarmerProfile(profile)
        setEditData({
          district: profile.district ?? '',
          state: profile.state ?? '',
        })

        const [chatRes, analysesRes] = await Promise.all([
          apiClient.get('/history/chat'),
          apiClient.get('/history/analyses'),
        ])
        setChatHistory(chatRes.messages ?? [])
        setAnalysisHistory(analysesRes.analyses ?? [])
      } catch (err) {
        console.error('Profile sync error:', err)
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }

    syncAndLoad()
  }, [getToken, isLoaded, isSignedIn, user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await apiClient.patch('/users/me', {
        preferredLanguage: currentLanguage,
        ...editData,
      })
      setFarmerProfile(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Profile update error:', err)
    } finally {
      setSaving(false)
    }
  }

  const labels =
    {
      en: {
        title: 'Profile',
        name: 'Name',
        email: 'Email',
        language: 'Language',
        joinedDate: 'Joined',
        edit: 'Edit',
        save: 'Save',
        cancel: 'Cancel',
        district: 'District',
        state: 'State',
      },
      ml: {
        title: 'à´ªàµà´°àµŠà´«àµˆàµ½',
        name: 'à´ªàµ‡à´°àµ',
        email: 'à´‡à´®àµ†à´¯à´¿àµ½',
        language: 'à´­à´¾à´·',
        joinedDate: 'à´šàµ‡àµ¼à´¨àµà´¨ à´¤àµ€à´¯à´¤à´¿',
        edit: 'à´Žà´¡à´¿à´±àµà´±àµ',
        save: 'à´¸àµ‡à´µàµ',
        cancel: 'à´±à´¦àµà´¦à´¾à´•àµà´•àµà´•',
        district: 'à´œà´¿à´²àµà´²',
        state: 'à´¸à´‚à´¸àµà´¥à´¾à´¨à´‚',
      },
      hi: {
        title: 'à¤ªà¥à¤°à¥‹à¤«à¤¾à¤‡à¤²',
        name: 'à¤¨à¤¾à¤®',
        email: 'à¤ˆà¤®à¥‡à¤²',
        language: 'à¤­à¤¾à¤·à¤¾',
        joinedDate: 'à¤¶à¤¾à¤®à¤¿à¤²',
        edit: 'à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤',
        save: 'à¤¸à¤¹à¥‡à¤œà¥‡à¤‚',
        cancel: 'à¤°à¤¦à¥à¤¦',
        district: 'à¤œà¤¿à¤²à¤¾',
        state: 'à¤°à¤¾à¤œà¥à¤¯',
      },
    }[currentLanguage] ?? {
      title: 'Profile',
      name: 'Name',
      email: 'Email',
      language: 'Language',
      joinedDate: 'Joined',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      district: 'District',
      state: 'State',
    }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <UserRound aria-hidden="true" />
            )}
          </div>
          <h1>
            {labels.title} <DataBadge mode="live" />
          </h1>
        </div>

        <StateWrapper
          isLoading={isLoading}
          error={error}
          loadingMessage="Loading your profile..."
        >
          <div className="profile-content">
            <div className="profile-info">
              <div className="info-item">
                <label>{labels.name}</label>
                <span>{user?.fullName || 'Farmer'}</span>
              </div>
              <div className="info-item">
                <label>{labels.email}</label>
                <span>{user?.primaryEmailAddress?.emailAddress || '—'}</span>
              </div>
              <div className="info-item">
                <label>{labels.language}</label>
                <span>
                  {currentLanguage === 'en'
                    ? 'English'
                    : currentLanguage === 'ml'
                      ? 'Malayalam'
                      : 'Hindi'}
                </span>
              </div>
              <div className="info-item">
                <label>{labels.state}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.state}
                    onChange={(event) =>
                      setEditData({ ...editData, state: event.target.value })
                    }
                    className="edit-input"
                    placeholder="e.g. Kerala"
                  />
                ) : (
                  <span>{farmerProfile?.state || '—'}</span>
                )}
              </div>
              <div className="info-item">
                <label>{labels.district}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.district}
                    onChange={(event) =>
                      setEditData({
                        ...editData,
                        district: event.target.value,
                      })
                    }
                    className="edit-input"
                    placeholder="e.g. Thiruvananthapuram"
                  />
                ) : (
                  <span>{farmerProfile?.district || '—'}</span>
                )}
              </div>
              <div className="info-item">
                <label>{labels.joinedDate}</label>
                <span>
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            </div>

            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button
                    className="save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="save-icon" aria-hidden="true" />
                    {saving ? 'Saving...' : labels.save}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="cancel-icon" aria-hidden="true" /> {labels.cancel}
                  </button>
                </>
              ) : (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  <Pencil className="edit-icon" aria-hidden="true" /> {labels.edit}
                </button>
              )}
            </div>
          </div>

          <div className="profile-history">
            <div className="history-tabs">
              <button
                className={`history-tab ${historyTab === 'analyses' ? 'active' : ''}`}
                onClick={() => setHistoryTab('analyses')}
              >
                <Leaf aria-hidden="true" /> Disease Analyses ({analysisHistory.length})
              </button>
              <button
                className={`history-tab ${historyTab === 'chat' ? 'active' : ''}`}
                onClick={() => setHistoryTab('chat')}
              >
                <MessageCircle aria-hidden="true" /> Chat History (
                {chatHistory.filter((message) => message.role === 'user').length}
                )
              </button>
            </div>

            {historyTab === 'analyses' ? (
              <div className="history-list">
                {analysisHistory.length === 0 ? (
                  <p className="history-empty">
                    No analyses yet. Upload a crop photo to get started.
                  </p>
                ) : (
                  analysisHistory.map((analysis) => (
                    <div key={analysis.id} className="history-item">
                      <div className="history-item-header">
                        <strong>{analysis.crop}</strong>
                        <span
                          className={`severity-badge severity-${analysis.severity}`}
                        >
                          {analysis.severity}
                        </span>
                      </div>
                      <div className="history-disease">{analysis.disease}</div>
                      <div className="history-meta">
                        Confidence: {analysis.confidence}% ·{' '}
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {historyTab === 'chat' ? (
              <div className="history-list">
                {chatHistory.filter((message) => message.role === 'user')
                  .length === 0 ? (
                  <p className="history-empty">
                    No chat history yet. Ask the AI assistant a farming
                    question.
                  </p>
                ) : (
                  chatHistory
                    .filter((message) => message.role === 'user')
                    .map((message) => (
                      <div key={message.id} className="history-item">
                        <div className="history-question">{message.content}</div>
                        <div className="history-meta">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                )}
              </div>
            ) : null}
          </div>
        </StateWrapper>
      </div>
    </div>
  )
}
