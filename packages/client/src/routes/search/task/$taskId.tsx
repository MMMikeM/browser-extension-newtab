import { createFileRoute } from "@tanstack/react-router";
import { TaskSheet } from "~/components/task/task-sheet";

function SearchTaskSheet() {
  const { taskId } = Route.useParams();
  return <TaskSheet taskId={taskId} page="/search" />;
}

export const Route = createFileRoute("/search/task/$taskId")({
  component: SearchTaskSheet,
});
