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
      chat_messages: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          needs_operator: boolean
          operator_reason: string | null
          order_id: string | null
          pd_consent_at: string
          phone: string
          privacy_accepted_at: string
          status: Database["public"]["Enums"]["chat_status"]
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          needs_operator?: boolean
          operator_reason?: string | null
          order_id?: string | null
          pd_consent_at: string
          phone: string
          privacy_accepted_at: string
          status?: Database["public"]["Enums"]["chat_status"]
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          needs_operator?: boolean
          operator_reason?: string | null
          order_id?: string | null
          pd_consent_at?: string
          phone?: string
          privacy_accepted_at?: string
          status?: Database["public"]["Enums"]["chat_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price?: number
          product_id?: string | null
          quantity?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          admin_note: string | null
          card_text: string | null
          comment: string | null
          created_at: string
          customer_name: string
          delivery_date: string | null
          delivery_slot: string | null
          id: string
          phone: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          card_text?: string | null
          comment?: string | null
          created_at?: string
          customer_name: string
          delivery_date?: string | null
          delivery_slot?: string | null
          id?: string
          phone: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          card_text?: string | null
          comment?: string | null
          created_at?: string
          customer_name?: string
          delivery_date?: string | null
          delivery_slot?: string | null
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          care_tip: string | null
          color: string | null
          composition: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          is_visible: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          price: number
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          care_tip?: string | null
          color?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_visible?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          price?: number
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          care_tip?: string | null
          color?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_visible?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          price?: number
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      register_staff_member: {
        Args: { _full_name: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      chat_status: "ai" | "operator" | "closed"
      order_status: "new" | "in_progress" | "delivered" | "cancelled"
      product_kind: "bouquet" | "single" | "gift"
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
      app_role: ["admin", "staff"],
      chat_status: ["ai", "operator", "closed"],
      order_status: ["new", "in_progress", "delivered", "cancelled"],
      product_kind: ["bouquet", "single", "gift"],
    },
  },
} as const
