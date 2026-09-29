/** How a pull is paid: the series price (coins, or stamps on No. 07), a ticket, or free (the first pull). */
export type Payment = 'price' | 'ticket' | 'free';

/**
 * How another pull would be paid. The button always shows it, so nothing switches silently:
 * the same way as last time when possible, otherwise the other way, otherwise no second pull.
 * A free pull is only ever the first one.
 */
export function nextPayment(last: Payment, canAfford: boolean, tickets: number): Exclude<Payment, 'free'> | null {
  const order: Exclude<Payment, 'free'>[] = last === 'ticket' ? ['ticket', 'price'] : ['price', 'ticket'];
  return order.find((p) => (p === 'ticket' ? tickets > 0 : canAfford)) ?? null;
}

/** The options for the store's pull(). */
export function pullOptions(pay: Payment): { useTicket?: boolean; free?: boolean } {
  return pay === 'ticket' ? { useTicket: true } : pay === 'free' ? { free: true } : {};
}
