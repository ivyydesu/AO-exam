import { redirect } from "next/navigation";

export default function DemoLegacyRedirectPage() {
  redirect("/home");
}

