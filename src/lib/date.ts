const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateParts(value: string): DateParts | null {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 2020 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function jakartaDateStartIso(parts: DateParts) {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) - JAKARTA_OFFSET_MS,
  ).toISOString();
}

export function isValidDateInput(value: string | null | undefined) {
  return Boolean(value && parseDateParts(value));
}

export function getCurrentJakartaDate() {
  return new Date(Date.now() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

export function getCurrentJakartaMonth() {
  return getCurrentJakartaDate().slice(0, 7);
}

export function getJakartaMonthDateRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - JAKARTA_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - JAKARTA_OFFSET_MS);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function getJakartaDateRange(dateFrom: string, dateTo: string) {
  const fromParts = parseDateParts(dateFrom);
  const toParts = parseDateParts(dateTo);

  if (!fromParts || !toParts) {
    throw new Error("Invalid Jakarta date range.");
  }

  const startIso = jakartaDateStartIso(fromParts);
  const endExclusiveIso = new Date(
    Date.UTC(toParts.year, toParts.month - 1, toParts.day + 1) -
      JAKARTA_OFFSET_MS,
  ).toISOString();

  return {
    startIso,
    endExclusiveIso,
  };
}

export function getDefaultJakartaDateRange() {
  const today = getCurrentJakartaDate();
  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const end = new Date(Date.UTC(year, month, 0));

  return {
    from: `${yearText}-${monthText}-01`,
    to: end.toISOString().slice(0, 10),
  };
}

export function jakartaDateToIso(value: string) {
  const parts = parseDateParts(value);

  if (!parts) {
    throw new Error("Invalid Jakarta date.");
  }

  return jakartaDateStartIso(parts);
}

export function jakartaDateTimeLocalToIso(value: string) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const parts = parseDateParts(datePart);
  const [hourText = "0", minuteText = "0"] = timePart.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !parts ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Invalid Jakarta datetime.");
  }

  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute) -
      JAKARTA_OFFSET_MS,
  ).toISOString();
}

export function getValidJakartaMonth(value: string | undefined) {
  if (!value || !MONTH_PATTERN.test(value)) {
    return getCurrentJakartaMonth();
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2020 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return getCurrentJakartaMonth();
  }

  return value;
}
