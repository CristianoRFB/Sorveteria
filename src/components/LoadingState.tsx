export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return <div className="state-card" aria-live="polite">{label}</div>;
}
