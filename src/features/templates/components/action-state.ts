/** Result shape returned by template server actions to `useActionState`. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
}

export type TemplateAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
