"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import type { DoctorWithProfile } from "@/actions/doctors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorProfileForm } from "@/components/features/doctors/doctor-profile-form";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export function DoctorProfileCard({ doctor, canEdit }: { doctor: DoctorWithProfile; canEdit: boolean }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Profile</CardTitle>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <DoctorProfileForm doctor={doctor} onDone={() => setIsEditing(false)} />
        ) : (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Name" value={doctor.profile?.full_name} />
            <Field label="Specialization" value={doctor.specialization} />
            <Field label="License number" value={<span className="font-mono">{doctor.license_number}</span>} />
            <Field label="Qualifications" value={doctor.qualifications} />
            <Field label="Consultation fee" value={`$${Number(doctor.consultation_fee).toFixed(2)}`} />
            <Field label="Phone" value={doctor.profile?.phone} />
            <Field
              label="Status"
              value={
                doctor.is_accepting_appointments ? (
                  <Badge>Accepting appointments</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Not accepting
                  </Badge>
                )
              }
            />
            {doctor.bio && (
              <div className="col-span-full flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Bio</dt>
                <dd className="text-sm">{doctor.bio}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
