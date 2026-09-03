import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api/client'
import { addDays, parseLocalDate, toDateInput } from './format'

function formatDayTitle(dateKey) {
  const date = parseLocalDate(dateKey)
  if (!date) return dateKey
  const raw = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function formatShortDay(dateKey) {
  const date = parseLocalDate(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function weekdayLabel(dateKey) {
  const date = parseLocalDate(dateKey)
  if (!date) return ''
  const raw = date.toLocaleDateString('fr-FR', { weekday: 'long' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function monthTitle(date) {
  const raw = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function monthRange(cursor) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  return { from: toDateInput(start), to: toDateInput(end) }
}

function summarize(dateKey, tasks) {
  return {
    dateKey,
    taskCount: tasks.length,
    doneCount: tasks.filter((item) => item.done).length,
    tasks,
  }
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M6.5 12.5l3.4 3.4 7.6-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d={dir === 'left' ? 'M14.5 6L9 12l5.5 6' : 'M9.5 6L15 12l-5.5 6'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TaskRow({ task, onToggle, onRename, onRemove }) {
  const [value, setValue] = useState(task.title)

  useEffect(() => {
    setValue(task.title)
  }, [task.title])

  function commit() {
    const next = value.trim()
    if (!next) {
      setValue(task.title)
      return
    }
    if (next !== task.title) onRename(task, next)
  }

  return (
    <li
      className={`group flex items-center gap-3.5 rounded-[1.35rem] px-3.5 py-3.5 transition ${
        task.done ? 'opacity-55' : 'hover:bg-paper'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] transition ${
          task.done
            ? 'border-moss bg-moss text-cream'
            : 'border-ink/18 bg-cream text-transparent hover:border-copper hover:text-copper/40'
        }`}
        aria-label={task.done ? 'Marquer à faire' : 'Marquer faite'}
      >
        <CheckIcon />
      </button>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className={`min-w-0 flex-1 bg-transparent text-[15px] leading-snug outline-none ${
          task.done ? 'text-ink-soft line-through' : 'text-ink'
        }`}
      />
      <button
        type="button"
        onClick={() => onRemove(task)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-soft/40 opacity-0 transition group-hover:opacity-100 hover:bg-ink/6 hover:text-copper"
        aria-label="Supprimer"
      >
        ×
      </button>
    </li>
  )
}

function TaskList({ tasks, empty, onToggle, onRename, onRemove }) {
  const open = tasks.filter((item) => !item.done)
  const done = tasks.filter((item) => item.done)
  const [showDone, setShowDone] = useState(true)

  if (tasks.length === 0) {
    return (
      <div className="px-2 py-16 text-center">
        <p className="font-display text-2xl tracking-tight text-ink/70">{empty}</p>
        <p className="mt-2 text-sm text-ink-soft">Écrivez au-dessus, puis Entrée.</p>
      </div>
    )
  }

  return (
    <div>
      {open.length ? (
        <ul className="flex flex-col">
          {open.map((task) => (
            <TaskRow key={task._id} task={task} onToggle={onToggle} onRename={onRename} onRemove={onRemove} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-10 text-center font-display text-xl tracking-tight text-ink/70">Tout est coché.</p>
      )}
      {done.length ? (
        <div className="mt-3 border-t border-ink/6 pt-3">
          <button
            type="button"
            onClick={() => setShowDone((current) => !current)}
            className="px-4 text-[11px] font-semibold tracking-[0.16em] text-ink-soft/70 uppercase transition hover:text-ink"
          >
            {showDone ? 'Masquer' : 'Voir'} {done.length} faite{done.length > 1 ? 's' : ''}
          </button>
          {showDone ? (
            <ul className="mt-1 flex flex-col">
              {done.map((task) => (
                <TaskRow key={task._id} task={task} onToggle={onToggle} onRename={onRename} onRemove={onRemove} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Journal() {
  const todayKey = toDateInput()
  const inputRef = useRef(null)
  const [view, setView] = useState('day')
  const [dateKey, setDateKey] = useState(todayKey)
  const [monthCursor, setMonthCursor] = useState(() => {
    const day = parseLocalDate(todayKey)
    return new Date(day.getFullYear(), day.getMonth(), 1)
  })
  const [tasks, setTasks] = useState([])
  const [monthDays, setMonthDays] = useState([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const isToday = dateKey === todayKey
  const openCount = tasks.filter((item) => !item.done).length
  const doneCount = tasks.filter((item) => item.done).length
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const monthTasks = useMemo(
    () => monthDays.filter((day) => (day.tasks || []).length > 0),
    [monthDays],
  )
  const monthOpen = monthDays.reduce((sum, day) => sum + Math.max(0, (day.taskCount || 0) - (day.doneCount || 0)), 0)
  const monthTotal = monthDays.reduce((sum, day) => sum + (day.taskCount || 0), 0)
  const monthProgress = monthTotal ? Math.round(((monthTotal - monthOpen) / monthTotal) * 100) : 0

  function applyDay(key, nextTasks) {
    if (key === dateKey) setTasks(nextTasks)
    setMonthDays((current) => {
      const next = current.filter((day) => day.dateKey !== key)
      if (!nextTasks.length) return next.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      return [...next, summarize(key, nextTasks)].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    })
  }

  async function loadDay(key) {
    const data = await api(`/api/workspace/journal/${key}`)
    setTasks(data.log?.tasks || [])
  }

  async function loadMonth(cursor) {
    const { from, to } = monthRange(cursor)
    const data = await api(`/api/workspace/journal?from=${from}&to=${to}`)
    setMonthDays(data.days || [])
  }

  useEffect(() => {
    let cancelled = false
    loadDay(dateKey).catch((err) => {
      if (!cancelled) setError(err.message)
    })
    return () => {
      cancelled = true
    }
  }, [dateKey])

  useEffect(() => {
    loadMonth(monthCursor).catch((err) => setError(err.message))
  }, [monthCursor])

  function shiftMonth(delta) {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1)
    setMonthCursor(next)
    const day = parseLocalDate(dateKey)
    if (!day || day.getMonth() !== next.getMonth() || day.getFullYear() !== next.getFullYear()) {
      const today = parseLocalDate(todayKey)
      setDateKey(
        today.getMonth() === next.getMonth() && today.getFullYear() === next.getFullYear()
          ? todayKey
          : toDateInput(next),
      )
    }
  }

  function goTo(nextKey) {
    if (!nextKey) return
    setDateKey(nextKey)
    const day = parseLocalDate(nextKey)
    if (day) setMonthCursor(new Date(day.getFullYear(), day.getMonth(), 1))
    inputRef.current?.focus()
  }

  async function addTask(event) {
    event.preventDefault()
    const label = title.trim()
    if (!label) return
    setPending(true)
    setError('')
    setTitle('')
    try {
      const data = await api(`/api/workspace/journal/${dateKey}/tasks`, {
        method: 'POST',
        body: { title: label },
      })
      applyDay(dateKey, data.log?.tasks || [])
      inputRef.current?.focus()
    } catch (err) {
      setTitle(label)
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function toggleTask(task, key = dateKey) {
    const current = key === dateKey ? tasks : monthDays.find((day) => day.dateKey === key)?.tasks || []
    applyDay(
      key,
      current.map((item) => (item._id === task._id ? { ...item, done: !item.done } : item)),
    )
    try {
      const data = await api(`/api/workspace/journal/${key}/tasks/${task._id}`, {
        method: 'PATCH',
        body: { done: !task.done },
      })
      applyDay(key, data.log?.tasks || [])
    } catch (err) {
      applyDay(key, current)
      setError(err.message)
    }
  }

  async function renameTask(task, nextTitle, key = dateKey) {
    try {
      const data = await api(`/api/workspace/journal/${key}/tasks/${task._id}`, {
        method: 'PATCH',
        body: { title: nextTitle },
      })
      applyDay(key, data.log?.tasks || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeTask(task, key = dateKey) {
    const current = key === dateKey ? tasks : monthDays.find((day) => day.dateKey === key)?.tasks || []
    applyDay(
      key,
      current.filter((item) => item._id !== task._id),
    )
    try {
      const data = await api(`/api/workspace/journal/${key}/tasks/${task._id}`, { method: 'DELETE' })
      applyDay(key, data.log?.tasks || [])
    } catch (err) {
      applyDay(key, current)
      setError(err.message)
    }
  }

  const remaining = view === 'day' ? openCount : monthOpen
  const bar = view === 'day' ? progress : monthProgress

  return (
    <main className="w-full px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full bg-cream p-1 ring-1 ring-ink/6">
            {[
              { key: 'day', label: 'Jour' },
              { key: 'month', label: 'Mois' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  view === item.key ? 'bg-moss font-medium text-cream shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {remaining ? (
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{remaining}</span> à faire
            </p>
          ) : tasks.length || monthTotal ? (
            <p className="text-sm text-copper">C’est fait.</p>
          ) : null}
        </div>

        <header className="mt-10 flex items-center gap-3">
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink ring-1 ring-ink/8 transition hover:bg-paper"
            onClick={() =>
              view === 'day' ? goTo(toDateInput(addDays(parseLocalDate(dateKey), -1))) : shiftMonth(-1)
            }
            aria-label={view === 'day' ? 'Jour précédent' : 'Mois précédent'}
          >
            <Chevron dir="left" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="font-display text-[2.15rem] leading-none tracking-tight sm:text-5xl">
              {view === 'day' ? (isToday ? 'Aujourd’hui' : formatShortDay(dateKey)) : monthTitle(monthCursor)}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {view === 'day'
                ? isToday
                  ? formatDayTitle(dateKey)
                  : weekdayLabel(dateKey)
                : `${monthOpen} restante${monthOpen > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink ring-1 ring-ink/8 transition hover:bg-paper"
            onClick={() =>
              view === 'day' ? goTo(toDateInput(addDays(parseLocalDate(dateKey), 1))) : shiftMonth(1)
            }
            aria-label={view === 'day' ? 'Jour suivant' : 'Mois suivant'}
          >
            <Chevron dir="right" />
          </button>
        </header>

        {view === 'day' && !isToday ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => goTo(todayKey)}
              className="rounded-full bg-copper px-4 py-1.5 text-sm font-medium text-cream transition hover:bg-copper-dark"
            >
              Revenir à aujourd’hui
            </button>
          </div>
        ) : null}

        <div className="mt-8 h-0.75 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full rounded-full bg-moss transition-[width] duration-500" style={{ width: `${bar}%` }} />
        </div>

        <form
          className="mt-8 flex items-center gap-3 rounded-3xl bg-cream px-3 py-2.5 shadow-sm shadow-ink/5 ring-1 ring-ink/8 transition focus-within:ring-copper/35"
          onSubmit={addTask}
        >
          <button
            type="submit"
            disabled={pending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-moss text-cream transition hover:bg-ink disabled:opacity-50"
            aria-label="Ajouter"
          >
            <PlusIcon />
          </button>
          <input
            ref={inputRef}
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isToday ? 'Nouvelle tâche' : `Pour le ${formatDayTitle(dateKey).toLowerCase()}`}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-ink-soft/55"
            autoFocus
          />
        </form>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

        <section className="mt-6 rounded-[1.75rem] bg-cream/80 p-2 shadow-sm shadow-ink/5 ring-1 ring-ink/6 sm:p-3">
          {view === 'day' ? (
            <TaskList
              tasks={tasks}
              empty="La journée est libre."
              onToggle={toggleTask}
              onRename={renameTask}
              onRemove={removeTask}
            />
          ) : monthTasks.length === 0 ? (
            <div className="px-2 py-16 text-center">
              <p className="font-display text-2xl tracking-tight text-ink/70">Rien ce mois-ci.</p>
              <p className="mt-2 text-sm text-ink-soft">Ajoutez une tâche, elle se pose sur le jour choisi.</p>
            </div>
          ) : (
            <div className="space-y-8 px-1 py-2">
              {monthTasks.map((day) => (
                <section key={day.dateKey}>
                  <button
                    type="button"
                    onClick={() => {
                      setDateKey(day.dateKey)
                      inputRef.current?.focus()
                    }}
                    className={`px-3 font-display text-xl tracking-tight ${
                      day.dateKey === dateKey ? 'text-copper' : 'text-ink/70 hover:text-ink'
                    }`}
                  >
                    {day.dateKey === todayKey ? 'Aujourd’hui' : formatDayTitle(day.dateKey)}
                  </button>
                  <TaskList
                    tasks={day.tasks || []}
                    empty=""
                    onToggle={(task) => toggleTask(task, day.dateKey)}
                    onRename={(task, next) => renameTask(task, next, day.dateKey)}
                    onRemove={(task) => removeTask(task, day.dateKey)}
                  />
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Journal
