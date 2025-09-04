// src/App.jsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import { Authenticator } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import { uploadData, getUrl, remove } from 'aws-amplify/storage'

export default function App() {
  // Create the client AFTER Amplify.configure(outputs) runs (in main.jsx)
  const client = useMemo(() => generateClient(), [])

  const [notes, setNotes] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchNotes = useCallback(async () => {
    const { data } = await client.models.Note.list()
    const withUrls = await Promise.all(
      data.map(async (n) => {
        if (n.image) {
          try {
            const { url } = await getUrl({ path: n.image })
            return { ...n, imageUrl: url.toString() }
          } catch {
            // If URL fetch fails, still show the note without image
            return n
          }
        }
        return n
      })
    )
    setNotes(withUrls)
  }, [client])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const createNote = useCallback(async () => {
    if (!form.name.trim()) return

    setLoading(true)
    try {
      let imagePath = null

      if (file) {
        const { path } = await uploadData({
          // Store per-user using identityId; requires your storage rule with {entity_id}
          path: ({ identityId }) => `media/${identityId}/${Date.now()}-${file.name}`,
          data: file,
          options: { contentType: file.type },
        }).result
        imagePath = path
      }

      await client.models.Note.create({
        name: form.name,
        description: form.description || '',
        image: imagePath,
      })

      setForm({ name: '', description: '' })
      setFile(null)
      await fetchNotes()
    } finally {
      setLoading(false)
    }
  }, [client, file, form, fetchNotes])

  const deleteNote = useCallback(
    async (id, image) => {
      setLoading(true)
      try {
        await client.models.Note.delete({ id })
        if (image) {
          try {
            await remove({ path: image })
          } catch {
            // ignore storage delete failures to keep UX smooth
          }
        }
        await fetchNotes()
      } finally {
        setLoading(false)
      }
    },
    [client, fetchNotes]
  )

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="App-header" style={{ marginBottom: 16 }}>
            <h1>Notes</h1>
            <p style={{ opacity: 0.8, margin: 0 }}>
              Signed in as {user?.signInDetails?.loginId ?? user?.username}
            </p>
            <button onClick={signOut} style={{ marginTop: 8 }}>
              Sign out
            </button>
          </header>

          <div className="card" style={{ marginBottom: 24 }}>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ display: 'block', marginBottom: 8, width: '100%' }}
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ display: 'block', marginBottom: 8, width: '100%' }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: 'block', marginBottom: 12 }}
            />
            <button onClick={createNote} disabled={loading}>
              {loading ? 'Saving…' : 'Create note'}
            </button>
          </div>

          <div className="grid">
            {notes.map((n) => (
              <div className="box card" key={n.id}>
                <h3 style={{ marginTop: 0 }}>{n.name}</h3>
                {n.description && <p>{n.description}</p>}
                {n.imageUrl && (
                  <img
                    src={n.imageUrl}
                    alt={n.name}
                    style={{ maxWidth: '100%', borderRadius: 8 }}
                  />
                )}
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => deleteNote(n.id, n.image)} disabled={loading}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="read-the-docs" style={{ gridColumn: '1 / -1' }}>
                No notes yet. Create one above!
              </p>
            )}
          </div>
        </div>
      )}
    </Authenticator>
  )
}
