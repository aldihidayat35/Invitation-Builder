"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import styles from "./login.module.css";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />
      <label className={styles.field}>
        <span>Email</span>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
        />
      </label>
      {state.error ? (
        <p id="login-error" role="alert" className={styles.error}>
          {state.error}
        </p>
      ) : null}
      <button id="login-submit" type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
