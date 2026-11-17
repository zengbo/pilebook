import app from "./app";
import { runReminders } from "./reminders";

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
} satisfies ExportedHandler<Env>;
