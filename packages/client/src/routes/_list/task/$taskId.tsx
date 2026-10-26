import { createFileRoute } from "@tanstack/react-router";
import { TaskSheet } from "~/components/task/task-sheet";

function ListTaskSheet() {
  const { taskId } = Route.useParams();
  return <TaskSheet taskId={taskId} page="/" />;
}

export const Route = createFileRoute("/_list/task/$taskId")({
  component: ListTaskSheet,
});
