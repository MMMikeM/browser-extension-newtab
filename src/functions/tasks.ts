import { createServerFn } from '@tanstack/react-start'
import { client } from '../lib/db.server'
import { validateToken } from '../lib/auth.server'

export interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  sort_order: string | null
  created_at: string
  updated_at: string
}

export const getTasks = createServerFn({ method: 'GET' })
  .validator((input: unknown) => {
    const d = input as { token: string }
    if (!d.token) throw new Error('Token required')
    return d
  })
  .handler(async ({ data }) => {
    validateToken(data.token)
    const result = await client.execute(
      'SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC'
    )
    return result.rows as unknown as Task[]
  })

export const createTask = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const d = input as {
      token: string
      id: string
      title: string
      sort_order: string | null
      created_at: string
      updated_at: string
    }
    if (!d.token || !d.id || !d.title) throw new Error('Invalid input')
    return d
  })
  .handler(async ({ data }) => {
    validateToken(data.token)
    await client.execute({
      sql: 'INSERT INTO tasks (id, title, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [data.id, data.title, 'todo', data.sort_order, data.created_at, data.updated_at],
    })
    return { id: data.id }
  })

export const updateTask = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const d = input as {
      token: string
      id: string
      title?: string
      status?: string
      sort_order?: string
      updated_at: string
    }
    if (!d.token || !d.id || !d.updated_at) throw new Error('Invalid input')
    return d
  })
  .handler(async ({ data }) => {
    validateToken(data.token)
    const sets: string[] = []
    const args: (string | null)[] = []

    if (data.title !== undefined) {
      sets.push('title = ?')
      args.push(data.title)
    }
    if (data.status !== undefined) {
      sets.push('status = ?')
      args.push(data.status)
    }
    if (data.sort_order !== undefined) {
      sets.push('sort_order = ?')
      args.push(data.sort_order)
    }
    sets.push('updated_at = ?')
    args.push(data.updated_at)

    args.push(data.id, data.updated_at)

    const result = await client.execute({
      sql: `UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND updated_at < ?`,
      args,
    })
    return { updated: result.rowsAffected > 0 }
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const d = input as { token: string; id: string }
    if (!d.token || !d.id) throw new Error('Invalid input')
    return d
  })
  .handler(async ({ data }) => {
    validateToken(data.token)
    const result = await client.execute({
      sql: 'DELETE FROM tasks WHERE id = ?',
      args: [data.id],
    })
    return { deleted: result.rowsAffected > 0 }
  })
