/** Keep musical symbols at their real size; dense bars scroll inside their own cell. */
export function scoreLayout(available: number, minimum: number, count: number) {
  const columns = Math.max(
    1,
    Math.min(2, count, Math.floor(available / (minimum + 2))),
  );
  return {
    columns,
    width: Math.max(minimum, Math.floor(available / columns) - 2),
  };
}
