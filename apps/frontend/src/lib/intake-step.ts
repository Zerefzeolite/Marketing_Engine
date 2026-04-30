export function nextStep(current: number): number {
  return current >= 2 ? 2 : current + 1
}

export function previousStep(current: number): number {
  return current <= 1 ? 1 : current - 1
}
