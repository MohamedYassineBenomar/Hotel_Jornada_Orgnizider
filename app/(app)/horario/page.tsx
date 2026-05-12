import { redirect } from "next/navigation";

import {
  currentIsoWeekKey,
  formatIsoWeekKey,
} from "@/lib/time/iso-week";

export const dynamic = "force-dynamic";

export default function HorarioRedirect() {
  redirect(`/horario/${formatIsoWeekKey(currentIsoWeekKey())}`);
}
