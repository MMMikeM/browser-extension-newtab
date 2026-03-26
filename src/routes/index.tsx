import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTasks, useAddTask, useUpdateTask, useDeleteTask } from "../lib/hooks";
import type { Task } from "../functions/tasks";

export const Route = createFileRoute("/")({
  component: TaskPage,
});

function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("newtab-todo-token") || "");
  const [input, setInput] = useState("");

  if (token) return <>{children}</>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>New Tab Todo</h1>
      <p>Enter your auth token to get started.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem("newtab-todo-token", input);
          setToken(input);
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
  );
}

function TaskPage() {
  return (
    <TokenGate>
      <TaskApp />
    </TokenGate>
  );
}

function TaskApp() {
  const { data: tasks = [], isLoading } = useTasks();
  const addTask = useAddTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  const pendingDeleteId = deleteTask.isPending ? deleteTask.variables?.data.id : null;
  const pendingUpdate = updateTask.isPending ? updateTask.variables?.data : null;

  const visibleTasks = tasks
    .filter((t) => t.id !== pendingDeleteId)
    .map((t) => (pendingUpdate?.id === t.id ? ({ ...t, ...pendingUpdate } as Task) : t));

  const activeTasks = visibleTasks.filter((t) => t.status !== "done");
  const doneTasks = visibleTasks.filter((t) => t.status === "done");

  return (
    <div style={{ padding: "2rem", maxWidth: 600 }}>
      <h1>Tasks</h1>
      <AddTaskInput onAdd={(title) => addTask.add(title)} />
      <ul style={{ listStyle: "none", padding: 0 }}>
        {activeTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            pending={pendingUpdate?.id === task.id || pendingDeleteId === task.id}
            onToggle={() =>
              updateTask.mutate({
                data: {
                  id: task.id,
                  status: task.status === "done" ? "todo" : "done",
                  updatedAt: new Date().toISOString(),
                },
              })
            }
            onDelete={() => deleteTask.mutate({ data: { id: task.id } })}
          />
        ))}
        {addTask.isPending && (
          <TaskItem
            task={
              {
                ...addTask.variables!.data,
                status: "todo",
                description: null,
                sortOrder: null,
                createdAt: "",
                updatedAt: "",
              } as Task
            }
            pending
            onToggle={() => {}}
            onDelete={() => {}}
          />
        )}
      </ul>
      {doneTasks.length > 0 && (
        <>
          <h2>Done</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {doneTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                pending={pendingUpdate?.id === task.id || pendingDeleteId === task.id}
                onToggle={() =>
                  updateTask.mutate({
                    data: {
                      id: task.id,
                      status: "todo",
                      updatedAt: new Date().toISOString(),
                    },
                  })
                }
                onDelete={() => deleteTask.mutate({ data: { id: task.id } })}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const title = value.trim();
        if (!title) return;
        onAdd(title);
        setValue("");
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a task..."
        autoFocus
        style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
      />
    </form>
  );
}

function TaskItem({
  task,
  pending,
  onToggle,
  onDelete,
}: {
  task: Task;
  pending?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0",
        opacity: pending ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={onToggle}
        disabled={pending}
      />
      <span style={{ flex: 1, textDecoration: task.status === "done" ? "line-through" : "none" }}>
        {task.title}
      </span>
      <button onClick={onDelete} disabled={pending} style={{ cursor: "pointer" }}>
        x
      </button>
    </li>
  );
}
