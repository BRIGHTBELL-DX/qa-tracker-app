import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../lib/useTheme";

export default function Auth({ domainError }) {
  const [theme, toggleTheme] = useTheme();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand" style={{ padding: 0, border: "none", marginBottom: 4 }}>
          <div>
            <div className="brand-mark">Brightbell / DX QA</div>
            <div className="brand-title">QA 트러블슈터</div>
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="라이트/다크 모드 전환">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {domainError && (
          <div className="auth-error" style={{ marginBottom: 14 }}>
            brightbell.co.kr 계정으로만 로그인할 수 있어요. 로그아웃되었으니 다시 시도해주세요.
          </div>
        )}

        <button className="primary-btn auth-submit" onClick={signIn}>
          Microsoft 계정으로 로그인
        </button>
        <div className="hint" style={{ marginTop: 10 }}>
          brightbell.co.kr 회사 계정으로만 로그인할 수 있어요.
        </div>
      </div>
    </div>
  );
}
