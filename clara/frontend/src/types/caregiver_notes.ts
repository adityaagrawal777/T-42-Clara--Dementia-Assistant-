// ── Caregiver Notes ─────────────────────────────────────────────────────────────

export interface CaregiverNote {
  id: string;
  patient_id: string;
  caregiver_id: string;
  organization_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
