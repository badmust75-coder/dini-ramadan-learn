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
      allah_names: {
        Row: {
          created_at: string
          display_order: number
          explanation: string | null
          id: number
          image_url: string | null
          name_arabic: string
          name_french: string
          transliteration: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          explanation?: string | null
          id?: never
          image_url?: string | null
          name_arabic: string
          name_french: string
          transliteration?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          explanation?: string | null
          id?: never
          image_url?: string | null
          name_arabic?: string
          name_french?: string
          transliteration?: string | null
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
      app_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          is_read: boolean
          level: string
          message: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          level?: string
          message: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          level?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          recorded_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connexion_logs: {
        Row: {
          connected_at: string
          id: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          id?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          id?: string
          user_id?: string
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
      homework_assignments: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          lesson_reference: string | null
          status: string
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          lesson_reference?: string | null
          status?: string
          subject: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          lesson_reference?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      homework_submissions: {
        Row: {
          assignment_id: string
          content_type: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content_type: string
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content_type?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
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
      invocation_validation_requests: {
        Row: {
          created_at: string
          id: string
          invocation_id: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invocation_id: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invocation_id?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invocation_validation_requests_invocation_id_fkey"
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
          display_order: number
          id: number
          image_url: string | null
          title_arabic: string
          title_french: string
        }
        Insert: {
          audio_url?: string | null
          category?: string | null
          content_arabic?: string | null
          content_french?: string | null
          created_at?: string
          display_order?: number
          id?: number
          image_url?: string | null
          title_arabic: string
          title_french: string
        }
        Update: {
          audio_url?: string | null
          category?: string | null
          content_arabic?: string | null
          content_french?: string | null
          created_at?: string
          display_order?: number
          id?: number
          image_url?: string | null
          title_arabic?: string
          title_french?: string
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          builtin_path: string | null
          created_at: string
          description: string | null
          display_order: number
          gradient: string
          icon: string
          icon_color: string
          id: string
          image_url: string | null
          is_active: boolean
          is_builtin: boolean
          title: string
          title_arabic: string
          updated_at: string
        }
        Insert: {
          builtin_path?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          gradient?: string
          icon?: string
          icon_color?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_builtin?: boolean
          title: string
          title_arabic?: string
          updated_at?: string
        }
        Update: {
          builtin_path?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          gradient?: string
          icon?: string
          icon_color?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_builtin?: boolean
          title?: string
          title_arabic?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_card_content: {
        Row: {
          card_id: string
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          card_id: string
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          card_id?: string
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_card_content_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "module_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      module_cards: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          module_id: string
          section: string | null
          title: string
          title_arabic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          module_id: string
          section?: string | null
          title: string
          title_arabic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          module_id?: string
          section?: string | null
          title?: string
          title_arabic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      module_content: {
        Row: {
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          module_id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          module_id: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          module_id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_confirmations: {
        Row: {
          confirmed_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_confirmations_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "scheduled_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          body: string
          created_at: string
          expired_cleaned: number
          failed_sends: number
          id: string
          sent_by: string | null
          successful_sends: number
          title: string
          total_recipients: number
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          expired_cleaned?: number
          failed_sends?: number
          id?: string
          sent_by?: string | null
          successful_sends?: number
          title: string
          total_recipients?: number
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          expired_cleaned?: number
          failed_sends?: number
          id?: string
          sent_by?: string | null
          successful_sends?: number
          title?: string
          total_recipients?: number
          type?: string
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
      point_settings: {
        Row: {
          id: string
          module_key: string
          module_label: string
          points_per_validation: number
          updated_at: string
        }
        Insert: {
          id?: string
          module_key: string
          module_label: string
          points_per_validation?: number
          updated_at?: string
        }
        Update: {
          id?: string
          module_key?: string
          module_label?: string
          points_per_validation?: number
          updated_at?: string
        }
        Relationships: []
      }
      prayer_card_content: {
        Row: {
          card_id: string
          content_type: string
          created_at: string
          display_order: number
          file_name: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          card_id: string
          content_type: string
          created_at?: string
          display_order?: number
          file_name: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          card_id?: string
          content_type?: string
          created_at?: string
          display_order?: number
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_card_content_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_cards: {
        Row: {
          created_at: string
          display_order: number
          group_key: string
          id: string
          image_url: string | null
          title: string
          title_arabic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_key: string
          id?: string
          image_url?: string | null
          title: string
          title_arabic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_key?: string
          id?: string
          image_url?: string | null
          title?: string
          title_arabic?: string | null
          updated_at?: string
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
          age: number | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          dob_set_by_user: boolean
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_approved: boolean
          last_seen: string | null
          notification_prompt_dismissed: string | null
          notification_prompt_later_at: string | null
          notification_prompt_later_count: number | null
          prayer_group: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          dob_set_by_user?: boolean
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_approved?: boolean
          last_seen?: string | null
          notification_prompt_dismissed?: string | null
          notification_prompt_later_at?: string | null
          notification_prompt_later_count?: number | null
          prayer_group?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          dob_set_by_user?: boolean
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_approved?: boolean
          last_seen?: string | null
          notification_prompt_dismissed?: string | null
          notification_prompt_later_at?: string | null
          notification_prompt_later_count?: number | null
          prayer_group?: string | null
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
          attempt_number: number
          created_at: string
          id: string
          is_correct: boolean
          quiz_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          quiz_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          id?: string
          is_correct?: boolean
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
      ramadan_day_activities: {
        Row: {
          created_at: string
          day_id: number
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          order_index: number | null
          type: string
        }
        Insert: {
          created_at?: string
          day_id: number
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          order_index?: number | null
          type: string
        }
        Update: {
          created_at?: string
          day_id?: number
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          order_index?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_day_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_day_exceptions: {
        Row: {
          created_at: string | null
          day_id: number
          id: string
          is_unlocked: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_id: number
          id?: string
          is_unlocked?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_id?: number
          id?: string
          is_unlocked?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_day_exceptions_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_day_videos: {
        Row: {
          created_at: string
          day_id: number
          display_order: number
          file_name: string | null
          id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          day_id: number
          display_order?: number
          file_name?: string | null
          id?: string
          video_url: string
        }
        Update: {
          created_at?: string
          day_id?: number
          display_order?: number
          file_name?: string | null
          id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_day_videos_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_days: {
        Row: {
          created_at: string
          day_number: number
          id: number
          is_unlocked: boolean | null
          pdf_url: string | null
          theme: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: number
          is_unlocked?: boolean | null
          pdf_url?: string | null
          theme?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: number
          is_unlocked?: boolean | null
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
          correct_options: number[] | null
          created_at: string
          day_id: number
          explanation: string | null
          id: string
          options: Json
          question: string
          question_order: number
        }
        Insert: {
          correct_option?: number | null
          correct_options?: number[] | null
          created_at?: string
          day_id: number
          explanation?: string | null
          id?: string
          options?: Json
          question: string
          question_order?: number
        }
        Update: {
          correct_option?: number | null
          correct_options?: number[] | null
          created_at?: string
          day_id?: number
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          question_order?: number
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
          max_errors: number
          start_enabled: boolean
          started_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          max_errors?: number
          start_enabled?: boolean
          started_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          max_errors?: number
          start_enabled?: boolean
          started_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          is_active: boolean
          message: string
          module: string
          recipients: Json
          require_confirmation: boolean
          send_time: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          message: string
          module?: string
          recipients?: Json
          require_confirmation?: boolean
          send_time?: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          message?: string
          module?: string
          recipients?: Json
          require_confirmation?: boolean
          send_time?: string
          start_date?: string
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
      student_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      student_groups: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_ranking: {
        Row: {
          alphabet_points: number
          id: string
          invocations_points: number
          nourania_points: number
          prayer_points: number
          ramadan_points: number
          sourates_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alphabet_points?: number
          id?: string
          invocations_points?: number
          nourania_points?: number
          prayer_points?: number
          ramadan_points?: number
          sourates_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alphabet_points?: number
          id?: string
          invocations_points?: number
          nourania_points?: number
          prayer_points?: number
          ramadan_points?: number
          sourates_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
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
      user_daily_prayers: {
        Row: {
          created_at: string
          date: string
          id: string
          is_checked: boolean
          prayer_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_checked?: boolean
          prayer_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_checked?: boolean
          prayer_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          audio_url: string | null
          conversation_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_read: boolean
          message: string
          message_type: string
          parent_message_id: string | null
          sender_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          parent_message_id?: string | null
          sender_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          conversation_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          parent_message_id?: string | null
          sender_type?: string
          updated_at?: string
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
      user_ramadan_fasting: {
        Row: {
          created_at: string
          day_number: number
          has_fasted: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          has_fasted?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          has_fasted?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_ramadan_video_watched: {
        Row: {
          day_id: number
          id: string
          user_id: string
          video_id: string
          watched_at: string
        }
        Insert: {
          day_id: number
          id?: string
          user_id: string
          video_id: string
          watched_at?: string
        }
        Update: {
          day_id?: number
          id?: string
          user_id?: string
          video_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ramadan_video_watched_day_id_fkey"
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
      recalculate_student_points: {
        Args: { p_user_id: string }
        Returns: undefined
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
