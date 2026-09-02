import type { LucideIcon } from "lucide-react";
import { FileCheck2, LayoutDashboard, Network, ScrollText, TriangleAlert } from "lucide-react";

export type TabId = "pulse" | "answers" | "gaps" | "fixes" | "activity";

export type ActivityItem = {
  id: number;
  tool: string;
  detail: string;
  time: string;
  status: "complete" | "running";
};

export const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "pulse", label: "AI visibility", icon: LayoutDashboard },
  { id: "answers", label: "Answer engine scores", icon: Network },
  { id: "gaps", label: "Content gaps", icon: TriangleAlert },
  { id: "fixes", label: "Next steps", icon: FileCheck2 },
  { id: "activity", label: "Agent activity", icon: ScrollText },
];

export const initialActivity: ActivityItem[] = [
  { id: 1, tool: "workflow_ready", detail: "Choose a page visibility scan or a URL-independent prompt run", time: "Now", status: "complete" },
];
