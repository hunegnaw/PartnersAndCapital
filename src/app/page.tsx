import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Redirect based on role
  switch (session.user.role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      redirect("/admin");
      break;
    case "ADVISOR":
      redirect("/advisor/dashboard");
      break;
    case "CLIENT":
    default:
      redirect("/dashboard");
      break;
  }
}
