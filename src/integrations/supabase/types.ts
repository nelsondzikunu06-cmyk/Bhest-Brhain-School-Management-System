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
      ai_insights: {
        Row: {
          actions: Json
          created_at: string
          generated_by: string | null
          headline: string
          id: string
          metrics: Json
          risk_level: string
          risk_score: number
          scope: string
          student_id: string | null
          summary: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          generated_by?: string | null
          headline: string
          id?: string
          metrics?: Json
          risk_level?: string
          risk_score?: number
          scope?: string
          student_id?: string | null
          summary: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          generated_by?: string | null
          headline?: string
          id?: string
          metrics?: Json
          risk_level?: string
          risk_score?: number
          scope?: string
          student_id?: string | null
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          status: string
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience: string
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          target_class: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_class?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_class?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_structures: {
        Row: {
          amount: number
          class: string
          created_at: string
          id: string
        }
        Insert: {
          amount: number
          class: string
          created_at?: string
          id?: string
        }
        Update: {
          amount?: number
          class?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          amount_paid: number
          balance: number
          created_at: string
          id: string
          payment_date: string
          payment_method: string
          receipt_no: string | null
          student_id: string
        }
        Insert: {
          amount_paid: number
          balance?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          receipt_no?: string | null
          student_id: string
        }
        Update: {
          amount_paid?: number
          balance?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          receipt_no?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_logs: {
        Row: {
          created_at: string
          direction: string
          id: string
          note: string | null
          person_code: string
          person_type: string
          scanned_at: string
          scanned_by: string | null
          staff_id: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          person_code: string
          person_type?: string
          scanned_at?: string
          scanned_by?: string | null
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          note?: string | null
          person_code?: string
          person_type?: string
          scanned_at?: string
          scanned_by?: string | null
          staff_id?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_audit: {
        Row: {
          academic_year: string | null
          action: string
          changed_by: string | null
          created_at: string
          grade_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          student_id: string | null
          subject: string | null
          term: string | null
        }
        Insert: {
          academic_year?: string | null
          action: string
          changed_by?: string | null
          created_at?: string
          grade_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          student_id?: string | null
          subject?: string | null
          term?: string | null
        }
        Update: {
          academic_year?: string | null
          action?: string
          changed_by?: string | null
          created_at?: string
          grade_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          student_id?: string | null
          subject?: string | null
          term?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          academic_year: string
          class_contribution: number | null
          class_score: number | null
          created_at: string
          exam_contribution: number | null
          exam_score: number
          group_work: number
          id: string
          locked: boolean
          project_work: number
          score: number | null
          status: string
          student_id: string
          subject: string
          teacher_comment: string | null
          teacher_remark: string | null
          term: string
          test_1: number
          test_2: number
          total: number | null
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_contribution?: number | null
          class_score?: number | null
          created_at?: string
          exam_contribution?: number | null
          exam_score?: number
          group_work?: number
          id?: string
          locked?: boolean
          project_work?: number
          score?: number | null
          status?: string
          student_id: string
          subject: string
          teacher_comment?: string | null
          teacher_remark?: string | null
          term: string
          test_1?: number
          test_2?: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_contribution?: number | null
          class_score?: number | null
          created_at?: string
          exam_contribution?: number | null
          exam_score?: number
          group_work?: number
          id?: string
          locked?: boolean
          project_work?: number
          score?: number | null
          status?: string
          student_id?: string
          subject?: string
          teacher_comment?: string | null
          teacher_remark?: string | null
          term?: string
          test_1?: number
          test_2?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scale: {
        Row: {
          created_at: string
          grade: string
          id: string
          max_score: number
          min_score: number
          remark: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          max_score: number
          min_score: number
          remark: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          max_score?: number
          min_score?: number
          remark?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_user_id: string | null
          read_at: string | null
          sender_name: string | null
          sender_role: string
          sender_user_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_user_id?: string | null
          read_at?: string | null
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_user_id?: string | null
          read_at?: string | null
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          academic_year: string
          average: number | null
          class_size: number | null
          class_teacher_remark: string | null
          created_at: string
          days_absent: number
          days_late: number
          days_present: number
          days_total: number
          head_teacher_remark: string | null
          id: string
          overall_position: number | null
          promotion_status: string | null
          published_at: string | null
          published_by: string | null
          snapshot: Json | null
          status: string
          student_id: string
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          average?: number | null
          class_size?: number | null
          class_teacher_remark?: string | null
          created_at?: string
          days_absent?: number
          days_late?: number
          days_present?: number
          days_total?: number
          head_teacher_remark?: string | null
          id?: string
          overall_position?: number | null
          promotion_status?: string | null
          published_at?: string | null
          published_by?: string | null
          snapshot?: Json | null
          status?: string
          student_id: string
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          average?: number | null
          class_size?: number | null
          class_teacher_remark?: string | null
          created_at?: string
          days_absent?: number
          days_late?: number
          days_present?: number
          days_total?: number
          head_teacher_remark?: string | null
          id?: string
          overall_position?: number | null
          promotion_status?: string | null
          published_at?: string | null
          published_by?: string | null
          snapshot?: Json | null
          status?: string
          student_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          dob: string | null
          email: string | null
          full_name: string
          hire_date: string
          id: string
          phone: string | null
          photo_url: string | null
          role: string
          staff_code: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name: string
          hire_date?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          staff_code?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          staff_code?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          class: string
          created_at: string
          dob: string | null
          enrollment_date: string
          fee_balance: number
          full_name: string
          id: string
          medical_conditions: string | null
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          parent_user_id: string | null
          photo_url: string | null
          status: string
          student_code: string | null
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          dob?: string | null
          enrollment_date?: string
          fee_balance?: number
          full_name: string
          id?: string
          medical_conditions?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          photo_url?: string | null
          status?: string
          student_code?: string | null
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          dob?: string | null
          enrollment_date?: string
          fee_balance?: number
          full_name?: string
          id?: string
          medical_conditions?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          photo_url?: string | null
          status?: string
          student_code?: string | null
          updated_at?: string
        }
        Relationships: []
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
      claim_students_by_email: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "parent"
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
      app_role: ["admin", "parent"],
    },
  },
} as const
