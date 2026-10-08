import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm({ title = "Entrar", description }: { title?: string; description?: string }) {
  const { signIn, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSubmitError(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Falha ao entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="content">
      <section className="state-card login-card">
        <span className="eyebrow">Acesso seguro</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        <form className="form-grid" onSubmit={submit}>
          <label>E-mail<input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Senha<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {(submitError || authError) && <p role="alert" className="error-text">{submitError ?? authError}</p>}
          <button className="button primary" type="submit" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
