import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createId } from '@paralleldrive/cuid2'
import { generateKeyBetween } from 'fractional-indexing'
import { getTasks, createTask, updateTask, deleteTask } from '../functions/tasks'
import type { Task } from '../functions/tasks'

export const Route = createFileRoute('/')({
  component: TaskPage,
})

function getToken(): string {
  return localStorage.getItem('newtab-todo-token') || ''
}

function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(getToken())
  const [input, setInput] = useState('')

  if (token) return <>{children}</>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>New Tab Todo</h1>
      <p>Enter your auth token to get started.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          localStorage.setItem('newtab-todo-token', input)
          setToken(input)
        }}
      >
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Auth token"
        />
        <button type="submit">Save</button>
      </form>
    </div>
  )
}

function TaskPage() {
  return (
    <TokenGate>
      <TaskApp />
    </TokenGate>
  )
}

function TaskApp() {
  const token = getToken()
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks({ data: { token } }),
  })

  const addMutation = useMutation({
    mutationFn: createTask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => [
        ...old,
        {
          id: variables.data.id,
          title: variables.data.title,
          status: 'todo' as const,
          sort_order: variables.data.sort_order,
          created_at: variables.data.created_at,
          updated_at: variables.data.updated_at,
        },
      ])
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks'], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const updateMutation = useMutation({
    mutationFn: updateTask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t.id === variables.data.id ? { ...t, ...variables.data } as Task : t
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks'], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.filter((t) => t.id !== variables.data.id)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks'], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleAdd = (title: string) => {
    const lastOrder = tasks.length > 0 ? tasks[tasks.length - 1].sort_order : null
    const now = new Date().toISOString()
    addMutation.mutate({
      data: {
        token,
        id: createId(),
        title,
        sort_order: generateKeyBetween(lastOrder, null),
        created_at: now,
        updated_at: now,
      },
    })
  }

  const handleStatusToggle = (task: Task) => {
    const next = task.status === 'done' ? 'todo' : 'done'
    updateMutation.mutate({
      data: {
        token,
        id: task.id,
        status: next,
        updated_at: new Date().toISOString(),
      },
    })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ data: { token, id } })
  }

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading...</div>

  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <h1>Tasks</h1>
      <AddTaskInput onAdd={handleAdd} />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {activeTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => handleStatusToggle(task)}
            onDelete={() => handleDelete(task.id)}
          />
        ))}
      </ul>
      {doneTasks.length > 0 && (
        <>
          <h2>Done</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {doneTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleStatusToggle(task)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const title = value.trim()
        if (!title) return
        onAdd(title)
        setValue('')
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task..."
        autoFocus
        style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
      />
    </form>
  )
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={onToggle}
      />
      <span style={{ flex: 1, textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
        {task.title}
      </span>
      <button onClick={onDelete} style={{ cursor: 'pointer' }}>x</button>
    </li>
  )
}
