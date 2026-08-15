import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login-shell">
      <form action={signIn} className="panel login-card">
        <span className="eyebrow dark">MORE THAN ENERGY</span>
        <h1>Retail CRM sign in</h1>
        <p>Authorized MTE users only.</p>
        {params.error && <div className="alert error">{params.error}</div>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary">Sign in</button>
      </form>
    </main>
  );
}
