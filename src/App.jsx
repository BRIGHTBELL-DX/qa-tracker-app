import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Auth from "./pages/Auth";
import Board from "./components/Board";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <Board session={session} /> : <Auth />;
}
