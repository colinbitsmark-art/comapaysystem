/** Display label for account pickers when names repeat across currencies. */
export function formatAccountSelectLabel(account: { name: string; currencyCode: string }): string {
  return `${account.name} (${account.currencyCode})`;
}
