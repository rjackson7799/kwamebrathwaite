'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { ContentSectionCard } from '@/components/admin/ContentSectionCard'

interface ContentSection {
  id: string
  section: string
  content: string | null
  content_type: string
  metadata: unknown
  updated_at: string
}

type ContentByPage = Record<string, ContentSection[]>

const PAGE_TABS = [
  { id: 'home', label: 'Home', description: 'Homepage hero and introduction content' },
  { id: 'about', label: 'About', description: 'Biography, movement history, and timeline' },
  { id: 'archive', label: 'Archive', description: 'Archive mission and description' },
  { id: 'contact', label: 'Contact', description: 'Contact page introduction' },
]

export default function AdminContentPage() {
  const [content, setContent] = useState<ContentByPage>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('home')

  const fetchContent = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/content')
      const data = await response.json()

      if (data.success) {
        setContent(data.data)
      } else {
        setError(data.error?.message || 'Failed to fetch content')
      }
    } catch (err) {
      console.error('Failed to fetch content:', err)
      setError('Failed to load content. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const handleSave = async (page: string, section: string, newContent: string) => {
    const response = await fetch(`/api/admin/content/${page}/${section}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: newContent,
        content_type: content[page]?.find((s) => s.section === section)?.content_type || 'html',
      }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to save content')
    }

    // Update local state with new content
    setContent((prev) => ({
      ...prev,
      [page]: prev[page]?.map((s) =>
        s.section === section
          ? { ...s, content: newContent, updated_at: data.data.updated_at }
          : s
      ) || [],
    }))
  }

  const activeSections = content[activeTab] || []
  const activeTabInfo = PAGE_TABS.find((tab) => tab.id === activeTab)

  return (
    <>
      <PageHeader
        title="Site Content"
        description="Manage content for public pages"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Content' },
        ]}
      />

      <div className="p-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-6">
            {PAGE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        {activeTabInfo && (
          <p className="text-sm text-gray-500 mb-6">{activeTabInfo.description}</p>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg bg-white overflow-hidden animate-pulse"
              >
                <div className="px-4 py-3 bg-gray-50">
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="p-4">
                  <div className="h-32 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ErrorIcon />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchContent}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Content Sections */}
        {!loading && !error && (
          <div className="space-y-4">
            {activeSections.length > 0 ? (
              activeSections.map((section) => (
                <ContentSectionCard
                  key={section.id}
                  page={activeTab}
                  section={section.section}
                  content={section.content || ''}
                  contentType={section.content_type}
                  updatedAt={section.updated_at}
                  onSave={(newContent) => handleSave(activeTab, section.section, newContent)}
                />
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <EmptyIcon />
                <h3 className="mt-4 text-sm font-medium text-gray-900">No content sections</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No content sections have been defined for the {activeTabInfo?.label} page.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function ErrorIcon() {
  return (
    <svg
      className="w-5 h-5 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  )
}
