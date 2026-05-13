import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MarketingLanding(): never {
  redirect("/api/auth/demo");
}
