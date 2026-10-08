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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          description: string
          icon: string
          id: string
          sort_order: number
          title: string
          xp: number
        }
        Insert: {
          description: string
          icon: string
          id: string
          sort_order?: number
          title: string
          xp?: number
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          sort_order?: number
          title?: string
          xp?: number
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          created_at: string
          id: string
          message: string
          route: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          route?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          route?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
          user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
          user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          amount: number
          completed_on: string
          created_at: string
          habit_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          completed_on: string
          created_at?: string
          habit_id: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          completed_on?: string
          created_at?: string
          habit_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived: boolean
          category: string
          color: string
          created_at: string
          description: string
          frequency_type: string
          icon: string
          id: string
          interval_days: number
          name: string
          sort_order: number
          start_date: string
          target: number
          unit: string
          updated_at: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          archived?: boolean
          category?: string
          color?: string
          created_at?: string
          description?: string
          frequency_type?: string
          icon?: string
          id?: string
          interval_days?: number
          name: string
          sort_order?: number
          start_date?: string
          target?: number
          unit?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Update: {
          archived?: boolean
          category?: string
          color?: string
          created_at?: string
          description?: string
          frequency_type?: string
          icon?: string
          id?: string
          interval_days?: number
          name?: string
          sort_order?: number
          start_date?: string
          target?: number
          unit?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_test_account: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          is_test_account?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_test_account?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          enabled: boolean
          habit_id: string
          id: string
          remind_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          habit_id: string
          id?: string
          remind_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          habit_id?: string
          id?: string
          remind_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
      user_settings: {
        Row: {
          created_at: string
          daily_summary: boolean
          day_start_hour: number
          notifications: boolean
          theme: string
          updated_at: string
          user_id: string
          week_starts_monday: boolean
        }
        Insert: {
          created_at?: string
          daily_summary?: boolean
          day_start_hour?: number
          notifications?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          week_starts_monday?: boolean
        }
        Update: {
          created_at?: string
          daily_summary?: boolean
          day_start_hour?: number
          notifications?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          week_starts_monday?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics: { Args: never; Returns: Json }
      admin_delete_user: { Args: { _uid: string }; Returns: undefined }
      admin_list_users: {
        Args: never
        Returns: {
          completions: number
          created_at: string
          display_name: string
          email: string
          habits: number
          id: string
          is_test_account: boolean
          last_activity: string
          last_sign_in_at: string
          role: string
          status: string
        }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_set_admin: {
        Args: { _make_admin: boolean; _uid: string }
        Returns: undefined
      }
      admin_set_status: {
        Args: { _status: string; _uid: string }
        Returns: undefined
      }
      admin_set_test_flag: {
        Args: { _flag: boolean; _uid: string }
        Returns: undefined
      }
      admin_user_detail: { Args: { _uid: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_auth_event: { Args: { _event: string }; Returns: undefined }
      my_role: { Args: never; Returns: string }
      write_audit: {
        Args: {
          _event: string
          _meta: Json
          _tid: string
          _ttype: string
          _user: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "admin", "user"],
    },
  },
} as const
