const SUPABASE_PAGE_SIZE = 1000;

type RangeQueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type RangeQuery<T> = {
  range(from: number, to: number): PromiseLike<RangeQueryResult<T>>;
};

export async function fetchAllRows<T>(createQuery: () => RangeQuery<T>) {
  const rows: T[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await createQuery().range(from, to);

    if (error) {
      return { data: rows, error };
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      return { data: rows, error: null };
    }
  }
}
