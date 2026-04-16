import { redirect } from "next/navigation";

export default function CaregiverLoginPage() {
  redirect("/signin?role=caregiver");
}
