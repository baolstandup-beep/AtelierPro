"use client";
import { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { initialState, type ActionResult, type FormAction } from "@/lib/action-types";
import { Field } from "./field";


const ErrorsContext = createContext<Record<string, string> | undefined>(undefined);

export function useFieldError(name: string): string | undefined {
  return useContext(ErrorsContext)?.[name];
}

/**
 * Formulaire relié à une action serveur : notifications de succès / d'erreur,
 * erreurs par champ, redirection ou réinitialisation après succès.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  redirectTo,
  onSuccess,
  id,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  redirectTo?: string | ((data: unknown) => string);
  onSuccess?: (data: unknown) => void;
  id?: string;
}) {
  const [state, formAction] = useActionState<ActionResult<unknown>, FormData>(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const handled = useRef(state);

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (!state.ok) {
      toast.error(state.error);
      return;
    }
    if (state.message) toast.success(state.message);
    if (resetOnSuccess) formRef.current?.reset();
    onSuccess?.(state.data);
    if (redirectTo) router.push(typeof redirectTo === "function" ? redirectTo(state.data) : redirectTo);
  }, [state, resetOnSuccess, redirectTo, onSuccess, router]);

  return (
    <ErrorsContext.Provider value={state.ok ? undefined : state.fieldErrors}>
      <form ref={formRef} action={formAction} className={className} id={id} noValidate>
        {children}
      </form>
    </ErrorsContext.Provider>
  );
}

/** Champ qui lit automatiquement son erreur dans le formulaire parent. */
export function FormField(props: Omit<React.ComponentProps<typeof Field>, "error"> & { name: string }) {
  const error = useFieldError(props.name);
  return <Field {...props} error={error} />;
}
