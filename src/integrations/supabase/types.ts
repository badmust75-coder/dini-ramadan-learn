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
      admin_card_order: {
        Row: {
          card_key: string
          display_order: number
          id: string
          updated_at: string
        }
        Insert: {
          card_key: string
          display_order?: number
          id?: string
          updated_at?: string
        }
        Update: {
          card_key?: string
          display_order?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      alphabet_content: {
        Row: {
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          letter_id: number
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          letter_id: number
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          letter_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alphabet_content_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "alphabet_letters"
            referencedColumns: ["id"]
          },
        ]
      }
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
      dashboard_card_visibility: {
        Row: {
          card_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_card_visibility_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "dashboard_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_cards: {
        Row: {
          bg_color: string
          content: string | null
          content_type: string
          created_at: string
          created_by: string | null
          display_order: number
          file_name: string | null
          file_url: string | null
          icon: string
          id: string
          is_public: boolean
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          content?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          file_name?: string | null
          file_url?: string | null
          icon?: string
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          content?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          file_name?: string | null
          file_url?: string | null
          icon?: string
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invocation_content: {
        Row: {
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          invocation_id: number
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          invocation_id: number
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          invocation_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invocation_content_invocation_id_fkey"
            columns: ["invocation_id"]
            isOneToOne: false
            referencedRelation: "invocations"
            referencedColumns: ["id"]
          },
        ]
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
      nourania_lesson_content: {
        Row: {
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          lesson_id: number
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          lesson_id: number
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          lesson_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nourania_lesson_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "nourania_lessons"
            referencedColumns: ["id"]
          },
        ]
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
      nourania_validation_requests: {
        Row: {
          created_at: string
          id: string
          lesson_id: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nourania_validation_requests_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "nourania_lessons"
            referencedColumns: ["id"]
          },
        ]
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
          age: number | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_approved?: boolean
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
          started_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          start_enabled?: boolean
          started_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          start_enabled?: boolean
          started_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sourate_admin_unlocks: {
        Row: {
          created_at: string
          id: string
          sourate_id: number
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sourate_id: number
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sourate_id?: number
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourate_admin_unlocks_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
      sourate_content: {
        Row: {
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          sourate_id: number
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          sourate_id: number
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          sourate_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sourate_content_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
      sourate_validation_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sourate_id: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sourate_id: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sourate_id?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourate_validation_requests_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
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
      user_messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          parent_message_id: string | null
          sender_type: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          parent_message_id?: string | null
          sender_type?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          parent_message_id?: string | null
          sender_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "user_messages"
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
      user_sourate_verse_progress: {
        Row: {
          created_at: string
          id: string
          is_validated: boolean
          sourate_id: number
          updated_at: string
          user_id: string
          verse_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_validated?: boolean
          sourate_id: number
          updated_at?: string
          user_id: string
          verse_number: number
        }
        Update: {
          created_at?: string
          id?: string
          is_validated?: boolean
          sourate_id?: number
          updated_at?: string
          user_id?: string
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_sourate_verse_progress_sourate_id_fkey"
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
