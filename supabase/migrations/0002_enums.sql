-- Enum types (Section 4).

create type public.user_role as enum ('admin', 'doctor', 'receptionist');

create type public.gender_type as enum ('male', 'female', 'other');

create type public.appointment_status as enum (
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

create type public.prescription_status as enum ('active', 'completed', 'cancelled');

create type public.invoice_status as enum ('unpaid', 'partially_paid', 'paid', 'cancelled');

create type public.payment_method_type as enum (
  'cash',
  'mobile_money',
  'card',
  'bank_transfer',
  'insurance'
);

create type public.file_category_type as enum (
  'lab_result',
  'scan',
  'referral',
  'consent_form',
  'id_document',
  'other'
);
