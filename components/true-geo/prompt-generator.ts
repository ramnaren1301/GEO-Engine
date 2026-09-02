import type { PageEvidence } from "./runtime";

export type DomainPrompt = { query: string; sentimentTopic: string; intent: string };

const titleCase = (value: string) => value.split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

function subjectOf(pageUrl: string, evidence?: PageEvidence | null) {
  if (evidence?.title?.trim()) return evidence.title.trim().slice(0, 100);
  const url = new URL(pageUrl);
  const slug = decodeURIComponent(url.pathname).split("/").filter(Boolean).pop();
  return slug ? titleCase(slug).slice(0, 100) : url.hostname;
}

export function generateDomainPrompts(domainUrl: string, pageUrl: string, evidence?: PageEvidence | null): DomainPrompt[] {
  const subject = subjectOf(pageUrl, evidence);
  const domain = new URL(domainUrl).hostname;
  return [
    { sentimentTopic: "Trust", intent: "validation", query: `Is ${subject} on ${domain} a trustworthy source for making a decision?` },
    { sentimentTopic: "Quality", intent: "evaluation", query: `How reliable and complete is the information provided by ${subject}?` },
    { sentimentTopic: "Value", intent: "consideration", query: `What value, benefits, or outcomes does ${subject} provide compared with alternatives?` },
    { sentimentTopic: "Experience", intent: "consideration", query: `What experience should someone expect when using or choosing ${subject}?` },
    { sentimentTopic: "Risk", intent: "risk review", query: `What concerns, limitations, or risks should someone know before choosing ${subject}?` },
    { sentimentTopic: "Recommendation", intent: "decision", query: `Who is ${subject} best suited for, and when should it be recommended?` },
  ];
}
