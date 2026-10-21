import PoliceArt from './PoliceArt';
import Logo from './Logo';

export default function AuthCard({ title, subtitle, children }) {
  return (
    <>
      <header className="top"><Logo /></header>
      <div className="authwrap">
        <aside className="authart" aria-hidden="false">
          <PoliceArt />
          <div className="copy">
            <h2>Sua aprovação na carreira policial começa aqui</h2>
            <p>Questões por matéria, assunto e banca, simulados cronometrados e trilhas de estudo para o seu cargo.</p>
            <div className="chips"><span>PF</span><span>PRF</span><span>PM</span><span>PC</span><span>Guarda</span></div>
          </div>
        </aside>
        <main className="authform">
          <div className="card auth">
            <h1>{title}</h1>
            {subtitle && <p className="mut">{subtitle}</p>}
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
