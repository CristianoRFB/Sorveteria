export function ErrorState({ message }: { message: string }) {
  return (
    <section className="state-card" role="alert">
      <h2>Não foi possível continuar</h2>
      <p>{message}</p>
    </section>
  );
}
