export function uppercaseText(value: string | null | undefined) {
  return String(value ?? "").trim().toLocaleUpperCase("id-ID");
}

export function formatOutgoingDestination(
  destination: string,
  attentionTo?: string | null,
) {
  const destinationText = String(destination ?? "").trim();
  const attentionText = String(attentionTo ?? "").trim();

  if (
    !attentionText ||
    destinationText.toLocaleLowerCase("id-ID") ===
      attentionText.toLocaleLowerCase("id-ID")
  ) {
    return destinationText || "-";
  }

  return `${destinationText} / U.P ${attentionText}`;
}
