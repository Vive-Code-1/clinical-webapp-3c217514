export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          booking_source: Database["public"]["Enums"]["booking_source"]
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string | null
          clinic_id: string
          color: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          internal_notes: string | null
          location_id: string | null
          meeting_url: string | null
          notes: string | null
          practitioner_id: string
          room_id: string | null
          service_type_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          booking_source?: Database["public"]["Enums"]["booking_source"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          clinic_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          meeting_url?: string | null
          notes?: string | null
          practitioner_id: string
          room_id?: string | null
          service_type_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          booking_source?: Database["public"]["Enums"]["booking_source"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          clinic_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          meeting_url?: string | null
          notes?: string | null
          practitioner_id?: string
          room_id?: string | null
          service_type_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          clinic_id: string
          created_at: string
          end_time: string | null
          id: string
          is_closed: boolean
          note: string | null
          override_date: string
          practitioner_id: string
          start_time: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          note?: string | null
          override_date: string
          practitioner_id: string
          start_time?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          note?: string | null
          override_date?: string
          practitioner_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          clinic_id: string
          created_at: string
          day_of_week: Database["public"]["Enums"]["weekday"]
          end_time: string
          id: string
          is_active: boolean
          location_id: string | null
          practitioner_id: string
          start_time: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          day_of_week: Database["public"]["Enums"]["weekday"]
          end_time: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          practitioner_id: string
          start_time: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["weekday"]
          end_time?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          practitioner_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          clinic_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          client_id: string
          clinic_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          clinic_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          appointment_id: string | null
          category: string
          client_id: string
          clinic_id: string
          created_at: string
          description: string | null
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          category?: string
          client_id: string
          clinic_id: string
          created_at?: string
          description?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          category?: string
          client_id?: string
          clinic_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      client_medical_info: {
        Row: {
          allergies: string | null
          blood_type: string | null
          client_id: string
          clinic_id: string
          conditions: string | null
          created_at: string
          family_history: string | null
          height_cm: number | null
          id: string
          lifestyle: string | null
          medications: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          client_id: string
          clinic_id: string
          conditions?: string | null
          created_at?: string
          family_history?: string | null
          height_cm?: number | null
          id?: string
          lifestyle?: string | null
          medications?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          client_id?: string
          clinic_id?: string
          conditions?: string | null
          created_at?: string
          family_history?: string | null
          height_cm?: number | null
          id?: string
          lifestyle?: string | null
          medications?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_medical_info_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_medical_info_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_clients: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_clients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          bio: string | null
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["clinic_role"]
          title: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["clinic_role"]
          title?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["clinic_role"]
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          appointment_id: string | null
          client_id: string
          clinic_id: string
          content: Json
          created_at: string
          id: string
          is_locked: boolean
          kind: Database["public"]["Enums"]["clinical_note_kind"]
          locked_at: string | null
          practitioner_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          clinic_id: string
          content?: Json
          created_at?: string
          id?: string
          is_locked?: boolean
          kind?: Database["public"]["Enums"]["clinical_note_kind"]
          locked_at?: string | null
          practitioner_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          clinic_id?: string
          content?: Json
          created_at?: string
          id?: string
          is_locked?: boolean
          kind?: Database["public"]["Enums"]["clinical_note_kind"]
          locked_at?: string | null
          practitioner_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          brand_color: string
          brand_font: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_color?: string
          brand_font?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_color?: string
          brand_font?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          client_id: string
          clinic_id: string
          created_at: string
          id: string
          last_message_at: string
          practitioner_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          clinic_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          practitioner_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          practitioner_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          clinic_id: string
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          exercise_id: string
          frequency: string | null
          id: string
          notes: string | null
          reps: number | null
          sets: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_id: string
          frequency?: string | null
          id?: string
          notes?: string | null
          reps?: number | null
          sets?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          reps?: number | null
          sets?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_assignments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_assignments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          default_duration_seconds: number | null
          default_reps: number | null
          default_sets: number | null
          description: string | null
          id: string
          image_url: string | null
          instructions: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          default_duration_seconds?: number | null
          default_reps?: number | null
          default_sets?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          default_duration_seconds?: number | null
          default_reps?: number | null
          default_sets?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      home_analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          locale: string
          metadata: Json
          path: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          locale?: string
          metadata?: Json
          path?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          locale?: string
          metadata?: Json
          path?: string | null
        }
        Relationships: []
      }
      home_leads: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          locale: string
          phone: string | null
          service: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          locale?: string
          phone?: string | null
          service?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          locale?: string
          phone?: string | null
          service?: string | null
          source?: string | null
        }
        Relationships: []
      }
      intake_forms: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["intake_form_kind"]
          schema: Json
          title: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["intake_form_kind"]
          schema?: Json
          title: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["intake_form_kind"]
          schema?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          answers: Json
          appointment_id: string | null
          client_id: string
          clinic_id: string
          created_at: string
          form_id: string
          id: string
          signature: string | null
          signed_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          appointment_id?: string | null
          client_id: string
          clinic_id: string
          created_at?: string
          form_id: string
          id?: string
          signature?: string | null
          signed_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          appointment_id?: string | null
          client_id?: string
          clinic_id?: string
          created_at?: string
          form_id?: string
          id?: string
          signature?: string | null
          signed_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_responses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          clinic_id: string
          next_number: number
        }
        Insert: {
          clinic_id: string
          next_number?: number
        }
        Update: {
          clinic_id?: string
          next_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          line_total_cents: number
          position: number
          quantity: number
          service_type_id: string | null
          tax_rate_bps: number
          unit_price_cents: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          line_total_cents?: number
          position?: number
          quantity?: number
          service_type_id?: string | null
          tax_rate_bps?: number
          unit_price_cents?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          line_total_cents?: number
          position?: number
          quantity?: number
          service_type_id?: string | null
          tax_rate_bps?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid_cents: number
          appointment_id: string | null
          client_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          currency: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number
          appointment_id?: string | null
          client_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          appointment_id?: string | null
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          clinic_id: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          postal_code: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          clinic_id: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          clinic_id?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      note_templates: {
        Row: {
          body: Json
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["clinical_note_kind"]
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["clinical_note_kind"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: Json
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["clinical_note_kind"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          clinic_id: string
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          received_at: string
          recorded_by: string | null
          reference: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount_cents: number
          clinic_id: string
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          received_at?: string
          recorded_by?: string | null
          reference?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          clinic_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          received_at?: string
          recorded_by?: string | null
          reference?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioner_services: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          practitioner_id: string
          service_type_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          practitioner_id: string
          service_type_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          practitioner_id?: string
          service_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          ical_token: string
          id: string
          preferred_language: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          ical_token?: string
          id: string
          preferred_language?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          ical_token?: string
          id?: string
          preferred_language?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          appointment_id: string
          channel: string
          clinic_id: string
          error: string | null
          id: string
          sent_at: string
          status: string
        }
        Insert: {
          appointment_id: string
          channel: string
          clinic_id: string
          error?: string | null
          id?: string
          sent_at?: string
          status: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          clinic_id?: string
          error?: string | null
          id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          clinic_id: string
          email_enabled: boolean
          hours_before: number
          send_confirmations: boolean
          sms_enabled: boolean
          twilio_from: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          email_enabled?: boolean
          hours_before?: number
          send_confirmations?: boolean
          sms_enabled?: boolean
          twilio_from?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          email_enabled?: boolean
          hours_before?: number
          send_confirmations?: boolean
          sms_enabled?: boolean
          twilio_from?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          name: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_payment_methods: {
        Row: {
          brand: string | null
          client_id: string
          clinic_id: string
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          client_id: string
          clinic_id: string
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          client_id?: string
          clinic_id?: string
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_payment_methods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clinic_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_payment_methods_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          buffer_after_minutes: number
          buffer_before_minutes: number
          clinic_id: string
          color: string
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_telehealth: boolean
          name: string
          online_bookable: boolean
          price_cents: number
          updated_at: string
        }
        Insert: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          clinic_id: string
          color?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_telehealth?: boolean
          name: string
          online_bookable?: boolean
          price_cents?: number
          updated_at?: string
        }
        Update: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          clinic_id?: string
          color?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_telehealth?: boolean
          name?: string
          online_bookable?: boolean
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          rate_bps: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          rate_bps: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          rate_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_conversation: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      ensure_self_client_record: {
        Args: {
          _clinic_id: string
          _email?: string
          _full_name?: string
          _phone?: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_owner: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinic_practitioner: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      next_invoice_number: { Args: { _clinic_id: string }; Returns: string }
      recalc_invoice_totals: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "practitioner" | "receptionist" | "client"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "arrived"
        | "completed"
        | "no_show"
        | "cancelled"
      assignment_status: "active" | "completed" | "paused"
      booking_source: "staff" | "client_portal" | "public"
      clinic_role: "owner" | "practitioner" | "receptionist"
      clinical_note_kind: "soap" | "follow_up" | "couple" | "family" | "general"
      intake_form_kind: "intake" | "consent" | "questionnaire"
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "partially_paid"
        | "void"
        | "overdue"
      payment_method:
        | "cash"
        | "card"
        | "etransfer"
        | "stripe"
        | "insurance"
        | "other"
      weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "practitioner", "receptionist", "client"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "arrived",
        "completed",
        "no_show",
        "cancelled",
      ],
      assignment_status: ["active", "completed", "paused"],
      booking_source: ["staff", "client_portal", "public"],
      clinic_role: ["owner", "practitioner", "receptionist"],
      clinical_note_kind: ["soap", "follow_up", "couple", "family", "general"],
      intake_form_kind: ["intake", "consent", "questionnaire"],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "partially_paid",
        "void",
        "overdue",
      ],
      payment_method: [
        "cash",
        "card",
        "etransfer",
        "stripe",
        "insurance",
        "other",
      ],
      weekday: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
  },
} as const
