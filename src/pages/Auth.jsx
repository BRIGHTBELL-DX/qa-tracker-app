import { useState } from "react";
import { supabase, ALLOWED_DOMAIN } from "../lib/supabaseClient";

export default function Auth() {
  const [localPart, setLocalPart] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const email = localPart.trim() + "@" + ALLOWED_DOMAIN;

  async function sendLink(e) {
    e.preventDefault();
    setError("");
    if (!localPart.trim()) {
      setError("이메일 아이디를 입력하세요.");
      return;
    }
    setBusy(true);
    const { error: sendErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    setBusy(false);
    if (sendErr) {
      setError("로그인 메일 발송에 실패했어요: " + sendErr.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-mark">Brightbell / DX QA</div>
        <div className="brand-title">QA 트러블슈터</div>

        {sent ? (
          <div>
            <div className="hint" style={{ marginBottom: 12, fontSize: 13 }}>
              <b>{email}</b> 로 로그인 링크를 보냈어요. 메일함에서 "Sign in" 링크를 클릭하면 자동으로 로그인됩니다.
            </div>
            <button
              type="button"
              className="ghost-btn auth-back"
              onClick={() => {
                setSent(false);
                setLocalPart("");
              }}
            >
              다른 이메일로 다시
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink}>
            <div className="field">
              <label className="field-label">회사 이메일</label>
              <div className="email-input-row">
                <input
                  type="text"
                  autoFocus
                  placeholder="you"
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value)}
                />
                <span className="email-suffix">@{ALLOWED_DOMAIN}</span>
              </div>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="primary-btn auth-submit" disabled={busy}>
              {busy ? "발송 중..." : "로그인 링크 받기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
