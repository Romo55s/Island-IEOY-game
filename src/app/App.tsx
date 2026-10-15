import { APP_NAME } from "../shared/domain";

export function App() {
  return (
    <main className="app-shell">
      <section className="title-card" aria-labelledby="game-title">
        <p className="eyebrow">Flight 404 // local prototype</p>
        <h1 id="game-title">{APP_NAME}</h1>
        <p className="status-copy">
          The black box is online. Multiplayer systems are being assembled.
        </p>
      </section>
    </main>
  );
}
