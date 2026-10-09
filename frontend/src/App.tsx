import { FormEvent, useEffect, useRef, useState } from 'react'

type StepKind = 'model' | 'tool_call' | 'tool_result' | 'final'
type Step = { step: number; kind: StepKind; name: string; detail: string }
type ChatReply = {
  answer: string
  session_id: string
  mode: 'agent' | 'demo'
  model: string | null
  trajectory: Step[]
}
type Turn = {
  role: 'user' | 'assistant'
  text: string
  mode?: 'agent' | 'demo'
  model?: string | null
  trajectory?: Step[]
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const SESSION_ID = window.localStorage.getItem('ledgerline-session') ?? crypto.randomUUID()
window.localStorage.setItem('ledgerline-session', SESSION_ID)

const KIND_LABEL: Record<StepKind, string> = {
  model: 'MODEL',
  tool_call: 'TOOL CALL',
  tool_result: 'TOOL RESULT',
  final: 'ANSWER',
}

const SUGGESTIONS = [
  'What was the average revenue across the periods?',
  'Use the calculation tool to add 1200 and 875.',
  'Compare the latest revenue and expenses.',
]

function App() {
  const [token, setToken] = useState(localStorage.getItem('ledgerline-token') ?? 'demo-analyst-token')
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([
    { role: 'assistant', text: 'Hi, I am Ledgerline. Ask about the synthetic finance data.' },
  ])
  const streamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('ledgerline-token', token)
  }, [token])

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, sending])

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const question = prompt.trim()
    if (!question || sending) return
    setPrompt('')
    setTurns((current) => [...current, { role: 'user', text: question }])
    setSending(true)
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: question, session_id: SESSION_ID }),
      })
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? 'Viewer role can view the dashboard but cannot use the assistant.'
            : `Request failed (${response.status}).`,
        )
      }
      const reply = (await response.json()) as ChatReply
      setTurns((current) => [
        ...current,
        {
          role: 'assistant',
          text: reply.answer,
          mode: reply.mode,
          model: reply.model,
          trajectory: reply.trajectory,
        },
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.'
      setTurns((current) => [...current, { role: 'assistant', text: message }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="title">
          <strong>Ledgerline</strong>
          <span>finance agent</span>
        </div>
        <label className="role">
          role
          <select value={token} onChange={(event) => setToken(event.target.value)}>
            <option value="demo-admin-token">admin</option>
            <option value="demo-analyst-token">analyst</option>
            <option value="demo-viewer-token">viewer</option>
          </select>
        </label>
      </header>

      <main className="stream" ref={streamRef}>
        {turns.map((turn, index) => (
          <div className={`turn ${turn.role}`} key={`${index}-${turn.role}`}>
            <div className="bubble">
              <p>{turn.text}</p>
            </div>
            {turn.role === 'assistant' && turn.trajectory && (
              <details className="trace" open>
                <summary>
                  Trajectory
                  <span className={`mode ${turn.mode ?? ''}`}>{turn.mode}</span>
                  {turn.model && <span className="model">{turn.model}</span>}
                </summary>
                <ol>
                  {turn.trajectory.map((step) => (
                    <li key={step.step}>
                      <span className={`kind k-${step.kind}`}>{KIND_LABEL[step.kind]}</span>
                      <div className="step">
                        <strong>{step.name}</strong>
                        <pre>{step.detail}</pre>
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        ))}
        {sending && <div className="turn assistant"><div className="bubble muted">Thinking…</div></div>}
      </main>

      <div className="suggestions">
        {SUGGESTIONS.map((text) => (
          <button key={text} onClick={() => setPrompt(text)} disabled={sending}>
            {text}
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={sendMessage}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about the financials…"
          rows={2}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void sendMessage(event as unknown as FormEvent)
            }
          }}
        />
        <button type="submit" disabled={!prompt.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  )
}

export default App
