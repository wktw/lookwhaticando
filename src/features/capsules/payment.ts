/** How a pull is paid: the machine's price (coins, or stars on Dreamy), or a ticket. */
export type Payment = 'price' | 'ticket';

/**
 * How another pull would be paid. The button always shows it, so nothing switches silently:
 * the same way as last time when possible, otherwise the other way, otherwise no second pull.
 */
export function nextPayment(last: Payment, canAfford: boolean, tickets: number): Payment | null {
  const order: Payment[] = last === 'ticket' ? ['ticket', 'price'] : ['price', 'ticket'];
  return order.find((p) => (p === 'ticket' ? tickets > 0 : canAfford)) ?? null;
}
