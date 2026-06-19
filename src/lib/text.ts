export function uppercaseText(value: string | null | undefined) {
  return String(value ?? "").trim().toLocaleUpperCase("id-ID");
}
