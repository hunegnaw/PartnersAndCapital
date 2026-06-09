export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startStatementScheduler } = await import("@/lib/statement-scheduler");
    startStatementScheduler();
  }
}
