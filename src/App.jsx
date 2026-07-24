import { useEffect, useState } from "react";
import { supabase, ALLOWED_DOMAIN } from "./lib/supabaseClient";
import Auth from "./pages/Auth";
import Board from "./components/Board";

function isAllowedEmail(email) {
  return new RegExp("@" + ALLOWED_DOMAIN.replace(".", "\\.") + "$", "i").test(String(email || ""));
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [domainError, setDomainError] = useState(false);

  useEffect(() => {
    function handleSession(sess) {
      if (sess && !isAllowedEmail(sess.user.email)) {
        setDomainError(true);
        setSession(null);
        supabase.auth.signOut();
        return;
      }
      setSession(sess);
    }
    supabase.auth.getSession().then(({ data }) => handleSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => handleSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <Board session={session} /> : <Auth domainError={domainError} />;
}
