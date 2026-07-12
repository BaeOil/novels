// Utility to derive novel status flags and labels
function normalizeStatus(value) {
  if (!value) return "draft";
  const v = String(value).toLowerCase().trim();
  switch (v) {
    case "publish":
    case "published":
      return "published";
    case "completed":
    case "complete":
    case "finished":
      return "completed";
    case "completed-published":
    case "completed_published":
    case "completed+published":
      return "completed-published";
    case "completed-draft":
    case "completed_draft":
    case "completed+draft":
      return "completed-draft";
    default:
      return "draft";
  }
}

function deriveMode(isCompleted, isPublished) {
  if (isCompleted && isPublished) return "completed-published";
  if (isCompleted) return "completed-draft";
  if (isPublished) return "published";
  return "draft";
}

function labelFor(mode) {
  switch (mode) {
    case "published":
      return "เผยแพร่";
    case "completed-published":
      return "จบแล้ว (เผยแพร่)";
    case "completed-draft":
      return "จบแล้ว (ฉบับร่าง)";
    default:
      return "ฉบับร่าง";
  }
}

export function getNovelStatusInfo(input = {}) {
  // input may contain: status, is_published, is_completed, isPublished, isCompleted
  const statusRaw = input.status || input.Status || "";
  const flagPublished = (typeof input.is_published === "boolean") ? input.is_published : (typeof input.isPublished === "boolean" ? input.isPublished : null);
  const flagCompleted = (typeof input.is_completed === "boolean") ? input.is_completed : (typeof input.isCompleted === "boolean" ? input.isCompleted : null);

  let resolvedPublished = false;
  let resolvedCompleted = false;

  if (flagPublished !== null) resolvedPublished = flagPublished;
  if (flagCompleted !== null) resolvedCompleted = flagCompleted;

  // if neither flag provided, derive from status string
  if (flagPublished === null && flagCompleted === null) {
    const norm = normalizeStatus(statusRaw);
    if (norm === "published") resolvedPublished = true;
    if (norm === "completed-published") {
      resolvedPublished = true; resolvedCompleted = true;
    }
    if (norm === "completed-draft" || norm === "completed") resolvedCompleted = true;
  }

  const mode = deriveMode(resolvedCompleted, resolvedPublished);
  const info = {
    rawStatus: statusRaw,
    isPublished: Boolean(resolvedPublished),
    isCompleted: Boolean(resolvedCompleted),
    mode,
    label: labelFor(mode),
    badgeLabel: mode === "published" ? "เผยแพร่" : (mode.startsWith("completed") ? "จบ" : "ฉบับร่าง"),
  };
  return info;
}

export default getNovelStatusInfo;
