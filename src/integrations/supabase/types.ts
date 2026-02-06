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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alphabet_letters: {
        Row: {
          audio_url: string | null
          created_at: string
          id: number
          letter_arabic: string
          name_arabic: string
          name_french: string
          position_final: string | null
          position_initial: string | null
          position_isolated: string | null
          position_medial: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: number
          letter_arabic: string
          name_arabic: string
          name_french: string
          position_final?: string | null
          position_initial?: string | null
          position_isolated?: string | null
          position_medial?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: number
          letter_arabic?: string
          name_arabic?: string
          name_french?: string
          position_final?: string | null
          position_initial?: string | null
          position_isolated?: string | null
          position_medial?: string | null
        }
        Relationships: []
      }
      invocations: {
        Row: {
          audio_url: string | null
          category: string | null
          content_arabic: string | null
          content_french: string | null
          created_at: string
          id: number
          title_arabic: string
          title_french: string
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          content_arabic?: string | null
          content_french?: string | null
          created_at?: string
          id?: number
          title_arabic: string
          title_french: string
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          content_arabic?: string | null
          content_french?: string | null
          created_at?: string
          id?: number
          title_arabic?: string
          title_french?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          asr_reminder: boolean
          created_at: string
          daily_reminder_time: string | null
          dhuhr_reminder: boolean
          fajr_reminder: boolean
          id: string
          isha_reminder: boolean
          maghrib_reminder: boolean
          prayer_reminders: boolean
          ramadan_activities: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          asr_reminder?: boolean
          created_at?: string
          daily_reminder_time?: string | null
          dhuhr_reminder?: boolean
          fajr_reminder?: boolean
          id?: string
          isha_reminder?: boolean
          maghrib_reminder?: boolean
          prayer_reminders?: boolean
          ramadan_activities?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          asr_reminder?: boolean
          created_at?: string
          daily_reminder_time?: string | null
          dhuhr_reminder?: boolean
          fajr_reminder?: boolean
          id?: string
          isha_reminder?: boolean
          maghrib_reminder?: boolean
          prayer_reminders?: boolean
          ramadan_activities?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nourania_lessons: {
        Row: {
          audio_url: string | null
          created_at: string
          description: string | null
          id: number
          lesson_number: number
          title_arabic: string
          title_french: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          description?: string | null
          id?: number
          lesson_number: number
          title_arabic: string
          title_french: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          description?: string | null
          id?: number
          lesson_number?: number
          title_arabic?: string
          title_french?: string
        }
        Relationships: []
      }
      prayer_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_default: boolean
          name_arabic: string
          name_french: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_default?: boolean
          name_arabic: string
          name_french: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_default?: boolean
          name_arabic?: string
          name_french?: string
          updated_at?: string
        }
        Relationships: []
      }
      prayer_content: {
        Row: {
          category_id: string
          content: string
          content_type: string
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          content: string
          content_type: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          content?: string
          content_type?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_content_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "prayer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          selected_option?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "ramadan_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_days: {
        Row: {
          created_at: string
          day_number: number
          id: number
          pdf_url: string | null
          theme: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: number
          pdf_url?: string | null
          theme?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: number
          pdf_url?: string | null
          theme?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      ramadan_quizzes: {
        Row: {
          correct_option: number | null
          created_at: string
          day_id: number
          id: string
          options: Json
          question: string
        }
        Insert: {
          correct_option?: number | null
          created_at?: string
          day_id: number
          id?: string
          options?: Json
          question: string
        }
        Update: {
          correct_option?: number | null
          created_at?: string
          day_id?: number
          id?: string
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_quizzes_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_settings: {
        Row: {
          id: string
          start_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          start_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          start_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sourates: {
        Row: {
          audio_url: string | null
          created_at: string
          id: number
          name_arabic: string
          name_french: string
          number: number
          revelation_type: string | null
          verses_count: number
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: number
          name_arabic: string
          name_french: string
          number: number
          revelation_type?: string | null
          verses_count?: number
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: number
          name_arabic?: string
          name_french?: string
          number?: number
          revelation_type?: string | null
          verses_count?: number
        }
        Relationships: []
      }
      user_alphabet_progress: {
        Row: {
          created_at: string
          id: string
          is_validated: boolean
          letter_id: number
          quiz_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_validated?: boolean
          letter_id: number
          quiz_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_validated?: boolean
          letter_id?: number
          quiz_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alphabet_progress_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "alphabet_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invocation_progress: {
        Row: {
          created_at: string
          id: string
          invocation_id: number
          is_memorized: boolean
          is_validated: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invocation_id: number
          is_memorized?: boolean
          is_validated?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invocation_id?: number
          is_memorized?: boolean
          is_validated?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invocation_progress_invocation_id_fkey"
            columns: ["invocation_id"]
            isOneToOne: false
            referencedRelation: "invocations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nourania_progress: {
        Row: {
          created_at: string
          id: string
          is_memorized: boolean
          is_validated: boolean
          lesson_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_memorized?: boolean
          is_validated?: boolean
          lesson_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_memorized?: boolean
          is_validated?: boolean
          lesson_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nourania_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "nourania_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prayer_progress: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_validated: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_validated?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_validated?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prayer_progress_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "prayer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ramadan_progress: {
        Row: {
          created_at: string
          day_id: number
          id: string
          pdf_read: boolean
          quiz_completed: boolean
          updated_at: string
          user_id: string
          video_watched: boolean
        }
        Insert: {
          created_at?: string
          day_id: number
          id?: string
          pdf_read?: boolean
          quiz_completed?: boolean
          updated_at?: string
          user_id: string
          video_watched?: boolean
        }
        Update: {
          created_at?: string
          day_id?: number
          id?: string
          pdf_read?: boolean
          quiz_completed?: boolean
          updated_at?: string
          user_id?: string
          video_watched?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_ramadan_progress_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sourate_progress: {
        Row: {
          created_at: string
          id: string
          is_memorized: boolean
          is_validated: boolean
          last_practiced_at: string | null
          progress_percentage: number
          sourate_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_memorized?: boolean
          is_validated?: boolean
          last_practiced_at?: string | null
          progress_percentage?: number
          sourate_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_memorized?: boolean
          is_validated?: boolean
          last_practiced_at?: string | null
          progress_percentage?: number
          sourate_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sourate_progress_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
